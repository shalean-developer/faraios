"""Shared-project compatibility; disposable PG/PHP only, no hosted changes."""
import importlib.util,json,shutil,unittest,uuid
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('delegated',ROOT/'tests/sc04-delegated.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
spec=importlib.util.spec_from_file_location('shared',ROOT/'docs/sc04/shared.py');shared=importlib.util.module_from_spec(spec);spec.loader.exec_module(shared)

class Shared(base.Delegated):
 sc04_report_name='sc04-shared.json'
 @classmethod
 def sql(cls,q,role=False):
  if q==(ROOT/'docs/sc04/authorization.sql').read_text():
   # A broader unexpected original grant must abort the entire installation,
   # not leave the temporary restrictive adapters partially committed.
   super().sql('grant insert on public.businesses to authenticated')
   try:super().sql(shared.installation())
   except RuntimeError as error:
    if not any(message in str(error) for message in ['Legacy business grant drift','Legacy relation security drift']):raise
   else:raise AssertionError('Unknown original grants accepted')
   if super().sql("select to_regnamespace('authorization_private') is null")!='t':raise AssertionError('Partial installation survived abort')
   super().sql('revoke insert on public.businesses from authenticated;grant insert(owner_id,name,business_type,country,time_zone) on public.businesses to authenticated')
   cls.atomic_rejection=True
   q=shared.installation()
  elif q in [(ROOT/'docs/sc04/adapters.sql').read_text(),(ROOT/'docs/sc04/delegation.sql').read_text()]:return ''
  return super().sql(q,role)
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  shutil.copyfile(ROOT/'docs/sc04/shared-recovery.py',cls.webroot/'scripts/sc04_recovery.py')
 def legacy(self,u,q):
  return self.sql('set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';reset request.headers;"+q)
 def enable(self,enabled=True):
  if enabled:self.sql('insert into authorization_private.preview_businesses values('+lit(self.bids[0])+') on conflict do nothing')
  super().enable(enabled)
 def test_14_scope_allowlist(self):
  self.enable();u=self.member('manager')
  self.sql('delete from authorization_private.preview_businesses where business_id='+lit(self.bids[0]))
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'customers')
  self.assertEqual(json.loads(self.context(u,self.bids[0],q='select public.business_contexts()')),[])
  with self.assertRaises(RuntimeError):self.context(u,self.bids[0],q='insert into authorization_private.preview_businesses values('+lit(self.bids[0])+')')
  self.enable(False)
 def test_09_application_selection_and_revalidation(self):
  self.sql('insert into authorization_private.preview_businesses values('+lit(self.bids[1])+') on conflict do nothing')
  super().test_09_application_selection_and_revalidation()
 def test_13_legacy_owner_unchanged(self):
  a,b=self.ids[0],self.bids[0]
  self.assertEqual(self.legacy(a,'select count(*) from public.businesses'),'1')
  # Old direct onboarding INSERT remains granted and atomically backfills owners.
  u=str(uuid.uuid4());self.sql('insert into auth.users values('+lit(u)+')')
  self.legacy(u,"insert into public.businesses(owner_id,name,business_type,country,time_zone) values("+lit(u)+",'Synthetic legacy onboarding','other','ZA','UTC')")
  self.assertEqual(self.sql('select count(*) from public.business_memberships where user_id='+lit(u)), '2')
  self.assertEqual(self.sql("select count(*) from authorization_private.legacy_functions where definition<>pg_get_functiondef(to_regprocedure(identity))"),'0')
  self.assertEqual(self.sql("select count(*) from pg_policies where policyname like 'sc04_%'"),'0')
  # Real owner financial journey uses original headerless RPCs and invoker views.
  original=type(self).scope
  private=self.private/'profiles';saved_config=(private/'config.php').read_text();saved_router=(private/'router.php').read_text();saved_url=type(self).url;saved_webroot=type(self).webroot
  try:
   # Foundation's HTTP router must execute the unchanged live source, not the
   # staged preview adapter, for this compatibility proof.
   type(self).webroot=ROOT
   type(self).scope=classmethod(lambda cls,owner,q:cls.sql('set role authenticated;set request.jwt.claim.sub='+lit(owner)+";set request.jwt.claims='{\"is_anonymous\":false}';reset request.headers;"+q))
   base.base.SC04.test_foundation(self)
  finally:
   type(self).scope=classmethod(original.__func__)
   type(self).url=saved_url
   type(self).webroot=saved_webroot
   (private/'config.php').write_text(saved_config);(private/'router.php').write_text(saved_router)
 def test_11_legacy_and_scoped_denials(self):
  self.enable()
  functions=json.loads(self.sql("select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'args',p.proargnames[1:p.pronargs],'types',array(select format_type(t,null) from unnest(p.proargtypes)t))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.oid::regprocedure::text in (select identity from authorization_private.legacy_functions)"))
  operations=['business_customer_search','business_customer_write','business_customer_link','business_enquiry_create','business_enquiry_status','business_enquiry_workflow_save','business_enquiry_workspace','business_quote_write','business_quote_send','business_customer_quote_create','business_booking_write','business_customer_booking_create','business_booking_request_action','business_staff_assign','business_staff_write','business_invoice_write','business_invoice_payment','business_dashboard','visit.execute','terminal.correct','availability.request']
  count=0
  for role in ['manager','receptionist','worker']:
   u=self.member(role)
   for f in functions:
    args=[lit(self.bids[0])+'::uuid' if a=='p_business' else "'preview'::text" if a=='p_environment' else '1::integer' if a in ['p_activity_page','p_page'] else "''::text" if a=='p_search' else 'null::'+t for a,t in zip(f['args'],f['types'])]
    # Legacy endpoints retain their original opaque validation/conflict errors;
    # do not relabel every error as an explicit new authorization guard.
    with self.assertRaises(RuntimeError,msg=f['name']):self.context(u,self.bids[0],q='select '+f['name']+'('+','.join(args)+')')
    count+=1
   for table in ['businesses','business_quotes','business_bookings','business_invoices','business_customers','business_staff','business_invoice_list','business_quote_list','business_booking_schedule']:
    self.assertEqual(self.legacy(u,'select count(*) from public.'+table),'0')
   bid=self.booking()
   doc=self.document()
   q='select public.business_booking_write('+','.join(map(lit,[self.bids[0],'preview',bid,1,None]))+','+lit(json.dumps(doc))+'::jsonb,'+','.join(map(lit,['Synthetic address','2026-12-01 09:00','Africa/Johannesburg',90,'Completed']))+')'
   before=self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid))
   with self.assertRaises(RuntimeError):self.legacy(u,q)
   self.assertEqual(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid)),before)
   for b,e in [(self.bids[1],'preview'),(self.bids[0],'live')]:
    for op in operations:
     with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.command(u,op,b=b,e=e)
     count+=1
    for resource in ['bookings','invoices','customers','staff']:
     with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,resource,b=b,e=e)
   self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
   for op in operations:
    with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.command(u,op)
    count+=1
   with self.assertRaisesRegex(RuntimeError,'Business context denied'):self.read(u,'bookings')
  self.enable(False)
  type(self).matrix_count=count
  (ROOT/'test-results/release/sc04-shared-matrix.json').write_text(json.dumps(dict(total=count,legacy_functions=len(functions),operations=len(operations),legacy_rpc_denials=3*len(functions),cross_scope_command_denials=6*len(operations),revoked_command_denials=3*len(operations)),indent=2)+'\n')

if __name__=='__main__':
 names=[n for n in base.Delegated.__dict__ if n.startswith('test_') and n not in ['test_10_recovery_and_preservation','test_11_complete_hostile_surface_matrix']]
 names=['test_13_legacy_owner_unchanged']+names+['test_11_legacy_and_scoped_denials','test_14_scope_allowlist','test_10_recovery_and_preservation']
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Shared(n) for n in names));raise SystemExit(not result.wasSuccessful())
