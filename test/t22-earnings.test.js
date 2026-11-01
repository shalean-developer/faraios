import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {readAdjustmentSource} from '../src/adjustment-reviews.js';
export const id=n=>'22000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const owner=id(1),manager=id(2),worker=id(3),lead=id(4),foreign=id(5),a=id(10),b=id(11),job=id(20),service=id(30);
export async function fixture(db=new PGlite()){
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create schema audit;create schema private_t20;create table auth.users(id uuid primary key,banned_until timestamptz);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated;");
 await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
 await db.exec(`create table public.one_off_bookings(id uuid primary key,business_id uuid,status text,currency text default 'ZAR',assigned_staff uuid[],duration_minutes integer default 210,recurring_schedule_id uuid,selection jsonb,version integer default 1);
 create table public.business_earnings_rules(id uuid default gen_random_uuid(),business_id uuid,service_id uuid,version integer,model text,rate_cents integer,basis_points integer,cap_cents integer,max_minutes integer,basis_definition text,allocation text,rounding text);`);
 const https=await readFile(new URL('../database/t20-payment-https-candidate.sql',import.meta.url),'utf8');
 await db.exec(https.match(/create function private_t20\.live_session\(\)[\s\S]*?\$\$;/)[0]);
 await db.exec(await readFile(new URL('../database/earnings-adjustments-draft.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../database/t22-earnings-candidate.sql',import.meta.url),'utf8'));
 for(const u of [owner,manager,worker,lead,foreign]){await db.query('insert into auth.users(id) values($1)',[u]);await db.query('insert into auth.sessions values($1,$1,null)',[u]);}
 for(const business of [a,b])await db.query("insert into public.businesses(id,name,industry) values($1,'SYNTHETIC','cleaning')",[business]);
 for(const [biz,user,role]of [[a,owner,'owner'],[b,owner,'owner'],[a,manager,'manager'],[a,worker,'staff'],[a,lead,'staff'],[b,foreign,'owner']])await db.query('insert into public.business_memberships(business_id,user_id,role) values($1,$2,$3)',[biz,user,role]);
 await db.query("insert into public.one_off_bookings(id,business_id,status,assigned_staff,selection) values($1,$2,'assigned',$3,$4)",[job,a,[worker,lead],JSON.stringify([{catalogue_id:service,quantity:1}])]);
 await db.query("insert into public.business_earnings_rules(business_id,service_id,version,model,basis_points,cap_cents,max_minutes,basis_definition,allocation,rounding) values($1,$2,3,'percentage_pool',7000,30000,480,'Reviewed eligible labour excluding service fee, tax, equipment and transport','equal','half_up')",[a,service]);
 const as=async(user,fn,role='authenticated')=>{await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user??'',JSON.stringify({session_id:user})]);try{return await fn();}finally{await db.exec('reset role');}};
 const call=(action,input={},user=owner)=>as(user,async()=>(await db.query('select public.t22_earnings($1,$2) v',[action,JSON.stringify({businessId:a,...input})])).rows[0].v);
 const complete=()=>db.query("update public.one_off_bookings set status='completed' where id=$1",[job]);
 const client=user=>({from(table){const filters=[];return{select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},range(){return this;},then(resolve,reject){
  if(!['adjustment_review_sources','adjustment_review_events'].includes(table)||filters.some(([k])=>!['business_id','id','source_id'].includes(k)))throw Error('Unexpected query');
  as(user,()=>db.query('select * from public.'+table+' where '+filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')+(table==='adjustment_review_events'?' order by version':''),filters.map(([,v])=>v))).then(r=>resolve({data:r.rows}),reject);
 }}}});
 return {db,as,call,complete,client};
}
export const agree=()=>({bookingId:job,agreementId:id(40),kind:'new',serviceId:service,ruleVersion:3,eligibleCents:50001,originalPeriod:'2026-11',agreementEvidence:'SYNTHETIC agreed amounts and eligible labour',entitlementEvidence:'SYNTHETIC full-pay applicability review'});
export const accrue=()=>({bookingId:job,agreementId:id(40),requestId:id(50),completionEvidence:'SYNTHETIC completed scope',entitlementEvidence:'SYNTHETIC independently verified entitlement'});
test('T22 persisted new agreement accrues once after completion and opens immutable adjustment sources',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 await f.call('agree',agree());await f.call('agree',agree());
 const context=await f.call('context',{bookingId:job});assert.deepEqual(context.agreement.workers.map(w=>w.amountCents),[17501,17500]);
 assert.equal((await f.db.query('select * from public.adjustment_review_sources')).rows.length,0);
 await assert.rejects(f.call('accrue',accrue()),/completion_required/);
 await f.complete();await f.call('accrue',accrue());await f.call('accrue',accrue());
 const sources=[];for(const w of context.agreement.workers)sources.push(await readAdjustmentSource(f.client(owner),a,w.sourceId));
 assert.deepEqual(sources.map(s=>s.state.sources[0].originalCents),[17501,17500]);assert.equal(sources[0].state.events.length,1);
 await assert.rejects(f.call('accrue',{...accrue(),requestId:id(51)}),/already_accrued/);
 await assert.rejects(f.call('agree',{...agree(),eligibleCents:1}),/exists/);
 assert.equal((await f.db.query('select * from private_t22.accruals')).rows.length,1);
 assert.equal((await f.call('list',{page:0},manager))[0].accrued,true);
 assert.equal((await f.db.query('select * from public.adjustment_review_events')).rows.length,2);
});
test('T22 protected zero-lead terms, late catalogue edits and unpaid customer never erase another worker earnings',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 const protectedTerms={bookingId:job,agreementId:id(40),kind:'recurring',originalVersion:7,workers:[{userId:lead,amountCents:0},{userId:worker,amountCents:30000}],originalPeriod:'2026-10',agreementEvidence:'SYNTHETIC original recurring terms',entitlementEvidence:'SYNTHETIC protected full-pay review'};
 await f.db.query('update public.one_off_bookings set recurring_schedule_id=$1 where id=$2',[id(99),job]);
 await assert.rejects(f.call('agree',agree()),/recurring/);
 await f.call('agree',protectedTerms);
 await f.db.exec('update public.business_earnings_rules set basis_points=1,version=4');await f.complete();await f.call('accrue',accrue());
 const c=await f.call('context',{bookingId:job});assert.deepEqual(c.agreement.workers.map(w=>w.amountCents),[30000,0]);assert.equal(c.agreement.request.originalVersion,7);
 const source=c.agreement.workers[0].sourceId;
 await f.as(manager,()=>f.db.query("select public.append_earnings_adjustment($1,$2,1,$3,'propose',$4)",[a,source,id(61),JSON.stringify({sourceId:source,kind:'reimbursement',deltaCents:5000,reason:'TEST R50 transport',evidence:'TEST receipt',occurrenceReference:'transport1'})]));
 await f.as(owner,()=>f.db.query("select public.append_earnings_adjustment($1,$2,2,$3,'approve',$4)",[a,source,id(62),JSON.stringify({adjustmentId:id(61),reason:'TEST verified',originalVerificationEvidence:'TEST original preserved',entitlementReviewEvidence:'TEST verified separately'})]));
 const record=await readAdjustmentSource(f.client(owner),a,source);assert.equal(record.state.sources[0].originalCents,30000);assert.equal(record.state.adjustments[0].deltaCents,5000);
});
test('T22 database denies roles, injected identity, foreign scope, revoked session and direct mutation',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 for(const u of [worker,lead,foreign])await assert.rejects(f.call('context',{bookingId:job},u),e=>e.code==='42501');
 for(const action of ['agree','accrue'])await assert.rejects(f.call(action,action==='agree'?agree():accrue(),manager),e=>e.code==='42501');
 await assert.rejects(f.call('agree',{...agree(),actorId:owner}),/fields/);
 await assert.rejects(f.call(null,accrue()),/action_invalid/);
 await assert.rejects(f.call('agree',{...agree(),businessId:b}));
 await assert.rejects(f.call('agree',{...agree(),ruleVersion:2}),/saved_rule/);
 await assert.rejects(f.call('agree',{...agree(),serviceId:id(90)}),/service_scope/);
 for(const role of ['anon','authenticated','service_role']){
  await assert.rejects(f.as(owner,()=>f.db.query('select * from private_t22.agreements'),role),e=>e.code==='42501');
  await assert.rejects(f.as(owner,()=>f.db.query('delete from private_t22.accruals'),role),e=>e.code==='42501');
 }
 await f.db.query('delete from auth.sessions where user_id=$1',[owner]);await assert.rejects(f.call('agree',agree()),e=>e.code==='42501');
 assert.equal((await f.db.query('select * from private_t22.agreements')).rows.length,0);
});
test('T22 accrual is atomic with adjustment-source collision and changed agreed team denied',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await f.call('agree',agree());await f.complete();
 await f.db.query('update public.one_off_bookings set assigned_staff=$1 where id=$2',[[worker],job]);await assert.rejects(f.call('accrue',accrue()),/scope_changed/);
 await f.db.query('update public.one_off_bookings set assigned_staff=$1 where id=$2',[[worker,lead],job]);
 await f.as(owner,()=>f.db.query("select public.append_earnings_adjustment($1,$2,0,$2,'register_source',$3)",[a,id(80),JSON.stringify({sourceId:id(80),bookingId:job,workerId:lead,originalVersion:1,originalCents:100,originalPeriod:'2026-11',agreementEvidence:'TEST historical',originalRecordEvidence:'TEST protected'})]));
 await assert.rejects(f.call('accrue',accrue()));
 assert.equal((await f.db.query('select * from private_t22.accruals')).rows.length,0);
 assert.equal((await f.db.query('select revision from private_t22.agreements')).rows[0].revision,1);
 assert.equal((await f.db.query('select * from public.adjustment_review_sources')).rows.length,1);
});
test('T22 actual HTTP to SQL: persisted agreement, completion, retry and explained adjustments; denial stays in workspace',async t=>{
 const {createStagingServer}=await import('../src/staging-server.js');
 const f=await fixture();t.after(()=>f.db.close());
 const createClient=()=>{let user=owner;return {
  auth:{signInWithPassword:async({email})=>{user=email.startsWith('manager')?manager:email.startsWith('staff')?worker:email.startsWith('foreign')?foreign:owner;return {data:{session:{expires_at:Date.now()/1000+3600}}};},getUser:async()=>({data:{user:{id:user}}}),signOut:async()=>({})},
  from(table){const filters={};return{select(){return this;},eq(k,v){filters[k]=v;return this;},then(resolve,reject){
   const query=table==='businesses'?f.db.query("select id,name from public.businesses where status='active'"):table==='business_memberships'?f.db.query("select * from public.business_memberships where user_id=$1 and status='active'",[user]):null;
   if(!query)throw Error('Unexpected identity table');query.then(r=>resolve({data:r.rows}),reject);
  }};},
  rpc:async(name,{action,input})=>{assert.equal(name,'t22_earnings');try{return {data:await f.call(action,input,user)};}catch(e){return {error:{code:e.code}};}}
 };};
 const server=createStagingServer({createClient});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const login=async email=>{const res=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email,password:'SYNTHETIC'}),redirect:'manual'});return res.headers.get('set-cookie').split(';')[0];};
 const ownerCookie=await login('owner@example.test');
 const http=(path,{form,cookie=ownerCookie,origin=base,type='application/x-www-form-urlencoded'}={})=>fetch(base+path,{method:form?'POST':'GET',headers:{Cookie:cookie,Origin:origin,'Content-Type':type},body:form?new URLSearchParams(form):undefined,redirect:'manual'});
 const path='/earnings?business='+a+'&booking='+job;
 assert.equal((await http(path,{cookie:''})).status,303);
 assert.match(await(await http(path)).text(),/Record a verified agreement/);
 const form={action:'agree',agreementId:id(40),kind:'new',ruleVersion:'3',eligible:'500.01',originalPeriod:'2026-11',agreementEvidence:'TEST agreed scope and amounts',entitlementEvidence:'TEST full pay reviewed',actorId:foreign,businessId:b};
 assert.equal((await http(path,{form,origin:'https://foreign.invalid'})).status,403);
 assert.equal((await http(path,{form,type:'application/json'})).status,415);
 assert.equal((await http(path,{form})).status,303);assert.equal((await http(path,{form})).status,303);
 let body=await(await http(path)).text();assert.match(body,/R 175.01/);assert.match(body,/R 175.00/);assert.match(body,/TEST agreed scope/);assert.doesNotMatch(body,/Corrections and history for this cleaner/);
 const accrueForm={action:'accrue',requestId:id(50),completionEvidence:'TEST completed scope',entitlementEvidence:'TEST independently verified'};
 const denied=await http(path,{form:accrueForm});assert.equal(denied.status,422);assert.match(await denied.text(),/Earnings action rejected/);
 await f.complete();assert.equal((await http(path,{form:accrueForm})).status,303);assert.equal((await http(path,{form:accrueForm})).status,303);
 body=await(await http(path)).text();assert.match(body,/Accrued — synthetic/);assert.match(body,/Corrections and history for this cleaner/);assert.match(body,/TEST independently verified/);
 const managerCookie=await login('manager@example.test');assert.equal((await http(path,{cookie:managerCookie})).status,200);assert.equal((await http(path,{cookie:managerCookie,form:accrueForm})).status,403);
 for(const email of ['staff@example.test','foreign@example.test'])assert.equal((await http(path,{cookie:await login(email)})).status,403);
 assert.equal((await http('/earnings?business='+a+'&page=-1')).status,400);
 assert.equal((await f.db.query('select * from private_t22.accruals')).rows.length,1);
 assert.equal((await f.db.query('select * from public.adjustment_review_events')).rows.length,2);
});
test('T22 SQL calculations match approved preview engine, caps, half-cent and fixed cases in independent businesses',async t=>{
 const {previewEarnings}=await import('../src/earnings.js');
 const f=await fixture();t.after(()=>f.db.close());
 const rule=(await f.db.query('select * from public.business_earnings_rules')).rows[0];
 for(const [index,cents]of [50001,50005,100000].entries()){
  const jobId=id(100+index);await f.db.query('insert into public.one_off_bookings select $1,business_id,status,currency,assigned_staff,duration_minutes,recurring_schedule_id,selection,version from public.one_off_bookings where id=$2',[jobId,job]);
  await f.call('agree',{...agree(),bookingId:jobId,agreementId:id(200+index),eligibleCents:cents});
  const context=await f.call('context',{bookingId:jobId});
  const expected=previewEarnings({businessId:a,serviceId:service,rule,eligibleCents:cents,workerIds:[lead,worker],durationMinutes:210,agreementKind:'new'});
  assert.deepEqual(context.agreement.workers.map(w=>({userId:w.userId,amountCents:w.amountCents})),expected.workers);
 }
 await f.db.query('insert into public.business_memberships(business_id,user_id,role) values($1,$2,\'staff\'),($1,$3,\'staff\')',[b,worker,lead]);
 await f.db.query("insert into public.business_earnings_rules(business_id,service_id,version,model,rate_cents,max_minutes,basis_definition) values($1,$2,1,'fixed_per_worker',12345,300,'')",[b,service]);
 await f.db.query('insert into public.one_off_bookings select $1,$2,status,currency,assigned_staff,duration_minutes,recurring_schedule_id,selection,version from public.one_off_bookings where id=$3',[id(120),b,job]);
 await f.call('agree',{...agree(),businessId:b,bookingId:id(120),agreementId:id(220),ruleVersion:1,eligibleCents:0});
 const other=await f.call('context',{businessId:b,bookingId:id(120)});assert.deepEqual(other.agreement.workers.map(w=>w.amountCents),[12345,12345]);
 assert.equal((await f.call('context',{bookingId:job})).agreement,null);
});
test('T22 rollback refuses retained agreement history; empty rollback leaves all older journals intact',async t=>{
 const rollback=await readFile(new URL('../database/t22-earnings-empty-rollback.sql',import.meta.url),'utf8');
 const f=await fixture();t.after(()=>f.db.close());await f.call('agree',agree());
 await assert.rejects(f.db.exec(rollback),/history exists/);await f.db.exec('rollback');assert.equal((await f.call('list',{page:0})).length,1);
 const empty=await fixture();t.after(()=>empty.db.close());await empty.db.exec(rollback);
 assert.equal((await empty.db.query("select to_regnamespace('private_t22') n")).rows[0].n,null);
 assert.ok((await empty.db.query("select to_regclass('public.adjustment_review_events') n")).rows[0].n);
});
test('T22 direct RPC rejects missing/poison/whitespace agreement evidence and protects original review history',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 for(const patch of [{agreementEvidence:'\u00a0'},{entitlementEvidence:''},{eligibleCents:'50001'},{eligibleCents:null},{eligibleCents:-1},{originalPeriod:'2026-99'},{ruleVersion:0},{agreementEvidence:'x'.repeat(2001)}])await assert.rejects(f.call('agree',{...agree(),...patch}));
 assert.equal((await f.db.query('select * from private_t22.agreements')).rows.length,0);
 await f.as(owner,()=>f.db.query("select public.append_earnings_adjustment($1,$2,0,$2,'register_source',$3)",[a,id(80),JSON.stringify({sourceId:id(80),bookingId:job,workerId:lead,originalVersion:1,originalCents:100,originalPeriod:'2026-11',agreementEvidence:'TEST historical',originalRecordEvidence:'TEST protected'})]));
 await assert.rejects(f.call('agree',agree()),/reconciliation/);
 assert.equal((await f.db.query('select original_payload from public.adjustment_review_sources')).rows[0].original_payload.originalCents,100);
});
