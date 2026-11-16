"""Disposable native live-environment role matrix. No hosted writes or provider sends.
Runs against canonical staged PHP and SQL from the accepted PR68 source.
"""
import importlib.util,json,uuid,unittest,hashlib
from pathlib import Path
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('repairs',ROOT/'tests/defect-repairs.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class LiveRoles(base.Repairs):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.runtime_checks=[]
  m=json.loads((ROOT/'docs/defects/final-release-scope.json').read_text())
  for f in m['runtime_files']:
   got=hashlib.sha256((cls.webroot/f['path']).read_bytes()).hexdigest()
   cls.runtime_checks.append(dict(path=f['path'],expected=f['candidate_sha256'],actual=got,match=got==f['candidate_sha256']))
  (ROOT/'test-results/release/v1008-runtime.json').write_text(json.dumps(cls.runtime_checks,indent=2))
 def call(self,u,name,args,b=None):
  b=b or self.bids[0];args=dict(p_business=b,p_environment='live')|args
  def val(v):return lit(json.dumps(v))+'::jsonb' if isinstance(v,(dict,list)) else lit(v)
  return json.loads(self.context(u,b,'live','select coalesce(to_jsonb(public.'+name+'('+','.join(k+'=>'+val(v) for k,v in args.items())+")),'null'::jsonb)"))
 def start_live(self):
  self.enable();self.sql('insert into authorization_private.live_businesses values('+lit(self.bids[0])+',true) on conflict(business_id) do update set enabled=true')
  for schema in ['customer_private','enquiry_private','quote_private','booking_private','staff_private','invoice_private']:
   self.sql("update "+schema+".ingress set enabled=true where environment='live'")
  cat=dict(currency='ZAR',items=[dict(id='1'*32,name='Synthetic fixed service',description='',duration=90,mode='fixed',amount=50500,visible=True,archived=False,options=[])])
  self.sql('insert into public.business_service_catalogues(business_id,environment,draft,published) values('+lit(self.bids[0])+",'live',"+lit(json.dumps(cat))+'::jsonb,'+lit(json.dumps(cat))+'::jsonb) on conflict(business_id,environment) do update set draft=excluded.draft,published=excluded.published')
  members={}
  for role in ['manager','receptionist','worker']:
   u=self.newuser();i=self.call(self.ids[0],'business_invite_create',dict(p_recipient=u,p_role=role));self.call(u,'business_invite_accept',dict(p_token=i['token']));members[role]=u
  return members
 def cmd_live(self,u,op,args=None):return self.command(u,op,args,e='live')
 def test_01_live_environment_permitted_workflow(self):
  members=self.start_live();owner=self.ids[0];due=self.sql('select current_date+14');today=self.sql('select current_date');report=[]
  # Owner retains original owner RPCs. Delegated actors use the canonical guarded dispatcher.
  for role,u in [('owner',owner),('manager',members['manager']),('receptionist',members['receptionist'])]:
   def run(op,args):return self.call(u,op,args) if role=='owner' else self.cmd_live(u,op,args)
   cid=str(uuid.uuid4());details=dict(name='Synthetic V1008 '+role,email='role@example.test',phone='',address='Synthetic address',notes='Private synthetic note')
   run('business_customer_write',dict(p_id=cid,p_version=0,p_details=details,p_confirm=True))
   eid=str(uuid.uuid4());run('business_enquiry_create',dict(p_id=eid,p_name='Synthetic '+role,p_email='enquiry@example.test',p_phone='',p_requirements='Synthetic role matrix'))
   run('business_enquiry_workflow_save',dict(p_id=eid,p_version=1,p_status='Contacted',p_notes='Synthetic followup',p_follow_up=None))
   qid=str(uuid.uuid4());doc=self.document();run('business_quote_write',dict(p_id=qid,p_version=0,p_action='save',p_document=doc,p_expiry=due))
   # Real customer capability calls in the disposable database; no send provider.
   send=dict(p_id=qid,p_version=1)
   if role=='owner':send['p_free_confirmed']=True
   run('business_quote_send',send)
   token=self.sql('select share_token from public.business_quotes where id='+lit(qid))
   self.sql("set role anon;select public.business_quote_customer('live',"+lit(token)+",'Accepted')")
   bid=str(uuid.uuid4());run('business_booking_write',dict(p_id=bid,p_version=0,p_quote=qid,p_document=doc,p_address='Synthetic matrix address',p_local='2026-12-05 09:00',p_zone='Africa/Johannesburg',p_duration=90,p_status='Scheduled'))
   sid=str(uuid.uuid4())
   if role in ['owner','manager']:
    run('business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic '+role+' staff',p_email='private@example.test',p_phone='',p_active=True))
   else:
    self.call(owner,'business_staff_write',dict(p_id=sid,p_version=0,p_name='Synthetic receptionist assignable',p_email='private@example.test',p_phone='',p_active=True))
   run('business_staff_assign',dict(p_booking=bid,p_version=0,p_staff=[sid]))
   iid=str(uuid.uuid4());run('business_invoice_write',dict(p_id=iid,p_version=0,p_action='save',p_document=doc,p_due=due,p_booking=bid));run('business_invoice_write',dict(p_id=iid,p_version=1,p_action='issue'))
   if role in ['owner','manager']:
    pid=str(uuid.uuid4());run('business_invoice_payment',dict(p_invoice=iid,p_id=pid,p_amount=100,p_paid_on=today,p_reference='SYNTH V1008 '+role))
    self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where id='+lit(pid)),'1')
    if role=='owner':
     run('business_invoice_payment',dict(p_invoice=iid,p_id=str(uuid.uuid4()),p_amount=100,p_paid_on=today,p_reference='SYNTH V1008 owner',p_reversal=pid,p_reason='Synthetic native reversal'))
   self.assertEqual(self.sql('select state from public.business_invoices where id='+lit(iid)),'Issued')
   self.assertEqual(self.sql('select status from public.business_quotes where id='+lit(qid)),'Accepted')
   report.append(dict(role=role,customer=True,enquiry=True,quote=True,booking=True,assignment=True,invoice=True,manual_payment=role!='receptionist'))
   if role=='manager':worker_booking=bid;worker_staff=sid
  self.call(owner,'business_worker_link',dict(p_user=members['worker'],p_staff=worker_staff))
  rows=self.read(members['worker'],'visits',e='live');self.assertEqual([r['id'] for r in rows],[worker_booking]);self.assertNotIn('50500',json.dumps(rows));self.assertNotIn('@example.test',json.dumps(rows))
  self.cmd_live(members['worker'],'availability.request',dict(id=str(uuid.uuid4()),starts_at='2026-12-06T09:00',ends_at='2026-12-06T10:00'))
  self.cmd_live(members['worker'],'visit.execute',dict(id=worker_booking,version=1,status='In Progress'));self.cmd_live(members['worker'],'visit.execute',dict(id=worker_booking,version=2,status='Completed'))
  self.assertEqual(self.sql('select status from public.business_bookings where id='+lit(worker_booking)),'Completed')
  self.cmd_live(members['manager'],'terminal.correct',dict(id=worker_booking,version=3,status='Scheduled',reason='Synthetic native role acceptance'))
  for role,u in members.items():
   with self.assertRaises(RuntimeError):self.read(u,'customers',b=self.bids[1],e='live')
   with self.assertRaises(RuntimeError):self.read(u,'customers',e='preview')
   self.call(owner,'business_membership_revoke',dict(p_user=u))
   with self.assertRaises(RuntimeError):self.read(u,'visits' if role=='worker' else 'customers',e='live')
  report.append(dict(role='worker',assigned_only=True,availability=True,start=True,complete=True))
  (ROOT/'test-results/release/v1008-live-roles.json').write_text(json.dumps(dict(status='PASS',scope='disposable native SQL/PHP, simulated Auth/REST; not hosted acceptance',roles=report),indent=2))
  self.sql('update authorization_private.live_businesses set enabled=false where business_id='+lit(self.bids[0]));self.enable(False)
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([LiveRoles('test_01_live_environment_permitted_workflow')]))
 raise SystemExit(not r.wasSuccessful())
