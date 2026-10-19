import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseStaffRecord,resolveAssignedTeam,renderStaffTeams} from '../src/staff-teams.js';
import {bookingContext,renderBookings} from '../src/bookings.js';
const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002',staff='00000000-0000-4000-8000-000000000003',foreign='00000000-0000-4000-8000-000000000004';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
test('staff teams enforce tenant, owner writes, membership, immutable identity and audit in Postgres',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['identity-draft.sql','audit-draft.sql','staff-teams-draft.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query("insert into auth.users values($1,'owner@test.invalid'),($2,'manager@test.invalid'),($3,'staff@test.invalid'),($4,'foreign@test.invalid')",[owner,manager,staff,foreign]);
 await db.query("insert into public.businesses(id,name,industry) values($1,'A','cleaning'),($2,'B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$3,'owner'),($1,$4,'manager'),($1,$5,'staff'),($2,$6,'staff')",[a,b,owner,manager,staff,foreign]);
 const as=async(user,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
 const profile=await as(owner,()=>db.query("insert into public.staff_profiles(business_id,user_id,display_name) values($1,$2,'Local cleaner') returning *",[a,staff]));
 const team=(await as(owner,()=>db.query("insert into public.staff_teams(business_id,name,members) values($1,'Team A',$2) returning *",[a,[staff]]))).rows[0];
 assert.equal((await as(manager,()=>db.query('select * from public.staff_profiles'))).rows.length,1);
 assert.equal((await as(staff,()=>db.query('select * from public.staff_profiles'))).rows.length,0);
 await assert.rejects(as(staff,()=>db.query('select public.staff_context($1)',[a])),/access denied/);
 await assert.rejects(as(manager,()=>db.query('select public.staff_context($1)',[b])),/access denied/);
 await assert.rejects(as(manager,()=>db.query("insert into public.staff_teams(business_id,name,members) values($1,'No',$2)",[a,[staff]])),/row-level security/);
 await assert.rejects(as(owner,()=>db.query("insert into public.staff_teams(business_id,name,members) values($1,'Foreign',$2)",[a,[foreign]])),/active staff/);
 await assert.rejects(as(owner,()=>db.query("insert into public.staff_teams(business_id,name,members) values($1,'Duplicate',$2)",[a,[staff,staff]])),/distinct/);
 await assert.rejects(as(owner,()=>db.query("insert into public.staff_profiles(business_id,user_id,display_name) values($1,$2,'Wrong role')",[a,manager])),/active staff/);
 await assert.rejects(as(owner,()=>db.query('update public.staff_profiles set user_id=$2 where id=$1',[profile.rows[0].id,owner])),/immutable/);
 await as(owner,()=>db.query("update public.staff_teams set name='Renamed' where id=$1 and version=1",[team.id]));
 assert.equal((await as(owner,()=>db.query("update public.staff_teams set name='Stale' where id=$1 and version=1 returning *",[team.id]))).rows.length,0);
 await db.query("update public.business_memberships set status='suspended' where business_id=$1 and user_id=$2",[a,staff]);
 await assert.rejects(as(owner,()=>db.query("update public.staff_teams set name='Cannot use inactive staff' where id=$1",[team.id])),/active staff/);
 await as(owner,()=>db.query('update public.staff_teams set is_active=false where id=$1',[team.id]));
 await assert.rejects(as(owner,()=>db.query('delete from public.staff_teams where id=$1',[team.id])),/permission denied/);
 await assert.rejects(as(owner,()=>db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'staff')",[a,foreign])),/permission denied/);
 const events=(await db.query("select actor_user_id,new_record from audit.events where entity_table='staff_teams' order by occurred_at")).rows;assert.equal(events.length,3);assert.ok(events.every(e=>e.actor_user_id===owner));assert.equal(events.at(-1).new_record.is_active,false);
 await as(owner,()=>db.query("select public.staff_context($1)",[a]));
 }finally{await db.close();}
});
test('saved team assignment replaces manual choices and rejects revoked members',async()=>{
 const team={id:a,business_id:b,is_active:true,members:[staff]};const client={from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async()=>({data:[team]})}),rpc:async()=>({data:[{user_id:staff}]})};
 const form=new URLSearchParams({team_id:a,assigned_staff:foreign,version:'3'});
 assert.deepEqual((await resolveAssignedTeam(client,b,form)).getAll('assigned_staff'),[staff]);assert.equal(form.get('assigned_staff'),foreign);
 client.rpc=async()=>({data:[]});await assert.rejects(resolveAssignedTeam(client,b,form),/without active/);
 assert.throws(()=>parseStaffRecord(new URLSearchParams({name:'X',status:'active',members:'bad'}),'team'));
 assert.doesNotMatch(renderStaffTeams({id:a,name:'<script>'},[],[],[],false),/<script>|method="post"/);
});
test('booking assignment uses the business-specific profile label',async()=>{
 const client={rpc:async name=>({data:name==='staff_context'?[{user_id:staff,label:'Business cleaner name'}]:{time_zone:'UTC',staff:[{user_id:staff,label:'auth-email@test.invalid'}]}}),from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async()=>({data:[]})})};
 const ctx=await bookingContext(client,a);assert.equal(ctx.staff[0].label,'Business cleaner name');
 const html=renderBookings({id:a,name:'A'},[],ctx,{booking:{id:b,version:1,status:'confirmed',assigned_staff:[],required_team_size:1,customer_snapshot:{name:'Test'},address_snapshot:{},price_lines:[],total_cents:0}});
 assert.match(html,/Business cleaner name/);assert.doesNotMatch(html,/auth-email@test.invalid/);
});
