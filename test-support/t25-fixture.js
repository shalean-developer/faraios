import {readFile} from 'node:fs/promises';
import {definitions,profileFields} from '../src/cleaning-profiles.js';
export const id=n=>'25000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const owner=id(1),customer=id(2),other=id(3),staff=id(4),a=id(10),b=id(20);
export async function fixture(db){
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text,banned_until timestamptz,is_anonymous boolean default false);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.sub',true))$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
 for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261021152058_t04_duration_workload.sql',import.meta.url),'utf8'));
 const t20=await readFile(new URL('../database/t20-payment-https-candidate.sql',import.meta.url),'utf8');
 await db.exec('create schema private_t20;'+t20.slice(t20.indexOf('create function private_t20.live_session()'),t20.indexOf('create function private_t20.owner_rpc')));
 await db.exec('revoke all on schema private_t20 from public,anon,authenticated;revoke all on function private_t20.live_session() from public,anon,authenticated;');
 await db.exec(await readFile(new URL('../database/t25-customer-portal-candidate.sql',import.meta.url),'utf8'));
 for(const u of [owner,customer,other,staff]){await db.query("insert into auth.users(id,email) values($1,'same@example.invalid')",[u]);await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[u]);}
 for(const [business,route,n] of [[a,'alpha',10],[b,'beta',20]]){
  await db.query("insert into public.businesses(id,name,industry) values($1,$2,'cleaning')",[business,'Synthetic '+route]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'owner'),($1,$3,'staff')",[business,owner,staff]);
  await db.query("insert into private_t25.routes values($1,$2,true)",[route,business]);
  await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,$2,array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[business,'Synthetic '+route]);
  const rules={};for(const key of profileFields.regular){const d=definitions[key];rules[key]={};for(const opt of d.count?['unit']:d.custom?['No animals']:d.options)rules[key][opt]={cents:100,minutes:30};}
  const config={base_minutes:210,service_fee_cents:500,rules,equipment:{policy:'included',base:'PRIVATE DEPOT MUST NOT LEAK'},extras:[],extra_minutes:{},minimum_minutes:210,duration_step_minutes:30};
  await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active,cleaning_profile,cleaning_config) values($1,$2,'service',$3,'fixed','visit',$4,'ZAR',1,true,'regular',$5)",[id(n+100),business,'Synthetic service '+route,n*1000,JSON.stringify(config)]);
 }
 const as=async(user,fn,role='authenticated')=>{await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 const call=(action,payload={},user=customer,route='alpha')=>as(user,async()=>(await db.query('select public.t25_customer_portal($1,$2,$3) v',[route,action,JSON.stringify(payload)])).rows[0].v,user?'authenticated':'anon');
 return {db,as,call};
}
export function scope(){const s={};for(const key of profileFields.regular){const d=definitions[key];s[key]=d.count?1:d.custom?'No animals':d.options[0];}return s;}
export async function enrol(f,user=customer,route='alpha',n=1000){const c=await f.call('enrol',{requestId:id(n),name:'Synthetic customer',phone:'0000000000'},user,route);const address=await f.call('address',{requestId:id(n+1),customer:c.customer,label:'Home',address_line:'Synthetic street',city:'Synthetic city'},user,route);return {customer:c.customer,address:address.address};}
export const booking=(rel,n=1002,service=id(110))=>({requestId:id(n),...rel,localStart:'2099-11-02T09:00',selection:[{catalogue_id:service,quantity:1}],catalogueVersions:{[service]:'1'},scope:scope()});
