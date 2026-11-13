"""Real HTTP and Postgres RLS; only the Auth and PostgREST transports are local simulations."""
import os,sys,json,re,uuid,threading,base64,urllib.parse,urllib.request,urllib.error,http.cookiejar,subprocess,time,unittest
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from journey import Journey,ROOT,PHP,port,lit
class Profiles(Journey):
 def setUp(self):pass
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql("create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;")
  for name in ['account_business_setup','business_location_details','business_profiles','services_pricing']+getattr(cls,'extra_migrations',[]):cls.sql(next((ROOT/'supabase/migrations').glob('*'+name+'.sql')).read_text())
  cls.ids=[str(uuid.uuid4()),str(uuid.uuid4())];cls.bids=[str(uuid.uuid4()),str(uuid.uuid4())]
  for uid,bid in zip(cls.ids,cls.bids):cls.sql(f"insert into auth.users values('{uid}');insert into public.businesses(id,owner_id,name,business_type,country,time_zone) values('{bid}','{uid}','Fresh Test','cleaning','ZA','Africa/Johannesburg')")
  class Gateway(BaseHTTPRequestHandler):
   def log_message(self,*a):pass
   def call(self):
    body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or '{}');url=urllib.parse.urlparse(self.path);q=urllib.parse.parse_qs(url.query);uid=self.headers.get('Authorization','').removeprefix('Bearer ');status=200;data={}
    try:
     if url.path.startswith('/auth/v1/token'):uid=cls.ids[0 if body.get('email')=='a@example.test' else 1];data={'access_token':uid,'refresh_token':uid,'expires_in':3600}
     elif url.path=='/auth/v1/user':data={'id':uid,'email':'PRIVATE-ACCOUNT@example.test','email_confirmed_at':'2026-11-12','user_metadata':{'name':'PRIVATE-PERSON'}}
     elif url.path.startswith('/rest/v1/'):
      prefix="set role authenticated;set request.jwt.claim.sub="+lit(uid)+";set request.jwt.claims='{\"is_anonymous\":false}';" if uid in cls.ids else 'set role anon;'
      if '/rpc/' in url.path:
       name=url.path.rsplit('/',1)[-1];assert name in ['business_profile_save','business_profile_publish','business_profile_unpublish','business_services_save','business_services_publish','business_enquiry_submit','business_enquiry_status','business_quote_write','business_quote_customer','business_booking_write','business_customer_search','business_customer_write','business_customer_link','business_customer_quote_create','business_customer_booking_create','business_staff_write','business_staff_assign','business_invoice_write','business_invoice_payment','business_invoice_customer','business_dashboard','business_enquiry_create'];parts=[]
       for k,v in body.items():parts.append(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k in ['p_draft','p_document','p_details','p_staff'] else lit(v)))
       data=json.loads(cls.sql(prefix+'select public.'+name+'('+','.join(parts)+')'))
      else:
       table=url.path.rsplit('/',1)[-1];assert table in ['businesses','business_profiles','business_public_pages','business_service_catalogues','business_enquiries','business_quotes','business_quote_list','business_bookings','business_customers','business_staff','business_booking_schedule','business_invoice_list','business_invoice_payments'];cols=q.get('select',['*'])[0];assert re.fullmatch(r'[a-z_,*]+',cols);conditions=[]
       for key,vs in q.items():
        if key in ['business_id','environment','slug','id','status','effective_status','quote_id','customer_id','booking_id','invoice_id']:conditions.append(key+'='+lit(vs[0].removeprefix('eq.')))
        if key=='staff_ids':
         assert vs[0].startswith('cs.');conditions.append('staff_ids @> '+lit(vs[0][3:])+'::uuid[]')
        if key=='starts_at':
          for v in vs:
           op,val=v.split('.',1);assert op in ['gte','lt'];conditions.append('starts_at'+('>=' if op=='gte' else '<')+lit(val)+'::timestamptz')
       if table=='business_staff':conditions.append('true')
       query='select '+cols+' from public.'+table+(' where '+' and '.join(conditions) if conditions else '')
       if table in ['business_enquiries','business_quote_list','business_quotes','business_invoice_list']:query+=' order by created_at desc,id desc limit '+str(int(q.get('limit',[21])[0]))+' offset '+str(int(q.get('offset',[0])[0]))
       if table in ['business_bookings','business_booking_schedule']:query+=' order by starts_at asc,id asc limit '+str(int(q.get('limit',[101])[0]))+' offset '+str(int(q.get('offset',[0])[0]))
       if table=='business_invoice_payments':query+=' order by created_at,id limit '+str(int(q.get('limit',[100])[0]))+' offset '+str(int(q.get('offset',[0])[0]))
       if table=='business_staff':query+=' order by name,id limit '+str(int(q.get('limit',[100])[0]))+' offset '+str(int(q.get('offset',[0])[0]))
       data=json.loads(cls.sql(prefix+"select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from ("+query+') t'))
    except Exception as e:status=400;data={'code':'23505' if 'unique constraint' in str(e) else 'P0001','message':str(e).split('ERROR:  ')[-1].split('\n')[0]}
    raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(raw)
   do_POST=call;do_GET=call
  cls.gw=ThreadingHTTPServer(('127.0.0.1',0),Gateway);threading.Thread(target=cls.gw.serve_forever,daemon=True).start()
  cls.url='http://127.0.0.1:'+str(port());private=cls.private/'profiles';private.mkdir();(private/'config.php').write_text("<?php return ['enabled'=>true,'environment'=>'test','base_url'=>'"+cls.url+"','supabase_url'=>'http://127.0.0.1:"+str(cls.gw.server_port)+"','publishable_key'=>'test'];")
  cls.proc=subprocess.Popen([PHP,'-d','session.save_path='+str(private),'-S',cls.url.removeprefix('http://'),'-t',str(ROOT)],env=dict(cls.env,FARAIOS_ACCOUNT_DIR=str(private)),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  cls.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  for _ in range(80):
   try:cls.get('/account/index.php?page=signin');break
   except OSError:time.sleep(.05)
 @classmethod
 def tearDownClass(cls):cls.proc.terminate();cls.proc.wait();cls.gw.shutdown();super().tearDownClass()
 @classmethod
 def get(cls,path):
  try:r=cls.client.open(cls.url+path)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read().decode()
 @classmethod
 def post(cls,path,**fields):
  html=cls.get(path)[1];fields['csrf']=re.search('name="csrf" value="([^"]+)"',html)[1];r=cls.client.open(urllib.request.Request(cls.url+path,data=urllib.parse.urlencode(fields).encode(),headers={'Origin':cls.url}));return r.read().decode()
 @classmethod
 def scope(cls,uid,q):return cls.sql('set role authenticated;set request.jwt.claim.sub='+lit(uid)+";set request.jwt.claims='{\"is_anonymous\":false}';"+q)
 def test_01_profile_journey(self):
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/profile.php';html=self.get(path)[1];self.assertIn('Public details',html);self.assertNotIn('PRIVATE-ACCOUNT',html)
  data=dict(action='save',version=0,name='Fresh Public',description='<script>alert(1)</script> Friendly service',email='public@example.test',phone='+27 21 123 4567',website='https://example.test',areas='Claremont',slug='fresh-public',open_0='on',from_0='08:00',to_0='17:00')
  invalid=self.post(path,**(data|{'to_0':'07:00'}));self.assertIn('Closing time',invalid);self.assertIn('Friendly service',invalid);self.assertIn('value="07:00"',invalid);self.assertIn('public@example.test',invalid)
  self.assertIn('starting with https',self.post(path,**(data|{'website':'javascript:alert(1)'})))
  self.assertIn('Draft saved',self.post(path,**data));self.assertIn('Fresh Public',self.get(path)[1])
  self.assertEqual(self.get('/b/index.php?slug=fresh-public')[0],404)
  preview=self.get(path+'?view=preview')[1];self.assertIn('&lt;script&gt;',preview);self.assertNotIn('<script>alert',preview);self.assertNotIn('PRIVATE-',preview)
  self.assertIn('Confirm that',self.post(path,action='publish',version=1))
  self.assertIn('is published',self.post(path,action='publish',version=1,confirm_public='on'))
  status,html=self.get('/b/index.php?slug=fresh-public');self.assertEqual(status,200);self.assertIn('public@example.test',html);self.assertNotIn('PRIVATE-',html)
  data.update(version=1,description='New private draft',slug='new-address');self.assertIn('Draft saved',self.post(path,**data));self.assertNotIn('New private draft',self.get('/b/index.php?slug=fresh-public')[1])
  self.assertIn('Draft changed',self.post(path,**data));self.assertIn('Draft changed',self.post(path,action='publish',version=1,confirm_public='on'))
  self.assertIn('is published',self.post(path,action='publish',version=2,confirm_public='on'));self.assertEqual(self.get('/b/index.php?slug=fresh-public')[0],404);self.assertEqual(self.get('/b/index.php?slug=new-address')[0],200)
  self.assertIn('unpublished',self.post(path,action='unpublish'));self.assertEqual(self.get('/b/index.php?slug=new-address')[0],404);self.assertIn('New private draft',self.get(path)[1])
 def test_02_native_isolation(self):
  a,b=self.ids;bid=self.bids[0]
  self.assertEqual(self.scope(b,'select count(*) from public.business_profiles'),'0')
  for name,args in [('business_profile_save',f"'{bid}','live','stolen','{{}}',2"),('business_profile_publish',f"'{bid}','live',2"),('business_profile_unpublish',f"'{bid}','live'")]:
   with self.assertRaises(RuntimeError):self.scope(b,'select public.'+name+'('+args+')')
  self.assertEqual(self.scope(b,"with x as (update public.business_profiles set slug='stolen' returning *)select count(*) from x"),'0')
  with self.assertRaises(RuntimeError):self.sql('set role anon;select draft from public.business_profiles')
  with self.assertRaises(RuntimeError):self.sql('set role anon;select business_id from public.business_public_pages')
  with self.assertRaises(RuntimeError):self.scope(a,"update public.business_profiles set draft=draft || '{\"private_email\":\"secret\"}'::jsonb")
  self.scope(a,f"select public.business_profile_publish('{bid}','live',2)")
  self.assertEqual(self.sql("set role anon;select count(slug) from public.business_public_pages where environment='preview'"),'0')
  self.assertEqual(self.sql("set role anon;select count(slug) from public.business_public_pages where environment='live'"),'1')
  self.assertEqual(self.scope(b,"with x as (update public.business_public_pages set slug='stolen' returning *)select count(*) from x"),'0')
  with self.assertRaises(RuntimeError):self.sql("set role anon;update public.business_public_pages set slug='stolen'")
  self.scope(b,f"select public.business_profile_save('{self.bids[1]}','live','other-page',"+lit(json.dumps({'name':'Other','description':'test','email':'a@example.test','phone':'','website':'','areas':'Area','hours':[None]*7,'logo':None}))+"::jsonb,0)")
  with self.assertRaises(RuntimeError):self.scope(b,"update public.business_profiles set slug='new-address'")
  self.assertEqual(self.scope(a,'select count(*) from public.business_profiles'),'1')
 def test_04_logo_save_reload(self):
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/profile.php';html=self.get(path)[1];csrf=re.search('name="csrf" value="([^\"]+)"',html)[1]
  boundary='FaraiOSTestBoundary';fields=dict(csrf=csrf,action='save',version=2,name='With logo',description='Logo test',email='public@example.test',phone='',website='',areas='Area',slug='logo-page');raw=b''
  for k,v in fields.items():raw+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+str(v)+'\r\n').encode()
  png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
  raw+=('--'+boundary+'\r\nContent-Disposition: form-data; name="logo"; filename="logo.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+('\r\n--'+boundary+'--\r\n').encode()
  html=self.client.open(urllib.request.Request(self.url+path,data=raw,headers={'Origin':self.url,'Content-Type':'multipart/form-data; boundary='+boundary})).read().decode();self.assertIn('Draft saved',html);self.assertIn('Saved logo',self.get(path)[1])
  r=self.client.open(self.url+path+'?logo=draft');self.assertEqual(r.headers['Content-Type'],'image/png');self.assertEqual(r.read(),png)
  self.post(path,action='publish',version=3,confirm_public='on');r=self.client.open(self.url+'/b/index.php?slug=logo-page&logo=1');self.assertEqual(r.read(),png)
  self.assertIn('Draft saved',self.post(path,**(fields|{'version':3,'remove_logo':'on'})));self.assertNotIn('Saved logo',self.get(path)[1]);r=self.client.open(self.url+'/b/index.php?slug=logo-page&logo=1');self.assertEqual(r.read(),png)
  self.post(path,action='unpublish');self.assertEqual(self.get('/b/index.php?slug=logo-page')[0],404)
 def test_03_logo_validation(self):
  r=subprocess.run([PHP,'-r',"require 'account/profile-core.php'; try {profile_logo('<svg onload=evil()>');exit(1);}catch(RuntimeException $e){echo 'rejected';}"],cwd=ROOT,env=self.env,capture_output=True,text=True);self.assertEqual(r.stdout,'rejected')
if __name__=='__main__':
 suite=unittest.TestSuite(Profiles(n) for n in ['test_01_profile_journey','test_02_native_isolation','test_03_logo_validation','test_04_logo_save_reload']);r=unittest.TextTestRunner(verbosity=2).run(suite);sys.exit(not r.wasSuccessful())
