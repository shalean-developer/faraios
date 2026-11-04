// Disconnected synthetic PostgreSQL 17 recovery transaction rehearsal.
// Runs only inside the networkless CI fixture. No hosted Supabase, credentials,
// real data, provider calls, or legacy T11 restore changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {PRIVATE_BACKUP_TABLES,PRIVATE_BACKUP_SCHEMAS} from '../scripts/backup-private-scope.mjs';
import {v3RowVerificationSQL} from '../scripts/t30-v3-restore-qualification.mjs';
import {SOURCE} from '../scripts/backup-staging.mjs';

const quote=s=>'"'+s.replaceAll('"','""')+'"';
const publicAudit=[...Array.from({length:27},(_,i)=>'public.t30full_'+String(i).padStart(2,'0')),
 ...Array.from({length:3},(_,i)=>'audit.t30full_'+String(i).padStart(2,'0'))].sort();
const names=[...publicAudit,...PRIVATE_BACKUP_TABLES,'auth.users','supabase_migrations.schema_migrations'];
const profile={version:3,id:'synthetic-full-replay',source:SOURCE,
 catalog:'a'.repeat(64),application:'b'.repeat(64),managed:'c'.repeat(64),
 tables:publicAudit,privateTables:[...PRIVATE_BACKUP_TABLES]};
const businessA='612be091-b1d7-4911-9c3b-143446a9fe27';
const businessB='0cc3f518-d64e-40c2-8817-bc14d1ef1420';
const connect=()=>new pg.Client({host:'127.0.0.1',port:5432,
 user:'postgres',database:'postgres',password:process.env.PGPASSWORD,ssl:false});

test('T30 V3 entire synthetic application-scope transaction verifies data and rolls back all replayed objects',async t=>{
 if(process.env.T30_SYNTHETIC_DATABASE!=='1'){
  t.skip('requires explicit disconnected CI PostgreSQL 17');return;
 }
 assert.equal(process.env.PGHOST,'127.0.0.1');
 assert.equal(process.env.PGPORT,'5432');
 assert.equal(process.env.PGUSER,'postgres');
 assert.equal(process.env.PGDATABASE??'postgres','postgres');
 const client=connect();await client.connect();
 const extraSchemas=['audit','auth','supabase_migrations','extensions',...PRIVATE_BACKUP_SCHEMAS];
 const publicTables=publicAudit.filter(n=>n.startsWith('public.')).map(n=>n.split('.')[1]);
 const before=await client.query('SELECT nspname FROM pg_namespace WHERE nspname=ANY($1::text[])',[extraSchemas]);
 assert.deepEqual(before.rows,[],'synthetic schemas must not preexist');
 for(const table of publicTables){
  const q=await client.query('SELECT to_regclass($1) AS name',['public.'+table]);
  assert.equal(q.rows[0].name,null,'synthetic table must not preexist');
 }
 let begun=false;
 try{
  await client.query('BEGIN');begun=true;
  for(const s of extraSchemas)await client.query('CREATE SCHEMA '+quote(s));
  await client.query("CREATE FUNCTION extensions.digest(bytea,text) RETURNS bytea LANGUAGE sql IMMUTABLE STRICT AS 'SELECT CASE WHEN $2 = ''sha256'' THEN pg_catalog.sha256($1) ELSE NULL END'");
  await client.query("CREATE FUNCTION extensions.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE STRICT AS 'SELECT CASE WHEN $2 = ''sha256'' THEN pg_catalog.sha256(convert_to($1, ''UTF8'')) ELSE NULL END'");
  const manifest={scope:profile.id,catalog_sha256:profile.catalog,
   restore_catalog:{application:profile.application,managed:profile.managed},
   unexpected_schemas:[],tables:[]};
  for(const name of names){
   const [schema,table]=name.split('.');
   const rel=quote(schema)+'.'+quote(table);
   await client.query('CREATE TABLE '+rel+' (id integer PRIMARY KEY, business_id uuid NOT NULL)');
   await client.query('ALTER TABLE '+rel+' ENABLE ROW LEVEL SECURITY');
   // Restore deterministic, noncustomer, synthetic rows as if replaying a data member.
   await client.query('INSERT INTO '+rel+' (id,business_id) VALUES ($1,$2),($3,$4)',
    [1,businessA,2,businessB]);
   const dig=await client.query(`SELECT count(*)::int AS rows,
    encode(extensions.digest(coalesce(string_agg(q.h,'' ORDER BY q.h),''),'sha256'),'hex') AS sha256
    FROM (SELECT encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex') AS h FROM ${rel} t) q`);
   manifest.tables.push({schema,table,owner:'postgres',rls:true,rows:dig.rows[0].rows,sha256:dig.rows[0].sha256});
  }
  const sql=v3RowVerificationSQL(profile,manifest);
  await client.query(sql);
  // An altered restored row fails before the transaction can be committed.
  await client.query('UPDATE "private_t26"."jobs" SET id=3 WHERE id=1');
  await assert.rejects(client.query(sql),/T30_V3_ROW_MISMATCH/);
  // PostgreSQL marks the failed transaction aborted; rollback must remove all DDL/data.
 }finally{
  if(begun)await client.query('ROLLBACK');
  await client.end();
 }
 const verify=connect();await verify.connect();
 try{
  const after=await verify.query('SELECT nspname FROM pg_namespace WHERE nspname=ANY($1::text[])',[extraSchemas]);
  assert.deepEqual(after.rows,[],'rollback must remove synthetic private schemas and digest functions');
  for(const table of publicTables){
   const q=await verify.query('SELECT to_regclass($1) AS name',['public.'+table]);
   assert.equal(q.rows[0].name,null,'rollback must remove public synthetic tables');
  }
 }finally{await verify.end();}
 t.diagnostic('T30_V3_SYNTHETIC_TRANSACTION_ROLLBACK_VERIFIED');
});
