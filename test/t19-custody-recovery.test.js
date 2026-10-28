import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {compareStructure} from '../scripts/t19-custody-recovery-compare.mjs';

const sql=await readFile(new URL('../docs/proposals/t19-inactive-custody-recovery.sql',import.meta.url),'utf8');
const expected=JSON.parse(await readFile(new URL('../test-support/t19-custody-recovery-expected.json',import.meta.url),'utf8'));
const projection=(await readFile(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8'))
 .replace("('managed',array['auth','storage']::text[])","('custody',array['private_t19_custody']::text[])")
 .replace("select jsonb_object_agg(scope,encode(extensions.digest(value::text,'sha256'),'hex')) as catalog from catalogs;","select value from catalogs where scope='custody';");
async function fixture(t){
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA vault; CREATE TABLE vault.unrelated(id integer); INSERT INTO vault.unrelated VALUES(7);
 GRANT USAGE ON SCHEMA vault TO service_role; GRANT SELECT ON vault.unrelated TO service_role;
 CREATE TABLE public.recovery_sentinel(id integer); INSERT INTO public.recovery_sentinel VALUES(9);`);
 return db;
}
test('recovery recreates inactive constraints, index, RLS and denial boundaries',async t=>{
 const db=await fixture(t);
 await db.exec("SET faraios.t19_restore_candidate='isolated-disposable-reviewed'");
 await db.exec(sql);
 await db.exec("SET search_path=''; SET timezone='UTC';");
 const captured=(await db.query(projection)).rows[0].value;
 assert.equal(compareStructure(captured,expected).status,'CUSTODY_STRUCTURE_MATCH');
 const readback=await readFile(new URL('../docs/proposals/t19-inactive-custody-recovery-readback.sql',import.meta.url),'utf8');
 const evidence=(await db.exec(readback)).flatMap(r=>r.rows||[]).find(r=>r.custody_recovery_readback).custody_recovery_readback;
 assert.equal(evidence.roleConforms,true);assert.equal(evidence.membershipConforms,true);
 assert.equal(evidence.indexesValidReady,true);
 assert.deepEqual(evidence.tableCounts,{connections:0,operations:0,prepared_references:0});
 const changed=structuredClone(captured);changed.relations[0][4]=false;
 assert.deepEqual(compareStructure(changed,expected).differingComponents,['relations']);
 const role=(await db.query("SELECT rolcanlogin,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname='t19_hosted_custody'")).rows[0];
 assert.ok(Object.values(role).every(v=>v===false));
 const membership=(await db.query("SELECT admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='t19_hosted_custody'::regrole AND member='postgres'::regrole")).rows;
 assert.deepEqual(membership,[{admin_option:true,inherit_option:false,set_option:false}]);
 const tables=(await db.query("SELECT relname,relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner) AS owner FROM pg_class WHERE relnamespace='private_t19_custody'::regnamespace AND relkind='r' ORDER BY relname")).rows;
 assert.equal(tables.length,3);
 assert.ok(tables.every(r=>r.relrowsecurity&&!r.relforcerowsecurity&&r.owner==='postgres'));
 for(const r of ['anon','authenticated','service_role','t19_hosted_custody']){
  await db.exec('SET SESSION AUTHORIZATION '+r);
  for(const table of tables)await assert.rejects(db.query('SELECT * FROM private_t19_custody.'+table.relname),{code:'42501'});
  await db.exec('SET SESSION AUTHORIZATION postgres');
 }
 const insert=`INSERT INTO private_t19_custody.connections VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','staging','zoho','synthetic',1,1,NULL,false)`;
 await assert.rejects(db.exec(insert.replace("'staging'","'production'")),{code:'23514'});
 await db.exec(insert);
 await db.exec("INSERT INTO private_t19_custody.operations VALUES('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',1,1,'44444444-4444-4444-8444-444444444444',now(),'claimed')");
 await assert.rejects(db.exec("INSERT INTO private_t19_custody.operations VALUES('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111',1,1,'66666666-6666-4666-8666-666666666666',now(),'prepared')"),{code:'23505'});
 assert.deepEqual((await db.query('SELECT * FROM public.recovery_sentinel')).rows,[{id:9}]);
 assert.deepEqual((await db.query('SELECT * FROM vault.unrelated')).rows,[{id:7}]);
 assert.equal((await db.query("SELECT has_table_privilege('service_role','vault.unrelated','SELECT') AS allowed")).rows[0].allowed,true);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_proc WHERE pronamespace='private_t19_custody'::regnamespace")).rows[0].n,0);
});
for(const [name,setup] of [
 ['no destination intent',''],
 ['existing schema',"SET faraios.t19_restore_candidate='isolated-disposable-reviewed'; CREATE SCHEMA private_t19_custody;"],
 ['existing custody role',"SET faraios.t19_restore_candidate='isolated-disposable-reviewed'; CREATE ROLE t19_hosted_custody;"],
 ['operational runtime owner',"SET faraios.t19_restore_candidate='isolated-disposable-reviewed'; CREATE ROLE t19_runtime_owner;"]
])test('recovery refuses '+name+' without creating its tables',async t=>{
 const db=await fixture(t);if(setup)await db.exec(setup);
 await assert.rejects(db.exec(sql),e=>e.code==='55000'&&e.message==='CUSTODY_RECOVERY_DESTINATION_REFUSED');
 await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regclass('private_t19_custody.connections') IS NULL AS absent")).rows[0].absent,true);
 assert.deepEqual((await db.query('SELECT * FROM public.recovery_sentinel')).rows,[{id:9}]);
});

test('recovery structure matches original inactive DDL plus applied hardening',async t=>{
 const db=await fixture(t);
 await db.exec("SET faraios.t19_02_approved_project_ref='xdmfyrsauvqznkloroxg'");
 await db.exec(await readFile(new URL('../docs/proposals/t19-02-staging-inactive-schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../docs/proposals/t19-a12-inactive-hardening.sql',import.meta.url),'utf8'));
 await db.exec("SET search_path=''; SET timezone='UTC';");
 assert.equal(compareStructure((await db.query(projection)).rows[0].value,expected).status,'CUSTODY_STRUCTURE_MATCH');
});
