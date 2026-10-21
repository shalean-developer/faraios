import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseEarningsRule,earningsRuleIssues,previewEarnings,saveEarningsRule,listEarningsRules,renderEarningsRules,templateRule} from '../src/earnings.js';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',service='20000000-0000-4000-8000-000000000001';
const workers=['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003'];
const form=()=>new URLSearchParams({model:'percentage_pool',percentage:'70',cap:'300',max_minutes:'480',basis_definition:'Synthetic eligible labour only; exclude equipment and fees.',allocation:'equal',rounding:'half_up'});
const rule=()=>({...parseEarningsRule(form()),business_id:a,service_id:service,version:1});
const calc=(patch={})=>previewEarnings({businessId:a,serviceId:service,rule:rule(),eligibleCents:40000,workerIds:workers.slice(0,1),durationMinutes:180,agreementKind:'new',...patch});

test('one percentage pool, then equal shares and a per-cleaner cap',()=>{
 assert.equal(calc().totalCents,28000);
 assert.equal(calc({eligibleCents:60000}).totalCents,30000);
 const two=calc({eligibleCents:100000,workerIds:workers.slice(0,2)});
 assert.equal(two.uncappedPoolCents,70000);assert.equal(two.totalCents,60000);assert.equal(two.cappedOffCents,10000);assert.deepEqual(two.workers.map(w=>w.amountCents),[30000,30000]);
 const small=calc({eligibleCents:60000,workerIds:workers.slice(0,2)});assert.deepEqual(small.workers.map(w=>w.amountCents),[21000,21000]);
 const fixed={...rule(),model:'fixed_per_worker',rate_cents:25000,basis_points:null,cap_cents:null};
 assert.equal(calc({rule:fixed,workerIds:workers}).totalCents,75000);
});
test('integer percentage rounding and stable leftover cents are reproducible',()=>{
 const r={...rule(),basis_points:5000,cap_cents:30000};
 const x=calc({rule:r,eligibleCents:10001,workerIds:[workers[1],workers[0]]});
 assert.equal(x.uncappedPoolCents,5001);assert.deepEqual(x.workers.map(w=>w.amountCents),[2501,2500]);
 assert.deepEqual(x,calc({rule:r,eligibleCents:10001,workerIds:workers.slice(0,2)}));
 assert.equal(calc({rule:{...r,rounding:'floor'},eligibleCents:10001}).totalCents,5000);
 assert.equal(calc({eligibleCents:0}).totalCents,0);
 assert.equal(calc({rule:{...r,cap_cents:0}}).totalCents,0);
});
test('missing choices, scope/hours, overflow and existing agreements cannot silently calculate',()=>{
 for(const patch of [{basis_points:null},{cap_cents:null},{max_minutes:null},{allocation:null},{rounding:null},{basis_definition:''}])assert.throws(()=>calc({rule:{...rule(),...patch}}),/Setup needed/);
 for(const patch of [{businessId:b},{serviceId:b},{rule:{...rule(),version:0}},{durationMinutes:481},{durationMinutes:0},{workerIds:[]},{workerIds:[workers[0],workers[0]]},{eligibleCents:1.5},{eligibleCents:-1},{eligibleCents:Number.MAX_SAFE_INTEGER}])assert.throws(()=>calc(patch));
 for(const agreementKind of ['existing','recurring_existing',undefined])assert.throws(()=>calc({agreementKind}),/verified existing agreement/);
 const fixed={...rule(),model:'fixed_per_worker',rate_cents:2147483647};assert.throws(()=>calc({rule:fixed,workerIds:workers}),/supported limit/);
 const saved=rule(),snapshot=calc({rule:saved});saved.cap_cents=1;saved.basis_definition='Changed';assert.equal(snapshot.rule.cap_cents,30000);assert.equal(Object.isFrozen(snapshot.workers[0]),true);assert.equal(Object.isFrozen(snapshot.rule),true);
});
test('drafts preserve blanks and explicit zero; parsing excludes client business claims',()=>{
 const f=form();f.set('business_id',b);f.set('cap','');assert.equal(parseEarningsRule(f).cap_cents,null);assert.equal(parseEarningsRule(f).business_id,undefined);
 for(const [key,value] of [['percentage','100.01'],['percentage','NaN'],['percentage','-1'],['percentage','1e2'],['cap','300.001'],['cap','99999999'],['max_minutes','0'],['max_minutes','12.5'],['rounding','random'],['allocation','full_percentage_each']]){const bad=form();bad.set(key,value);assert.throws(()=>parseEarningsRule(bad));}
 const fixed=new URLSearchParams({model:'fixed_per_worker',rate:'0',max_minutes:'60'});assert.equal(parseEarningsRule(fixed).rate_cents,0);assert.deepEqual(earningsRuleIssues(parseEarningsRule(fixed)),[]);
});
test('six approved methods belong to the Shalean template, without an invented pay rate',async()=>{
 const template=JSON.parse(await readFile(new URL('../config/shalean-approved-earnings.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(template.services).sort(),['airbnb','carpet','deep','moving','office','regular']);
 for(const profile of Object.keys(template.services)){const r=templateRule(template,{id:service,business_id:a,cleaning_profile:profile});assert.equal(r.model,['regular','airbnb'].includes(profile)?'percentage_pool':'fixed_per_worker');assert.equal(r.basis_points,undefined);assert.equal(r.rate_cents,undefined);assert.ok(earningsRuleIssues(r).length);if(r.model==='percentage_pool')assert.equal(r.cap_cents,30000);}
 assert.equal(templateRule(null,{cleaning_profile:'regular'}),null);
});
test('persistence uses business/service/version predicates; lists every scoped page',async()=>{
 const filters=[],query={eq(k,v){filters.push([k,v]);return this;},select:async()=>({data:[]})};
 await assert.rejects(saveEarningsRule({from:()=>({update:()=>query})},a,service,new URLSearchParams({...Object.fromEntries(form()),version:'1'}),rule()),e=>e.status===409);
 assert.deepEqual(filters,[['business_id',a],['service_id',service],['version',1]]);
 await assert.rejects(saveEarningsRule({},a,service,new URLSearchParams({...Object.fromEntries(form()),version:'2'}),rule()),e=>e.status===409);
 const rows=Array.from({length:501},(_,i)=>({business_id:a,service_id:String(i)}));
 const client={from(){return{select(){return this;},eq(k,v){assert.equal(k,'business_id');assert.equal(v,a);return this;},order(){return this;},async range(start,end){return{data:rows.slice(start,end+1)};}};}};
 assert.equal((await listEarningsRules(client,a)).length,501);rows[500].business_id=b;await assert.rejects(listEarningsRules(client,a),/unavailable/);
});
test('rendering escapes data, offers no implicit rate, and limits changes to owner',()=>{
 const svc={id:service,business_id:a,name:'<script>',kind:'service',cleaning_profile:'regular'};
 const owner=renderEarningsRules({id:a,name:'<img>'},[svc],[],{owner:true,service:svc});assert.doesNotMatch(owner,/<script>|<img>/);assert.match(owner,/Choose a method/);assert.doesNotMatch(owner,/value="70"/);
 const manager=renderEarningsRules({id:a,name:'A'},[svc],[rule()],{service:svc});assert.doesNotMatch(manager,/name="action" value="save"/);assert.match(manager,/name="action" value="preview"/);assert.match(manager,/No earnings are posted/);
});

test('Postgres isolates setup, checks service scope, preserves versions and audits owner writes',async()=>{
 const db=new PGlite(),owner=workers[0],manager=workers[1],staff=workers[2];
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
  for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','earnings-rules-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
  await db.query('insert into auth.users values($1),($2),($3)',workers);
  await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($1,$4,'manager'),($1,$5,'staff')",[a,b,owner,manager,staff]);
  const serviceB='20000000-0000-4000-8000-000000000002',extra='20000000-0000-4000-8000-000000000003';
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size) values($1,$4,'service','A','fixed','visit',100,'ZAR',1),($2,$5,'service','B','fixed','visit',100,'ZAR',1),($3,$4,'extra','Extra','fixed','item',100,'ZAR',null)",[service,serviceB,extra,a,b]);
  const asUser=async(uid,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);try{return await fn();}finally{await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');}};
  const insert=(biz,svc)=>db.query("insert into public.business_earnings_rules(business_id,service_id,model) values($1,$2,'percentage_pool') returning *",[biz,svc]);
  const row=(await asUser(owner,()=>insert(a,service))).rows[0];assert.equal(row.last_actor,owner);assert.equal(row.basis_points,null);assert.equal(row.version,1);
  await asUser(owner,()=>insert(b,serviceB));
  assert.deepEqual((await asUser(manager,()=>db.query('select business_id from public.business_earnings_rules'))).rows,[{business_id:a}]);
  assert.equal((await asUser(staff,()=>db.query('select * from public.business_earnings_rules'))).rows.length,0);
  await assert.rejects(asUser(owner,()=>insert(a,extra)),/service scope/);
  await assert.rejects(asUser(owner,()=>insert(a,serviceB)),/service scope/);
  await assert.rejects(asUser(manager,()=>insert(a,service)),/row-level security/);
  const upd=()=>db.query('update public.business_earnings_rules set cap_cents=30000 where business_id=$1 and service_id=$2 and version=1 returning *',[a,service]);
  assert.equal((await asUser(manager,upd)).rows.length,0);
  const changed=(await asUser(owner,upd)).rows[0];assert.equal(changed.version,2);assert.equal((await asUser(owner,upd)).rows.length,0);
  await assert.rejects(asUser(owner,()=>db.query('update public.business_earnings_rules set business_id=$1 where service_id=$2',[b,service])),/immutable/);
  await assert.rejects(asUser(owner,()=>db.query('update public.business_earnings_rules set basis_points=10001 where service_id=$1',[service])),/check constraint/);
  await assert.rejects(asUser(owner,()=>db.query('delete from public.business_earnings_rules')),/permission denied/);
  const events=(await db.query("select * from audit.events where entity_table='business_earnings_rules' and operation='UPDATE'")).rows;assert.equal(events.length,1);assert.equal(events[0].actor_user_id,owner);assert.equal(events[0].old_record.cap_cents,null);assert.equal(events[0].new_record.cap_cents,30000);
  await assert.rejects(asUser(owner,()=>db.query('update audit.events set new_record=null')),/permission denied/);
  await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,owner]);assert.equal((await asUser(owner,()=>db.query('select * from public.business_earnings_rules where business_id=$1',[a]))).rows.length,0);
  await db.exec('set role anon');await assert.rejects(db.query('select * from public.business_earnings_rules'),/permission denied/);await db.exec('reset role');
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.business_earnings_rules'::regclass")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
