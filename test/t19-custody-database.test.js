import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {invoiceFixture} from '../test-support/t19-runtime-fixture.mjs';
import {createCustodyDatabase} from '../src/t19-custody-database.js';
import {createRestrictedCustodyCore} from '../src/t19-restricted-custody-core.js';
import {createCustodyInvoiceRunner} from '../src/t19-custody-invoices.js';
import {createOwnerOAuth} from '../src/t19-owner-oauth.js';
import {createAccountingHandler} from '../src/t19-accounting-api.js';
import {createAccountingWorker} from '../src/t19-accounting-worker.js';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {Client} from 'pg';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const a=id(10),b=id(20),owner=id(1),manager=id(2),machine=id(900),ca=id(901),cb=id(902);
async function setup(t){
 const f=await invoiceFixture(),db=f.db;t.after(()=>db.close());
 // PostgreSQL-backed test substitute ONLY: does not prove Supabase Vault encryption.
 await db.exec(`create schema vault;create table vault.test_secrets(id uuid primary key default gen_random_uuid(),decrypted_secret text);
 create view vault.decrypted_secrets as select * from vault.test_secrets;
 create function vault.create_secret(secret text,name text default null,description text default null) returns uuid language plpgsql security definer as $$declare r uuid;begin insert into vault.test_secrets(decrypted_secret) values(secret) returning id into r;return r;end$$;
 set faraios.t19_02_approved_project_ref='xdmfyrsauvqznkloroxg';`);
 await db.exec(await readFile(new URL('../docs/proposals/t19-02-staging-inactive-schema.sql',import.meta.url),'utf8'));
 await db.exec("set faraios.t19_runtime_review='approved-source-test';"+await readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8'));
 for(const file of ['t19-custody-oauth.sql','t19-custody-api.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query('insert into private_t19_custody.machines values($1,$2,true)',[machine,'a'.repeat(64)]);
 await db.query('insert into private_t19_custody.machine_businesses values($1,$2,true),($1,$3,true)',[machine,a,b]);
 const bindings=[];
 for(const [biz,cid,org] of [[a,ca,'111'],[b,cb,'222']]){
  await f.as(owner,()=>f.configure(biz,org));
  const binding={business_id:biz,connection_id:cid,environment:'staging',provider:'zoho',organization_id:org,generation:1,credential_version:1};bindings.push(binding);
  const material={binding,refresh_token:'test-refresh',api_domain:'https://www.zohoapis.com',client_id:'test-client',client_secret:'test-secret'};
  const ref=(await db.query('select vault.create_secret($1) id',[JSON.stringify(material)])).rows[0].id;
  await db.query(`insert into private_t19_custody.connections(connection_id,business_id,environment,provider,organization_id,generation,credential_version,sealed_reference,enabled,status,api_domain)
   values($1,$2,'staging','zoho',$3,1,1,$4,true,'connected','https://www.zohoapis.com')`,[cid,biz,org,ref]);
 }
 const query=async(sql,params)=>{await db.exec('set session authorization t19_hosted_custody');try{return await db.query(sql,params);}finally{await db.exec('set session authorization postgres');}};
 const api=createCustodyDatabase({query});
 const enqueue=(biz,cid,invoice=null,who=owner)=>f.as(who,()=>db.query('select private_t19_custody.enqueue($1,$2,$3,$4) id',[biz,cid,invoice,invoice?'123':null])).then(r=>r.rows[0].id);
 return {...f,api,bindings,enqueue,query};
}
test('runtime SQL and concrete adapter preserve scoped durable refresh publication and denial',async t=>{
 const f=await setup(t),{db,api,bindings:[binding]}=f;
 await assert.rejects(f.enqueue(a,ca,null,manager));
 await assert.rejects(f.as(owner,()=>db.query('select private_t19_custody.runtime($1,$2)', ['pending','{}'])),{code:'42501'});
 const operationId=await f.enqueue(a,ca),adapters=api.operation(machine,operationId);
 assert.equal((await api.findMachineByFingerprint('a'.repeat(64))).id,machine);
 const auth=await api.resolveAuthorizedOperation({machineId:machine,operationId,action:'refresh'});
 assert.equal(auth.binding.business_id,a);
 await assert.rejects(api.resolveAuthorizedOperation({machineId:id(999),operationId,action:'refresh'}));
 await assert.rejects(adapters.coordinator.current({...binding,business_id:b}));
 const core=createRestrictedCustodyCore({...adapters,authorize:async()=>true,provider:{refresh:async()=>({kind:'success'})}});
 assert.equal((await core.refresh({binding,operationId,principal:machine})).status,'completed');
 const c=(await db.query('select * from private_t19_custody.connections where connection_id=$1',[ca])).rows[0];
 assert.equal(Number(c.credential_version),2);
 assert.equal(Number((await db.query('select credential_version from private_t19_custody.connections where connection_id=$1',[cb])).rows[0].credential_version),1);
 await assert.rejects(adapters.coordinator.current(binding));
 await db.exec('set session authorization t19_hosted_custody');
 try{await assert.rejects(db.query('select * from vault.decrypted_secrets'),{code:'42501'});await assert.rejects(db.query('update private_t19_custody.connections set enabled=true'),{code:'42501'});}finally{await db.exec('set session authorization postgres');}
});
test('durable owner OAuth consumes state once and keeps independent organisation/identity bindings',async t=>{
 const f=await setup(t),{db}=f;let exchanges=0;
 for(const [business,connection,org] of [[a,ca,'111'],[b,cb,'222']]){
  await f.as(owner,()=>db.query('select private_t19_custody.disconnect($1,$2,1)',[business,connection]));
  const ref=(await db.query('select vault.create_secret($1) id',[JSON.stringify({business_id:business,organization_id:org,environment:'staging',client_id:'client-'+org,client_secret:'test-secret'})])).rows[0].id;
  await db.query(`insert into private_t19_custody.oauth_clients values($1,$2,'https://accounting.test.invalid/accounting/zoho/callback','owner@test.invalid','123','456','ZAR','test-only-reviewed-role',true)`,[connection,ref]);
 }
 let wrongOrg=false;
 const oauth=createOwnerOAuth({query:f.query,sessions:{read:async sid=>({userId:sid==='manager-session'?manager:owner})},fetchImpl:async(url,options)=>{
  const u=new URL(url);let value;
  if(u.pathname.endsWith('/revoke')){assert.equal(u.search,'');assert.ok(options.body.get('token'));value={status:'success'};}
  else if(u.pathname.endsWith('/token')){exchanges++;const org=options.body.get('client_id').split('-')[1];value={access_token:'token-'+org,refresh_token:'test-refresh-'+org,api_domain:'https://www.zohoapis.com',token_type:'Bearer',expires_in:3600};}
  else if(u.pathname.endsWith('/organizations'))value={code:0,organizations:[{organization_id:u.searchParams.get('organization_id')}]};
  else if(u.pathname.includes('/organizations/'))value={code:0,organization:{organization_id:wrongOrg?'999':u.pathname.split('/').at(-1),is_org_active:true,currency_code:'ZAR'}};
  else if(u.pathname.endsWith('/users'))value={code:0,users:[{is_current_user:true,user_id:'123',role_id:'456',email:'owner@test.invalid',status:'active'}],page_context:{has_more_page:false}};
  else value={code:0,[u.pathname.split('/').at(-1)]:[]};
  return new Response(JSON.stringify(value),{status:200});
 }});
 await assert.rejects(oauth.begin('owner-session',{businessId:a,connectionId:ca}));
 await assert.rejects(oauth.revoke('manager-session',{businessId:a,connectionId:ca,generation:1}));
 assert.deepEqual(await oauth.revoke('owner-session',{businessId:a,connectionId:ca,generation:1}),{providerRevoked:true});
 await assert.rejects(oauth.revoke('owner-session',{businessId:a,connectionId:ca,generation:1}));
 await oauth.revoke('owner-session',{businessId:b,connectionId:cb,generation:1});
 await assert.rejects(oauth.begin('manager-session',{businessId:a,connectionId:ca}));assert.equal(exchanges,0);
 const started=await oauth.begin('owner-session',{businessId:a,connectionId:ca}),state=new URL(started.authorizationUrl).searchParams.get('state');
 await assert.rejects(oauth.callback('different-session',{state,code:'dummy-code'}));assert.equal(exchanges,0);
 assert.equal((await oauth.callback('owner-session',{state,code:'dummy-code'})).status,'connected');
 await assert.rejects(oauth.callback('owner-session',{state,code:'dummy-code'}));assert.equal(exchanges,1);
 const c=(await db.query('select generation,credential_version from private_t19_custody.connections where connection_id=$1',[ca])).rows[0];
 assert.equal(Number(c.generation),3);assert.equal(Number(c.credential_version),1);
 wrongOrg=true;
 const stateB=new URL((await oauth.begin('owner-session',{businessId:b,connectionId:cb})).authorizationUrl).searchParams.get('state');
 await assert.rejects(oauth.callback('owner-session',{state:stateB,code:'dummy-code'}));
 const stateRow=(await db.query('select phase,reference from private_t19_custody.oauth_states where connection_id=$1',[cb])).rows[0];
 assert.equal(stateRow.phase,'cleanup_required');assert.ok(stateRow.reference);
 assert.equal((await db.query('select enabled from private_t19_custody.connections where connection_id=$1',[cb])).rows[0].enabled,false);
 await assert.rejects(oauth.begin('owner-session',{businessId:b,connectionId:cb}));
});
test('disconnect fences dispatch, keeps uncertain recovery and denies a stale duplicate',async t=>{
 const f=await setup(t),{db,api,bindings:[binding]}=f;
 const operationId=await f.enqueue(a,ca),adapters=api.operation(machine,operationId);
 const lease=await adapters.coordinator.claim(binding,operationId);
 await adapters.coordinator.dispatch(binding,lease,async()=>{});
 await f.as(owner,()=>db.query('select private_t19_custody.disconnect($1,$2,1)',[a,ca]));
 await assert.rejects(f.as(owner,()=>db.query('select private_t19_custody.disconnect($1,$2,1)',[a,ca])));
 await adapters.coordinator.fail(binding,lease,'idle');
 assert.equal((await db.query('select phase from private_t19_custody.operations')).rows[0].phase,'recovery_required');
 await assert.rejects(adapters.coordinator.current(binding));
 assert.equal(Number((await db.query('select generation from private_t19_custody.connections where connection_id=$1',[ca])).rows[0].generation),2);
});
test('two business invoices run through durable SQL, scoped refresh and internal provider execution',async t=>{
 const f=await setup(t),{db,api}=f;let refreshes=0,posts=0;
 let loseB=true;
 const records=new Map();
 const fetchImpl=async(url,options)=>{
  const u=new URL(url),org=u.searchParams.get('organization_id');assert.ok(['111','222'].includes(org));
  assert.equal(options.headers.Authorization,'Zoho-oauthtoken test-access-'+org);
  const reply=value=>new Response(JSON.stringify({code:0,...value}),{status:200});
  if(u.pathname.endsWith('/organizations/'+org))return reply({organization:{organization_id:org,currency_code:'ZAR',is_org_active:true}});
  if(u.pathname.endsWith('/contacts/123'))return reply({contact:{contact_id:'123',status:'active',currency_code:'ZAR',contact_name:'Synthetic customer'}});
  if(options.method==='POST'){
   posts++;const body=JSON.parse(options.body),remote=org+'99';
   records.set(remote,{...body,invoice_id:remote,invoice_number:org+'-1',status:'draft',is_emailed:false,currency_code:'ZAR',total:100,
    line_items:body.line_items.map(l=>({...l,item_total:l.quantity*l.rate}))});
   if(org==='222'&&loseB){loseB=false;throw Error('response_lost_after_provider_commit');}
   return reply({invoice:{invoice_id:remote}});
  }
  if(u.pathname.endsWith('/invoices'))return reply({invoices:[...records.values()].filter(r=>r.reference_number===u.searchParams.get('reference_number')),page_context:{has_more_page:false}});
  return reply({invoice:records.get(u.pathname.split('/').at(-1))});
 };
 const runner=createCustodyInvoiceRunner({database:api,authenticateMachine:async()=>({id:machine,active:true}),
  refreshProvider:{refresh:async b=>{refreshes++;return {kind:'success',access_token:'test-access-'+b.organization_id,expires_at:Date.now()+3600000};}},fetchImpl});
 for(const [business,connection,n] of [[a,ca,10],[b,cb,20]]){
  const inv=(await f.as(owner,()=>f.prepare(business,n))).rows[0].id;
  if(business===a){await assert.rejects(f.enqueue(business,connection,inv,manager));await assert.rejects(f.as(manager,()=>db.query('select public.t19_accounting_status($1)',[a])),{code:'42501'});}
  const job=await f.enqueue(business,connection,inv);
  assert.equal(await f.enqueue(business,connection,inv),job);
  if(business===a){
   if(process.env.T19_CUSTODY_NATIVE_URL){
    const clients=[new Client({connectionString:process.env.T19_CUSTODY_NATIVE_URL}),new Client({connectionString:process.env.T19_CUSTODY_NATIVE_URL})];
    try{
     for(const c of clients){await c.connect();await c.query('set session authorization t19_hosted_custody');}
     const claims=await Promise.allSettled(clients.map(c=>c.query('select private_t19_custody.runtime($1,$2)', ['invoice_claim',JSON.stringify({machineId:machine,operationId:job})])));
     assert.equal(claims.filter(x=>x.status==='fulfilled').length,1);assert.equal(claims.filter(x=>x.status==='rejected').length,1);
    }finally{await Promise.all(clients.map(c=>c.end()));}
   }else{await api.operation(machine,job).invoice.claim();await assert.rejects(api.operation(machine,job).invoice.claim());}
   // Simulate process death after claim, BEFORE dispatch; safe retry can create.
   await db.query("update private_t19_custody.jobs set lease_until=clock_timestamp()-interval '1 second' where id=$1",[job]);
   await db.query("update public.business_invoices set attempt_started_at=clock_timestamp()-interval '3 minutes' where id=$1",[inv]);
  }
  const result=await runner.run({}, {operationId:job});
  if(business===b){
   assert.equal(result.status,'review_required');
   await assert.rejects(runner.run({}, {operationId:job}));
   await f.as(owner,()=>db.query('select public.t19_reconcile($1,$2)',[b,job]));
   assert.equal((await runner.run({}, {operationId:job})).status,'matched');
  }else assert.deepEqual(result,{operationId:job,status:'matched'});
  await assert.rejects(runner.run({}, {operationId:job}));
  const totals=(await f.as(owner,()=>db.query('select public.invoice_totals($1) value',[business]))).rows[0].value;
  assert.equal(totals.total_cents,10000);assert.equal(totals.matched_cents,10000);
 }
 assert.equal(refreshes,2);assert.equal(posts,2);
 await db.exec('set role service_role');
 try{await assert.rejects(db.query('select public.finish_invoice_sync($1,$2,$3,$4,$5,$6,$7)',[a,id(1),id(2),owner,'matched','',{}]),{code:'42501'});}finally{await db.exec('reset role');}
});
test('authenticated HTTP rejects foreign business, forged fields, non-owner disconnect and cross-origin writes',async t=>{
 const f=await setup(t),{db}=f;
 const tokens=new Map([['owner',owner],['manager',manager]]);
 const run=async(sid,business,fn,ownerOnly=false)=>{
  const actor=tokens.get(sid);if(!actor)throw Error();
  return f.as(actor,async()=>{
   const memberships=(await db.query('select role from public.business_memberships where business_id=$1 and user_id=$2 and status=$3',[business,actor,'active'])).rows;
   if(!memberships.some(m=>m.role==='owner'||!ownerOnly&&m.role==='manager'))throw Error();
   const client={rpc:async(name,p)=>{const keys={t19_accounting_status:['business'],t19_enqueue_invoice:['business','connection','invoice','customer'],t19_disconnect:['business','connection','expected_generation'],t19_reconcile:['business','operation']}[name];if(!keys)throw Error();
    try{const r=await db.query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) value`,keys.map(k=>p[k]));return {data:r.rows[0].value};}catch(error){return {error};}}};
   return fn(client);
  });
 };
 const sessions={read:async sid=>tokens.has(sid)?{userId:tokens.get(sid)}:null,withInvoices:(s,b,fn)=>run(s,b,fn),withOwner:(s,b,fn)=>run(s,b,fn,true)};
 const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const origin='http://127.0.0.1:'+server.address().port;
 let callbacks=0;
 server.on('request',createAccountingHandler({sessions,oauth:{begin:async()=>({authorizationUrl:'https://accounts.zoho.com/oauth/v2/auth?state=test'}),callback:async sid=>{assert.equal(sid,'owner');callbacks++;}},origin,sessionCookie:'faraios_session'}));
 const request=(who,business,action,body,originHeader=origin)=>fetch(origin+'/accounting/'+business+'/'+action,{redirect:'manual',method:body?'POST':'GET',headers:{Cookie:'faraios_session='+who,Origin:originHeader,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('missing',a,'status')).status,401);
 assert.equal((await request('manager',a,'status')).status,403);
 assert.equal((await request('manager',b,'status')).status,200);
 assert.equal((await request('manager',b,'disconnect',{connection:cb,generation:1})).status,403);
 assert.equal((await request('owner',a,'enqueue',{connection:ca,invoice:id(1),customer:'123',role:'owner'})).status,400);
 assert.equal((await request('owner',a,'disconnect',{connection:ca,generation:1},'https://foreign.test')).status,403);
 assert.equal((await request('owner',a,'disconnect',{connection:ca,generation:1})).status,200);
 assert.equal((await request('owner',a,'status')).status,200);
 const connect=await request('owner',a,'connect',{connection:ca});assert.equal(connect.status,303);
 const cookie=connect.headers.get('set-cookie');assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Path=\/accounting\/zoho\/callback/);assert.match(cookie,/Max-Age=300/);
 const callback=await fetch(origin+'/accounting/zoho/callback?state=test&code=test',{headers:{Cookie:cookie.split(';')[0]}});
 assert.equal(callback.status,200);assert.equal(callbacks,1);assert.match(callback.headers.get('set-cookie'),/Max-Age=0/);
});
test('background pass backs off before dispatch and stops bounded retries with visible failure',async t=>{
 const f=await setup(t),{db,api}=f;let requests=0;
 const inv=(await f.as(owner,()=>f.prepare(a,10))).rows[0].id,job=await f.enqueue(a,ca,inv);
 const authenticateMachine=async()=>({id:machine,active:true});
 const runner=createCustodyInvoiceRunner({database:api,authenticateMachine,
  refreshProvider:{refresh:async()=>({kind:'success',access_token:'test-access',expires_at:Date.now()+3600000})},
  fetchImpl:async(_,o)=>{assert.notEqual(o.method,'POST');requests++;return new Response('{}',{status:429});}});
 const worker=createAccountingWorker({database:api,runner,authenticateMachine});
 for(let n=1;n<=5;n++){
  assert.equal((await worker.runOnce({}))[0].status,'failed');
  const row=(await db.query('select state,error_code,attempts,dispatched from private_t19_custody.jobs where id=$1',[job])).rows[0];
  assert.equal(row.attempts,n);assert.equal(row.dispatched,false);assert.equal(row.error_code,'rate_limited');
  assert.equal(row.state,n<5?'retry':'recovery_required');
  assert.deepEqual(await worker.runOnce({}),[]);
  await db.query("update private_t19_custody.jobs set available_at=clock_timestamp()-interval '1 second' where id=$1",[job]);
 }
 assert.equal(requests,5);
});

test('review regressions: revoked jobs cannot starve other businesses and resolution races are isolated',async t=>{
 const f=await setup(t),{db,api}=f;
 const ia=(await f.as(owner,()=>f.prepare(a,10))).rows[0].id;
 const ib=(await f.as(owner,()=>f.prepare(b,20))).rows[0].id;
 const ja=await f.enqueue(a,ca,ia),jb=await f.enqueue(b,cb,ib);
 await db.query('delete from public.business_memberships where business_id=$1 and user_id=$2',[a,owner]);
 assert.deepEqual(await api.pending(machine),[jb]);
 assert.equal((await api.resolveAuthorizedOperation({machineId:machine,operationId:ja})).authorized,false);
 assert.equal((await db.query('select state from private_t19_custody.jobs where id=$1',[ja])).rows[0].state,'cancelled');
 const ran=[];
 const worker=createAccountingWorker({authenticateMachine:async()=>({id:machine,active:true}),
  database:{pending:async()=>[ja,jb],resolveAuthorizedOperation:async p=>{if(p.operationId===ja)throw Error('revoked_during_pass');return api.resolveAuthorizedOperation(p);}},
  runner:{run:async(_t,p)=>{ran.push(p.operationId);return {operationId:p.operationId,status:'matched'};}}});
 assert.equal((await worker.runOnce({})).length,2);assert.deepEqual(ran,[jb]);
});

test('review regressions: refresh crash reclaim fences old lease and never replays dispatched refresh',async t=>{
 const f=await setup(t),{db,api,bindings:[binding]}=f;
 const operationId=await f.enqueue(a,ca),old=api.operation(machine,operationId);
 const lease=await old.coordinator.claim(binding,operationId);
 await assert.rejects(api.operation(machine,operationId).coordinator.claim(binding,operationId));
 await db.query("update private_t19_custody.operations set lease_expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[operationId]);
 await db.query("update private_t19_custody.jobs set lease_until=clock_timestamp()-interval '1 second' where id=$1",[operationId]);
 assert.ok((await api.pending(machine)).includes(operationId));
 const next=api.operation(machine,operationId),replacement=await next.coordinator.claim(binding,operationId);
 assert.notEqual(replacement.id,lease.id);
 await assert.rejects(old.coordinator.dispatch(binding,lease,async()=>assert.fail('stale lease dispatched')));
 await next.coordinator.dispatch(binding,replacement,async()=>{});
 await db.query("update private_t19_custody.operations set lease_expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[operationId]);
 await assert.rejects(api.operation(machine,operationId).coordinator.claim(binding,operationId));
 await next.coordinator.fail(binding,replacement,'recovery_required');
 assert.equal((await db.query('select phase from private_t19_custody.operations where operation_id=$1',[operationId])).rows[0].phase,'recovery_required');
});

test('review regressions: definitive invalid grant permits new owner consent without uncertainty waiver',async t=>{
 const f=await setup(t),{db,api,bindings:[binding]}=f;
 const operationId=await f.enqueue(a,ca),adapters=api.operation(machine,operationId);
 const core=createRestrictedCustodyCore({...adapters,authorize:async()=>true,provider:{refresh:async()=>({kind:'invalid_grant'})}});
 assert.equal((await core.refresh({binding,operationId,principal:machine})).status,'reauthorisation_required');
 assert.equal((await db.query('select phase from private_t19_custody.operations where operation_id=$1',[operationId])).rows[0].phase,'fenced');
 const ref=(await db.query('select vault.create_secret($1) id',[JSON.stringify({business_id:a,organization_id:'111',environment:'staging',client_id:'test-client',client_secret:'test-secret'})])).rows[0].id;
 await db.query("insert into private_t19_custody.oauth_clients values($1,$2,'https://accounting.test.invalid/accounting/zoho/callback','owner@test.invalid','123','456','ZAR','reviewed-test',true)",[ca,ref]);
 await f.query('select private_t19_custody.oauth($1,$2)', ['begin',JSON.stringify({connectionId:ca,businessId:a,actor:owner,digest:'a'.repeat(64),sessionDigest:'b'.repeat(64)})]);
 assert.equal((await db.query('select phase from private_t19_custody.oauth_states where connection_id=$1',[ca])).rows[0].phase,'pending');
});
