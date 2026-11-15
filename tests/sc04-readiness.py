"""Independent live preparation and valid-payload tests; disposable PostgreSQL/PHP only."""
import importlib.util,json,uuid,unittest,shutil,re,subprocess,time,select
from concurrent.futures import ThreadPoolExecutor
from journey import ROOT,lit,PGBIN
spec=importlib.util.spec_from_file_location('shared_tests',ROOT/'tests/sc04-shared.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Readiness(base.Shared):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql((ROOT/'docs/sc04/live-readiness.sql').read_text())
  spec=importlib.util.spec_from_file_location('readiness',ROOT/'docs/sc04/readiness.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  ready=m.stage(cls.staged.name+'/readiness');shutil.copytree(ready,cls.webroot,dirs_exist_ok=True)
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
   router.write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(self.webroot))+".$path;require $_SERVER['SCRIPT_FILENAME'];return true;")
   type(self).url+='/preview';type(self).sc04_login_user=self.ids[0]
   self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
   html=self.post('/account/access.php',action='invite',recipient=recipient,role='worker')
   token=re.search('id="invite-code" readonly value="([a-f0-9]{64})"',html)[1]
   type(self).sc04_login_user=recipient
   self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
   html=self.get('/account/join.php')[1];self.assertIn(recipient,html)
   self.post('/account/join.php',business=self.bids[0],token=token)
   html=self.post('/account/context.php',context=self.bids[0]+':preview');self.assertIn('Jobs',html);self.assertNotIn('Record payment',html)
   self.invoke(self.ids[0],'business_membership_revoke',p_user=recipient)
   self.assertIn('No active business access',self.get('/account/delegated.php')[1])
  finally:
   type(self).sc04_login_user=None;type(self).url=oldurl;config.write_text(oldconfig);router.write_text(oldrouter);self.enable(False)
 def test_07_candidate_php_syntax(self):
  for p in (ROOT/'docs/sc04').glob('*.php'):
   r=subprocess.run([__import__('journey').PHP,'-l',str(p)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
if __name__=='__main__':
 names=[n for n in Readiness.__dict__ if n.startswith('test_')]
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Readiness(n) for n in names));raise SystemExit(not result.wasSuccessful())
