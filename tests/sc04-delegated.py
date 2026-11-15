"""Positive and hostile delegated API tests. Disposable loopback PostgreSQL only.

Reuse SC04's synthetic source fixtures, real PHP/local REST transport and retaining
recovery assertions; do not inherit its unrelated test selection. Twelve explicit
methods emit independent delegated and 315-attempt surface-matrix reports. Gate
opening is an operator fixture only, never an application/API permission.
"""
import importlib.util,json,uuid,unittest
from pathlib import Path
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('sc04',ROOT/'tests/sc04-native.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Delegated(base.SC04):
 sc04_report_name="sc04-delegated.json"
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql((ROOT/'docs/sc04/delegation.sql').read_text())
 def enable(self,enabled=True):self.sql('update authorization_private.delegation_gate set enabled='+lit(enabled))
 def member(self,role):
  u,r=self.invite(role);self.invoke(u,'business_invite_accept',p_token=r['token']);return u
 def command(self,u,operation,arguments=None,b=None,e='preview'):
  return json.loads(self.context(u,b or self.bids[0],e,'select public.business_delegate_command('+','.join([lit(b or self.bids[0]),lit(e),lit(operation),lit(json.dumps(arguments or {}))+'::jsonb'])+')'))
 def read(self,u,resource,id=None,b=None,e='preview'):
  return json.loads(self.context(u,b or self.bids[0],e,'select public.business_delegate_read('+','.join(map(lit,[b or self.bids[0],e,resource,id]))+')'))
 def document(self):
  return dict(name='Synthetic customer',email='fixture@example.test',phone='',notes='Synthetic notes',currency='ZAR',items=[dict(name='Synthetic fixed service',quantity=1,price=50500)])
 def booking(self):
  b=str(uuid.uuid4());self.sql("insert into public.business_bookings(id,business_id,environment,document,address,starts_at,time_zone,duration_minutes) values("+','.join([lit(b),lit(self.bids[0]),"'preview'",lit(json.dumps(self.document()))+'::jsonb',"'Synthetic address'","now()+interval '1 day'","'Africa/Johannesburg'","90"])+")")
  return b
 def seed_catalogue(self):
  cat=dict(currency='ZAR',items=[dict(id='1'*32,name='Synthetic fixed service',description='',duration=90,mode='fixed',amount=50500,visible=True,archived=False,options=[])])
  self.sql('insert into public.business_service_catalogues(business_id,environment,draft,published) values('+','.join([lit(self.bids[0]),"'preview'",lit(json.dumps(cat))+'::jsonb',lit(json.dumps(cat))+'::jsonb'])+') on conflict(business_id,environment) do update set draft=excluded.draft,published=excluded.published')
 def test_01_disabled_and_discovery(self):
  for role in ['manager','receptionist','worker']:
   u=self.member(role)
   self.assertEqual(json.loads(self.context(u,self.bids[0],q='select public.business_contexts()')),[])
   with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'bookings')
   with self.assertRaises(RuntimeError):self.context(u,self.bids[0],q='update authorization_private.delegation_gate set enabled=true')
 def test_02_customers_enquiries_staff(self):
  self.enable()
  for role in ['manager','receptionist']:
   u=self.member(role)
   cid=str(uuid.uuid4());details=dict(name='Synthetic '+cid,email='fixture@example.test',phone='',address='Synthetic address',notes='Synthetic customer')
   # Use actual legacy valid shape.
   details=dict(name='Synthetic '+cid,email='fixture@example.test',phone='',address='Synthetic address',notes='')
   result=self.command(u,'business_customer_write',dict(p_id=cid,p_version=0,p_details=details,p_confirm=True));self.assertEqual(result['id'],cid)
   self.assertTrue(self.command(u,'business_customer_search',dict(p_search=details['name'],p_page=1)))
   eid=str(uuid.uuid4());self.command(u,'business_enquiry_create',dict(p_id=eid,p_name='Synthetic enquiry',p_email='fixture@example.test',p_phone='',p_requirements='Synthetic requirements'))
   self.command(u,'business_enquiry_workflow_save',dict(p_id=eid,p_version=1,p_status='Contacted',p_notes='Synthetic note',p_follow_up=None))
   self.assertIn('activity',self.command(u,'business_enquiry_workspace',dict(p_id=eid)))
   self.assertEqual(self.sql('select actor_id from public.business_enquiry_activity where enquiry_id='+lit(eid)+" and event='Updated'"),u)
   sid=str(uuid.uuid4())
   if role=='manager':
    self.command(u,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic worker',p_email='private@example.test',p_phone='',p_active=True))
   else:
    with self.assertRaisesRegex(RuntimeError,'Action denied'):self.command(u,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic worker',p_email='',p_phone='',p_active=True))
    self.assertTrue(all(set(s)=={'id','name','active'} for s in self.read(u,'staff')))
  self.enable(False)
 def test_03_quotes_invoice_finance(self):
  self.enable();self.seed_catalogue();due=self.sql('select current_date+14')
  for role in ['manager','receptionist']:
   u=self.member(role);qid=str(uuid.uuid4());doc=self.document()
   args=dict(p_id=qid,p_version=0,p_action='save',p_document=doc,p_expiry=due)
   self.assertEqual(self.command(u,'business_quote_write',args)['id'],qid)
   bad=dict(args,p_id=str(uuid.uuid4()),p_document=doc|dict(items=[dict(name='Synthetic override',quantity=1,price=1)]))
   with self.assertRaises(RuntimeError):self.command(u,'business_quote_write',bad)
   if role=='manager':self.command(u,'business_quote_write',bad|dict(authorization_reason='Synthetic agreed exception'))
   else:
    with self.assertRaises(RuntimeError):self.command(u,'business_quote_write',bad|dict(authorization_reason='Cannot self authorize'))
   self.command(u,'business_quote_send',dict(p_id=qid,p_version=1))
   self.assertEqual(self.sql('select status from public.business_quotes where id='+lit(qid)),'Sent')
   booking=self.booking();iid=str(uuid.uuid4());invoice=dict(p_id=iid,p_version=0,p_action='save',p_document=doc,p_due=due,p_booking=booking)
   self.command(u,'business_invoice_write',invoice)
   self.command(u,'business_invoice_write',dict(p_id=iid,p_version=1,p_action='issue'))
   self.assertEqual(self.sql('select state from public.business_invoices where id='+lit(iid)),'Issued')
   exact=self.read(u,'invoice',iid);self.assertEqual(exact['document'],doc);self.assertEqual(set(exact),{'id','version','state','booking_id','document','due_on','number'})
   with self.assertRaises(RuntimeError):self.read(u,'invoice')
   for action in ['void','replace']:
    with self.assertRaisesRegex(RuntimeError,'Action denied'):self.command(u,'business_invoice_write',dict(p_id=iid,p_version=2,p_action=action,p_reason='Synthetic correction'))
   pay=dict(p_invoice=iid,p_id=str(uuid.uuid4()),p_amount=100,p_paid_on=self.sql('select current_date'),p_reference='Synthetic receipt')
   if role=='manager':
    self.command(u,'business_invoice_payment',pay);self.assertTrue(self.read(u,'invoices'));self.command(u,'business_dashboard',{})
    with self.assertRaisesRegex(RuntimeError,'Action denied'):self.command(u,'business_invoice_payment',pay|dict(p_id=str(uuid.uuid4()),p_reversal=pay['p_id'],p_reason='Synthetic reversal'))
   else:
    with self.assertRaises(RuntimeError):self.command(u,'business_invoice_payment',pay)
    with self.assertRaises(RuntimeError):self.read(u,'invoices',iid)
    with self.assertRaises(RuntimeError):self.read(u,'payments')
    with self.assertRaises(RuntimeError):self.command(u,'business_dashboard')
    with self.assertRaises(RuntimeError):self.command(u,'business_invoice_write',invoice|dict(p_id=str(uuid.uuid4()),p_document=doc|dict(notes='Changed agreement')))
   # Membership never grants customer decision capability.
   with self.assertRaises(RuntimeError):self.command(u,'business_quote_customer',dict(p_token='forged',p_response='accept'))
  self.enable(False)
 def test_04_worker_assignment_revocation(self):
  self.enable();u=self.member('worker');manager=self.member('manager');reception=self.member('receptionist');booking=self.booking();sid=str(uuid.uuid4())
  self.command(manager,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic assigned',p_email='sensitive@example.test',p_phone='',p_active=True))
  self.invoke(self.ids[0],'business_worker_link',p_user=u,p_staff=sid)
  self.assertEqual(self.read(u,'visits'),[])
  with self.assertRaises(RuntimeError):self.command(u,'visit.execute',dict(id=booking,version=1,status='In Progress',document={'price':0}))
  self.command(reception,'business_staff_assign',dict(p_booking=booking,p_version=0,p_staff=[sid]))
  rows=self.read(u,'visits');self.assertEqual(len(rows),1);self.assertEqual(set(rows[0]),{'id','version','status','address','starts_at','time_zone','duration_minutes','customer_name','services'})
  with self.assertRaises(RuntimeError):self.command(reception,'visit.execute',dict(id=booking,version=1,status='In Progress'))
  self.command(u,'visit.execute',dict(id=booking,version=1,status='In Progress'))
  with self.assertRaises(RuntimeError):self.command(u,'visit.execute',dict(id=booking,version=1,status='Completed'))
  other=self.booking()
  with self.assertRaises(RuntimeError):self.command(u,'visit.execute',dict(id=other,version=1,status='In Progress'))
  self.command(manager,'business_staff_assign',dict(p_booking=booking,p_version=1,p_staff=[]))
  self.assertEqual(self.read(u,'visits'),[])
  with self.assertRaisesRegex(RuntimeError,'Assignment denied'):self.command(u,'visit.execute',dict(id=booking,version=2,status='Completed'))
  self.command(manager,'business_staff_assign',dict(p_booking=booking,p_version=2,p_staff=[sid]))
  self.command(u,'availability.request',dict(id=str(uuid.uuid4()),starts_at='2026-12-01T08:00:00Z',ends_at='2026-12-01T10:00:00Z'))
  self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'visits')
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.command(u,'visit.execute',dict(id=booking,version=2,status='Completed'))
  self.enable(False)
 def test_05_isolation_bypass_escalation(self):
  self.enable()
  for role in ['manager','receptionist','worker']:
   u=self.member(role)
   for b,e in [(self.bids[1],'preview'),(self.bids[0],'live')]:
    with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'bookings',b=b,e=e)
    with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.command(u,'business_customer_search',dict(p_search='',p_page=1),b=b,e=e)
   for op in ['business_profile_save','business_services_save','business_membership_revoke','business_invite_create','shared_core_apply','platform.recovery']:
    with self.assertRaises(RuntimeError):self.command(u,op)
   for resource in ['customers','enquiries','quotes','bookings','invoices','staff']:
    table={'bookings':'business_booking_schedule','invoices':'business_invoice_list'}.get(resource,'business_'+resource)
    self.assertEqual(self.context(u,self.bids[0],q='select count(*) from public.'+table),'0')
   with self.assertRaises(RuntimeError):self.context(u,self.bids[0],q='select authorization_private.copy_public_business_customer_search('+lit(self.bids[0])+",'preview','',1)")
   with self.assertRaises(RuntimeError):self.command(u,'business_customer_search',dict(p_search='',p_page=1,p_business=self.bids[1]))
   self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
   with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'visits' if role=='worker' else 'bookings')
  self.enable(False)
 def test_06_scheduling_and_terminal_correction(self):
  self.enable();self.seed_catalogue();u=self.member('manager');r=self.member('receptionist');bid=self.booking()
  row=json.loads(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid)))
  a=dict(p_id=bid,p_version=1,p_quote=None,p_document=row['document'],p_address='Synthetic rescheduled address',p_local='2026-12-02 10:00',p_zone=row['time_zone'],p_duration=90,p_status='Scheduled')
  self.command(r,'business_booking_write',a)
  self.assertEqual(self.sql('select version from public.business_bookings where id='+lit(bid)),'2')
  with self.assertRaises(RuntimeError):self.command(r,'business_booking_write',a)
  with self.assertRaises(RuntimeError):self.command(r,'business_booking_write',a|dict(p_version=2,p_document=row['document']|dict(notes='Override')))
  self.command(u,'visit.execute',dict(id=bid,version=2,status='In Progress'))
  self.command(u,'visit.execute',dict(id=bid,version=3,status='Completed'))
  with self.assertRaises(RuntimeError):self.command(r,'terminal.correct',dict(id=bid,version=4,status='Scheduled',reason='Synthetic correction'))
  with self.assertRaises(RuntimeError):self.command(u,'terminal.correct',dict(id=bid,version=4,status='Scheduled'))
  self.command(u,'terminal.correct',dict(id=bid,version=4,status='Scheduled',reason='Synthetic correction'))
  self.assertEqual(self.sql("select detail->>'reason' from authorization_private.events where subject="+lit(bid)+" and action='terminal.correct'"),'Synthetic correction')
  self.enable(False)
 def test_07_anonymous_and_context_spoofing(self):
  self.enable();u=self.member('manager');b=self.bids[0]
  q='select public.business_delegate_read('+lit(b)+",'preview','customers')"
  for headers in [{},{'x-faraios-business':self.bids[1],'x-faraios-environment':'preview'},{'x-faraios-business':b,'x-faraios-environment':'live'}]:
   with self.assertRaisesRegex(RuntimeError,'Business context denied'):
    self.sql('set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';set request.headers="+lit(json.dumps(headers))+';'+q)
  for role in ['anon','service_role']:
   with self.assertRaises(RuntimeError):self.sql('set role '+role+';'+q)
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):
   self.sql('set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":true}';set request.headers="+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'+q)
  with self.assertRaises(RuntimeError):self.command(u,"business_customer_search);select 1;--",{})
  with self.assertRaises(RuntimeError):self.command(u,'business_customer_search',dict(p_search='',p_page=1,role='owner'))
  self.enable(False)
 def test_08_active_session_and_inflight_revocation(self):
  import subprocess,time,select
  from journey import PGBIN
  self.enable();u=self.member('manager');b=self.bids[0]
  cmd=[str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(self.pgport),'-d','postgres','-v','ON_ERROR_STOP=1']
  process=subprocess.Popen(cmd,env=self.env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
  prefix='set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';set request.headers="+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'
  read='select public.business_delegate_read('+lit(b)+",'preview','customers')"
  try:
   process.stdin.write('\\o /dev/null\n'+prefix+read+";\n\\o\n\\echo READY\n");process.stdin.flush()
   while True:
    self.assertTrue(select.select([process.stdout],[],[],5)[0],'Session readiness timeout')
    if process.stdout.readline().strip()=='READY':break
   self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
   process.stdin.write(read+';\n');process.stdin.flush();process.stdin.close();process.wait(timeout=5)
   self.assertNotEqual(process.returncode,0);self.assertIn('Business context denied',process.stderr.read())
  finally:
   if process.poll() is None:process.kill();process.wait()
   process.stdout.close();process.stderr.close()
  # An in-flight authorized command holds the membership lock; revocation waits.
  u=self.member('manager');process=subprocess.Popen(cmd,env=self.env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
  prefix='set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';set request.headers="+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'
  from concurrent.futures import ThreadPoolExecutor
  try:
   process.stdin.write('\\o /dev/null\nbegin;'+prefix+read+";\n\\o\n\\echo LOCKED\n");process.stdin.flush()
   while True:
    self.assertTrue(select.select([process.stdout],[],[],5)[0])
    if process.stdout.readline().strip()=='LOCKED':break
   with ThreadPoolExecutor(max_workers=1) as pool:
    future=pool.submit(self.invoke,self.ids[0],'business_membership_revoke',p_user=u)
    time.sleep(.1);self.assertFalse(future.done())
    process.stdin.write('commit;\n\\q\n');process.stdin.flush();process.stdin.close();process.wait(timeout=5);future.result(timeout=5)
   with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'customers')
  finally:
   if process.poll() is None:process.kill();process.wait()
   process.stdout.close();process.stderr.close()
  self.enable(False)
 def test_09_application_selection_and_revalidation(self):
  self.enable();u=self.member('manager')
  # Same account, second business, different bundle; no implicit first business.
  self.sql('insert into public.business_memberships values('+','.join(map(lit,[self.bids[1],'preview',u,'receptionist',True]))+')')
  type(self).sc04_login_user=u
  private=self.private/'profiles';config=private/'config.php';config.write_text(config.read_text().replace(self.url,self.url+'/preview'))
  (private/'router.php').write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(self.webroot))+".$path;require $_SERVER['SCRIPT_FILENAME'];return true;")
  type(self).url+='/preview'
  self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
  html=self.get('/account/context.php')[1];self.assertIn('Choose business',html);self.assertIn('receptionist',html)
  html=self.post('/account/context.php',context=self.bids[0]+':preview');self.assertIn('Create customer',html)
  html=self.post('/account/delegated.php?view=customers',action='customer',name='Synthetic HTTP delegate',email='http@example.test',phone='',address='',notes='',confirm_duplicate='on');self.assertIn('Saved.',html)
  self.assertEqual(self.sql("select count(*) from public.business_customers where details->>'name'='Synthetic HTTP delegate' and business_id="+lit(self.bids[0])),'1')
  html=self.post('/account/delegated.php?view=quotes',action='quote',name='Synthetic HTTP quote',email='http@example.test',phone='',notes='',service='1'*32,quantity=1,expires_on=self.sql('select current_date+14'),override_amount='600.25',reason='Synthetic HTTP override');self.assertIn('Saved.',html)
  self.assertEqual(self.sql("select document->'items'->0->>'price' from public.business_quotes where document->>'name'='Synthetic HTTP quote'"),'60025')
  # Tampering with selector denies; the retained session never becomes an owner.
  html=self.post('/account/context.php',context=self.bids[0]+':live');self.assertIn('Business access is unavailable',html)
  self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
  html=self.get('/account/delegated.php')[1];self.assertNotIn('Synthetic HTTP delegate',html)
  self.assertIn('Choose business',html)
  worker=self.member('worker');manager=self.member('manager');bid=self.booking();sid=str(uuid.uuid4())
  self.command(manager,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic HTTP worker',p_email='',p_phone='',p_active=True))
  self.invoke(self.ids[0],'business_worker_link',p_user=worker,p_staff=sid)
  self.command(manager,'business_staff_assign',dict(p_booking=bid,p_version=0,p_staff=[sid]))
  type(self).sc04_login_user=worker
  self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
  html=self.post('/account/context.php',context=self.bids[0]+':preview');self.assertIn('Start job',html);self.assertNotIn('Synthetic notes',html);self.assertNotIn('Create customer',html)
  html=self.post('/account/delegated.php',action='visit',id=bid,version=1,status='In Progress');self.assertIn('Complete job',html)
  html=self.post('/account/delegated.php',action='visit',id=bid,version=2,status='Completed');self.assertIn('Saved.',html)
  self.assertEqual(self.sql('select status from public.business_bookings where id='+lit(bid)),'Completed')
  type(self).sc04_login_user=None;self.enable(False)
 def test_10_recovery_and_preservation(self):
  self.enable();self.recovery_manager=self.member('manager');self.recovery_worker=self.member('worker');self.recovery_booking=self.booking();sid=str(uuid.uuid4())
  self.command(self.recovery_manager,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic recovery staff',p_email='',p_phone='',p_active=True))
  self.invoke(self.ids[0],'business_worker_link',p_user=self.recovery_worker,p_staff=sid)
  self.command(self.recovery_manager,'business_staff_assign',dict(p_booking=self.recovery_booking,p_version=0,p_staff=[sid]))
  self.enable(False)
  # Preserve a fully exercised nonempty delegated catalogue as well as legacy data.
  base.SC04.test_recovery(self)
  report=json.loads((ROOT/'test-results/release/sc04-delegated.json').read_text());report.update(delegated_positive_negative_tests=True,gate_default_off=True,delegated_restore_revalidated=True)
  (ROOT/'test-results/release/sc04-delegated.json').write_text(json.dumps(report,indent=2)+'\n')
 def verify_delegated_deactivated(self,sql):
  self.assertEqual(sql('select enabled from authorization_private.delegation_gate'),'f')
  for signature in ['business_delegate_command(uuid,text,text,jsonb)','business_delegate_read(uuid,text,text,uuid)','business_worker_link(uuid,text,uuid,uuid)']:
   self.assertEqual(sql("select has_function_privilege('authenticated',"+lit('public.'+signature)+",'execute')"),'f')
 def verify_delegated_restore(self,sql):
  b=self.bids[0]
  def prefix(u):return 'begin;update authorization_private.delegation_gate set enabled=true;set local role authenticated;set local request.jwt.claim.sub='+lit(u)+";set local request.jwt.claims='{\"is_anonymous\":false}';set local request.headers="+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'
  raw=sql(prefix(self.recovery_worker)+'select public.business_delegate_read('+lit(b)+",'preview','visits');rollback")
  self.assertEqual(json.loads(raw)[0]['id'],self.recovery_booking)
  q='select public.business_delegate_command('+lit(b)+",'preview','visit.execute',"+lit(json.dumps(dict(id=self.recovery_booking,version=1,status='In Progress')))+"::jsonb);rollback"
  self.assertEqual(json.loads(sql(prefix(self.recovery_worker)+q))['version'],2)
  with self.assertRaises(RuntimeError):sql(prefix(self.recovery_worker)+'select public.business_delegate_read('+lit(b)+",'preview','invoices');rollback")
  self.assertIsInstance(json.loads(sql(prefix(self.recovery_manager)+'select public.business_delegate_read('+lit(b)+",'preview','invoices');rollback")),list)

 def test_11_complete_hostile_surface_matrix(self):
  self.enable();functions=json.loads(self.sql("select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'args',p.proargnames[1:p.pronargs],'types',array(select format_type(t,null) from unnest(p.proargtypes)t))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.oid::regprocedure::text in (select identity from authorization_private.legacy_functions)"))
  operations=['business_customer_search','business_customer_write','business_customer_link','business_enquiry_create','business_enquiry_status','business_enquiry_workflow_save','business_enquiry_workspace','business_quote_write','business_quote_send','business_customer_quote_create','business_booking_write','business_customer_booking_create','business_booking_request_action','business_staff_assign','business_staff_write','business_invoice_write','business_invoice_payment','business_dashboard','visit.execute','terminal.correct','availability.request']
  count=0
  for role in ['manager','receptionist','worker']:
   u=self.member(role)
   for f in functions:
    args=[lit(self.bids[0])+'::uuid' if a=='p_business' else "'preview'::text" if a=='p_environment' else 'null::'+t for a,t in zip(f['args'],f['types'])]
    with self.assertRaisesRegex(RuntimeError,'Business context denied|permission denied for (function|schema)',msg=role+':'+f['name']):self.context(u,self.bids[0],q='select '+f['name']+'('+','.join(args)+')')
    count+=1
   for b,e in [(self.bids[1],'preview'),(self.bids[0],'live')]:
    for op in operations:
     with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.command(u,op,b=b,e=e)
     count+=1
   self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
   for op in operations:
    with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.command(u,op)
    count+=1
  self.enable(False)
  type(self).matrix_count=count
  (ROOT/'test-results/release/sc04-delegated-matrix.json').write_text(json.dumps(dict(legacy_rpc_denials=3*len(functions),cross_scope_command_denials=6*len(operations),revoked_command_denials=3*len(operations),total=count,legacy_functions=len(functions),operations=len(operations)),indent=2)+'\n')
 def test_12_aliases_and_customer_agreement(self):
  self.enable();self.seed_catalogue();due=self.sql('select current_date+14')
  for role in ['manager','receptionist']:
   u=self.member(role);cid=str(uuid.uuid4());eid=str(uuid.uuid4());qid=str(uuid.uuid4());bid=str(uuid.uuid4())
   details=dict(name='Synthetic linked customer',email='link@example.test',phone='',address='Synthetic address',notes='')
   self.command(u,'business_customer_write',dict(p_id=cid,p_version=0,p_details=details,p_confirm=True))
   self.command(u,'business_enquiry_create',dict(p_id=eid,p_name=details['name'],p_email=details['email'],p_phone='',p_requirements='Synthetic requirement'))
   self.command(u,'business_enquiry_status',dict(p_id=eid,p_version=1,p_status='Contacted'))
   self.command(u,'business_customer_link',dict(p_customer=cid,p_kind='enquiry',p_record=eid,p_version=2))
   doc=self.document()|dict(name=details['name'],email=details['email'])
   self.command(u,'business_customer_quote_create',dict(p_id=qid,p_version=0,p_action='save',p_document=doc,p_expiry=due,p_enquiry=eid,p_customer=cid))
   self.command(u,'business_quote_send',dict(p_id=qid,p_version=1))
   token=self.sql('select share_token from public.business_quotes where id='+lit(qid))
   self.sql("set role anon;select public.business_quote_customer('preview',"+lit(token)+",'Accepted')")
   self.command(u,'business_customer_booking_create',dict(p_id=bid,p_version=0,p_quote=qid,p_document=doc,p_address='Synthetic agreed address',p_local='2026-12-02 09:00',p_zone='Africa/Johannesburg',p_duration=90,p_status='Scheduled',p_customer=cid))
   self.assertEqual(self.sql('select customer_id from public.business_bookings where id='+lit(bid)),cid)
   self.assertEqual(self.read(u,'bookings',bid)[0]['document'],doc)
   # Forged quote acceptance cannot create a booking.
   with self.assertRaises(RuntimeError):self.command(u,'business_customer_booking_create',dict(p_id=str(uuid.uuid4()),p_version=0,p_quote=str(uuid.uuid4()),p_document=doc,p_address='Synthetic address',p_local='2026-12-03 09:00',p_zone='Africa/Johannesburg',p_duration=90,p_status='Scheduled',p_customer=cid))
   # Request conversion uses the already agreed fixed snapshot. Quotation aliases fail closed.
   rid=str(uuid.uuid4());self.command(u,'business_enquiry_create',dict(p_id=rid,p_name=details['name'],p_email=details['email'],p_phone='',p_requirements='Synthetic request'))
   service=dict(id='1'*32,name='Synthetic fixed service',description='',duration=90,mode='fixed',amount=50500,visible=True,archived=False,options=[])
   self.sql('insert into public.business_booking_requests(id,business_id,environment,service,currency,address,preferred_at,time_zone) values('+','.join([lit(rid),lit(self.bids[0]),"'preview'",lit(json.dumps(service))+'::jsonb',"'ZAR'","'Synthetic address'","now()+interval '2 days'","'Africa/Johannesburg'"])+')')
   with self.assertRaises(RuntimeError):self.command(u,'business_booking_request_action',dict(p_id=rid,p_version=1,p_action='quote'))
   self.command(u,'business_booking_request_action',dict(p_id=rid,p_version=1,p_action='accept'))
   result=self.command(u,'business_booking_request_action',dict(p_id=rid,p_version=2,p_action='convert'));self.assertIn('booking_id',result)
  self.enable(False)

if __name__=='__main__':
 names=[n for n in Delegated.__dict__ if n.startswith('test_') and n!='test_10_recovery_and_preservation']+['test_10_recovery_and_preservation']
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Delegated(n) for n in names));raise SystemExit(not result.wasSuccessful())
