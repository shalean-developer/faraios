"""SC-03 candidate execution on disposable loopback PG. No application adapter."""
import json,uuid,unittest,subprocess,hashlib
from concurrent.futures import ThreadPoolExecutor
from foundation import Foundation
from journey import ROOT,lit,PGBIN

class SC03(Foundation):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql((ROOT/'docs/sc03/foundation.sql').read_text())
 def command(self,key,changes,actor=None,business=None,environment='preview',reason='Synthetic command'):
  a=actor or self.ids[0];b=business or self.bids[0]
  return "set request.jwt.claim.sub="+lit(a)+";set request.jwt.claims='{\"is_anonymous\":false}';select public.shared_core_apply("+','.join(map(lit,[b,environment,key,a,reason]))+','+lit(json.dumps(changes))+'::jsonb)'
 def change(self,version=0,id=None):return dict(kind='synthetic.fixture',id=id or str(uuid.uuid4()),expected_version=version,schema=1,snapshot=dict(source='synthetic',value=1))
 def count(self,table):return self.sql('select count(*) from public.shared_core_'+table)
 def test_contract(self):
  c=self.change();key=str(uuid.uuid4());q=self.command(key,[c]);first=self.sql(q)
  self.assertEqual(first,self.sql(q))
  for kw in [dict(reason='Different reason'),dict(environment='invalid'),dict(actor=self.ids[1]),dict(reason='')]:
   with self.assertRaises(RuntimeError):self.sql(self.command(key,[c],**kw))
  for changed in [c|dict(snapshot={'changed':True}),c|dict(expected_version=1),c|dict(schema=2),c|dict(id=None),c|dict(kind=None),c|dict(snapshot=None),c|dict(extra=1)]:
   with self.assertRaises(RuntimeError):self.sql(self.command(key,[changed]))
  with self.assertRaises(RuntimeError):self.sql(self.command(str(uuid.uuid4()),[c]))
  # Multi-aggregate failure rolls back earlier aggregate update, command and events.
  good=self.change(id=c['id'],version=1);bad=self.change(version=9)
  good['kind']='aaa.fixture' # ensure a new first write before stale second aggregate
  good['expected_version']=0;bad['kind']='zzz.fixture'
  before=[self.count(t) for t in ['aggregates','commands','events']]
  with self.assertRaises(RuntimeError):self.sql(self.command(str(uuid.uuid4()),[good,bad]))
  self.assertEqual(before,[self.count(t) for t in ['aggregates','commands','events']])
  # An event insert error also rolls back all aggregate/command changes.
  self.sql("create function public.sc03_fail_event() returns trigger language plpgsql as $$begin raise exception 'Synthetic event failure';end$$;create trigger sc03_fail_event before insert on public.shared_core_events for each row execute function public.sc03_fail_event()")
  with self.assertRaises(RuntimeError):self.sql(self.command(str(uuid.uuid4()),[self.change()]))
  self.assertEqual(before,[self.count(t) for t in ['aggregates','commands','events']])
  self.sql('drop trigger sc03_fail_event on public.shared_core_events;drop function public.sc03_fail_event()')
  # Explicit caller rollback removes successful statement effects.
  self.sql('begin;'+self.command(str(uuid.uuid4()),[self.change()])+';rollback')
  self.assertEqual(before,[self.count(t) for t in ['aggregates','commands','events']])
  # Immutable command/event records; no API role can read/write/execute.
  for table in ['commands','events']:
   for verb in ['delete from','update']:
    sql='delete from public.shared_core_'+table if verb=='delete from' else 'update public.shared_core_'+table+' set business_id=business_id'
    with self.assertRaises(RuntimeError):self.sql(sql)
  for role in ['anon','authenticated','service_role']:
   for table in ['aggregates','commands','events']:
    with self.assertRaises(RuntimeError):self.sql('set role '+role+';select * from public.shared_core_'+table)
   with self.assertRaises(RuntimeError):self.sql('set role '+role+';'+q)
  # Replay history reconstructs the latest aggregate exactly.
  self.sql(self.command(str(uuid.uuid4()),[c|dict(expected_version=1,snapshot={'value':2})]))
  self.assertEqual(self.sql("select bool_and(a.version=e.version and a.snapshot=e.snapshot) from public.shared_core_aggregates a join (select distinct on (business_id,environment,kind,aggregate_id) * from public.shared_core_events order by business_id,environment,kind,aggregate_id,version desc) e on (a.business_id,a.environment,a.kind,a.id)=(e.business_id,e.environment,e.kind,e.aggregate_id)"),'t')
 def test_concurrency(self):
  def attempt(q):
   try:return self.sql(q)
   except RuntimeError:return 'REJECT'
  c=self.change();key=str(uuid.uuid4());q=self.command(key,[c])
  with ThreadPoolExecutor(max_workers=6) as ex:r=list(ex.map(attempt,[q]*6))
  self.assertNotIn('REJECT',r);self.assertEqual(len(set(r)),1)
  qs=[self.command(str(uuid.uuid4()),[c|dict(expected_version=1,snapshot={'winner':i})]) for i in range(6)]
  with ThreadPoolExecutor(max_workers=6) as ex:r=list(ex.map(attempt,qs))
  self.assertEqual(r.count('REJECT'),5)
  # Same key, competing payload: exactly one committed outcome.
  c=self.change();key=str(uuid.uuid4());qs=[self.command(key,[c|dict(snapshot={'winner':i})]) for i in range(6)]
  with ThreadPoolExecutor(max_workers=6) as ex:r=list(ex.map(attempt,qs))
  self.assertEqual(r.count('REJECT'),5)
  # Reversed input order canonicalizes and does not deadlock.
  cs=[self.change(),self.change()];key=str(uuid.uuid4())
  with ThreadPoolExecutor(max_workers=2) as ex:r=list(ex.map(attempt,[self.command(key,cs),self.command(key,cs[::-1])]))
  self.assertNotIn('REJECT',r);self.assertEqual(r[0],r[1])
  # Environment and business isolate the same key/id.
  with self.assertRaises(RuntimeError):self.sql(self.command(key,cs,environment='live'))
  self.sql(self.command(key,cs,actor=self.ids[1],business=self.bids[1]))
 def test_legacy_preservation(self):
  a=self.ids[0];bid=self.bids[0];booking=str(uuid.uuid4());iid=str(uuid.uuid4())
  doc=json.loads((ROOT/'tests/fixtures/sc02/baseline.json').read_text())['legacy_documents'][0]['document']
  self.sql((ROOT/'release/activate-foundation.sql').read_text())
  self.scope(a,'select public.business_booking_write('+','.join(map(lit,[bid,'preview',booking,0,None]))+','+lit(json.dumps(doc))+'::jsonb,'+','.join(map(lit,['Synthetic address','2026-12-01 09:00','Africa/Johannesburg',60,'Scheduled']))+')')
  ctx=dict(p_business=bid,p_environment='preview')
  self.call(a,'write',**ctx,p_id=iid,p_version=0,p_action='save',p_document=doc,p_due=self.sql('select current_date+14'),p_booking=booking)
  self.call(a,'write',**ctx,p_id=iid,p_version=1,p_action='issue')
  import sys
  sys.path.insert(0,str(ROOT/'scripts'))
  from database_recovery import fingerprints
  schemas=['public','booking_private','invoice_private','quote_private','request_private','staff_private','customer_private','enquiry_private','waitlist_private']
  def legacy():return {k:v for k,v in fingerprints(self.sql,schemas).items() if not k.startswith('public.shared_core_')}
  before=legacy()
  self.sql(self.command(str(uuid.uuid4()),[self.change()]))
  self.assertEqual(before,legacy())
  token=self.scope(a,'select share_token from public.business_invoices where id='+lit(iid))
  self.assertNotEqual(self.sql("set role anon;select public.business_invoice_customer('preview',"+lit(token)+")"),'{}')
  self.sql((ROOT/'release/deactivate-foundation.sql').read_text())
  self.assertEqual(before,legacy())
 def test_recovery(self):
  c=self.change();key=str(uuid.uuid4());q=self.command(key,[c]);result=self.sql(q)
  import sys
  sys.path.insert(0,str(ROOT/'scripts'))
  from database_recovery import fingerprints
  before=fingerprints(self.sql,['public'])
  security="select jsonb_agg(to_jsonb(t) order by relname) from (select c.relname,c.relrowsecurity,(select jsonb_agg(jsonb_build_array(r,has_table_privilege(r,c.oid,'SELECT'),has_table_privilege(r,c.oid,'INSERT'),has_table_privilege(r,c.oid,'UPDATE'),has_table_privilege(r,c.oid,'DELETE'),has_table_privilege(r,c.oid,'TRUNCATE')) order by r) from unnest(array['anon','authenticated','service_role']) r) access,(select jsonb_agg(jsonb_build_array(tgname,pg_get_triggerdef(oid)) order by tgname) from pg_trigger where tgrelid=c.oid and not tgisinternal) triggers from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'shared_core_%' and c.relkind='r') t"
  acl=self.sql(security)
  for t in ['aggregates','commands','events']:self.assertIn('public.shared_core_'+t,before)
  conn=['-h','127.0.0.1','-p',str(self.pgport)];dump=self.tmp.name+'/sc03.dump'
  subprocess.run([str(PGBIN/'pg_dump'),*conn,'-d','postgres','-Fc','--no-owner','-f',dump],env=self.env,check=True,capture_output=True)
  self.sql('create database sc03_recovery')
  try:
   subprocess.run([str(PGBIN/'pg_restore'),*conn,'-d','sc03_recovery','--no-owner','--exit-on-error',dump],env=self.env,check=True,capture_output=True)
   def restored(sql):
    p=subprocess.run([str(PGBIN/'psql'),*conn,'-d','sc03_recovery','-XAtq','-v','ON_ERROR_STOP=1','-c',sql],env=self.env,capture_output=True,text=True,check=True);return p.stdout.strip()
   self.assertEqual(before,fingerprints(restored,['public']))
   self.assertEqual(acl,restored(security))
   self.assertEqual(restored(q),result)
   for role in ['anon','authenticated','service_role']:
    self.assertEqual(restored("select has_function_privilege('"+role+"','public.shared_core_apply(uuid,text,uuid,uuid,text,jsonb)','execute')"),'f')
   out=ROOT/'test-results/release';out.mkdir(parents=True,exist_ok=True)
   (out/'sc03-native.json').write_text(json.dumps(dict(postgres=self.sql('show server_version'),synthetic_only=True,public_fingerprints_equal=True,restored_retry_equal=True,api_execute_denied=True,archive_sha256=hashlib.sha256(open(dump,'rb').read()).hexdigest()),indent=2)+'\n')
  finally:self.sql('drop database sc03_recovery')

if __name__=='__main__':
 suite=unittest.TestSuite(SC03(n) for n in ['test_contract','test_concurrency','test_legacy_preservation','test_recovery'])
 raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
