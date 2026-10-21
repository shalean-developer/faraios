import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {parseCleaningConfig,cleaningConfigForm,cleaningScopeForm,needsAssessment} from '../src/cleaning-profiles.js';
import {parseBusinessSettings,renderBusinessSettings} from '../src/business-settings.js';
import {updateBooking,renderBookings} from '../src/bookings.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),other=id(4),a=id(10),b=id(20);
const migration='../supabase/migrations/20261021152058_t04_duration_workload.sql';
const files=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql'];
async function fixture(){
 const db=new PGlite({extensions:{btree_gist}});
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const f of files)await db.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
 await db.exec(await readFile(new URL(migration,import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid'),($4,'other@test.invalid')",[owner,manager,staff,other]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager'),($1,$5,'staff'),($2,$5,'staff'),($1,$6,'staff')",[a,b,owner,manager,staff,other]);
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 for(const [biz,n]of [[a,10],[b,20]])await as(owner,async()=>{
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone,max_daily_minutes) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg',$2)",[biz,biz===a?480:null]);
  await db.query("insert into public.business_customers(id,business_id,name,phone) values($1,$2,'Secret customer','0000000000')",[id(n+100),biz]);
  await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Secret address')",[id(n+101),biz,id(n+100)]);
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','General','fixed','visit',10000,'ZAR',1,true)",[id(n+102),biz]);
 });
 const create=async(biz,n,start,minutes,service=id(n+102),scope=null)=>(await as(owner,()=>db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope,hours_override_reason) values($1,gen_random_uuid(),$2,$3,$4,$5,$6,$7,'Isolated hours boundary check') returning *",[biz,id(n+100),id(n+101),start,minutes,JSON.stringify([{catalogue_id:service,quantity:1}]),scope===null?null:JSON.stringify(scope)]))).rows[0];
 const assign=async(row,ids=[staff],setup=0,travel=0)=>as(owner,async()=>{await db.query("update public.one_off_bookings set status='confirmed' where id=$1",[row.id]);return(await db.query("update public.one_off_bookings set status='assigned',assigned_staff=$2,setup_minutes=$3,travel_minutes=$4,change_reason='Reviewed plan' where id=$1 returning *",[row.id,ids,setup,travel])).rows[0];});
 return {db,as,create,assign};
}
test('duration floors, blocks, assessment and immutable quote/recurring snapshots',async()=>{
 const {db,as,create}=await fixture();
 try{
  const cfg=JSON.parse(await readFile(new URL('../config/shalean-approved-cleaning.json',import.meta.url))).services;
  const policy=JSON.parse(await readFile(new URL('../config/shalean-approved-durations.json',import.meta.url)));
  let n=200;
  for(const [profile,s]of Object.entries(cfg)){
   const service=id(n++),c=structuredClone(s.cleaning_config);c.minimum_minutes=policy.minimum_minutes[profile];c.duration_step_minutes=30;c.require_assessment=policy.always_assessed.includes(profile);
   for(const [key,minutes]of Object.entries(policy.scope_minutes[profile]??{}))if(key!=='linen_change_yes')c.rules[key].unit.minutes=minutes;
   await as(owner,()=>db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,cleaning_profile,cleaning_config,is_active) values($1,$2,'service',$3,'fixed','visit',$4,'ZAR',1,$3,$5,true)",[service,a,profile,s.price_cents,JSON.stringify(c)]));
   const scope={};for(const [key,rates]of Object.entries(c.rules))scope[key]=rates.unit?(['bathrooms','carpet_rooms'].includes(key)?1:0):Object.keys(rates)[0];scope.equipment_arrangement='Customer supplies equipment';if(profile==='airbnb')scope.linen_change='No';
   if(c.manual_duration||c.require_assessment||['deep','moving'].includes(profile))scope.assessment={additional_cents:0,duration_minutes:c.minimum_minutes,reason:'Synthetic assessed scope'};
   const row=await create(a,10,'2030-01-01 08:00',15,service,scope);
   assert.equal(row.duration_minutes,c.minimum_minutes,profile);assert.equal(row.cleaning_snapshot.configuration.minimum_minutes,c.minimum_minutes);
   const badScope=structuredClone(scope);badScope.assessment={additional_cents:0,duration_minutes:c.minimum_minutes-30,reason:'Too short'};await assert.rejects(create(a,10,'2030-01-01 08:00',15,service,badScope),/minimum|shorter/);
   const offGrid=structuredClone(scope);offGrid.assessment={additional_cents:0,duration_minutes:c.minimum_minutes+15,reason:'Off grid'};await assert.rejects(create(a,10,'2030-01-01 08:00',15,service,offGrid),/time blocks/);
   if(profile==='carpet'){const without=structuredClone(scope);delete without.assessment;await assert.rejects(create(a,10,'2030-01-01 08:00',15,service,without),/assessment/);}
   await as(owner,()=>db.query("update public.business_catalogue set cleaning_config=jsonb_set(cleaning_config,'{minimum_minutes}','480') where id=$1",[service]));
   assert.equal((await db.query('select duration_minutes from public.one_off_bookings where id=$1',[row.id])).rows[0].duration_minutes,c.minimum_minutes);
   await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set duration_minutes=$2,change_reason='Too short' where id=$1",[row.id,c.minimum_minutes-30])),/saved minimum/);
   if(profile==='airbnb'){
    const q=(await as(owner,()=>db.query('select public.create_quote($1,gen_random_uuid(),$2,$3,$4,$5,15) value',[a,id(110),id(111),JSON.stringify([{catalogue_id:service,quantity:1}]),JSON.stringify(scope)]))).rows[0].value;
    assert.equal((await db.query('select (agreement->>\'duration_minutes\')::int n from public.business_quotes where id=$1',[q])).rows[0].n,480);
   }
   if(profile==='regular'){
    const schedule=(await as(owner,()=>db.query("select public.create_recurring($1,$2,gen_random_uuid(),'weekly',array[2]::smallint[],null,'last_day') value",[a,row.id]))).rows[0].value;
    assert.equal((await db.query('select (agreement->>\'duration_minutes\')::int n from public.recurring_schedules where id=$1',[schedule])).rows[0].n,210);
   }
  }
  await assert.rejects(as(owner,()=>db.query("update public.business_catalogue set cleaning_config=jsonb_set(cleaning_config,'{rules,rugs,unit,minutes}','20') where cleaning_profile='carpet'")),/time blocks/);
 }finally{await db.close();}
});
test('daily limit totals travel/setup across businesses, denies bypasses and rolls failed teams back',async()=>{
 const {db,as,create,assign}=await fixture();
 try{
  let first=await assign(await create(a,10,'2030-01-01 08:00',210),[staff],15,15);
  let second=await assign(await create(b,20,'2030-01-01 13:00',210),[staff],15,15);
  assert.equal((await db.query('select count(*)::int n from audit.cleaner_reservations')).rows[0].n,2);
  const third=await create(b,20,'2030-01-01 18:00',15);await assert.rejects(assign(third),e=>e.code==='23514'&&/Daily workload/.test(e.message)&&!e.detail&&!/Secret|customer|business/.test(e.message));
  assert.equal((await db.query('select status from public.one_off_bookings where id=$1',[third.id])).rows[0].status,'confirmed');
  await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set travel_minutes=16,change_reason='One extra minute' where id=$1",[second.id])),/Daily workload/);
  assert.equal((await db.query('select travel_minutes from public.one_off_bookings where id=$1',[second.id])).rows[0].travel_minutes,15);
  const next=await create(a,10,'2030-01-02 08:00',480);await assert.rejects(assign(next,[staff],null,null),/Review setup/);await assign(next,[staff,other]);
  await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set workload_limit_minutes=999 where id=$1",[first.id])),/immutable/);
  const overlap=await create(b,20,'2030-01-01 12:50',15);await assert.rejects(assign(overlap,[staff],0,20),/busy|Daily workload/);
  await as(owner,()=>db.query("update public.one_off_bookings set status='cancelled',change_reason='Released' where id=$1",[second.id]));
  await assign(await create(b,20,'2030-01-01 18:30',60));
  assert.equal((await as(staff,()=>db.query('update public.business_settings set max_daily_minutes=1440 where business_id=$1 returning business_id',[a]))).rows.length,0);
  await assign(await create(a,10,'2030-01-03 22:00',240));
  await assign(await create(b,20,'2030-01-04 08:00',360));
  await assert.rejects(assign(await create(b,20,'2030-01-04 18:00',15)),/Daily workload/);
  // A foreign uncapped job still blocks the next capped assignment if its travel/setup are unreviewed.
  await assign(await create(b,20,'2030-01-05 08:00',60),[staff],null,null);
  await assert.rejects(assign(await create(a,10,'2030-01-05 12:00',60)),/Review setup/);
  await assert.rejects(as(manager,()=>db.query('select * from audit.cleaner_workload_locks')),/permission denied/);
  await assert.rejects(as(manager,()=>db.query("select public.staff_availability($1,'2030-01-01 18:00',15,null)",[a])),/access denied/);
  await assert.rejects(as(staff,()=>db.query("select public.staff_availability($1,'2030-01-01 18:00',15,null)",[a])),/access denied/);
  await db.exec('set role anon');await assert.rejects(db.query("select public.staff_availability($1,'2030-01-01 18:00',15,null)",[a]),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
test('duration controls round-trip without changing prices; work plans preserve explicit zero and trusted scope',async()=>{
 const source=JSON.parse(await readFile(new URL('../config/shalean-approved-cleaning.json',import.meta.url))).services.regular;
 const cfg=structuredClone(source.cleaning_config);cfg.minimum_minutes=210;cfg.duration_step_minutes=30;cfg.require_assessment=true;
 const html=cleaningConfigForm({...source,kind:'service',cleaning_config:cfg},[]);
 const controls=[...html.matchAll(/<input\b[^>]*>/g)].map(m=>m[0]),form=new URLSearchParams({cleaning_profile:'regular',equipment_policy:'assessed'});
 const attr=(tag,k)=>tag.match(new RegExp('\\b'+k+'="([^"]*)"'))?.[1];
 for(const tag of controls){const name=attr(tag,'name');if(!name)continue;if(attr(tag,'type')==='checkbox'){if(/\bchecked\b/.test(tag))form.append(name,'on');}else form.append(name,attr(tag,'value')??'');}
 const parsed=parseCleaningConfig(form,'service');assert.equal(parsed.cleaning_config.minimum_minutes,210);assert.equal(parsed.cleaning_config.duration_step_minutes,30);assert.equal(parsed.cleaning_config.require_assessment,true);assert.equal(parsed.cleaning_config.rules.bedrooms.unit.cents,cfg.rules.bedrooms.unit.cents);assert.equal(parsed.cleaning_config.rules.bedrooms.unit.minutes,30);
 assert.equal(needsAssessment(parsed,{}),true);assert.match(cleaningScopeForm(parsed),/Minimum total booking duration: 210/);
 const settings=new URLSearchParams({display_name:'A',time_zone:'Africa/Johannesburg',opens_at:'08:00',closes_at:'18:00',working_days:'1',max_daily_minutes:'480'});
 assert.equal(parseBusinessSettings(settings).max_daily_minutes,480);settings.set('max_daily_minutes','');assert.equal(parseBusinessSettings(settings).max_daily_minutes,null);settings.set('max_daily_minutes','8.5');assert.throws(()=>parseBusinessSettings(settings),/daily workload/);
 const settingsHtml=renderBusinessSettings({id:a,name:'A'},{max_daily_minutes:480});assert.ok(settingsHtml.indexOf('Cleaner daily workload')<settingsHtml.indexOf('Save settings'));
 let update;const client={from(){return{update(row){update=row;return this;},eq(){return this;},async select(){return{data:[{id:id(400)}]};}};}};
 const booking={id:id(400),status:'confirmed',required_team_size:1};
 await updateBooking(client,a,booking,new URLSearchParams({version:'2',action:'transition',status:'assigned',assigned_staff:staff,setup_minutes:'0',travel_minutes:'15',business_id:b,workload_limit_minutes:'1440'}));
 assert.equal(update.setup_minutes,0);assert.equal(update.travel_minutes,15);assert.equal(update.workload_limit_minutes,undefined);assert.equal(update.business_id,undefined);
 await assert.rejects(updateBooking(client,a,booking,new URLSearchParams({version:'2',action:'transition',status:'assigned',assigned_staff:staff,setup_minutes:'-1'})),/whole minutes/);
});
