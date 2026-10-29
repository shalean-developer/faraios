// Explicit private CI cluster only. Ordinary node discovery never opens a DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {dataMember,LIMITS,catalogSQL} from '../scripts/t19-restore-plan.mjs';
import {verificationSQL,sequenceVerificationSQL} from '../scripts/restore-staging.mjs';
const enabled=!!process.env.T19_RESTORE_NATIVE_URL;
async function fixture(name,fn){
 const url=new URL(process.env.T19_RESTORE_NATIVE_URL);
 assert.equal(url.hostname,'127.0.0.1');assert.equal(url.username,'postgres');assert.equal(url.pathname,'/postgres');assert.ok(/^\d+$/.test(url.port));
 const admin=new Client({connectionString:url.href});await admin.connect();let created=false,db;
 try{
  assert.ok(Number((await admin.query("SHOW server_version_num")).rows[0].server_version_num)>=170000&&Number((await admin.query("SHOW server_version_num")).rows[0].server_version_num)<180000);
  await admin.query('CREATE DATABASE '+name);created=true;url.pathname='/'+name;
  db=new Client({connectionString:url.href});await db.connect();
  const psql=sql=>new Promise((resolve,reject)=>{
   const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('PG')||k.includes('DATABASE_URL'))delete env[k];
   const p=spawn(process.env.T19_PSQL,['-X','-qAt','--no-password','--set=ON_ERROR_STOP=1','--set=VERBOSITY=sqlstate','-h','127.0.0.1','-p',url.port,'-U','postgres','-d',name],{env,stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',b=>out+=b);p.stderr.resume();p.on('error',reject);p.on('close',code=>code===0?resolve(out):reject(Error('NATIVE_SQL_REFUSED')));p.stdin.end(sql);
  });
  await fn(db,psql,url.href);
 }finally{if(db)await db.end();if(created)await admin.query('DROP DATABASE '+name);await admin.end();}
}
test('native PG17 COPY, committed rows, independent verification, deferred sequences and drift refusal',{skip:!enabled},async()=>{
 await fixture('t19_restore_rows_fixture',async(db,psql,url)=>{
  await db.query("CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;CREATE SCHEMA audit;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA supabase_migrations;CREATE TABLE public.recovered_records(id integer PRIMARY KEY,value text);ALTER TABLE public.recovered_records ENABLE ROW LEVEL SECURITY;CREATE TABLE public.business_accounting_connections(enabled boolean);ALTER TABLE public.business_accounting_connections ENABLE ROW LEVEL SECURITY;CREATE TABLE audit.fixture_events(id integer);ALTER TABLE audit.fixture_events ENABLE ROW LEVEL SECURITY;CREATE SEQUENCE public.recovered_records_id_seq OWNED BY public.recovered_records.id;INSERT INTO public.recovered_records VALUES(1,'synthetic'),(2,'row two');");
  await db.query("SET search_path='';SET timezone='UTC';");
  const portable=catalogSQL(await readFile(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8'));
  const catalogs=(await db.query(portable)).rows[0].catalog;
  const tables=[];
  for(const [schema,table] of [['audit','fixture_events'],['public','business_accounting_connections'],['public','recovered_records']]){
   const d=(await db.query(`SELECT count(*)::int AS rows,encode(extensions.digest(coalesce(string_agg(q.hash,'' ORDER BY q.hash),''),'sha256'),'hex') AS sha256 FROM (SELECT encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex') AS hash FROM ${schema}.${table} t) q`)).rows[0];tables.push({schema,table,owner:'postgres',rls:true,...d});
  }
  const scope={id:'synthetic-native-restore',catalog:'1'.repeat(64),...catalogs,tables:tables.map(t=>t.schema+'.'+t.table).sort()};
  const ext=(await db.query('SELECT jsonb_object_agg(extname,extversion) AS versions FROM pg_extension')).rows[0].versions;
  const manifest={before:{scope:scope.id,catalog_sha256:scope.catalog,restore_catalog:catalogs,tables,extension_versions:ext}};
  const verify=verificationSQL(manifest,portable,scope);
  await db.query('TRUNCATE public.recovered_records');
  const data=dataMember('COPY "public"."recovered_records" ("id", "value") FROM stdin;\n1\tsynthetic\n2\trow two\n\\.\n',manifest.before,'data.sql');
  await psql('BEGIN;'+LIMITS+data+'\n'+verify+"COMMIT;SELECT 'COMMITTED';");
  const independent=new Client({connectionString:url});await independent.connect();try{assert.equal((await independent.query('SELECT count(*)::int AS n FROM public.recovered_records')).rows[0].n,2);await independent.query('BEGIN READ ONLY;'+verify+'COMMIT;');}finally{await independent.end();}
  const states=[{schema:'public',sequence:'recovered_records_id_seq',value:'50',isCalled:true}];
  const before=(await db.query('SELECT last_value::text,is_called FROM public.recovered_records_id_seq')).rows[0];assert.deepEqual(before,{last_value:'1',is_called:false});
  await psql('BEGIN;'+LIMITS+verify+"SELECT pg_catalog.setval('public.recovered_records_id_seq',50,true);"+sequenceVerificationSQL(states)+'COMMIT;');
  await psql('BEGIN READ ONLY;'+LIMITS+verify+sequenceVerificationSQL(states)+'COMMIT;');
  await db.query("UPDATE public.recovered_records SET value='changed' WHERE id=1");await assert.rejects(psql('BEGIN READ ONLY;'+LIMITS+verify+'COMMIT;'));
  await db.query("UPDATE public.recovered_records SET value='synthetic' WHERE id=1");
  // A failed transaction does not roll sequence state back; independent check
  // catches it. This is why only a new disposable destination is supported.
  await assert.rejects(psql("BEGIN;SELECT pg_catalog.setval('public.recovered_records_id_seq',99,true);SELECT 1/0;COMMIT;"));
  assert.equal((await db.query('SELECT last_value::text FROM public.recovered_records_id_seq')).rows[0].last_value,'99');await assert.rejects(psql(sequenceVerificationSQL(states)));
 });
});
test('native PG17 recovered RLS both directions, staff/write denials, audit and rollback',{skip:!enabled},async()=>{
 await fixture('t19_restore_rls_fixture',async(db,psql)=>{
  // Roles are cluster-global; this is a dedicated disposable cluster only.
  await db.query("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;GRANT USAGE ON SCHEMA public TO service_role;");
  const files=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql','invoices-draft.sql'];
  for(const file of files)await db.query(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
  const owner='00000000-0000-4000-8000-000000000001',a='0cc3f518-d64e-40c2-8817-bc14d1ef1420',b='612be091-b1d7-4911-9c3b-143446a9fe27';
  await db.query("INSERT INTO auth.users VALUES($1,'owner@example.invalid');",[owner]);
  await db.query("INSERT INTO public.businesses(id,name,industry) VALUES($1,'Synthetic A','cleaning'),($2,'Synthetic B','cleaning')",[a,b]);
  await db.query("INSERT INTO public.business_memberships(business_id,user_id,role) VALUES($1,$3,'owner'),($2,$3,'owner')",[a,b,owner]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);
  for(const [business,org,key] of [[a,'12345001','SYNTHETIC_A'],[b,'12345002','SYNTHETIC_B']])await db.query("INSERT INTO public.business_accounting_connections(business_id,organization_id,api_domain,credential_key,last_actor) VALUES($1,$2,'https://www.zohoapis.com',$3,$4)",[business,org,key,owner]);
  const fingerprint=async()=>{
   const out={};const names=(await db.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','audit','auth') ORDER BY 1,2")).rows;
   for(const t of names)out[t.schemaname+'.'+t.tablename]=(await db.query(`SELECT coalesce(jsonb_agg(q.row ORDER BY q.row::text),'[]') AS rows FROM (SELECT to_jsonb(t) AS row FROM ${t.schemaname}.${t.tablename} t) q`)).rows[0].rows;
   return out;
  };
  const baseline=await fingerprint(),probe=await readFile(new URL('../database/t19-restore-boundaries.sql',import.meta.url),'utf8');
  assert.ok((await psql(probe)).includes('T19_RESTORE_BOUNDARIES_ROLLED_BACK'));assert.deepEqual(await fingerprint(),baseline);
  await db.query('ALTER TABLE public.business_accounting_connections DISABLE ROW LEVEL SECURITY');
  await assert.rejects(psql(probe));await db.query('ALTER TABLE public.business_accounting_connections ENABLE ROW LEVEL SECURITY');assert.deepEqual(await fingerprint(),baseline);
 });
});
