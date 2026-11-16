"""V1-005 before-repair reproduction against the captured installed SQL.

Disposable PG only. A passing test confirms the defect, not scheduling safety.
"""
import importlib.util, json, uuid, unittest
from journey import Journey, ROOT, lit

spec = importlib.util.spec_from_file_location('installed_release', ROOT/'docs/v1-017/reconstruct.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class SchedulingBaseline(Journey):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  release.database(cls.sql)

 def test_installed_writer_accepts_two_overlapping_assignments(self):
  owner, business, worker = [str(uuid.uuid4()) for _ in range(3)]
  self.sql('insert into auth.users values('+lit(owner)+');insert into public.businesses(id,owner_id,name,business_type,country,time_zone) values('+','.join(map(lit,[business,owner,'Synthetic V1005 baseline','cleaning','ZA','Africa/Johannesburg']))+')')
  self.sql('insert into public.business_memberships(business_id,environment,user_id,role,active) values('+','.join(map(lit,[business,'preview',owner,'owner',True]))+') on conflict do nothing')
  def invoke(name, **args):
   ctx='set role authenticated;set request.jwt.claim.sub='+lit(owner)+';set request.jwt.claims=\'{"is_anonymous":false}\';set request.headers='+lit(json.dumps({'x-faraios-business':business,'x-faraios-environment':'preview'}))+';'
   args={'p_business':business,'p_environment':'preview'}|args
   return self.sql(ctx+'select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,(dict,list)) else lit(v)) for k,v in args.items())+')')
  invoke('business_staff_write',p_id=worker,p_version=0,p_name='Synthetic conflict worker',p_email='',p_phone='',p_active=True)
  document={'name':'Synthetic customer','email':'baseline@example.test','phone':'','notes':'Fictional scope','currency':'ZAR','items':[{'name':'Synthetic service','quantity':1,'price':10000}]}
  bookings=[]
  for local in ['2026-12-01 09:00','2026-12-01 09:30']:
   bid=str(uuid.uuid4());bookings.append(bid)
   invoke('business_booking_write',p_id=bid,p_version=0,p_quote=None,p_document=document,p_address='Synthetic test location',p_local=local,p_zone='Africa/Johannesburg',p_duration=60,p_status='Scheduled')
   invoke('business_staff_assign',p_booking=bid,p_version=0,p_staff=[worker])
  self.assertEqual(self.sql('select count(*) from public.business_booking_staff where staff_id='+lit(worker)),'2')
  conflicts=json.loads(self.sql('select conflicts from public.business_booking_schedule where id='+lit(bookings[0])))
  self.assertTrue(any(r['booking_id']==bookings[1] for r in conflicts))
  print('REPRODUCED: installed writer commits two overlapping jobs for one worker; conflict appears only afterward.')

if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([SchedulingBaseline('test_installed_writer_accepts_two_overlapping_assignments')]))
 raise SystemExit(not result.wasSuccessful())
