import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {parseRecurring,createRecurring,changeRecurring,generateRecurring,renderRecurring} from '../src/recurring.js';
import {definitions,profileFields} from '../src/cleaning-profiles.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20);
test('recurring schedules preserve agreements and history, enforce RLS and reject duplicate visits',async()=>{
 const db=new PGlite({extensions:{btree_gist}});
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
  for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
  await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid')",[owner,manager,staff]);
  await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($1,$5,'staff'),($2,$5,'staff')",[a,b,owner,manager,staff]);
  const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
  for(const [business,n] of [[a,10],[b,20]])await as(owner,async()=>{
   await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg')",[business]);
   await db.query("insert into public.business_customers(id,business_id,name,private_notes) values($1,$2,'Synthetic customer','Private note excluded')",[id(n+100),business]);
   await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Synthetic address')",[id(n+101),business,id(n+100)]);
   await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic','fixed','visit',10000,'ZAR',1,true)",[id(n+102),business]);
   await db.query("insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,$2,gen_random_uuid(),$3,$4,(now() at time zone 'Africa/Johannesburg')::date+1+time '09:00',120,$5)",[id(n+103),business,id(n+100),id(n+101),JSON.stringify([{catalogue_id:id(n+102),quantity:1}])]);
  });
  const before=(await db.query("select md5(string_agg(to_jsonb(t)::text,',' order by id)) digest from public.one_off_bookings t")).rows[0].digest;
  const create=(business,n,key=id(n+104))=>db.query("select public.create_recurring($1,$2,$3,'weekly',array[0,1,2,3,4,5,6]::smallint[],null,'last_day') id",[business,id(n+103),key]);
  const sa=(await as(owner,()=>create(a,10))).rows[0].id,sb=(await as(manager,()=>create(b,20))).rows[0].id;
  assert.equal((await as(owner,()=>create(a,10))).rows[0].id,sa);
  await assert.rejects(as(owner,()=>create(a,10,id(999))),e=>e.code==='23505');
  await assert.rejects(as(manager,()=>create(a,10)),/access denied/);
  assert.equal((await db.query("select md5(string_agg(to_jsonb(t)::text,',' order by id)) digest from public.one_off_bookings t")).rows[0].digest,before);
  assert.equal((await as(manager,()=>db.query('select count(*)::int n from public.recurring_schedules'))).rows[0].n,1);
  assert.equal((await as(staff,()=>db.query('select count(*)::int n from public.recurring_schedules'))).rows[0].n,0);
  await assert.rejects(as(staff,()=>create(a,10)),/access denied/);
  await assert.rejects(as(owner,()=>db.query("update public.recurring_schedules set status='cancelled' where id=$1",[sa])),/permission denied/);
  const through=(await db.query("select ((now() at time zone 'Africa/Johannesburg')::date+8)::text d")).rows[0].d;
  const generate=(business,s,version=1,horizon=through)=>db.query('select public.generate_recurring($1,$2,$3,$4) n',[business,s,version,horizon]);
  await as(owner,()=>db.query("update public.business_catalogue set price_cents=99999,is_active=false where id=$1",[id(112)]));
  assert.equal((await as(owner,()=>generate(a,sa))).rows[0].n,7);
  assert.equal((await as(manager,()=>generate(b,sb))).rows[0].n,7);
  assert.equal((await as(owner,()=>generate(a,sa))).rows[0].n,0);
  const visits=(await db.query('select * from public.one_off_bookings where recurring_schedule_id=$1 order by recurring_occurrence_date',[sa])).rows;
  assert.equal(visits[0].total_cents,10000);assert.equal(visits[0].status,'draft');assert.deepEqual(visits[0].assigned_staff,[]);assert.doesNotMatch(JSON.stringify(visits),/Private note excluded/);
  const booking=visits[0].id;
  await assert.rejects(as(owner,()=>db.query('update public.one_off_bookings set recurring_schedule_id=$2 where id=$1',[booking,sb])),/identity is immutable/);
  for(const status of ['confirmed','assigned','en_route','arrived','in_progress','completed'])await as(owner,()=>db.query("update public.one_off_bookings set status=$2,assigned_staff=case when $2='assigned' then array[$3::uuid] else assigned_staff end,change_reason='Test lifecycle' where id=$1",[booking,status,staff]));
  assert.equal((await db.query('select count(*)::int n from audit.cleaner_reservations where booking_id=$1',[booking])).rows[0].n,1);
  const cancelled=visits[1].id;await as(owner,()=>db.query("update public.one_off_bookings set status='cancelled',change_reason='Skip this visit' where id=$1",[cancelled]));
  const digest=async()=>(await db.query("select md5(string_agg(to_jsonb(t)::text,',' order by id)) digest from public.one_off_bookings t")).rows[0].digest;
  const history=await digest();
  const change=(version,status='active',time='10:30')=>db.query("select public.change_recurring($1,$2,$3,'fortnightly',array[1,3,5]::smallint[],$4,null,'last_day',$5,'New schedule')",[a,sa,version,time,status]);
  await as(owner,()=>change(2));assert.equal(await digest(),history);
  await assert.rejects(as(owner,()=>change(2)),/Schedule changed/);
  await assert.rejects(as(manager,()=>generate(a,sa)),/access denied/);
  await assert.rejects(as(owner,()=>generate(a,sa,2,'9999-12-31')),/90 days/);
  assert.equal((await as(owner,()=>generate(a,sa,1))).rows[0].n,0);assert.equal(await digest(),history);
  await as(owner,()=>change(3,'paused'));await assert.rejects(as(owner,()=>generate(a,sa,4)),/not active/);
  await as(owner,()=>change(4,'cancelled'));await assert.rejects(as(owner,()=>change(5,'active')),/Cancelled schedules/);assert.equal(await digest(),history);
  assert.equal((await db.query("select count(*)::int n from audit.events where entity_table='recurring_schedules'")).rows[0].n,7);
  // A failure after one successful insert must roll back visits, cursor and audit.
  const horizons=(await db.query("select ((now() at time zone 'Africa/Johannesburg')::date+10)::text d,extract(dow from (now() at time zone 'Africa/Johannesburg')::date+10)::int dow")).rows[0];
  const beforeFailure=await digest(),scheduleBefore=(await db.query('select to_jsonb(s) data from public.recurring_schedules s where id=$1',[sb])).rows[0].data;
  await as(owner,()=>db.query('update public.business_settings set working_days=$2 where business_id=$1',[b,[0,1,2,3,4,5,6].filter(d=>d!==horizons.dow)]));
  const auditBefore=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
  await assert.rejects(as(manager,()=>generate(b,sb,2,horizons.d)),/Outside business working hours/);
  assert.equal(await digest(),beforeFailure);assert.deepEqual((await db.query('select to_jsonb(s) data from public.recurring_schedules s where id=$1',[sb])).rows[0].data,scheduleBefore);assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,auditBefore);
  await as(owner,()=>db.query('update public.business_settings set working_days=array[0,1,2,3,4,5,6]::smallint[] where business_id=$1',[b]));
  assert.equal((await as(manager,()=>generate(b,sb,2,horizons.d))).rows[0].n,2);
  // Configured scope/duration/assessment paths must also retain the saved agreement.
  const rules={},scope={};for(const k of profileFields.regular){const d=definitions[k].custom?{...definitions[k],options:['No animals','Birds present']}:definitions[k];rules[k]={};for(const v of d.count?['unit']:d.options)rules[k][v]={cents:100,minutes:1};scope[k]=d.count?1:d.options[0];}
  const cfg={base_minutes:60,service_fee_cents:0,rules,equipment:{policy:'included'},extras:[],extra_minutes:{}};
  await as(owner,()=>db.query("update public.business_customers set phone='0000000000' where business_id=$1",[a]));
  await as(owner,()=>db.query("update public.business_catalogue set is_active=true,cleaning_profile='regular',cleaning_config=$2 where id=$1",[id(112),JSON.stringify(cfg)]));
  const scoped=(await as(owner,()=>db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,(now() at time zone 'Africa/Johannesburg')::date+1+time '13:00',15,$4,$5) returning *",[a,id(110),id(111),JSON.stringify([{catalogue_id:id(112),quantity:1}]),JSON.stringify(scope)]))).rows[0];
  const scopedSchedule=(await as(owner,()=>db.query("select public.create_recurring($1,$2,gen_random_uuid(),'weekly',array[0,1,2,3,4,5,6]::smallint[],null,'last_day') id",[a,scoped.id]))).rows[0].id;
  await as(owner,()=>db.query("update public.business_catalogue set cleaning_config=null,price_cents=1,is_active=false where id=$1",[id(112)]));
  await as(owner,()=>generate(a,scopedSchedule));
  const copied=(await db.query('select * from public.one_off_bookings where recurring_schedule_id=$1 limit 1',[scopedSchedule])).rows[0];
  assert.deepEqual(copied.cleaning_scope,scoped.cleaning_scope);assert.deepEqual(copied.cleaning_snapshot,scoped.cleaning_snapshot);assert.deepEqual(copied.price_lines,scoped.price_lines);assert.equal(copied.duration_minutes,scoped.duration_minutes);assert.equal(copied.total_cents,scoped.total_cents);
  // Cadence uses original month-day rather than drifting after February.
  for(const [frequency,start,date,short,expected] of [
   ['monthly','2026-01-31','2026-02-28','last_day',true],['monthly','2026-01-31','2026-03-31','last_day',true],['monthly','2026-01-31','2026-03-28','last_day',false],['monthly','2028-01-31','2028-02-29','last_day',true],['monthly','2026-01-31','2026-02-28','skip',false],
   ['fortnightly','2026-10-19','2026-10-21','last_day',true],['fortnightly','2026-10-19','2026-10-28','last_day',false],['fortnightly','2026-10-19','2026-11-04','last_day',true]
  ])assert.equal((await db.query("select audit.recurring_due(jsonb_populate_record(null::public.recurring_schedules,$1),$2) due",[JSON.stringify({frequency,start_date:start,end_date:null,short_month:short,weekdays:[1,3,5]}),date])).rows[0].due,expected);
  await db.exec('set role anon');await assert.rejects(db.query('select * from public.recurring_schedules'),/permission denied/);await assert.rejects(create(a,10),/permission denied/);await db.exec('reset role');
  await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[b,manager]);await assert.rejects(as(manager,()=>generate(b,sb)),/access denied/);
 }finally{await db.close();}
});
test('recurring form validation, safe RPC errors, and escaped history guidance',async()=>{
 const form=new URLSearchParams({request_key:id(9),frequency:'weekly',short_month:'last_day',weekdays:'1'});
 assert.deepEqual(parseRecurring(form).weekdays,[1]);
 for(const [key,value] of [['frequency','daily'],['end_date','2026-02-30'],['weekdays','7'],['request_key','bad']]){const f=new URLSearchParams(form);f.set(key,value);assert.throws(()=>parseRecurring(f));}
 const edit=new URLSearchParams({...Object.fromEntries(form),version:'1',status:'paused',local_time:'24:00',change_reason:'Change'});assert.throws(()=>parseRecurring(edit,{editing:true}));edit.set('local_time','09:37');assert.equal(parseRecurring(edit,{editing:true}).local_time,'09:37');
 const calls=[];const client={rpc:async(name,params)=>{calls.push({name,params});return {data:id(8)};}};
 await createRecurring(client,a,id(5),form);await changeRecurring(client,a,id(8),edit);await generateRecurring(client,a,id(8),new URLSearchParams({version:'2',through:'2026-11-15'}));
 assert.equal(calls[0].params.p_business_id,a);assert.equal(calls[2].params.p_version,2);
 await assert.rejects(createRecurring({rpc:async()=>({error:{code:'23505',details:'private business'}})},a,id(5),form),e=>e.status===409&&!e.message.includes('private'));
 const html=renderRecurring({id:a,name:'<script>'},[],{source:{id:id(5),local_start:'2026-10-20T09:00:00',customer_snapshot:{name:'<script>'},time_zone:'UTC',total_cents:100}});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/original booking is the first visit/);assert.match(html,/last day of that month/);
});
