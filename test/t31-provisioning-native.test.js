// T31 native PG17 fixture: isolated, disposable PostgreSQL only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';

const first='00000000-0000-4000-8000-000000000031';
const second='00000000-0000-4000-8000-000000000032';
const request='10000000-0000-4000-8000-000000000031';
const request2='10000000-0000-4000-8000-000000000032';
const reqFail='10000000-0000-4000-8000-000000000033';
test('T31 native: atomic bootstrap, concurrency, authorization and tenant RLS',{skip:!process.env.T31_NATIVE_URL,timeout:90000},async t=>{
 const url=new URL(process.env.T31_NATIVE_URL);
 if(process.env.T31_DISPOSABLE!=='yes'||url.hostname!=='127.0.0.1'||url.pathname!=='/faraios_t31_test'||url.port==='5432')
   throw Error('T31 disposable non-5432 database required');
 const admin=new pg.Client({connectionString:url.href});await admin.connect();t.after(()=>admin.end());
 // Minimal Auth fixture implements the same auth.uid/auth.jwt signatures with transaction-local verified claims.
 await admin.query(`create role authenticated nologin; create role anon nologin;
 create schema auth;
 create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable set search_path=''
 as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable set search_path=''
 as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 grant usage on schema auth to authenticated,anon;
 grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
 await admin.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[first,'first@example.invalid',second,'second@example.invalid']);
 for(const path of ['../database/identity-draft.sql','../database/audit-draft.sql','../database/t31-provisioning-candidate.sql','../database/t31-branding-candidate.sql','../database/t31-staff-invitations-candidate.sql']){
   await admin.query(await readFile(new URL(path,import.meta.url),'utf8'));
 }
 const as=async(user,action,role='authenticated',anonymous=false)=>{
   const db=new pg.Client({connectionString:url.href});await db.connect();
   try {
     await db.query('begin');
     await db.query('set local role '+role);
     if(user)await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);
     await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user,is_anonymous:anonymous})]);
     const result=await action(db);
     await db.query('commit');
     return result;
   }catch(e){await db.query('rollback');throw e;}finally{await db.end();}
 };
 const create=(u,key,name)=>as(u,async db=>(await db.query('select public.t31_provision_business($1,$2) id',[name,key])).rows[0].id);
 const firstId=await create(first,request,'First Cleaning');
 assert.match(firstId,/^[0-9a-f-]{36}$/);
 assert.equal(await create(first,request,'First Cleaning'),firstId,'same actor/key must be idempotent');
 const concurrent=await Promise.all(Array.from({length:3},()=>create(second,request2,'Second Cleaning')));
 assert.equal(new Set(concurrent).size,1,'concurrent duplicate submissions must return one business');
 const secondId=concurrent[0];assert.notEqual(firstId,secondId);
 await assert.rejects(create(first,request,'Different Cleaning'),e=>e.code==='23505');
 assert.equal((await admin.query('select count(*)::integer count from public.businesses')).rows[0].count,2);
 assert.equal((await admin.query('select count(*)::integer count from public.business_memberships')).rows[0].count,2);
 const scoped=await as(first,async db=>({
   businesses:(await db.query('select id from public.businesses')).rows,
   memberships:(await db.query('select business_id from public.business_memberships')).rows,
   audits:(await db.query('select business_id from audit.events')).rows
 }));
 assert.deepEqual(scoped.businesses.map(x=>x.id),[firstId]);
 assert.deepEqual(scoped.memberships.map(x=>x.business_id),[firstId]);
 assert.ok(scoped.audits.length>=2&&scoped.audits.every(x=>x.business_id===firstId));
 await assert.rejects(as(first,db=>db.query('insert into public.business_memberships(business_id,user_id,role) values($1,$2,$3)',[secondId,first,'owner'])),e=>e.code==='42501');
 await assert.rejects(as(first,db=>db.query('insert into public.businesses(name,industry) values($1,$2)',['Forged','cleaning'])),e=>e.code==='42501');
 await assert.rejects(as(first,db=>db.query('select * from private_t31.t31_provision_requests')),e=>e.code==='42501');
 await assert.rejects(as(null,db=>db.query('select public.t31_provision_business($1,$2)',['Anon',reqFail]),'anon'),e=>e.code==='42501');
 await assert.rejects(as(null,db=>db.query('select public.t31_provision_business($1,$2)',['No user',reqFail])),e=>e.code==='28000');
 await assert.rejects(as(first,db=>db.query('select public.t31_provision_business($1,$2)',['Anon user',reqFail]),'authenticated',true),e=>e.code==='28000');
 // Inject a failing membership insert; the tenant and idempotency record must also roll back.
 await admin.query(`create function public.t31_fail_membership() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if exists(select 1 from public.businesses where id=new.business_id and name='Failure Co') then
 raise exception 'synthetic membership failure';
 end if;
 return new;
 end $$;
 create trigger t31_failure before insert on public.business_memberships
 for each row execute function public.t31_fail_membership();`);
 await assert.rejects(create(first,reqFail,'Failure Co'),/synthetic membership failure/);
 assert.equal((await admin.query("select count(*)::integer count from public.businesses where name='Failure Co'")).rows[0].count,0);
 assert.equal((await admin.query('select count(*)::integer count from private_t31.t31_provision_requests where request_id=$1',[reqFail])).rows[0].count,0);
 await admin.query('drop trigger t31_failure on public.business_memberships');
 assert.match(await create(first,reqFail,'Failure Co'),/^[0-9a-f-]{36}$/);
 // T31 branding: foreign owner and non-owner cannot read, insert or change another tenant.
 await as(first,db=>db.query('insert into public.t31_business_branding(business_id,accent_color) values($1,$2)',[firstId,'#146C94']));
 await as(second,db=>db.query('insert into public.t31_business_branding(business_id,accent_color) values($1,$2)',[secondId,'#2277AA']));
 const ownBrand=(await as(first,db=>db.query('select business_id from public.t31_business_branding'))).rows;
 assert.deepEqual(ownBrand.map(x=>x.business_id),[firstId]);
 await assert.rejects(as(second,db=>db.query('insert into public.t31_business_branding(business_id,accent_color) values($1,$2)',[firstId,'#000000'])),e=>e.code==='42501');
 await assert.rejects(as(first,db=>db.query('update public.t31_business_branding set business_id=$1 where business_id=$2',[secondId,firstId])),e=>e.code==='42501'||e.message.includes('immutable'));
 assert.equal((await admin.query('select count(*)::integer n from private_t31.brand_audit')).rows[0].n,2);
 // Cross-business staff invitation must be created by the owner and accepted by exact confirmed recipient only.
 const invite=(who,business,email,role='staff')=>as(who,async db=>(await db.query('select public.t31_invite_staff($1,$2,$3) token',[business,email,role])).rows[0].token);
 const accept=(who,token)=>as(who,async db=>(await db.query('select public.t31_accept_invite($1) id',[token])).rows[0].id);
 await assert.rejects(invite(second,firstId,'first@example.invalid'),e=>e.code==='42501');
 await assert.rejects(invite(first,firstId,'second@example.invalid','owner'),e=>e.code==='22023');
 const token=await invite(first,firstId,'second@example.invalid','staff');
 assert.match(token,/^[0-9a-f-]{36}$/);
 await assert.rejects(accept(first,token),e=>e.code==='42501');
 const joined=await accept(second,token);
 assert.equal(joined,firstId);
 assert.equal(await accept(second,token),firstId,'same verified recipient retry is idempotent');
 assert.equal((await admin.query('select count(*)::integer n from public.business_memberships where business_id=$1 and user_id=$2',[firstId,second])).rows[0].n,1);
 assert.equal((await as(second,db=>db.query('select role from public.business_memberships where business_id=$1',[firstId]))).rows[0].role,'staff');
 await assert.rejects(invite(second,firstId,'first@example.invalid'),e=>e.code==='42501');
 await assert.rejects(accept(second,'30000000-0000-4000-8000-000000000399'),e=>e.code==='42501');
 await assert.rejects(as(second,db=>db.query('select * from private_t31.invitations')),e=>e.code==='42501');
 const tokenExpired=await invite(first,firstId,'second@example.invalid','manager');
 await admin.query('update private_t31.invitations set expires_at=now()-interval \'1 second\' where token_hash=md5($1::text)',[tokenExpired]);
 await assert.rejects(accept(second,tokenExpired),e=>e.code==='42501');
 const tokenUnverified=await invite(second,secondId,'first@example.invalid','staff');
 await admin.query('update auth.users set email_confirmed_at=null where id=$1',[first]);
 await assert.rejects(accept(first,tokenUnverified),e=>e.code==='42501');
 await admin.query('update auth.users set email_confirmed_at=now() where id=$1',[first]);
 console.log('T31_NATIVE_BRANDING_INVITE_ROLE_RLS_PASS');
 console.log('T31_NATIVE_ATOMIC_IDEMPOTENCY_RLS_PASS');
});
