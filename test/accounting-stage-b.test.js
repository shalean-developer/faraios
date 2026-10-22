import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {fixture,id,A,B,ownerA,ownerB,managerB,staff,platform,shared} from '../test-support/accounting-stage-b.mjs';
import {createSyntheticVault,createSyntheticProvider,createSyntheticAccountingWorker,createAccountingStageBApi} from '../src/accounting-stage-b.js';

async function contracts(t,native){
 const f=await fixture({native});t.after(()=>f.close());const s=f.store;
 const ca=await s.user(ownerA,'connect',[A,'synthetic-a']),cb=await s.user(ownerB,'connect',[B,'synthetic-b']);
 const vault=createSyntheticVault(),provider=createSyntheticProvider(),worker=createSyntheticAccountingWorker({store:s,vault,provider});
 const a=()=>s.read(ownerA,A,'connections').then(x=>x[0]),b=()=>s.read(ownerB,B,'connections').then(x=>x[0]);
 vault.provision(await a(),{broad:true});vault.provision(await b(),{broad:true});
 let seq=100;
 async function enqueue(biz=A,user=ownerA,cid=ca,generation=1){const local=id(seq++);await s.user(user,'register_intent',[biz,local,12345]);return s.user(user,'enqueue',[biz,cid,generation,local]);}
 const state=async(oid)=> (await s.read(ownerA,A,'operations')).find(x=>x.id===oid);
 await t.test('RLS and function ACLs deny foreign members, staff, platform and fabricated worker completion',async()=>{
  for(const user of [ownerB,managerB,staff,platform]){
   assert.deepEqual(await s.read(user,A,'connections'),[]);
   await assert.rejects(s.user(user,'connect',[A,'synthetic-forged']),{code:'42501'});
  }
  assert.equal((await s.read(shared,A,'connections')).length,1);assert.equal((await s.read(shared,B,'connections')).length,1);
  await assert.rejects(s.user(managerB,'change_connection',[B,cb,1,'disconnect']),{code:'42501'});
  await assert.rejects(f.query('select to_jsonb(t19_local.allowed($1,$2,true)) as value',[A,ownerA],{role:'authenticated',user:ownerB}),{code:'42501'});
  await assert.rejects(f.query('select to_jsonb(t19_local.claim($1,$2)) as value',[A,id(999)],{role:'authenticated',user:ownerA}),{code:'42501'});
  await assert.rejects(f.query('select to_jsonb(t19_local.connect($1,$2)) as value',[A,'synthetic-c'],{role:'service_role'}),{code:'42501'});
  await assert.rejects(f.query('select to_jsonb(count(*)) as value from t19_local.connections',[],{role:'anon'}),{code:'42501'});
  await assert.rejects(f.query('update t19_local.connections set organization_id=$1 where id=$2 returning to_jsonb(id) as value',['synthetic-b',ca],{role:'authenticated',user:ownerA}),{code:'42501'});
  await assert.rejects(s.user(ownerB,'enqueue',[B,ca,1,id(777)]),{code:'42501'});
  await assert.rejects(s.user(ownerA,'connect',[A,'943440851']),{code:'23514'});
  await assert.rejects(s.user(ownerA,'change_connection',[A,ca,null,'disconnect']),{code:'40001'});
  await assert.rejects(f.exec(`insert into t19_local.operations(business_id,connection_id,generation,local_id,request_hash,created_by) values('${B}','${ca}',1,'${id(999)}','fake','${ownerB}');`),{code:'23503'});
 });
 await t.test('concurrent enqueue returns one durable identity and forged worker contexts fail before egress',async()=>{
  const local=id(seq++);await s.user(ownerA,'register_intent',[A,local,12345]);
  const queued=await Promise.all([s.user(ownerA,'enqueue',[A,ca,1,local]),s.user(ownerA,'enqueue',[A,ca,1,local])]);assert.equal(queued[0],queued[1]);
  const before=provider.calls.length;
  const forged=createSyntheticAccountingWorker({vault,provider,store:{worker:async(name,params)=>{const c=await s.worker(name,params);return {...c,connection:{...c.connection,business_id:B}};}}});
  await assert.rejects(forged.run(A,queued[0]));assert.equal(provider.calls.length,before);
 });
 await t.test('broad fake token still routes only to server-pinned business and immutable intent',async()=>{
  const oid=await enqueue();await assert.rejects(worker.run(B,oid),{code:'42501'});assert.equal(provider.calls.length,0);
  assert.equal(await worker.run(A,oid),'verified');assert.equal(provider.calls[0].organization_id,'synthetic-a');
  const op=await state(oid);assert.equal(op.receipt.amount_cents,12345);
  assert.equal(await s.user(ownerA,'enqueue',[A,ca,1,op.local_id]),oid);
  await assert.rejects(s.user(ownerA,'register_intent',[A,op.local_id,999]),{code:'22023'});
  await assert.rejects(worker.run(A,oid),{code:'40001'});assert.equal(provider.calls.filter(x=>x.action==='create').length,1);
  assert.equal(await worker.run(B,await enqueue(B,managerB,cb)),'verified');assert.equal(provider.calls.at(-1).organization_id,'synthetic-b');
  assert.ok((await s.read(ownerA,A,'events')).some(e=>e.kind==='verified'&&e.executor_role==='t19_worker'&&e.actor===ownerA));
 });
 await t.test('lost responses reconcile original identity without creating again; missing matches stay uncertain',async()=>{
  const oid=await enqueue();provider.setFaultForTest('lost_response');assert.equal(await worker.run(A,oid),'uncertain');
  provider.setFaultForTest('missing');assert.equal(await worker.run(A,oid),'uncertain');
  provider.setFaultForTest(null);assert.equal(await worker.run(A,oid),'verified');
  assert.equal(provider.calls.filter(x=>x.action==='create'&&x.operation_id===oid).length,1);
  assert.equal(provider.calls.filter(x=>x.action==='read'&&x.operation_id===oid).length,2);
 });
 await t.test('concurrent claims, expired leases and stale finishes cannot replay dispatch',async()=>{
  const oid=await enqueue();const results=await Promise.allSettled([s.worker('claim',[A,oid]),s.worker('claim',[A,oid])]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected').length,1);
  const claim=results.find(x=>x.status==='fulfilled').value;
  await s.worker('dispatch',[A,oid,claim.operation.attempt_id]);
  await f.exec(`update t19_local.operations set lease_until=clock_timestamp()-interval '1 second' where id='${oid}';`);
  const retry=await s.worker('claim',[A,oid]);assert.equal(retry.mode,'reconcile');
  await assert.rejects(s.worker('finish',[A,oid,claim.operation.attempt_id,'uncertain',null]),{code:'40001'});
  await s.worker('dispatch',[A,oid,retry.operation.attempt_id]);assert.equal(await s.worker('finish',[A,oid,retry.operation.attempt_id,'uncertain',null]),'uncertain');
  await assert.rejects(s.worker('finish',[A,oid,retry.operation.attempt_id,'uncertain',null]),{code:'40001'});
  await assert.rejects(s.worker('finish',[A,oid,null,'uncertain',null]),{code:'40001'});
 });
 await t.test('HTTP uses trusted sessions and real DB roles; forged org/role fields never reach worker',async()=>{
  const sessions=new Map([['owner-a',ownerA],['manager-b',managerB],['staff',staff],['platform',platform]]);
  const api=createAccountingStageBApi({resolveSession:req=>sessions.get(req.headers.authorization),store:s,origin:'http://127.0.0.1:1'});
  api.listen(0,'127.0.0.1');await once(api,'listening');const origin=`http://127.0.0.1:${api.address().port}`;
  try{
   const get=(user,biz,route='connections')=>fetch(`${origin}/accounting/${biz}/${route}`,{headers:{Authorization:user}});
   assert.equal((await get('unknown',A)).status,401);
   for(const user of ['manager-b','staff','platform'])assert.equal((await get(user,A)).status,403);
   assert.equal((await get('owner-a',A)).status,200);
   const post=(user,biz,route,data)=>fetch(`${origin}/accounting/${biz}/${route}`,{method:'POST',headers:{Authorization:user,Origin:'http://127.0.0.1:1','Content-Type':'application/json'},body:JSON.stringify(data)});
   assert.equal((await post('manager-b',B,'disconnect',{connection_id:cb,generation:1})).status,403);
   const before=provider.calls.length;
   assert.equal((await post('owner-a',A,'enqueue',{connection_id:ca,generation:1,local_id:id(500),organization_id:'synthetic-b'})).status,400);
   assert.equal((await post('owner-a',A,'intent',{local_id:id(500),amount_cents:1,role:'owner'})).status,400);
   assert.equal((await post('owner-a',A,'intent',{local_id:id(500),amount_cents:1})).status,200);
   assert.equal((await post('owner-a',A,'enqueue',{connection_id:cb,generation:1,local_id:id(500)})).status,403);
   assert.equal((await post('owner-a',A,'enqueue',{connection_id:ca,generation:1,local_id:id(500)})).status,200);
   assert.equal(provider.calls.length,before);
  }finally{api.closeAllConnections();await new Promise(resolve=>api.close(resolve));}
 });
 await t.test('membership revocation fences a previously valid queued actor',async()=>{
  const oid=await enqueue(A,shared);await f.exec(`update public.business_memberships set status='suspended' where business_id='${A}' and user_id='${shared}';`);
  await assert.rejects(worker.run(A,oid),{code:'42501'});assert.deepEqual(await s.read(shared,A,'operations'),[]);
 });
 await t.test('disconnect before dispatch stops egress; immutable generation and historical operation prevent replay',async()=>{
  const oid=await enqueue(),before=provider.calls.length;
  await assert.rejects(worker.run(A,oid,{beforeDispatch:()=>s.user(ownerA,'change_connection',[A,ca,1,'disconnect'])}),{code:'40001'});
  assert.equal(provider.calls.length,before);assert.equal((await state(oid)).state,'cancelled');
  await assert.rejects(s.user(ownerA,'change_connection',[A,ca,1,'reauthorise']),{code:'40001'});
  assert.equal(await s.user(ownerA,'change_connection',[A,ca,2,'reauthorise']),3);
  await assert.rejects(s.user(ownerA,'enqueue',[A,ca,3,(await state(oid)).local_id]),{code:'40001'});
  assert.equal((await s.read(ownerA,A,'generations')).length,3);
  await assert.rejects(f.exec(`update t19_local.generations set reason='connect' where connection_id='${ca}';`));
  await assert.rejects(f.exec(`update t19_local.connections set organization_id='synthetic-new' where id='${ca}';`));
  vault.provision(await a(),{broad:true});
 });
 await t.test('disconnect after dispatch keeps late success uncertain; reauthorisation cannot move it',async()=>{
  const oid=await enqueue(A,ownerA,ca,3);
  assert.equal(await worker.run(A,oid,{afterDispatch:()=>s.user(ownerA,'change_connection',[A,ca,3,'disconnect'])}),'uncertain');
  assert.equal((await state(oid)).receipt,null);assert.ok((await s.read(ownerA,A,'events')).some(e=>e.kind==='late_receipt_review_required'&&e.evidence?.operation_id===oid));
  assert.equal(await s.user(ownerA,'change_connection',[A,ca,4,'reauthorise']),5);
  await assert.rejects(worker.run(A,oid),{code:'40001'});vault.provision(await a(),{broad:true});
 });
 await t.test('wrong organisation receipt quarantines connection and leaves no verified foreign receipt',async()=>{
  const oid=await enqueue(A,ownerA,ca,5);provider.setFaultForTest('mismatch');assert.equal(await worker.run(A,oid),'review_required');
  assert.equal((await a()).status,'quarantined');assert.equal((await state(oid)).receipt,null);
  await assert.rejects(s.user(ownerA,'change_connection',[A,ca,5,'reauthorise']),{code:'55000'});
  assert.equal(await s.user(ownerA,'change_connection',[A,ca,5,'disconnect']),6);
  await assert.rejects(s.user(ownerA,'change_connection',[A,ca,6,'reauthorise']),{code:'55000'});
  assert.deepEqual(await s.read(ownerB,A,'events'),[]);
  await assert.rejects(f.exec(`delete from t19_local.events where business_id='${A}';`),{code:'42501'});
 });
 await t.test('duplicate provider matches require review and never retry synthetic creation',async()=>{
  const oid=await enqueue(B,ownerB,cb,1);provider.setFaultForTest('lost_response');assert.equal(await worker.run(B,oid),'uncertain');
  provider.setFaultForTest('duplicates');assert.equal(await worker.run(B,oid),'review_required');
  assert.equal(provider.calls.filter(c=>c.operation_id===oid&&c.action==='create').length,1);
  assert.equal((await b()).status,'quarantined');
 });
 if(native)await t.test('held native locks prove claim exclusion and both generation/dispatch race orderings',async()=>{
  const C=id(30);await f.exec(`insert into public.businesses(id,name,industry) values('${C}','Synthetic C','cleaning');insert into public.business_memberships(business_id,user_id,role) values('${C}','${ownerA}','owner');`);
  const cid=await s.user(ownerA,'connect',[C,'synthetic-c']);
  const queue=async(n,g)=>{await s.user(ownerA,'register_intent',[C,id(n),100]);return s.user(ownerA,'enqueue',[C,cid,g,id(n)]);};
  const oid=await queue(700,1),pause=()=>new Promise(r=>setTimeout(r,25));
  async function race(held,contending,expectedCode){
   const child=spawn(process.env.T19_PSQL??'psql',f.args,{windowsHide:true});let output='',errors='';
   child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>errors+=d);
   const closed=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve(code));});
   try{
    child.stdin.write(`begin;${held};select 'T19_HELD';\n`);
    for(let n=0;n<200&&!output.includes('T19_HELD');n++)await pause();assert.match(output,/T19_HELD/,errors);
    const contender=f.nativeRun(`begin;set local lock_timeout='8s';${contending};commit;`,{name:'t19_contender'}).then(value=>({value}),error=>({error}));
    let blocked=false;
    for(let n=0;n<100&&!blocked;n++){
     blocked=await f.query("select to_jsonb(count(*)>0) as value from pg_stat_activity where application_name='t19_contender' and wait_event_type='Lock'");if(!blocked)await pause();
    }
    assert.equal(blocked,true,'Independent contender must actually wait on a database lock');
    child.stdin.end('commit;\n');assert.equal(await closed,0,errors);
    const result=await contender;if(expectedCode)assert.equal(result.error?.code,expectedCode);else assert.equal(result.error,undefined);
   }finally{if(child.exitCode===null){child.stdin.end('rollback;\n');child.kill();}}
  }
  await race(`set local role t19_worker;select t19_local.claim('${C}','${oid}')`,`set local role t19_worker;select t19_local.claim('${C}','${oid}')`,'40001');
  const claimed=(await s.read(ownerA,C,'operations')).find(o=>o.id===oid);
  const asOwner=`set local role authenticated;set local request.jwt.claim.sub='${ownerA}';`;
  await race(`${asOwner}select t19_local.change_connection('${C}','${cid}',1,'reauthorise')`,`set local role t19_worker;select t19_local.dispatch('${C}','${oid}','${claimed.attempt_id}')`,'40001');
  assert.equal((await s.read(ownerA,C,'operations')).find(o=>o.id===oid).state,'cancelled');
  const second=await queue(701,2),claim=await s.worker('claim',[C,second]);
  await race(`set local role t19_worker;select t19_local.dispatch('${C}','${second}','${claim.operation.attempt_id}')`,`${asOwner}select t19_local.change_connection('${C}','${cid}',2,'disconnect')`);
  assert.equal(await s.worker('finish',[C,second,claim.operation.attempt_id,'uncertain',null]),'uncertain');
 });
}
test('Stage B synthetic database/API/worker contracts',{timeout:120000},t=>contracts(t,false));
test('Stage B native PostgreSQL roles, HTTP, concurrent claims and disconnect contracts',{skip:!process.env.T19_TEST_DATABASE_URL,timeout:180000},t=>contracts(t,true));
test('synthetic vault authenticates tenant/generation context, coalesces refresh and has no real-secret input',async()=>{
 let now=1000;const vault=createSyntheticVault({now:()=>now});
 const a={id:id(100),business_id:A,generation:1,organization_id:'synthetic-a',provider:'synthetic',environment:'synthetic',region:'local'};
 const b={...a,id:id(200),business_id:B,organization_id:'synthetic-b'};
 vault.provision(a,{broad:true});const ctx=c=>({connection_id:c.id,...c});
 await Promise.all(Array.from({length:10},()=>vault.access(ctx(a))));assert.equal(vault.refreshes,1);
 now+=60000;await vault.access(ctx(a));assert.equal(vault.refreshes,2);
 vault.copyEnvelopeForTest(a,b);await assert.rejects(vault.access(ctx(b)));
 await assert.rejects(vault.access(ctx({...a,generation:2})));
 vault.invalidate(a);await assert.rejects(vault.access(ctx(a)));
 assert.throws(()=>vault.provision({...a,provider:'zoho_books'}));
 assert.throws(()=>createSyntheticAccountingWorker({store:{},vault,provider:{}}));
});
