import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const sql=await readFile(new URL('../docs/proposals/t19-a12-inactive-hardening.sql',import.meta.url),'utf8');
async function fixture(t){
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create role t19_hosted_custody nologin noinherit;
 create schema private_t19_custody;
 create table private_t19_custody.connections(id integer);
 create table private_t19_custody.operations(id integer);
 create table private_t19_custody.prepared_references(id integer);
 create schema vault;create table vault.unrelated(id integer);
 grant usage on schema vault to service_role;
 grant select on vault.unrelated to service_role;`);
 return db;
}
test('inactive hardening enables RLS and denies app roles without touching Vault',async t=>{
 const db=await fixture(t);
 await db.exec('grant usage on schema private_t19_custody to public;grant all on all tables in schema private_t19_custody to public;');
 await db.exec(sql);
 assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private_t19_custody' and c.relkind='r' and c.relrowsecurity")).rows[0].n,3);
 for(const role of ['anon','authenticated','service_role','t19_hosted_custody']){
  await db.exec('set session authorization '+role);
  await assert.rejects(db.query('select * from private_t19_custody.connections'),{code:'42501'});
  await db.exec('set session authorization postgres');
 }
 // Test RLS as a second boundary if schema/table SELECT is accidentally granted.
 await db.exec('grant usage on schema private_t19_custody to authenticated');
 await db.exec('grant select on private_t19_custody.connections to authenticated');
 await db.exec('insert into private_t19_custody.connections values(1)');
 await db.exec('set session authorization authenticated');
 assert.equal((await db.query('select * from private_t19_custody.connections')).rows.length,0);
 await db.exec('set session authorization postgres');
 assert.equal((await db.query("select has_table_privilege('service_role','vault.unrelated','SELECT') allowed")).rows[0].allowed,true);
});
for(const [name,mutation,reason] of [
 ['nonempty state','insert into private_t19_custody.connections values(1)','INACTIVE_HARDENING_NOT_EMPTY'],
 ['runtime installation','create role t19_runtime_owner nologin','INACTIVE_HARDENING_BASELINE_CHANGED'],
 ['unexpected table','create table private_t19_custody.unexpected(id integer)','INACTIVE_HARDENING_BASELINE_CHANGED'],
 ['existing policy','alter table private_t19_custody.connections enable row level security;create policy unexpected on private_t19_custody.connections using(true)','INACTIVE_HARDENING_BASELINE_CHANGED'],
 ['active login','alter role t19_hosted_custody login','INACTIVE_HARDENING_BASELINE_CHANGED']
])test('inactive hardening refuses '+name+' without partial change',async t=>{
 const db=await fixture(t);await db.exec(mutation);
 const before=(await db.query("select relname,relrowsecurity,relacl::text from pg_class where relnamespace='private_t19_custody'::regnamespace order by relname")).rows;
 await assert.rejects(db.exec(sql),e=>e.code==='55000'&&e.message===reason);
 await db.exec('rollback');
 assert.deepEqual((await db.query("select relname,relrowsecurity,relacl::text from pg_class where relnamespace='private_t19_custody'::regnamespace order by relname")).rows,before);
});
