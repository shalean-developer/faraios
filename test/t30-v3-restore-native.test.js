// T30: disconnected PostgreSQL 17 test only, using the existing CI fixture.
// No hosted connections, data exports, restore replay or provider traffic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {PRIVATE_BACKUP_TABLES,PRIVATE_BACKUP_SCHEMAS} from '../scripts/backup-private-scope.mjs';
import {v3RowVerificationSQL} from '../scripts/t30-v3-restore-qualification.mjs';
import {v3SequenceCompletionPlan,v3CatalogVerificationSQL} from '../scripts/t30-v3-replay-gates.mjs';
import {SOURCE} from '../scripts/backup-staging.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const empty=sha('');
const publicAudit=[...Array.from({length:27},(_,i)=>'public.t30v3qa_'+String(i).padStart(2,'0')),
 ...Array.from({length:3},(_,i)=>'audit.t30v3qa_'+String(i).padStart(2,'0'))].sort();
const scope={version:3,source:SOURCE,id:'synthetic-v3-native',
 catalog:'a'.repeat(64),application:'b'.repeat(64),managed:'c'.repeat(64),
 tables:publicAudit,privateTables:[...PRIVATE_BACKUP_TABLES]};
const all=[...publicAudit,...PRIVATE_BACKUP_TABLES,'auth.users','supabase_migrations.schema_migrations'];
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const rows=all.map(name=>{const [schema,table]=name.split('.');return {schema,table,
 owner:'postgres',rls:true,rows:0,sha256:empty};});
const manifest={scope:scope.id,catalog_sha256:scope.catalog,
 restore_catalog:{application:scope.application,managed:scope.managed},
 unexpected_schemas:[],tables:rows};

test('T30 native 17: generated private-row checks pass empty synthetic tables, reject drift, and rollback',async t=>{
 if(process.env.T30_SYNTHETIC_DATABASE!=='1'){
  t.skip('requires explicit disconnected disposable CI PostgreSQL 17 fixture');return;
 }
 assert.equal(process.env.PGHOST,'127.0.0.1');
 assert.equal(process.env.PGPORT,'5432');
 assert.equal(process.env.PGUSER,'postgres');
 const client=new pg.Client({host:'127.0.0.1',port:5432,user:'postgres',
  database:'postgres',password:process.env.PGPASSWORD,ssl:false});
 await client.connect();
 const namespaces=['audit','auth','supabase_migrations',...PRIVATE_BACKUP_SCHEMAS];
 // Do not change or drop pre-existing fixture schemas, even in CI.
 const created=[];
 try{
  const existing=(await client.query("SELECT nspname FROM pg_namespace WHERE nspname=ANY($1::text[])",[namespaces])).rows.map(r=>r.nspname);
  for(const ns of namespaces){
   if(existing.includes(ns))throw Error('T30_NATIVE_SCHEMA_ALREADY_PRESENT');
   await client.query('CREATE SCHEMA '+quote(ns));
   created.push(ns);
  }
  // Use PostgreSQL 17's built-in SHA-256 to avoid installing persistent
  // pgcrypto extension state into the shared disposable CI cluster. The
  // following T19 native recovery test requires an extension-free baseline.
  await client.query('CREATE SCHEMA extensions');
  created.push('extensions');
  // Reproduce only the exact digest algorithm used by this synthetic fixture.
  await client.query("CREATE FUNCTION extensions.digest(bytea,text) RETURNS bytea LANGUAGE sql IMMUTABLE STRICT AS 'SELECT CASE WHEN $2 = ''sha256'' THEN pg_catalog.sha256($1) ELSE NULL END'");
  await client.query("CREATE FUNCTION extensions.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE STRICT AS 'SELECT CASE WHEN $2 = ''sha256'' THEN pg_catalog.sha256(convert_to($1, ''UTF8'')) ELSE NULL END'");
  const createdPublic=[];
  for(const name of all){
   const [ns,table]=name.split('.');
   await client.query('CREATE TABLE '+quote(ns)+'.'+quote(table)+'(id integer)');
   if(ns==='public')createdPublic.push(table);
  }
  const check=v3RowVerificationSQL(scope,manifest);
  // Use the actual V3 portable role/ACL/security catalog projection.
  // All capture hashes in this disposable fixture are deliberately synthetic,
  // so SQL must run and refuse the mismatched catalog.
  const catalog=v3CatalogVerificationSQL(scope,manifest);
  await assert.rejects(client.query(catalog),/T30_V3_RESTORE_CATALOG_MISMATCH/);
  await client.query('BEGIN READ ONLY');
  await client.query(check);
  await client.query('ROLLBACK');
  // One extra row must make the same V3 verification SQL fail, without
  // persisting any mutation: transaction always rolls back.
  await client.query('BEGIN');
  await client.query('INSERT INTO "private_t26"."jobs"(id) VALUES (1)');
  await assert.rejects(client.query(check),/T30_V3_ROW_MISMATCH/);
  await client.query('ROLLBACK');
  const count=await client.query('SELECT count(*)::int AS n FROM "private_t26"."jobs"');
  assert.equal(count.rows[0].n,0);
  t.diagnostic('T30_V3_NATIVE_ROWS_AND_ROLLBACK_PASS');
 }finally{
  await client.query('ROLLBACK').catch(()=>{});
  for(const name of publicAudit.filter(x=>x.startsWith('public.')).map(x=>x.split('.')[1])){
   await client.query('DROP TABLE IF EXISTS public.'+quote(name)).catch(()=>{});
  }
  for(const ns of created.reverse())await client.query('DROP SCHEMA IF EXISTS '+quote(ns)+' CASCADE').catch(()=>{});
  await client.end();
 }
});

test('T30 native PostgreSQL 17 guarded sequence completion detects altered value',async t=>{
 if(process.env.T30_SYNTHETIC_DATABASE!=='1'){
  t.skip('disposable disconnected PostgreSQL only');return;
 }
 assert.equal(process.env.PGHOST,'127.0.0.1');
 assert.equal(process.env.PGPORT,'5432');
 assert.equal(process.env.PGUSER,'postgres');
 const db=new pg.Client({host:'127.0.0.1',port:5432,user:'postgres',
  database:'postgres',password:process.env.PGPASSWORD,ssl:false});
 await db.connect();
 const seq='t30v3_qa_sequence';
 try{
  const preexisting=await db.query('SELECT to_regclass($1) AS relation',['public.'+seq]);
  assert.equal(preexisting.rows[0].relation,null);
  await db.query('CREATE SEQUENCE public.'+quote(seq));
  const scopedManifest={...manifest,sequence_state:[{schema:'public',sequence:seq,last_value:'2'}]};
  const sequenceCommand="SELECT pg_catalog.setval('"+'"public"."'+seq+'"'+"', 2, true);";
  const plan=v3SequenceCompletionPlan(scope,scopedManifest,[
   {name:'data.sql',content:sequenceCommand},
   {name:'migration-data.sql',content:''}
  ]);
  assert.equal(plan.executionAuthorised,false);
  assert.equal(plan.mustReverifyCommittedRestore,true);
  await db.query(plan.completionSQL);
  await db.query(plan.verificationSQL);
  await db.query('SELECT pg_catalog.setval($1,3,true)',['public.'+seq]);
  await assert.rejects(db.query(plan.verificationSQL),/T30_V3_SEQUENCE_STATE_MISMATCH/);
  t.diagnostic('T30_V3_SEQUENCE_GUARD_NATIVE_PASS');
 } finally {
  await db.query('DROP SEQUENCE IF EXISTS public.'+quote(seq)).catch(()=>{});
  await db.end();
 }
});
