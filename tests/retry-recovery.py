"""V1-003: actual native commits followed by dropped responses; synthetic only."""
import importlib.util,json,re,uuid,unittest,os
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('flows',ROOT/'tests/workflow-repairs.py');flows=importlib.util.module_from_spec(spec);spec.loader.exec_module(flows)
class Retry(flows.Workflow):
 sc04_report_name='retry-recovery.json'
 @staticmethod
 def form(html,action,**match):
  return next(f for f in re.findall(r'<form\b.*?</form>',html,re.S)if 'name="action" value="'+action+'"' in f and all('name="'+k+'" value="'+str(v)+'"' in f for k,v in match.items()))
 @staticmethod
 def hidden(form,name):
  m=re.search(r'name="'+name+r'" value="([^"]*)"',form);return m[1]if m else None
 def test_customer_committed_response_lost(self):
  self.enable()
  for role in ['manager','receptionist']:
   u=self.member(role);self.login(u);path='/account/delegated.php?view=customers';f=self.form(self.get(path)[1],'customer');name='Synthetic retry '+role
   data=dict(action='customer',name=name,email='retry@example.test',phone='',address='',notes='Retained after commit',confirm_duplicate='on')
   if self.hidden(f,'id'):data['id']=self.hidden(f,'id');data['version']='0'
   type(self).rpc_commit_faults={'business_delegate_command':503};html=self.post(path,**data)
   self.assertIn('Connection problem',html);self.assertIn(name,html)
   self.assertEqual(self.sql("select count(*) from public.business_customers where details->>'name'="+lit(name)),'1')
   html=self.post(path,**data)
   self.assertEqual(self.sql("select count(*) from public.business_customers where details->>'name'="+lit(name)),'1','retry after committed response loss must not duplicate an explicitly-confirmed customer')
   self.assertIn('Customer changed',html);self.assertIn('Retained after commit',html)
  self.enable(False)
 def test_booking_committed_response_lost(self):
  self.enable()
  for role in ['manager','receptionist']:
   u=self.member(role);self.login(u);q=self.quote();path='/account/delegated.php?view=quotes';f=self.form(self.get(path)[1],'booking',quote=q)
   data=dict(action='booking',id=self.hidden(f,'id'),version=0,quote=q,selection_version=1,address='Synthetic lost booking response '+role,starts_at='2026-12-07T09:00',duration=90)
   type(self).rpc_commit_faults={'business_delegate_command':503};html=self.post(path,**data);self.assertIn('Connection problem',html)
   before=self.sql('select to_jsonb(t) from public.business_bookings t where quote_id='+lit(q));self.assertTrue(before)
   for _ in range(2):
    html=self.post(path,**data);self.assertIn('Unsaved changes',html);self.assertIn(data['address'],html);self.assertEqual(self.sql('select to_jsonb(t) from public.business_bookings t where quote_id='+lit(q)),before)
   self.assertEqual(self.sql('select count(*) from public.business_bookings where quote_id='+lit(q)),'1')
  self.enable(False)
 def test_payment_committed_response_lost_and_changed_retry(self):
  self.enable();u=self.member('manager');self.login(u);iid=self.issued_invoice(u);path='/account/delegated.php?view=invoices';f=self.form(self.get(path)[1],'payment',id=iid)
  pid=self.hidden(f,'payment_id');self.assertTrue(pid);data=dict(action='payment',id=iid,version=2,payment_id=pid,currency='ZAR',amount='10.00',paid_on=self.sql('select current_date'),reference='Synthetic lost payment response')
  type(self).rpc_commit_faults={'business_delegate_command':503};html=self.post(path,**data);self.assertIn('Connection problem',html)
  payment=self.sql('select to_jsonb(t) from public.business_invoice_payments t where id='+lit(pid));invoice=self.sql('select to_jsonb(t) from public.business_invoices t where id='+lit(iid));self.assertTrue(payment)
  for _ in range(2):self.assertIn('Saved.',self.post(path,**data))
  self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where invoice_id='+lit(iid)),'1');self.assertEqual(self.sql('select to_jsonb(t) from public.business_invoice_payments t where id='+lit(pid)),payment);self.assertEqual(self.sql('select to_jsonb(t) from public.business_invoices t where id='+lit(iid)),invoice)
  html=self.post(path,**(data|dict(amount='11.00',reference='Changed retry')));self.assertIn('Payment submission changed',html);self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where invoice_id='+lit(iid)),'1')
  self.enable(False)
 def test_missing_submission_identity_denies_before_command(self):
  self.enable();u=self.member('manager');self.login(u);before=len(self.rpc_requests)
  html=self.post('/account/delegated.php?view=customers',action='customer',id='',name='Synthetic missing token',email='token@example.test',phone='',address='',notes='Retain missing-token input',confirm_duplicate='on')
  self.assertIn('This form has expired',html);self.assertIn('Retain missing-token input',html);self.assertFalse(any(name=='business_delegate_command' for name,args in self.rpc_requests[before:]));self.assertEqual(self.sql("select count(*) from public.business_customers where details->>'name'='Synthetic missing token'"),'0');self.enable(False)
 def test_browser_commit_then_drop_customer_booking_payment(self):
  from playwright.sync_api import sync_playwright
  self.enable();checks=[];out=ROOT/'test-results/release';out.mkdir(parents=True,exist_ok=True)
  with sync_playwright() as pw:
   for width in [390,1280]:
    for role in ['manager','receptionist']:
     u=self.member(role);type(self).sc04_login_user=u
     browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
     ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page()
     try:
      page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click()
      page.goto(self.url+'/account/context.php');page.get_by_label('Business and environment',exact=True).select_option(self.bids[0]+':preview');page.get_by_role('button',name='Continue',exact=True).click()
      for action in ['customer','booking']+(['payment']if role=='manager'else[]):
       if action=='customer':
        page.goto(self.url+'/account/delegated.php?view=customers');form=page.locator('form').filter(has=page.locator('[name="action"][value="customer"]')).first;form.locator('xpath=..').locator('summary').click();name='Synthetic browser retry '+uuid.uuid4().hex[:12]
        form.locator('[name="name"]').fill(name);form.locator('[name="email"]').fill('retry@example.test');form.locator('[name="notes"]').fill('Typed draft must remain');form.locator('[name="confirm_duplicate"]').check();lookup="select count(*) from public.business_customers where details->>'name'="+lit(name)
       elif action=='booking':
        q=self.quote();page.goto(self.url+'/account/delegated.php?view=quotes');form=page.locator('form').filter(has=page.locator('[name="action"][value="booking"]')).filter(has=page.locator('[name="quote"][value="'+q+'"]'));form.locator('xpath=..').locator('summary').click()
        form.locator('[name="address"]').fill('Synthetic committed booking draft');form.locator('[name="starts_at"]').fill('2026-12-07T09:00');form.locator('[name="duration"]').fill('90');lookup='select count(*) from public.business_bookings where quote_id='+lit(q)
       else:
        iid=self.issued_invoice(u);page.goto(self.url+'/account/delegated.php?view=invoices');form=page.locator('form').filter(has=page.locator('[name="action"][value="payment"]')).filter(has=page.locator('[name="id"][value="'+iid+'"]'));form.locator('xpath=..').locator('summary').click()
        form.locator('[name="amount"]').fill('10.00');form.locator('[name="reference"]').fill('SYNTH-RETRY-'+uuid.uuid4().hex[:12]);lookup='select count(*) from public.business_invoice_payments where invoice_id='+lit(iid)
       record_id=form.locator('[name="id"]').input_value();key=form.locator('[name="payment_id"]').input_value()if action=='payment'else record_id
       count={'posts':0}
       def commit_then_drop(route):
        if route.request.method!='POST':route.continue_();return
        count['posts']+=1
        if count['posts']==1:
         response=route.fetch();self.assertEqual(response.status,200);route.abort('failed')
        else:route.continue_()
       page.route('**/account/delegated.php*',commit_then_drop)
       form.get_by_role('button').click();form.get_by_role('alert').filter(has_text='may have saved').wait_for();self.assertEqual(self.sql(lookup),'1');self.assertEqual(count['posts'],1)
       self.assertEqual(form.locator('[name="payment_id"]').input_value()if action=='payment'else form.locator('[name="id"]').input_value(),key)
       if action=='customer':self.assertEqual(form.locator('[name="notes"]').input_value(),'Typed draft must remain')
       ctx.set_offline(True);ctx.set_offline(False);self.assertEqual(count['posts'],1)
       form.get_by_role('button').click()
       if action=='payment':page.get_by_role('status').filter(has_text='Saved.').wait_for()
       else:page.get_by_role('heading',name='Unsaved changes',exact=True).wait_for()
       self.assertEqual(self.sql(lookup),'1');self.assertEqual(count['posts'],2);self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
       if action=='customer':page.screenshot(path=str(out/('v1003-retry-'+role+'-'+str(width)+'.png')))
       checks.append(dict(role=role,width=width,action=action,committed_then_response_dropped=True,records=1,automatic_replays=0));page.unroute('**/account/delegated.php*')
     finally:ctx.close();browser.close()
  (out/'v1003-browser.json').write_text(json.dumps({'status':'PASS','physical_phone':False,'checks':checks},indent=2));self.enable(False)
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Retry(n)for n in Retry.__dict__ if n.startswith('test_') and (n!='test_browser_commit_then_drop_customer_booking_payment' or os.environ.get('FARAIOS_MOBILE_BROWSER_CHECK')=='true')));raise SystemExit(not result.wasSuccessful())
