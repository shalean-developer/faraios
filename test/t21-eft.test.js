import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {renderEft} from '../src/t21-eft.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),foreign=id(4),a=id(10),b=id(20),ia=id(100),ib=id(200);
export async function fixture(db=new PGlite()){
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated;");
 await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
 await db.exec('create table public.one_off_bookings(id uuid primary key,business_id uuid,status text);create table public.business_invoices(id uuid primary key,business_id uuid references public.businesses(id),booking_id uuid,total_cents integer,currency text,unique(business_id,id));');
 for(const file of ['t20-payment-store-candidate.sql','t20-payment-https-candidate.sql','t21-eft-candidate.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 for(const u of [owner,manager,staff,foreign]){await db.query('insert into auth.users(id) values($1)',[u]);await db.query('insert into auth.sessions values($1,$1,null)',[u]);}
 for(const business of [a,b])await db.query("insert into public.businesses(id,name,industry) values($1,'SYNTHETIC','cleaning')",[business]);
 for(const [business,user,role]of [[a,owner,'owner'],[b,owner,'owner'],[a,manager,'manager'],[a,staff,'staff'],[b,foreign,'owner']])await db.query('insert into public.business_memberships(business_id,user_id,role) values($1,$2,$3)',[business,user,role]);
 for(const [invoice,business]of [[ia,a],[ib,b]]){await db.query("insert into public.one_off_bookings values($1,$2,'confirmed')",[invoice,business]);await db.query("insert into public.business_invoices values($1,$2,$1,10000,'ZAR')",[invoice,business]);}
 const as=async(user,fn,role='authenticated')=>{await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user??'',JSON.stringify({session_id:user})]);try{return await fn();}finally{await db.exec('reset role');}};
 const call=(action,input,user=manager)=>as(user,async()=>(await db.query('select public.t21_eft($1,$2) v',[action,JSON.stringify({businessId:a,...input})])).rows[0].v);
 const record=(n,amount=4000,extra={},user=manager)=>call('record',{requestId:id(n),bankReference:'BANK-'+n,evidenceReference:'BANK-RECORD-'+n,receivedOn:'2026-10-30',amountCents:amount,...extra},user);
 return {db,as,call,record};
}
test('T21 database: evidence is unpaid until bank-verified allocation; partial/full, replay and tenant denials',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 const status=()=>f.call('status',{invoiceId:ia});
 await f.record(301);assert.equal((await status()).status,'unpaid');
 await assert.rejects(f.call('allocate',{invoiceId:ia,receiptId:id(301)}));
 await f.call('verify',{receiptId:id(301)});assert.equal((await status()).status,'unpaid');
 await f.call('allocate',{invoiceId:ia,receiptId:id(301)});assert.equal((await status()).status,'part_paid');
 await f.call('allocate',{invoiceId:ia,receiptId:id(301)});assert.equal((await status()).verifiedCents,4000);
 await f.record(302,6000);await f.call('verify',{receiptId:id(302)});await f.call('allocate',{invoiceId:ia,receiptId:id(302)});
 assert.deepEqual(await status(),{invoiceId:ia,bookingId:ia,businessId:a,totalCents:10000,verifiedCents:10000,balanceCents:0,status:'paid'});
 await f.record(303,1);await f.call('verify',{receiptId:id(303)});await assert.rejects(f.call('allocate',{invoiceId:ia,receiptId:id(303)}));
 assert.equal((await f.call('list',{})).filter(r=>!r.invoice_id).length,1);
 for(const user of [staff,foreign])for(const action of ['list','verify','status'])await assert.rejects(f.call(action,action==='list'?{}:action==='verify'?{receiptId:id(303)}:{invoiceId:ia},user),e=>e.code==='42501');
 await assert.rejects(f.call('allocate',{invoiceId:ib,receiptId:id(303)}));
 for(const role of ['anon','authenticated','service_role'])await assert.rejects(f.as(owner,()=>f.db.query('select * from private_t21.receipts'),role),e=>e.code==='42501');
 await f.db.query('delete from auth.sessions where user_id=$1',[manager]);await assert.rejects(f.call('list',{}),e=>e.code==='42501');
});
test('T21 database: immutable receipt identity, duplicate bank reference, cancelled and online conflicts',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 await f.record(301);await f.record(301);
 await assert.rejects(f.record(301,5000));await assert.rejects(f.record(302,4000,{bankReference:' bank-301 '}));
 await assert.rejects(f.record(302,-1));await assert.rejects(f.record(302,1.5));await assert.rejects(f.record(302,1,{receivedOn:'2999-01-01'}));
 await f.call('verify',{receiptId:id(301)});await f.call('verify',{receiptId:id(301)});
 await f.db.query("update public.one_off_bookings set status='cancelled' where id=$1",[ia]);await assert.rejects(f.call('allocate',{invoiceId:ia,receiptId:id(301)}));
 await f.db.query("update public.one_off_bookings set status='confirmed' where id=$1",[ia]);
 await f.as(owner,()=>f.db.query("select public.t20_payment_owner('configure',$1)",[JSON.stringify({businessId:a,accountId:'123',enabled:true})]));
 await f.as(owner,()=>f.db.query("select public.t20_payment_owner('create',$1)",[JSON.stringify({businessId:a,invoiceId:ia,requestId:id(500)})]));
 await assert.rejects(f.call('allocate',{invoiceId:ia,receiptId:id(301)}));
 await f.record(304,4000,{businessId:b},owner);await f.call('verify',{businessId:b,receiptId:id(304)},owner);await f.call('allocate',{businessId:b,invoiceId:ib,receiptId:id(304)},owner);
 await f.as(owner,()=>f.db.query("select public.t20_payment_owner('configure',$1)",[JSON.stringify({businessId:b,accountId:'456',enabled:true})]));
 await assert.rejects(f.as(owner,()=>f.db.query("select public.t20_payment_owner('create',$1)",[JSON.stringify({businessId:b,invoiceId:ib,requestId:id(501)})])));
 assert.equal((await f.call('status',{businessId:b,invoiceId:ib},owner)).verifiedCents,4000);
});
test('T21 UI escapes evidence and never treats recording as verification',()=>{
 const html=renderEft({id:a,name:'Synthetic'},[{id:id(301),bank_reference:'<script>',evidence_reference:'<img>',amount_cents:4000,received_on:'2026-10-30',recorded_by:owner,recorded_at:'2026-11-01'}]);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<img>'));assert.ok(html.includes('Unverified, unmatched'));assert.ok(html.includes('Verify bank receipt'));
});
test('T21 empty rollback retains payment history and refuses deletion once recorded',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const rollback=await readFile(new URL('../database/t21-eft-empty-rollback.sql',import.meta.url),'utf8');
 await f.record(301);await assert.rejects(f.db.exec(rollback));await f.db.exec('rollback');assert.equal((await f.call('list',{})).length,1);
 const empty=await fixture();t.after(()=>empty.db.close());await empty.db.exec(rollback);
 assert.equal((await empty.db.query("select to_regnamespace('private_t21') s")).rows[0].s,null);
 assert.ok((await empty.db.query("select to_regclass('private_t20.intents') s")).rows[0].s);
});
test('T21 real HTTP to SQL: manager records/verifies/matches, foreign/staff and CSRF rejected',async t=>{
 const {createStagingServer}=await import('../src/staging-server.js');const {request}=await import('node:http');
 const f=await fixture();t.after(()=>f.db.close());
 const createClient=()=>{let user=manager;return {
  auth:{signInWithPassword:async({email})=>{user=email.startsWith('staff')?staff:email.startsWith('foreign')?foreign:manager;return {data:{session:{expires_at:Date.now()/1000+3600}}};},getUser:async()=>({data:{user:{id:user}}}),signOut:async()=>({})},
  from(table){return {select(){return this;},eq(k,v){if(table==='businesses')return f.db.query("select id,name from businesses where status='active'").then(r=>({data:r.rows}));if(k==='status')return f.db.query("select * from business_memberships where user_id=$1 and status='active'",[user]).then(r=>({data:r.rows}));return this;}};},
  rpc:async(name,{action,input})=>{assert.equal(name,'t21_eft');try{return {data:await f.call(action,input,user)};}catch{return {error:{code:'42501'}};}}
 };};
 const server=createStagingServer({createClient,hostedStaging:true,hostedFingerprint:'a'.repeat(64),hostedTransport:'litespeed',hostedReady:()=>true,paymentProxy:()=>{throw Error('provider must not be used');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const http=(path,method='GET',form=null,cookie='',origin='https://staging.faraios.com')=>new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{host:'staging.faraios.com',origin,cookie,'content-type':'application/x-www-form-urlencoded'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body,cookie:res.headers['set-cookie']?.[0]?.split(';')[0]}));});req.on('error',reject);req.end(form?new URLSearchParams(form).toString():undefined);
 });
 const path='/eft?business='+a;
 assert.equal((await http(path)).status,303);
 const login=await http('/login','POST',{email:'manager@example.test',password:'synthetic-test-only'});assert.equal(login.status,303);const cookie=login.cookie;
 assert.equal((await http(path,'GET',null,cookie)).status,200);
 const receipt={action:'record',requestId:id(701),bankReference:'HTTP-BANK',evidenceReference:'HTTP-RECORD',amount:'100.00',receivedOn:'2026-10-30'};
 assert.equal((await http(path,'POST',receipt,cookie,'https://evil.example')).status,403);
 assert.equal((await f.call('list',{})).length,0);
 assert.equal((await http(path,'POST',receipt,cookie)).status,303);
 assert.equal((await http(path,'POST',{action:'verify',receiptId:id(701),confirmed:'yes'},cookie)).status,303);
 assert.equal((await http(path,'POST',{action:'allocate',receiptId:id(701),invoiceId:ia},cookie)).status,303);
 // A duplicate bank transaction must stay inside the workspace with saved facts.
 const duplicate=await http(path,'POST',{...receipt,requestId:id(702)},cookie);
 assert.equal(duplicate.status,409);assert.ok(duplicate.body.includes('Manual EFT reconciliation'));assert.ok(duplicate.body.includes('role="alert"'));assert.ok(duplicate.body.includes('could not be confirmed'));assert.ok(duplicate.body.includes('HTTP-BANK'));assert.ok(!duplicate.body.includes('Welcome back'));
 assert.equal((await f.call('list',{})).length,1);
 const result=await http(path+'&invoice='+ia,'GET',null,cookie);assert.equal(result.status,200);assert.ok(result.body.includes('Payment: paid'));assert.ok(result.body.includes(ia));assert.ok(result.body.includes('Balance R 0.00'));
 for(const role of ['staff','foreign']){const login=await http('/login','POST',{email:role+'@example.test',password:'synthetic-test-only'});assert.notEqual((await http(path,'GET',null,login.cookie)).status,200);}
 assert.equal((await f.call('status',{invoiceId:ia})).verifiedCents,10000);
});
