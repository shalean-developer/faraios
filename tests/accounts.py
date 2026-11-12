"""Real PHP HTTP + disposable PostgreSQL; Supabase Auth is simulated, never hosted email."""
import sys,os,json,urllib.request,urllib.error,urllib.parse,http.cookiejar,re,threading,subprocess,time,uuid,unittest
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from journey import Journey,ROOT,PHP,port
class Accounts(Journey):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql("create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;")
  cls.sql(next((ROOT/'supabase/migrations').glob('*account_business_setup.sql')).read_text())
  cls.sql(next((ROOT/'supabase/migrations').glob('*business_location_details.sql')).read_text())
  cls.ids=[str(uuid.uuid4()),str(uuid.uuid4())];cls.sql('insert into auth.users values '+','.join("('%s')"%x for x in cls.ids))
  cls.auth_calls=[];cls.confirmed=False;cls.used=False;cls.biz=[];cls.expired_login=False;cls.deny_refresh=False;cls.invalid_credentials=False;cls.biz_unavailable=False
  class Gateway(BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def call(self):
    body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or '{}');cls.auth_calls.append((self.path,body));status=200;data={}
    if self.path.startswith('/auth/v1/signup'):cls.saved_name=body['data']['name']
    elif self.path.startswith('/auth/v1/token'):
     if cls.deny_refresh and 'grant_type=refresh_token' in self.path:status=400;data={'error_code':'refresh_token_not_found'}
     elif cls.invalid_credentials:status=400;data={'error_code':'invalid_credentials'}
     elif not cls.confirmed:status=400;data={'error_code':'email_not_confirmed'}
     else:data={'access_token':'test_access','refresh_token':'test_refresh','expires_in':(-1 if cls.expired_login and 'grant_type=password' in self.path else 3600),'user':{'id':cls.ids[0]}}
    elif self.path=='/auth/v1/user':data={'id':cls.ids[0],'email':'owner@example.test','email_confirmed_at':'2026-11-12','user_metadata':{'name':cls.saved_name}}
    elif self.path=='/auth/v1/verify':
     if cls.used:status=403
     else:cls.used=True;cls.confirmed=True;data={'access_token':'test_access','refresh_token':'test_refresh'}
    elif self.path.startswith('/rest/v1/businesses'):
     if cls.biz_unavailable:status=503
     if self.command=='POST':cls.biz=[{'id':str(uuid.uuid4()),'name':body['name'],'business_type':body['business_type'],'country':body['country'],'time_zone':body['time_zone']}]
     if self.command=='PATCH':cls.biz[0].update(body)
     data=cls.biz
    self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode())
   do_POST=call;do_GET=call;do_PUT=call;do_PATCH=call
  cls.account_gateway=ThreadingHTTPServer(('127.0.0.1',0),Gateway);threading.Thread(target=cls.account_gateway.serve_forever,daemon=True).start()
  cls.accountbase='http://127.0.0.1:'+str(port());private=cls.private/'accounts';private.mkdir()
  (private/'config.php').write_text("<?php return ['enabled'=>true,'environment'=>'test','base_url'=>'"+cls.accountbase+"','supabase_url'=>'http://127.0.0.1:"+str(cls.account_gateway.server_port)+"','publishable_key'=>'test_public'];")
  cls.accountphp=subprocess.Popen([PHP,'-d','session.save_path='+str(private),'-S',cls.accountbase.removeprefix('http://'),'-t',str(ROOT)],env=dict(os.environ,FARAIOS_ACCOUNT_DIR=str(private)),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  cls.client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  for _ in range(80):
   try:cls.getpage('signup');break
   except OSError:time.sleep(.05)
 @classmethod
 def tearDownClass(cls):
  cls.accountphp.terminate();cls.accountphp.wait();cls.account_gateway.shutdown();super().tearDownClass()
 @classmethod
 def getpage(cls,page):
  r=cls.client.open(cls.accountbase+'/account/index.php?page='+page);return r.read().decode()
 @classmethod
 def submit(cls,page,**data):
  html=cls.getpage(page);data['csrf']=re.search('name="csrf" value="([^"]+)"',html)[1]
  r=cls.client.open(urllib.request.Request(cls.accountbase+'/account/index.php?page='+page,data=urllib.parse.urlencode(data).encode(),headers={'Origin':cls.accountbase}));cls.last_url=r.url;return r.read().decode()
 def test_01_account_journey(self):
  self.assertIn('Create your account',self.getpage('signup'))
  self.assertIn('12 and 128',self.submit('signup',name='Owner',email='owner@example.test',password='short'))
  self.assertIn('Enter a valid name',self.submit('signup',name='x'*121,email='owner@example.test',password='long-test-password'))
  self.assertIn('Check your email',self.submit('signup',name='Owner',email='owner@example.test',password='long-test-password'))
  self.submit('verify',email='owner@example.test')
  resend=[p for p,b in self.auth_calls if p.startswith('/auth/v1/resend')][-1]
  self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlparse(resend).query)['redirect_to'],[self.accountbase+'/account/index.php?page=confirm'])
  self.assertIn('Verify your email',self.submit('signin',email='owner@example.test',password='long-test-password'))
  self.assertIn('Email verified',self.submit('confirm',token_hash='a'*64,type='email'))
  self.assertEqual(self.last_url.split('?')[-1],'page=signin')
  self.assertIn('Tell us about',self.submit('signin',email='owner@example.test',password='long-test-password'))
  self.assertIn('Choose your business type',self.submit('business',business_name='Fresh Company',business_type='bad'))
  self.assertIn('Choose your country',self.submit('business',business_name='Fresh Company',business_type='cleaning',country='XX',time_zone='UTC'))
  self.assertIn('Choose a valid time zone',self.submit('business',business_name='Fresh Company',business_type='cleaning',country='ZA',time_zone='Invalid/Zone'))
  page=self.submit('business',business_name='Fresh Company',business_type='cleaning',country='ZA',time_zone='Africa/Johannesburg')
  for value in ['Fresh Company','Owner','South Africa','Africa/Johannesburg','Complete']:self.assertIn(value,page)
  type(self).biz[0].update(country=None,time_zone=None)
  self.assertIn('Needs details',self.getpage('welcome'))
  self.assertIn('complete your setup',self.getpage('business'))
  self.assertIn('South Africa',self.submit('business',country='ZA',time_zone='Africa/Johannesburg'))
  self.assertEqual(len(self.biz),1)
  self.assertEqual(self.biz[0]['name'],'Fresh Company')
  self.assertIn('Fresh Company',self.getpage('welcome'))
  self.assertIn('Welcome back',self.submit('welcome',action='logout'))
  self.assertIn('Welcome back',self.getpage('welcome'))
  self.assertIn('If an account exists',self.submit('forgot',email='owner@example.test'))
  type(self).used=False
  self.assertIn('Choose a new password',self.submit('confirm',token_hash='b'*64,type='recovery'))
  self.assertIn('do not match',self.submit('reset',password='new-long-password',password_confirm='different-long-password'))
  self.assertIn('Password updated',self.submit('reset',password='new-long-password',password_confirm='new-long-password'))
  self.assertIn('This email link is invalid',self.submit('confirm',token_hash='b'*64,type='recovery'))
  self.assertFalse(any('waitlist' in p for p,b in self.auth_calls))
 def test_02_csrf_and_headers(self):
  r=self.client.open(self.accountbase+'/account/index.php?page=signin');self.assertIn('no-store',r.headers['Cache-Control']);self.assertEqual(r.headers['Referrer-Policy'],'same-origin');self.assertIn("frame-ancestors 'none'",r.headers['Content-Security-Policy'])
  r=self.client.open(urllib.request.Request(self.accountbase+'/account/index.php?page=forgot',data=b'email=owner%40example.test'));self.assertIn('form has expired',r.read().decode())
  html=self.getpage('confirm');token=re.search('name="csrf" value="([^"]+)"',html)[1]
  body=urllib.parse.urlencode({'csrf':token,'token_hash':'c'*64,'type':'email'}).encode()
  r=type(self).client.open(urllib.request.Request(self.accountbase+'/account/index.php?page=confirm',data=body,headers={'Origin':'null'}));html=r.read().decode()
  self.assertIn('form has expired',html);self.assertIn('value="'+('c'*64)+'"',html)
  self.assertIn('account.js?v=20261112-2',html)
 def test_04_session_refresh_and_errors(self):
  type(self).expired_login=True
  type(self).confirmed=True
  self.assertIn('Fresh Company',self.submit('signin',email='owner@example.test',password='long-test-password'))
  self.assertTrue(any('grant_type=refresh_token' in p for p,b in self.auth_calls))
  self.submit('welcome',action='logout')
  type(self).deny_refresh=True
  self.assertIn('Your session has expired',self.submit('signin',email='owner@example.test',password='long-test-password'))
  self.assertEqual(self.last_url.split('?')[-1],'page=signin')
  self.assertIn('Welcome back',self.getpage('welcome'))
  type(self).deny_refresh=False;type(self).expired_login=False;type(self).invalid_credentials=True
  self.assertIn('Your email or password is incorrect',self.submit('signin',email='owner@example.test',password='bad-password'))
  type(self).invalid_credentials=False
 def test_05_idle_session_and_outage_logout(self):
  self.submit('signin',email='owner@example.test',password='long-test-password')
  jar=next(h.cookiejar for h in type(self).client.handlers if isinstance(h,urllib.request.HTTPCookieProcessor))
  cookie=next(c for c in jar if c.name.startswith('faraios_account_'))
  session_file=self.private/'accounts'/('sess_'+cookie.value)
  session_file.write_text(re.sub(r'touched\|i:\d+;', 'touched|i:'+str(int(time.time())-1801)+';',session_file.read_text()))
  self.assertIn('Welcome back',self.getpage('welcome'))
  self.submit('signin',email='owner@example.test',password='long-test-password')
  type(self).biz_unavailable=True
  self.assertIn('Welcome back',self.submit('welcome',action='logout'))
  type(self).biz_unavailable=False
  self.assertIn('Welcome back',self.getpage('welcome'))
 def test_03_rls(self):
  def scoped(uid,q,anonymous=False):
   return self.sql("set role authenticated;set request.jwt.claim.sub='"+uid+"';set request.jwt.claims='"+json.dumps({'is_anonymous':anonymous})+"';"+q)
  a,b=self.ids
  scoped(a,"insert into public.businesses(owner_id,name,business_type) values ('"+a+"','Native A','cleaning')")
  self.assertEqual(scoped(a,'select count(*) from public.businesses'),'1')
  self.assertEqual(scoped(b,'select count(*) from public.businesses'),'0')
  scoped(a,"update public.businesses set country='ZA',time_zone='Africa/Johannesburg'")
  self.assertEqual(scoped(a,'select country from public.businesses'),'ZA')
  scoped(b,"update public.businesses set country='GB',time_zone='Europe/London'")
  self.assertEqual(scoped(a,'select country from public.businesses'),'ZA')
  for country,zone in [('XX','UTC'),('ZA','Invalid/Zone'),('ZA',None)]:
   with self.assertRaises(RuntimeError):scoped(a,"update public.businesses set country='"+country+"',time_zone="+("'"+zone+"'" if zone else 'NULL'))
  with self.assertRaises(RuntimeError):scoped(a,"update public.businesses set owner_id='"+b+"'")
  scoped(b,"insert into public.businesses(owner_id,name,business_type,country,time_zone) values ('"+b+"','Native B','other','GB','Europe/London')")
  self.assertEqual(scoped(b,'select name from public.businesses'),'Native B')
  for q in ["insert into public.businesses(owner_id,name,business_type) values ('"+a+"','Forge','other')","update public.businesses set name='Stolen'","delete from public.businesses"]:
   with self.assertRaises(RuntimeError):scoped(b,q)
  with self.assertRaises(RuntimeError):self.sql('set role anon;select * from public.businesses')
  with self.assertRaises(RuntimeError):scoped(b,"insert into public.businesses(owner_id,name,business_type) values ('"+b+"','Anonymous','other')",True)
  with self.assertRaises(RuntimeError):scoped(a,"insert into public.businesses(owner_id,name,business_type) values ('"+a+"','Duplicate','other')")
if __name__=='__main__':
 suite=unittest.TestSuite(Accounts(n) for n in ['test_01_account_journey','test_02_csrf_and_headers','test_03_rls','test_04_session_refresh_and_errors','test_05_idle_session_and_outage_logout']);result=unittest.TextTestRunner(verbosity=2).run(suite);sys.exit(not result.wasSuccessful())
