// CI-only disposable PostgreSQL transport check. Never connects to a cloud project.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { CLIENT_IMAGE, DUMPS, SOURCE, clientEnvironment, clientArgs, dumpSpec, assertCompleteDump, cleanupClient, run } from './backup-staging.mjs';

const id=randomBytes(16).toString('hex'),network='faraios-t11-ci-'+id;
const tlsServer='t11-db-'+id,plainServer='t11-plain-'+id,wrongHost='t11-wrong-'+id;
const fixture=await mkdtemp(join(tmpdir(),'faraios-t11-tls-'));
const password=randomBytes(24).toString('hex');
const env={...process.env};for(const k of Object.keys(env))if(/^(PG|SUPABASE_|DOCKER_)/i.test(k))delete env[k];
const docker=(args,options={})=>run('docker',args,{env,timeout:180000,maxOutput:8*1024*1024,...options});
const owned=[];
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
 args.splice(1,0,'--network',network,...(trust?['--mount','type=bind,src='+join(fixture,'ca.crt')+',dst=/etc/ssl/certs/ca-certificates.crt,readonly']:[]));
 const input=mode==='metadata'?await readFile(new URL('./staging-backup-manifest.sql',import.meta.url),'utf8'):undefined;
 return docker(args,{env:{...env,...pg},input,failureContext:'metadata'});
}
try {
 await run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(fixture,'ca.key'),'-out',join(fixture,'ca.crt'),'-days','1','-subj','/CN=FaraiOS Disposable Test CA'],{env});
 await run('openssl',['req','-newkey','rsa:2048','-nodes','-keyout',join(fixture,'server.key'),'-out',join(fixture,'server.csr'),'-subj','/CN='+tlsServer],{env});
 await writeFile(join(fixture,'server.ext'),'subjectAltName=DNS:'+tlsServer+'\nextendedKeyUsage=serverAuth\n');
 await run('openssl',['x509','-req','-in',join(fixture,'server.csr'),'-CA',join(fixture,'ca.crt'),'-CAkey',join(fixture,'ca.key'),'-CAcreateserial','-out',join(fixture,'server.crt'),'-days','1','-extfile',join(fixture,'server.ext')],{env});
 await docker(['network','create',network]);
 await docker(['run','--detach','--rm','--name',tlsServer,'--network',network,'--network-alias',wrongHost,'--log-driver','none','--env','POSTGRES_PASSWORD='+password,'--mount','type=bind,src='+resolve(fixture)+',dst=/input,readonly','--entrypoint','/bin/bash',CLIENT_IMAGE,'-c','install -o postgres -g postgres -m 600 /input/server.key /tmp/server.key; install -o postgres -g postgres -m 644 /input/server.crt /tmp/server.crt; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key']);owned.push(tlsServer);
 await ready(tlsServer);
 const setup=`create schema extensions; create extension pgcrypto schema extensions;
 create schema audit; create schema auth; create schema storage; create schema supabase_migrations; create schema vault;
 create table public.businesses(id uuid primary key); insert into public.businesses values ('0cc3f518-d64e-40c2-8817-bc14d1ef1420'),('612be091-b1d7-4911-9c3b-143446a9fe27'); alter table public.businesses enable row level security;
 create table public.sample(id int, content text); insert into public.sample values(1,'Réka 😀'); alter table public.sample enable row level security;
 create table audit.events(id int); alter table audit.events enable row level security;
 create table auth.users(id int); insert into auth.users values(1);
 create table auth.schema_migrations(version text); create table storage.migrations(id int);
 create table storage.buckets(id int); create table storage.objects(id int); create table storage.buckets_vectors(id int); create table storage.vector_indexes(id int);
 create table supabase_migrations.schema_migrations(version text); insert into supabase_migrations.schema_migrations values ('synthetic'); create table vault.secrets(id int);
 create role anon; create role faraios_synthetic;`;
 await docker(['exec','--interactive',tlsServer,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-q'],{input:setup});
 const metadata=JSON.parse((await invoke('metadata')).stdout);assert.equal(metadata.database_major,17);assert.equal(metadata.tables.find(t=>t.schema==='public'&&t.table==='sample').rows,1);
 console.log('T11_TRANSPORT_TRUSTED_METADATA=PASS');
 for(const [name] of DUMPS) {
  const content=(await invoke(name.replace('.sql',''))).stdout;assertCompleteDump(name,content);
  if(name==='schema.sql'){assert.ok(content.includes('ENABLE ROW LEVEL SECURITY'));assert.ok(!content.includes('CREATE SCHEMA IF NOT EXISTS "auth"'));}
  if(name==='data.sql'){assert.ok(content.includes('Réka 😀'));assert.ok(content.includes('COPY "auth"."users"'));assert.ok(!content.includes('COPY "supabase_migrations"'));assert.ok(!content.includes('COPY "storage"."buckets_vectors"'));}
  if(name==='roles.sql'){assert.ok(content.includes('-- CREATE ROLE "anon"'));assert.ok(content.includes('CREATE ROLE "faraios_synthetic"'));assert.ok(!/PASSWORD/.test(content));}
  if(name==='migration-data.sql')assert.ok(content.includes('COPY "supabase_migrations"."schema_migrations"'));
  if(name==='managed-schema-reference.sql')assert.ok(content.includes('CREATE SCHEMA IF NOT EXISTS "auth"'));
 }
 console.log('T11_TRANSPORT_TRUSTED_DUMPS=PASS (6 modes)');
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
