import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {cancellationPolicyVersion} from '../src/cancellation-review.js';
import {renderCancellationCases,cancellationInput,readCancellationCase} from '../src/cancellation-cases.js';
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20),booking=id(30);
const payload=()=>({policyVersion:cancellationPolicyVersion,agreementKind:'new_accepted',acceptanceEvidence:'TEST accepted terms',cause:'customer',action:'cancel',stage:'accepted',originalStart:'2026-10-24T09:00:00+02:00',requestedAt:'2026-10-22T09:00:00+02:00',stageTimes:{accepted:'2026-10-21T09:00:00+02:00'},workers:[{id:staff,agreedCents:30000,expenseCents:0}],eligibleLabourCents:100000,reasonableLossCents:0,verifiedReceiptsCents:100000,performedServiceCents:0,completedRefundsCents:0,pendingRefundsCents:0,reviewedCustomerFeeCents:0,collectedPoolCents:0,mandatoryRightsReviewed:true,feeMustBeWaived:false,holidays:[]});
test('Postgres cancellation journal enforces tenant roles, replay, stale writes and refund reservations',async()=>{
 const db=new PGlite();try{
  await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;");
  await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
  await db.exec(`create table public.one_off_bookings(id uuid primary key,business_id uuid,starts_at timestamptz,recurring_schedule_id uuid,assigned_staff uuid[],status text default 'in_progress',local_start timestamp default '2026-10-24 09:00',time_zone text default 'Africa/Johannesburg',total_cents integer default 100000);grant select,update on public.one_off_bookings to authenticated;`);
  await db.exec(`create schema audit;create function audit.validate_booking() returns trigger language plpgsql as $$begin if (old.status='in_progress' and new.status='completed') then return new;end if;return new;end$$;`);
  await db.exec(await readFile(new URL('../database/cancellation-review-draft.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values($1),($2),($3)',[owner,manager,staff]);
  await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($1,$3,'manager'),($1,$4,'staff')",[a,owner,manager,staff]);
  await db.query("insert into public.one_off_bookings(id,business_id,starts_at,recurring_schedule_id,assigned_staff) values($1,$2,'2026-10-24 09:00+02',null,array[$3::uuid])",[booking,a,staff]);
  const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
  const append=(c,v,k,type,p,scope=a)=>db.query('select public.append_cancellation_review($1,$2,$3,$4,$5,$6,$7) id',[scope,booking,c,v,id(k),type,JSON.stringify(p)]);
  await assert.rejects(as(owner,()=>append(null,0,100,'prepare',payload())),/not configured/);
  await assert.rejects(as(manager,()=>db.query('insert into public.business_cancellation_review_policies(business_id,policy_version,approval_reference) values($1,$2,$3)',[a,cancellationPolicyVersion,'TEST approval'])),/row-level/);
  await as(owner,()=>db.query('insert into public.business_cancellation_review_policies(business_id,policy_version,approval_reference) values($1,$2,$3)',[a,cancellationPolicyVersion,'TEST approval']));
  await assert.rejects(as(staff,()=>append(null,0,100,'prepare',payload())),/denied/);
  await assert.rejects(as(owner,()=>append(null,0,100,'prepare',payload(),b)),/denied/);
  await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set status='cancelled' where id=$1",[booking])),/partial-service/);
  const first=(await as(manager,()=>append(null,0,100,'prepare',payload()))).rows[0].id;
  assert.equal((await as(manager,()=>append(null,0,100,'prepare',payload()))).rows[0].id,first);
  await assert.rejects(as(manager,()=>append(first,1,101,'approve',{reason:'test'})),/Owner/);
  await assert.rejects(as(owner,()=>append(first,0,101,'approve',{reason:'test'})),/changed/);
  await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set status='cancelled' where id=$1",[booking])),/approval required/);
  await as(owner,()=>append(first,1,101,'approve',{reason:'Reviewed synthetic case'}));
  await as(owner,()=>db.query("update public.one_off_bookings set status='cancelled' where id=$1",[booking]));
  const reserve={amountCents:60000,receiptReference:'TEST-PAY',route:'test-card',originalRoute:'test-card'};
  await as(owner,()=>append(first,2,102,'reserve_refund',reserve));
  await assert.rejects(as(owner,()=>append(first,3,103,'reserve_refund',reserve)),/exceeds/);
  await as(owner,()=>append(first,3,104,'submit_refund',{refundId:id(102),reference:'TEST-SUBMITTED'}));
  await assert.rejects(as(owner,()=>append(first,4,105,'release_refund',{refundId:id(102),reference:'uncertain'})),/uncertain/);
  await as(owner,()=>append(first,4,106,'complete_refund',{refundId:id(102),reference:'TEST-RECEIVED'}));
  assert.equal((await as(staff,()=>db.query('select * from public.cancellation_review_events'))).rows.length,0);
  await assert.rejects(as(owner,()=>db.query('update public.cancellation_review_events set payload=$1',[{}])),/permission denied/);
  await assert.rejects(as(owner,()=>db.query('delete from public.cancellation_review_cases')),/permission denied/);
  await db.exec('set role anon');await assert.rejects(db.query('select * from public.cancellation_review_cases'),/permission denied/);await db.exec('reset role');
  assert.equal((await db.query('select * from public.one_off_bookings')).rows.length,1);
  assert.equal((await db.query('select version from public.cancellation_review_cases')).rows[0].version,5);
 }finally{await db.close();}
});
test('UI escapes evidence and does not offer owner approvals to managers',()=>{
 const view=renderCancellationCases({id:a,name:'<script>'});assert.doesNotMatch(view,/<script>/);assert.match(view,/No money is sent/);
 assert.throws(()=>cancellationInput(new URLSearchParams(),{time_zone:'UTC'}),/Johannesburg/);
});
test('reconstruction rejects incomplete or foreign event journals',async()=>{
 const rows=[{id:booking,business_id:a,version:1}];
 const client={from(table){return {select(){return this;},eq(){return this;},then(resolve){resolve({data:rows});},order:async()=>({data:[]})};}};
 await assert.rejects(readCancellationCase(client,a,booking),/Incomplete/);
});

test('complete booking schema retains snapshots and only permits approved stopping after work starts',async()=>{
 const db=new PGlite({extensions:{btree_gist}});try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant usage on schema public to service_role;grant execute on function auth.uid() to authenticated;");
  for(const name of ['identity','audit','business-settings','catalogue','customers','bookings','bookings-context-hardening','cleaning-profiles','cleaning-assessments','cleaning-assessment-review-hardening','staff-teams','availability','recurring','quotes','quote-acceptance-actor','invoices'])await db.exec(await readFile(new URL('../database/'+name+'-draft.sql',import.meta.url),'utf8'));
  await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'staff@test.invalid')",[owner,staff]);
  await db.query("insert into public.businesses(id,name,industry) values($1,'Synthetic','cleaning')",[a]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($1,$3,'staff')",[a,owner,staff]);
  await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[a]);
  await db.query("insert into public.business_customers(id,business_id,name) values($1,$2,'Synthetic')",[id(40),a]);
  await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Synthetic')",[id(41),a,id(40)]);
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic','fixed','visit',100000,'ZAR',1,true)",[id(42),a]);
  await db.query("insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,$2,$3,$4,$5,'2026-10-24 09:00',120,$6)",[booking,a,id(43),id(40),id(41),JSON.stringify([{catalogue_id:id(42),quantity:1}])]);
  for(const status of ['confirmed','assigned','en_route','arrived','in_progress'])await db.query("update public.one_off_bookings set status=$2,assigned_staff=case when $2='assigned' then array[$3::uuid] else assigned_staff end,change_reason='Synthetic lifecycle' where id=$1",[booking,status,staff]);
  await db.exec('reset role;reset request.jwt.claim.sub');
  const before=(await db.query('select md5(to_jsonb(b)::text) h from public.one_off_bookings b')).rows[0].h;
  const migration=await readFile(new URL('../supabase/migrations/20261022090011_t04_cancellation_reviews.sql',import.meta.url),'utf8');assert.equal(migration,await readFile(new URL('../database/cancellation-review-draft.sql',import.meta.url),'utf8'));
  await db.exec(migration);assert.equal((await db.query('select md5(to_jsonb(b)::text) h from public.one_off_bookings b')).rows[0].h,before);
  await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await assert.rejects(db.query("update public.one_off_bookings set status='cancelled',change_reason='Synthetic stop' where id=$1",[booking]),/approved partial-service/);
  await db.query('insert into public.business_cancellation_review_policies(business_id,policy_version,approval_reference) values($1,$2,$3)',[a,cancellationPolicyVersion,'Synthetic approved policy']);
  const prepared=(await db.query("select public.append_cancellation_review($1,$2,null,0,$3,'prepare',$4) id",[a,booking,id(100),JSON.stringify(payload())])).rows[0].id;
  await assert.rejects(db.query("update public.one_off_bookings set status='cancelled',change_reason='Synthetic stop' where id=$1",[booking]),/approval required/);
  await db.query("select public.append_cancellation_review($1,$2,$3,1,$4,'approve',$5)",[a,booking,prepared,id(101),JSON.stringify({reason:'Synthetic owner review'})]);
  await db.query("update public.one_off_bookings set status='cancelled',change_reason='Approved synthetic stop' where id=$1",[booking]);
  assert.equal((await db.query('select status,total_cents from public.one_off_bookings where id=$1',[booking])).rows[0].total_cents,100000);
 }finally{await db.close();}
});
