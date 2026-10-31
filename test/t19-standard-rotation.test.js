import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,rm,readFile,chmod,symlink,unlink,link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {Client} from 'pg';
import {syntheticRecoveryFixture} from '../scripts/t19-standard-recovery-rehearsal.mjs';
import {createTokenCipher,tokenBinding} from '../src/t19-standard-secrets.js';
import {credentialMaterialDigest} from '../src/t19-standard-recovery.js';
import {createStandardHttpsStore} from '../src/t19-standard-https-store.js';
import {rewrapStandardCredentials} from '../src/t19-standard-rotation.js';
import {createRotationJournal} from '../src/t19-standard-rotation-journal.js';
const denied={message:'accounting_rotation_recovery_required'},linux={skip:process.platform!=='linux'};
async function fixture(t){
 const {config,records}=syntheticRecoveryFixture(),to={key:randomBytes(32),keyId:'next'},directory=await mkdtemp(join(tmpdir(),'t19-rotation-'));
 t.after(async()=>{config.key.fill(0);to.key.fill(0);await rm(directory,{recursive:true,force:true});});
 const data=new Map(records.map(c=>[c.businessId,structuredClone(c)])),leases=new Map(),actions=[];let afterWrite=()=>{},quiet=true;
 const rpc=async(name,{action,input:p})=>{
  assert.equal(name,'t19_standard_store');assert.equal(p.environment,'staging');assert.ok(data.has(p.businessId));actions.push(action);
  if(action==='acquire'){if(leases.has(p.businessId))throw Error('busy');leases.set(p.businessId,p.lease);return {data:{}};}
  if(action==='connection')return {data:structuredClone(data.get(p.businessId))};
  if(leases.get(p.businessId)!==p.lease)throw Error('lease denied');
  if(action==='guard')return {data:{}};
  if(action==='release'){leases.delete(p.businessId);return {data:{}};}
  if(action==='refresh'){const c=data.get(p.businessId);if(c.status!=='connected'||tokenBinding(c)!==tokenBinding(p.connection))throw Error('binding denied');c.envelope=structuredClone(p.envelope);await afterWrite(c);return {data:{}};}
  throw Error('unexpected action');
 };
 const journal=createRotationJournal(directory),options={businessIds:records.map(c=>c.businessId),storeFactory:()=>createStandardHttpsStore({rpc}),fromConfig:config,toConfig:to,journal,assertQuiescent:async()=>quiet};
 return {config,to,records,data,leases,actions,journal,options,directory,setWriteHook:f=>afterWrite=f,setQuiet:v=>quiet=v};
}
test('rotation forward and rollback preserve token material and require separate config switch',linux,async t=>{
 const f=await fixture(t),before=credentialMaterialDigest(f.records,f.config),metadata=f.records.map(({envelope,...c})=>c);
 const forward=await rewrapStandardCredentials(f.options);assert.equal(forward.rewrapped,2);assert.equal(forward.resumeAllowed,false);assert.equal(forward.configurationSwitchRequired,true);
 assert.equal(credentialMaterialDigest([...f.data.values()],f.to),before);assert.deepEqual([...f.data.values()].map(({envelope,...c})=>c),metadata);
 await rewrapStandardCredentials({...f.options,direction:'rollback'});assert.equal(credentialMaterialDigest([...f.data.values()],f.config),before);assert.equal(f.actions.filter(a=>a==='refresh').length,4);assert.equal(f.leases.size,0);
 const bytes=await readFile(join(f.directory,'rotation-plan.json'),'utf8');assert.ok(!bytes.includes('SYNTHETIC-REFRESH-'));assert.ok(!bytes.includes(f.config.key.toString('hex')));assert.ok(!bytes.includes(f.to.key.toString('hex')));
});
test('commit followed by lost acknowledgement resumes from actual envelopes without rewriting accepted member',linux,async t=>{
 const f=await fixture(t);let once=true;f.setWriteHook(()=>{if(once){once=false;throw Error('sensitive response must not escape');}});
 await assert.rejects(rewrapStandardCredentials(f.options),denied);assert.equal([...f.data.values()].filter(c=>c.envelope.keyId===f.to.keyId).length,1);
 const result=await rewrapStandardCredentials(f.options);assert.equal(result.rewrapped,2);assert.equal(f.actions.filter(a=>a==='refresh').length,2);
});
test('partial forward publication can roll back after restart',linux,async t=>{
 const f=await fixture(t);let once=true;f.setWriteHook(()=>{if(once){once=false;throw Error();}});
 await assert.rejects(rewrapStandardCredentials(f.options),denied);
 await rewrapStandardCredentials({...f.options,journal:createRotationJournal(f.directory),direction:'rollback'});
 assert.ok([...f.data.values()].every(c=>c.envelope.keyId===f.config.keyId));assert.equal(credentialMaterialDigest([...f.data.values()],f.config),credentialMaterialDigest(f.records,f.config));
});
test('journal persistence failure, non-quiescent state and duplicate scope never publish',linux,async t=>{
 const f=await fixture(t);f.setQuiet(false);await assert.rejects(rewrapStandardCredentials(f.options),denied);assert.equal(f.actions.length,0);f.setQuiet(true);
 await assert.rejects(rewrapStandardCredentials({...f.options,journal:{...f.journal,prepare:async()=>{throw Error('disk failure');}}}),denied);
 await assert.rejects(rewrapStandardCredentials({...f.options,businessIds:[f.records[0].businessId,f.records[0].businessId]}),denied);
 await assert.rejects(rewrapStandardCredentials({...f.options,direction:'rollback'}),denied);assert.equal(f.actions.filter(a=>a==='refresh').length,0);
});
test('fresh token material, reconnection or revocation prevents stale rollback/publication',linux,async t=>{
 for(const change of ['material','generation','status']){
  const f=await fixture(t);await rewrapStandardCredentials(f.options);const c=f.data.values().next().value;
  if(change==='material')c.envelope=createTokenCipher(f.to).seal(c,{refreshToken:'SYNTHETIC-CHANGED',accessToken:'SYNTHETIC-ACCESS',expiresAt:2000000000000});
  else if(change==='generation')c.generation++;else c.status='revocation_pending';
  const count=f.actions.filter(a=>a==='refresh').length;await assert.rejects(rewrapStandardCredentials({...f.options,direction:'rollback'}),denied);assert.equal(f.actions.filter(a=>a==='refresh').length,count);
 }
});
test('lost fencing or quiescence after publication holds recovery and never resumes writers',linux,async t=>{
 const f=await fixture(t);f.setWriteHook(()=>f.setQuiet(false));await assert.rejects(rewrapStandardCredentials(f.options),denied);assert.equal(f.actions.filter(a=>a==='refresh').length,1);
 f.setWriteHook(()=>{});f.setQuiet(true);await rewrapStandardCredentials(f.options);assert.equal(f.actions.filter(a=>a==='refresh').length,2);
});
test('journal rejects overwrite, insecure mode, links and arbitrary secret-bearing event fields',linux,async t=>{
 const f=await fixture(t);await rewrapStandardCredentials(f.options);const p=join(f.directory,'rotation-plan.json'),saved=await f.journal.load();
 await assert.rejects(f.journal.prepare(saved));await assert.rejects(f.journal.record({rotationId:randomUUID(),direction:'forward',state:'verified',refreshToken:'SYNTHETIC'}));
 await chmod(p,0o644);await assert.rejects(f.journal.load());await chmod(p,0o600);await link(p,join(f.directory,'hardlink'));await assert.rejects(f.journal.load());await unlink(join(f.directory,'hardlink'));
 await unlink(p);await symlink(join(f.directory,'rotation-events.jsonl'),p);await assert.rejects(f.journal.load());
});
test('rotation SQL forward rollback and acknowledgement-loss resume preserve scoped records',linux,async t=>{
 const f=await fixture(t);let db;
 if(process.env.T19_CUSTODY_NATIVE_URL){
  const target=new URL(process.env.T19_CUSTODY_NATIVE_URL);if(target.hostname!=='127.0.0.1'||target.pathname!=='/postgres'||target.username!=='postgres'||target.password||target.search)throw Error('disposable_only');
  const client=new Client({connectionString:target.href,ssl:false});await client.connect();t.after(()=>client.end());
  if(Number((await client.query("select count(*) from pg_tables where schemaname='public'")).rows[0].count)!==0)throw Error('nonempty_database');
  db={query:(...a)=>client.query(...a),exec:s=>client.query(s)};
 }else{db=new PGlite();t.after(()=>db.close());}
 const machine=randomUUID(),session=randomUUID();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql as $$select (auth.jwt()->>'sub')::uuid$$;
 create table public.businesses(id uuid primary key,status text);alter table public.businesses enable row level security;
 create table public.business_memberships(business_id uuid,user_id uuid,role text,status text);alter table public.business_memberships enable row level security;`);
 await db.query('insert into auth.users values($1)',[machine]);await db.query('insert into auth.sessions values($1,$2,null)',[session,machine]);
 for(const c of f.records)await db.query("insert into public.businesses values($1,'active')",[c.businessId]);
 for(const name of ['t19-standard-store.sql','t19-standard-backend-role.sql','t19-standard-https.sql','t19-standard-https-org-pins.sql','t19-standard-request-principal.sql','t19-standard-lease-recovery.sql'])await db.exec(await readFile(new URL('../database/'+name,import.meta.url),'utf8'));
 for(const c of f.records){
  await db.query("insert into private_t19_standard.backend_businesses values($1,$2,'staging',true,$3,$4)",[machine,c.businessId,c.organizationId,c.apiDomain]);
  await db.query("insert into private_t19_standard.connections values('staging',$1,$2,$3,$4,$5,$6,'connected',$7,$8)",[c.businessId,c.connectionId,c.generation,c.organizationId,c.apiDomain,c.clientId,JSON.stringify(c.envelope),JSON.stringify({name:'SYNTHETIC TEST',currency:'ZAR'})]);
 }
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:machine,session_id:session,role:'authenticated'})]);
 let lose=true,writes=0;
 const rpc=async(name,args)=>{
  assert.equal(name,'t19_standard_store');await db.exec('set role authenticated');let result;
  try{result={data:(await db.query('select public.t19_standard_store($1,$2::jsonb) value',[args.action,JSON.stringify(args.input)])).rows[0].value};}finally{await db.exec('reset role');}
  if(args.action==='refresh'){writes++;if(lose){lose=false;throw Error('synthetic acknowledgement loss');}}return result;
 };
 const options={...f.options,storeFactory:()=>createStandardHttpsStore({rpc})};
 const metadata=()=>db.query('select environment,business_id,connection_id,generation,organization_id,api_domain,client_id,status,organization from private_t19_standard.connections order by business_id');
 const before=(await metadata()).rows;
 await assert.rejects(rewrapStandardCredentials(options),denied);await rewrapStandardCredentials(options);assert.equal(writes,2);assert.deepEqual((await metadata()).rows,before);
 let stored=(await db.query('select business_id,envelope from private_t19_standard.connections')).rows;assert.ok(stored.every(c=>c.envelope.keyId===f.to.keyId));
 await rewrapStandardCredentials({...options,direction:'rollback'});assert.equal(writes,4);assert.deepEqual((await metadata()).rows,before);
 stored=(await db.query('select business_id,envelope from private_t19_standard.connections')).rows;
 for(const c of f.records){const actual=stored.find(s=>s.business_id===c.businessId);assert.deepEqual(createTokenCipher(f.config).open(c,actual.envelope),createTokenCipher(f.config).open(c,c.envelope));}
 assert.equal(Number((await db.query('select count(*) n from private_t19_standard.operation_leases where not released')).rows[0].n),0);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:randomUUID(),session_id:session,role:'authenticated'})]);
 await assert.rejects(rewrapStandardCredentials(options),denied);assert.equal(writes,4);
});
test('lease takeover fences the remaining member and recovery waits for a fresh valid lease',linux,async t=>{
 const f=await fixture(t);f.setWriteHook(c=>{const other=f.records.find(r=>r.businessId!==c.businessId).businessId;f.leases.set(other,'synthetic-takeover');});
 await assert.rejects(rewrapStandardCredentials(f.options),denied);assert.equal(f.actions.filter(a=>a==='refresh').length,1);
 // Fixture models lease expiry/grace; the real coordinator never clears someone else's lease.
 f.leases.clear();f.setWriteHook(()=>{});await rewrapStandardCredentials(f.options);assert.equal(f.actions.filter(a=>a==='refresh').length,2);
});
test('production keys, reused keys and shared store contexts are refused before publication',linux,async t=>{
 const f=await fixture(t);
 await assert.rejects(rewrapStandardCredentials({...f.options,toConfig:{...f.to,environment:'production'}}),denied);
 await assert.rejects(rewrapStandardCredentials({...f.options,toConfig:{key:f.config.key,keyId:'different-name'}}),denied);
 const shared=f.options.storeFactory();await assert.rejects(rewrapStandardCredentials({...f.options,storeFactory:()=>shared}),denied);
 assert.equal(f.actions.filter(a=>a==='refresh').length,0);
});
