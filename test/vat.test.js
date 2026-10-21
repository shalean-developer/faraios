import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {parseVatSettings,renderVatSettings,renderVatSummary,saveVatSettings} from '../src/vat.js';
import {createZohoBooks} from '../src/zoho-books.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),other=id(4),a=id(10),b=id(20);
const files=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql','invoices-draft.sql','earnings-rules-draft.sql'];
const migration='../supabase/migrations/20261021223123_business_vat_settings.sql';
async function fixture(){
 const db=new PGlite({extensions:{btree_gist}});
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const f of files)await db.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261021152058_t04_duration_workload.sql',import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid'),($4,'other@test.invalid')",[owner,manager,staff,other]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$4,'owner'),($1,$5,'manager'),($1,$6,'staff')",[a,b,owner,other,manager,staff]);
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 for(const [business,n,user]of [[a,10,owner],[b,20,other]])await as(user,async()=>{
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg')",[business]);
  await db.query("insert into public.business_customers(id,business_id,name,phone) values($1,$2,'Synthetic','0000000000')",[id(n+100),business]);
  await db.query("insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values($1,$2,$3,'Home','Synthetic')",[id(n+101),business,id(n+100)]);
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic','fixed','visit',11500,'ZAR',1,true)",[id(n+102),business]);
 });
 const booking=(business=a,n=10,tax=null)=>db.query("insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,hours_override_reason"+(tax?',tax_snapshot':'')+") values($1,gen_random_uuid(),$2,$3,((now() at time zone 'Africa/Johannesburg')::date+1)::timestamp+interval '9 hours',120,$4,'Synthetic'"+(tax?',\'{"enabled":true,"vat_cents":1}\'':'')+") returning *",[business,id(n+100),id(n+101),JSON.stringify([{catalogue_id:id(n+102),quantity:1}])]);
 const quote=()=>db.query('select public.create_quote($1,gen_random_uuid(),$2,$3,$4,null,120) id',[a,id(110),id(111),JSON.stringify([{catalogue_id:id(112),quantity:1}])]);
 const policy=(version=0,enabled=true,biz=a,number='4000000001',date='2026-01-01',confirmed=true)=>db.query('select public.configure_business_vat($1,$2,$3,$4,$5,$6,$7) version',[biz,version,enabled,number,date,'Synthetic registration decision',confirmed]);
 const legacy=(await as(owner,()=>booking())).rows[0];const legacyQuote=(await as(owner,quote)).rows[0].id;
 await db.exec(await readFile(new URL(migration,import.meta.url),'utf8'));
 return {db,as,booking,quote,policy,legacy,legacyQuote};
}

test('VAT forms require explicit registration confirmation, isolate server scope and escape content',async()=>{
 const f=new URLSearchParams({vat_enabled:'yes',vat_version:'0',vat_number:'4000000001',vat_registration_date:'2026-01-01',vat_reason:'Registered',vat_confirmed:'yes',business_id:b});
 assert.equal(parseVatSettings(f).p_enabled,true);assert.equal(parseVatSettings(f).p_business_id,undefined);
 for(const [key,value]of [['vat_enabled','0'],['vat_version',''],['vat_version','-1'],['vat_number','1234567890'],['vat_registration_date','2026-02-30'],['vat_reason',''],['vat_confirmed','no']]){const bad=new URLSearchParams(f);bad.set(key,value);assert.throws(()=>parseVatSettings(bad),key);}
 let call;await saveVatSettings({rpc:async(name,p)=>{call={name,p};return {data:1};}},a,f);assert.equal(call.p.p_business_id,a);
 assert.match(renderVatSettings({id:a}),/Off — no VAT charged/);assert.doesNotMatch(renderVatSettings({id:a},{vat_number:'<script>'}),/<script>/);assert.match(renderVatSummary(null),/not captured/);assert.match(renderVatSummary({enabled:false}),/No VAT charged/);
 let requests=0;const result=await createZohoBooks({fetchImpl:async()=>{requests++;throw new Error();}}).sync({invoice:{snapshot:{tax_snapshot:{enabled:true}}},mode:'create'});assert.equal(result.error_code,'vat_not_supported');assert.equal(requests,0);
});

test('Postgres VAT is owner-only, tenant scoped, versioned and audited; defaults and old data are preserved',async()=>{
 const {db,as,booking,policy,legacy}=await fixture();try{
 assert.equal((await db.query('select tax_snapshot from public.one_off_bookings where id=$1',[legacy.id])).rows[0].tax_snapshot,null);
 const initial=(await as(owner,()=>booking(a,10,true))).rows[0];assert.equal(initial.total_cents,11500);assert.equal(initial.tax_snapshot.enabled,false);assert.equal(initial.tax_snapshot.vat_cents,0);
 for(const who of [manager,staff,other])await assert.rejects(as(who,()=>policy()),e=>e.code==='42501');
 await assert.rejects(as(owner,()=>policy(0,true,b)),e=>e.code==='42501');
 await assert.rejects(as(owner,()=>policy(0,true,a,'4000000001','2099-01-01')),/already started/);
 await assert.rejects(as(owner,()=>policy(0,true,a,null)),/valid VAT/);
 await assert.rejects(as(owner,()=>policy(0,true,a,'4000000001','2026-01-01',false)),/Confirm/);
 await as(owner,()=>policy());await assert.rejects(as(owner,()=>policy()),e=>e.code==='40001');
 for(const who of [manager,staff,other])assert.equal((await as(who,()=>db.query('select * from public.business_vat_settings'))).rows.length,0);
 await assert.rejects(as(owner,()=>db.exec('update public.business_vat_settings set enabled=false')),e=>e.code==='42501');
 await db.exec('set role anon');await assert.rejects(db.query('select public.configure_business_vat($1,0,false,null,null,\'test\',true)',[a]),e=>e.code==='42501');await db.exec('reset role');
 // Audit failure must undo the policy change as well.
 await db.exec("create function public.fail_vat_audit() returns trigger language plpgsql as $$begin if new.entity_table='business_vat_settings' then raise exception 'Synthetic audit failure';end if;return new;end$$;create trigger fail_vat before insert on audit.events for each row execute function public.fail_vat_audit();");
 await assert.rejects(as(owner,()=>policy(1,false)),/Synthetic audit failure/);
 assert.equal((await db.query('select version from public.business_vat_settings where business_id=$1',[a])).rows[0].version,1);
 await db.exec('drop trigger fail_vat on audit.events;drop function public.fail_vat_audit();');
 const event=(await db.query("select * from audit.events where entity_table='business_vat_settings'")).rows[0];assert.equal(event.actor_user_id,owner);assert.equal(event.new_record.enabled,true);
 const row=(await as(manager,()=>booking())).rows[0];assert.deepEqual([row.total_cents,row.tax_snapshot.net_cents,row.tax_snapshot.vat_cents],[11500,10000,1500]);
 assert.equal((await as(other,()=>booking(b,20))).rows[0].tax_snapshot.enabled,false);
 await assert.rejects(as(owner,()=>db.query("update public.one_off_bookings set tax_snapshot='{}' where id=$1",[row.id])),/immutable/);
 await as(owner,()=>policy(1,false));assert.equal((await db.query('select tax_snapshot from public.one_off_bookings where id=$1',[row.id])).rows[0].tax_snapshot.enabled,true);
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,owner]);await assert.rejects(as(owner,()=>policy(2,true)),e=>e.code==='42501');
 }finally{await db.close();}
});

test('VAT snapshots survive quote conversion, recurring generation and invoice handoff after changes; stale issue is blocked',async()=>{
 const {db,as,booking,quote,policy,legacyQuote}=await fixture();try{
 const change=(q,v,status)=>as(owner,()=>db.query("select public.change_quote($1,$2,$3,$4,'Synthetic evidence')",[a,q,v,status]));
 await assert.rejects(change(legacyQuote,1,'issued'),/Create a new quote/);
 const old=(await as(owner,quote)).rows[0].id;await as(owner,policy);await assert.rejects(change(old,1,'issued'),/Create a new quote/);
 const q=(await as(owner,quote)).rows[0].id;const saved=(await db.query('select agreement from public.business_quotes where id=$1',[q])).rows[0].agreement;
 await change(q,1,'issued');await change(q,2,'accepted');await as(owner,()=>policy(1,false));
 const receipt=(await as(owner,()=>db.query("select public.convert_quote($1,$2,3,((now() at time zone 'Africa/Johannesburg')::date+1)::timestamp+interval '9 hours','') receipt",[a,q]))).rows[0].receipt;
 const row=(await db.query('select * from public.one_off_bookings where id=$1',[receipt.booking_id])).rows[0];assert.deepEqual(row.tax_snapshot,saved.tax_snapshot);assert.equal(row.total_cents,11500);
 const schedule=(await as(owner,()=>db.query("select public.create_recurring($1,$2,gen_random_uuid(),'weekly',array[0,1,2,3,4,5,6]::smallint[],null,'last_day') id",[a,row.id]))).rows[0].id;
 assert.deepEqual((await db.query('select agreement from public.recurring_schedules where id=$1',[schedule])).rows[0].agreement.tax_snapshot,saved.tax_snapshot);
 await as(owner,()=>db.query("select public.generate_recurring($1,$2,1,(now() at time zone 'Africa/Johannesburg')::date+8)",[a,schedule]));
 const visits=(await db.query('select * from public.one_off_bookings where recurring_schedule_id=$1',[schedule])).rows;assert.ok(visits.length);assert.ok(visits.every(v=>JSON.stringify(v.tax_snapshot)===JSON.stringify(saved.tax_snapshot)));
 const inv=(await as(manager,()=>db.query('select public.prepare_invoice($1,$2) id',[a,row.id]))).rows[0].id;
 const invoice=(await db.query('select * from public.business_invoices where id=$1',[inv])).rows[0];assert.deepEqual(invoice.snapshot.tax_snapshot,saved.tax_snapshot);
 await assert.rejects(db.query("update public.business_invoices set sync_status='syncing' where id=$1",[inv]),/VAT accounting sync/);
 for(const total of [0,1,3,4,5,170000,2147483647]){
  await as(owner,()=>db.query('update public.business_catalogue set price_cents=$1 where id=$2',[total,id(112)]));
  if(total===0)await as(owner,()=>policy(2,true));
  const next=(await as(owner,booking)).rows[0];assert.equal(next.tax_snapshot.vat_cents,Math.floor(total*1500/11500+0.5));assert.equal(next.tax_snapshot.net_cents+next.tax_snapshot.vat_cents,total);
 }
 }finally{await db.close();}
});
