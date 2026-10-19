import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Postgres RLS isolates businesses and denies membership escalation',async()=>{
  const db=new PGlite();
  const owner='00000000-0000-4000-8000-000000000001',manager='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
  const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
  try {
    // Minimal Supabase auth harness; local Postgres behaviour, not hosted Auth proof.
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated;`);
    await db.exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
    await db.query('insert into auth.users values ($1),($2),($3)',[owner,manager,outsider]);
    await db.query("insert into public.businesses(id,name,industry) values ($1,'Example A','cleaning'),($2,'Example B','cleaning')",[a,b]);
    await db.query("insert into public.business_memberships(business_id,user_id,role) values ($1,$3,'owner'),($2,$3,'owner'),($2,$4,'manager')",[a,b,owner,manager]);
    async function asUser(id,fn){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await fn();}finally{await db.exec('reset role');}}
    assert.equal((await asUser(owner,()=>db.query('select id from public.businesses'))).rows.length,2);
    const onlyB=await asUser(manager,()=>db.query('select id from public.businesses'));assert.deepEqual(onlyB.rows,[{id:b}]);
    assert.equal((await asUser(manager,()=>db.query('select id from public.businesses where id=$1',[a]))).rows.length,0);
    assert.equal((await asUser(outsider,()=>db.query('select id from public.businesses'))).rows.length,0);
    assert.equal((await asUser(manager,()=>db.query('select user_id from public.business_memberships'))).rows.length,1);
    await assert.rejects(asUser(manager,()=>db.query("update public.business_memberships set role='owner' where user_id=$1",[manager])),/permission denied/);
    await assert.rejects(asUser(manager,()=>db.query("insert into public.business_memberships(business_id,user_id,role) values ($1,$2,'owner')",[a,manager])),/permission denied/);
    await assert.rejects(asUser(owner,()=>db.query("update public.businesses set name='Tampered' where id=$1",[a])),/permission denied/);
    await db.query("update public.business_memberships set status='suspended' where user_id=$1",[manager]);
    assert.equal((await asUser(manager,()=>db.query('select id from public.businesses'))).rows.length,0);
    await db.exec('set role anon');await assert.rejects(db.query('select id from public.businesses'),/permission denied/);await db.exec('reset role');
  }finally{await db.close();}
});
