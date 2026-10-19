import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {invoiceTotals,renderInvoices,syncInvoice,saveAccountingConnection} from '../src/invoices.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20);
const files=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql','invoices-draft.sql'];
async function fixture(){
 const db=new PGlite({extensions:{btree_gist}});
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant usage on schema public to service_role;grant execute on function auth.uid() to authenticated;");
 for(const file of files)await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid')",[owner,manager,staff]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($1,$5,'staff'),($2,$5,'staff')",[a,b,owner,manager,staff]);
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 const worker=async fn=>{await db.exec('set role service_role');try{return await fn();}finally{await db.exec('reset role');}};
 for(const [business,n] of [[a,10],[b,20]])await as(owner,async()=>{
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[business]);
  await db.query("insert into public.business_customers(id,business_id,name,phone) values($1,$2,'Synthetic customer','0000000000')",[id(n+100),business]);
  await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Synthetic street')",[id(n+101),business,id(n+100)]);
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic service','fixed','visit',10000,'ZAR',1,true)",[id(n+102),business]);
  await db.query("insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,$2,$3,$4,$5,'2026-11-02 09:00',120,$6)",[id(n+200),business,id(n+201),id(n+100),id(n+101),JSON.stringify([{catalogue_id:id(n+102),quantity:1}])]);
 });
 const prepare=(business,n)=>db.query('select public.prepare_invoice($1,$2) id',[business,id(n+200)]);
 const configure=(business,org,version=0,enabled=true)=>db.query('select public.configure_accounting($1,$2,$3,$4,$5,$6)',[business,version,org,'https://www.zohoapis.com',business===a?'A_TEST':'B_TEST',enabled]);
 const claim=(business,invoice,actor=owner,customer='123')=>db.query('select public.claim_invoice_sync($1,$2,$3,$4) claim',[business,invoice,actor,customer]);
 const finish=(business,invoice,attempt,actor,outcome,code,receipt=null)=>db.query('select public.finish_invoice_sync($1,$2,$3,$4,$5,$6,$7)',[business,invoice,attempt,actor,outcome,code,receipt]);
 return {db,as,worker,prepare,configure,claim,finish};
}
test('invoice preparation is scoped, immutable, idempotent and separate from operational/payment state',async()=>{
 const {db,as,worker,prepare,configure,claim,finish}=await fixture();
 try{
  const auditBefore=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
  await db.exec("create function audit.test_invoice_failure() returns trigger language plpgsql as $$begin raise exception 'Forced invoice failure';end$$;create trigger test_invoice_failure after insert on public.business_invoices for each row execute function audit.test_invoice_failure();");
  await assert.rejects(as(owner,()=>prepare(a,10)),/Forced invoice failure/);assert.equal((await db.query('select count(*)::int n from public.business_invoices')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,auditBefore);await db.exec('drop trigger test_invoice_failure on public.business_invoices;drop function audit.test_invoice_failure()');
  const original=(await db.query("select md5(string_agg(to_jsonb(t)::text,',' order by id)) digest from public.one_off_bookings t")).rows[0].digest;
  const ia=(await as(owner,()=>prepare(a,10))).rows[0].id,ib=(await as(manager,()=>prepare(b,20))).rows[0].id;
  assert.equal((await as(owner,()=>prepare(a,10))).rows[0].id,ia);assert.notEqual(ia,ib);
  const inv=(await db.query('select * from public.business_invoices where id=$1',[ia])).rows[0];assert.equal(inv.total_cents,10000);assert.equal(inv.document_status,'draft');assert.equal(inv.sync_status,'not_synced');assert.equal(inv.external_invoice_id,null);
  assert.equal((await as(manager,()=>db.query('select count(*)::int n from public.business_invoices'))).rows[0].n,1);assert.equal((await as(staff,()=>db.query('select count(*)::int n from public.business_invoices'))).rows[0].n,0);
  await assert.rejects(as(manager,()=>prepare(a,10)),e=>e.code==='42501');await assert.rejects(as(staff,()=>prepare(a,10)),e=>e.code==='42501');
  for(const table of ['business_invoices','business_accounting_connections'])for(const sql of ['update public.'+table+" set business_id='"+b+"'",'delete from public.'+table,'insert into public.'+table+'(business_id) values(\''+a+'\')'])await assert.rejects(as(owner,()=>db.exec(sql)),e=>e.code==='42501');
  await assert.rejects(as(manager,()=>configure(b,'222')),e=>e.code==='42501');await as(owner,()=>configure(a,'111'));await as(owner,()=>configure(b,'222'));await assert.rejects(as(owner,()=>configure(b,'111',1)),e=>e.code==='23505');
  await assert.rejects(as(owner,()=>claim(a,ia)),e=>e.code==='42501');await assert.rejects(as(manager,()=>finish(b,ib,id(999),manager,'matched','',{})),e=>e.code==='42501');
  const claimA=(await worker(()=>claim(a,ia))).rows[0].claim;assert.equal(claimA.mode,'create');
  await assert.rejects(worker(()=>claim(a,ia)),e=>e.code==='40001');
  const beforeNull=(await db.query('select version,sync_status from public.business_invoices where id=$1',[ia])).rows[0],auditNull=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
  await assert.rejects(worker(()=>finish(a,ia,null,owner,'failed','credentials')),e=>e.code==='40001');
  assert.deepEqual((await db.query('select version,sync_status from public.business_invoices where id=$1',[ia])).rows[0],beforeNull);assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,auditNull);
  const receipt={...claimA.invoice.provider_binding,invoice_id:'9001',invoice_number:'TEST-0001',reference_number:'FaraiOS:'+ia,customer_id:'123',currency_code:'ZAR',total_cents:10000,status:'draft',price_lines:inv.snapshot.price_lines};
  await assert.rejects(worker(()=>finish(a,ia,claimA.invoice.attempt_id,owner,'matched','',{...receipt,total_cents:1})),/does not match/);
  await worker(()=>finish(a,ia,claimA.invoice.attempt_id,owner,'matched','',receipt));
  const replay=(await worker(()=>claim(a,ia))).rows[0].claim;assert.equal(replay.mode,'reconcile');
  await assert.rejects(worker(()=>finish(a,ia,claimA.invoice.attempt_id,owner,'matched','',receipt)),e=>e.code==='40001');await worker(()=>finish(a,ia,replay.invoice.attempt_id,owner,'matched','',receipt));
  const sums=(await as(owner,()=>db.query('select public.invoice_totals($1) t',[a]))).rows[0].t;assert.equal(sums.count,1);assert.equal(sums.matched_cents,10000);assert.equal(sums.matched_count+sums.review_count+sums.pending_count,sums.count);
  await assert.rejects(as(owner,()=>configure(a,'333',1)),/pinned/);
  await db.query("update public.business_catalogue set price_cents=20000 where id=$1",[id(112)]);
  assert.deepEqual((await db.query('select snapshot from public.business_invoices where id=$1',[ia])).rows[0].snapshot,inv.snapshot);
  assert.equal((await db.query("select md5(string_agg(to_jsonb(t)::text,',' order by id)) digest from public.one_off_bookings t")).rows[0].digest,original);
  await db.exec('set role anon');await assert.rejects(prepare(a,10),e=>e.code==='42501');await db.exec('reset role');
 }finally{await db.close();}
});
test('uncertain attempts never permit automatic re-creation, and cancellations hold accounting',async()=>{
 const {db,as,worker,prepare,configure,claim,finish}=await fixture();
 try{
  const i=(await as(owner,()=>prepare(a,10))).rows[0].id;await as(owner,()=>configure(a,'111'));
  const first=(await worker(()=>claim(a,i))).rows[0].claim;
  await db.query("update public.business_invoices set attempt_started_at=clock_timestamp()-interval '3 minutes' where id=$1",[i]);
  const totals=(await as(owner,()=>db.query('select public.invoice_totals($1) t',[a]))).rows[0].t;assert.equal(totals.review_count,1);assert.equal(totals.pending_count,0);
  const retry=(await worker(()=>claim(a,i))).rows[0].claim;assert.equal(retry.mode,'reconcile');await assert.rejects(worker(()=>finish(a,i,retry.invoice.attempt_id,owner,'failed','credentials')),/require review/);await worker(()=>finish(a,i,retry.invoice.attempt_id,owner,'review_required','unknown_outcome'));
  assert.equal((await worker(()=>claim(a,i))).rows[0].claim.mode,'reconcile');
  await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,owner]);
  await assert.rejects(worker(()=>finish(a,i,first.invoice.attempt_id,owner,'failed','credentials')),e=>e.code==='42501');
  await db.query("update public.business_memberships set status='active' where business_id=$1 and user_id=$2",[a,owner]);
  await as(owner,()=>db.query("update public.one_off_bookings set status='cancelled',change_reason='Synthetic review' where id=$1",[id(210)]));
  await assert.rejects(worker(()=>claim(a,i)),/Cancelled booking/);assert.equal((await as(owner,()=>prepare(a,10))).rows[0].id,i);
  await as(owner,()=>db.query("update public.one_off_bookings set status='cancelled',change_reason='Synthetic cancellation' where id=$1",[id(220)]));
  await assert.rejects(as(owner,()=>prepare(b,20)),/Cancelled booking/);
 }finally{await db.close();}
});

test('list and detail cancellation holds agree with whole-business totals and escaped saved values',()=>{
 const i={id:id(500),business_id:a,booking_id:id(210),snapshot:{customer_snapshot:{name:'<name>'},address_snapshot:{address_line:'Synthetic'},price_lines:[],time_zone:'UTC'},total_cents:10000,sync_status:'matched',document_status:'draft',external_invoice_number:'TEST-1',booking:{status:'cancelled'}};
 const totals={count:1,total_cents:10000,matched_count:0,matched_cents:0,pending_count:0,review_count:1};
 const list=renderInvoices({id:a,name:'Synthetic'},[i],{totals});assert.match(list,/Accounting needs review/);assert.doesNotMatch(list,/Zoho draft matched/);assert.match(list,/&lt;name&gt;/);assert.match(list,/exclude unrelated Zoho records/);
 const detail=renderInvoices({id:a,name:'Synthetic'},[],{invoice:i,booking:{status:'cancelled'},workerConfigured:true,connection:{enabled:true}});assert.match(detail,/Accounting actions are held/);assert.doesNotMatch(detail,/name="action" value="sync"/);
});
test('server orchestration cannot accept a foreign claim and UI connection payload cannot carry secrets',async()=>{
 const invoice={id:id(500),business_id:a};let calls=0;
 await assert.rejects(syncInvoice({worker:{rpc:async()=>({data:{invoice:{id:id(500),business_id:b,attempt_id:id(700)},actor:owner,connection:{business_id:a},mode:'create'}})},adapter:{sync:async()=>{calls++;}},businessId:a,invoice,actor:owner,customerId:'123'}),/claim unavailable/);assert.equal(calls,0);
 await assert.rejects(invoiceTotals({rpc:async()=>({data:{business_id:a,count:1,total_cents:100,matched_count:1,matched_cents:100,pending_count:1,review_count:0}})},a),/totals unavailable/);
 let sent;await saveAccountingConnection({rpc:async(name,params)=>{sent=params;return {data:1};}},a,new URLSearchParams({organization_id:'123',api_domain:'https://www.zohoapis.com',credential_key:'SYNTHETIC_TEST',version:'0',enabled:'no',client_secret:'NEVER_SEND'}));assert.doesNotMatch(JSON.stringify(sent),/NEVER_SEND|client_secret/);
});
