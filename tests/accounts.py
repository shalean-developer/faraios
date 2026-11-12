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
  cls.ids=[str(uuid.uuid4()),str(uuid.uuid4())];cls.sql('insert into auth.users values '+','.join("('%s')"%x for x in cls.ids))
  cls.auth_calls=[];cls.confirmed=False;cls.used=False;cls.biz=[]
  class Gateway(BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def call(self):
    body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or '{}');cls.auth_calls.append((self.path,body));status=200;data={}
    if self.path.startswith('/auth/v1/token'):
     if not cls.confirmed:status=400
     else:data={'access_token':'test_access','refresh_token':'test_refresh','expires_in':3600,'user':{'id':cls.ids[0]}}
    elif self.path=='/auth/v1/user':data={'id':cls.ids[0],'email':'owner@example.test','email_confirmed_at':'2026-11-12'}
    elif self.path=='/auth/v1/verify':
     if cls.used:status=403
     else:cls.used=True;cls.confirmed=True;data={'access_token':'test_access','refresh_token':'test_refresh'}
    elif self.path.startswith('/rest/v1/businesses'):
     if self.command=='POST':cls.biz=[{'id':str(uuid.uuid4()),'name':body['name'],'business_type':body['business_type']}]
     data=cls.biz
    self.send_response(status);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode())
   do_POST=call;do_GET=call;do_PUT=call
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
  r=cls.client.open(urllib.request.Request(cls.accountbase+'/account/index.php?page='+page,data=urllib.parse.urlencode(data).encode(),headers={'Origin':cls.accountbase}));return r.read().decode()
 def test_01_account_journey(self):
  self.assertIn('Create your account',self.getpage('signup'))
  self.assertIn('12 and 128',self.submit('signup',name='Owner',email='owner@example.test',password='short'))
  self.assertIn('Check your email',self.submit('signup',name='Owner',email='owner@example.test',password='long-test-password'))
  self.assertIn('Please check',self.submit('signin',email='owner@example.test',password='long-test-password'))
  self.assertIn('Email verified',self.submit('confirm',token_hash='a'*64,type='email'))
  self.assertIn('Tell us about',self.submit('signin',email='owner@example.test',password='long-test-password'))
  self.assertIn('Choose your business type',self.submit('business',business_name='Fresh Company',business_type='bad'))
  self.assertIn('Fresh Company',self.submit('business',business_name='Fresh Company',business_type='cleaning'))
  self.assertIn('Fresh Company',self.getpage('welcome'))
  self.assertIn('Welcome back',self.submit('welcome',action='logout'))
  self.assertIn('Welcome back',self.getpage('welcome'))
  self.assertIn('If an account exists',self.submit('forgot',email='owner@example.test'))
  type(self).used=False
  self.assertIn('Choose a new password',self.submit('confirm',token_hash='b'*64,type='recovery'))
  self.assertIn('do not match',self.submit('reset',password='new-long-password',password_confirm='different-long-password'))
  self.assertIn('Password updated',self.submit('reset',password='new-long-password',password_confirm='new-long-password'))
  self.assertIn('Please check',self.submit('confirm',token_hash='b'*64,type='recovery'))
  self.assertFalse(any('waitlist' in p for p,b in self.auth_calls))
 def test_02_csrf_and_headers(self):
  r=self.client.open(self.accountbase+'/account/index.php?page=signin');self.assertIn('no-store',r.headers['Cache-Control']);self.assertIn("frame-ancestors 'none'",r.headers['Content-Security-Policy'])
  r=self.client.open(urllib.request.Request(self.accountbase+'/account/index.php?page=forgot',data=b'email=owner%40example.test'));self.assertIn('form has expired',r.read().decode())
 def test_03_rls(self):
  def scoped(uid,q,anonymous=False):
   return self.sql("set role authenticated;set request.jwt.claim.sub='"+uid+"';set request.jwt.claims='"+json.dumps({'is_anonymous':anonymous})+"';"+q)
  a,b=self.ids
  scoped(a,"insert into public.businesses(owner_id,name,business_type) values ('"+a+"','Native A','cleaning')")
  self.assertEqual(scoped(a,'select count(*) from public.businesses'),'1')
  self.assertEqual(scoped(b,'select count(*) from public.businesses'),'0')
  for q in ["insert into public.businesses(owner_id,name,business_type) values ('"+a+"','Forge','other')","update public.businesses set name='Stolen'","delete from public.businesses"]:
   with self.assertRaises(RuntimeError):scoped(b,q)
  with self.assertRaises(RuntimeError):self.sql('set role anon;select * from public.businesses')
  with self.assertRaises(RuntimeError):scoped(b,"insert into public.businesses(owner_id,name,business_type) values ('"+b+"','Anonymous','other')",True)
  with self.assertRaises(RuntimeError):scoped(a,"insert into public.businesses(owner_id,name,business_type) values ('"+a+"','Duplicate','other')")
if __name__=='__main__':
 suite=unittest.TestSuite(Accounts(n) for n in ['test_01_account_journey','test_02_csrf_and_headers','test_03_rls']);result=unittest.TextTestRunner(verbosity=2).run(suite);sys.exit(not result.wasSuccessful())
