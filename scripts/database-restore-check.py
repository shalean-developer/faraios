#!/usr/bin/env python3
"""Decrypt/restore a retained backup into a network-isolated disposable Docker DB only.
No production connection variables or database password are accepted or forwarded.
"""
import os,sys,json,subprocess,tempfile,pathlib,hashlib,tarfile,re,time,uuid
from database_recovery import fingerprints,ident,literal
IMAGE='postgres:17.11'
class RestoreError(Exception):pass
def run(args,env,stdin=None,stage='restore'):
 try:p=subprocess.run(args,env=env,input=stdin,capture_output=True,timeout=600)
 except (OSError,subprocess.TimeoutExpired):raise RestoreError(stage+' unavailable or timed out') from None
 if p.returncode:
  detail=p.stderr.decode(errors='replace');reason='private output suppressed'
  for pattern,label in [('must have admin option','role membership grantor lacks admin option'),('must be superuser','superuser bootstrap required'),('permission denied to grant','role grant permission denied')]:
   if pattern in detail:reason=label;break
  for code,label in [('42704','missing role or object'),('42501','insufficient permission'),('42710','duplicate object'),('42601','SQL syntax'),('42P01','missing table'),('3F000','missing schema'),('58P01','missing extension file')]:
   if code in detail:reason=label;break
  raise RestoreError(stage+' failed: '+reason)
 return p.stdout

def check(directory):
 started=time.monotonic();source=pathlib.Path(directory).resolve();files=list(source.glob('*.tar.gpg'))
 if len(files)!=1:raise RestoreError('Exactly one ciphertext archive is required')
 encrypted=files[0];checksum=encrypted.with_name(encrypted.name+'.sha256')
 if checksum.read_text().strip()!=hashlib.sha256(encrypted.read_bytes()).hexdigest()+'  '+encrypted.name:raise RestoreError('Ciphertext checksum mismatch')
 key=os.environ.get('BACKUP_PASSPHRASE','')
 if len(key)<32:raise RestoreError('Private decryption secret is missing')
 # Drop credentials, connection settings and runtime service secrets from every child.
 env={k:v for k,v in os.environ.items() if k in ['PATH','HOME','LANG','LC_ALL','DOCKER_HOST','XDG_RUNTIME_DIR']}
 os.umask(0o077)
 with tempfile.TemporaryDirectory(prefix='faraios-restore-') as td:
  tmp=pathlib.Path(td);tmp.chmod(0o700);(tmp/'gnupg').mkdir(mode=0o700)
  bundle=tmp/'backup.tar'
  run(['gpg','--batch','--yes','--no-symkey-cache','--pinentry-mode','loopback','--passphrase-fd','0','--output',str(bundle),'--decrypt',str(encrypted)],env|{'GNUPGHOME':str(tmp/'gnupg')},(key+'\n').encode(),'decrypt')
  with tarfile.open(bundle) as tar:
   if set(tar.getnames())!={'database.dump','roles.sql','manifest.json'} or len(tar.getmembers())!=3:raise RestoreError('Unexpected archive members')
   for member in tar:
    if not member.isfile() or member.size>1024**3:raise RestoreError('Unsafe archive member')
    (tmp/member.name).write_bytes(tar.extractfile(member).read())
  manifest=json.loads((tmp/'manifest.json').read_text())
  if manifest.get('project')!='rxelmugnucfajrqmphhe' or manifest.get('format') not in ('faraios-logical-backup-v1','faraios-logical-backup-v2'):raise RestoreError('Wrong project or archive format')
  for file,field in [('database.dump','database_sha256'),('roles.sql','roles_sha256')]:
   if hashlib.sha256((tmp/file).read_bytes()).hexdigest()!=manifest[field]:raise RestoreError('Decrypted bundle checksum mismatch')
  roles=(tmp/'roles.sql').read_text()
  if re.search(r'\bPASSWORD\b',roles,re.I):raise RestoreError('Role passwords must not be present')
  roles=re.sub(r'^CREATE ROLE postgres;\s*$', '',roles, flags=re.M)
  roles=re.sub(r'^ALTER ROLE postgres WITH .*;\s*$', '',roles, flags=re.M)
  # Standalone cluster starts with built-in role memberships granted by postgres.
  # Recreate effective memberships using that bootstrap grantor, not a hosted grantor.
  roles=re.sub(r' GRANTED BY [a-z_][a-z_0-9]*;', ';',roles)
  name='faraios-restore-'+uuid.uuid4().hex
  run(['docker','pull',IMAGE],env,stage='approved image download')
  try:
   # No ports, no network, no writable host mount, no production credentials.
   run(['docker','run','--detach','--rm','--name',name,'--network=none','--memory=1g','--cpus=2','--mount','type=bind,src='+td+',dst=/backup,readonly','--tmpfs','/var/lib/postgresql/data:rw,size=768m','--env','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE],env,stage='isolated target startup')
   def cmd(tool,args):return ['docker','exec','-i',name,tool,*args]
   def sql(q,stage='isolated query'):return run(cmd('psql',['-U','postgres','-d','postgres','-XAtq','-v','ON_ERROR_STOP=1','-v','VERBOSITY=terse']),env,q.encode(),stage).decode().strip()
   ready=False
   for _ in range(60):
    p=subprocess.run(cmd('pg_isready',['-U','postgres']),env=env,capture_output=True)
    if p.returncode==0:ready=True;break
    time.sleep(1)
   if not ready:raise RestoreError('Isolated target never became ready')
   sql(roles,'isolated role bootstrap');sql('DROP SCHEMA public;','isolated empty-schema preparation')
   run(cmd('pg_restore',['-U','postgres','-d','postgres','--exit-on-error','/backup/database.dump']),env,stage='archive restore')
   # Schema initial privileges are not all emitted by pg_dump. Reapply recorded
   # effective source schema grants, without inventing provider role permissions.
   for grant in manifest.get('schema_grants',[{'schema':'public','grantee':'PUBLIC','privilege':'USAGE','grantable':False}]):
    if grant['privilege'] not in ('USAGE','CREATE'):raise RestoreError('Invalid schema privilege')
    role='PUBLIC' if grant['grantee']=='PUBLIC' else ident(grant['grantee'])
    sql('GRANT '+grant['privilege']+' ON SCHEMA '+ident(grant['schema'])+' TO '+role+(' WITH GRANT OPTION' if grant['grantable'] else '')+';','isolated schema grants')
   actual=fingerprints(sql,manifest['schemas']);expected=manifest.get('table_fingerprints')
   if expected is not None and actual!=expected:raise RestoreError('Restored table fingerprints do not match snapshot')
   if sql("select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in ('public','booking_private','invoice_private','quote_private') and not c.convalidated")!='0':raise RestoreError('Unvalidated business constraints')
   owners=json.loads(sql("select coalesce(json_agg(owner_id),'[]'::json) from (select distinct owner_id from public.businesses order by owner_id limit 2) b"))
   tables=['business_quotes','business_bookings','business_invoices','business_invoice_payments','business_enquiries']
   for owner in [*owners,str(uuid.uuid4())]:
    scope="set role authenticated;set request.jwt.claim.sub="+literal(owner)+";set request.jwt.claims="+literal(json.dumps({'sub':owner,'is_anonymous':False}))+";"
    for table in tables:
     expected_count=sql('select count(*) from public.'+ident(table)+' t join public.businesses b on b.id=t.business_id where b.owner_id='+literal(owner)+'::uuid')
     observed=sql(scope+'select count(*) from public.'+ident(table))
     if observed!=expected_count:raise RestoreError('Effective owner isolation mismatch')
   if sql("select has_table_privilege('authenticated','public.business_invoice_payments','INSERT,UPDATE,DELETE')")!='f':raise RestoreError('Restored payment ledger permits direct writes')
   auth=None
   if os.environ.get('RESTORE_AUTH_REHEARSAL')=='true':
    from auth_recovery import rehearse
    auth=rehearse(name,env,sql,check_business=True)
   report=dict(status='restore_verified',project=manifest['project'],backup_created_utc=manifest['created_utc'],source_commit=manifest['source_commit'],table_count=len(actual),snapshot_fingerprints_match=expected is not None,owner_scopes_checked=len(owners)+1,network='none during snapshot verification; internal-only during optional Auth test' if auth else 'none',published_ports=0,production_credentials_forwarded=False,auth_rehearsal=auth,elapsed_seconds=round(time.monotonic()-started,2),limitations=['Standalone PostgreSQL rehearsal; hosted Supabase configuration and Storage bytes not exercised','No recovery-time service guarantee established'])
  finally:
   # Removes only the generated disposable container; production is never a target.
   subprocess.run(['docker','rm','--force',name],env=env,capture_output=True,timeout=30)
  print(json.dumps(report));return report
if __name__=='__main__':
 try:
  if len(sys.argv)!=2:raise RestoreError('Provide one local encrypted-artifact directory')
  check(sys.argv[1])
 except RestoreError as error:
  print(str(error),file=sys.stderr);sys.exit(1)
 except (OSError,ValueError,KeyError,tarfile.TarError):
  print('Restore verification failed; target is disposable and private output is suppressed.',file=sys.stderr);sys.exit(1)
