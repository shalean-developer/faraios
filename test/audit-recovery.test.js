import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const owner='00000000-0000-4000-8000-000000000001', manager='00000000-0000-4000-8000-000000000002';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../database/audit-draft.sql',import.meta.url),'utf8'));
 return db;
}
async function seed(db){
 await db.query('insert into auth.users values ($1),($2)',[owner,manager]);
 await db.query("insert into public.businesses(id,name,industry) values ($1,'Synthetic A','cleaning'),($2,'Synthetic B','cleaning')",[a,b]);
 await db.query("insert into public.business_memberships(business_id,user_id,role) values ($1,$3,'owner'),($2,$4,'manager')",[a,b,owner,manager]);
}
async function asUser(db,id,fn){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await fn();}finally{await db.exec('reset role');await db.exec("reset request.jwt.claim.sub");}}
async function snapshot(db){
 return {businesses:(await db.query('select * from public.businesses order by id')).rows,
 memberships:(await db.query('select * from public.business_memberships order by business_id,user_id')).rows,
 events:(await db.query('select * from audit.events order by id')).rows};
}
test('audit records actor, before/after, timestamp and transaction; rolls back atomically',async()=>{
 const db=await database();try{
 await seed(db);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await db.query("update public.business_memberships set status='suspended' where business_id=$1",[b]);
 const event=(await db.query("select * from audit.events where operation='UPDATE'")).rows[0];
 assert.equal(event.actor_user_id,owner);assert.equal(event.database_role,'postgres');assert.equal(event.business_id,b);
 assert.equal(event.old_record.status,'active');assert.equal(event.new_record.status,'suspended');assert.ok(event.occurred_at);assert.ok(event.transaction_id);
 const count=(await db.query('select count(*)::int n from audit.events')).rows[0].n;
 await db.exec('begin');await db.query("update public.businesses set name='Rolled back' where id=$1",[a]);await db.exec('rollback');
 assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,count);
 await db.query('update public.businesses set name=name where id=$1',[a]);assert.equal((await db.query('select count(*)::int n from audit.events')).rows[0].n,count);
 await assert.rejects(db.query('update public.business_memberships set user_id=$1 where business_id=$2',[manager,a]),/immutable/);
 }finally{await db.close();}
});
test('audit owner reads are business scoped; manager, staff and anon cannot read or forge history',async()=>{
 const db=await database();try{
 await seed(db);
 const events=await asUser(db,owner,()=>db.query('select business_id from audit.events'));assert.equal(events.rows.length,2);assert.ok(events.rows.every(x=>x.business_id===a));
 assert.equal((await asUser(db,manager,()=>db.query('select * from audit.events'))).rows.length,0);
 await db.query("update public.business_memberships set role='staff' where user_id=$1",[manager]);
 assert.equal((await asUser(db,manager,()=>db.query('select * from audit.events'))).rows.length,0);
 for(const query of ['delete from audit.events','update audit.events set operation=operation','truncate audit.events',"insert into audit.events(business_id,database_role,entity_table,operation) values ('"+a+"','forged','businesses','INSERT')"]){
 await assert.rejects(asUser(db,owner,()=>db.exec(query)),/permission denied/);
 }
 await db.query("update public.business_memberships set status='suspended' where user_id=$1",[owner]);
 assert.equal((await asUser(db,owner,()=>db.query('select * from audit.events'))).rows.length,0);
 await db.exec('set role anon');await assert.rejects(db.query('select * from audit.events'),/permission denied/);
 }finally{await db.close();}
});
test('logical application snapshot restores into an empty isolated database with audit and RLS intact',async()=>{
 const source=await database(),target=await database();try{
 await seed(source);await source.query("update public.businesses set name='Updated synthetic A' where id=$1",[a]);
 const saved=JSON.parse(JSON.stringify(await snapshot(source)));
 await target.query('insert into auth.users values ($1),($2)',[owner,manager]);
 // Only isolated recovery: disable capture while importing original rows/events, then re-enable.
 await target.exec('begin; alter table public.businesses disable trigger audit_business_change; alter table public.business_memberships disable trigger audit_membership_change;');
 for(const row of saved.businesses)await target.query('insert into public.businesses select * from jsonb_populate_record(null::public.businesses,$1::jsonb)',[JSON.stringify(row)]);
 for(const row of saved.memberships)await target.query('insert into public.business_memberships select * from jsonb_populate_record(null::public.business_memberships,$1::jsonb)',[JSON.stringify(row)]);
 for(const row of saved.events)await target.query('insert into audit.events select * from jsonb_populate_record(null::audit.events,$1::jsonb)',[JSON.stringify(row)]);
 await target.exec('alter table public.businesses enable trigger audit_business_change; alter table public.business_memberships enable trigger audit_membership_change; commit;');
 assert.deepEqual(JSON.parse(JSON.stringify(await snapshot(target))),saved);
 assert.deepEqual((await asUser(target,owner,()=>target.query('select id from public.businesses'))).rows,[{id:a}]);
 assert.deepEqual((await asUser(target,manager,()=>target.query('select id from public.businesses'))).rows,[{id:b}]);
 const previous=saved.events.length;await target.query("update public.businesses set name='After restore' where id=$1",[a]);
 assert.equal((await target.query('select count(*)::int n from audit.events')).rows[0].n,previous+1);
 }finally{await source.close();await target.close();}
});
