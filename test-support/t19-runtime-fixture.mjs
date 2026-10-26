import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {Client} from 'pg';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(1),manager=id(2),staff=id(3),a=id(10),b=id(20);
const files=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql','invoices-draft.sql'];
export async function invoiceFixture({legacyVat=false}={}){
 let db;
 if(process.env.T19_CUSTODY_NATIVE_URL){
  const target=new URL(process.env.T19_CUSTODY_NATIVE_URL);
  if(target.hostname!=='127.0.0.1'||target.pathname!=='/postgres'||target.username!=='postgres'||target.password||target.search)throw Error('disposable_only');
  const client=new Client({connectionString:target.href,ssl:false});await client.connect();
  if(Number((await client.query("select count(*) from pg_tables where schemaname='public'")).rows[0].count)!==0)throw Error('nonempty_database');
  db={query:(...args)=>client.query(...args),exec:sql=>client.query(sql),close:()=>client.end()};
 }else db=new PGlite({extensions:{btree_gist}});
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant usage on schema public to service_role;grant execute on function auth.uid() to authenticated;");
 for(const file of files)await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 if(!legacyVat){
  await db.exec(await readFile(new URL('../database/earnings-rules-draft.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261021223123_business_vat_settings.sql',import.meta.url),'utf8'));
 }
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
