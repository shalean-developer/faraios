import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from 'pg';

// Native PostgreSQL only. A dedicated disposable, empty PostgreSQL 17 database
// is required; never point this at Supabase staging/production.
test('OP-02: non-superuser transfer authority is temporary and cannot be inherited', async t => {
  const target=process.env.T19_CUSTODY_NATIVE_URL;
  if(!target){t.skip('requires a disposable native PostgreSQL 17 test database');return;}
  const url=new URL(target);
  assert.equal(url.hostname,'127.0.0.1');
  assert.equal(url.pathname,'/postgres');
  assert.equal(url.username,'postgres');
  assert.equal(url.password,'');
  assert.equal(url.search,'');
  const admin=new Client({connectionString:target,ssl:false});
  await admin.connect();
  try {
    const clean=await admin.query("select count(*)::int as n from pg_namespace where nspname='op02_synthetic'");
    assert.equal(clean.rows[0].n,0,'must use disposable database');
    await admin.query("create role op02_restricted login nosuperuser nocreatedb nocreaterole noinherit");
    await admin.query("create role op02_owner nologin nosuperuser nocreatedb nocreaterole noinherit");
    await admin.query("create schema op02_synthetic authorization op02_restricted");
    await admin.query("grant op02_owner to op02_restricted with admin true, inherit false, set false");
    // Login is authenticated as restricted executor; it must not have pre-existing SET.
    // Auth setup is test-runner-specific. Instead run SET SESSION AUTHORIZATION from
    // a privileged fixture connection: session_user becomes restricted.
    await admin.query('set session authorization op02_restricted');
    try {
      assert.equal((await admin.query("select pg_has_role(current_user,'op02_owner','SET') ok")).rows[0].ok,false);
      await admin.query("create function op02_synthetic.probe() returns integer language sql as $$select 1$$");
      await assert.rejects(admin.query("alter function op02_synthetic.probe() owner to op02_owner"),{code:'42501'});
      await admin.query('begin');
      await admin.query('grant op02_owner to current_user with set true, inherit false');
      await admin.query('grant create on schema op02_synthetic to op02_owner');
      await admin.query('alter function op02_synthetic.probe() owner to op02_owner');
      await admin.query('revoke create on schema op02_synthetic from op02_owner');
      await admin.query('grant op02_owner to current_user with set false, inherit false');
      assert.equal((await admin.query("select pg_has_role(current_user,'op02_owner','SET') ok")).rows[0].ok,false);
      assert.equal((await admin.query("select has_schema_privilege('op02_owner','op02_synthetic','CREATE') ok")).rows[0].ok,false);
      await admin.query('commit');
      const check=await admin.query("select pg_get_userbyid(proowner) owner from pg_proc where oid='op02_synthetic.probe()'::regprocedure");
      assert.equal(check.rows[0].owner,'op02_owner');
      await assert.rejects(admin.query("alter function op02_synthetic.probe() owner to op02_restricted"),{code:'42501'});
    } finally {await admin.query('reset session authorization');}
  } finally {
    await admin.query('drop schema if exists op02_synthetic cascade');
    await admin.query('drop role if exists op02_restricted');
    await admin.query('drop role if exists op02_owner');
    await admin.end();
  }
});
