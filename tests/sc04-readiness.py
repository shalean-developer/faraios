"""Independent live preparation and valid-payload tests; disposable PostgreSQL/PHP only."""
import importlib.util,json,uuid,unittest,shutil,re,subprocess,time,select
from concurrent.futures import ThreadPoolExecutor
from journey import ROOT,lit,PGBIN
spec=importlib.util.spec_from_file_location('shared_tests',ROOT/'tests/sc04-shared.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Readiness(base.Shared):
 sc04_report_name="sc04-readiness.json"
 matrix_count=6
 @classmethod
 def restart_php(cls):
  args=cls.proc.args;cls.proc.terminate();cls.proc.wait(timeout=10)
  cls.proc=subprocess.Popen(args,env=dict(__import__('os').environ,**cls.env,FARAIOS_ACCOUNT_DIR=str(cls.private/'profiles')),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for attempt in range(80):
   try:cls.get('/account/index.php?page=signin');break
   except OSError:time.sleep(.05)
  else:raise RuntimeError('Staged PHP server did not restart')
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql((ROOT/'docs/sc04/live-readiness.sql').read_text())
  spec=importlib.util.spec_from_file_location('readiness',ROOT/'docs/sc04/readiness.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  ready=m.stage(cls.staged.name+'/readiness');shutil.copytree(ready,cls.webroot,dirs_exist_ok=True)
  if 'Join a business' not in (cls.webroot/'account/index.php').read_text():raise AssertionError('Staged join entry missing')
  cls.restart_php()
 def test_01_independent_live_gate(self):
  self.enable();u=self.newuser();b=self.bids[0]
  self.sql('insert into public.business_memberships values('+','.join(map(lit,[b,'live',u,'manager',True]))+')')
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'customers',b=b,e='live')
  self.sql('insert into authorization_private.live_businesses(business_id) values('+lit(b)+')')
  with self.assertRaises(RuntimeError):self.read(u,'customers',b=b,e='live')
  for actor in [u,self.ids[0]]:
   with self.assertRaises(RuntimeError):self.context(actor,b,'live',q='update authorization_private.live_businesses set enabled=true')
  self.sql('update authorization_private.live_businesses set enabled=true where business_id='+lit(b))
  self.assertEqual(self.read(u,'customers',b=b,e='live'),[])
  with self.assertRaises(RuntimeError):self.read(u,'customers',b=self.bids[1],e='live')
  self.sql('update authorization_private.live_businesses set enabled=false where business_id='+lit(b))
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'customers',b=b,e='live')
  self.enable(False)
 def test_02_fresh_invitation_after_revocation(self):
  self.enable();u=self.member('manager');self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
  r=json.loads(self.invoke(self.ids[0],'business_invite_create',p_recipient=u,p_role='receptionist'))
  self.invoke(u,'business_invite_accept',p_token=r['token']);self.assertIsInstance(self.read(u,'customers'),list)
  with self.assertRaises(RuntimeError):self.invoke(u,'business_invite_accept',p_token=r['token'])
  self.assertEqual(self.sql('select role from public.business_memberships where business_id='+lit(self.bids[0])+' and environment=\'preview\' and user_id='+lit(u)),'receptionist')
  out=json.loads(self.invoke(self.ids[0],'business_access_list'))
  self.assertNotIn('token',json.dumps(out));self.assertNotIn('token_hash',json.dumps(out))
  for role in ['manager','receptionist','worker']:
   actor=self.member(role)
   with self.assertRaises(RuntimeError):self.invoke(actor,'business_access_list')
  self.enable(False)
 def test_03_valid_legacy_payloads_and_preservation(self):
  self.enable()
  for role in ['manager','receptionist','worker']:
   u=self.member(role);b=self.booking();scope=self.bids[0]
   args=[lit(scope),"'preview'",lit(b),'1','null',lit(json.dumps(self.document()))+'::jsonb',"'Synthetic valid address'","'2026-12-05 09:00'","'Africa/Johannesburg'",'90',"'Scheduled'"]
   q='select public.business_booking_write('+','.join(args)+')'
   before=self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(b))
   # Positive owner control: identical payload is valid; rollback avoids altering fixture.
   self.sql('begin;set role authenticated;set request.jwt.claim.sub='+lit(self.ids[0])+";set request.jwt.claims='{\"is_anonymous\":false}';reset request.headers;"+q+';rollback;')
   with self.assertRaises(RuntimeError):self.legacy(u,q)
   with self.assertRaisesRegex(RuntimeError,'permission denied for table business_bookings'):self.legacy(u,'update public.business_bookings set address=\'Synthetic bypass\' where id='+lit(b)+' returning id')
   self.assertEqual(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(b)),before)
  self.enable(False)
 def test_04_stale_customer_write_is_atomic(self):
  self.enable()
  for role in ['manager','receptionist']:
   u=self.member(role);i=str(uuid.uuid4());a=dict(p_id=i,p_version=0,p_details=dict(name='Synthetic stale',email='stale@example.test',phone='',address='',notes=''),p_confirm=True)
   self.command(u,'business_customer_write',a)
   before=self.sql('select to_jsonb(c) from public.business_customers c where id='+lit(i))
   with self.assertRaises(RuntimeError):self.command(u,'business_customer_write',a|dict(p_details=a['p_details']|dict(name='Stale overwrite')))
   self.assertEqual(self.sql('select to_jsonb(c) from public.business_customers c where id='+lit(i)),before)
  self.enable(False)
 def test_05_inflight_revocation_all_roles(self):
  self.enable();b=self.bids[0]
  for role in ['manager','receptionist','worker']:
   u=self.member(role);resource='visits' if role=='worker' else 'customers'
   prefix='set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';set request.headers="+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'
   q='select public.business_delegate_read('+','.join(map(lit,[b,'preview',resource]))+')'
   proc=subprocess.Popen([str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(self.pgport),'-d','postgres','-v','ON_ERROR_STOP=1'],env=self.env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
   try:
    proc.stdin.write('\\o /dev/null\nbegin;'+prefix+q+';\n\\o\n\\echo LOCKED\n');proc.stdin.flush()
    while True:
     self.assertTrue(select.select([proc.stdout],[],[],5)[0])
     if proc.stdout.readline().strip()=='LOCKED':break
    with ThreadPoolExecutor(max_workers=1) as pool:
     future=pool.submit(self.invoke,self.ids[0],'business_membership_revoke',p_user=u);time.sleep(.1);self.assertFalse(future.done())
     proc.stdin.write('commit;\n\\q\n');proc.stdin.flush();proc.stdin.close();proc.wait(timeout=5);future.result(timeout=5)
    with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,resource)
   finally:
    if proc.poll() is None:proc.kill();proc.wait()
    proc.stdout.close();proc.stderr.close()
  self.enable(False)
 def test_06_owner_invite_join_browser_contract(self):
  self.enable();recipient=self.newuser();oldurl=type(self).url;private=self.private/'profiles';config=private/'config.php';router=private/'router.php';oldconfig=config.read_text();oldrouter=router.read_text()
  try:
   config.write_text(oldconfig.replace(self.url,self.url+'/preview'))
   router.write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(self.webroot))+".$path;if(preg_match('~\\.(css|js|svg)$~',$path,$m)){header('Content-Type: '.['css'=>'text/css','js'=>'application/javascript','svg'=>'image/svg+xml'][$m[1]]);readfile($_SERVER['SCRIPT_FILENAME']);return true;}require $_SERVER['SCRIPT_FILENAME'];return true;")
   self.restart_php();type(self).url+='/preview';type(self).sc04_login_user=self.ids[0]
   self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
   html=self.post('/account/access.php',action='invite',recipient=recipient,role='worker')
   token=re.search('id="invite-code" readonly value="([a-f0-9]{64})"',html)[1]
   type(self).sc04_login_user=recipient
   self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
   self.assertIn('Join a business',self.get('/account/index.php?page=business')[1])
   self.post('/account/index.php?page=welcome',action='logout')
   self.assertIn('Welcome back',self.get('/account/join.php')[1])
   html=self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
   self.assertIn('Join business',html);self.assertIn(recipient,html)
   self.assertNotIn('Tell us about your business',html)
   count_before=self.sql('select count(*) from public.businesses')
   self.post('/account/join.php',business=self.bids[0],token=token)
   html=self.post('/account/context.php',context=self.bids[0]+':preview');self.assertIn('Jobs',html);self.assertNotIn('Record payment',html)
   self.invoke(self.ids[0],'business_membership_revoke',p_user=recipient)
   self.assertIn('No active business access',self.get('/account/delegated.php')[1])
   self.assertEqual(self.sql('select count(*) from public.businesses'),count_before)
  finally:
   type(self).sc04_login_user=None;type(self).url=oldurl;config.write_text(oldconfig);router.write_text(oldrouter);self.restart_php();self.enable(False)
 def test_10_existing_private_config_router(self):
  private=self.private/'profiles';config=private/'config.php';oldconfig=config.read_text();oldurl=type(self).url
  production=private/'production.php';preview=private/'preview-routed.php';router=private/'router.php';oldrouter=router.read_text()
  try:
   production.write_text(oldconfig);preview.write_text(oldconfig.replace(self.url,self.url+'/preview'))
   config.write_text("<?php return require __DIR__.((($_SERVER['SCRIPT_NAME']??'')==='/account/index.php')?'/production.php':'/preview-routed.php');")
   # This is the existing host's exact-entry config contract, not a host config change.
   self.restart_php();type(self).sc04_login_user=None
   self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
   html=self.get('/account/join.php')[1];self.assertIn('<h1>Join business</h1>',html);self.assertNotIn('configuration is unavailable',html)
   html=self.get('/account/context.php')[1];self.assertIn(':live',html);self.assertNotIn(':preview',html)
   html=self.post('/account/context.php',context=self.bids[0]+':live');self.assertIn('Good ',html);self.assertNotIn('could not load',html)
   html=self.get('/account/access.php')[1];self.assertIn('<h1>Access</h1>',html);self.assertIn(' · live',html)
   html=self.get('/account/delegated.php')[1];self.assertIn('Good ',html);self.assertNotIn('configuration is unavailable',html)
   self.post('/account/index.php?page=welcome',action='logout')
   # Production routing also preserves the signed-out Join return contract.
   self.assertIn('Welcome back',self.get('/account/join.php')[1])
   self.assertIn('<h1>Join business</h1>',self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password'))
  finally:
   type(self).url=oldurl;config.write_text(oldconfig);router.write_text(oldrouter)
   production.unlink(missing_ok=True);preview.unlink(missing_ok=True);self.restart_php()
 def test_07_candidate_php_syntax(self):
  for p in (ROOT/'docs/sc04').glob('*.php'):
   r=subprocess.run([__import__('journey').PHP,'-l',str(p)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
 def test_08_encrypted_recovery_upgrade(self):
  self.test_10_recovery_and_preservation()
 def test_09_browser_layout(self):
  from playwright.sync_api import sync_playwright
  import os
  self.enable();oldurl=type(self).url;private=self.private/'profiles';config=private/'config.php';router=private/'router.php';oldconfig=config.read_text();oldrouter=router.read_text();checks=[]
  def capture(page,path):
   if os.environ.get('FARAIOS_SKIP_SCREENSHOTS')!='true':page.screenshot(timeout=10000,animations='disabled',path=str(path),full_page=True)
  actors={role:self.member(role) for role in ['manager','receptionist','worker']}
  manager=actors['manager'];worker=actors['worker'];sid=str(uuid.uuid4());booking=self.booking()
  self.command(manager,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic mobile worker',p_email='private@example.test',p_phone='',p_active=True))
  self.invoke(self.ids[0],'business_worker_link',p_user=worker,p_staff=sid)
  self.command(manager,'business_staff_assign',dict(p_booking=booking,p_version=0,p_staff=[sid]))
  out=ROOT/'test-results/release';out.mkdir(parents=True,exist_ok=True)
  try:
   config.write_text(oldconfig.replace(self.url,self.url+'/preview'))
   router.write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(self.webroot))+".$path;if(preg_match('~\\.(css|js|svg)$~',$path,$m)){header('Content-Type: '.['css'=>'text/css','js'=>'application/javascript','svg'=>'image/svg+xml'][$m[1]]);readfile($_SERVER['SCRIPT_FILENAME']);return true;}require $_SERVER['SCRIPT_FILENAME'];return true;")
   self.restart_php();type(self).url+='/preview'
   with sync_playwright() as playwright:
    def launch_browser():return playwright.chromium.launch(**({'executable_path':os.environ['FARAIOS_CHROMIUM']} if os.environ.get('FARAIOS_CHROMIUM') else {}),args=['--no-sandbox']+(['--single-process','--no-zygote','--disable-gpu','--disable-software-rasterizer'] if os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true' else []))
    browser=launch_browser()
    try:
     for width in [390,1280]:
      for role,actor in actors.items():
       type(self).sc04_login_user=actor
       ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page()
       page.goto(self.url+'/account/join.php');page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true');page.get_by_role('heading',name='Join business',exact=True).wait_for()
       for label,path in [('join','join.php'),('context','context.php')]:
        page.goto(self.url+'/account/'+path);page.get_by_role('heading',level=1).wait_for();metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertEqual(metrics['width'],width);self.assertLessEqual(metrics['scroll'],width);checks.append(dict(role=role,page=label,**metrics));capture(page,out/f'sc04-{role}-{label}-{width}.png')
       page.get_by_label('Business and environment',exact=True).select_option(self.bids[0]+':preview');page.get_by_role('button',name='Continue',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true');page.get_by_role('heading',name='Fresh Test',exact=True).wait_for()
       self.assertEqual(page.locator('.workspace-role').text_content(),role+' workspace');self.assertEqual(page.locator('.workspace-environment').text_content(),'preview');metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertEqual(metrics['width'],width);self.assertLessEqual(metrics['scroll'],width);checks.append(dict(role=role,page='workspace',**metrics))
       if width==390:
        page.locator('.drawer-open').click(force=True);self.assertTrue(page.locator('.app-sidebar').evaluate('(e)=>e.classList.contains("is-open")'));page.keyboard.press('Escape')
       self.assertEqual(page.locator('.workspace-signout button').count(),1)
       self.assertEqual(page.locator('.app-sidebar nav a').count(),{'manager':7,'receptionist':5,'worker':1}[role])
       if role=='worker':self.assertEqual(page.get_by_role('link',name='Payments',exact=True).count(),0);self.assertNotIn('50500',page.locator('body').inner_text())
       capture(page,out/f'sc04-{role}-workspace-{width}.png');ctx.close();browser.close();browser=launch_browser()
      type(self).sc04_login_user=None
      ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page();page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('a@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click(force=os.environ.get('FARAIOS_BROWSER_SINGLE_PROCESS')=='true');page.goto(self.url+'/account/access.php');page.get_by_role('heading',name='Access',exact=True).wait_for();metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertEqual(metrics['width'],width);self.assertLessEqual(metrics['scroll'],width);checks.append(dict(role='owner',page='access',**metrics));capture(page,out/f'sc04-owner-access-{width}.png');ctx.close();browser.close();browser=launch_browser()
    finally:browser.close()
   (out/'sc04-browser-layout.json').write_text(json.dumps(dict(status='PASS',checks=checks,source='exact staged native PHP; simulated Auth/REST; disposable database',physical_phone=False,screenshots=os.environ.get('FARAIOS_SKIP_SCREENSHOTS')!='true'),indent=2)+'\n')
  finally:
   type(self).sc04_login_user=None;type(self).url=oldurl;config.write_text(oldconfig);router.write_text(oldrouter);self.restart_php();self.enable(False)

if __name__=='__main__':
 names=[n for n in Readiness.__dict__ if n.startswith('test_') and (n!='test_09_browser_layout' or __import__('os').environ.get('FARAIOS_MOBILE_BROWSER_CHECK')=='true')]
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Readiness(n) for n in names));raise SystemExit(not result.wasSuccessful())
