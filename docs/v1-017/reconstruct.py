"""Offline-only reconstruction helpers. Never connect this bootstrap to a hosted DB."""
from pathlib import Path
import json,hashlib,zipfile,re,sys
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
OWNER_ROLE='agent'
def sha(data):return hashlib.sha256(data).hexdigest()
def check_inputs():
 manifest=json.loads((BASE/'manifest.json').read_text())
 for path,expected in manifest['input_hashes'].items():
  if sha((ROOT/path).read_bytes())!=expected:raise ValueError('Release input drift: '+path)
 return manifest

def runtime(destination):
 destination=Path(destination)
 if destination.exists():raise ValueError('Destination must be new')
 m=check_inputs();packet=ROOT/m['runtime_package']['path']
 if sha(packet.read_bytes())!=m['runtime_package']['sha256']:raise ValueError('Runtime packet drift')
 with zipfile.ZipFile(packet)as z:
  expected={r['path']:r['sha256'] for r in m['files'] if r['scope']=='canonical_runtime'}
  if set(z.namelist())!=set(expected):raise ValueError('Member set drift')
  for p,h in expected.items():
   if Path(p).is_absolute() or '..' in Path(p).parts:raise ValueError('Unsafe path')
   data=z.read(p)
   if sha(data)!=h:raise ValueError('Payload hash drift: '+p)
  destination.mkdir(parents=True)
  for p in expected:
   f=destination/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(z.read(p))
 return expected

def acl_items(raw):
 if raw is None:return []
 if isinstance(raw,list):return raw
 return raw.strip('{}').split(',') if raw!='{}' else []
def acl(sql,target,raw,kind='TABLE'):
 # Production postgres owner maps to the disposable database owner. Never grant
 # to a different hosted role. All runtime principals retain exact privileges.
 sql(f'REVOKE ALL ON {kind} {target} FROM PUBLIC,anon,authenticated,service_role')
 mapping={'r':'SELECT','a':'INSERT','w':'UPDATE','d':'DELETE','D':'TRUNCATE','x':'REFERENCES','t':'TRIGGER','m':'MAINTAIN','X':'EXECUTE','U':'USAGE','C':'CREATE'}
 for item in acl_items(raw):
  who,priv=item.split('=',1);priv=priv.split('/')[0]
  if who in ['postgres','pg_database_owner']:continue
  if who not in ['','anon','authenticated','service_role']:raise ValueError('Unmapped runtime principal '+who)
  role=who or 'PUBLIC';privs=[mapping[x] for x in priv if x!='*']
  if privs:sql(f'GRANT {",".join(privs)} ON {kind} {target} TO {role}'+(' WITH GRANT OPTION'if '*'in priv else ''))

def database(sql):
 global OWNER_ROLE
 OWNER_ROLE=sql('select current_user')
 check_inputs()
 sql("create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;")
 # Journey creates the first waitlist migration with the native provider stubs.
 plan=json.loads((BASE/'migration-order.json').read_text())
 for row in plan[1:]:
  if row['name']=='v1022_customer_document_privacy':continue
  sql((ROOT/row['path']).read_text())
 for name in ['unlogged-live-readiness.sql','unlogged-staff-onboarding.sql']:sql((BASE/'sql'/name).read_text())
 functions=json.loads((BASE/'installed-functions.json').read_text())+json.loads((BASE/'installed-waitlist-functions.json').read_text())
 for row in functions:sql(row['definition'])
 for row in functions:
  # NULL ACL is PostgreSQL's default owner/PUBLIC execution grant.
  acl(sql,row['identity'],row['acl'] if row['acl'] is not None else ['=X/postgres'],'FUNCTION')
 catalog=json.loads((BASE/'installed-catalog.json').read_text())
 for row in catalog['relations']:
  acl(sql,row['schema']+'.'+row['name'],row['acl'],'SEQUENCE' if row['kind']=='S' else 'TABLE')
 for row in catalog['columns']:
  for item in acl_items(row['acl']):
   who,priv=item.split('=',1);priv=priv.split('/')[0]
   if who in ['postgres','pg_database_owner']:continue
   rights={'r':'SELECT','a':'INSERT','w':'UPDATE','x':'REFERENCES'}
   for char in priv:
    if char in rights:sql(f"GRANT {rights[char]} ({row['name']}) ON {row['schema']}.{row['table']} TO {who or 'PUBLIC'}")
 for row in json.loads((BASE/'installed-schema-indexes.json').read_text())['schemas']:acl(sql,row['name'],row['acl'],'SCHEMA')
 return functions,catalog

def normalize(x):
 if isinstance(x,list):return [normalize(y)for y in x]
 if isinstance(x,dict):
  d={k:normalize(v) for k,v in x.items()if k!='owner'}
  if 'acl' in d:
   d['acl']=sorted(a.replace('agent','postgres').split('/')[0] for a in acl_items(d['acl']) if a.split('=')[0] not in ['postgres','agent','pg_database_owner',OWNER_ROLE])
  return d
 return x

if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('Usage: reconstruct.py NEW_OFFLINE_DIRECTORY')
 print(json.dumps({'runtime_files':len(runtime(sys.argv[1])),'hosted_execution':False}))
