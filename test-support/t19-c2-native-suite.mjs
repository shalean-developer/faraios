// Explicit runner only: never silently substitute an in-process database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir,readdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {fixture,A,B,ownerA,ownerB,staff,platform,sqlArgs} from './accounting-stage-b.mjs';
import {nativeClient,diskDummyCustody,runFakeRefresh} from './t19-c2-native.mjs';

test('C2 native PostgreSQL proof (dummy only)',{timeout:120000},async t=>{
 assert.ok(process.env.T19_C2_ROOT,'Use the disposable C2 runner');
 const f=await fixture({native:true});
 await f.exec("set faraios.c2='synthetic';"+await readFile(new URL('./t19-c2-proof.sql',import.meta.url),'utf8'));
 await f.exec(`create role c2_worker_a login nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
 create role c2_worker_b login nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
 grant usage on schema c2 to c2_worker_a,c2_worker_b;
 grant execute on function c2.step(text,jsonb,uuid,uuid,uuid,bigint,uuid,integer) to c2_worker_a,c2_worker_b;
 insert into c2.workers values('c2_worker_a','${A}','synthetic'),('c2_worker_b','${B}','synthetic');`);
 const url=role=>{const u=new URL(process.env.T19_TEST_DATABASE_URL);u.username=role;return u.href;};
 async function setup(){
  const business=randomUUID(),epoch=randomUUID(),root=join(process.env.T19_C2_ROOT,randomUUID());await mkdir(root);
  await writeFile(join(root,'key-1'),randomBytes(32));
  await f.exec(`insert into public.businesses(id,name,industry) values('${business}','Synthetic C2','cleaning');
  insert into public.business_memberships(business_id,user_id,role) values('${business}','${ownerA}','owner');
  update c2.workers set business_id='${business}' where login='c2_worker_a';`);
  const connection=await f.store.user(ownerA,'connect',[business,'synthetic-'+randomUUID()]);
  const c=(await f.store.read(ownerA,business,'connections'))[0];
  const binding={business_id:business,environment:'synthetic',provider:'synthetic',connection_id:connection,generation:1,organization_id:c.organization_id,credential_version:1};
  const local=randomUUID();await f.store.user(ownerA,'register_intent',[business,local,123]);
  const job=await f.store.user(ownerA,'enqueue',[business,connection,1,local]);
  const custody=diskDummyCustody(root),reference=await custody.seal(binding,{refresh_token:'dummy-'+randomUUID()},1,epoch);
  await custody.advance(binding,epoch,null);
  await f.exec(sqlArgs('insert into c2.credentials(business_id,connection_id,binding,key_version,epoch,reference) values($1,$2,$3,1,$4,$5)',[business,connection,binding,epoch,reference]));
  const config={url:url('c2_worker_a'),root,binding,job,epoch};
  const db=nativeClient(config.url);
  return {...config,db,custody,reference,config,state:()=>f.query('select to_jsonb(c) from c2.credentials c where connection_id=$1',[connection]),expire:()=>f.exec(`update c2.credentials set deadline=clock_timestamp()-interval '1 second' where connection_id='${connection}'`)};
 }
 function child(config){
  const p=fork(new URL('./t19-c2-child.mjs',import.meta.url),[],{stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  let output='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>output+=d);
  const messages=[],waiters=[];p.on('message',m=>{if(waiters.length)waiters.shift()(m);else messages.push(m);});
  const next=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{p.kill();reject(new Error('Child timed out'));},10000);const done=m=>{clearTimeout(timer);resolve(m);};if(messages.length)done(messages.shift());else waiters.push(done);});
  const exited=once(p,'exit');p.send(config);
  return {p,next,async kill(){p.kill();await exited;assert.equal(output,'');},async finish(){await exited;assert.equal(output,'');}};
 }
 await t.test('native role boundary: tenant, environment, job, browser and table denial',async()=>{
  const s=await setup();
  await assert.rejects(f.exec(sqlArgs("insert into c2.events(business_id,connection_id,fence,kind,executor) values($1,$2,0,'forged','c2_worker_a')",[B,s.binding.connection_id])),{code:'23503'});
  await assert.rejects(nativeClient(url('c2_worker_b')).step('claim',s.binding,s.job,s.epoch),{code:'42501'});
  await assert.rejects(s.db.step('claim',{...s.binding,environment:'staging'},s.job,s.epoch),{code:'42501'});
  await assert.rejects(s.db.step('claim',s.binding,randomUUID(),s.epoch),{code:'42501'});
  for(const table of ['credentials','workers','events'])await assert.rejects(s.db.sql(`select to_jsonb(x) from c2.${table} x`),{code:'42501'});
  await assert.rejects(s.db.sql('set role c2_worker_b;select null'),{code:'42501'});
  for(const user of [ownerB,staff,platform])await assert.rejects(f.query('select c2.step($1,$2,$3,$4)',['claim',s.binding,s.job,s.epoch],{role:'authenticated',user}),{code:'42501'});
  assert.equal((await runFakeRefresh(s.config)).binding.credential_version,2);
 });
 await t.test('full binding, reference, key and ciphertext substitution reject before refresh',async()=>{
  const s=await setup();
  for(const [key,value] of Object.entries({business_id:B,environment:'staging',provider:'zoho',connection_id:randomUUID(),generation:2,organization_id:'synthetic-foreign',credential_version:2})){
   await assert.rejects(s.custody.read({...s.binding,[key]:value},s.reference,1,s.epoch),{code:'custody_rejected'});
  }
  await writeFile(join(s.root,'key-2'),randomBytes(32));
  await assert.rejects(s.custody.read(s.binding,s.reference,2,s.epoch),{code:'custody_rejected'});
  await assert.rejects(s.custody.read(s.binding,s.reference,1,randomUUID()),{code:'custody_rejected'});
  const substituted=randomUUID();await writeFile(join(s.root,substituted+'.envelope'),await readFile(join(s.root,s.reference+'.envelope')));
  await assert.rejects(s.custody.read(s.binding,substituted,1,s.epoch),{code:'custody_rejected'});
  await writeFile(join(s.root,s.reference+'.envelope'),'{}');await assert.rejects(runFakeRefresh(s.config),{code:'custody_rejected'});
  assert.equal((await s.state()).phase,'idle');
 });
 await t.test('independent worker processes: one claim and one durable dispatch',async()=>{
  const s=await setup(),one=child({...s.config,pause:'claimed'});await one.next();
  const two=child(s.config);assert.deepEqual(await two.next(),{ok:false,code:'55000'});await two.finish();
  one.p.send({resume:true});assert.equal((await one.next()).ok,true);await one.finish();
  assert.equal(await f.query("select to_jsonb(count(*)) from c2.events where connection_id=$1 and kind='dispatch'",[s.binding.connection_id]),1);
 });
 await t.test('simultaneous independent contenders never double-dispatch',async()=>{
  const s=await setup(),one=child(s.config),two=child(s.config);
  const results=await Promise.all([one.next(),two.next()]);await Promise.all([one.finish(),two.finish()]);
  assert.equal(results.filter(x=>x.ok).length,1);assert.ok(['40001','55000'].includes(results.find(x=>!x.ok).code));
  assert.equal(await f.query("select to_jsonb(count(*)) from c2.events where connection_id=$1 and kind='dispatch'",[s.binding.connection_id]),1);
 });
 for(const phase of ['claimed','dispatched','received','sealed','marked','published'])await t.test(`worker death at ${phase}: explicit restart semantics`,async()=>{
  const s=await setup(),p=child({...s.config,pause:phase}),message=await p.next();assert.equal(message.phase,phase);await p.kill();
  if(phase==='claimed'){
   await s.expire();const done=await runFakeRefresh(s.config);assert.equal(done.binding.credential_version,2);assert.equal((await s.state()).fence,2);
  }else if(phase==='published'){
   const next={...s.binding,credential_version:2};
   const state=await s.db.step('published',next,s.job,s.epoch,message.attempt);assert.equal(state.binding.credential_version,2);
   await s.custody.read(next,state.reference,1,s.epoch);
   await assert.rejects(runFakeRefresh(s.config),{code:'40001'});
  }else{
   await s.expire();await assert.rejects(runFakeRefresh(s.config),{code:phase==='marked'?'rollback_hold':'55000'});
   assert.equal((await s.state()).phase,'dispatched');
   if(phase==='sealed')assert.equal((await readdir(s.root)).filter(x=>x.endsWith('.envelope')).length,2);
  }
 });
 await t.test('hung fake transport and invalid grant settle and block retries',async()=>{
  for(const [mode,phase,code] of [['hang','recovery_required','timeout'],['invalid_grant','reauthorisation_required','reauthorisation_required'],['expired','recovery_required','expired_result']]){
   const s=await setup(),start=performance.now();await assert.rejects(runFakeRefresh({...s.config,mode}),{code});
   assert.ok(performance.now()-start<6000);assert.equal((await s.state()).phase,phase);
   await assert.rejects(runFakeRefresh(s.config),{code:'55000'});
  }
 });
 await t.test('DB-clock lease fencing rejects stale resumed process',async()=>{
  const s=await setup(),p=child({...s.config,pause:'claimed'});const old=await p.next();await s.expire();
  const winner=await runFakeRefresh(s.config);p.p.send({resume:true});assert.equal((await p.next()).ok,false);await p.finish();
  assert.equal(winner.binding.credential_version,2);
  await assert.rejects(s.db.step('publish',s.binding,s.job,s.epoch,old.attempt,old.fence,randomUUID(),1),{code:'40001'});
 });
 await t.test('revocation before dispatch and disconnect/reauthorisation after dispatch fence results',async()=>{
  let s=await setup();
  await assert.rejects(runFakeRefresh({...s.config,checkpoint:async phase=>{if(phase==='claimed')await f.exec(`update public.business_memberships set status='suspended' where business_id='${s.binding.business_id}'`);}}),{code:'42501'});
  assert.equal((await s.state()).phase,'claimed');
  s=await setup();
  await assert.rejects(runFakeRefresh({...s.config,checkpoint:async phase=>{if(phase==='received'){
   await f.store.user(ownerA,'change_connection',[s.binding.business_id,s.binding.connection_id,1,'disconnect']);
   await f.store.user(ownerA,'change_connection',[s.binding.business_id,s.binding.connection_id,2,'reauthorise']);
  }}}),{code:'42501'});
  assert.equal((await s.state()).binding.credential_version,1);assert.equal((await s.state()).phase,'dispatched');
 });
 await t.test('custody outage/missing staged version and ambiguous publication stay fail closed',async()=>{
  let s=await setup();await rename(join(s.root,'key-1'),join(s.root,'key-offline'));
  await assert.rejects(runFakeRefresh(s.config),{code:'custody_rejected'});assert.equal((await s.state()).phase,'idle');
  s=await setup();
  const done=await runFakeRefresh(s.config),state=await s.state();
  await rename(join(s.root,state.reference+'.envelope'),join(s.root,'orphan.envelope'));
  await assert.rejects(runFakeRefresh({...s.config,binding:done.binding}),{code:'custody_rejected'});
  assert.equal((await s.state()).phase,'idle');
 });
 await t.test('missing envelope before publish holds; dummy key rewrap preserves grant version',async()=>{
  let s=await setup();
  await assert.rejects(runFakeRefresh({...s.config,checkpoint:async(phase,lease)=>{if(phase==='sealed')await rename(join(s.root,lease.attempt+'.envelope'),join(s.root,'quarantined.envelope'));}}),{code:'custody_rejected'});
  assert.equal((await s.state()).phase,'recovery_required');assert.equal((await s.state()).binding.credential_version,1);
  s=await setup();const m=await s.custody.read(s.binding,s.reference,1,s.epoch);
  await writeFile(join(s.root,'key-2'),randomBytes(32));const ref=await s.custody.seal(s.binding,m,2,s.epoch);
  // Test custodian action only, not a worker rotation API or provider reauthorisation.
  await f.exec(sqlArgs('update c2.credentials set key_version=2,reference=$1 where connection_id=$2',[ref,s.binding.connection_id]));
  assert.equal((await s.state()).binding.credential_version,1);
  assert.deepEqual(await s.custody.read(s.binding,ref,2,s.epoch),m);
  assert.equal((await runFakeRefresh(s.config)).binding.credential_version,2);
 });
 await t.test('restored older metadata is denied by retained external version/epoch evidence',async()=>{
  const s=await setup(),old=await s.state();await runFakeRefresh(s.config);
  // Simulate DB snapshot rollback only; the independently retained dummy watermark remains newer.
  await f.exec(sqlArgs("update c2.credentials set binding=$1,reference=$2,phase='idle',published_attempt=null where connection_id=$3",[old.binding,old.reference,s.binding.connection_id]));
  await assert.rejects(runFakeRefresh(s.config),{code:'rollback_hold'});
  await assert.rejects(s.db.step('claim',s.binding,s.job,randomUUID()),{code:'40001'});
  await writeFile(join(s.root,s.binding.connection_id+'.watermark'),'{}');
  await assert.rejects(runFakeRefresh(s.config),{code:'rollback_hold'});
 });
 await t.test('audit contains metadata only and cannot be rewritten by worker',async()=>{
  const events=await f.query('select jsonb_agg(to_jsonb(e)) from c2.events e');
  assert.ok(events.length>0);assert.doesNotMatch(JSON.stringify(events),/dummy-|refresh_token|access_token|nonce|body|tag/);
  const s=await setup();await assert.rejects(s.db.sql("update c2.events set kind='forged';select null"),{code:'42501'});
 });
});
