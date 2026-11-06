import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {installRestrictedGreenfield} from '../test-support/t31-greenfield-fixture.js';

// Connects ONLY to the dedicated disposable local PostgreSQL cluster.
test('T31 greenfield foundation installs cleanly and isolates tenant settings and prices',
 {skip:!process.env.T31_GREENFIELD_NATIVE_URL,timeout:90000},async t=>{
 const url=new URL(process.env.T31_GREENFIELD_NATIVE_URL);
 if(process.env.T31_GREENFIELD_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||
    url.pathname!=='/faraios_t31_greenfield_test'||url.port==='5432')
   throw Error('Dedicated disposable local T31 database required');
 const db=new pg.Client({connectionString:url.href});
 await db.connect();t.after(()=>db.end());
 await installRestrictedGreenfield(db);
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

 // Only current-caller Auth bridges are exposed to the worker roles.
 await db.query('begin');
 await db.query('set local role t31_bootstrap');
 await assert.rejects(db.query('select auth.uid()'),e=>e.code==='42501');
 await db.query('rollback');
 await db.query('begin');
 await db.query('set local role anon');
 await assert.rejects(db.query('select private_t31.current_verified_email()'),e=>e.code==='42501');
 await db.query('rollback');
 // The helper resolves the verified caller only, including JWT-claims fallback.
 await db.query('begin');
 await db.query('set local role t31_bootstrap');
 await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:bob})]);
 assert.equal((await db.query('select private_t31.current_verified_email() email')).rows[0].email,'bob@example.invalid');
 await db.query('rollback');
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[bob]);
 await assert.rejects(make(bob,13,'Unverified'),e=>e.code==='42501');
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[bob]);
 // Native invitation acceptance exercises the separate worker without Auth access.
 const token=(await as(alice,()=>db.query('select public.t31_invite_staff($1,$2,$3) token',
  [a,'bob@example.invalid','staff']))).rows[0].token;
 assert.equal((await as(bob,()=>db.query('select public.t31_accept_invite($1) id',[token]))).rows[0].id,a);
 assert.equal((await db.query('select count(*)::int n from public.business_memberships where business_id=$1 and user_id=$2 and role=$3',[a,bob,'staff'])).rows[0].n,1);
 console.log('T31_GREENFIELD_DEPENDENCY_AND_RLS_PASS');
});
