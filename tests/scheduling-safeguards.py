"""V1-005 transactional scheduling against the exact installed V1-017 baseline."""
import importlib.util,json,uuid,unittest
from concurrent.futures import ThreadPoolExecutor
from journey import Journey,ROOT,lit
spec=importlib.util.spec_from_file_location('schedule_release',ROOT/'docs/v1-017/reconstruct.py');release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
class Scheduling(Journey):
 @classmethod
 def setUpClass(cls):
  super().setUpClass();release.database(cls.sql)
  spec=importlib.util.spec_from_file_location('schedule_install',ROOT/'docs/v1-005/stage.py');installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
  original=json.loads((ROOT/'docs/v1-005/preimages.json').read_text())[-1]['definition']
  cls.sql(original.replace('AS $function$','AS $function$\n-- simulated later-function drift',1))
  try:installer.install_database(cls.sql)
  except RuntimeError as error:
   if 'V1-005 function baseline drift'not in str(error):raise
  else:raise AssertionError('Drifting function must reject the whole installation')
  if cls.sql("select to_regclass('authorization_private.scheduling_policies') is null")!='t':raise AssertionError('Partial scheduling installation remained')
  cls.sql(original);installer.install_database(cls.sql);cls.atomic_guard_proven=True
 def invoke(self,u,b,name,**args):
  context='set role authenticated;set request.jwt.claim.sub='+lit(u)+';set request.jwt.claims=\'{"is_anonymous":false}\';set request.headers='+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'
  args={'p_business':b,'p_environment':'preview'}|args
  return json.loads(self.sql(context+'select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,(dict,list)) else lit(v)) for k,v in args.items())+')'))
 def fixture(self,zone='Africa/Johannesburg'):
  u,b,s=[str(uuid.uuid4())for _ in range(3)]
  self.sql('insert into auth.users values('+lit(u)+');insert into public.businesses(id,owner_id,name,business_type,country,time_zone) values('+','.join(map(lit,[b,u,'Synthetic V1005','cleaning','ZA',zone]))+')')
  self.sql('insert into public.business_memberships(business_id,environment,user_id,role,active) values('+','.join(map(lit,[b,'preview',u,'owner',True]))+') on conflict do nothing')
  self.invoke(u,b,'business_staff_write',p_id=s,p_version=0,p_name='Synthetic worker',p_email='',p_phone='',p_active=True)
  return u,b,s
 def policy(self,u,b,version=0,enabled=True,hours=None,before=30,after=30,zone='Africa/Johannesburg',ack=False):
  return self.invoke(u,b,'business_schedule_policy_write',p_version=version,p_enabled=enabled,p_zone=zone,p_hours=hours if hours is not None else [dict(day=i,start=480,end=1080)for i in range(1,8)],p_before=before,p_after=after,p_ack_legacy=ack)
 def booking(self,u,b,local='2026-12-01 09:00',duration=60,zone='Africa/Johannesburg'):
  bid=str(uuid.uuid4());doc=dict(name='Synthetic customer',email='v1005@example.test',phone='',notes='Saved agreed scope',currency='ZAR',items=[dict(name='Synthetic work',quantity=1,price=10000)])
  self.invoke(u,b,'business_booking_write',p_id=bid,p_version=0,p_quote=None,p_document=doc,p_address='Synthetic address',p_local=local,p_zone=zone,p_duration=duration,p_status='Scheduled')
  return bid
 def assign(self,u,b,bid,s,version=0):return self.invoke(u,b,'business_staff_assign',p_booking=bid,p_version=version,p_staff=s)
 def reschedule(self,u,b,bid,local,version=1,status='Scheduled'):
  row=json.loads(self.sql('select to_jsonb(b) from public.business_bookings b where id='+lit(bid)))
  return self.invoke(u,b,'business_booking_write',p_id=bid,p_version=version,p_quote=None,p_document=row['document'],p_address=row['address'],p_local=local,p_zone=row['time_zone'],p_duration=row['duration_minutes'],p_status=status)
 def race(self,operations):
  def call(f):
   try:f();return True
   except RuntimeError as e:
    self.assertNotIn('deadlock',str(e));self.assertTrue(any(x in str(e) for x in ['already assigned','time off conflicts','Time off overlaps']),str(e));return False
  with ThreadPoolExecutor(max_workers=len(operations))as p:return list(p.map(call,operations))
 def snapshot(self,b):
  return {t:self.sql("select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text),'[]') from "+t+' t where business_id='+lit(b))for t in ['public.business_bookings','public.business_booking_staff','authorization_private.scheduling_history']}
 def test_01_parallel_assignments_one_winner_and_no_partial_multiworker(self):
  u,b,s=self.fixture();self.policy(u,b);a=self.booking(u,b);c=self.booking(u,b,'2026-12-01 09:30')
  self.assertEqual(sorted(self.race([lambda:self.assign(u,b,a,[s]),lambda:self.assign(u,b,c,[s])])),[False,True])
  self.assertEqual(self.sql('select count(*) from public.business_booking_staff where business_id='+lit(b)),'1')
  empty=self.sql('select id from public.business_bookings where business_id='+lit(b)+' and assignment_version=0');other=str(uuid.uuid4());self.invoke(u,b,'business_staff_write',p_id=other,p_version=0,p_name='Synthetic second',p_email='',p_phone='',p_active=True)
  before=self.snapshot(b)
  with self.assertRaisesRegex(RuntimeError,'already assigned'):self.assign(u,b,empty,[other,s])
  self.assertEqual(self.snapshot(b),before)
 def test_02_hours_buffers_timeoff_inactive_and_stale(self):
  u,b,s=self.fixture();self.policy(u,b);a=self.booking(u,b);self.assign(u,b,a,[s]);before=self.snapshot(b)
  with self.assertRaisesRegex(RuntimeError,'changed or unavailable'):self.assign(u,b,a,[],0)
  self.assertEqual(self.snapshot(b),before)
  # 09-10 job with before/after 30 means 11:00 is the next safe start.
  for local in ['2026-12-01 10:59','2026-12-01 08:00','2026-12-01 17:01']:
   bid=self.booking(u,b,local);before=self.snapshot(b)
   with self.assertRaises(RuntimeError):self.assign(u,b,bid,[s])
   self.assertEqual(self.snapshot(b),before)
  bid=self.booking(u,b,'2026-12-01 11:00');self.assign(u,b,bid,[s])
  w=str(uuid.uuid4());self.sql('insert into auth.users values('+lit(w)+');insert into public.business_memberships values('+','.join(map(lit,[b,'preview',w,'worker',True]))+');insert into authorization_private.worker_identities values('+','.join(map(lit,[b,'preview',w,s]))+')')
  self.sql('insert into authorization_private.availability_requests values('+','.join(map(lit,[str(uuid.uuid4()),b,'preview',w,'2026-12-02 06:00+00','2026-12-02 12:00+00']))+',now())')
  bid=self.booking(u,b,'2026-12-02 09:00');before=self.snapshot(b)
  with self.assertRaisesRegex(RuntimeError,'time off conflicts'):self.assign(u,b,bid,[s])
  self.assertEqual(self.snapshot(b),before)
  self.invoke(u,b,'business_staff_write',p_id=s,p_version=1,p_name='Synthetic worker',p_email='',p_phone='',p_active=False)
  bid=self.booking(u,b,'2026-12-03 09:00')
  with self.assertRaisesRegex(RuntimeError,'active staff'):self.assign(u,b,bid,[s])
 def test_03_reschedule_assignment_and_timeoff_races(self):
  u,b,s=self.fixture();self.policy(u,b);a=self.booking(u,b);self.assign(u,b,a,[s]);c=self.booking(u,b,'2026-12-01 13:00')
  self.assertEqual(sorted(self.race([lambda:self.reschedule(u,b,a,'2026-12-01 13:00'),lambda:self.assign(u,b,c,[s])])),[False,True])
  u,b,s=self.fixture();self.policy(u,b);a=self.booking(u,b);w=str(uuid.uuid4());self.sql('insert into auth.users values('+lit(w)+');insert into public.business_memberships values('+','.join(map(lit,[b,'preview',w,'worker',True]))+');insert into authorization_private.worker_identities values('+','.join(map(lit,[b,'preview',w,s]))+')')
  req=str(uuid.uuid4())
  def leave():self.sql('begin;select authorization_private.scheduling_lock_scope('+lit(b)+",'preview');insert into authorization_private.availability_requests values("+','.join(map(lit,[req,b,'preview',w,'2026-12-01 06:00+00','2026-12-01 10:00+00']))+',now());commit;')
  self.assertEqual(sorted(self.race([lambda:self.assign(u,b,a,[s]),leave])),[False,True])
 def test_04_policy_validation_scope_denial_and_preserved_settings(self):
  u,b,s=self.fixture();self.policy(u,b);a=self.booking(u,b);self.assign(u,b,a,[s]);before=self.invoke(u,b,'business_schedule_policy_read')
  for changes in [dict(version=0),dict(hours=[]),dict(hours=[dict(day=1,start=60,end=30)]),dict(hours=[dict(day=2,start=480,end=600),dict(day=2,start=590,end=700)]),dict(enabled=False),dict(hours=[dict(day=1,start=480,end=1080)])]:
   with self.assertRaises(RuntimeError):self.policy(u,b,version=1,**{k:v for k,v in changes.items()if k!='version'}) if 'version'not in changes else self.policy(u,b,**changes)
   self.assertEqual(self.invoke(u,b,'business_schedule_policy_read'),before)
  outsider,other,_=self.fixture()
  for q in ['set role anon;select public.business_schedule_policy_read('+lit(b)+",'preview')",'set role authenticated;select * from authorization_private.scheduling_policies','set role authenticated;delete from authorization_private.scheduling_history']:
   with self.assertRaises(RuntimeError):self.sql(q)
  with self.assertRaises(RuntimeError):self.invoke(outsider,b,'business_schedule_policy_read')
  self.assertEqual(self.invoke(u,b,'business_schedule_policy_read'),before)
 def test_05_grandfathered_history_and_policy_change_do_not_erase_work(self):
  u,b,s=self.fixture();a=self.booking(u,b);c=self.booking(u,b,'2026-12-01 09:30');self.assign(u,b,a,[s]);self.assign(u,b,c,[s]);before=self.snapshot(b)
  with self.assertRaisesRegex(RuntimeError,'acknowledge'):self.policy(u,b)
  self.assertEqual(self.snapshot(b),before)
  self.policy(u,b,ack=True);after=self.snapshot(b);self.assertEqual(after['public.business_bookings'],before['public.business_bookings']);self.assertEqual(after['public.business_booking_staff'],before['public.business_booking_staff'])
  self.assign(u,b,a,[s],1);self.assertEqual(self.sql('select valid from authorization_private.scheduling_legacy where booking_id='+lit(a)),'t')
  bid=self.booking(u,b,'2026-12-01 10:00')
  with self.assertRaisesRegex(RuntimeError,'already assigned'):self.assign(u,b,bid,[s])
  before=self.snapshot(b)
  with self.assertRaises(RuntimeError):self.reschedule(u,b,a,'2026-12-01 10:00')
  self.assertEqual(self.snapshot(b),before)
  self.reschedule(u,b,a,'2026-12-01 13:00');before=self.snapshot(b)
  with self.assertRaisesRegex(RuntimeError,'Outside working hours'):self.policy(u,b,version=1,hours=[dict(day=i,start=480,end=720)for i in range(1,8)])
  self.assertEqual(self.snapshot(b),before)
 def test_06_midnight_dst_and_saved_zone_boundaries(self):
  u,b,s=self.fixture();self.policy(u,b,hours=[dict(day=i,start=0,end=1440)for i in range(1,8)],before=0,after=0)
  a=self.booking(u,b,'2026-12-01 23:30',120);self.assign(u,b,a,[s]);c=self.booking(u,b,'2026-12-02 00:30')
  with self.assertRaisesRegex(RuntimeError,'already assigned'):self.assign(u,b,c,[s])
  c=self.booking(u,b,'2026-12-02 01:30');self.assign(u,b,c,[s])
  u,b,s=self.fixture('Europe/London');self.policy(u,b,zone='Europe/London',before=0,after=0,hours=[dict(day=i,start=0,end=1440)for i in range(1,8)])
  for local in ['2027-03-28 01:30','2027-10-31 01:30']:
   with self.assertRaisesRegex(RuntimeError,'skipped or repeated'):self.booking(u,b,local,zone='Europe/London')
  a=self.booking(u,b,'2027-03-28 00:30',120,zone='Europe/London');self.assign(u,b,a,[s]);c=self.booking(u,b,'2027-03-28 03:00',zone='Europe/London')
  with self.assertRaisesRegex(RuntimeError,'already assigned'):self.assign(u,b,c,[s])
  self.assertEqual(self.sql('select time_zone from public.business_bookings where id='+lit(a)),'Europe/London')
 def test_07_owner_delegate_and_revoked_token_share_constraints(self):
  u,b,s=self.fixture();self.policy(u,b);self.sql('update authorization_private.delegation_gate set enabled=true;insert into authorization_private.preview_businesses values('+lit(b)+')')
  manager,worker=[str(uuid.uuid4())for _ in range(2)]
  for actor,role in [(manager,'manager'),(worker,'worker')]:
   self.sql('insert into auth.users values('+lit(actor)+');insert into public.business_memberships values('+','.join(map(lit,[b,'preview',actor,role,True]))+')')
  a=self.booking(u,b);c=self.booking(u,b,'2026-12-01 09:30')
  delegate=lambda:self.invoke(manager,b,'business_delegate_command',p_operation='business_staff_assign',p_arguments=dict(p_booking=c,p_version=0,p_staff=[s]))
  self.assertEqual(sorted(self.race([lambda:self.assign(u,b,a,[s]),delegate])),[False,True])
  before=self.snapshot(b)
  with self.assertRaises(RuntimeError):self.invoke(worker,b,'business_delegate_command',p_operation='business_staff_assign',p_arguments=dict(p_booking=a,p_version=0,p_staff=[s]))
  self.sql('update public.business_memberships set active=false where user_id='+lit(manager))
  with self.assertRaisesRegex(RuntimeError,'Business context denied'):delegate()
  self.assertEqual(self.snapshot(b),before)
 def test_08_repeatable_read_cannot_double_reserve_a_stale_snapshot(self):
  u,b,s=self.fixture();self.policy(u,b);a=self.booking(u,b);c=self.booking(u,b,'2026-12-01 09:30')
  def reserve(bid):
   prefix='begin isolation level repeatable read;select count(*) from public.business_booking_staff;select pg_sleep(0.25);set role authenticated;set request.jwt.claim.sub='+lit(u)+';set request.jwt.claims=\'{"is_anonymous":false}\';set request.headers='+lit(json.dumps({'x-faraios-business':b,'x-faraios-environment':'preview'}))+';'
   try:self.sql(prefix+'select public.business_staff_assign('+','.join([lit(b),lit('preview'),lit(bid),'0',lit(json.dumps([s]))+'::jsonb'])+');commit;');return True
   except RuntimeError as e:self.assertTrue('could not serialize' in str(e)or'already assigned'in str(e),str(e));return False
  with ThreadPoolExecutor(max_workers=2)as pool:results=list(pool.map(reserve,[a,c]))
  self.assertEqual(sorted(results),[False,True]);self.assertEqual(self.sql('select count(*) from public.business_booking_staff where business_id='+lit(b)),'1')
 def test_09_timeoff_resolution_is_owner_only_append_only_and_idempotent(self):
  u,b,s=self.fixture();self.policy(u,b);worker=str(uuid.uuid4());self.sql('insert into auth.users values('+lit(worker)+');insert into public.business_memberships values('+','.join(map(lit,[b,'preview',worker,'worker',True]))+');insert into authorization_private.worker_identities values('+','.join(map(lit,[b,'preview',worker,s]))+')')
  rid=str(uuid.uuid4());self.sql('insert into authorization_private.availability_requests values('+','.join(map(lit,[rid,b,'preview',worker,'2026-12-01 06:00+00','2026-12-01 15:00+00']))+',now())');original=self.sql('select to_jsonb(r) from authorization_private.availability_requests r where id='+lit(rid))
  bid=self.booking(u,b)
  with self.assertRaisesRegex(RuntimeError,'time off conflicts'):self.assign(u,b,bid,[s])
  self.assertEqual(self.invoke(u,b,'business_schedule_time_off_read')[0]['id'],rid)
  with self.assertRaises(RuntimeError):self.invoke(worker,b,'business_schedule_time_off_resolve',p_id=rid,p_reason='Forbidden worker action')
  for _ in range(2):self.invoke(u,b,'business_schedule_time_off_resolve',p_id=rid,p_reason='Synthetic time-off withdrawn by agreement')
  self.assertEqual(self.sql('select to_jsonb(r) from authorization_private.availability_requests r where id='+lit(rid)),original)
  self.assertEqual(self.sql('select count(*) from authorization_private.scheduling_time_off_resolutions where request_id='+lit(rid)),'1')
  self.assertEqual(self.invoke(u,b,'business_schedule_time_off_read'),[]);self.assign(u,b,bid,[s])
 def test_10_atomic_install_and_exact_package(self):
  self.assertTrue(self.atomic_guard_proven)
  spec=importlib.util.spec_from_file_location('exact_install',ROOT/'docs/v1-005/stage.py');installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
  self.assertEqual((ROOT/'docs/v1-005/install.sql').read_text(),installer.installation()+'\n')
  manifest=json.loads((ROOT/'docs/v1-005/release-scope.json').read_text())
  import hashlib
  self.assertEqual(hashlib.sha256((ROOT/'docs/v1-005/install.sql').read_bytes()).hexdigest(),manifest['sql_sha256'])
  for entry in manifest['files']:self.assertEqual(hashlib.sha256((ROOT/'docs/v1-005/runtime'/entry['path']).read_bytes()).hexdigest(),entry['candidate_sha256'])

if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Scheduling(n)for n in sorted(Scheduling.__dict__)if n.startswith('test_')));raise SystemExit(not r.wasSuccessful())
