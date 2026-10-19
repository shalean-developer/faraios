import {definitions,profileFields,parseCleaningScope,parseCleaningConfig,cleaningScopeForm,cleaningConfigForm} from '../src/cleaning-profiles.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseBookingCreate,createBooking,updateBooking,renderBookings} from '../src/bookings.js';
const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002',staff='00000000-0000-4000-8000-000000000003';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const id=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const catalogue=[{id:id(1),kind:'service',is_active:true,pricing_model:'fixed',price_cents:25000,unit_label:'visit',name:'Synthetic'}];
const form=()=>new URLSearchParams({customer_id:id(2),address_id:id(3),service_id:id(1),request_key:id(4),service_quantity:'1',local_start:'2026-10-20T09:00',duration_minutes:'120'});
test('booking input, duplicate submission comparison and optimistic mutations',async()=>{
 const row=parseBookingCreate(form(),catalogue);assert.equal(row.selection[0].quantity,1);
 for(const [key,value] of [['service_quantity','2'],['duration_minutes','0'],['local_start','bad'],['customer_id','foreign']]){const f=form();f.set(key,value);assert.throws(()=>parseBookingCreate(f,catalogue));}
 const existing={id:id(9),request_payload:{...row,selection:[{quantity:1,catalogue_id:id(1)}]}};
 const query={eq(){return this;},maybeSingle:async()=>({data:existing})};
 const client={from:()=>({insert:()=>({select:async()=>({error:{code:'23505'}})}),select:()=>query})};
 assert.equal(await createBooking(client,a,row),id(9));await assert.rejects(createBooking(client,a,{...row,duration_minutes:180}),e=>e.status===409);
 const filters=[];const q={eq(k,v){filters.push([k,v]);return this;},select:async()=>({data:[]})};
 await assert.rejects(updateBooking({from:()=>({update:()=>q})},a,{id:id(9),status:'draft'},new URLSearchParams({version:'1',action:'transition',status:'confirmed'})),e=>e.status===409);
 assert.deepEqual(filters,[['business_id',a],['id',id(9)],['version',1]]);
 assert.throws(()=>parseBookingCreate(form(),[]));
 const markup=renderBookings({id:a,name:'<script>'},[],{time_zone:'UTC',staff:[]},{customers:[],catalogue});assert.doesNotMatch(markup,/<script>/);
});
test('Postgres booking lifecycle, tenant links, snapshots, team and audit are enforced',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const path of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql'])await db.exec(await readFile(new URL('../database/'+path,import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@example.test'),($2,'manager@example.test'),($3,'staff@example.test')",[owner,manager,staff]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($1,$5,'staff'),($2,$5,'staff')",[a,b,owner,manager,staff]);
 const asUser=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role');await db.exec('reset request.jwt.claim.sub');}};
 for(const [business,n] of [[a,10],[b,20]])await asUser(owner,async()=>{
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[business]);
  await db.query("insert into public.business_customers(id,business_id,name,private_notes) values($1,$2,'Original name','Office secret')",[id(n),business]);
  await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Original street')",[id(n+1),business,id(n)]);
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic','fixed','visit',$3,'ZAR',1,true)",[id(n+2),business,n*1000]);
 });
 const create=async(business,n,key=id(n+3),overrides={})=>{
  const v={customer:id(n),address:id(n+1),start:'2026-10-20 09:00',duration:120,selection:[{catalogue_id:id(n+2),quantity:1}],reason:'',...overrides};
  return (await db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,hours_override_reason) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[business,key,v.customer,v.address,v.start,v.duration,JSON.stringify(v.selection),v.reason])).rows[0];
 };
 const ba=await asUser(owner,()=>create(a,10)),bb=await asUser(manager,()=>create(b,20));
 assert.equal(ba.total_cents,10000);assert.equal(bb.total_cents,20000);assert.equal(ba.status,'draft');assert.equal(ba.customer_snapshot.private_notes,undefined);assert.equal(ba.starts_at.toISOString(),'2026-10-20T07:00:00.000Z');
 await assert.rejects(asUser(owner,()=>create(a,10,id(40),{selection:[{catalogue_id:id(22),quantity:1}]})),/active business service/);
 await assert.rejects(asUser(owner,()=>create(a,10,id(41),{customer:id(20),address:id(21)})),/active customer/);
 await assert.rejects(asUser(owner,()=>create(a,10,id(42),{address:id(21)})),/active address/);
 await assert.rejects(asUser(owner,()=>create(a,10,id(43),{selection:[{catalogue_id:id(12),quantity:2}]})),/quantity one/);
 await assert.rejects(asUser(owner,()=>create(a,10,id(44),{start:'2026-10-20 05:00'})),/Outside business working hours/);
 const outside=await asUser(owner,()=>create(a,10,id(45),{start:'2026-10-20 05:00',reason:'Owner office override'}));
 await assert.rejects(asUser(owner,()=>db.query("update public.one_off_bookings set hours_override_reason='',change_reason='Reason only edit' where id=$1",[outside.id])),/Outside business working hours/);
 await assert.rejects(asUser(owner,()=>create(a,10)),/duplicate key/);
 assert.equal((await asUser(manager,()=>db.query('select * from public.one_off_bookings'))).rows.length,1);
 assert.equal((await asUser(staff,()=>db.query('select * from public.one_off_bookings'))).rows.length,0);
 await assert.rejects(asUser(staff,()=>db.query('select public.booking_context($1)',[b])),/access denied/);
 await assert.rejects(asUser(manager,()=>db.query('select public.booking_context($1)',[a])),/access denied/);
 await asUser(owner,()=>db.query("update public.business_customers set name='Changed' where id=$1",[id(10)]));
 await asUser(owner,()=>db.query("update public.business_catalogue set price_cents=99999 where id=$1",[id(12)]));
 assert.equal((await db.query('select customer_snapshot,total_cents from public.one_off_bookings where id=$1',[ba.id])).rows[0].total_cents,10000);
 assert.equal((await db.query('select customer_snapshot from public.one_off_bookings where id=$1',[ba.id])).rows[0].customer_snapshot.name,'Original name');
 await assert.rejects(asUser(owner,()=>db.query('update public.one_off_bookings set total_cents=1 where id=$1',[ba.id])),/immutable/);
 const transition=(booking,status,team=null,reason='')=>db.query('update public.one_off_bookings set status=$2,assigned_staff=coalesce($3::uuid[],assigned_staff),change_reason=$4 where id=$1 returning *',[booking,status,team,reason]);
 await assert.rejects(asUser(owner,()=>transition(ba.id,'completed')),/Invalid booking transition/);
 await asUser(owner,()=>transition(ba.id,'confirmed'));
 await assert.rejects(asUser(owner,()=>transition(ba.id,'assigned',[], 'Assign')),/required service team/);
 await assert.rejects(asUser(owner,()=>transition(ba.id,'assigned',[manager],'Assign')),/active staff/);
 await asUser(owner,()=>transition(ba.id,'assigned',[staff],'Assign'));
 await assert.rejects(asUser(owner,()=>db.query("update public.one_off_bookings set local_start='2026-10-21 10:00',change_reason='' where id=$1",[ba.id])),/Rescheduling requires/);
 await asUser(owner,()=>db.query("update public.one_off_bookings set local_start='2026-10-21 10:00',change_reason='Customer request' where id=$1",[ba.id]));
 assert.equal((await asUser(owner,()=>db.query("update public.one_off_bookings set change_reason='Stale' where id=$1 and version=1 returning id",[ba.id]))).rows.length,0);
 for(const status of ['en_route','arrived','in_progress','completed'])await asUser(owner,()=>transition(ba.id,status));
 await assert.rejects(asUser(owner,()=>transition(ba.id,'confirmed')),/cannot be changed/);
 await assert.rejects(asUser(manager,()=>transition(bb.id,'cancelled')),/Cancellation reason/);
 await asUser(manager,()=>transition(bb.id,'cancelled',null,'Customer cancelled'));
 await assert.rejects(asUser(manager,()=>transition(bb.id,'confirmed')),/cannot be changed/);
 const audit=(await db.query("select * from audit.events where entity_table='one_off_bookings' and new_record->>'id'=$1 and new_record->>'status'='en_route'",[ba.id])).rows[0];assert.equal(audit.actor_user_id,owner);assert.equal(audit.old_record.status,'assigned');
 const staleTeam=await asUser(manager,()=>create(b,20,id(46)));
 await asUser(manager,()=>transition(staleTeam.id,'confirmed'));await asUser(manager,()=>transition(staleTeam.id,'assigned',[staff],'Assign'));
 await asUser(manager,()=>transition(staleTeam.id,'en_route'));await asUser(manager,()=>transition(staleTeam.id,'arrived'));
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[b,staff]);
 await assert.rejects(asUser(manager,()=>transition(staleTeam.id,'in_progress')),/active staff/);
 await asUser(manager,()=>transition(staleTeam.id,'cancelled',null,'Cancel despite suspended team'));
 await assert.rejects(asUser(owner,()=>db.query('delete from public.one_off_bookings where id=$1',[ba.id])),/permission denied/);

 // Synthetic rates only: exercise every profile through real Postgres triggers/RLS.
 await asUser(owner,()=>db.query("update public.business_customers set phone='0000000000' where business_id=$1",[a]));
 const configured=[];
 for(const [profile,keys] of Object.entries(profileFields)){
  const rules={},scope={};let additions=0,minutes=60;
  for(const k of keys){const d=definitions[k].custom?{...definitions[k],options:['No animals','Birds present']}:definitions[k];rules[k]={};for(const option of d.count?['unit']:d.options)rules[k][option]={cents:100,minutes:2};scope[k]=d.count?(['bedrooms','extra_rooms','rugs'].includes(k)?0:2):d.options.at(-1);const qty=d.count?scope[k]:1;additions+=100*qty;minutes+=2*qty;}
  if(profile==='airbnb'){scope.linen='Fresh linen available';}if(profile==='airbnb')scope.access_instructions='Synthetic private lockbox instructions';
  const cfg={base_minutes:60,service_fee_cents:0,rules,equipment:{policy:profile==='regular'?'distance':'included',base:'Synthetic depot',base_cents:1000,per_km_cents:101,minimum_cents:1500,minutes:10},extras:[],extra_minutes:{}};
  if(profile==='regular'){scope.equipment='Yes';scope.distance_km=10.1;scope.distance_reason='Synthetic manual measurement';additions+=2021;minutes+=10;}
  await asUser(owner,()=>db.query('update public.business_catalogue set price_cents=10000,cleaning_profile=$2,cleaning_config=$3 where id=$1',[id(12),profile,JSON.stringify(cfg)]));
  const createScope=async(sc=scope,selection=[{catalogue_id:id(12),quantity:1}])=>(await db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,'2026-10-20 09:00',15,$4,$5) returning *",[a,id(10),id(11),JSON.stringify(selection),JSON.stringify(sc)])).rows[0];
  const row=await asUser(owner,()=>createScope());configured.push(row);
  assert.equal(row.total_cents,10000+additions,profile);assert.equal(row.duration_minutes,minutes,profile);assert.equal(row.cleaning_snapshot.profile,profile);
  assert.equal(row.request_payload.cleaning_scope.property_type,scope.property_type);
  await assert.rejects(asUser(owner,()=>createScope({...scope,[keys[0]]:null})),/required service option|room counts/);
  await assert.rejects(asUser(owner,()=>createScope({...scope,unexpected:'value'})),/Unexpected service scope/);
  for(const k of keys){const d=definitions[k].custom?{...definitions[k],options:['No animals','Birds present']}:definitions[k];if(d.count){for(const invalid of [-1,1.5,101])await assert.rejects(asUser(owner,()=>createScope({...scope,[k]:invalid})),/room counts/);if(['bathrooms','carpet_rooms'].includes(k))await assert.rejects(asUser(owner,()=>createScope({...scope,[k]:0})),/room counts/);const large=await asUser(owner,()=>createScope({...scope,[k]:100}));assert.equal(large.cleaning_scope[k],100);}else for(const option of d.options){if(profile==='airbnb'&&k==='linen'&&option==='No linen change'&&scope.linen_change==='Yes')continue;const variant=await asUser(owner,()=>createScope({...scope,[k]:option}));assert.equal(variant.cleaning_scope[k],option);}}
  if(keys.includes('pets'))await assert.rejects(asUser(owner,()=>createScope({...scope,pets:'Dogs'})),/required service option/);
  if(profile==='regular'){
   const noEquipment=await asUser(owner,()=>createScope({...scope,equipment:'No',distance_km:undefined,distance_reason:undefined}));assert.equal(noEquipment.cleaning_snapshot.equipment_fee_cents,0);
   const minimum=await asUser(owner,()=>createScope({...scope,distance_km:0}));assert.equal(minimum.cleaning_snapshot.equipment_fee_cents,1500);
   await assert.rejects(asUser(owner,()=>createScope({...scope,distance_reason:''})),/distance and its source/);
   await assert.rejects(asUser(owner,()=>db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,'2026-10-20 17:30',15,$4,$5)",[a,id(10),id(11),JSON.stringify([{catalogue_id:id(12),quantity:1}]),JSON.stringify(scope)])),/Outside business working hours/);
  }

  await assert.rejects(asUser(owner,()=>createScope(scope,[{catalogue_id:id(12),quantity:1},{catalogue_id:id(22),quantity:1} ])),/Extra not allowed/);
  await assert.rejects(asUser(manager,()=>createScope()),/access denied/);
  await assert.rejects(asUser(staff,()=>createScope()),/access denied/);
  await assert.rejects(asUser(owner,()=>db.query("update public.one_off_bookings set cleaning_scope='{}' where id=$1",[row.id])),/immutable/);
  await assert.rejects(asUser(owner,()=>db.query("update public.one_off_bookings set cleaning_snapshot='{}' where id=$1",[row.id])),/immutable/);
  await asUser(owner,()=>transition(row.id,'confirmed'));
 }

 const extraId=id(90),foreignExtra=id(91);
 await asUser(owner,async()=>{for(const [business,extra] of [[a,extraId],[b,foreignExtra]])await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,is_active) values($1,$2,'extra','Synthetic add-on','fixed','each',500,'ZAR',true)",[extra,business]);});
 const carpet=JSON.parse(JSON.stringify(configured.at(-1).cleaning_snapshot.configuration));carpet.extras=[foreignExtra];carpet.extra_minutes={[foreignExtra]:20};
 await assert.rejects(asUser(owner,()=>db.query('update public.business_catalogue set cleaning_config=$2 where id=$1',[id(12),JSON.stringify(carpet)])),/active in this business/);
 carpet.extras=[extraId];carpet.extra_minutes={[extraId]:20};
 await asUser(owner,()=>db.query('update public.business_catalogue set cleaning_config=$2 where id=$1',[id(12),JSON.stringify(carpet)]));
 const withExtra=await asUser(owner,async()=> (await db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,'2026-10-20 09:00',15,$4,$5) returning *",[a,id(10),id(11),JSON.stringify([{catalogue_id:id(12),quantity:1},{catalogue_id:extraId,quantity:1}]),JSON.stringify(configured.at(-1).cleaning_scope)])).rows[0]);
 assert.equal(withExtra.total_cents,configured.at(-1).total_cents+500);assert.equal(withExtra.duration_minutes,configured.at(-1).duration_minutes+20);
 await assert.rejects(asUser(owner,()=>db.query("update public.business_catalogue set cleaning_config=jsonb_set(cleaning_config,'{rules}','{}') where id=$1",[id(12)])),/every service option/);

 // Owner-approved tariff examples: real trigger calculations and assessment gates.
 const approved=JSON.parse(await readFile(new URL('../config/shalean-approved-cleaning.json',import.meta.url),'utf8')).services;
 for(const [profile,item] of Object.entries(approved)){
  const sc={};for(const k of profileFields[profile]){const d=definitions[k];sc[k]=d.count?(['rugs'].includes(k)?1:['carpet_rooms'].includes(k)?2:1):d.custom?'Dogs':d.options[0];}
  sc.equipment_arrangement='Customer supplies equipment';if(profile==='airbnb')sc.linen_change='Yes';if(profile==='moving')sc.furnishing='Empty';if(profile==='carpet')sc.stains='Yes';if(profile==='office')sc.office_size='Medium: 6–20 desks';
  if(profile==='deep')sc.assessment={additional_cents:0,duration_minutes:375,reason:'Condition assessed; no additional work needed'};
  if(profile==='office')sc.assessment={additional_cents:20000,duration_minutes:180,reason:'Size and bathrooms assessed, R200 additional work'};
  await asUser(owner,()=>db.query('update public.business_catalogue set cleaning_profile=$2,cleaning_config=$3,price_cents=$4 where id=$1',[id(12),profile,JSON.stringify(item.cleaning_config),item.price_cents]));
  const insert=async(scope=sc)=>(await db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope) values($1,gen_random_uuid(),$2,$3,'2026-10-20 09:00',15,$4,$5) returning *",[a,id(10),id(11),JSON.stringify([{catalogue_id:id(12),quantity:1}]),JSON.stringify(scope)])).rows[0];
  const row=await asUser(owner,()=>insert());const expected={regular:[35500,270],deep:[152000,375],moving:[152000,375],airbnb:[42000,240],office:[80000,180],carpet:[88000,140]}[profile];assert.equal(row.total_cents,expected[0],profile);assert.equal(row.duration_minutes,expected[1],profile);
  if(sc.assessment){assert.equal(row.cleaning_snapshot.assessed_by,owner);assert.ok(row.cleaning_snapshot.assessed_at);await assert.rejects(asUser(owner,()=>insert({...sc,assessment:undefined})),/Office assessment/);}
  await assert.rejects(asUser(owner,()=>insert({...sc,equipment_arrangement:'Business supplies equipment',assessment:undefined})),/Office assessment/);
  const assessed=await asUser(owner,()=>insert({...sc,equipment_arrangement:'Business supplies equipment',assessment:{additional_cents:10000,duration_minutes:expected[1],reason:'Additional equipment and delivery assessed'}}));
  assert.equal(assessed.total_cents,row.total_cents-(sc.assessment?.additional_cents??0)+10000);
  await assert.rejects(asUser(owner,()=>insert({...sc,assessment:{additional_cents:0,duration_minutes:expected[1],reason:''}})),/explicit assessment/);
  if(profile!=='office')await assert.rejects(asUser(owner,()=>insert({...sc,assessment:{additional_cents:0,duration_minutes:15,reason:'Attempt to shorten estimate'}})),/cannot be shorter/);
  if(profile==='deep'){const longer=await asUser(owner,()=>insert({...sc,assessment:{additional_cents:10000,duration_minutes:450,reason:'Condition requires additional work'}}));assert.equal(longer.cleaning_snapshot.configured_duration_minutes,375);assert.equal(longer.cleaning_snapshot.assessed_duration_minutes,450);assert.equal(longer.duration_minutes,450);}
  if(profile==='moving')await assert.rejects(asUser(owner,()=>insert({...sc,furnishing:'Furnished'})),/Office assessment/);
  if(profile==='office'){const enterprise=await asUser(owner,()=>insert({...sc,office_size:'Enterprise: 50+ desks',assessment:{additional_cents:250000,duration_minutes:480,reason:'Enterprise site assessment completed'}}));assert.equal(enterprise.total_cents,280000);}
  if(profile==='airbnb')await assert.rejects(asUser(owner,()=>insert({...sc,linen:'No linen change'})),/Fresh linen/);
 }
 await asUser(owner,()=>db.query('update public.business_catalogue set price_cents=1,cleaning_config=null where id=$1',[id(12)]));
 for(const row of configured){const saved=(await db.query('select * from public.one_off_bookings where id=$1',[row.id])).rows[0];assert.equal(saved.total_cents,row.total_cents);assert.deepEqual(saved.cleaning_snapshot,row.cleaning_snapshot);}
 assert.equal((await db.query('select cleaning_scope from public.one_off_bookings where id=$1',[ba.id])).rows[0].cleaning_scope,null);
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[b,manager]);assert.equal((await asUser(manager,()=>db.query('select * from public.one_off_bookings'))).rows.length,0);
 }finally{await db.close();}
});
