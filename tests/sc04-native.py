"""SC04 native candidate, synthetic identities, loopback disposable PostgreSQL only."""
import json,uuid,unittest,tempfile,importlib.util,subprocess,hashlib
from journey import PGBIN
from concurrent.futures import ThreadPoolExecutor
from foundation import Foundation
from journey import ROOT,lit
class SC04(Foundation):
 @classmethod
 def setUpClass(cls):
  spec=importlib.util.spec_from_file_location('sc04stage',ROOT/'docs/sc04/stage.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  cls.staged=tempfile.TemporaryDirectory(prefix='sc04-app-');cls.webroot=m.stage(cls.staged.name+'/candidate');cls.sc04=True;cls.sc04_errors=[]
  super().setUpClass()
  cls.sql((ROOT/'release/activate-foundation.sql').read_text())
  cls.sql((ROOT/'docs/sc03/foundation.sql').read_text())
  # Seed a separate legacy business BEFORE backfill, including issued originals,
  # ledger corrections and published/private content. Existing owner tests keep
  # their own numbering and fixture assertions unchanged.
  u=str(uuid.uuid4());b=str(uuid.uuid4());cls.preserved_owner=u;cls.preserved_business=b
  cls.sql('insert into auth.users values('+lit(u)+');insert into public.businesses(id,owner_id,name,business_type,country,time_zone) values('+','.join(map(lit,[b,u,'Synthetic preserved business','other','ZA','UTC']))+')')
  def rpc(name,**kw):
   args=dict(p_business=b,p_environment='preview')|kw
   return cls.context(u,b,q='select public.'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,dict) else lit(v)) for k,v in args.items())+')')
  fixture=json.loads((ROOT/'tests/fixtures/sc02/baseline.json').read_text());doc=fixture['legacy_documents'][0]['document'];iid=str(uuid.uuid4());pid=str(uuid.uuid4())
  rpc('business_profile_save',p_slug='synthetic-preserved',p_draft=fixture['profile_cases'][0]['document'],p_version=0)
  rpc('business_profile_publish',p_version=1)
  rpc('business_profile_save',p_slug='synthetic-preserved',p_draft=fixture['profile_cases'][0]['document']|dict(description='Synthetic private revision'),p_version=1)
  rpc('business_invoice_write',p_id=iid,p_version=0,p_action='save',p_document=doc,p_due=cls.sql('select current_date+14'))
  rpc('business_invoice_write',p_id=iid,p_version=1,p_action='issue')
  pay=dict(p_invoice=iid,p_id=pid,p_amount=10000,p_paid_on=cls.sql('select current_date'),p_reference='Synthetic preserved receipt')
  rpc('business_invoice_payment',**pay)
  rpc('business_invoice_payment',**(pay|dict(p_id=str(uuid.uuid4()),p_reversal=pid,p_reason='Synthetic preserved correction')))
  rpc('business_invoice_write',p_id=iid,p_version=4,p_action='void',p_reason='Synthetic preserved correction')
  child=json.loads(rpc('business_invoice_write',p_id=iid,p_version=5,p_action='replace',p_reason='Synthetic preserved correction'))['id']
  rpc('business_invoice_write',p_id=child,p_version=1,p_action='issue')
  import sys
  sys.path.insert(0,str(ROOT/'scripts'))
  from database_recovery import fingerprints
  cls.original_schemas=json.loads(cls.sql("select jsonb_agg(nspname) from pg_namespace where nspname not in ('pg_catalog','information_schema') and nspname not like 'pg_%'"))
  cls.original_rows=fingerprints(cls.sql,cls.original_schemas)
  cls.before=cls.sql("select jsonb_agg(to_jsonb(b) order by id) from public.businesses b")
  cls.sql((ROOT/'docs/sc04/authorization.sql').read_text())
  cls.sql((ROOT/'docs/sc04/adapters.sql').read_text())
  cls.after_backfill=fingerprints(cls.sql,cls.original_schemas)
  cls.original_rows_preserved=all(cls.after_backfill[k]==v for k,v in cls.original_rows.items())
 @classmethod
 def sql(cls,q,role=False):
  # Only the old rollback-only SQL fixture needs a new explicit selector and
  # an additional expected insufficient_privilege exception. Original file unchanged.
  if 'faraios.foundation_bid' in q:
   q="set request.headers="+lit(json.dumps({'x-faraios-business':cls.bids[0],'x-faraios-environment':'preview'}))+';'+q.replace('when raise_exception then','when raise_exception or insufficient_privilege then')
  return super().sql(q,role)
 @classmethod
 def tearDownClass(cls):
  super().tearDownClass();cls.staged.cleanup()
 @classmethod
 def context(cls,u,b,e='preview',q='select 1'):
  h=json.dumps({'x-faraios-business':b,'x-faraios-environment':e})
  return cls.sql('set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';set request.headers="+lit(h)+';'+q)
 @classmethod
 def scope(cls,u,q):return cls.context(u,cls.bids[cls.ids.index(u)],q=q)
 def invoke(self,u,name,b=None,e='preview',**kw):
  b=b or self.bids[0];args=dict(p_business=b,p_environment=e)|kw
  return self.context(u,b,e,'select public.'+name+'('+','.join(k+'=>'+lit(v) for k,v in args.items())+')')
 def newuser(self):
  u=str(uuid.uuid4());self.sql('insert into auth.users values('+lit(u)+')');return u
 def invite(self,role='manager'):
  u=self.newuser();r=json.loads(self.invoke(self.ids[0],'business_invite_create',p_recipient=u,p_role=role));return u,r
 @classmethod
 def post(cls,path,**fields):
  html=cls.get(path)[1]
  if 'name="csrf"' not in html:raise AssertionError('Missing form: '+str(cls.sc04_errors[-3:])+html[-700:])
  return super().post(path,**fields)
 def test_new_owner(self):
  u=self.newuser()
  q="select public.business_context_create('Synthetic new owner','other','ZA','Africa/Johannesburg')"
  result=json.loads(self.context(u,self.bids[0],q=q));b=result['business_id']
  self.assertEqual(self.context(u,b,q='select count(*) from public.businesses'),'1')
  self.assertEqual(self.sql('select count(*) from public.business_memberships where business_id='+lit(b)), '2')
  with self.assertRaises(RuntimeError):self.context(u,b,q=q)
  with self.assertRaises(RuntimeError):self.context(u,b,q="insert into public.businesses(owner_id,name,business_type) values("+lit(u)+",'Bypass','other')")
 def test_owner_onboarding_http(self):
  type(self).sc04_login_user=self.newuser()
  self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
  self.assertIn('Tell us about',self.get('/account/index.php?page=business')[1])
  page=self.post('/account/index.php?page=business',business_name='Synthetic HTTP business',business_type='other',country='ZA',time_zone='Africa/Johannesburg')
  self.assertIn('Synthetic HTTP business',page)
  self.assertIn('Synthetic HTTP business',self.get('/account/index.php?page=welcome')[1])
  type(self).sc04_login_user=None
 def test_role_matrix(self):
  functions=json.loads(self.sql("select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'args',p.proargnames[1:p.pronargs],'types',array(select format_type(t,null) from unnest(p.proargtypes) t))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private') and p.proargnames @> array['p_business','p_environment'] and p.proname not like 'business_invite_%' and p.proname<>'business_membership_revoke'"))
  self.assertGreater(len(functions),30)
  cases=[]
  for role in ['manager','receptionist','worker']:
   u,r=self.invite(role);self.invoke(u,'business_invite_accept',p_token=r['token']);cases.append((role,u,self.bids[0],'preview'))
  cases += [('outsider',self.ids[1],self.bids[0],'preview'),('wrong-environment',self.ids[0],self.bids[0],'live'),('wrong-business',self.ids[0],self.bids[1],'preview')]
  for role,u,b,e in cases:
   for f in functions:
    args=[lit(self.bids[0])+'::uuid' if a=='p_business' else "'preview'::text" if a=='p_environment' else 'null::'+t for a,t in zip(f['args'],f['types'])]
    with self.assertRaisesRegex(RuntimeError,'Business context denied|permission denied for (function|schema)',msg=role+':'+f['name']):self.context(u,b,e,'select '+f['name']+'('+','.join(args)+')')
  type(self).matrix_count=len(cases)*len(functions)
 def test_limits_and_atomicity(self):
  u=self.newuser();b=json.loads(self.context(u,self.bids[0],q="select public.business_context_create('Synthetic bounds','other','ZA','UTC')"))['business_id']
  for _ in range(20):self.invoke(u,'business_invite_create',b=b,p_recipient=self.newuser(),p_role='worker')
  with self.assertRaisesRegex(RuntimeError,'Invitation limit'):self.invoke(u,'business_invite_create',b=b,p_recipient=self.newuser(),p_role='worker')
  recipient,r=self.invite()
  self.assertEqual(self.sql("select encode(token_hash,'hex')<>"+lit(r['token'])+" from authorization_private.invitations where id="+lit(r['id'])),'t')
  self.sql("create function authorization_private.synthetic_failure() returns trigger language plpgsql as $$begin raise exception 'Synthetic audit failure';end$$;create trigger synthetic_failure before insert on authorization_private.events for each row execute function authorization_private.synthetic_failure()")
  with self.assertRaisesRegex(RuntimeError,'Synthetic audit failure'):self.invoke(recipient,'business_invite_accept',p_token=r['token'])
  self.assertEqual(self.sql('select count(*) from public.business_memberships where user_id='+lit(recipient)),'0')
  self.sql('drop trigger synthetic_failure on authorization_private.events;drop function authorization_private.synthetic_failure()')
  self.invoke(recipient,'business_invite_accept',p_token=r['token'])
  q="set role authenticated;set request.jwt.claim.sub="+lit(self.ids[0])+";set request.jwt.claims='{\"is_anonymous\":true}';select public.business_context_create('Anonymous attempt','other','ZA','UTC')"
  with self.assertRaises(RuntimeError):self.sql(q)
 def test_environment_rows(self):
  b=self.bids[0];a=self.ids[0]
  for e in ['preview','live']:
   self.sql("insert into public.business_enquiries(business_id,environment,request_id,page_slug,customer_name,email,phone,requirements) values("+','.join(map(lit,[b,e,str(uuid.uuid4()),'synthetic','Synthetic scope','fixture@example.test','','Synthetic requirement']))+")")
  self.assertEqual(self.context(a,b,q='select count(distinct environment) from public.business_enquiries'),'1')
  self.assertEqual(self.context(a,b,'live',q="select count(*) from public.business_enquiries where environment='preview'"),'0')
  self.assertEqual(self.context(a,b,'preview',q="update public.business_enquiries set status='Closed' where environment='live' returning id"),'')
  self.assertEqual(self.context(self.ids[1],b,q='select count(*) from public.business_enquiries'),'0')
 def test_recovery(self):
  import sys,os,tarfile
  from pathlib import Path
  sys.path.insert(0,str(ROOT/'scripts'))
  from database_recovery import fingerprints
  schemas=json.loads(self.sql("select jsonb_agg(nspname) from pg_namespace where nspname not in ('pg_catalog','information_schema') and nspname not like 'pg_toast%' and nspname not like 'pg_temp%'"))
  before=fingerprints(self.sql,schemas)
  # Use the actual candidate encrypted exporter, whose new schema enumeration is tested here.
  out=Path(self.tmp.name)/'sc04-encrypted';key='SYNTHETIC-ONLY-'+uuid.uuid4().hex
  env=dict(self.env,FARAIOS_BACKUP_TEST='1',PGHOST='127.0.0.1',PGPORT=str(self.pgport),PGUSER=os.environ.get('USER','agent'),PGDATABASE='postgres',PG_BIN=str(PGBIN),BACKUP_PASSPHRASE=key,BACKUP_OUTPUT=str(out))
  p=subprocess.run([sys.executable,str(self.webroot/'scripts/database-backup.py')],env=env,capture_output=True,text=True);self.assertEqual(p.returncode,0,p.stderr)
  result=json.loads(p.stdout);archive=out/result['file'];plain=Path(self.tmp.name)/'sc04.tar'
  gpg=Path(self.tmp.name)/'sc04-gpg';gpg.mkdir(mode=0o700)
  p=subprocess.run(['gpg','--batch','--yes','--pinentry-mode','loopback','--passphrase-fd','0','-o',str(plain),'-d',str(archive)],env=dict(self.env,GNUPGHOME=str(gpg)),input=(key+'\n').encode(),capture_output=True);self.assertEqual(p.returncode,0)
  with tarfile.open(plain) as tar:
   manifest=json.loads(tar.extractfile('manifest.json').read());dump=Path(self.tmp.name)/'sc04.dump';dump.write_bytes(tar.extractfile('database.dump').read())
  self.assertIn('authorization_private',manifest['schemas']);self.assertEqual(before,manifest['table_fingerprints'])
  conn=['-h','127.0.0.1','-p',str(self.pgport)]
  self.sql('create database sc04_restored')
  subprocess.run([str(PGBIN/'psql'),*conn,'-d','sc04_restored','-c','drop schema public'],env=self.env,check=True,capture_output=True)
  p=subprocess.run([str(PGBIN/'pg_restore'),*conn,'-d','sc04_restored','--no-owner','--exit-on-error',str(dump)],env=self.env,capture_output=True,text=True);self.assertEqual(p.returncode,0,p.stderr)
  def restored(q):
   p=subprocess.run([str(PGBIN/'psql'),*conn,'-d','sc04_restored','-XAtq','-v','ON_ERROR_STOP=1','-c',q],env=self.env,capture_output=True,text=True)
   if p.returncode:raise RuntimeError(p.stderr)
   return p.stdout.strip()
  from database_recovery import ident
  # Same recorded-schema-grant restoration as the existing recovery checker.
  for grant in manifest['schema_grants']:
   self.assertIn(grant['privilege'],['USAGE','CREATE'])
   grantee='PUBLIC' if grant['grantee']=='PUBLIC' else ident(grant['grantee'])
   restored('GRANT '+grant['privilege']+' ON SCHEMA '+ident(grant['schema'])+' TO '+grantee+(' WITH GRANT OPTION' if grant['grantable'] else ''))
  self.assertEqual(before,fingerprints(restored,schemas))
  security="select jsonb_build_object('policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p),'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.prosrc,p.proconfig,has_function_privilege('anon',p.oid,'execute'),has_function_privilege('authenticated',p.oid,'execute'),has_function_privilege('service_role',p.oid,'execute')) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema','extensions')),'tables',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relrowsecurity,c.reloptions,(select jsonb_agg(jsonb_build_array(r,has_table_privilege(r,c.oid,'select'),has_table_privilege(r,c.oid,'insert'),has_table_privilege(r,c.oid,'update'),has_table_privilege(r,c.oid,'delete')) order by r) from unnest(array['anon','authenticated','service_role']) r)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','v') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_%'))"
  self.assertEqual(self.sql(security),restored(security))
  dependencies="select jsonb_build_object('triggers',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal),'schemas',(select jsonb_agg(jsonb_build_array(n.nspname,r,has_schema_privilege(r,n.oid,'usage'),has_schema_privilege(r,n.oid,'create')) order by n.nspname,r) from pg_namespace n cross join unnest(array['anon','authenticated','service_role']) r where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_%'),'audit_sequence',(select last_value from authorization_private.events_id_seq))"
  self.assertEqual(self.sql(dependencies),restored(dependencies))

  for table in ['public.business_memberships','authorization_private.invitations','authorization_private.events']:
   with self.assertRaises(RuntimeError):restored('set role authenticated;select * from '+table)
  spec=importlib.util.spec_from_file_location('sc04recovery',self.webroot/'scripts/sc04_recovery.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  checked_scopes=m.verify_owner_scopes(restored);self.assertGreater(checked_scopes,0)
  # Operator deactivation restores captured original RPC definitions and ACLs,
  # retaining every old/new row. No destructive down-migration is used.
  restored((ROOT/'docs/sc04/deactivate.sql').read_text())
  self.assertEqual(before,fingerprints(restored,schemas))
  definitions=json.loads(restored('select jsonb_agg(jsonb_build_array(identity,definition)) from authorization_private.legacy_functions'))
  for identity,definition in definitions:self.assertEqual(restored('select pg_get_functiondef('+lit(identity)+'::regprocedure)'),definition.strip())
  self.assertEqual(restored("select count(*) from pg_policies where policyname like 'sc04_%'"),'0')
  report=dict(recovery_owner_outsider_scopes=checked_scopes,denial_matrix_cases=self.matrix_count,legacy_issued_documents_and_ledger_seeded=True,publication_and_private_revision_seeded=True,original_rows_preserved=self.original_rows_preserved,rollback_preserves_every_row=True,guarded_functions=len(definitions),synthetic_only=True,hosted_changes=False,delegation_enabled=False,encrypted_export=True,triggers_schema_grants_audit_sequence_equal=True,restored_table_count=len(before),all_row_fingerprints_equal=True,policies_function_bodies_effective_acls_equal=True,postgres=self.sql('show server_version'),archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest())
  target=ROOT/'test-results/release';target.mkdir(parents=True,exist_ok=True);(target/'sc04-native.json').write_text(json.dumps(report,indent=2)+'\n')
 def test_backfill_context(self):
  self.assertTrue(self.original_rows_preserved)
  self.assertEqual(self.before,self.sql('select jsonb_agg(to_jsonb(b) order by id) from public.businesses b'))
  before=self.sql('select jsonb_agg(to_jsonb(m) order by business_id,environment,user_id) from public.business_memberships m')
  self.sql('select authorization_private.owner_backfill();select authorization_private.owner_backfill()')
  self.assertEqual(before,self.sql('select jsonb_agg(to_jsonb(m) order by business_id,environment,user_id) from public.business_memberships m'))
  with self.assertRaisesRegex(RuntimeError,'Conflicting owner membership'):
   self.sql("begin;alter table public.business_memberships disable trigger protect_owner;update public.business_memberships set role='worker' where role='owner';select authorization_private.owner_backfill();")
  self.assertEqual(before,self.sql('select jsonb_agg(to_jsonb(m) order by business_id,environment,user_id) from public.business_memberships m'))
  for u,b in zip(self.ids,self.bids):
   self.assertEqual(self.context(u,b,q='select count(*) from public.businesses'),'1')
   self.assertEqual(self.context(u,self.bids[1-self.ids.index(u)],q='select count(*) from public.businesses'),'0')
   self.assertEqual(self.context(u,b,'invalid',q='select count(*) from public.businesses'),'0')
   self.assertEqual(self.sql('set role authenticated;set request.jwt.claim.sub='+lit(u)+";set request.jwt.claims='{\"is_anonymous\":false}';select count(*) from public.businesses"),'0')
  with self.assertRaises(RuntimeError):self.invoke(self.ids[1],'business_invite_create',p_recipient=self.newuser(),p_role='manager')
 def test_invitations(self):
  for role in ['manager','receptionist','worker']:
   u,r=self.invite(role)
   with self.assertRaises(RuntimeError):self.invoke(self.ids[1],'business_invite_accept',p_token=r['token'])
   with self.assertRaises(RuntimeError):self.invoke(u,'business_invite_accept',e='live',p_token=r['token'])
   def accept(_):
    try:self.invoke(u,'business_invite_accept',p_token=r['token']);return True
    except RuntimeError:return False
   with ThreadPoolExecutor(max_workers=4) as ex:self.assertEqual(sum(ex.map(accept,range(4))),1)
   self.assertEqual(self.context(u,self.bids[0],q='select count(*) from public.businesses'),'0')
   self.assertEqual(self.context(u,self.bids[0],q='select count(*) from public.business_invoice_list'),'0')
   with self.assertRaises(RuntimeError):self.invoke(u,'business_invite_create',p_recipient=self.newuser(),p_role='worker')
   self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
  u,r=self.invite();self.invoke(self.ids[0],'business_invite_revoke',p_id=r['id'])
  with self.assertRaises(RuntimeError):self.invoke(u,'business_invite_accept',p_token=r['token'])
  u,r=self.invite();self.sql('update authorization_private.invitations set expires_at=now()-interval \'1 second\' where id='+lit(r['id']))
  with self.assertRaises(RuntimeError):self.invoke(u,'business_invite_accept',p_token=r['token'])
  for role,hours in [('owner',24),('manager',0),('worker',169)]:
   with self.assertRaises(RuntimeError):self.invoke(self.ids[0],'business_invite_create',p_recipient=u,p_role=role,p_hours=hours)
 def test_owner_and_bypass(self):
  a=self.ids[0];b=self.bids[0]
  with self.assertRaises(RuntimeError):self.invoke(a,'business_membership_revoke',p_user=a)
  for q in ['delete from public.business_memberships',"update public.business_memberships set active=false","update public.business_memberships set role='worker'"]:
   with self.assertRaises(RuntimeError):self.sql(q+" where role='owner'")
  for role in ['anon','authenticated','service_role']:
   for table in ['public.business_memberships','authorization_private.invitations','authorization_private.events']:
    for q in ['select * from '+table,'delete from '+table]:
     with self.assertRaises(RuntimeError):self.sql('set role '+role+';'+q)
  # A definer finance endpoint must reject mismatched header context even for its true owner.
  q='select public.business_invoice_write('+','.join(map(lit,[b,'preview',str(uuid.uuid4()),0,'save']))+')'
  with self.assertRaises(RuntimeError):self.context(a,b,'live',q)
  with self.assertRaises(RuntimeError):self.context(a,self.bids[1],q=q)
  # Every extant business/environment PL/pgSQL entry point is guarded.
  self.assertEqual(self.sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private') and p.proargnames @> array['p_business','p_environment'] and p.proname not like 'business_invite_%' and p.proname<>'business_membership_revoke' and position('authorization_private.require_owner' in p.prosrc)=0"),'0')
if __name__=='__main__':
 names=['test_backfill_context','test_invitations','test_owner_and_bypass','test_new_owner','test_owner_onboarding_http','test_role_matrix','test_environment_rows','test_limits_and_atomicity','test_foundation','test_recovery']
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(SC04(n) for n in names));raise SystemExit(not r.wasSuccessful())
