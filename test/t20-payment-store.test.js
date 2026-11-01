import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),foreign=id(4),a=id(10),b=id(20),ia=id(100),ib=id(200),intent=id(300);
const candidate=await readFile(new URL('../database/t20-payment-store-candidate.sql',import.meta.url),'utf8');
const identity=await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8');
async function fixture(native=false){
 let db;
 if(native){const u=new URL(process.env.T20_NATIVE_URL);if(process.env.T20_DISPOSABLE!=='yes'||u.hostname!=='127.0.0.1'||u.pathname!=='/faraios_t20_test')throw Error('disposable test database required');db=new pg.Client({connectionString:u.href});await db.connect();}
 else db=new PGlite();
 const q=(s,p=[])=>db.query(s,p),exec=s=>native?q(s):db.exec(s);
 await exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;");
 await exec(identity);
 // Narrow synthetic fixture for the existing invoice columns used by T20.
 await exec("create table public.business_invoices(id uuid primary key,business_id uuid not null references public.businesses(id),total_cents integer not null,currency text not null,unique(business_id,id));");
 await exec(candidate);
 for(const u of [owner,manager,staff,foreign])await q('insert into auth.users values($1)',[u]);
 for(const business of [a,b])await q("insert into public.businesses(id,name,industry) values($1,'SYNTHETIC','cleaning')",[business]);
 for(const [business,user,role]of [[a,owner,'owner'],[b,owner,'owner'],[a,manager,'manager'],[a,staff,'staff'],[b,foreign,'owner']])await q('insert into public.business_memberships(business_id,user_id,role) values($1,$2,$3)',[business,user,role]);
 await q("insert into public.business_invoices values($1,$2,10000,'ZAR'),($3,$4,41000,'ZAR')",[ia,a,ib,b]);
 async function as(user,fn,role='authenticated',session=id(900+Number(user?.slice(-12)??0))){
  await q('set role '+role);await q("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,session_id:session,role:'authenticated'})]);
  try{return await fn();}finally{await q('reset role');await q('reset request.jwt.claim.sub');await q('reset request.jwt.claims');}
 }
 const configure=(business=a,account='123',enabled=true)=>as(owner,()=>q('select private_t20.configure_account($1,$2,$3)',[business,account,enabled]));
 const make=(business=a,invoice=ia,key=intent,user=owner)=>as(user,()=>q('select private_t20.create_intent($1,$2,$3) as result',[business,invoice,key]));
 const publish=(status='success',extra={})=>as(null,()=>q('select private_t20.publish_verified($1,$2,$3,$4,$5,$6,$7) as result',[extra.business??a,extra.account??'123',extra.intent??intent,extra.tx??'500',status,extra.amount??10000,extra.currency??'ZAR']),'t20_payment_verifier');
 const counts=async()=>{const r=await q('select (select count(*)::int from private_t20.credits) as credits,(select count(*)::int from private_t20.observations) as observations');return r.rows[0];};
 return {db,q,exec,as,configure,make,publish,counts,close:()=>native?db.end():db.close()};
}
async function httpsFixture(f){
 await f.exec("alter table auth.users add column banned_until timestamptz;create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;");
 for(const user of [owner,manager,staff,foreign])await f.q('insert into auth.sessions(id,user_id) values($1,$2)',[id(900+Number(user.slice(-12))),user]);
 await f.exec(await readFile(new URL('../database/t20-payment-https-candidate.sql',import.meta.url),'utf8'));
 const backend=id(5);await f.q('insert into auth.users(id) values($1)',[backend]);await f.q('insert into auth.sessions(id,user_id) values($1,$2)',[id(905),backend]);
 const call=(user,action,input,kind='backend',session)=>f.as(user,()=>f.q('select public.t20_payment_'+kind+'($1,$2) as result',[action,JSON.stringify(input)]),'authenticated',session);
 return {backend,call};
}
test('T20 HTTPS: live owner account setup and enrolled backend only; revoked and foreign identities denied',async t=>{
 const f=await fixture();t.after(f.close);const {backend,call}=await httpsFixture(f);
 await call(owner,'configure',{businessId:a,accountId:'123',enabled:true},'owner');
 await call(owner,'create',{businessId:a,invoiceId:ia,requestId:intent},'owner');
 const scope={businessId:a,accountId:'123'};
 for(const role of ['anon','service_role'])await assert.rejects(f.as(null,()=>f.q("select public.t20_payment_backend('health',$1)",[JSON.stringify(scope)]),role),e=>e.code==='42501');
 const wrappers=(await f.q("select bool_and(not prosecdef) as invoker from pg_proc where oid in ('public.t20_payment_owner(text,jsonb)'::regprocedure,'public.t20_payment_backend(text,jsonb)'::regprocedure)")).rows[0];assert.equal(wrappers.invoker,true);
 for(const user of [owner,manager,staff,foreign,backend])await assert.rejects(call(user,'health',scope),e=>e.code==='42501');
 await f.q('insert into private_t20.backend_accounts values($1,$2,$3,true)',[backend,a,'123']);
 assert.equal((await call(backend,'health',scope)).rows[0].result.ready,true);
 const found=(await call(backend,'lookup',{...scope,reference:'FOS-'+intent})).rows[0].result;assert.equal(found.amountCents,10000);assert.equal(found.businessId,a);
 await assert.rejects(call(backend,'health',{businessId:b,accountId:'123'}),e=>e.code==='42501');
 await assert.rejects(call(backend,'health',{...scope,environment:'production'}),e=>e.code==='42501');
 await assert.rejects(call(backend,'configure',{...scope,enabled:true}),e=>e.code==='42501');
 await assert.rejects(call(manager,'configure',{...scope,enabled:false},'owner'),e=>e.code==='42501');
 await assert.rejects(call(foreign,'status',{businessId:a,intentId:intent},'owner'),e=>e.code==='42501');
 await assert.rejects(f.configure(),e=>e.code==='42501');
 const publish={...scope,intentId:intent,transactionId:'500',status:'success',amountCents:10000,currency:'ZAR'};
 await call(backend,'publish',publish);assert.deepEqual(await f.counts(),{credits:1,observations:1});
 await f.q('delete from auth.sessions where user_id=$1',[backend]);await assert.rejects(call(backend,'publish',publish),e=>e.code==='42501');
 await f.q('delete from auth.sessions where user_id=$1',[owner]);await assert.rejects(call(owner,'status',{businessId:a,intentId:intent},'owner'),e=>e.code==='42501');
 assert.deepEqual(await f.counts(),{credits:1,observations:1});
});
test('T20 HTTPS: expired/banned/backend-membership and disabled enrollment checks',async t=>{
 const f=await fixture();t.after(f.close);const {backend,call}=await httpsFixture(f),scope={businessId:a,accountId:'123'};
 await call(owner,'configure',{...scope,enabled:true},'owner');await f.q('insert into private_t20.backend_accounts values($1,$2,$3,true)',[backend,a,'123']);
 await f.q("update auth.sessions set not_after=clock_timestamp()-interval '1 second' where user_id=$1",[backend]);await assert.rejects(call(backend,'health',scope),e=>e.code==='42501');
 await f.q('update auth.sessions set not_after=null where user_id=$1',[backend]);await f.q("update auth.users set banned_until=clock_timestamp()+interval '1 hour' where id=$1",[backend]);await assert.rejects(call(backend,'health',scope),e=>e.code==='42501');
 await f.q('update auth.users set banned_until=null where id=$1',[backend]);await f.q("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner')",[a,backend]);await assert.rejects(call(backend,'health',scope),e=>e.code==='42501');
 await f.q('delete from public.business_memberships where user_id=$1',[backend]);await f.q('update private_t20.backend_accounts set enabled=false');await assert.rejects(call(backend,'health',scope),e=>e.code==='42501');
 await f.q('update private_t20.backend_accounts set enabled=true');await assert.rejects(call(backend,'health',scope,'backend',id(999)),e=>e.code==='42501');
});
test('T20 HTTPS: exact empty rollback preserves existing invoices and refuses populated installs',async t=>{
 const rollback=await readFile(new URL('../database/t20-payment-empty-rollback.sql',import.meta.url),'utf8');
 const empty=await fixture();t.after(empty.close);await httpsFixture(empty);await empty.exec(rollback);
 assert.equal((await empty.q("select to_regnamespace('private_t20') as schema")).rows[0].schema,null);
 assert.equal((await empty.q('select count(*)::int as n from public.business_invoices')).rows[0].n,2);
 const populated=await fixture();t.after(populated.close);const {call}=await httpsFixture(populated);await call(owner,'configure',{businessId:a,accountId:'123',enabled:false},'owner');
 await assert.rejects(populated.exec(rollback),/t20_rollback_requires_empty_inactive_install/);await populated.exec('rollback');
 assert.equal((await populated.q('select count(*)::int as n from private_t20.accounts')).rows[0].n,1);
});
test('T20 SQL: owner account boundaries, staff/foreign denials and backend-only publication',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();await f.configure(b,'456');
 for(const user of [manager,staff,foreign])await assert.rejects(f.as(user,()=>f.q("select private_t20.configure_account($1,'123',false)",[a])),e=>e.code==='42501');
 for(const user of [staff,foreign])await assert.rejects(f.make(a,ia,intent,user),e=>e.code==='42501');
 await assert.rejects(f.make(a,ib),/payment_invoice_denied/);await f.make(a,ia,intent,manager);
 for(const role of ['anon','authenticated','service_role','t20_payment_verifier']){
  await assert.rejects(f.as(owner,()=>f.q('select * from private_t20.accounts'),role),e=>e.code==='42501');
  if(role!=='t20_payment_verifier')await assert.rejects(f.as(owner,()=>f.q("select private_t20.publish_verified($1,'123',$2,'500','success',10000,'ZAR')",[a,intent]),role),e=>e.code==='42501');
 }
 assert.deepEqual(await f.counts(),{credits:0,observations:0});
});
test('T20 SQL: both independent accounts record only their own invoice and account replacement is fenced',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();await assert.rejects(f.configure(b,'123'),e=>e.code==='23505');await f.configure(b,'456');
 await f.make();await f.make(b,ib,id(400));await assert.rejects(f.configure(a,'789'),/payment_account_in_use/);
 await f.publish();await f.publish('success',{business:b,account:'456',intent:id(400),tx:'600',amount:41000});
 const rows=(await f.q('select business_id,amount_cents from private_t20.credits order by amount_cents')).rows;
 assert.deepEqual(rows,[{business_id:a,amount_cents:10000},{business_id:b,amount_cents:41000}]);
});
test('T20 SQL: create retries reuse saved intent and amounts cannot be supplied by client',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();const first=(await f.make()).rows[0].result;const again=(await f.make(a,ia,id(301))).rows[0].result;
 assert.equal(first.id,again.id);assert.equal(first.amountCents,10000);assert.equal(first.reference,'FOS-'+intent);
 await f.configure(a,'123',false);await assert.rejects(f.make(),/payment_account_disabled/);await assert.rejects(f.publish(),/payment_account_disabled/);
});
test('T20 SQL: failure, delayed success, replay and delayed failure preserve a single durable credit',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();await f.make();
 assert.equal((await f.publish('failed')).rows[0].result.status,'failed');assert.deepEqual(await f.counts(),{credits:0,observations:1});
 assert.equal((await f.publish()).rows[0].result.status,'paid');assert.equal((await f.publish()).rows[0].result.changed,false);
 assert.equal((await f.publish('pending')).rows[0].result.status,'paid');assert.equal((await f.publish('abandoned')).rows[0].result.status,'paid');
 assert.deepEqual(await f.counts(),{credits:1,observations:4});await assert.rejects(f.make(a,ia,id(302)),/payment_already_recorded/);
});
test('T20 SQL: foreign bindings and changed amount/currency/transaction reject atomically',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();await f.configure(b,'456');await f.make();
 for(const extra of [{business:b,account:'456'},{account:'456'},{amount:9999},{currency:'USD'}])await assert.rejects(f.publish('success',extra));
 assert.deepEqual(await f.counts(),{credits:0,observations:0});await f.publish();await assert.rejects(f.publish('success',{tx:'501'}));assert.deepEqual(await f.counts(),{credits:1,observations:1});
});
test('T20 SQL: two actual successful attempts against one invoice are retained for review, never credited twice',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();await f.make();await f.publish('failed');const second=id(303);await f.make(a,ia,second);
 await f.publish('success');const r=await f.publish('success',{intent:second,tx:'501'});assert.equal(r.rows[0].result.status,'review_required');
 assert.deepEqual(await f.counts(),{credits:1,observations:3});assert.equal((await f.q('select amount_cents from private_t20.credits')).rows[0].amount_cents,10000);
});
test('T20 SQL: publication cannot reuse a provider transaction for another invoice',async t=>{
 const f=await fixture();t.after(f.close);await f.configure();await f.make();await f.publish();const next=id(304);await f.q("insert into public.business_invoices values($1,$2,10000,'ZAR')",[id(101),a]);await f.make(a,id(101),next);
 await assert.rejects(f.publish('success',{intent:next}),e=>e.code==='23505');assert.deepEqual(await f.counts(),{credits:1,observations:1});
});
test('T20 native concurrent publication and interrupted uncommitted/committed delivery',{skip:!process.env.T20_NATIVE_URL},async t=>{
 const f=await fixture(true);t.after(f.close);await f.configure();await f.make();
 const clients=await Promise.all(Array.from({length:4},async()=>{const c=new pg.Client({connectionString:process.env.T20_NATIVE_URL});await c.connect();await c.query('set role t20_payment_verifier');return c;}));
 t.after(async()=>{for(const c of clients)await c.end().catch(()=>{});});
 const sql="select private_t20.publish_verified($1,'123',$2,'500','success',10000,'ZAR') as result",params=[a,intent];
 // A disconnected transaction must roll back both credit and observation.
 await clients[0].query('begin');await clients[0].query(sql,params);await clients[0].end();
 const results=await Promise.all(clients.slice(1).map(c=>c.query(sql,params)));
 assert.equal(results.filter(r=>r.rows[0].result.changed).length,1);assert.deepEqual(await f.counts(),{credits:1,observations:1});
 const reopened=new pg.Client({connectionString:process.env.T20_NATIVE_URL});await reopened.connect();try{await reopened.query('set role t20_payment_verifier');assert.equal((await reopened.query(sql,params)).rows[0].result.changed,false);}finally{await reopened.end();}
 assert.deepEqual(await f.counts(),{credits:1,observations:1});
 await assert.rejects(f.as(staff,()=>f.q("select private_t20.configure_account($1,'123',false)",[a])),e=>e.code==='42501');
 await assert.rejects(f.as(null,()=>f.q('select * from private_t20.credits'),'t20_payment_verifier'),e=>e.code==='42501');
 await f.q("insert into public.business_invoices values($1,$2,10000,'ZAR')",[id(101),a]);await f.make(a,id(101),id(304));
 await assert.rejects(f.publish('success',{intent:id(304)}),e=>e.code==='23505');assert.deepEqual(await f.counts(),{credits:1,observations:1});
 t.diagnostic('T20_PAYMENT_CONCURRENCY_NATIVE_PASS');t.diagnostic('T20_PAYMENT_NATIVE_DENIAL_ROLLBACK_PASS');
 const {backend,call}=await httpsFixture(f),scope={businessId:a,accountId:'123'};
 await assert.rejects(call(backend,'health',scope),e=>e.code==='42501');await f.q('insert into private_t20.backend_accounts values($1,$2,$3,true)',[backend,a,'123']);
 assert.equal((await call(backend,'health',scope)).rows[0].result.ready,true);
 assert.equal((await call(backend,'lookup',{...scope,reference:'FOS-'+intent})).rows[0].result.status,'paid');
 assert.equal((await call(backend,'publish',{...scope,intentId:intent,transactionId:'500',status:'success',amountCents:10000,currency:'ZAR'})).rows[0].result.changed,false);
 await f.q('delete from auth.sessions where user_id=$1',[backend]);await assert.rejects(call(backend,'health',scope),e=>e.code==='42501');
 assert.deepEqual(await f.counts(),{credits:1,observations:1});t.diagnostic('T20_PAYMENT_BACKEND_NATIVE_PASS');
});
