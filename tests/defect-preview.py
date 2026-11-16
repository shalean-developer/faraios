"""Verify preview transport, copied-function authorization and live preservation."""
import importlib.util,json,unittest,os
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('workflow',ROOT/'tests/workflow-repairs.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
spec=importlib.util.spec_from_file_location('preview',ROOT/'docs/defects/preview.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
class Preview(base.Workflow):
 sc04_report_name='defect-preview.json'
 rpc_aliases={v:k for k,v in preview.ALIASES.items()}
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.original=cls.sql("select md5(pg_get_functiondef('public.business_delegate_command(uuid,text,text,jsonb)'::regprocedure))")
  cls.sql(preview.sql((cls.bids[0],)))
  preview.overlay(cls.webroot)
  cls.restart_php()
 def command(self,u,operation,arguments=None,b=None,e='preview'):
  return json.loads(self.context(u,b or self.bids[0],e,'select public.business_delegate_command_preview_d0106('+','.join(map(lit,[b or self.bids[0],e,operation,json.dumps(arguments or {})]))+')'))
 def page(self,u,resource,page=1,size=50,id=None,b=None,e='preview'):
  return json.loads(self.context(u,b or self.bids[0],e,'select public.business_delegate_page_preview_d0106('+','.join(map(lit,[b or self.bids[0],e,resource,id,page,size]))+')'))
 def test_preview_boundaries(self):
  self.enable();u=self.member('manager');b=self.bids[0]
  self.sql('insert into authorization_private.live_businesses(business_id,enabled) values('+lit(b)+',true) on conflict(business_id) do update set enabled=true')
  self.sql('insert into public.business_memberships values('+','.join(map(lit,[b,'live',u,'manager',True]))+')')
  self.assertEqual(self.read(u,'customers',e='live'),[])
  for invoke in [lambda:self.page(u,'customers',e='live'),lambda:self.command(u,'business_customer_search',dict(p_search='',p_page=1),e='live'),lambda:self.page(u,'customers',b=self.bids[1])]:
   with self.assertRaisesRegex(RuntimeError,'Preview scope denied'):invoke()
  self.assertEqual(self.sql("select md5(pg_get_functiondef('public.business_delegate_command(uuid,text,text,jsonb)'::regprocedure))"),self.original)
  for name in preview.ALIASES.values():
   self.assertEqual(self.sql("select has_function_privilege('anon',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute') from pg_proc p where proname="+lit(name)),'f')
  self.enable(False)
# Run only independent boundary test and existing meaningful repair scenarios on copied RPCs.
selected=['test_preview_boundaries','test_d02_business_zone_and_dst','test_d03_validation_csrf_stale_and_revoke','test_d03_network_no_automatic_replay','test_d04_scoped_selection_and_stale','test_d05_edit_stale_denial_and_identity','test_d06_reference_and_idempotency','test_d01_pages_and_projection','test_d01_assignment_across_pages']
if __name__=='__main__':
 if os.environ.get('FARAIOS_MOBILE_BROWSER_CHECK')=='true':selected.insert(0,'test_browser_flows')
 suite=unittest.TestSuite(Preview(n) for n in selected);result=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not result.wasSuccessful())
