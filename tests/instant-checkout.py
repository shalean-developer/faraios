"""Run the preview journey against native Postgres, real PHP and a local test PSP."""
import datetime
import json
import os
import re
import subprocess
import sys
import time
import threading
import unittest
import urllib.parse
import urllib.request
import uuid
import http.cookiejar
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from journey import Journey, ROOT, PHP, port, lit
import importlib.util

def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

class Checkout(Journey):
    def setUp(self):
        pass

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        baseline = ROOT / 'baseline/docs'
        module('baseline',baseline/'v1-017/reconstruct.py').database(cls.sql)
        module('scheduler',baseline/'v1-005/stage.py').install_database(cls.sql)
        cls.sql((ROOT/'docs/instant-booking/preview.sql').read_text())
        cls.sql('create role checkout_fixture login in role faraios_preview_checkout')
        cls.uid,cls.bid,cls.worker=[str(uuid.uuid4()) for _ in range(3)]
        cls.service='1'*32
        cls.opts=[{'id':str(n)*32,'quantity':q} for n,q in [(2,2),(3,1),(4,1)]]
        options=[dict(id=str(n)*32,name=k,kind=kind,minimum=lo,maximum=hi,included=0,price=price,minutes=m)
                 for n,k,kind,lo,hi,price,m in [(2,'Bedrooms','bedrooms',0,8,3000,30),(3,'Bathrooms','bathrooms',0,8,3500,30),(4,'Service fee','extra',1,1,3000,0)]]
        service=dict(id=cls.service,name='Regular Cleaning',mode='fixed',visible=True,archived=False,amount=25000,duration=210,description='',options=options)
        cls.catalogue=dict(currency='ZAR',items=[service])
        cls.profile=dict(name='Synthetic Cleaning',description='Preview only',email='demo@example.test',phone='',website='',areas='Gardens',hours=[None]*7,logo=None)
        cls.hours=[dict(day=i,start=540,end=840) for i in range(1,8)]
        cls.sql(f"""insert into auth.users values('{cls.uid}');
        insert into public.businesses(id,owner_id,name,business_type,country,time_zone) values('{cls.bid}','{cls.uid}','Synthetic Cleaning','cleaning','ZA','Africa/Johannesburg');
        insert into public.business_memberships(business_id,environment,user_id,role,active) values('{cls.bid}','preview','{cls.uid}','owner',true) on conflict do nothing;
        insert into public.business_staff(id,business_id,environment,name,email,phone) values('{cls.worker}','{cls.bid}','preview','Synthetic staff','','');
        insert into public.business_service_catalogues(business_id,environment,draft,published,published_version) values('{cls.bid}','preview',{lit(json.dumps(cls.catalogue))},{lit(json.dumps(cls.catalogue))},1);
        insert into public.business_public_pages(business_id,environment,slug,document,time_zone,services)
        values('{cls.bid}','preview','synthetic-cleaning',{lit(json.dumps(cls.profile))},'Africa/Johannesburg',{lit(json.dumps(cls.catalogue))});
        insert into authorization_private.scheduling_policies values('{cls.bid}','preview',1,true,'Africa/Johannesburg',{lit(json.dumps(cls.hours))},0,0,true);
        """)
        cls.owner=f"""set role authenticated;set request.jwt.claim.sub='{cls.uid}';set request.jwt.claims='{{"is_anonymous":false}}';
        set request.headers='{{"x-faraios-business":"{cls.bid}","x-faraios-environment":"preview"}}';"""
        cls.sql(cls.owner+f"select public.preview_instant_offer('{cls.bid}',true,'{cls.service}',array['{cls.worker}']::uuid[],array['Gardens'])")
        cls.day=cls.sql("select (now() at time zone 'Africa/Johannesburg')::date+1")
        cls.receipts={}
        class Provider(BaseHTTPRequestHandler):
            def log_message(self,*args): pass
            def reply(self,data):
                raw=json.dumps(dict(status=True,data=data)).encode()
                self.send_response(200);self.end_headers();self.wfile.write(raw)
            def do_POST(self):
                assert self.path=='/transaction/initialize'
                assert self.headers['Authorization']=='Bearer sk_test_fixture'
                data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                assert data['currency']=='ZAR' and data['amount']==37500
                ref=data['reference'];cls.receipts[ref]=data
                self.reply(dict(reference=ref,authorization_url=cls.gateway_url+'/checkout/'+ref))
            def do_GET(self):
                if self.path.startswith('/checkout/'):
                    ref=self.path.split('/')[-1];self.send_response(303)
                    self.send_header('Location',cls.receipts[ref]['callback_url']+'&reference='+ref);self.end_headers()
                elif self.path.startswith('/transaction/verify/'):
                    ref=self.path.split('/')[-1]
                    self.reply(dict(reference=ref,amount=37500,currency='ZAR',domain='test',status='success'))
                else:
                    self.reply({})
        cls.provider=ThreadingHTTPServer(('127.0.0.1',0),Provider)
        cls.gateway_url='http://127.0.0.1:'+str(cls.provider.server_port)
        threading.Thread(target=cls.provider.serve_forever,daemon=True).start()
        cls.base_url='http://127.0.0.1:'+str(port())+'/preview'
        private=cls.private/'instant';private.mkdir()
        (private/'config.php').write_text(f"""<?php return ['environment'=>'test','enabled'=>true,'publishable_key'=>'fixture','base_url'=>'{cls.base_url}','supabase_url'=>'{cls.gateway_url}',
        'instant_test_enabled'=>true,'instant_dsn'=>'pgsql:host=127.0.0.1;port={cls.pgport};dbname=postgres','instant_user'=>'checkout_fixture',
        'instant_password'=>'','instant_paystack_key'=>'sk_test_fixture','instant_fixture'=>'{cls.gateway_url}'];""")
        # Render the existing booking form with the exact same synthetic published catalogue.
        router=private/'router.php'
        router.write_text("""<?php
        $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
        if ($path==='/preview/b/instant.php') { $_SERVER['SCRIPT_NAME']=$path; require '"""+str(ROOT)+"""/b/instant.php';return; }
        if ($path==='/preview/business/booking.js'){header('Content-Type: application/javascript');readfile('"""+str(ROOT)+"""/business/booking.js');return;}
        if ($path!=='/preview/b/synthetic-cleaning'){http_response_code(404);return;}
        require '"""+str(ROOT)+"""/account/core.php';require '"""+str(ROOT)+"""/account/enquiries-core.php';
        require '"""+str(ROOT)+"""/account/profile-core.php';require '"""+str(ROOT)+"""/account/services-core.php';require '"""+str(ROOT)+"""/account/requests-core.php';
        enquiry_session();request_progress();request_form('synthetic-cleaning',json_decode('"""+json.dumps(dict(document=cls.profile,services=cls.catalogue,time_zone='Africa/Johannesburg'))+"""',true),'',false);echo '<script src=/preview/business/booking.js></script>';
        """)
        cls.web=subprocess.Popen([PHP,'-d','session.save_path='+str(private),'-S',cls.base_url.split('/')[2],str(router)],
            env=dict(cls.env,FARAIOS_ACCOUNT_DIR=str(private)),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        cls.browser=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        for attempt in range(100):
            try:
                cls.browser.open(cls.base_url+'/b/synthetic-cleaning').close()
                break
            except OSError:
                if attempt==99: raise
                time.sleep(.05)

    @classmethod
    def tearDownClass(cls):
        cls.web.terminate();cls.web.wait();cls.provider.shutdown();cls.provider.server_close()
        super().tearDownClass()

    def test_checkout_and_duplicate_callback(self):
        front=self.browser.open(self.base_url+'/b/synthetic-cleaning?booking=1').read().decode()
        self.assertIn('See available times',front)
        token=re.search('name="csrf" value="([^"]+)"',front)[1]
        def post(url,**params):
            return self.browser.open(url,urllib.parse.urlencode(dict(csrf=token,**params)).encode())
        selection={'options['+v['id']+']':v['quantity'] for v in self.opts}
        response=post(self.base_url+'/b/instant.php?slug=synthetic-cleaning',service=self.service,address='10 Example Street',service_area='Gardens',**selection)
        flow=response.url;html=response.read().decode()
        self.assertIn('375.00',html);self.assertIn('300 minutes',html);self.assertIn('<option>09:00</option>',html);self.assertNotIn('<option>09:30</option>',html)
        review=post(flow,action='hold',time='09:00',name='Synthetic Customer',email='fixture@example.test').read().decode()
        self.assertIn('Review and pay',review);self.assertIn('Pay with test checkout',review)
        confirmed=post(flow,action='pay').read().decode();self.assertIn('Booking confirmed',confirmed)
        ref='fi-'+urllib.parse.parse_qs(urllib.parse.urlsplit(flow).query)['flow'][0]
        again=self.browser.open(flow+'&reference='+ref).read().decode()
        self.assertEqual(confirmed,again)
        self.assertEqual(self.sql("select count(*) from public.business_booking_staff where staff_id="+lit(self.worker)),'1')

    def test_mobile_browser(self):
        subprocess.run(['node',str(ROOT/'tests/instant-browser.cjs'),self.base_url,self.sql('select current_date+6')],check=True,timeout=50)

    def test_race_expiry_and_late_payment(self):
        day=self.sql("select current_date+4");at=day+' 09:00+02'
        def reserve(ref):
            args=[ref,'synthetic-cleaning',self.service,'Gardens',json.dumps(self.opts),at,37500,300,
                  json.dumps(dict(name='Synthetic Guest',email='test@example.test',phone='',notes='')),'10 Example Street']
            try:self.sql('select instant_private.reserve('+','.join(lit(x) for x in args)+')');return True
            except RuntimeError as e:
                self.assertIn('Slot unavailable',str(e));return False
        refs=[str(uuid.uuid4()) for _ in range(2)]
        with ThreadPoolExecutor(2) as pool: won=list(pool.map(reserve,refs))
        self.assertEqual(sorted(won),[False,True])
        old=refs[won.index(True)]
        self.sql("update instant_private.holds set expires_at=now()-interval '1 second' where reference="+lit(old))
        self.assertTrue(reserve(str(uuid.uuid4())))
        self.assertEqual(json.loads(self.sql("select instant_private.settle("+lit(old)+",37500)"))['state'],'review')

if __name__=='__main__':
    unittest.main(defaultTest=['Checkout.test_checkout_and_duplicate_callback','Checkout.test_race_expiry_and_late_payment','Checkout.test_mobile_browser'],verbosity=2)
