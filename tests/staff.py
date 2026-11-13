"""Native PostgreSQL roles and real PHP HTTP; simulated Auth/PostgREST transport."""
from profiles import Profiles
from journey import lit
import json,re,uuid,unittest,sys
class Staff(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment']
 def rpc(self,uid,name,**args):
  return self.scope(uid,'select public.business_staff_'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k=='p_staff' else lit(v)) for k,v in args.items())+')')
 def test_staff(self):
  a,b=self.ids;bid=self.bids[0];env='live';self.sql("update staff_private.ingress set enabled=true where environment='live';update booking_private.ingress set enabled=true where environment='live'")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  self.assertIn('No staff yet',self.get('/account/staff.php')[1]);ids=[]
  for name in ['Fictional Alex','Fictional Bea']:
   html=self.get('/account/staff.php?new=1')[1];sid=re.search('name="id" value="([^"]+)"',html)[1];ids.append(sid)
   self.assertIn('Check staff details',self.post('/account/staff.php?new=1',id=sid,version=0,name='A',email='',phone='',active='on'))
   self.assertIn('Staff saved',self.post('/account/staff.php?new=1',id=sid,version=0,name=name,email='staff@example.test',phone='+27 82 555 0141',active='on'))
  doc={'name':'Fictional Client','email':'client@example.test','phone':'','notes':'Saved agreement','currency':'ZAR','items':[{'name':'Clean','quantity':1,'price':50500}]}
  bookings=[]
  for local,duration in [('2026-11-30 23:30',120),('2026-12-01 00:30',60),('2026-12-01 01:30',60)]:
   rid=str(uuid.uuid4());bookings.append(rid)
   self.scope(a,'select public.business_booking_write('+','.join([lit(bid),lit(env),lit(rid),'0','null',lit(json.dumps(doc))+'::jsonb',lit('1 Fictional Test Road'),lit(local)+'::timestamp',lit('Africa/Johannesburg'),str(duration),lit('Scheduled')])+')')
  rid,over,touch=bookings;path='/account/bookings.php?id='+rid
  before=self.sql('select to_jsonb(t)-\'assignment_version\' from public.business_bookings t where id='+lit(rid))
  self.assertIn('Assignments saved',self.post(path,action='assign',id=rid,assignment_version=0,**{'staff_ids[]':ids[0]}))
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=1,p_staff=ids)
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=over,p_version=0,p_staff=[ids[0]])
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=touch,p_version=0,p_staff=[ids[0]])
  html=self.get(path)[1];self.assertIn('Fictional Bea',html);self.assertIn('Overlapping assignments',html);self.assertIn(over,html)
  self.assertEqual(before,self.sql('select to_jsonb(t)-\'assignment_version\' from public.business_bookings t where id='+lit(rid)))
  for view in ['', '&view=calendar&month=2026-12']:
   html=self.get('/account/bookings.php?staff='+ids[0]+view)[1];self.assertIn('Fictional Alex',html);self.assertIn('Overlap',html)
  # Half-open intervals: touching endpoints have no overlap.
  self.assertEqual(self.scope(a,'select conflicts from public.business_booking_schedule where id='+lit(touch)),'[]')
  self.assertIn('changed or unavailable',self.post(path,action='assign',id=rid,assignment_version=0))
  edit='/account/staff.php?id='+ids[0]
  self.assertIn('Staff saved',self.post(edit,id=ids[0],version=1,name='Fictional Alex Updated',email='',phone=''))
  self.assertIn('(inactive)',self.get('/account/bookings.php')[1]);self.assertIn('existing assignment',self.get(path)[1])
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=2,p_staff=ids)
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=3,p_staff=[])
  with self.assertRaises(RuntimeError):self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=4,p_staff=[ids[0]])
  for owner,environment,member in [(b,env,ids[1]),(a,'preview',ids[1]),(a,env,str(uuid.uuid4()))]:
   with self.assertRaises(RuntimeError):self.rpc(owner,'assign',p_business=bid,p_environment=environment,p_booking=rid,p_version=4,p_staff=[member])
  self.assertEqual(self.scope(b,'select count(*) from public.business_staff'),'0')
  for query in ['set role anon;select * from public.business_staff','set role authenticated;delete from public.business_booking_staff','set role authenticated;update public.business_staff set active=true','set role anon;select public.business_staff_assign(null,null,null,null,null)']:
   with self.assertRaises(RuntimeError):self.sql(query)
  # Removing a cancelled booking from conflict calculation needs no reassignment.
  self.sql('update public.business_bookings set status=\'Cancelled\' where id='+lit(over))
  self.assertEqual(self.scope(a,'select conflicts from public.business_booking_schedule where id='+lit(touch)),'[]')
  from pathlib import Path
  self.assertIn('PASS:',self.sql((Path(__file__).parent/'staff-hosted.sql').read_text()))
  self.assertEqual(self.get('/account/staff-core.php')[0],403)
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Fictional Alex',self.get('/account/staff.php')[1]);self.assertIn('Staff unavailable',self.get(edit)[1])
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Staff('test_staff')]));sys.exit(not result.wasSuccessful())
