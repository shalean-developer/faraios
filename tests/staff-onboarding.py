"""Email-bound onboarding, disposable native PG/PHP only; no hosted sends."""
import importlib.util,json,uuid,unittest,hashlib,subprocess,re,http.cookiejar,urllib.request,urllib.parse,os
from journey import ROOT,lit
from concurrent.futures import ThreadPoolExecutor
spec=importlib.util.spec_from_file_location('readiness_tests',ROOT/'tests/sc04-readiness.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Onboarding(base.Readiness):
 staff_onboarding=True
 def newuser(self):
  u=str(uuid.uuid4());self.sql("insert into auth.users(id) values("+lit(u)+")");return u
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql('alter table auth.users add column email text;alter table auth.users add column email_confirmed_at timestamptz;')
  cls.sql((ROOT/'docs/onboarding/install.sql').read_text())
  cls.sql('insert into authorization_private.staff_onboarding_businesses values('+lit(cls.bids[0])+",'preview',true)")
 def fixture(self,role='worker',email=None):
  self.enable();u=str(uuid.uuid4());sid=str(uuid.uuid4());email=email or u+'@example.test'
  self.sql('insert into auth.users(id,email,email_confirmed_at) values('+','.join(map(lit,[u,email,'2026-11-15']))+')')
  self.invoke(self.ids[0],'business_staff_write',p_id=sid,p_version=0,p_name='Synthetic invitee',p_email=email,p_phone='',p_active=True)
  token=uuid.uuid4().hex+uuid.uuid4().hex
  i=json.loads(self.invoke(self.ids[0],'business_staff_invite',p_staff=sid,p_role=role,p_hash=hashlib.sha256(token.encode()).hexdigest(),p_sealed='x'*150))['id']
  return u,sid,i,token
 def accept(self,u,i,t):
  return self.context(u,self.bids[0],q='select public.business_staff_invite_accept('+lit(i)+",'preview',"+lit(t)+')')
 def test_onboard_01_accept_atomic_and_replay(self):
  for role in ['worker','manager','receptionist']:
   u,s,i,t=self.fixture(role);self.accept(u,i,t)
   self.assertEqual(self.sql('select role from public.business_memberships where user_id='+lit(u)),role)
   self.assertEqual(self.sql('select count(*) from authorization_private.worker_identities where user_id='+lit(u)),'1' if role=='worker' else '0')
   with self.assertRaises(RuntimeError):self.accept(u,i,t)
   data=json.loads(self.invoke(self.ids[0],'business_staff_invite_list'));self.assertNotIn('sealed_token',json.dumps(data));self.assertNotIn('token_hash',json.dumps(data))
 def test_onboard_02_wrong_unverified_expired_revoked(self):
  u,s,i,t=self.fixture();other=str(uuid.uuid4());self.sql('insert into auth.users(id,email,email_confirmed_at) values('+','.join(map(lit,[other,'wrong@example.test','2026-11-15']))+')')
  with self.assertRaises(RuntimeError):self.accept(other,i,t)
  self.sql('update auth.users set email_confirmed_at=null where id='+lit(u))
  with self.assertRaises(RuntimeError):self.accept(u,i,t)
  self.sql('update auth.users set email_confirmed_at=now() where id='+lit(u))
  with self.assertRaises(RuntimeError):self.accept(u,i,'0'*64)
  self.sql('update authorization_private.staff_invites set expires_at=now()-interval \'1 minute\' where id='+lit(i))
  with self.assertRaises(RuntimeError):self.accept(u,i,t)
  self.invoke(self.ids[0],'business_staff_invite_revoke',p_id=i)
  with self.assertRaises(RuntimeError):self.accept(u,i,t)
 def test_onboard_03_changed_staff_and_concurrent_accept(self):
  u,s,i,t=self.fixture();self.sql('update public.business_staff set email=\'changed@example.test\' where id='+lit(s))
  with self.assertRaises(RuntimeError):self.accept(u,i,t)
  self.assertEqual(self.sql('select count(*) from public.business_memberships where user_id='+lit(u)),'0')
  self.sql('update public.business_staff set email=(select email from auth.users where id='+lit(u)+') where id='+lit(s))
  self.assertEqual(self.sql('select revoked_at is not null from authorization_private.staff_invites where id='+lit(i)),'t')
  t=uuid.uuid4().hex+uuid.uuid4().hex
  i=json.loads(self.invoke(self.ids[0],'business_staff_invite',p_staff=s,p_role='worker',p_hash=hashlib.sha256(t.encode()).hexdigest(),p_sealed='x'*150))['id']
  def attempt(_):
   try:self.accept(u,i,t);return True
   except RuntimeError:return False
  with ThreadPoolExecutor(max_workers=2) as pool:self.assertEqual(sum(pool.map(attempt,range(2))),1)
 def test_onboard_04_link_conflict_rollback(self):
  u,s,i,t=self.fixture();other=str(uuid.uuid4());self.sql('insert into public.business_staff(id,business_id,environment,name,email,phone) values('+','.join(map(lit,[other,self.bids[0],'preview','Synthetic other','','']))+')')
  self.sql('insert into public.business_memberships values('+','.join(map(lit,[self.bids[0],'preview',u,'worker',False]))+');insert into authorization_private.worker_identities values('+','.join(map(lit,[self.bids[0],'preview',u,other]))+')')
  with self.assertRaises(RuntimeError):self.accept(u,i,t)
  self.assertEqual(self.sql('select active from public.business_memberships where user_id='+lit(u)),'f')
  self.assertEqual(self.sql('select accepted_at is null from authorization_private.staff_invites where id='+lit(i)),'t')
 def test_onboard_05_revocation_and_offboard(self):
  u,s,i,t=self.fixture();self.accept(u,i,t)
  self.assertEqual(self.read(u,'visits'),[])
  self.invoke(self.ids[0],'business_staff_offboard',p_staff=s)
  with self.assertRaises(RuntimeError):self.read(u,'visits')
  self.assertEqual(self.sql('select active from public.business_staff where id='+lit(s)),'f')
  self.assertEqual(self.sql('select count(*) from authorization_private.staff_invites where id='+lit(i)),'1')
 def test_onboard_06_acl_and_cross_scope(self):
  u,s,i,t=self.fixture()
  with self.assertRaises(RuntimeError):self.invoke(u,'business_staff_invite_list')
  with self.assertRaises(RuntimeError):self.context(u,self.bids[0],q='select * from authorization_private.staff_invites')
  with self.assertRaises(RuntimeError):self.context(u,self.bids[0],q="select public.business_staff_mail_claim('preview')")
  with self.assertRaises(RuntimeError):self.invoke(self.ids[1],'business_staff_invite_revoke',b=self.bids[1],p_id=i)
  self.assertEqual(self.sql('select accepted_at is null and revoked_at is null from authorization_private.staff_invites where id='+lit(i)),'t')
 def test_onboard_07_mail_lease(self):
  u,s,i,t=self.fixture()
  self.sql('update authorization_private.staff_invites set delivery=\'failed\' where id<>'+lit(i))
  j=json.loads(self.sql("set role service_role;select public.business_staff_mail_claim('preview')"));self.assertEqual(j['id'],i)
  self.assertEqual(json.loads(self.sql("set role service_role;select public.business_staff_mail_claim('preview')")),{})
  self.sql('set role service_role;select public.business_staff_mail_finish('+','.join(map(lit,[i,j['lease'],'provider-test',False]))+')')
  self.assertEqual(self.sql('select delivery from authorization_private.staff_invites where id='+lit(i)),'provider_accepted')
  self.sql("update authorization_private.staff_invites set delivery='sending',attempts=6,lease_until=now()-interval '1 minute' where id="+lit(i))
  self.assertEqual(json.loads(self.sql("set role service_role;select public.business_staff_mail_claim('preview')")),{})
  self.assertEqual(self.sql('select delivery from authorization_private.staff_invites where id='+lit(i)),'failed')
 def test_onboard_08_php_invite_accept_and_stale_session(self):
  self.enable();private=self.private/'profiles';config=private/'config.php';router=private/'router.php';oldconfig=config.read_text();oldrouter=router.read_text();oldurl=type(self).url
  try:
   config.write_text(oldconfig.replace(self.url,self.url+'/preview'))
   router.write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(self.webroot))+".$path;require $_SERVER['SCRIPT_FILENAME'];return true;")
   pair=json.loads(subprocess.check_output([os.environ.get('PHP_BIN','php'),'-r',"$p=sodium_crypto_box_keypair();echo json_encode(['public_key'=>bin2hex(sodium_crypto_box_publickey($p)),'secret_key'=>bin2hex(sodium_crypto_box_secretkey($p))]);"],text=True))
   webconfig=private/'invite.php';webconfig.write_text("<?php return ['enabled'=>true,'public_key'=>'"+pair['public_key']+"'];")
   self.env['FARAIOS_STAFF_INVITE_CONFIG']=str(webconfig);self.restart_php();type(self).url+='/preview'
   type(self).client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
   self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
   u=str(uuid.uuid4());sid=str(uuid.uuid4());email=u+'@example.test'
   self.sql('insert into auth.users(id,email,email_confirmed_at) values('+','.join(map(lit,[u,email,'2026-11-15']))+')')
   self.invoke(self.ids[0],'business_staff_write',p_id=sid,p_version=0,p_name='Synthetic PHP invitee',p_email=email,p_phone='',p_active=True)
   page=self.post('/account/staff-access.php',action='invite',staff=sid,role='worker')
   self.assertIn('Invitation queued',page,str(self.sc04_errors[-3:]))
   i=json.loads(self.sql('select row_to_json(q) from authorization_private.staff_invites q where staff_id='+lit(sid)))
   code="$pair=sodium_crypto_box_keypair_from_secretkey_and_publickey(hex2bin($argv[1]),hex2bin($argv[2]));echo sodium_crypto_box_seal_open(base64_decode($argv[3]),$pair);"
   token=subprocess.check_output([os.environ.get('PHP_BIN','php'),'-r',code,pair['secret_key'],pair['public_key'],i['sealed_token']],text=True)
   self.assertNotIn(token,page);self.assertNotIn(i['sealed_token'],page)
   # A fresh browser session captures fragment-derived POST, then signs in and returns.
   type(self).client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));type(self).sc04_login_user=u
   page=self.post('/account/staff-join.php',action='capture',invitation=i['id'],token=token);self.assertIn('Welcome back',page)
   page=self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password');self.assertIn('Accept invitation',page);self.assertIn('worker',page)
   page=self.post('/account/staff-join.php',action='accept');self.assertIn('Choose business',page)
   page=self.post('/account/context.php',context=self.bids[0]+':preview');self.assertIn('Jobs',page)
   self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
   page=self.get('/account/delegated.php')[1];self.assertNotIn('name="action" value="availability"',page);self.assertNotIn('Assigned visits</h2>',page)
  finally:
   type(self).sc04_login_user=None;type(self).url=oldurl;config.write_text(oldconfig);router.write_text(oldrouter);self.env.pop('FARAIOS_STAFF_INVITE_CONFIG',None);self.restart_php()
 def test_onboard_09_unregistered_email_and_resend_rotation(self):
  self.enable();sid=str(uuid.uuid4());email='new-'+sid+'@example.test';token='1'*64
  self.invoke(self.ids[0],'business_staff_write',p_id=sid,p_version=0,p_name='Synthetic new user',p_email=email,p_phone='',p_active=True)
  args=dict(p_staff=sid,p_role='worker',p_hash=hashlib.sha256(token.encode()).hexdigest(),p_sealed='x'*150)
  i=json.loads(self.invoke(self.ids[0],'business_staff_invite',**args))['id']
  with self.assertRaises(RuntimeError):self.invoke(self.ids[0],'business_staff_invite',**args)
  self.sql('update authorization_private.staff_invites set created_at=now()-interval \'2 minutes\' where id='+lit(i))
  args['p_hash']=hashlib.sha256(('2'*64).encode()).hexdigest();args['p_replace']=i
  second=json.loads(self.invoke(self.ids[0],'business_staff_invite',**args))['id']
  u=str(uuid.uuid4());self.sql('insert into auth.users(id,email,email_confirmed_at) values('+','.join(map(lit,[u,email,'2026-11-15']))+')')
  with self.assertRaises(RuntimeError):self.accept(u,i,token)
  self.accept(u,second,'2'*64)
 def test_onboard_10_encrypted_recovery(self):
  # Existing exporter/isolated restore compares every row, security ACL and sequence,
  # now including encrypted invitation queue and accepted/revoked lifecycle records.
  self.sc04_report_name='staff-onboarding-recovery.json'
  self.test_10_recovery_and_preservation()
 def test_onboard_11_mobile_desktop_browser(self):
  from playwright.sync_api import sync_playwright
  self.enable();private=self.private/'profiles';config=private/'config.php';router=private/'router.php';oldconfig=config.read_text();oldrouter=router.read_text();oldurl=type(self).url
  try:
   config.write_text(oldconfig.replace(self.url,self.url+'/preview'))
   router.write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(self.webroot))+".$path;if(preg_match('~\\.(css|js|svg)$~',$path,$m)){header('Content-Type: '.['css'=>'text/css','js'=>'application/javascript','svg'=>'image/svg+xml'][$m[1]]);readfile($_SERVER['SCRIPT_FILENAME']);return true;}require $_SERVER['SCRIPT_FILENAME'];return true;")
   self.restart_php();type(self).url+='/preview';checks=[]
   with sync_playwright() as pw:
    def launch_browser():return pw.chromium.launch(**({'executable_path':os.environ['FARAIOS_CHROMIUM']} if os.environ.get('FARAIOS_CHROMIUM') else {}),args=['--no-sandbox']+(['--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader'] if os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true' else []))
    browser=launch_browser()
    try:
     for width in [390,1280]:
      u,sid,i,t=self.fixture();type(self).sc04_login_user=u
      ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page()
      page.goto(self.url+'/account/staff-join.php#id='+i+'&token='+t)
      page.get_by_role('button',name='Continue securely',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true')
      page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true')
      page.get_by_role('button',name='Accept invitation',exact=True).wait_for()
      metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['scroll'],width);checks.append(dict(page='join',**metrics))
      page.get_by_role('button',name='Accept invitation',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true');page.get_by_label('Business and environment',exact=True).select_option(self.bids[0]+':preview');page.get_by_role('button',name='Continue',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true');page.get_by_role('heading',name='Fresh Test',exact=True).wait_for();ctx.close();browser.close();browser=launch_browser()
      type(self).sc04_login_user=None;ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page();page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('a@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true');page.goto(self.url+'/account/staff-access.php')
      page.get_by_label('Search staff',exact=True).fill('no-such-person');self.assertEqual(page.locator('.staff-result:visible').count(),0)
      page.get_by_label('Search staff',exact=True).fill('Synthetic invitee');self.assertGreater(page.locator('.staff-result:visible').count(),0)
      metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['scroll'],width);checks.append(dict(page='staff-search',**metrics))
      self.assertIn('Live and preview are separate',page.locator('#staff-search-scope').inner_text())
      self.assertEqual(page.get_by_role('navigation',name='Business',exact=True).count(),1)
      self.assertGreater(page.locator('.staff-invite-actions').count(),0)
      self.assertEqual(page.locator('.staff-access-card article').count(),0)
      self.assertEqual(page.locator('.staff-management[open]').count(),0)
      page.goto(self.url+'/account/staff.php');page.get_by_label('Search staff',exact=True).fill('no-such-person');self.assertEqual(page.locator('.staff-result:visible').count(),0);self.assertIn('No matching staff',page.locator('#matches').inner_text())
      page.get_by_label('Search staff',exact=True).fill('  SYNTHETIC INVITEE  ');self.assertGreater(page.locator('.staff-result:visible').count(),0)
      sample_email=page.locator('.staff-result').first.get_attribute('data-search').split(' ')[-1];page.get_by_label('Search staff',exact=True).fill(sample_email);self.assertGreater(page.locator('.staff-result:visible').count(),0)
      metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['scroll'],width);checks.append(dict(page='staff-directory-search',**metrics));ctx.close();browser.close();browser=launch_browser()
    finally:browser.close()
   (ROOT/'test-results/release/staff-onboarding-browser.json').write_text(json.dumps(dict(checks=checks,physical_phone=False,synthetic_only=True),indent=2))
  finally:
   type(self).sc04_login_user=None;type(self).url=oldurl;config.write_text(oldconfig);router.write_text(oldrouter);self.restart_php()
 def test_onboard_12_feature_gate_and_environment(self):
  u,s,i,t=self.fixture()
  with self.assertRaises(RuntimeError):self.context(u,self.bids[0],q='select public.business_staff_invite_accept('+lit(i)+",'live',"+lit(t)+')')
  self.sql('update authorization_private.staff_onboarding_businesses set enabled=false')
  with self.assertRaises(RuntimeError):self.accept(u,i,t)
  with self.assertRaises(RuntimeError):self.invoke(self.ids[0],'business_staff_offboard',p_staff=s)
  self.sql('update authorization_private.staff_onboarding_businesses set enabled=true')
  self.accept(u,i,t)
 def test_onboard_13_role_history_is_not_current_access(self):
  u,s,i,t=self.fixture('manager');self.accept(u,i,t)
  self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
  token=uuid.uuid4().hex+uuid.uuid4().hex
  second=json.loads(self.invoke(self.ids[0],'business_staff_invite',p_staff=s,p_role='receptionist',p_hash=hashlib.sha256(token.encode()).hexdigest(),p_sealed='x'*150))['id'];self.accept(u,second,token)
  rows={x['id']:x for x in json.loads(self.invoke(self.ids[0],'business_staff_invite_list'))}
  self.assertEqual(rows[i]['status'],'Revoked');self.assertEqual(rows[second]['status'],'Active')
if __name__=='__main__':
 suite=unittest.TestSuite(Onboarding(n) for n in sorted(dir(Onboarding)) if n.startswith('test_onboard_') and (n!='test_onboard_11_mobile_desktop_browser' or os.environ.get('FARAIOS_ONBOARDING_BROWSER')=='true'))
 result=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not result.wasSuccessful())
