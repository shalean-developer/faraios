import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {STORAGE_TENANT_MIGRATE_CODE} from '../scripts/t19-storage-tenant-migrate.mjs';
async function execute(overrides={}){
 const dir=await mkdtemp(join(tmpdir(),'t19-tenant-migration-'));
 try{
  await mkdir(join(dir,'dist/internal/database/migrations'),{recursive:true});
  const record=join(dir,'called.json');
  await writeFile(join(dir,'dist/internal/database/migrations/index.js'),"exports.runMigrationsOnTenant=async x=>require('node:fs').writeFileSync(process.env.T19_FIXTURE_RECORD,JSON.stringify(x));");
  const env={MULTI_TENANT:'true',DB_INSTALL_ROLES:'false',DB_ALLOW_MIGRATION_REFRESH:'false',VECTOR_STORE_MIGRATIONS_ENABLED:'false',DB_MIGRATIONS_FREEZE_AT:'revoke-grants-to-unused-operations',DATABASE_URL:'postgres://supabase_storage_admin:synthetic-only@t19-fixture-postgres:5432/postgres',T19_EXPECTED_DATABASE_HOST:'t19-fixture-postgres',T19_FIXTURE_RECORD:record,...overrides};
  const r=spawnSync(process.execPath,['-e',STORAGE_TENANT_MIGRATE_CODE],{cwd:dir,encoding:'utf8',timeout:5000,env});
  let called=null;try{called=JSON.parse(await readFile(record,'utf8'));}catch{}
  return {...r,called};
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('migration-only process invokes exactly the vendor tenant API at the frozen boundary',async()=>{
 const r=await execute();assert.equal(r.status,0);assert.ok(r.stdout.includes('T19_STORAGE_TENANT_MIGRATIONS_PASS'));
 assert.deepEqual(r.called,{databaseUrl:'postgres://supabase_storage_admin:synthetic-only@t19-fixture-postgres:5432/postgres',tenantId:'t19-synthetic',waitForLock:true,upToMigration:'revoke-grants-to-unused-operations'});
});
test('wrong target, mutable history or runtime context stops before importing the migrator',async()=>{
 for(const override of [{MULTI_TENANT:'false'},{DB_ALLOW_MIGRATION_REFRESH:'true'},{DB_INSTALL_ROLES:'true'},{VECTOR_STORE_MIGRATIONS_ENABLED:'true'},{DB_MIGRATIONS_FREEZE_AT:'unlock-object-versioning'},{T19_EXPECTED_DATABASE_HOST:'other'},{DATABASE_URL:'postgres://postgres:synthetic-only@t19-fixture-postgres:5432/postgres'},{DATABASE_URL:'postgres://supabase_storage_admin:synthetic-only@t19-fixture-postgres:5432/other'}]){
  const r=await execute(override);assert.equal(r.status,1);assert.equal(r.called,null);assert.ok(r.stderr.includes('T19_STORAGE_TENANT_MIGRATIONS_FAILED'));
 }
});
