import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';

// Run only in the separately created disposable native PostgreSQL 17 cluster.
test('OP-04 actual SQLSTATE 55000 collision denial and aborted transaction integrity',async t=>{
 const value=process.env.T19_CUSTODY_NATIVE_URL;
 if(!value){t.skip('disposable native cluster required');return;}
 const url=new URL(value);
 assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/postgres');
 assert.equal(url.username,'postgres');assert.equal(url.password,'');assert.equal(url.search,'');
 const db=new Client({connectionString:value,ssl:false});await db.connect();
 const sqls={};
 for(const name of ['runtime','oauth','api']){
  const src=await readFile(new URL('../database/t19-custody-'+name+'.sql',import.meta.url),'utf8');
  const match=src.match(/do \\$t19_preflight\\$ begin[\\s\\S]*?end \\$t19_preflight\\$;/i);
  assert.ok(match,'expected exact OP-04 guard for '+name);
  sqls[name]=match[0];
 }
 const scalar=async q=>(await db.query(q)).rows[0];
 const state=async()=>JSON.stringify((await db.query(`select n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) owner,coalesce(c.relacl::text,'') acl
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='private_t19_custody' order by c.relname`)).rows);
 const check=async(name)=>{
  const before=await state();
  await db.query('begin');
  try{
   await assert.rejects(db.query(sqls[name]),{code:'55000'},name+' rejected with expected SQLSTATE');
  }finally{await db.query('rollback');}
  assert.equal(await state(),before,name+' catalog state unchanged');
 };
 try{
  assert.equal((await scalar("select count(*)::int n from pg_namespace where nspname='private_t19_custody'")).n,0);
  await db.query('create schema private_t19_custody');
  await check('runtime'); // missing inactive prerequisites
  await db.query('create role t19_hosted_custody nologin');
  await db.query('create table private_t19_custody.connections(id integer)');
  await db.query('create table private_t19_custody.operations(id integer)');
  await db.query('create table private_t19_custody.prepared_references(id integer)');
  await db.query('create table private_t19_custody.machines(id integer)'); // runtime collision
  await check('runtime');
  await db.query('create role t19_runtime_owner nologin');
  await db.query('create table private_t19_custody.jobs(id integer)');
  await db.query('create table private_t19_custody.revocations(id integer)');
  await check('oauth'); // missing runtime function
  await db.query("create function private_t19_custody.runtime(text,jsonb) returns jsonb language sql as 'select null::jsonb'");
  await db.query('create table private_t19_custody.oauth_clients(id integer)');
  await check('oauth'); // OAuth collision
  await check('api'); // missing OAuth state
  await db.query('create table private_t19_custody.oauth_states(id integer)');
  await db.query("create function private_t19_custody.oauth(text,jsonb) returns jsonb language sql as 'select null::jsonb'");
  await db.query("create function public.t19_accounting_status(uuid) returns jsonb language sql as 'select null::jsonb'");
  await check('api'); // API collision
  await db.query('drop function public.t19_accounting_status(uuid)');
  // Prove a failure after accepted guard rolls back earlier DDL in same transaction.
  await db.query('begin');
  try{
   await db.query(sqls.api);
   await db.query('create table private_t19_custody.op04_aborted_probe(id integer)');
   await assert.rejects(db.query("do $$ begin raise exception 'synthetic failure' using errcode='55000'; end $$"),{code:'55000'});
  }finally{await db.query('rollback');}
  assert.equal((await scalar("select to_regclass('private_t19_custody.op04_aborted_probe') is null absent")).absent,true);
  console.log('T19_OP04_SQLSTATE_55000_COLLISION_AND_ROLLBACK_PASS');
 }finally{
  await db.query('drop schema if exists private_t19_custody cascade');
  await db.query('drop role if exists t19_runtime_owner');
  await db.query('drop role if exists t19_hosted_custody');
  await db.end();
 }
});
