"""Synthetic logical backup/restore into a NEW disposable DB; never connects to hosted data."""
import importlib.util,json,subprocess,os,time,hashlib,unittest
from pathlib import Path
from journey import PGBIN,lit
spec=importlib.util.spec_from_file_location('full_journey',Path(__file__).with_name('full-journey.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Recovery(m.FullJourney):
 restore_db='postgres'
 @classmethod
 def sql(cls,q,role=False):
  p=subprocess.run([str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(cls.pgport),'-d',cls.restore_db,'-v','ON_ERROR_STOP=1','-c',('set role service_role;' if role else '')+q],env=cls.env,capture_output=True,text=True)
  if p.returncode:raise RuntimeError(p.stderr)
  return p.stdout.strip()
 def fingerprints(self):
  tables=json.loads(self.sql("select json_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'"))
  return {t:self.sql("select count(*)||':'||md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from "+t+' t') for t in tables}
 def security(self):
  return self.sql("""select jsonb_build_object(
   'tables',(select jsonb_agg(to_jsonb(t) order by name) from (select n.nspname||'.'||c.relname name,c.relrowsecurity,
    has_table_privilege('anon',c.oid,'select') anon_read,has_table_privilege('authenticated',c.oid,'select') owner_read,
    has_table_privilege('authenticated',c.oid,'insert') owner_insert,has_table_privilege('authenticated',c.oid,'update') owner_update,
    has_table_privilege('authenticated',c.oid,'delete') owner_delete from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','v') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%') t),
   'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p),
   'functions',(select jsonb_agg(to_jsonb(t) order by name,args) from (select n.nspname||'.'||p.proname name,pg_get_function_identity_arguments(p.oid) args,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') owner_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema','extensions')) t))""")

 def test_restore(self):
  self.seed_journey();a,b=self.ids;bid=self.bids[0];ids=self.journey_ids
  # Include private notes/history and issued-invoice correction/payment histories in snapshot.
  ctx=dict(p_business=bid,p_environment='preview');original=ids['invoice'];pid=ids['payment']
  self.rpc(a,'business_invoice_payment',**ctx,p_invoice=original,p_id=__import__('uuid').uuid4().hex,p_amount=35050,p_paid_on=__import__('datetime').date.today().isoformat(),p_reference='FICTIONAL journey receipt',p_reversal=pid,p_reason='Fictional recovery correction')
  self.rpc(a,'business_invoice_write',**ctx,p_id=original,p_version=4,p_action='void',p_reason='Fictional recovery correction')
  child=self.rpc(a,'business_invoice_write',**ctx,p_id=original,p_version=5,p_action='replace',p_reason='Fictional recovery correction')['id']
  self.rpc(a,'business_invoice_write',**ctx,p_id=child,p_version=1,p_action='issue')
  before=self.fingerprints();acl=self.security();archive=Path(self.tmp.name)/'synthetic.dump';started=time.monotonic()
  connection=['-h','127.0.0.1','-p',str(self.pgport)]
  subprocess.run([str(PGBIN/'pg_dump'),*connection,'-d','postgres','-Fc','--no-owner','-f',str(archive)],env=self.env,check=True,capture_output=True)
  archive.chmod(0o600);digest=hashlib.sha256(archive.read_bytes()).hexdigest()
  # Fresh target; no --clean, no source overwrite and no existing DB is dropped.
  subprocess.run([str(PGBIN/'createdb'),*connection,'faraios_recovery_rehearsal'],env=self.env,check=True,capture_output=True)
  subprocess.run([str(PGBIN/'pg_restore'),*connection,'-d','faraios_recovery_rehearsal','--exit-on-error','--no-owner',str(archive)],env=self.env,check=True,capture_output=True)
  type(self).restore_db='faraios_recovery_rehearsal'
  self.assertEqual(self.fingerprints(),before);self.assertEqual(self.security(),acl)
  for table in ['business_enquiries','business_quotes','business_bookings','business_invoices','business_invoice_payments']:
   self.assertEqual(self.scope(b,'select count(*) from public.'+table),'0')
  self.assertEqual(self.scope(a,'select replaces_id from public.business_invoices where id='+lit(child)),original)
  self.assertEqual(self.scope(a,'select count(*) from public.business_invoice_payments'),'2')
  self.assertEqual(self.sql("select enabled from request_private.ingress where environment='live'"),'f')
  # Fresh issuance continues numbering after restored counters and retains the original number.
  import uuid,datetime
  iid=str(uuid.uuid4());doc=json.loads(self.scope(a,'select document from public.business_invoices where id='+lit(child)))
  self.rpc(a,'business_invoice_write',**ctx,p_id=iid,p_version=0,p_action='save',p_document=doc,p_due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat())
  self.rpc(a,'business_invoice_write',**ctx,p_id=iid,p_version=1,p_action='issue')
  self.assertEqual(self.scope(a,'select number from public.business_invoices where id='+lit(iid)),'INV-000003')
  self.assertIn('Fictional Journey Customer',self.get('/preview/account/invoices.php?id='+child)[1])
  report=dict(scope='synthetic full application database; simulated Auth identities; same disposable cluster roles',hosted_data_used=False,tables=len(before),table_fingerprints_equal=True,rls_and_acl_equal=True,tenant_denial=True,correction_history=True,numbering_continuity=True,live_intake_disabled=True,restore_seconds=round(time.monotonic()-started,3),dump_sha256=digest,pg_version=self.sql('show server_version'),limitations=['Not a recovery of a hosted provider backup','Auth passwords/session recovery and external hosting secrets not covered','Same-cluster global roles pre-exist; production role/bootstrap recovery needs operator evidence'])
  if output:=os.environ.get('RECOVERY_REPORT'):Path(output).write_text(json.dumps(report,indent=2)+'\n')
  print('RECOVERY',json.dumps(report))
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Recovery('test_restore')]));raise SystemExit(not r.wasSuccessful())
