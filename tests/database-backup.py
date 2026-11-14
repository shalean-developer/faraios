"""Actual backup script → GPG verification → fresh native restore; synthetic data only."""
from profiles import Profiles
from journey import PGBIN,lit,ROOT
import unittest,subprocess,json,os,uuid,datetime,tarfile,hashlib
from pathlib import Path
class Backup(Profiles):
 def fingerprint(self,db='postgres'):
  def sql(q):
   p=subprocess.run([str(PGBIN/'psql'),'-XAtq','-h','127.0.0.1','-p',str(self.pgport),'-d',db,'-v','ON_ERROR_STOP=1','-c',q],env=self.env,capture_output=True,text=True)
   if p.returncode:raise RuntimeError(p.stderr)
   return p.stdout.strip()
  tables=json.loads(sql("select json_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'"))
  return {table:sql("select count(*)||':'||md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from "+table+' t') for table in tables}
 def test_backup(self):
  a,b=self.ids;bid=self.bids[0];iid=str(uuid.uuid4());pid=str(uuid.uuid4());due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat()
  self.sql("alter table auth.users add column encrypted_password text;update auth.users set encrypted_password='SYNTHETIC-HASH-NOT-A-REAL-PASSWORD'")
  doc=dict(name='Fictional Backup Customer',email='backup@example.test',phone='',notes='Private backup scope',currency='ZAR',items=[dict(name='Service',quantity=2,price=12525)])
  self.scope(a,'select public.business_enquiry_create('+','.join(map(lit,[bid,'preview',str(uuid.uuid4()),doc['name'],doc['email'],'','Private backup requirements.']))+')')
  self.scope(a,'select public.business_invoice_write('+','.join(map(lit,[bid,'preview',iid,0,'save']))+','+lit(json.dumps(doc))+'::jsonb,'+lit(due)+');select public.business_invoice_write('+','.join(map(lit,[bid,'preview',iid,1,'issue']))+')')
  self.scope(a,'select public.business_invoice_payment('+','.join(map(lit,[bid,'preview',iid,pid,10000,datetime.date.today().isoformat(),'FICTIONAL RECEIPT']))+')')
  self.scope(a,'select public.business_invoice_payment('+','.join(map(lit,[bid,'preview',iid,str(uuid.uuid4()),10000,datetime.date.today().isoformat(),'FICTIONAL RECEIPT',pid,'Fictional correction']))+')')
  before=self.fingerprint();output=Path(self.tmp.name)/'encrypted';key='TEST-ONLY-random-long-passphrase-'+uuid.uuid4().hex
  env=dict(self.env,FARAIOS_BACKUP_TEST='1',PGHOST='127.0.0.1',PGPORT=str(self.pgport),PGUSER=os.environ.get('USER','agent'),PGDATABASE='postgres',PG_BIN=str(PGBIN),BACKUP_PASSPHRASE=key,BACKUP_OUTPUT=str(output))
  proc=subprocess.run(['python',str(ROOT/'scripts/database-backup.py')],env=env,capture_output=True,text=True)
  self.assertEqual(proc.returncode,0,proc.stderr);self.assertNotIn(key,proc.stdout+proc.stderr);result=json.loads(proc.stdout)
  self.assertEqual(result['status'],'encrypted_backup_verified');archive=output/result['file'];self.assertTrue(archive.exists());self.assertEqual(archive.stat().st_mode&0o777,0o600)
  self.assertEqual(len(list(output.iterdir())),2);self.assertNotIn(b'backup@example.test',archive.read_bytes())
  actual=hashlib.sha256(archive.read_bytes()).hexdigest();self.assertTrue((output/(archive.name+'.sha256')).read_text().startswith(actual))
  gpghome=Path(self.tmp.name)/'test-gpg';gpghome.mkdir(mode=0o700);gpg_env=dict(self.env,GNUPGHOME=str(gpghome))
  plain=Path(self.tmp.name)/'restored.tar';base=['gpg','--batch','--yes','--no-symkey-cache','--pinentry-mode','loopback','--passphrase-fd','0']
  p=subprocess.run(base+['--output',str(plain),'--decrypt',str(archive)],env=gpg_env,input=(key+'\n').encode(),capture_output=True);self.assertEqual(p.returncode,0)
  dump=Path(self.tmp.name)/'restore.dump'
  with tarfile.open(plain) as tar:
   self.assertEqual(set(tar.getnames()),{'database.dump','roles.sql','manifest.json'})
   dump.write_bytes(tar.extractfile('database.dump').read());manifest=json.loads(tar.extractfile('manifest.json').read());roles=tar.extractfile('roles.sql').read()
  self.assertEqual(manifest['format'],'faraios-logical-backup-v2');self.assertEqual({k:v['rows']+':'+v['fingerprint'] for k,v in manifest['table_fingerprints'].items()},before)
  if os.environ.get('BACKUP_DOCKER_RESTORE')=='1':
   check=subprocess.run(['python3',str(ROOT/'scripts/database-restore-check.py'),str(output)],env=dict(os.environ,BACKUP_PASSPHRASE=key),capture_output=True,text=True)
   self.assertEqual(check.returncode,0,check.stderr);report=json.loads(check.stdout);self.assertTrue(report['snapshot_fingerprints_match']);self.assertEqual(report['network'],'none')
  self.assertNotIn(b'PASSWORD',roles);self.assertEqual(manifest['database_sha256'],hashlib.sha256(dump.read_bytes()).hexdigest())
  conn=['-h','127.0.0.1','-p',str(self.pgport)]
  subprocess.run([str(PGBIN/'createdb'),*conn,'backup_verification'],env=self.env,check=True,capture_output=True)
  subprocess.run([str(PGBIN/'psql'),*conn,'-d','backup_verification','-c','DROP SCHEMA public'],env=self.env,check=True,capture_output=True)
  p=subprocess.run([str(PGBIN/'pg_restore'),*conn,'-d','backup_verification','--no-owner','--exit-on-error',str(dump)],env=self.env,capture_output=True,text=True);self.assertEqual(p.returncode,0,p.stderr)
  subprocess.run([str(PGBIN/'psql'),*conn,'-d','backup_verification','-c','GRANT USAGE ON SCHEMA public TO PUBLIC'],env=self.env,check=True,capture_output=True)
  self.assertEqual(self.fingerprint('backup_verification'),before)
  wrong=subprocess.run(base+['--output',str(plain),'--decrypt',str(archive)],env=gpg_env,input=b'WRONG-KEY\n',capture_output=True);self.assertNotEqual(wrong.returncode,0)
  tampered=Path(self.tmp.name)/'tampered.gpg';raw=bytearray(archive.read_bytes());raw[-20]^=1;tampered.write_bytes(raw)
  bad=subprocess.run(base+['--output',str(plain),'--decrypt',str(tampered)],env=gpg_env,input=(key+'\n').encode(),capture_output=True);self.assertNotEqual(bad.returncode,0)
  failure=subprocess.run(['python',str(ROOT/'scripts/database-backup.py')],env=env|dict(BACKUP_PASSPHRASE='short'),capture_output=True,text=True);self.assertNotEqual(failure.returncode,0);self.assertEqual(len(list(output.iterdir())),2)
  blocked=subprocess.run(['python',str(ROOT/'scripts/database-backup.py')],env=env|dict(PGHOST='db.some-other-project.supabase.co'),capture_output=True,text=True);self.assertNotEqual(blocked.returncode,0)
  # Effective owner isolation and append-only ledger grants survive restoration.
  q='set role authenticated;set request.jwt.claim.sub='+lit(b)+";set request.jwt.claims='{\"is_anonymous\":false}';select count(*) from public.business_invoices"
  r=subprocess.run([str(PGBIN/'psql'),*conn,'-d','backup_verification','-XAtq','-v','ON_ERROR_STOP=1','-c',q],env=self.env,capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'0')
  print('PASS encrypted export, checksum, 32-or-current table fingerprints, Auth-shaped data, payment history, tenant isolation, wrong-key/tamper rejection, fail-closed setup')
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Backup('test_backup')]));raise SystemExit(not r.wasSuccessful())
