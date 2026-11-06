import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {GREENFIELD_T31_FILES} from '../src/t31-greenfield-manifest.js';

// Connects ONLY to the dedicated disposable local PostgreSQL cluster.
test('T31 greenfield foundation installs cleanly and isolates tenant settings and prices',
 {skip:!process.env.T31_GREENFIELD_NATIVE_URL,timeout:90000},async t=>{
 const url=new URL(process.env.T31_GREENFIELD_NATIVE_URL);
 if(process.env.T31_GREENFIELD_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||
    url.pathname!=='/faraios_t31_greenfield_test'||url.port==='5432')
   throw Error('Dedicated disposable local T31 database required');
 const db=new pg.Client({connectionString:url.href});
 await db.connect();t.after(()=>db.end());
 await db.query(`create role authenticated nologin; create role anon nologin;
 create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable set search_path=''
 as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable set search_path=''
 as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 grant usage on schema auth to authenticated,anon;
 grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
 for(const path of GREENFIELD_T31_FILES)
   await db.query(await readFile(new URL('../'+path,import.meta.url),'utf8'));
 const alice='31000000-0000-4000-8000-000000000001';
 const bob='31000000-0000-4000-8000-000000000002';
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',
  [alice,'alice@example.invalid',bob,'bob@example.invalid']);
 const as=async (user,fn)=>{
  await db.query('begin');
  try{
   await db.query('set local role authenticated');
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);
   await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user})]);
   const value=await fn();
   await db.query('commit');return value;
  }catch(e){await db.query('rollback');throw e;}
 };
 const make=async(user,num,label)=>as(user,async()=>(await db.query(
  'select public.t31_provision_business($1,$2) id',
  [label,'31000000-0000-4000-9000-'+String(num).padStart(12,'0')])).rows[0].id);
 const a=await make(alice,11,'Alice Cleaning');
 const b=await make(bob,12,'Bob Cleaning');
 assert.notEqual(a,b);
 assert.equal((await db.query('select count(*)::int n from public.businesses')).rows[0].n,2);
 await as(alice,()=>db.query(
  'insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,$2,$3,$4,$5,$6)',
  [a,'Alice Cleaning',[1,2,3,4,5],'08:00','17:00','Africa/Johannesburg']));
 await as(alice,()=>db.query(
  'insert into public.business_catalogue(business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
  [a,'service','Basic Clean','fixed','visit',45000,'ZAR',1,true]));
 assert.equal((await as(bob,()=>db.query('select * from public.business_settings'))).rows.length,0);
 assert.equal((await as(bob,()=>db.query('select * from public.business_catalogue'))).rows.length,0);
 await assert.rejects(as(bob,()=>db.query(
  'insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,$2,$3,$4,$5,$6)',
  [a,'Intruder',[1],'08:00','17:00','Africa/Johannesburg'])),e=>e.code==='42501');
 assert.equal((await db.query("select count(*)::int n from audit.events where entity_table in ('business_settings','business_catalogue') and business_id=$1",[a])).rows[0].n,2);
 assert.equal((await db.query("select count(*)::int n from pg_class where relnamespace='public'::regnamespace and relname in ('staff_profiles','staff_teams','t31_business_branding')")).rows[0].n,3);
 console.log('T31_GREENFIELD_DEPENDENCY_AND_RLS_PASS');
});
