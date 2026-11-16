"""D04–D06 native workflow/permission regression; disposable PG and simulated Auth/REST only."""
import importlib.util,json,uuid,unittest,re,os
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('repairs',ROOT/'tests/defect-repairs.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
spec=importlib.util.spec_from_file_location('onboarding',ROOT/'tests/staff-onboarding.py');onboarding=importlib.util.module_from_spec(spec);spec.loader.exec_module(onboarding)
class Workflow(base.Repairs):
 sc04_report_name='workflow-repairs.json';staff_onboarding=True
 newuser=onboarding.Onboarding.newuser
 fixture=onboarding.Onboarding.fixture
 accept=onboarding.Onboarding.accept
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql('alter table auth.users add column email text;alter table auth.users add column email_confirmed_at timestamptz;')
  cls.sql((ROOT/'docs/onboarding/install.sql').read_text())
  cls.sql('insert into authorization_private.staff_onboarding_businesses values('+lit(cls.bids[0])+",'preview',true)")
 def quote(self,status='Accepted',b=None,e='preview'):
  q=str(uuid.uuid4());self.sql('insert into public.business_quotes(id,business_id,environment,document,expires_on,status,share_token,sent_at,sender) values('+','.join([lit(q),lit(b or self.bids[0]),lit(e),lit(json.dumps(self.document()))+'::jsonb',"current_date+14",lit(status),lit(uuid.uuid4().hex+uuid.uuid4().hex) if status!='Draft' else 'null','now()' if status!='Draft' else 'null',lit(json.dumps({'time_zone':'Africa/Johannesburg'}))+'::jsonb'])+')');return q
 def schedule_args(self,q,**kw):
  return dict(p_id=str(uuid.uuid4()),p_version=0,p_quote=q,p_document=None,p_address='Synthetic service address',p_local='2026-12-07T09:00',p_zone='Africa/Johannesburg',p_duration=90,p_status='Scheduled',selection_version=1)|kw
 def test_d04_scoped_selection_and_stale(self):
  self.enable()
  for role in ['manager','receptionist']:
   actor=self.member(role);q=self.quote();self.login(actor)
   html=self.get('/account/delegated.php?view=quotes')[1];self.assertIn('Schedule this quote',html);self.assertNotIn('Accepted quote ID',html)
   html=self.post('/account/delegated.php?view=quotes',action='booking',quote=q,selection_version=1,address='Synthetic service address',starts_at='2026-12-07T09:00',duration=90)
   self.assertIn('Saved.',html);bid=self.sql('select id from public.business_bookings where quote_id='+lit(q));self.assertTrue(bid)
   html=self.get('/account/delegated.php?view=bookings')[1];self.assertIn('Open or create invoice',html);self.assertNotIn('Booking ID',html);self.assertNotIn('Invoice ID',html)
   html=self.post('/account/delegated.php?view=bookings',action='invoice',booking=bid,selection_version=1,due_on=self.sql('select current_date+14'))
   self.assertIn('Issue this invoice',html);self.assertNotIn('The record changed',html)
   iid=self.sql('select id from public.business_invoices where booking_id='+lit(bid));self.assertTrue(iid)
   self.post('/account/delegated.php?view=bookings',action='issue',id=iid,version=1)
   self.assertEqual(self.sql('select state from public.business_invoices where id='+lit(iid)),'Issued')
   self.assertEqual(json.loads(self.sql('select document from public.business_invoices where id='+lit(iid))),self.document())
   before=self.sql('select row_to_json(t) from public.business_invoices t where id='+lit(iid))
   html=self.post('/account/delegated.php?view=bookings',action='invoice',booking=bid,selection_version=1,due_on=self.sql('select current_date+30'));self.assertIn('Issued',html)
   self.assertEqual(self.sql('select row_to_json(t) from public.business_invoices t where id='+lit(iid)),before)
   if role=='receptionist':
    for resource in ['invoices','payments']:
     with self.assertRaises(RuntimeError):self.page(actor,resource)
   q=self.quote();a=self.schedule_args(q,selection_version=2)
   with self.assertRaisesRegex(RuntimeError,'selected record changed'):self.command(actor,'business_booking_write',a)
   self.sql('update public.business_quotes set version=2 where id='+lit(q))
   with self.assertRaises(RuntimeError):self.command(actor,'business_booking_write',self.schedule_args(q))
   for invalid in [self.quote('Draft'),self.quote(b=self.bids[1]),self.quote(e='live')]:
    with self.assertRaises(RuntimeError):self.command(actor,'business_booking_write',self.schedule_args(invalid))
   self.assertEqual(self.sql('select count(*) from public.business_bookings where id='+lit(a['p_id'])),'0')
   for changes in [dict(selection_version=99),dict(p_booking=self.booking(),selection_version=0)]:
    with self.assertRaises(RuntimeError):self.command(actor,'business_invoice_write',dict(p_id=str(uuid.uuid4()),p_version=0,p_action='save',p_booking=bid,p_due=self.sql('select current_date+14'),selection_version=1)|changes)
  self.enable(False)
 def test_d05_edit_stale_denial_and_identity(self):
  self.enable();m=self.member('manager');w,s,i,token=self.fixture(email='original-worker@example.test');self.accept(w,i,token)
  self.login(m);html=self.get('/account/delegated.php?view=staff')[1];self.assertIn('Edit staff',html)
  before=self.sql('select row_to_json(t) from authorization_private.worker_identities t where user_id='+lit(w));member=self.sql('select row_to_json(t) from public.business_memberships t where user_id='+lit(w));bid=self.booking();self.command(m,'business_staff_assign',dict(p_booking=bid,p_version=0,p_staff=[s]))
  html=self.post('/account/delegated.php?view=staff',action='staff',id=s,version=1,name='Synthetic edited staff',email='updated-worker@example.test',phone='0123456789',active='on');self.assertIn('Saved.',html)
  self.assertEqual(self.sql('select name from public.business_staff where id='+lit(s)),'Synthetic edited staff')
  self.assertEqual(self.sql('select row_to_json(t) from authorization_private.worker_identities t where user_id='+lit(w)),before)
  self.assertEqual(self.sql('select row_to_json(t) from public.business_memberships t where user_id='+lit(w)),member)
  self.assertEqual(self.sql('select count(*) from public.business_booking_staff where booking_id='+lit(bid)+' and staff_id='+lit(s)),'1')
  html=self.post('/account/delegated.php?view=staff',action='staff',id=s,version=1,name='Synthetic stale attempt',email='stale@example.test',phone='0123456789');self.assertIn('Staff changed',html);self.assertIn('Synthetic stale attempt',html)
  self.assertEqual(self.sql('select name from public.business_staff where id='+lit(s)),'Synthetic edited staff')
  args=dict(p_id=s,p_version=2,p_name='Forbidden edit',p_email='forbidden@example.test',p_phone='',p_active=True)
  for role in ['receptionist','worker']:
   actor=self.member(role)
   with self.assertRaises(RuntimeError):self.command(actor,'business_staff_write',args)
   self.login(actor);self.assertNotIn('Edit staff',self.get('/account/delegated.php?view=staff')[1])
  pending,sid,invite,t=self.fixture(email='pending-worker@example.test')
  self.command(m,'business_staff_write',dict(p_id=sid,p_version=1,p_name='Pending renamed',p_email='changed-worker@example.test',p_phone='',p_active=True))
  self.assertEqual(self.sql('select revoked_at is not null from authorization_private.staff_invites where id='+lit(invite)),'t')
  with self.assertRaises(RuntimeError):self.accept(pending,invite,t)
  self.command(m,'business_staff_write',dict(p_id=s,p_version=2,p_name='Synthetic inactive worker',p_email='updated-worker@example.test',p_phone='',p_active=False))
  self.assertEqual(self.read(w,'visits'),[])
  self.assertEqual(self.sql('select row_to_json(t) from public.business_memberships t where user_id='+lit(w)),member)
  self.assertEqual(self.sql('select count(*) from public.business_booking_staff where booking_id='+lit(bid)+' and staff_id='+lit(s)),'1')
  self.enable(False)
 def issued_invoice(self,u,currency='ZAR'):
  bid=self.booking();iid=str(uuid.uuid4());self.command(u,'business_invoice_write',dict(p_id=iid,p_version=0,p_action='save',p_booking=bid,p_due=self.sql('select current_date+14')));self.command(u,'business_invoice_write',dict(p_id=iid,p_version=1,p_action='issue'));return iid
 def test_d06_reference_and_idempotency(self):
  self.enable();u=self.member('manager');self.login(u);iid=self.issued_invoice(u);path='/account/delegated.php?view=invoices'
  html=self.get(path)[1];self.assertRegex(html,r'name="reference"[^>]*required[^>]*minlength="2"[^>]*maxlength="120"')
  payment=str(uuid.uuid4());args=dict(action='payment',id=iid,version=2,payment_id=payment,currency='ZAR',amount='10.00',paid_on=self.sql('select current_date'))
  for ref in ['', ' ', 'x', 'x'*121,'AA\n']:
   before=len([x for x in self.rpc_requests if x[0]=='business_delegate_command']);html=self.post(path,**args,reference=ref)
   self.assertIn('Enter a payment reference of 2–120 characters',html);self.assertIn('value="10.00"',html);self.assertIn('value="'+payment+'"',html);self.assertEqual(len([x for x in self.rpc_requests if x[0]=='business_delegate_command']),before)
  for _ in range(2):self.assertIn('Saved.',self.post(path,**args,reference='Synthetic receipt'))
  self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where id='+lit(payment)),'1')
  self.assertEqual(self.sql('select amount from public.business_invoice_payments where id='+lit(payment)),'1000')
  for changes in [dict(p_amount=99999999),dict(p_reference=''),dict(p_reference='Synthetic receipt'),dict(p_reversal=payment,p_reason='Forbidden reversal')]:
   with self.assertRaises(RuntimeError):self.command(u,'business_invoice_payment',dict(p_invoice=iid,p_id=str(uuid.uuid4()),p_amount=1000,p_paid_on=self.sql('select current_date'),p_reference='Synthetic receipt2')|changes)
  self.enable(False)
 def test_browser_flows(self):
  from playwright.sync_api import sync_playwright
  self.enable();checks=[];out=ROOT/'test-results/release';out.mkdir(exist_ok=True,parents=True)
  with sync_playwright() as pw:
   for width in [390,1280]:
    for role in ['manager','receptionist']:
     actor=self.member(role);type(self).sc04_login_user=actor;q=self.quote()
     browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu'])
     try:
      ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page();page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click()
      page.goto(self.url+'/account/context.php');page.get_by_label('Business and environment',exact=True).select_option(self.bids[0]+':preview');page.get_by_role('button',name='Continue',exact=True).click()
      def measure(stage):
       metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['scroll'],width);checks.append(dict(role=role,stage=stage,**metrics))
      page.goto(self.url+'/account/delegated.php?view=quotes');card=page.locator('article').filter(has=page.locator('input[name="quote"][value="'+q+'"]'));card.get_by_text('Schedule this quote',exact=True).click();measure('schedule');page.screenshot(path=str(out/('workflow-schedule-'+role+'-'+str(width)+'.png')),full_page=False);card.get_by_label('Address',exact=True).fill('Synthetic phone service address');card.locator('input[name="starts_at"]').fill('2026-12-08T09:00');card.get_by_role('button',name='Schedule',exact=True).click();page.get_by_role('status').wait_for()
      bid=self.sql('select id from public.business_bookings where quote_id='+lit(q));self.assertTrue(bid)
      page.goto(self.url+'/account/delegated.php?view=bookings');card=page.locator('article').filter(has=page.locator('input[name="booking"][value="'+bid+'"]'));card.get_by_text('Open or create invoice',exact=True).click();measure('invoice-selection');card.get_by_role('button',name='Open invoice',exact=True).click();page.get_by_text('Issue this invoice',exact=True).click();page.get_by_role('button',name='Issue invoice',exact=True).click();page.get_by_role('status').wait_for();self.assertEqual(self.sql('select state from public.business_invoices where booking_id='+lit(bid)),'Issued')
      if role=='manager':
       sid=str(uuid.uuid4());self.command(actor,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic mobile staff',p_email='phone@example.test',p_phone='',p_active=True))
       page.goto(self.url+'/account/delegated.php?view=staff');card=page.locator('article').filter(has=page.locator('input[name="id"][value="'+sid+'"]'));card.get_by_text('Edit staff',exact=True).click();measure('staff-edit');card.get_by_label('Name',exact=True).fill('Synthetic phone edited');card.get_by_role('button',name='Save',exact=True).click();page.get_by_role('status').wait_for()
       self.assertEqual(self.sql('select name from public.business_staff where id='+lit(sid)),'Synthetic phone edited')
       iid=self.sql('select id from public.business_invoices where booking_id='+lit(bid));page.goto(self.url+'/account/delegated.php?view=invoices');card=page.locator('article').filter(has=page.locator('input[name="id"][value="'+iid+'"]'));card.get_by_text('Record payment',exact=True).click();measure('payment');card.get_by_label('Amount',exact=True).fill('10.00');ref=card.get_by_label('Reference',exact=True);card.get_by_role('button',name='Save',exact=True).click();self.assertTrue(ref.evaluate('(e)=>e.validity.valueMissing'));ref.fill('Synthetic phone receipt');card.get_by_role('button',name='Save',exact=True).click();page.get_by_role('status').wait_for();self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where invoice_id='+lit(iid)),'1')
      else:
       self.assertEqual(page.get_by_role('link',name='Payments',exact=True).count(),0);self.assertNotIn('Booking ID',page.locator('body').inner_text())
      metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['scroll'],width);checks.append(dict(role=role,**metrics));page.screenshot(path=str(out/('workflow-'+role+'-'+str(width)+'.png')),full_page=False)
     finally:browser.close()
  (out/'workflow-browser.json').write_text(json.dumps(dict(status='PASS',physical_phone=False,checks=checks),indent=2));self.enable(False)
if __name__=='__main__':
 names=[n for n in Workflow.__dict__ if n.startswith('test_') and (n!='test_browser_flows' or os.environ.get('FARAIOS_MOBILE_BROWSER_CHECK')=='true')]
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Workflow(n) for n in names));raise SystemExit(not result.wasSuccessful())
