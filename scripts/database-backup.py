#!/usr/bin/env python3
"""Read-only FaraiOS logical export; only encrypted output is retained. Never restores."""
import os,sys,json,subprocess,tempfile,pathlib,datetime,hashlib,tarfile,uuid,re
PROJECT='rxelmugnucfajrqmphhe'
SCHEMAS=['public','auth','extensions','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private','waitlist_private']
ROOT=pathlib.Path(__file__).resolve().parents[1]
class BackupError(Exception):pass
def run(args,env,stdin=None):
 try:p=subprocess.run(args,env=env,input=stdin,capture_output=True,timeout=900)
 except (OSError,subprocess.TimeoutExpired):raise BackupError('Backup command unavailable or timed out') from None
 if p.returncode:raise BackupError('Backup command failed; no usable backup was published')
 return p.stdout

def backup():
 test=os.environ.get('FARAIOS_BACKUP_TEST')=='1';host=os.environ.get('PGHOST','');user=os.environ.get('PGUSER','')
 if test and host not in ('127.0.0.1','localhost'):raise BackupError('Test mode is restricted to loopback')
 if not test and not ((host=='db.'+PROJECT+'.supabase.co' and user=='postgres') or (re.fullmatch(r'[a-z0-9.-]+\.pooler\.supabase\.com',host) and user=='postgres.'+PROJECT)):
  raise BackupError('Configure the exact FaraiOS direct or session-pooler connection')
 if not test and (os.environ.get('PGPORT','5432')!='5432' or os.environ.get('PGDATABASE')!='postgres' or not os.environ.get('PGPASSWORD')):raise BackupError('Use session port 5432, postgres database and private password')
 key=os.environ.get('BACKUP_PASSPHRASE','')
 if len(key)<32 or '\n' in key or '\r' in key:raise BackupError('Set a strong backup passphrase of at least 32 characters; retain an offline copy')
 output=pathlib.Path(os.environ.get('BACKUP_OUTPUT','')).resolve()
 if output==ROOT or ROOT in output.parents or not os.environ.get('BACKUP_OUTPUT'):raise BackupError('Encrypted backups must be outside the repository/web root')
 output.mkdir(parents=True,exist_ok=True);output.chmod(0o700)
 pg=os.environ.get('PG_BIN','');image=os.environ.get('BACKUP_PG_IMAGE','')
 if not pg and not image:raise BackupError('Configure PostgreSQL client directory or approved container')
 if image and image!='postgres:17.11':raise BackupError('Unapproved PostgreSQL image')
 env=dict(os.environ);env.pop('BACKUP_PASSPHRASE',None);env['PGOPTIONS']='-c default_transaction_read_only=on -c statement_timeout=600000 -c lock_timeout=5000'
 if not test:env['PGSSLMODE']='verify-full';env['PGSSLROOTCERT']='/etc/ssl/certs/ca-certificates.crt'
 gpg_env=dict(os.environ);gpg_env.pop('PGPASSWORD',None);gpg_env.pop('BACKUP_PASSPHRASE',None)
 os.umask(0o077)
 with tempfile.TemporaryDirectory(prefix='faraios-backup-') as td:
  tmp=pathlib.Path(td);tmp.chmod(0o700);(tmp/'gnupg').mkdir(mode=0o700);gpg_env['GNUPGHOME']=str(tmp/'gnupg')
  def cmd(binary,args):
   if image:
    return ['docker','run','--rm','--network=host','--read-only','--user',str(os.getuid())+':'+str(os.getgid()),'--mount','type=bind,src='+td+',dst='+td,'--mount','type=bind,src=/etc/ssl/certs/ca-certificates.crt,dst=/etc/ssl/certs/ca-certificates.crt,readonly',*sum((['--env',k] for k in ['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE','PGSSLROOTCERT','PGOPTIONS']),[]),image,binary,*args]
   return [str(pathlib.Path(pg)/binary),*args]
  query="select coalesce(json_agg(nspname order by nspname),'[]'::json) from pg_namespace where nspname in ('supabase_migrations','storage')"
  optional=json.loads(run(cmd('psql',['-XAtq','-v','ON_ERROR_STOP=1','-c',query]),env))
  schemas=SCHEMAS+optional
  args=['--format=custom','--no-owner','--strict-names','--lock-wait-timeout=5000','--file='+str(tmp/'database.dump')]
  for schema in schemas:args+=['--schema='+schema]
  run(cmd('pg_dump',args),env)
  # Catalog metadata only; custom-role password hashes are explicitly excluded.
  (tmp/'roles.sql').write_bytes(run(cmd('pg_dumpall',['--roles-only','--no-role-passwords']),env))
  listing=run(cmd('pg_restore',['--list',str(tmp/'database.dump')]),env)
  if not listing or not (tmp/'database.dump').stat().st_size:raise BackupError('Empty archive rejected')
  manifest=dict(format='faraios-logical-backup-v1',project=PROJECT,created_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),schemas=schemas,source_commit=os.environ.get('GITHUB_SHA','local'),database_sha256=hashlib.sha256((tmp/'database.dump').read_bytes()).hexdigest(),roles_sha256=hashlib.sha256((tmp/'roles.sql').read_bytes()).hexdigest(),limitations=['Storage object bytes and external runtime secrets are not included','Vault/Realtime/provider internals excluded; provider-supported Auth/role restore needs isolated verification','No custom-role passwords; secrets must be recovered separately'])
  (tmp/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
  bundle=tmp/'backup.tar'
  with tarfile.open(bundle,'w') as tar:
   for name in ['database.dump','roles.sql','manifest.json']:tar.add(tmp/name,arcname=name)
  encrypted=tmp/'backup.tar.gpg'
  base=['gpg','--batch','--yes','--no-symkey-cache','--pinentry-mode','loopback','--passphrase-fd','0']
  run(base+['--symmetric','--cipher-algo','AES256','--s2k-digest-algo','SHA512','--s2k-mode','3','--s2k-count','65011712','--output',str(encrypted),str(bundle)],gpg_env,(key+'\n').encode())
  # Decrypt independently and verify plaintext archive checksum before publishing ciphertext.
  verified=tmp/'verified.tar';run(base+['--output',str(verified),'--decrypt',str(encrypted)],gpg_env,(key+'\n').encode())
  if hashlib.sha256(verified.read_bytes()).digest()!=hashlib.sha256(bundle.read_bytes()).digest():raise BackupError('Encryption verification failed')
  name='faraios-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]+'.tar.gpg'
  target=output/name;os.replace(encrypted,target);target.chmod(0o600)
  (output/(name+'.sha256')).write_text(hashlib.sha256(target.read_bytes()).hexdigest()+'  '+name+'\n')
  print(json.dumps({'status':'encrypted_backup_verified','project':PROJECT,'file':name,'bytes':target.stat().st_size,'scope':'application/Auth schema-data, optional migration and Storage metadata; roles without passwords','restore_test_required':True}))
  return target
if __name__=='__main__':
 try:backup()
 except (BackupError,ValueError,json.JSONDecodeError,OSError):print('Backup failed. Check private connection, client, permissions and encryption settings; no plaintext is published.',file=sys.stderr);sys.exit(1)
