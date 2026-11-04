import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIVATE_BACKUP_TABLES} from '../scripts/backup-private-scope.mjs';
import {DUMPS,SOURCE} from '../scripts/backup-staging.mjs';
import {inspectV3RestoreCandidate,v3RowVerificationSQL} from '../scripts/t30-v3-restore-qualification.mjs';

const H='a'.repeat(64);
const managed='c'.repeat(64),application='b'.repeat(64);
const names=[...Array.from({length:27},(_,i)=>'public.synthetic_'+String(i).padStart(2,'0')),
 ...Array.from({length:3},(_,i)=>'audit.synthetic_'+String(i).padStart(2,'0'))].sort();
const scope={version:3,source:SOURCE,id:'synthetic-t30-v3',
 tables:names,privateTables:[...PRIVATE_BACKUP_TABLES],
 catalog:H,application,managed};
const row=n=>{const [schema,table]=n.split('.');return {schema,table,owner:'postgres',rls:true,rows:0,sha256:H};};
function before(){
 return {database_major:17,
  business_ids:['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'],
  extensions:['btree_gist','pg_stat_statements','pgcrypto','plpgsql','supabase_vault','uuid-ossp'],
  extension_versions:{btree_gist:'1.7',pg_stat_statements:'1.11',pgcrypto:'1.3',plpgsql:'1.0',supabase_vault:'0.3.1','uuid-ossp':'1.1'},
  vault_secrets:0,storage_objects:0,storage_buckets:0,large_objects:0,
  unexpected_schemas:[],catalog_sha256:H,catalog_version:2,
  scope:scope.id,restore_catalog:{application,managed},sequence_state:[],
  tables:[...names,...PRIVATE_BACKUP_TABLES,'auth.users','supabase_migrations.schema_migrations'].map(row)};
}
const archive=()=>({id:'a'.repeat(32),sha256:H,files:[...DUMPS.map(([n])=>n),'manifest.json'].sort()});
const manifest=()=>{const m=before();return {version:1,source:SOURCE,started:'2026-11-04T00:00:00Z',
 finished:'2026-11-04T00:10:00Z',before:m,after:structuredClone(m)};};
const candidate=()=>({profile:structuredClone(scope),archive:archive(),manifest:manifest(),destination:'abcdefghijklmnopqrst'});
const codeOf=f=>{try{f();return null;}catch(e){return e.code??e.message;}};

test('T30 offline V3 candidate describes only reviewed 65 table scope without granting restore',()=>{
 const x=inspectV3RestoreCandidate(candidate());
 assert.deepEqual(x,{source:SOURCE,version:3,applicationTables:65,privateTables:35,
  restore:'NOT_RUN',archiveAuthentication:'NOT_CHECKED',
  destinationVerification:'NOT_RUN',executionAuthorised:false});
 assert.equal(Object.isFrozen(x),true);
});

test('T30 refuses source, old T11 target, malformed and absent target before any access',()=>{
 for(const destination of [SOURCE,'zrlojsvkqipuwkkyfrkn','',null,'other.invalid','X'.repeat(20)]){
  const c=candidate();c.destination=destination;
  assert.equal(codeOf(()=>inspectV3RestoreCandidate(c)),'T30_V3_DESTINATION_NOT_APPROVED');
 }
});

test('T30 rejects altered V3 profile, archive envelope, scope and manifest',()=>{
 const cases=[
  c=>c.profile.version=2,
  c=>c.profile.privateTables.pop(),
  c=>c.profile.tables.pop(),
  c=>c.profile.source='other',
  c=>c.archive.sha256='x',
  c=>c.archive.files.pop(),
  c=>c.archive.files.push('unknown.sql'),
  c=>c.archive.files.reverse(),
  c=>c.manifest.source='other',
  c=>c.manifest.before.tables.find(t=>t.schema==='private_t20').rls=false,
  c=>c.manifest.before.tables.find(t=>t.schema==='private_t21').owner='other',
  c=>c.manifest.before.tables.pop(),
  c=>c.manifest.before.catalog_sha256='b'.repeat(64),
  c=>c.manifest.after.tables.find(t=>t.schema==='private_t22').rows=1,
  c=>c.manifest.after.restore_catalog.application='d'.repeat(64),
  c=>c.manifest.finished='not-a-date',
 ];
 for(const [index,mutate] of cases.entries()){
  const c=candidate();mutate(c);
  assert.notEqual(codeOf(()=>inspectV3RestoreCandidate(c)),null,`invalid fixture case ${index} was accepted`);
 }
});

test('T30 V3 row verification includes each private table and excludes provider-owned history',()=>{
 const sql=v3RowVerificationSQL(scope,before());
 for(const n of PRIVATE_BACKUP_TABLES){
  const [schema,table]=n.split('.');
  assert.ok(sql.includes('FROM "'+schema+'"."'+table+'" t'),n);
 }
 assert.ok(sql.includes('FROM "public"."synthetic_00" t'));
 assert.ok(sql.includes('FROM "auth"."users" t'));
 assert.ok(sql.includes('FROM "supabase_migrations"."schema_migrations" t'), 'migration history remains verified as in T11');
 assert.ok(sql.includes("T30_V3_ROW_MISMATCH"));
 assert.ok(!sql.includes('COMMIT;'));
 assert.ok(!sql.includes('setval('));
 assert.ok(!sql.includes('postgres.zrlojsvkqipuwkkyfrkn'));
});

test('T30 V3 SQL generator rejects missing table or missing RLS',()=>{
 const m=before();m.tables=m.tables.filter(t=>t.schema!=='private_t26');
 assert.equal(codeOf(()=>v3RowVerificationSQL(scope,m)),'T30_V3_SCOPE_INVALID');
 const n=before();n.tables.find(t=>t.schema==='private_t25').rls=false;
 assert.equal(codeOf(()=>v3RowVerificationSQL(scope,n)),'T30_V3_SCOPE_INVALID');
});
