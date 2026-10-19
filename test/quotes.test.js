import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {definitions,profileFields} from '../src/cleaning-profiles.js';
import {parseQuoteCreate,createQuote,changeQuote,convertQuote} from '../src/quotes.js';

const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20);
const migrations=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql'];
test('quote input is date-independent and never submits client totals or acceptance actors',async()=>{
 const catalogue=[{id:id(100),kind:'service',is_active:true,pricing_model:'fixed'}],form=new URLSearchParams({customer_id:id(101),address_id:id(102),service_id:id(100),request_key:id(103),service_quantity:'1',duration_minutes:'120',total_cents:'1',accepted_by:id(999)});
 assert.equal(parseQuoteCreate(form,catalogue).duration_minutes,120);
 const calls=[],client={rpc:async(name,params)=>{calls.push({name,params});return {data:name==='convert_quote'?{booking_id:id(200),handoff_id:id(201)}:id(202)};}};
 await createQuote(client,a,form,catalogue);assert.equal(calls[0].params.p_business_id,a);assert.equal(Object.hasOwn(calls[0].params,'p_total_cents'),false);assert.equal(Object.hasOwn(calls[0].params,'p_accepted_by'),false);assert.equal(Object.hasOwn(calls[0].params,'p_local_start'),false);
 const invalid=new URLSearchParams(form);invalid.set('service_quantity','2');assert.throws(()=>parseQuoteCreate(invalid,catalogue),/Fixed-price/);invalid.set('service_quantity','1');invalid.set('duration_minutes','14');assert.throws(()=>parseQuoteCreate(invalid,catalogue),/duration/);
 await assert.rejects(changeQuote(client,a,id(202),new URLSearchParams({version:'1',status:'accepted',reference:''})),/acceptance evidence/);
 await assert.rejects(convertQuote(client,a,id(202),new URLSearchParams({version:'3',local_start:'2026-02-30T09:00'})),/valid booking date/);
 await assert.rejects(changeQuote({rpc:async()=>({error:{code:'40001',message:'private SQL'}})},a,id(202),new URLSearchParams({version:'1',status:'issued',reference:''})),e=>e.status===409&&!e.message.includes('private'));
});
async function fixture({quotes=true}={}){
 const db=new PGlite({extensions:{btree_gist}});
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const f of [...migrations,...(quotes?['quotes-draft.sql','quote-acceptance-actor-draft.sql']:[])])await db.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid')",[owner,manager,staff]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($1,$5,'staff'),($2,$5,'staff')",[a,b,owner,manager,staff]);
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 for(const [business,n] of [[a,10],[b,20]])await as(owner,async()=>{
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[business]);
  await db.query("insert into public.business_customers(id,business_id,name,phone,private_notes) values($1,$2,'Original customer','0000000000','PRIVATE OFFICE NOTE')",[id(n+100),business]);
  await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Original address')",[id(n+101),business,id(n+100)]);
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic service','fixed','visit',10000,'ZAR',1,true),($3,$2,'extra','Synthetic extra','per_unit','unit',1000,'ZAR',null,true)",[id(n+102),business,id(n+105)]);
 });
 const create=(business,n,key=id(n+104),duration=120)=>db.query('select public.create_quote($1,$2,$3,$4,$5,null,$6) id',[business,key,id(n+100),id(n+101),JSON.stringify([{catalogue_id:id(n+102),quantity:1},{catalogue_id:id(n+105),quantity:2}]),duration]);
 const change=(business,q,version,status,reference='Synthetic evidence')=>db.query('select public.change_quote($1,$2,$3,$4,$5)',[business,q,version,status,reference]);
 const accepted=async(business,n,key)=>{const q=(await create(business,n,key)).rows[0].id;await change(business,q,1,'issued');await change(business,q,2,'accepted');return q;};
 const start=(await db.query("select ((now() at time zone 'Africa/Johannesburg')::date+1)::text||' 09:00' t")).rows[0].t;
 const convert=(business,q,version=3,time=start,reason='')=>db.query('select public.convert_quote($1,$2,$3,$4,$5) receipt',[business,q,version,time,reason]);
 const count=async table=>(await db.query('select count(*)::int n from '+table)).rows[0].n;
 return {db,as,create,change,accepted,convert,count,start};
}

test('quotes enforce scoped acceptance, immutable conversion, atomic handoffs and direct-API protections',async()=>{
 const {db,as,create,change,accepted,convert,count,start}=await fixture();
 try{
  const qa=(await as(owner,()=>create(a,10))).rows[0].id,qb=(await as(manager,()=>create(b,20))).rows[0].id;
  assert.equal((await as(owner,()=>create(a,10))).rows[0].id,qa);
  await assert.rejects(as(owner,()=>create(a,10,id(114),121)),e=>e.code==='40001');
  await assert.rejects(as(manager,()=>create(a,10)),e=>e.code==='42501');
  await assert.rejects(as(staff,()=>create(a,10)),e=>e.code==='42501');
  assert.equal(await count('public.one_off_bookings'),0,'Quoting must not create operational bookings');
  assert.equal((await as(manager,()=>db.query('select count(*)::int n from public.business_quotes'))).rows[0].n,1);
  assert.equal((await as(staff,()=>db.query('select count(*)::int n from public.business_quotes'))).rows[0].n,0);
  for(const sql of ["update public.business_quotes set status='accepted'","delete from public.business_quotes","insert into public.business_quotes(business_id) values('"+a+"')","insert into public.quote_invoice_handoffs(business_id) values('"+a+"')"]){await assert.rejects(as(owner,()=>db.exec(sql)),e=>e.code==='42501');}
  const agreement=(await db.query('select agreement from public.business_quotes where id=$1',[qa])).rows[0].agreement;
  assert.equal(agreement.total_cents,12000);assert.equal(agreement.duration_minutes,120);assert.doesNotMatch(JSON.stringify(agreement),/PRIVATE OFFICE NOTE/);
  await assert.rejects(as(owner,()=>change(a,qa,1,'accepted')),/Invalid quote transition/);
  await assert.rejects(as(manager,()=>convert(a,qa)),e=>e.code==='42501');
  await assert.rejects(as(owner,()=>convert(a,qa)),/Only an accepted quote/);
  await as(owner,()=>change(a,qa,1,'issued'));
  await assert.rejects(as(owner,()=>change(a,qa,1,'accepted')),e=>e.code==='40001');
  await assert.rejects(as(owner,()=>change(a,qa,2,'accepted','')),/acceptance evidence/);
  await as(owner,()=>change(a,qa,2,'accepted','Customer approved through office'));
  const acceptedRow=(await db.query('select * from public.business_quotes where id=$1',[qa])).rows[0];
  assert.equal(acceptedRow.accepted_by,owner);assert.ok(acceptedRow.accepted_at);assert.equal(acceptedRow.version,3);
  await as(owner,async()=>{
   await db.query('update public.business_catalogue set price_cents=99999,is_active=false where id=$1',[id(112)]);
   await db.query("update public.business_customers set name='Updated customer' where id=$1",[id(110)]);
   await db.query("update public.customer_addresses set address_line='Updated address' where id=$1",[id(111)]);
  });
  const receipt=(await as(owner,()=>convert(a,qa))).rows[0].receipt;
  const booking=(await db.query('select * from public.one_off_bookings where id=$1',[receipt.booking_id])).rows[0];
  assert.equal(booking.source_quote_id,qa);assert.equal(booking.status,'draft');assert.deepEqual(booking.assigned_staff,[]);assert.equal(booking.total_cents,12000);assert.deepEqual(booking.price_lines,agreement.price_lines);assert.equal(booking.customer_snapshot.name,'Original customer');assert.equal(booking.address_snapshot.address_line,'Original address');
  assert.equal(await count('public.one_off_bookings'),1);assert.equal(await count('public.quote_invoice_handoffs'),1);
  assert.deepEqual((await as(owner,()=>convert(a,qa))).rows[0].receipt,receipt);
  await assert.rejects(as(owner,()=>convert(a,qa,3,start,'changed reason')),e=>e.code==='40001');
  await assert.rejects(as(owner,()=>convert(a,qa,3,start.replace('09:00','10:00'))),e=>e.code==='40001');
  await as(owner,()=>db.query("update public.one_off_bookings set local_start=local_start+interval '1 day',change_reason='Reschedule fixture' where id=$1",[booking.id]));
  assert.deepEqual((await as(owner,()=>convert(a,qa))).rows[0].receipt,receipt);
  await as(owner,()=>db.query("update public.one_off_bookings set status='cancelled',change_reason='Stop fixture' where id=$1",[booking.id]));
  assert.deepEqual((await as(owner,()=>convert(a,qa))).rows[0].receipt,receipt);assert.equal(await count('public.one_off_bookings'),1);
  await assert.rejects(as(owner,()=>change(a,qa,4,'cancelled')),/Invalid quote transition/);
  await assert.rejects(as(owner,()=>db.query('update public.one_off_bookings set source_quote_id=null where id=$1',[booking.id])),/Source quote identity is immutable/);
  await assert.rejects(as(owner,()=>db.exec('update public.quote_invoice_handoffs set created_at=now()')),e=>e.code==='42501');
  await assert.rejects(as(owner,()=>db.exec('delete from public.quote_invoice_handoffs')),e=>e.code==='42501');
  assert.deepEqual((await db.query('select agreement from public.business_quotes where id=$1',[qa])).rows[0].agreement,agreement);
  await as(owner,()=>db.query('update public.business_catalogue set is_active=true where id=$1',[id(112)]));

  // Any failure after the booking insert must undo link, handoff, audit and version.
  const qc=await as(owner,()=>accepted(a,10,id(500)));
  const beforeQuote=(await db.query('select to_jsonb(q) data from public.business_quotes q where id=$1',[qc])).rows[0].data;
  const before=[await count('public.one_off_bookings'),await count('public.quote_invoice_handoffs'),await count('audit.events')];
  await db.exec("create function public.test_fail_handoff() returns trigger language plpgsql as $$begin raise exception 'Forced handoff failure';end$$;create trigger test_fail before insert on public.quote_invoice_handoffs for each row execute function public.test_fail_handoff();");
  await assert.rejects(as(owner,()=>convert(a,qc)),/Forced handoff failure/);
  assert.deepEqual([await count('public.one_off_bookings'),await count('public.quote_invoice_handoffs'),await count('audit.events')],before);
  assert.deepEqual((await db.query('select to_jsonb(q) data from public.business_quotes q where id=$1',[qc])).rows[0].data,beforeQuote);
  await db.exec('drop trigger test_fail on public.quote_invoice_handoffs;drop function public.test_fail_handoff();');
  await as(owner,()=>convert(a,qc));

  const qd=await as(owner,()=>accepted(a,10,id(501)));
  await assert.rejects(as(owner,()=>db.query('insert into public.one_off_bookings(business_id,source_quote_id,recurring_schedule_id,local_start) values($1,$2,$3,$4)',[a,qd,id(999),start])),/cannot combine quote and recurring/);
  await assert.rejects(as(staff,()=>db.query('insert into public.one_off_bookings(business_id,source_quote_id,local_start) values($1,$2,$3)',[a,qd,start])),e=>e.code==='42501');
  await assert.rejects(as(owner,()=>db.query('insert into public.one_off_bookings(business_id,source_quote_id,local_start) values($1,$2,$3)',[a,qb,start])),e=>e.code==='42501');
  const direct=(await as(owner,()=>db.query("insert into public.one_off_bookings(business_id,source_quote_id,local_start,customer_id,address_id,total_cents,currency,status,assigned_staff,price_lines) values($1,$2,$3,$4,$5,1,'USD','completed',array[$6::uuid],'[]') returning *",[a,qd,start,id(120),id(121),staff]))).rows[0];
  const qdSaved=(await db.query('select * from public.business_quotes where id=$1',[qd])).rows[0];
  assert.equal(direct.customer_id,id(110));assert.equal(direct.currency,'ZAR');assert.equal(direct.status,'draft');assert.deepEqual(direct.assigned_staff,[]);assert.equal(direct.total_cents,qdSaved.agreement.total_cents);assert.equal(qdSaved.converted_booking_id,direct.id);
  assert.equal((await db.query('select count(*)::int n from public.quote_invoice_handoffs where quote_id=$1',[qd])).rows[0].n,1);
  await assert.rejects(as(owner,()=>db.query('insert into public.one_off_bookings(business_id,source_quote_id,local_start) values($1,$2,$3)',[a,qd,start])),e=>e.code==='40001');
  const directReceipt=(await as(owner,()=>convert(a,qd))).rows[0].receipt;assert.equal(directReceipt.booking_id,direct.id);

  // Quoted source bookings may later form a separate recurring agreement.
  const schedule=(await as(owner,()=>db.query("select public.create_recurring($1,$2,gen_random_uuid(),'weekly',array[0,1,2,3,4,5,6]::smallint[],null,'last_day') id",[a,direct.id]))).rows[0].id;
  const handoffsBefore=await count('public.quote_invoice_handoffs');
  await as(owner,()=>db.query("select public.generate_recurring($1,$2,1,(now() at time zone 'Africa/Johannesburg')::date+4)",[a,schedule]));
  const visits=(await db.query('select * from public.one_off_bookings where recurring_schedule_id=$1',[schedule])).rows;
  assert.ok(visits.length>0);assert.ok(visits.every(v=>v.source_quote_id===null&&v.total_cents===direct.total_cents));assert.equal(await count('public.quote_invoice_handoffs'),handoffsBefore);
  for(const status of ['confirmed','assigned','en_route','arrived','in_progress','completed'])await as(owner,()=>db.query("update public.one_off_bookings set status=$2,assigned_staff=case when $2='assigned' then array[$3::uuid] else assigned_staff end,change_reason='Synthetic lifecycle' where id=$1",[direct.id,status,staff]));
  assert.equal((await db.query('select status from public.one_off_bookings where id=$1',[direct.id])).rows[0].status,'completed');
  assert.equal((await db.query('select count(*)::int n from audit.cleaner_reservations where booking_id=$1',[direct.id])).rows[0].n,1);

  const qe=await as(manager,()=>accepted(b,20,id(502)));
  await as(owner,()=>db.query('update public.business_customers set is_active=false where id=$1',[id(120)]));
  await assert.rejects(as(manager,()=>convert(b,qe)),/customer must still be active/);
  await as(owner,()=>db.query('update public.business_customers set is_active=true where id=$1',[id(120)]));
  await as(owner,()=>db.query('update public.customer_addresses set is_active=false where id=$1',[id(121)]));
  await assert.rejects(as(manager,()=>convert(b,qe)),/address must still be active/);
  await as(owner,()=>db.query('update public.customer_addresses set is_active=true where id=$1',[id(121)]));
  await assert.rejects(as(manager,()=>convert(b,qe,3,start.replace('09:00','02:00'))),/Outside business working hours/);
  await as(manager,()=>convert(b,qe,3,start.replace('09:00','02:00'),'Explicit synthetic override'));
  for(const terminal of ['declined','cancelled']){
   const q=(await as(owner,()=>create(a,10,terminal==='declined'?id(503):id(504)))).rows[0].id;
   const v=terminal==='declined'?2:1;if(v===2)await as(owner,()=>change(a,q,1,'issued'));
   await assert.rejects(as(owner,()=>change(a,q,v,terminal,'')),/Enter a reason/);
   await as(owner,()=>change(a,q,v,terminal,'Synthetic terminal reason'));
   await assert.rejects(as(owner,()=>change(a,q,v+1,'issued')),/Invalid quote transition/);
   await assert.rejects(as(owner,()=>convert(a,q,v+1)),/Only an accepted quote/);
  }
  await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[b,manager]);
  await assert.rejects(as(manager,()=>convert(b,qe,3,start.replace('09:00','02:00'),'Explicit synthetic override')),e=>e.code==='42501');
  await db.exec('set role anon');await assert.rejects(db.query('select * from public.business_quotes'),e=>e.code==='42501');await assert.rejects(convert(a,qa),e=>e.code==='42501');await db.exec('reset role');
 }finally{await db.close();}
});

test('quote builders preserve all six configured profile prices and prior booking history',async()=>{
 const {db,as,start}=await fixture({quotes:false});
 try{
  const samples=[];
  for(const [i,profile] of ['regular','deep','moving','airbnb','office','carpet'].entries()){
   const service=id(700+i),scope={},rules={};
   for(const k of profileFields[profile]){const d=definitions[k];rules[k]={};const options=d.custom?['No animals','Animals']:d.count?['unit']:d.options;for(const option of options)rules[k][option]={cents:100,minutes:1};scope[k]=d.count?2:options[0];}
   const cfg={base_minutes:60,service_fee_cents:1234,rules,equipment:{policy:profile==='office'?'assessed':'included'},extras:[id(115)],extra_minutes:{[id(115)]:10}};
   if(profile==='office'){cfg.manual_duration=true;scope.equipment_arrangement='Business supplies equipment';scope.assessment={additional_cents:5400,duration_minutes:190,reason:'Synthetic equipment and estimate'};}
   const selection=[{catalogue_id:service,quantity:1},{catalogue_id:id(115),quantity:2}];
   await as(owner,()=>db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,cleaning_profile,cleaning_config,is_active) values($1,$2,'service',$3,'fixed','visit',10000,'ZAR',1,$3,$4,true)",[service,a,profile,JSON.stringify(cfg)]));
   const row=(await as(owner,()=>db.query('insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,$4,15,$5,$6) returning *',[a,id(110),id(111),start,JSON.stringify(selection),JSON.stringify(scope)]))).rows[0];
   samples.push({profile,selection,scope,row});
  }
  const before=(await db.query("select md5(string_agg(to_jsonb(b)::text,',' order by id)) d from public.one_off_bookings b")).rows[0].d;
  await db.exec(await readFile(new URL('../database/quotes-draft.sql',import.meta.url),'utf8'));
  assert.equal((await db.query("select md5(string_agg((to_jsonb(b)-'source_quote_id')::text,',' order by id)) d from public.one_off_bookings b")).rows[0].d,before);
  const comparable=row=>{const s=structuredClone(row.cleaning_snapshot);if(s)delete s.assessed_at;return {customer:row.customer_snapshot,address:row.address_snapshot,lines:row.price_lines,total:row.total_cents,duration:row.duration_minutes,scope:row.cleaning_scope,snapshot:s,team:row.required_team_size,currency:row.currency,time_zone:row.time_zone};};
  for(const sample of samples){
   const quoteId=(await as(owner,()=>db.query('select public.create_quote($1,gen_random_uuid(),$2,$3,$4,$5,15) id',[a,id(110),id(111),JSON.stringify(sample.selection),JSON.stringify(sample.scope)]))).rows[0].id;
   const agreement=(await db.query('select agreement from public.business_quotes where id=$1',[quoteId])).rows[0].agreement;
   assert.deepEqual(comparable(agreement),comparable(sample.row),sample.profile+' quote parity');
   const booking=(await as(owner,()=>db.query('insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,$4,15,$5,$6) returning *',[a,id(110),id(111),start,JSON.stringify(sample.selection),JSON.stringify(sample.scope)]))).rows[0];
   assert.deepEqual(comparable(booking),comparable(sample.row),sample.profile+' existing booking parity');
  }
 }finally{await db.close();}
});

test('rollback-only staging acceptance script leaves existing records intact',async()=>{
 const {db,as,start}=await fixture();
 try{
  for(const [business,n] of [[a,10],[b,20]]){
   const booking=(await as(owner,()=>db.query('insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,gen_random_uuid(),$2,$3,$4,120,$5) returning id',[business,id(n+100),id(n+101),business===a?start:start.replace('09:00','13:00'),JSON.stringify([{catalogue_id:id(n+102),quantity:1}])]))).rows[0].id;
   for(const status of ['confirmed','assigned','en_route','arrived','in_progress','completed'])await as(owner,()=>db.query("update public.one_off_bookings set status=$2,assigned_staff=case when $2='assigned' then array[$3::uuid] else assigned_staff end,change_reason='Synthetic staging setup' where id=$1",[booking,status,staff]));
  }
  const before=(await db.query("select md5(string_agg(to_jsonb(b)::text,',' order by id)) d from public.one_off_bookings b")).rows[0].d;
  await db.exec(await readFile(new URL('../scripts/verify-quotes-staging.sql',import.meta.url),'utf8'));
  assert.equal((await db.query("select md5(string_agg(to_jsonb(b)::text,',' order by id)) d from public.one_off_bookings b")).rows[0].d,before);
  assert.equal((await db.query('select count(*)::int n from public.business_quotes')).rows[0].n,0);
 }finally{await db.close();}
});


test('recorded actor lookup authorises the current caller and exposes only one stored actor',async()=>{
 const {db,as,create,accepted}=await fixture();
 try{
  const draft=(await as(owner,()=>create(a,10))).rows[0].id,q=await as(manager,()=>accepted(b,20));
  const read=(schema,business,quote)=>db.query('select '+schema+'.quote_acceptance_actor($1,$2) actor',[business,quote]);
  assert.equal((await as(owner,()=>read('public',a,draft))).rows[0].actor,null);
  const expected={business_id:b,quote_id:q,actor_id:manager,label:'manager@test.invalid'};
  assert.deepEqual((await as(owner,()=>read('public',b,q))).rows[0].actor,expected);
  assert.deepEqual((await as(manager,()=>read('audit',b,q))).rows[0].actor,expected);
  const before=(await db.query("select md5(string_agg(to_jsonb(q)::text,',' order by id)) digest from public.business_quotes q")).rows[0].digest;
  const auditBefore=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
  for(const schema of ['public','audit']){
   await assert.rejects(as(manager,()=>read(schema,a,draft)),e=>e.code==='42501');
   await assert.rejects(as(staff,()=>read(schema,b,q)),e=>e.code==='42501');
   await assert.rejects(as(owner,()=>read(schema,a,q)),e=>e.code==='42501');
   await assert.rejects(as(owner,()=>read(schema,b,id(999))),e=>e.code==='42501');
   await db.exec('set role anon');await assert.rejects(read(schema,b,q),e=>e.code==='42501');await db.exec('reset role');
  }
  await assert.rejects(as(owner,()=>db.query('select email from auth.users')),e=>e.code==='42501');
  await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[b,manager]);
  assert.deepEqual((await as(owner,()=>read('public',b,q))).rows[0].actor,expected);
  await assert.rejects(as(manager,()=>read('public',b,q)),e=>e.code==='42501');
  await db.query("update auth.users set email='renamed@test.invalid' where id=$1",[manager]);
  assert.equal((await as(owner,()=>read('public',b,q))).rows[0].actor.label,'renamed@test.invalid');
  await db.query('delete from public.business_memberships where business_id=$1 and user_id=$2',[b,manager]);
  assert.deepEqual((await as(owner,()=>read('public',b,q))).rows[0].actor,{...expected,label:null});
  assert.equal((await db.query("select md5(string_agg(to_jsonb(q)::text,',' order by id)) digest from public.business_quotes q")).rows[0].digest,before);
  // Only the explicit membership test mutations can create audit records; lookup is read-only.
  const count=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
  await as(owner,()=>read('public',b,q));assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,count);assert.ok(count>=auditBefore);
 }finally{await db.close();}
});
