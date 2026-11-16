"""Exact installed runtime + bounded candidate, native PHP and fictional ZA pilot.

Auth/REST are local adapters. No hosted writes, public publication or sends.
"""
import importlib.util,json,uuid,unittest,shutil,re,tempfile,hashlib,subprocess,os,tarfile,sys
from pathlib import Path
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('installed_scheduling',ROOT/'tests/installed-runtime.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
spec=importlib.util.spec_from_file_location('scheduling_stage',ROOT/'docs/v1-005/stage.py');stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage)
class Runtime(base.Installed):
 rpc_aliases={name:name for name in ['business_schedule_policy_read','business_schedule_policy_write','business_schedule_time_off_read','business_schedule_time_off_resolve']}
 @classmethod
 def setUpClass(cls):
  super().setUpClass();stage.install_database(cls.sql)
  for p in (ROOT/'docs/v1-005/runtime').rglob('*'):
   if p.is_file():shutil.copyfile(p,cls.webroot/p.relative_to(ROOT/'docs/v1-005/runtime'))
  cls.restart_php()
 def call_new(self,u,b,name,**args):
  args={'p_business':b,'p_environment':'preview'}|args
  return json.loads(self.context(u,b,q='select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb'if isinstance(v,(dict,list))else lit(v))for k,v in args.items())+')'))
 def settings(self,u,b,version=0):
  return self.call_new(u,b,'business_schedule_policy_write',p_version=version,p_enabled=True,p_zone='Africa/Johannesburg',p_hours=[dict(day=i,start=480,end=1080)for i in range(1,8)],p_before=30,p_after=30,p_ack_legacy=True)
 def job(self,u,b,local='2090-05-20 09:00'):
  bid=str(uuid.uuid4());self.call_new(u,b,'business_booking_write',p_id=bid,p_version=0,p_quote=None,p_document=self.document(),p_address='Synthetic address',p_local=local,p_zone='Africa/Johannesburg',p_duration=60,p_status='Scheduled');return bid
 def test_07_owner_php_settings_and_failed_assignment_retains_input(self):
  u,b=self.ids[0],self.bids[0];self.login(u)
  html=self.get('/account/schedule.php')[1];self.assertIn('Working hours &amp; buffers',html)
  fields=dict(version='0',enabled='on',zone='Africa/Johannesburg',before='30',after='30',ack='on')
  for i in range(1,8):fields|={'day_'+str(i):'on','start_'+str(i):'08:00','end_'+str(i):'18:00'}
  html=self.post('/account/schedule.php',**fields);self.assertIn('Scheduling settings saved.',html)
  html=self.post('/account/schedule.php',**(fields|dict(start_1='07:15')));self.assertIn('settings changed',html);self.assertIn('value="07:15"',html);self.assertIn('name="version" value="0"',html)
  staff=str(uuid.uuid4());self.call_new(u,b,'business_staff_write',p_id=staff,p_version=0,p_name='Synthetic PHP worker',p_email='',p_phone='',p_active=True)
  a=self.job(u,b);c=self.job(u,b,'2090-05-20 09:30');self.call_new(u,b,'business_staff_assign',p_booking=a,p_version=0,p_staff=[staff]);before=self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(c))
  html=self.post('/account/bookings.php?id='+c,action='assign',id=c,assignment_version='0',**{'staff_ids[]':staff});self.assertIn('already assigned during this time',html);self.assertRegex(html,'value="'+staff+'"[^>]*checked');self.assertIn('name="assignment_version" value="0"',html)
  self.assertEqual(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(c)),before)
  self.enable();manager=self.member('manager');self.login(manager);html=self.get('/account/schedule.php')[1];self.assertNotIn('name="enabled"',html)
  with self.assertRaises(RuntimeError):self.call_new(manager,b,'business_schedule_policy_write',p_version=1,p_enabled=False,p_zone='Africa/Johannesburg',p_hours=[],p_before=0,p_after=0)
  self.enable(False)
 def test_08_fresh_independent_za_request_to_paid_and_correction_history(self):
  owner=str(uuid.uuid4());self.sql('insert into auth.users(id) values('+lit(owner)+')')
  b=json.loads(self.context(owner,str(uuid.uuid4()),q="select public.business_context_create('Synthetic independent ZA cleaning','cleaning','ZA','Africa/Johannesburg')"))['business_id']
  profile=dict(name='Synthetic independent ZA cleaning',description='Fictional isolated pilot only',email='pilot@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None)
  slug='synthetic-za-'+uuid.uuid4().hex[:10]
  self.call_new(owner,b,'business_profile_save',p_slug=slug,p_draft=profile,p_version=0)
  svc=dict(id=uuid.uuid4().hex,name='Synthetic quoted cleaning',description='',duration=90,mode='quote',amount=None,visible=True,archived=False)
  self.call_new(owner,b,'business_services_save',p_draft=dict(currency='ZAR',items=[svc]),p_version=0)
  self.call_new(owner,b,'business_services_publish',p_version=1);self.call_new(owner,b,'business_profile_publish',p_version=1)
  published=self.sql('select document from public.business_public_pages where business_id='+lit(b))
  self.call_new(owner,b,'business_profile_save',p_slug=slug,p_draft=profile|dict(description='PRIVATE revised description'),p_version=1)
  self.assertEqual(self.sql('select document from public.business_public_pages where business_id='+lit(b)),published)
  self.settings(owner,b);staff=str(uuid.uuid4());self.call_new(owner,b,'business_staff_write',p_id=staff,p_version=0,p_name='Synthetic pilot worker',p_email='',p_phone='',p_active=True)
  request=str(uuid.uuid4());args=dict(p_environment='preview',p_slug=slug,p_service=svc['id'],p_name='Synthetic guest',p_email='guest@example.test',p_phone='',p_requirements='Synthetic cleaning request',p_request=request,p_address='123 Synthetic Cape Town Road',p_local='2090-05-20 10:00',p_zone='Africa/Johannesburg',p_currency='ZAR',p_service_snapshot=svc)
  guest='set role anon;select public.business_booking_request_submit('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb'if isinstance(v,dict)else lit(v))for k,v in args.items())+')'
  self.sql(guest);self.sql(guest);request=self.sql('select id from public.business_enquiries where request_id='+lit(request));self.assertEqual(self.sql('select count(*) from public.business_booking_requests where id='+lit(request)),'1')
  self.assertEqual(self.sql('select count(*) from public.business_booking_staff where business_id='+lit(b)),'0')
  quote=self.call_new(owner,b,'business_booking_request_action',p_id=request,p_version=1,p_action='quote')['quote_id']
  doc=json.loads(self.sql('select document from public.business_quotes where id='+lit(quote)));doc['items'][0]['price']=87525
  self.call_new(owner,b,'business_quote_write',p_id=quote,p_version=1,p_action='save',p_document=doc,p_expiry=self.sql('select current_date+14'),p_enquiry=request)
  self.call_new(owner,b,'business_quote_send',p_id=quote,p_version=2)
  token=self.sql('select share_token from public.business_quotes where id='+lit(quote));self.sql("set role anon;select public.business_quote_customer('preview',"+lit(token)+",'Accepted')")
  self.call_new(owner,b,'business_booking_request_action',p_id=request,p_version=2,p_action='accept')
  bid=self.call_new(owner,b,'business_booking_request_action',p_id=request,p_version=3,p_action='convert')['booking_id']
  self.call_new(owner,b,'business_staff_assign',p_booking=bid,p_version=0,p_staff=[staff])
  self.call_new(owner,b,'business_booking_write',p_id=bid,p_version=1,p_quote=quote,p_document=doc,p_address='123 Synthetic Cape Town Road',p_local='2090-05-20 10:00',p_zone='Africa/Johannesburg',p_duration=90,p_status='Completed')
  invoice=str(uuid.uuid4());self.call_new(owner,b,'business_invoice_write',p_id=invoice,p_version=0,p_action='save',p_booking=bid,p_due=self.sql('select current_date+14'))
  self.call_new(owner,b,'business_invoice_write',p_id=invoice,p_version=1,p_action='issue')
  receipt=str(uuid.uuid4());payment=dict(p_invoice=invoice,p_id=receipt,p_amount=87525,p_paid_on=self.sql('select current_date'),p_reference='SYNTH-ZA-PILOT')
  self.call_new(owner,b,'business_invoice_payment',**payment);self.call_new(owner,b,'business_invoice_payment',**payment)
  original=self.sql('select to_jsonb(i) from public.business_invoices i where id='+lit(invoice));original_receipt=self.sql('select to_jsonb(p) from public.business_invoice_payments p where id='+lit(receipt))
  self.assertEqual(self.sql('select balance from public.business_invoice_list where id='+lit(invoice)),'0')
  self.call_new(owner,b,'business_invoice_payment',**(payment|dict(p_id=str(uuid.uuid4()),p_reversal=receipt,p_reason='Synthetic correction rehearsal')))
  self.call_new(owner,b,'business_invoice_write',p_id=invoice,p_version=int(self.sql('select version from public.business_invoices where id='+lit(invoice))),p_action='void',p_reason='Synthetic correction rehearsal')
  version=int(self.sql('select version from public.business_invoices where id='+lit(invoice)))
  child=self.call_new(owner,b,'business_invoice_write',p_id=invoice,p_version=version,p_action='replace',p_reason='Synthetic correction rehearsal')['id']
  self.assertEqual(self.sql('select replaces_id from public.business_invoices where id='+lit(child)),invoice)
  self.assertEqual(self.sql('select to_jsonb(p) from public.business_invoice_payments p where id='+lit(receipt)),original_receipt)
  self.assertEqual(json.loads(original)['document'],json.loads(self.sql('select document from public.business_invoices where id='+lit(invoice))))
  # Cancellation releases operational capacity without deleting assignments.
  extra=self.job(owner,b,'2090-05-21 10:00');self.call_new(owner,b,'business_staff_assign',p_booking=extra,p_version=0,p_staff=[staff]);self.call_new(owner,b,'business_booking_write',p_id=extra,p_version=1,p_quote=None,p_document=self.document(),p_address='Synthetic address',p_local='2090-05-21 10:00',p_zone='Africa/Johannesburg',p_duration=60,p_status='Cancelled')
  replacement=self.job(owner,b,'2090-05-21 10:00');self.call_new(owner,b,'business_staff_assign',p_booking=replacement,p_version=0,p_staff=[staff])
  self.assertEqual(self.sql('select count(*) from public.business_booking_staff where booking_id='+lit(extra)),'1')
  with self.assertRaises(RuntimeError):self.call_new(self.ids[1],b,'business_staff_assign',p_booking=bid,p_version=1,p_staff=[])
  self.assertGreater(int(self.sql('select count(*) from authorization_private.scheduling_history where business_id='+lit(b))),5)
  self.pilot_ids=dict(owner=owner,business=b,request=request,quote=quote,booking=bid,invoice=invoice,receipt=receipt,replacement=child)
 def test_09_encrypted_recovery_and_guarded_ui_rollback_preserve_new_history(self):
  from journey import PGBIN
  def fingerprint(db='postgres'):
   def query(q):
    r=subprocess.run([str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(self.pgport),'-d',db,'-v','ON_ERROR_STOP=1','-c',q],env=self.env,capture_output=True,text=True)
    if r.returncode:raise RuntimeError(r.stderr)
    return r.stdout.strip()
   tables=json.loads(query("select jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'"))
   return {t:query("select count(*)||':'||md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from "+t+' t')for t in tables}
  before=fingerprint()
  with self.assertRaisesRegex(RuntimeError,'retain compatible UI'):stage.rollback_ready(self.sql)
  self.assertEqual(fingerprint(),before)
  # Use the existing enhanced production backup generator, which captures the
  # complete authorization_private schema, including all new scheduling state.
  sp=importlib.util.spec_from_file_location('scheduling_backup',ROOT/'docs/sc04/shared.py');shared=importlib.util.module_from_spec(sp);sp.loader.exec_module(shared)
  application=shared.stage(Path(self.tmp.name)/'backup-app');output=Path(self.tmp.name)/'encrypted-scheduling';key='SYNTHETIC-ONLY-'+uuid.uuid4().hex
  env=dict(self.env,FARAIOS_BACKUP_TEST='1',PGHOST='127.0.0.1',PGPORT=str(self.pgport),PGUSER=os.environ.get('USER','agent'),PGDATABASE='postgres',PG_BIN=str(PGBIN),BACKUP_PASSPHRASE=key,BACKUP_OUTPUT=str(output))
  p=subprocess.run([sys.executable,str(application/'scripts/database-backup.py')],env=env,capture_output=True,text=True);self.assertEqual(p.returncode,0,p.stderr+p.stdout)
  archive=next(output.glob('*.gpg'));plain=Path(self.tmp.name)/'synthetic-backup.tar';gpg_env=dict(self.env,GNUPGHOME=str(Path(self.tmp.name)/'gpg-scheduling'));Path(gpg_env['GNUPGHOME']).mkdir(mode=0o700)
  p=subprocess.run(['gpg','--batch','--yes','--pinentry-mode','loopback','--passphrase-fd','0','--output',str(plain),'--decrypt',str(archive)],env=gpg_env,input=(key+'\n').encode(),capture_output=True);self.assertEqual(p.returncode,0,p.stderr)
  unpack=Path(self.tmp.name)/'unpacked';unpack.mkdir()
  with tarfile.open(plain)as tar:tar.extractall(unpack,filter='data')
  manifest=json.loads((unpack/'manifest.json').read_text());self.assertIn('authorization_private',manifest['schemas'])
  dump=unpack/'database.dump';conn=['-h','127.0.0.1','-p',str(self.pgport)]
  subprocess.run([str(PGBIN/'createdb'),*conn,'scheduling_restore'],env=self.env,check=True,capture_output=True)
  subprocess.run([str(PGBIN/'psql'),*conn,'-d','scheduling_restore','-c','drop schema public'],env=self.env,check=True,capture_output=True)
  p=subprocess.run([str(PGBIN/'pg_restore'),*conn,'-d','scheduling_restore','--no-owner','--exit-on-error',str(dump)],env=self.env,capture_output=True,text=True);self.assertEqual(p.returncode,0,p.stderr)
  self.assertEqual(fingerprint('scheduling_restore'),before);self.assertEqual(fingerprint(),before)
  self.assertTrue(all('authorization_private.scheduling_'+t in before for t in ['policies','legacy','history','scope_versions','time_off_resolutions']))
  # Only after every synthetic scope is explicitly taken out of strict mode
  # after work resolution may a bounded UI rollback be considered.
  self.sql("update public.business_bookings set status='Completed' where status in ('Scheduled','In Progress')")
  for policy in json.loads(self.sql("select jsonb_agg(to_jsonb(p)||jsonb_build_object('owner',b.owner_id)) from authorization_private.scheduling_policies p join public.businesses b on b.id=p.business_id where p.enabled")):
   self.call_new(policy['owner'],policy['business_id'],'business_schedule_policy_write',p_version=policy['version'],p_enabled=False,p_zone=policy['zone'],p_hours=policy['hours'],p_before=policy['before_minutes'],p_after=policy['after_minutes'])
  preserved=fingerprint();stage.rollback_ready(self.sql)
  sp=importlib.util.spec_from_file_location('file_guard',ROOT/'docs/v1-017/guarded-files.py');guard=importlib.util.module_from_spec(sp);sp.loader.exec_module(guard)
  import zipfile
  with tempfile.TemporaryDirectory()as d:
   candidate=stage.stage(Path(d)/'candidate');packet=zipfile.ZipFile(ROOT/'docs/v1-017/runtime.zip')
   paths=['account/core.php','account/bookings.php','account/delegated.php'];plan={p:dict(expected=hashlib.sha256((candidate/p).read_bytes()).hexdigest(),replacement=packet.read(p))for p in paths}
   old=(candidate/paths[-1]).read_bytes();(candidate/paths[-1]).write_bytes(old+b'concurrent edit')
   with self.assertRaises(ValueError):guard.apply(candidate,plan)
   self.assertEqual((candidate/paths[0]).read_bytes(),(ROOT/'docs/v1-005/runtime'/paths[0]).read_bytes())
   (candidate/paths[-1]).write_bytes(old);guard.apply(candidate,plan)
   for p in paths:self.assertEqual((candidate/p).read_bytes(),packet.read(p))
   # New settings page and all additive database objects are retained for
   # compatible administration and forward repair; no historical data restore.
  self.assertEqual(fingerprint(),preserved)
 def test_10_synthetic_browser_settings_mobile_and_stale_recovery(self):
  from playwright.sync_api import sync_playwright
  u,b=self.ids[0],self.bids[0];type(self).sc04_login_user=u
  with sync_playwright()as pw:
   browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
   try:
    for width in [320,390,768,1280]:
     ctx=browser.new_context(viewport={'width':width,'height':900});page=ctx.new_page();page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click()
     page.goto(self.url+'/account/context.php');page.get_by_label('Business and environment',exact=True).select_option(b+':preview');page.get_by_role('button',name='Continue',exact=True).click();page.goto(self.url+'/account/schedule.php')
     self.assertIn('Working hours & buffers',page.locator('body').inner_text());self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
     version=int(page.locator('[name="version"]').input_value());self.settings(u,b,version)
     page.locator('#start_1').fill('07:15');page.get_by_role('button',name='Save scheduling settings',exact=True).click();self.assertIn('settings changed',page.get_by_role('alert').inner_text());self.assertEqual(page.locator('#start_1').input_value(),'07:15');self.assertEqual(page.locator('[name="version"]').input_value(),str(version))
     self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
     button=page.get_by_role('button',name='Save scheduling settings',exact=True);self.assertGreaterEqual(button.bounding_box()['height'],44)
     out=ROOT/'test-results/scheduling';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/('settings-'+str(width)+'.png')),full_page=True)
     page.get_by_role('link',name='Reload and compare saved settings',exact=True).click();self.assertEqual(page.locator('#start_1').input_value(),'08:00');ctx.close()
   finally:browser.close()

if __name__=='__main__':
 names=[n for n in base.f.Financial.__dict__ if n.startswith('test_')]+['test_exact_owner_and_manager_php_forms']+[n for n in Runtime.__dict__ if n.startswith('test_')and(n!='test_10_synthetic_browser_settings_mobile_and_stale_recovery'or os.environ.get('FARAIOS_SCHEDULING_BROWSER_CHECK')=='true')]
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Runtime(n)for n in names));raise SystemExit(not r.wasSuccessful())
