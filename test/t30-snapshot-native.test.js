// Synthetic PostgreSQL 17 only. Never run against hosted or owner databases.
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {spawnSync} from 'node:child_process';
import {openSnapshotKeeper,bindManifestSnapshot} from '../scripts/backup-snapshot.mjs';
import {parseFreshCatalog,assertFreshCatalog} from '../scripts/backup-live-catalog.mjs';

test('T30 synchronized snapshot isolates two readers and pg_dump from later commits',async t=>{
 if(process.env.T30_SYNTHETIC_DATABASE!=='1'){
  t.skip('explicit CI disposable PostgreSQL fixture required');return;
 }
 assert.equal(process.env.PGHOST,'127.0.0.1');
 assert.equal(process.env.PGPORT,'5432');
 assert.equal(process.env.PGUSER,'postgres');
 assert.equal(process.env.PGDATABASE??'postgres','postgres');
 const options={host:'127.0.0.1',port:5432,user:'postgres',database:'postgres',password:process.env.PGPASSWORD,ssl:false};
 const mk=()=>new pg.Client(options);
 const writer=mk();await writer.connect();
 let keeper;
 try{
  await writer.query('CREATE TABLE IF NOT EXISTS public.t30_snapshot_ci_fixture(id integer primary key)');
  await writer.query('TRUNCATE TABLE public.t30_snapshot_ci_fixture');
  await writer.query('INSERT INTO public.t30_snapshot_ci_fixture VALUES (1)');
  keeper=await openSnapshotKeeper({
   host:'127.0.0.1',port:5432,user:'postgres',database:'postgres',
   password:process.env.PGPASSWORD,ca:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----',
   clientFactory:()=>mk()
  });
  keeper.assertAlive();
  await writer.query('INSERT INTO public.t30_snapshot_ci_fixture VALUES (2)');
  const reader=mk();await reader.connect();
  try{
   const script=bindManifestSnapshot('begin transaction isolation level repeatable read read only;\nselect count(*)::integer AS n from public.t30_snapshot_ci_fixture;\ncommit;',keeper.id);
   // Exercise identical SQL import order, not just the token parser.
   for(const query of script.split(';').map(x=>x.trim()).filter(Boolean)){
    const result=await reader.query(query);
    if(query.startsWith('select count(*)'))assert.equal(result.rows[0].n,1);
   }
  }finally{await reader.end();}
  const dump=spawnSync('pg_dump',['--data-only','--quote-all-identifiers','--table=public.t30_snapshot_ci_fixture','--snapshot='+keeper.id],{
    encoding:'utf8',env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres',PGDATABASE:'postgres'},timeout:20000,maxBuffer:1024*1024
  });
  assert.equal(dump.status,0,'synthetic synchronized pg_dump must succeed');
  assert.match(dump.stdout,/^1$/m);
  assert.doesNotMatch(dump.stdout,/^2$/m);
 }finally{
  if(keeper)await keeper.close();
  await writer.query('DROP TABLE IF EXISTS public.t30_snapshot_ci_fixture').catch(()=>{});
  await writer.end();
 }
});

test('T30 read-committed role change is detectable outside an exported snapshot',async t=>{
 if(process.env.T30_SYNTHETIC_DATABASE!=='1'){t.skip('native disposable PG only');return;}
 const db=new pg.Client({host:'127.0.0.1',port:5432,user:'postgres',database:'postgres',password:process.env.PGPASSWORD,ssl:false});
 await db.connect();
 const role='t30_snapshot_ci_login_role';
 const fingerprint=async()=>{
  const q=`SELECT jsonb_build_object('application',
   encode(sha256(convert_to((SELECT rolcanlogin::text FROM pg_roles WHERE rolname='${role}'),'UTF8')),'hex'),
   'managed',repeat('a',64)) AS catalog`;
  return parseFreshCatalog(JSON.stringify((await db.query(q)).rows[0].catalog));
 };
 try{
  await db.query('CREATE ROLE '+role+' NOLOGIN');
  const before=await fingerprint();
  await db.query('ALTER ROLE '+role+' LOGIN');
  const after=await fingerprint();
  assert.notEqual(before.application,after.application);
  assert.throws(()=>assertFreshCatalog(after,before),/BACKUP_LIVE_CATALOG_CHANGED/);
 }finally{
  await db.query('DROP ROLE IF EXISTS '+role).catch(()=>{});
  await db.end();
 }
});

test('T30 native psql -A -t returns a bare JSON cell, not a row wrapper',t=>{
 if(process.env.T30_SYNTHETIC_DATABASE!=='1'){t.skip('native disposable PG only');return;}
 const sql="SELECT jsonb_build_object('application',repeat('a',64),'managed',repeat('b',64)) AS catalog";
 const result=spawnSync('psql',['-X','-w','-A','-t','--set=ON_ERROR_STOP=1','-c',sql],{
  encoding:'utf8',env:{...process.env,PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres',PGDATABASE:'postgres'},timeout:20000,maxBuffer:4096
 });
 assert.equal(result.status,0);
 assert.deepEqual(parseFreshCatalog(result.stdout),{application:'a'.repeat(64),managed:'b'.repeat(64)});
});
