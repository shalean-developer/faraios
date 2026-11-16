"""V1-017 blank-database reconstruction, exact runtime and guarded rollback proof."""
import sys,json,importlib.util,unittest,tempfile,uuid,subprocess
from pathlib import Path
from journey import Journey,ROOT,lit,PHP
spec=importlib.util.spec_from_file_location('release_reconstruct',ROOT/'docs/v1-017/reconstruct.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Release(Journey):
 @classmethod
 def setUpClass(cls):
  super().setUpClass();cls.functions,cls.catalog=m.database(cls.sql)
 def test_01_runtime_exact_and_tamper_denial(self):
  with tempfile.TemporaryDirectory()as d:
   dest=Path(d)/'runtime';files=m.runtime(dest)
   self.assertEqual(len(files),152)
   for p,h in files.items():self.assertEqual(m.sha((dest/p).read_bytes()),h,p)
   for p in dest.rglob('*.php'):
    p2=subprocess.run([PHP,'-l',str(p)],capture_output=True,text=True);self.assertEqual(p2.returncode,0,p2.stderr)
   with self.assertRaises(ValueError):m.runtime(dest)
   # Simulated later edit: rollback must reject before touching any file.
   from importlib.machinery import SourceFileLoader
   guard_spec=importlib.util.spec_from_file_location('release_guard',ROOT/'docs/v1-017/guarded-files.py');guard=importlib.util.module_from_spec(guard_spec);guard_spec.loader.exec_module(guard)
   chosen=['account/delegated.php','account/bookings.php'];saved={p:(dest/p).read_bytes()for p in chosen}
   plan={p:{'expected':m.sha(saved[p]),'replacement':saved[p]+b'\n'}for p in chosen}
   (dest/chosen[1]).write_bytes(saved[chosen[1]]+b'concurrent change')
   with self.assertRaises(ValueError):guard.apply(dest,plan)
   self.assertEqual((dest/chosen[0]).read_bytes(),saved[chosen[0]])
   self.assertEqual((dest/chosen[1]).read_bytes(),saved[chosen[1]]+b'concurrent change')
   (dest/chosen[1]).write_bytes(saved[chosen[1]]);guard.apply(dest,plan)
   guard.apply(dest,{p:{'expected':m.sha(saved[p]+b'\n'),'replacement':saved[p]}for p in chosen})
   for p,h in files.items():self.assertEqual(m.sha((dest/p).read_bytes()),h,p)
 def test_02_catalog_and_function_equivalence(self):
  actual=json.loads(self.sql((ROOT/'docs/v1-017/catalog.sql').read_text()))
  self.assertEqual(m.normalize(actual),m.normalize(self.catalog))
  for row in self.functions:
   actual=self.sql('select pg_get_functiondef('+lit(row['identity'])+'::regprocedure)')
   self.assertEqual(self.sql('select md5(pg_get_functiondef('+lit(row['identity'])+'::regprocedure))'),__import__('hashlib').md5(row['definition'].encode()).hexdigest(),row['identity'])
   actual_acl=json.loads(self.sql('select to_jsonb(proacl) from pg_proc where oid='+lit(row['identity'])+'::regprocedure'))
   expected_acl=row['acl'] if row['acl'] is not None else ['=X/postgres']
   self.assertEqual(m.normalize({'acl':actual_acl}),m.normalize({'acl':expected_acl}),row['identity'])
  expected=json.load(open(ROOT/'docs/v1-017/installed-schema-indexes.json'))['indexes']
  got=json.loads(self.sql("select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',indexname,'definition',indexdef) order by schemaname,indexname) from pg_indexes where schemaname in ('public','authorization_private','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private','waitlist_private')"))
  self.assertEqual(got,expected)
 def test_03_new_financial_records_survive_guarded_function_rollback(self):
  owner=str(uuid.uuid4());business=str(uuid.uuid4());invoice=str(uuid.uuid4());payment=str(uuid.uuid4())
  self.sql('insert into auth.users values('+lit(owner)+');insert into public.businesses(id,owner_id,name,business_type,country,time_zone) values('+','.join(map(lit,[business,owner,'Synthetic release rollback','other','ZA','Africa/Johannesburg']))+')')
  self.sql('insert into public.business_memberships(business_id,environment,user_id,role,active) values('+','.join(map(lit,[business,'preview',owner,'owner',True]))+') on conflict do nothing')
  def invoke(name,args):
   prefix='set role authenticated;set request.jwt.claim.sub='+lit(owner)+';set request.jwt.claims=\'{"is_anonymous":false}\';set request.headers='+lit(json.dumps({'x-faraios-business':business,'x-faraios-environment':'preview'}))+';'
   args={'p_business':business,'p_environment':'preview'}|args
   return self.sql(prefix+'select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb'if isinstance(v,dict)else lit(v))for k,v in args.items())+')')
  target=next(x for x in self.functions if x['identity'].startswith('business_delegate_page('));before=target['definition'];identity=target['identity']
  candidate=before.replace('AS $function$','AS $function$\n-- synthetic candidate for guarded rollback only',1);self.sql(candidate)
  invoke('business_invoice_write',dict(p_id=invoice,p_version=0,p_action='save',p_document={'name':'Synthetic reconstruction','email':'release@example.test','phone':'','notes':'Fictional agreement','currency':'ZAR','items':[{'name':'Synthetic service','quantity':1,'price':25000}]},p_due=self.sql('select current_date+14')))
  invoke('business_invoice_write',dict(p_id=invoice,p_version=1,p_action='issue'))
  pay=dict(p_invoice=invoice,p_id=payment,p_amount=10000,p_paid_on=self.sql('select current_date'),p_reference='SYNTH-V1017');invoke('business_invoice_payment',pay);invoke('business_invoice_payment',pay)
  def snapshot():return {t:self.sql("select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text),'[]'::jsonb) from "+t+' t')for t in ['public.businesses','public.business_memberships','public.business_invoices','public.business_invoice_payments','public.business_invoice_events']}
  records=snapshot();current=self.sql('select pg_get_functiondef('+lit(identity)+'::regprocedure)')
  self.assertEqual(current.strip(),candidate.strip())
  # One transaction locks the function object via CREATE OR REPLACE after exact
  # definition guard, retaining ACL and every table/ledger/document row.
  guard="do $guard$ begin if md5(pg_get_functiondef("+lit(identity)+"::regprocedure))<>"+lit(__import__('hashlib').md5((current+'\n').encode()).hexdigest())+" then raise exception 'Function drift';end if;end $guard$;"
  # SQL transport strips a terminal newline; expected digest comes from PG itself.
  digest=self.sql('select md5(pg_get_functiondef('+lit(identity)+'::regprocedure))');guard=guard.replace(__import__('hashlib').md5((current+'\n').encode()).hexdigest(),digest)
  with self.assertRaisesRegex(RuntimeError,'Function drift'):
   self.sql('begin;'+guard.replace(digest,'0'*32)+before+';commit;')
  self.assertEqual(snapshot(),records);self.sql('begin;'+guard+before+';commit;');self.assertEqual(snapshot(),records)
  self.assertEqual(self.sql('select pg_get_functiondef('+lit(identity)+'::regprocedure)').strip(),before.strip())
  self.assertEqual(self.sql('select count(*) from public.business_invoice_payments where invoice_id='+lit(invoice)),'1')
  self.assertEqual(self.sql('select balance from public.business_invoice_list where id='+lit(invoice)),'15000')
  self.assertEqual(json.loads(self.sql('select document from public.business_invoices where id='+lit(invoice)))['notes'],'Fictional agreement')
if __name__=='__main__':
 suite=unittest.TestSuite(Release(n)for n in sorted(Release.__dict__)if n.startswith('test_'))
 result=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not result.wasSuccessful())
