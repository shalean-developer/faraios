import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const root=new URL('../test-support/t19-managed-final/',import.meta.url);
const read=n=>readFile(new URL(n,root),'utf8');
async function setup(db){
 await db.exec("CREATE ROLE supabase_admin SUPERUSER; CREATE ROLE supabase_storage_admin; CREATE ROLE pgbouncer; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA pgbouncer; CREATE SCHEMA storage; SET SESSION AUTHORIZATION supabase_admin;");
 await db.exec(await read('get-auth-before.sql'));
 await db.exec("REVOKE ALL ON FUNCTION pgbouncer.get_auth(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION pgbouncer.get_auth(text) TO pgbouncer; CREATE TABLE storage.buckets(id text); CREATE TABLE storage.objects(id text); ALTER TABLE storage.buckets OWNER TO supabase_storage_admin; ALTER TABLE storage.objects OWNER TO supabase_storage_admin; ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY; ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT ALL ON storage.buckets,storage.objects TO supabase_storage_admin; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.buckets,storage.objects TO anon; GRANT ALL ON storage.buckets,storage.objects TO service_role; GRANT ALL ON storage.buckets,storage.objects TO postgres WITH GRANT OPTION;");
}
const metadata=`SELECT c.relname,a.grantor::regrole::text AS grantor,a.grantee::regrole::text AS grantee,a.privilege_type,a.is_grantable FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.oid IN ('storage.buckets'::regclass,'storage.objects'::regclass) ORDER BY 1,2,3,4`;
test('PG18 embedded engine is rejected before changing metadata, even with synthetic context',async()=>{
 const db=new PGlite();try{
  await setup(db);const before=(await db.query(metadata)).rows;
  assert.ok(Number((await db.query("SELECT current_setting('server_version_num') AS v")).rows[0].v)>=180000);
  await assert.rejects(db.exec(await read('overlay.sql')),/T19_MANAGED_OVERLAY_CONTEXT/);
  await db.exec("SET faraios.t19_bootstrap='synthetic-only';");
  await assert.rejects(db.exec(await read('overlay.sql')),/T19_MANAGED_OVERLAY_CONTEXT/);
  assert.deepEqual((await db.query(metadata)).rows,before);
 }finally{await db.close();}
});
