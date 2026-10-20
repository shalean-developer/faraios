// CI-only disposable PostgreSQL tests plus a credential-free public pooler TLS handshake.
// The public handshake closes before PostgreSQL startup/authentication/query traffic.
import assert from 'node:assert/strict';
import {importSQL,verificationSQL,sequenceAssignments,sequenceVerificationSQL,finishSequencesSQL,RESTORE_CONFIG,MANAGED_PARAMETER_GRANT,RESTORE_CREATION_DEFAULTS_SQL} from './restore-staging.mjs';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import { randomBytes } from 'node:crypto';
import { CLIENT_IMAGE, DUMPS, POOLER_HOST, ROOT_CERT_PATH, ROOT_CERT_CONTAINER, verifyProviderCertificate, certificateMount, clientEnvironment, clientArgs, dumpSpec, assertCompleteDump, cleanupClient, run } from './backup-staging.mjs';

const id=randomBytes(16).toString('hex'),network='faraios-t11-ci-'+id;
const restoreServer='t11-restore-'+id;
const tlsServer='t11-db-'+id,plainServer='t11-plain-'+id,wrongHost='t11-wrong-'+id;
const fixture=await mkdtemp(join(tmpdir(),'faraios-t11-tls-'));
const password=randomBytes(24).toString('hex');
const env={...process.env};for(const k of Object.keys(env))if(/^(PG|SUPABASE_|DOCKER_)/i.test(k))delete env[k];
const docker=(args,options={})=>run('docker',args,{env,timeout:180000,maxOutput:8*1024*1024,...options});
const owned=[];
// Stock PostgreSQL lacks Supabase's privileged-setting extension. This one
// fixture-only grant lets the non-superuser actor replay native data settings.
const fixtureReplicaGrant='GRANT SET ON PARAMETER "session_replication_role" TO "postgres";';
// Model the reviewed provider's existing defaults, including grants later
// revoked on individual protected objects in the source.
const providerDefaults=['TABLES','SEQUENCES','FUNCTIONS'].map(kind=>
 `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ${kind} TO postgres,anon,authenticated,service_role;`).join('\n');
async function bootstrapRestrictedActor(name){
 const sql=`create role postgres login createrole createdb password '${password}';alter database postgres owner to postgres;create role supabase_realtime_admin;create role anon;create role authenticated;create role service_role;${MANAGED_PARAMETER_GRANT}${fixtureReplicaGrant}`;
 await docker(['exec','--interactive',name,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-q'],{input:sql});
}
async function ready(name) {
 for(let attempt=0;attempt<60;attempt++) {
  try{await docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);return;}catch{}
  await new Promise(done=>setTimeout(done,500));
 }
 throw new Error('Synthetic database readiness failed');
}
async function running(name) {
 for(let attempt=0;attempt<60;attempt++) {
  if((await docker(['ps','--filter','name=^/'+name+'$','--format','{{.Names}}'])).stdout.trim()===name)return;
  await new Promise(done=>setTimeout(done,100));
 }
 throw new Error('Disposable client was not observed running');
}
async function invoke(mode,{host=tlsServer,trust=true}={}) {
 const spec=mode==='metadata'?{script:'exec psql -X -w -q -A -t --set=ON_ERROR_STOP=1',env:{}}:dumpSpec(mode+'.sql');
 const pg={...clientEnvironment(password,env),...spec.env,PGHOST:host,PGUSER:'postgres'};
 const args=clientArgs(id,mode,spec.script,pg,mode==='metadata');
 // CI-only endpoint/trust substitution; production exposes no host/CA override.
 if(trust)args[args.indexOf('--mount')+1]=certificateMount(join(fixture,'ca.crt'));
 args.splice(1,0,'--network',network);
 const input=mode==='metadata'?await readFile(new URL('./staging-backup-manifest.sql',import.meta.url),'utf8'):undefined;
 return docker(args,{env:{...env,...pg},input,failureContext:'pg-client'});
}
async function publicPoolerTLS() {
 await verifyProviderCertificate();const ca=await readFile(ROOT_CERT_PATH,'utf8');
 await new Promise((resolveProbe,rejectProbe)=>{
  let secure,settled=false;
  const socket=net.connect({host:POOLER_HOST,port:5432});
  const finish=error=>{if(settled)return;settled=true;clearTimeout(deadline);secure?.destroy();socket.destroy();error?rejectProbe(new Error('PROVIDER_TLS_PROBE_FAILED')):resolveProbe();};
  const deadline=setTimeout(()=>finish(true),20000);
  socket.once('error',()=>finish(true));
  socket.once('connect',()=>{const request=Buffer.alloc(8);request.writeInt32BE(8,0);request.writeInt32BE(80877103,4);socket.write(request);});
  socket.once('data',reply=>{
   if(reply.length!==1||reply[0]!==83){finish(true);return;}
   secure=tls.connect({socket,servername:POOLER_HOST,ca,rejectUnauthorized:true,minVersion:'TLSv1.2'});
   secure.once('error',()=>finish(true));
   secure.once('secureConnect',()=>finish(!secure.authorized));
  });
 });
 console.log('T11_PUBLIC_POOLER_CA_AND_HOSTNAME=PASS (TLS handshake only; no database startup/auth/query)');
}
async function exerciseRestore(manifest,files){
 const catalogSQL=await readFile(new URL('./restore-catalog.sql',import.meta.url),'utf8');
 const preflightSQL=await readFile(new URL('./restore-preflight.sql',import.meta.url),'utf8');
 const query=async(host,input,write=false,admin=false)=>{
  const pg={...clientEnvironment(password,env),PGHOST:host,PGUSER:admin?'supabase_admin':'postgres',PGOPTIONS:'-c default_transaction_read_only='+(write?'off':'on')};
  const args=clientArgs(id,'restore-ci','exec psql -X -w -q -A -t --set=ON_ERROR_STOP=1 --single-transaction --file=-',pg,true);
  args[args.indexOf('--mount')+1]=certificateMount(join(fixture,'ca.crt'));args.splice(1,0,'--network',network);
  return docker(args,{env:{...env,...pg},input,failureContext:'pg-client'});
 };
 const catalog=async host=>JSON.parse((await query(host,"SET LOCAL search_path='';"+catalogSQL)).stdout);
 const sourceCatalog=await catalog(tlsServer);
 for(const mutation of ['create domain public.t11_domain as text;','grant select(content) on public.sample to anon;','alter role anon bypassrls;','grant anon to authenticated;','alter default privileges grant select on tables to anon;']){
  const changed=JSON.parse((await query(tlsServer,"savepoint catalog_probe;"+mutation+"set local search_path='';"+catalogSQL+'rollback to savepoint catalog_probe;',true,true)).stdout);
  assert.notEqual(changed.application,sourceCatalog.application);
 }
 console.log('T11_RESTORE_PORTABLE_SECURITY_MUTATIONS_DETECTED=PASS (domain, column ACL, role capability/membership and global defaults)');
 await docker(['run','--detach','--rm','--name',restoreServer,'--network',network,'--log-driver','none','--env','POSTGRES_USER=supabase_admin','--env','POSTGRES_DB=postgres','--env','POSTGRES_PASSWORD='+password,'--mount','type=bind,src='+resolve(fixture)+',dst=/input,readonly','--entrypoint','/bin/bash',CLIENT_IMAGE,'-c','install -o postgres -g postgres -m 600 /input/server.key /tmp/server.key; install -o postgres -g postgres -m 644 /input/server.crt /tmp/server.crt; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key']);owned.push(restoreServer);await ready(restoreServer);await bootstrapRestrictedActor(restoreServer);
 const managed=`create schema extensions;create extension pgcrypto schema extensions;create schema auth;create schema storage;create schema vault;
 create table auth.users(id int);create sequence auth.refresh_tokens_id_seq;select setval('auth.refresh_tokens_id_seq',11,true);create table auth.schema_migrations(version text);create table storage.migrations(id int);create table storage.buckets(id int);create table storage.objects(id int);create table storage.buckets_vectors(id int);create table storage.vector_indexes(id int);create table vault.secrets(id int);${providerDefaults}`;
 await query(restoreServer,managed,true);
 const empty=await catalog(restoreServer);assert.equal(empty.managed,sourceCatalog.managed);
 const saved={...RESTORE_CONFIG};Object.assign(RESTORE_CONFIG,{applicationCatalogSha256:sourceCatalog.application,managedCatalogSha256:sourceCatalog.managed,emptyApplicationCatalogSha256:empty.application});
 try{
  const wrapped={before:manifest},backup={payload:{files}};
  const privilegeState=(await query(restoreServer,"select rolsuper,pg_has_role('postgres','supabase_admin','MEMBER'),has_parameter_privilege('postgres','log_min_messages','SET WITH GRANT OPTION') from pg_roles where rolname='postgres';")).stdout.trim();assert.equal(privilegeState,'f|f|f');
  await assert.rejects(query(restoreServer,MANAGED_PARAMETER_GRANT,true),{code:'METADATA_PERMISSION_DENIED'});
  console.log('T11_RESTORE_RESTRICTED_PARAMETER_PERMISSION=PASS (non-superuser, no provider-admin membership; fixture-only replica-setting permission)');
  await assert.rejects(query(restoreServer,'revoke set on parameter log_min_messages from supabase_realtime_admin;set local role postgres;'+importSQL(backup,wrapped,catalogSQL,preflightSQL),true,true),{code:'RESTORE_CATALOG_MISMATCH'});
  assert.equal((await catalog(restoreServer)).application,empty.application);
  console.log('T11_RESTORE_PARAMETER_ACL_DRIFT_REFUSED=PASS (before import; provider grant preserved)');
  const unprepared=importSQL(backup,wrapped,catalogSQL,preflightSQL);
  assert.equal(unprepared.split(RESTORE_CREATION_DEFAULTS_SQL).length,2);
  await assert.rejects(query(restoreServer,unprepared.replace(RESTORE_CREATION_DEFAULTS_SQL,'-- Reproduce the original creation-default defect.\n'),true),{code:'RESTORE_CATALOG_MISMATCH'});
  assert.deepEqual(await catalog(restoreServer),empty);
  console.log('T11_RESTORE_INHERITED_DEFAULT_ACL_FAILURE_REPRODUCED=PASS (native object replay retains excess grants without preparation; transaction rolled back)');
  // Exercise actual pg_dump -> generated import -> PostgreSQL, not a SQL-shaped mock.
  const broken=structuredClone(wrapped);broken.before.tables.find(t=>t.schema==='public'&&t.table==='sample').sha256='0'.repeat(64);
  // The approved real capture has no custom roles. Inject a transactional
  // CREATE-only probe in the failed variant to test role rollback without
  // claiming stock-PG non-superusers can replay privileged ALTER ROLE flags.
  const probeSQL='CREATE ROLE "faraios_rollback_probe";';
  const probeCatalog=JSON.parse((await query(tlsServer,'savepoint role_probe;'+probeSQL+"set local search_path='';"+catalogSQL+'rollback to savepoint role_probe;',true)).stdout);
  const brokenBackup=structuredClone(backup);brokenBackup.payload.files.find(f=>f.name==='roles.sql').content+='\n'+probeSQL;
  RESTORE_CONFIG.applicationCatalogSha256=probeCatalog.application;
  try{await assert.rejects(query(restoreServer,importSQL(brokenBackup,broken,catalogSQL,preflightSQL),true),{code:'RESTORE_DATA_MISMATCH'});}finally{RESTORE_CONFIG.applicationCatalogSha256=sourceCatalog.application;}
  assert.equal((await catalog(restoreServer)).application,empty.application);
  const check=JSON.parse((await query(restoreServer,preflightSQL)).stdout);assert.equal(check.managed_data_rows,0);assert.equal(check.application_objects,0);
  assert.equal((await query(restoreServer,"select count(*) from pg_roles where rolname='faraios_rollback_probe';")).stdout.trim(),'0');
  assert.equal((await query(restoreServer,'select last_value,is_called from auth.refresh_tokens_id_seq;')).stdout.trim(),'11|t');
  console.log('T11_RESTORE_NATIVE_FAILURE_ROLLBACK=PASS (schema, Auth rows and role creation rolled back)');
  const imported=await query(restoreServer,importSQL(backup,wrapped,catalogSQL,preflightSQL),true);assert.ok(imported.stdout.includes('FARAIOS_T11_RESTORE_VALIDATED'));
  await query(restoreServer,verificationSQL(wrapped,catalogSQL));
  assert.equal((await query(restoreServer,"select has_table_privilege('anon','public.sample','SELECT'),has_table_privilege('service_role','public.sample','SELECT'),has_table_privilege('authenticated','public.sample','INSERT'),has_table_privilege('authenticated','public.sample','SELECT'),has_function_privilege('anon','public.owner_only()','EXECUTE'),has_function_privilege('authenticated','public.owner_only()','EXECUTE'),has_function_privilege('service_role','public.owner_only()','EXECUTE');")).stdout.trim(),'f|f|f|t|f|f|f');
  console.log('T11_RESTORE_EXACT_OBJECT_AND_CREATION_DEFAULT_ACLS=PASS (protected table/function grants restored; final defaults included in exact catalog)');
  assert.equal((await query(restoreServer,'select last_value,is_called from auth.refresh_tokens_id_seq;')).stdout.trim(),'11|t');
  const {states}=sequenceAssignments(files);
  await assert.rejects(query(restoreServer,sequenceVerificationSQL(states)));
  await query(restoreServer,finishSequencesSQL(wrapped,catalogSQL,states),true);
  await query(restoreServer,sequenceVerificationSQL(states));
  assert.equal((await query(restoreServer,'select last_value,is_called from auth.refresh_tokens_id_seq;')).stdout.trim(),'50|t');
  await assert.rejects(query(restoreServer,'update auth.users set id=99 where id=1;'+finishSequencesSQL(wrapped,catalogSQL,states),true));
  assert.equal((await query(restoreServer,'select last_value,is_called from auth.refresh_tokens_id_seq;')).stdout.trim(),'50|t');
  await query(restoreServer,finishSequencesSQL(wrapped,catalogSQL,states),true);
  console.log('T11_RESTORE_MANAGED_SEQUENCE_PHASE_AND_GUARDED_RESUME=PASS');
  assert.equal((await query(restoreServer,'select count(*) from auth.users;select count(*) from audit.events;')).stdout.trim(),'3\n1');
  console.log('T11_RESTORE_NATIVE_SCHEMA_DATA_AUTH_AUDIT=PASS');
  await assert.rejects(query(restoreServer,importSQL(backup,wrapped,catalogSQL,preflightSQL),true));
  await query(restoreServer,verificationSQL(wrapped,catalogSQL));
  console.log('T11_RESTORE_NONEMPTY_RETRY_REFUSED=PASS');
  for(const [subject,businesses,samples] of [[1,2,2],[2,1,1],[3,2,0]]){
   // Bootstrap admin may SET this role without widening the restore actor's
   // membership. The effective read role itself must have no bypass privilege.
   const r=await query(restoreServer,`set local role authenticated;set local request.jwt.claim.sub='${subject}';select current_user,rolsuper or rolbypassrls from pg_roles where rolname=current_user;select count(*) from public.businesses;select count(*) from public.sample;`,false,true);
   assert.equal(r.stdout.trim(),'authenticated|f\n'+businesses+'\n'+samples);
  }
  const before=(await query(restoreServer,'select count(*) from audit.events;')).stdout.trim();
  const audit=await query(restoreServer,"savepoint t11_probe;update public.businesses set name=name||' probe' where id='0cc3f518-d64e-40c2-8817-bc14d1ef1420';select count(*) from audit.events;rollback to savepoint t11_probe;select count(*) from audit.events;",true);
  assert.equal(audit.stdout.trim(),'2\n'+before);
  await query(restoreServer,verificationSQL(wrapped,catalogSQL));
  console.log('T11_RESTORE_NATIVE_RLS_AND_ROLLBACK_AUDIT=PASS');
 }finally{Object.assign(RESTORE_CONFIG,saved);}
}
await publicPoolerTLS();
try {
 await run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(fixture,'ca.key'),'-out',join(fixture,'ca.crt'),'-days','1','-subj','/CN=FaraiOS Disposable Test CA'],{env});
 await run('openssl',['req','-newkey','rsa:2048','-nodes','-keyout',join(fixture,'server.key'),'-out',join(fixture,'server.csr'),'-subj','/CN='+tlsServer],{env});
 await writeFile(join(fixture,'server.ext'),'subjectAltName=DNS:'+tlsServer+',DNS:'+restoreServer+'\nextendedKeyUsage=serverAuth\n');
 await run('openssl',['x509','-req','-in',join(fixture,'server.csr'),'-CA',join(fixture,'ca.crt'),'-CAkey',join(fixture,'ca.key'),'-CAcreateserial','-out',join(fixture,'server.crt'),'-days','1','-extfile',join(fixture,'server.ext')],{env});
 await docker(['network','create',network]);
 await docker(['run','--detach','--rm','--name',tlsServer,'--network',network,'--network-alias',wrongHost,'--log-driver','none','--env','POSTGRES_USER=supabase_admin','--env','POSTGRES_DB=postgres','--env','POSTGRES_PASSWORD='+password,'--mount','type=bind,src='+resolve(fixture)+',dst=/input,readonly','--entrypoint','/bin/bash',CLIENT_IMAGE,'-c','install -o postgres -g postgres -m 600 /input/server.key /tmp/server.key; install -o postgres -g postgres -m 644 /input/server.crt /tmp/server.crt; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key']);owned.push(tlsServer);
 await ready(tlsServer);await bootstrapRestrictedActor(tlsServer);
 const setup=`${providerDefaults}\ncreate schema extensions; create extension pgcrypto schema extensions;
 create extension btree_gist schema extensions; create schema audit; create schema auth; create schema storage; create schema supabase_migrations; create schema vault;
 create table public.businesses(id uuid primary key,name text); insert into public.businesses values ('0cc3f518-d64e-40c2-8817-bc14d1ef1420','Synthetic A'),('612be091-b1d7-4911-9c3b-143446a9fe27','Synthetic B'); alter table public.businesses enable row level security;
 create table public.sample(id int, content text,business_id uuid); insert into public.sample values(1,'Réka 😀','0cc3f518-d64e-40c2-8817-bc14d1ef1420'),(2,'Synthetic second business','612be091-b1d7-4911-9c3b-143446a9fe27'); alter table public.sample enable row level security;
 create table public.business_accounting_connections(id int,enabled boolean); alter table public.business_accounting_connections enable row level security; create table audit.events(id int); alter table audit.events enable row level security;
 create table auth.users(id int); insert into auth.users values(1),(2),(3);create sequence auth.refresh_tokens_id_seq;select setval('auth.refresh_tokens_id_seq',50,true);
 create table auth.schema_migrations(version text); create table storage.migrations(id int);
 create table storage.buckets(id int); create table storage.objects(id int); create table storage.buckets_vectors(id int); create table storage.vector_indexes(id int);
 create table supabase_migrations.schema_migrations(version text); insert into supabase_migrations.schema_migrations values ('synthetic'); create table vault.secrets(id int);
 create table public.business_memberships(user_id int,business_id uuid,role text);
 insert into public.business_memberships values(1,'0cc3f518-d64e-40c2-8817-bc14d1ef1420','owner'),(1,'612be091-b1d7-4911-9c3b-143446a9fe27','owner'),(2,'0cc3f518-d64e-40c2-8817-bc14d1ef1420','manager'),(3,'0cc3f518-d64e-40c2-8817-bc14d1ef1420','staff'),(3,'612be091-b1d7-4911-9c3b-143446a9fe27','staff');
 alter table public.business_memberships enable row level security;
 revoke all on all tables in schema public from anon,authenticated,service_role;
 grant select on public.businesses,public.business_memberships,public.sample to authenticated;
 create function public.owner_only() returns int language sql as 'select 1';
 revoke all on function public.owner_only() from public,anon,authenticated,service_role;
 create policy memberships_self on public.business_memberships to authenticated using(user_id=current_setting('request.jwt.claim.sub',true)::int);
 create policy businesses_member on public.businesses to authenticated using(id in(select business_id from public.business_memberships));
 create policy sample_office on public.sample to authenticated using(business_id in(select business_id from public.business_memberships where role in('owner','manager')));
 insert into audit.events values(1);
 create function audit.capture() returns trigger language plpgsql as $fn$ begin insert into audit.events values((select coalesce(max(id),0)+1 from audit.events));return new;end $fn$;
 create trigger fixture_audit after update on public.businesses for each row execute function audit.capture();` ;
 await docker(['exec','--interactive',tlsServer,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-q'],{input:setup});
 const metadata=JSON.parse((await invoke('metadata')).stdout);assert.equal(metadata.database_major,17);assert.equal(metadata.tables.find(t=>t.schema==='public'&&t.table==='sample').rows,2);
 console.log('T11_TRANSPORT_TRUSTED_METADATA=PASS');
 const dumpFiles=[];
 for(const [name] of DUMPS) {
  const content=(await invoke(name.replace('.sql',''))).stdout;assertCompleteDump(name,content);dumpFiles.push({name,content});
  if(name==='schema.sql'){assert.ok(content.includes('ENABLE ROW LEVEL SECURITY'));assert.ok(!content.includes('CREATE SCHEMA IF NOT EXISTS "auth"'));}
  if(name==='data.sql'){assert.ok(content.includes('Réka 😀'));assert.ok(content.includes('COPY "auth"."users"'));assert.ok(!content.includes('COPY "supabase_migrations"'));assert.ok(!content.includes('COPY "storage"."buckets_vectors"'));}
  if(name==='roles.sql'){assert.ok(content.includes('-- CREATE ROLE "anon"'));assert.ok(content.includes(MANAGED_PARAMETER_GRANT));assert.ok(!/PASSWORD/.test(content));}
  if(name==='migration-data.sql')assert.ok(content.includes('COPY "supabase_migrations"."schema_migrations"'));
  if(name==='managed-schema-reference.sql')assert.ok(content.includes('CREATE SCHEMA IF NOT EXISTS "auth"'));
 }
 console.log('T11_TRANSPORT_TRUSTED_DUMPS=PASS (6 modes)');
 // The real native role dump also contains stock-PG fixture permission above.
 // Remove exactly that one fixture-only statement; production accepts no such
 // omission. Both catalogs still include/check its ACL throughout the test.
 const roles=dumpFiles.find(f=>f.name==='roles.sql');assert.equal(roles.content.split(fixtureReplicaGrant).length,2);roles.content=roles.content.replace(fixtureReplicaGrant,'-- Fixture-only replica-setting grant already provisioned.');
 await exerciseRestore(metadata,dumpFiles);
 await docker(['run','--detach','--rm','--name',plainServer,'--network',network,'--log-driver','none','--env','POSTGRES_PASSWORD='+password,CLIENT_IMAGE]);owned.push(plainServer);await ready(plainServer);
 for(const mode of ['metadata',...DUMPS.map(([n])=>n.replace('.sql',''))]) {
  for(const options of [{trust:false},{host:wrongHost},{host:plainServer}])await assert.rejects(invoke(mode,options),{code:'METADATA_TLS_FAILED'});
 }
 console.log('T11_TRANSPORT_UNTRUSTED_CA=PASS (7 clients refused)');
 console.log('T11_TRANSPORT_WRONG_HOSTNAME=PASS (7 clients refused)');
 console.log('T11_TRANSPORT_PLAINTEXT_SERVER=PASS (7 clients refused)');
 const pg={...clientEnvironment(password,env),PGHOST:tlsServer,PGUSER:'postgres'};
 const sentinel='faraios-t11-'+id+'-sentinel';
 const sentinelArgs=clientArgs(id,'sentinel','exec sleep 60',pg);sentinelArgs.splice(1,0,'--detach','--network',network);
 await docker(sentinelArgs,{env:{...env,...pg}});owned.push(sentinel);await running(sentinel);
 for(const cancelled of [false,true]) {
  const step=cancelled?'cleanup-cancel':'cleanup-timeout',name='faraios-t11-'+id+'-'+step;
  const args=clientArgs(id,step,'exec sleep 60',pg);args.splice(1,0,'--network',network);
  const controller=new AbortController();
  const result=docker(args,{env:{...env,...pg},signal:controller.signal,timeout:cancelled?30000:10000}).then(value=>({value}),error=>({error}));
  await running(name); // Cleanup cannot pass merely because no container started.
  if(cancelled)controller.abort();
  const outcome=await result;assert.equal(outcome.error?.code,cancelled?'BACKUP_CANCELLED':'CHILD_TIMEOUT');
  await cleanupClient(id,step,pg,async(command,arguments_,options)=>{assert.equal(command,'docker');return docker(arguments_,options);});
  assert.equal((await docker(['ps','--all','--filter','name=^/'+name+'$','--format','{{.Names}}'])).stdout.trim(),'');
  assert.equal((await docker(['ps','--filter','name=^/'+sentinel+'$','--format','{{.Names}}'])).stdout.trim(),sentinel);
  console.log('T11_OWNED_'+(cancelled?'CANCEL':'TIMEOUT')+'_CLEANUP=PASS');
 }
 console.log('T11_OWNED_UNRELATED_SENTINEL_PRESERVED=PASS');

} finally {
 let cleanupFailed=false;
 for(const name of owned)try{await docker(['rm','--force',name]);}catch{cleanupFailed=true;}
 try{await docker(['network','rm',network]);}catch{cleanupFailed=true;}
 await rm(fixture,{recursive:true,force:true});
 if(cleanupFailed)throw new Error('Synthetic transport fixture cleanup failed');
 console.log('T11_TRANSPORT_FIXTURE_CLEANUP=PASS');
}
