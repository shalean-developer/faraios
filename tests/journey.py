"""Disposable PostgreSQL 17 + real PHP HTTP + local Supabase RPC/Resend transport contracts.
No hosted writes, real credentials or outbound emails. Requires PostgreSQL binaries and PHP.
"""
import base64,csv,hashlib,hmac,http.cookiejar,io,json,os,re,socket,subprocess,tempfile,threading,time,unittest,urllib.error,urllib.request,uuid
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PHP=os.environ.get('PHP_BIN','php')
PGBIN=Path(os.environ.get('PG_BIN','/usr/lib/postgresql/17/bin'))
SERVICE='test_service_key_not_a_real_secret'
WEBHOOK='whsec_'+base64.b64encode(b'w'*32).decode()

def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def lit(v):
 if v is None:return 'NULL'
 if isinstance(v,bool):return 'true' if v else 'false'
 if isinstance(v,int):return str(v)
 if isinstance(v,list):return 'ARRAY['+','.join(lit(x) for x in v)+']::text[]'
 return "'"+str(v).replace("'","''")+"'"

class Journey(unittest.TestCase):
 @classmethod
 def sql(cls,q,role=False):
  prefix='set role service_role; ' if role else ''
  r=subprocess.run([str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(cls.pgport),'-d','postgres','-v','ON_ERROR_STOP=1','-c',prefix+q],env=cls.env,capture_output=True,text=True)
  if r.returncode:raise RuntimeError(r.stderr)
  return r.stdout.strip()
 @classmethod
 def rpc(cls,name,args):
  if not re.fullmatch(r'waitlist_[a-z_]+',name) or any(not re.fullmatch(r'p_[a-z_]+',k) for k in args):raise ValueError()
  call='public.'+name+'('+','.join(k+'=>'+lit(v) for k,v in args.items())+')'
  q='select coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) from '+call+' t' if name=='waitlist_export' else 'select to_jsonb('+call+')'
  raw=cls.sql(q,True)
  return json.loads(raw) if raw else None
 @classmethod
 def config(cls,transport='capture',**kw):
  c=dict(enabled=True,environment='test',transport=transport,base_url=cls.base,secret='s'*64,min_seconds=0,supabase_url=cls.gateway,resend_url=cls.gateway,supabase_key=SERVICE,resend_key='test_resend_key_not_a_real_secret',webhook_secret=WEBHOOK)
  c.update(kw)
  def php(v):
   if isinstance(v,bool):return 'true' if v else 'false'
   if isinstance(v,int):return str(v)
   return "'"+str(v).replace('\\','\\\\').replace("'","\\'")+"'"
  (cls.private/'config.php').write_text('<?php return ['+','.join(php(k)+'=>'+php(v) for k,v in c.items())+'];')
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory(prefix='faraios-pg-test-');cls.private=Path(cls.tmp.name)/'private';cls.private.mkdir()
  cls.pgport=port();cls.env=dict(os.environ,LD_LIBRARY_PATH=os.environ.get('PG_LIB',''),FARAIOS_WAITLIST_DIR=str(cls.private))
  subprocess.run([str(PGBIN/'initdb'),'-D',cls.tmp.name+'/pg','--no-locale','--encoding=UTF8','--auth=trust'],check=True,env=cls.env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  cls.pg=subprocess.Popen([str(PGBIN/'postgres'),'-D',cls.tmp.name+'/pg','-h','127.0.0.1','-p',str(cls.pgport),'-k',''],env=cls.env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(100):
   try:cls.sql('select 1');break
   except RuntimeError:time.sleep(.05)
  cls.sql('create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create extension pgcrypto with schema extensions;grant usage on schema public,extensions to service_role;')
  cls.sql(next((ROOT/'supabase/migrations').glob('*waitlist_supabase_resend.sql')).read_text())
  cls.calls=[];cls.provider_status=200;cls.database_up=True;cls.sent={}
  class Gateway(BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_POST(self):
    data=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))))
    status=200
    try:
     if self.path.startswith('/rest/v1/rpc/'):
      if self.headers.get('apikey')!=SERVICE:raise ValueError('key')
      if not cls.database_up:status=503;body={}
      else:body=cls.rpc(self.path.rsplit('/',1)[-1],data)
     elif self.path=='/emails':
      key=self.headers.get('Idempotency-Key');cls.calls.append((key,data));status=cls.provider_status
      if status==200:
       if key in cls.sent and cls.sent[key][0]!=data:status=409;body={}
       else:
        cls.sent.setdefault(key,(data,str(uuid.uuid4())));body={'id':cls.sent[key][1]}
      else:body={'error':'synthetic failure'}
     else:status=404;body={}
    except Exception as e:status=500;body={'error':str(e)}
    payload=json.dumps(body).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
  cls.httpserver=ThreadingHTTPServer(('127.0.0.1',0),Gateway);cls.gateway='http://127.0.0.1:'+str(cls.httpserver.server_port)
  cls.thread=threading.Thread(target=cls.httpserver.serve_forever,daemon=True);cls.thread.start()
  cls.base='http://127.0.0.1:'+str(port());cls.config()
  cls.php=subprocess.Popen([PHP,'-S',cls.base.removeprefix('http://'),'-t',str(ROOT)],env=cls.env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(100):
   try:urllib.request.urlopen(cls.base,timeout=.2).close();break
   except OSError:time.sleep(.05)
 @classmethod
 def tearDownClass(cls):
  cls.php.terminate();cls.php.wait();cls.httpserver.shutdown();cls.httpserver.server_close();cls.pg.terminate();cls.pg.wait();cls.tmp.cleanup()
 def setUp(self):
  self.config();self.sql('truncate public.waitlist_subscribers,waitlist_private.outbox,waitlist_private.rate_limits,waitlist_private.delivery_events;')
  type(self).provider_status=200;type(self).database_up=True;self.calls.clear();self.sent.clear()
  (self.private/'captured.jsonl').unlink(missing_ok=True)
  for f in self.private.glob('*.csv'):f.unlink()
  self.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  _,data,_=self.http('GET','/waitlist/api.php')
  self.fields=dict(name='Test Owner',email='owner@example.test',business_type='cleaning',interests=['business-management','seo'],consent='yes',website='',csrf=data['csrf'])
 def http(self,method,path,data=None,headers=None,raw=None):
  h={'Origin':self.base}
  if data is not None:raw=json.dumps(data).encode();h['Content-Type']='application/json'
  h.update(headers or {})
  req=urllib.request.Request(self.base+path,data=raw,headers=h,method=method)
  try:r=self.client.open(req)
  except urllib.error.HTTPError as e:r=e
  with r:
   text=r.read().decode();body=json.loads(text) if 'application/json' in r.headers.get('Content-Type','') else text
   return r.status,body,r.headers
 def signup(self,**kw):return self.http('POST','/waitlist/api.php',self.fields|kw)
 def capture(self):return [json.loads(x)['message'] for x in (self.private/'captured.jsonl').read_text().splitlines()]
 def tokens(self):return re.findall(r'#token=([a-f0-9]{64})',self.capture()[0]['text'])
 def action(self,action,token):return self.http('POST','/waitlist/'+action+'.php',raw=('token='+token).encode(),headers={'Content-Type':'application/x-www-form-urlencoded'})
 def command(self,name):return subprocess.run([PHP,str(ROOT/'scripts/waitlist.php'),name],env=self.env,capture_output=True,text=True,check=True).stdout
 def state(self):return self.rpc('waitlist_status',{})
 def test_complete_journey_owner_alert_and_export(self):
  self.assertEqual(self.signup()[0],200);confirm,withdraw=self.tokens();self.assertEqual(self.state()['subscribers'],{'pending':1})
  self.http('GET','/waitlist/confirm.php');self.assertEqual(self.state()['subscribers'],{'pending':1})
  self.assertIn('You’re on the list.',self.action('confirm',confirm)[1]);self.assertIn('no longer active',self.action('confirm',confirm)[1])
  messages=self.capture();self.assertEqual(len(messages),2);self.assertEqual(messages[1]['to'],['hello@faraios.com']);self.assertIn('New confirmed',messages[1]['subject'])
  self.command('export');rows=list(csv.reader(io.StringIO(next(self.private.glob('*.csv')).read_text())));self.assertEqual(rows[1][4],'confirmed')
  self.assertIn('unsubscribed',self.action('unsubscribe',withdraw)[1]);self.signup();self.assertEqual(self.state()['subscribers'],{'withdrawn':1})
 def test_duplicate_and_pending_resend(self):
  self.signup();old,_=self.tokens();self.signup(email=' OWNER@EXAMPLE.TEST ',name='Altered');self.assertEqual(self.sql('select count(*) from public.waitlist_subscribers'),'1');self.assertEqual(self.sql('select name from public.waitlist_subscribers'),'Test Owner');self.assertEqual(len(self.capture()),1)
  self.sql("update public.waitlist_subscribers set last_request_at=now()-interval '2 hours'");self.signup();self.assertEqual(len(self.capture()),2);self.assertIn('no longer active',self.action('confirm',old)[1])
 def test_server_validation(self):
  for values in [dict(name='x'),dict(email='bad'),dict(email='a@example.test\r\nBcc:x'),dict(consent='no'),dict(interests=[]),dict(interests=['unknown']),dict(business_type='bad'),dict(name=[]),dict(interests='seo')]:
   self.sql('truncate waitlist_private.rate_limits');self.assertEqual(self.signup(**values)[0],422,values)
  self.assertEqual(self.sql('select count(*) from public.waitlist_subscribers'),'0')
 def test_all_interests_and_no_public_access(self):
  self.assertEqual(self.signup(interests=['business-management','website-builder','website-creation','hosting','seo','marketing'])[0],200)
  self.assertEqual(self.sql("select has_table_privilege('anon','public.waitlist_subscribers','select')"),'f')
  self.assertEqual(self.sql("select has_table_privilege('authenticated','public.waitlist_subscribers','insert')"),'f')
  self.assertEqual(self.sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'waitlist_%' and (p.prosecdef or has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))"),'0')
 def test_csrf_origin_methods_and_cookie(self):
  self.assertEqual(self.signup(csrf='bad')[0],403);self.assertEqual(self.http('POST','/waitlist/api.php',self.fields,{'Origin':'https://evil.test'})[0],403);self.assertEqual(self.http('PUT','/waitlist/api.php')[0],405)
  with urllib.request.urlopen(self.base+'/waitlist/api.php') as r:cookie=r.headers['Set-Cookie'];self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
  self.assertEqual(self.http('GET','/scripts/waitlist.php')[0],404)
 def test_honeypot_timing_and_rate(self):
  self.signup(website='bot');self.assertEqual(self.sql('select count(*) from public.waitlist_subscribers'),'0')
  self.config(min_seconds=999);self.assertEqual(self.signup()[0],422);self.config()
  for _ in range(3):self.signup()
  self.assertEqual(self.signup()[0],429)
 def test_confirmation_expiry(self):
  self.signup();c,w=self.tokens();self.sql("update public.waitlist_subscribers set confirm_expires=now()-interval '1 hour'");self.assertIn('no longer active',self.action('confirm',c)[1]);self.assertIn('unsubscribed',self.action('unsubscribe',w)[1])
 def test_resend_transient_retry_same_idempotency_key(self):
  self.config('resend');type(self).provider_status=429;self.assertEqual(self.signup()[0],200);self.assertEqual(self.state()['mail'],{'retry':1});first=self.calls[0]
  self.sql('update waitlist_private.outbox set next_attempt=now()');type(self).provider_status=200;self.command('work');self.assertEqual(self.calls[1],first);self.assertEqual(self.state()['mail'],{'sent':1});self.assertEqual(self.sql('select payload is null from waitlist_private.outbox'),'t')
 def test_permanent_provider_failure_not_retried(self):
  self.config('resend');type(self).provider_status=403;self.signup();self.command('work');self.assertEqual(len(self.calls),1);self.assertEqual(self.state()['mail'],{'failed':1})
 def test_stale_leases_and_bounded_retry(self):
  self.config('resend');type(self).provider_status=500;self.signup();self.sql('update waitlist_private.outbox set next_attempt=now()');job=self.rpc('waitlist_claim',{});self.assertIsNotNone(job)
  self.assertFalse(self.rpc('waitlist_ack',dict(p_id=job['id'],p_lease=str(uuid.uuid4()),p_outcome='sent',p_provider_id=None)))
  self.sql("update waitlist_private.outbox set next_attempt=now()-interval '1 hour'");new=self.rpc('waitlist_claim',{});self.assertEqual(new['id'],job['id']);self.assertNotEqual(new['lease'],job['lease'])
  self.sql("update waitlist_private.outbox set created_at=now()-interval '24 hours'");self.assertIsNone(self.rpc('waitlist_claim',{}));self.assertEqual(self.state()['mail'],{'failed':1})
 def test_signed_delivery_webhook_suppression_and_replay(self):
  self.signup();pid=self.sql('select provider_id from waitlist_private.outbox');raw=json.dumps({'type':'email.bounced','data':{'email_id':pid}}).encode();ts=str(int(time.time()));eid='evt_test';sig=base64.b64encode(hmac.new(b'w'*32,eid.encode()+b'.'+ts.encode()+b'.'+raw,hashlib.sha256).digest()).decode();headers={'svix-id':eid,'svix-timestamp':ts,'svix-signature':'v1,'+sig,'Content-Type':'application/json'}
  self.assertEqual(self.http('POST','/waitlist/webhook.php',raw=raw,headers=headers|{'svix-signature':'bad'})[0],400)
  self.assertEqual(self.http('POST','/waitlist/webhook.php',raw=raw,headers=headers)[0],200);self.assertEqual(self.http('POST','/waitlist/webhook.php',raw=raw,headers=headers)[0],200);self.assertEqual(self.state()['subscribers'],{'suppressed':1});self.assertEqual(self.sql('select count(*) from waitlist_private.delivery_events'),'1')
 def test_concurrent_signups_and_webhook_before_ack(self):
  params=dict(p_name='Concurrent Owner',p_email='parallel@example.test',p_business_type='cleaning',p_interests=['seo'],p_consent_version='v1',p_consent_text='Consent',p_confirm='a'*64,p_withdraw='b'*64)
  with ThreadPoolExecutor(max_workers=4) as ex:result=list(ex.map(lambda _:self.rpc('waitlist_signup',params),range(4)))
  self.assertEqual(sum(x is not None for x in result),1);job=self.rpc('waitlist_claim',{});pid=str(uuid.uuid4());self.rpc('waitlist_delivery',dict(p_event_id='early-event',p_provider_id=pid,p_event_type='email.complained'));self.rpc('waitlist_ack',dict(p_id=job['id'],p_lease=job['lease'],p_outcome='sent',p_provider_id=pid));self.assertEqual(self.state()['subscribers'],{'suppressed':1})
 def test_retention_and_formula_export(self):
  self.signup(name='=HYPERLINK("https://example.test")');self.command('export');rows=list(csv.reader(io.StringIO(next(self.private.glob('*.csv')).read_text())));self.assertTrue(rows[1][0].startswith("'="));self.sql("update public.waitlist_subscribers set last_request_at=now()-interval '8 days'");self.command('cleanup');self.assertEqual(self.state()['subscribers'],{});self.assertEqual(self.state()['mail'],{})
 def test_database_outage_fails_closed(self):
  type(self).database_up=False;self.assertEqual(self.signup()[0],503);type(self).database_up=True;self.assertEqual(self.state()['subscribers'],{})
 def test_dedicated_page_links_and_no_modal(self):
  _,home,_=self.http('GET','/');self.assertEqual(home.count('href="waitlist.html" data-waitlist'),3);self.assertNotIn('<dialog',home);self.assertNotIn('showModal',home)
  _,page,_=self.http('GET','/waitlist.html');self.assertIn('class="wl-card wl-signup-page"',page);self.assertEqual(page.count('name="interests"'),6)

if __name__=='__main__':unittest.main(verbosity=2)
