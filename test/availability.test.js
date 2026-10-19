import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {calendarOptions,readCalendar,checkAvailability,renderCalendar} from '../src/calendar.js';
import {updateBooking} from '../src/bookings.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),other=id(4),a=id(10),b=id(20);
test('atomic reservations reject cross-business overlaps and preserve tenant privacy',async()=>{
 const db=new PGlite({extensions:{btree_gist}});
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
  for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
  await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid'),($4,'other@test.invalid')",[owner,manager,staff,other]);
  await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($1,$5,'staff'),($2,$5,'staff'),($1,$6,'staff')",[a,b,owner,manager,staff,other]);
  const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
  for(const [business,n] of [[a,10],[b,20]])await as(owner,async()=>{
   await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg')",[business]);
   await db.query("insert into public.business_customers(id,business_id,name,private_notes) values($1,$2,$3,'Secret note')",[id(n+100),business,business===a?'Private A customer':'B customer']);
   await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Secret address')",[id(n+101),business,id(n+100)]);
   await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic','fixed','visit',10000,'ZAR',1,true)",[id(n+102),business]);
  });
  const create=async(business,n,start='2026-10-20 09:00')=>(await as(owner,()=>db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,gen_random_uuid(),$2,$3,$4,120,$5) returning *",[business,id(n+100),id(n+101),start,JSON.stringify([{catalogue_id:id(n+102),quantity:1}])]))).rows[0];
  const change=(booking,status,team=null)=>db.query("update public.one_off_bookings set status=$2,assigned_staff=coalesce($3::uuid[],assigned_staff),change_reason='Synthetic test' where id=$1 returning *",[booking,status,team]);
  const ba=await create(a,10),bb=await create(b,20);
  await as(owner,()=>change(ba.id,'confirmed'));await as(manager,()=>change(bb.id,'confirmed'));
  assert.equal((await db.query('select count(*)::int n from audit.cleaner_reservations')).rows[0].n,0);
  await as(owner,()=>change(ba.id,'assigned',[staff]));
  await assert.rejects(as(manager,()=>change(bb.id,'assigned',[staff])),e=>e.code==='23P01'&&!e.detail&&/cleaners are busy/.test(e.message));
  assert.equal((await db.query('select status,version from public.one_off_bookings where id=$1',[bb.id])).rows[0].status,'confirmed');
  const calendar=(await as(manager,()=>db.query("select public.calendar_window($1,'2026-10-20',7) value",[b]))).rows[0].value;
  assert.equal(calendar.bookings.length,1);assert.deepEqual(Object.keys(calendar.busy[0]).sort(),['ends_at','staff_id','starts_at']);
  assert.doesNotMatch(JSON.stringify(calendar),/Private A|Secret|10000/);
  let available=(await as(manager,()=>db.query("select public.staff_availability($1,'2026-10-20 10:59',15,null) value",[b]))).rows[0].value;assert.equal(available.staff[0].busy,true);
  available=(await as(manager,()=>db.query("select public.staff_availability($1,'2026-10-20 11:00',120,null) value",[b]))).rows[0].value;assert.equal(available.staff[0].busy,false);
  await assert.rejects(as(manager,()=>db.query("select public.staff_availability($1,'2026-10-20 09:00',120,$2)",[b,ba.id])),/access denied/);
  await as(manager,()=>db.query("update public.one_off_bookings set local_start='2026-10-20 11:00',change_reason='Later' where id=$1",[bb.id]));
  await as(manager,()=>change(bb.id,'assigned',[staff]));
  await assert.rejects(as(manager,()=>db.query("update public.one_off_bookings set local_start='2026-10-20 10:59',change_reason='Overlap' where id=$1",[bb.id])),/cleaners are busy/);
  assert.equal((await db.query('select lower(occupied) v from audit.cleaner_reservations where booking_id=$1',[bb.id])).rows[0].v.toISOString(),'2026-10-20T09:00:00.000Z');
  // A failed multi-person reassignment must restore every previous reservation.
  const bc=await create(a,10,'2026-10-20 11:00');await as(owner,()=>change(bc.id,'confirmed'));await as(owner,()=>change(bc.id,'assigned',[other]));
  await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set assigned_staff=$2,change_reason='Conflict' where id=$1",[bc.id,[other,staff]])),/cleaners are busy/);
  assert.deepEqual((await db.query('select staff_id from audit.cleaner_reservations where booking_id=$1',[bc.id])).rows.map(r=>r.staff_id),[other]);
  await as(manager,()=>change(bb.id,'cancelled'));await as(owner,()=>db.query("update public.one_off_bookings set assigned_staff=$2,change_reason='Both free' where id=$1",[bc.id,[other,staff]]));
  for(const status of ['en_route','arrived','in_progress','completed'])await as(owner,()=>change(bc.id,status));
  assert.equal((await db.query('select count(*)::int n from audit.cleaner_reservations where booking_id=$1',[bc.id])).rows[0].n,2);
  await assert.rejects(as(manager,()=>db.query('select * from audit.cleaner_reservations')),/permission denied/);
  await assert.rejects(as(manager,()=>db.query("select public.calendar_window($1,'2026-10-20',7)",[a])),/access denied/);
  await assert.rejects(as(staff,()=>db.query("select public.calendar_window($1,'2026-10-20',7)",[a])),/access denied/);
  await assert.rejects(as(manager,()=>db.query("select public.calendar_window($1,'2026-10-20',8)",[b])),/seven-day/);
  await db.exec('set role anon');await assert.rejects(db.query("select public.calendar_window($1,'2026-10-20',7)",[a]),/permission denied/);await db.exec('reset role');
  await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[b,manager]);
  await assert.rejects(as(manager,()=>db.query("select public.calendar_window($1,'2026-10-20',7)",[b])),/access denied/);
 }finally{await db.close();}
});
test('calendar date validation, escaped rendering and safe booking conflict errors',async()=>{
 assert.equal(calendarOptions(new URLSearchParams(),'Africa/Johannesburg',new Date('2026-10-19T22:30Z')).day,'2026-10-20');
 for(const day of ['2026-02-30','bad'])assert.throws(()=>calendarOptions(new URLSearchParams({day}),'UTC'));
 assert.throws(()=>calendarOptions(new URLSearchParams({view:'month'}),'UTC'));
 await assert.rejects(checkAvailability({},a,new URLSearchParams({local_start:'bad',duration_minutes:'120'})),e=>e.status===422);
 await assert.rejects(readCalendar({rpc:async()=>({data:{}})},a,{day:'2026-10-20',days:7}),/unavailable/);
 const markup=renderCalendar({id:a,name:'<script>'},{staff:[{user_id:staff,label:'<script>'}]},{time_zone:'UTC',bookings:[],busy:[{staff_id:staff,starts_at:'2026-10-20T09:00Z',ends_at:'2026-10-20T11:00Z'}]}, {day:'2026-10-20',days:1,view:'day'});
 assert.doesNotMatch(markup,/<script>/);assert.match(markup,/Other-business assignment/);
 const q={eq(){return this;},select:async()=>({error:{code:'23P01',message:'private detail',details:'secret'}})};
 await assert.rejects(updateBooking({from:()=>({update:()=>q})},a,{id:id(99),status:'confirmed'},new URLSearchParams({version:'1',action:'transition',status:'assigned',assigned_staff:staff})),e=>e.status===409&&!/private|secret/.test(e.message));
});
