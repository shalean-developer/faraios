import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {WORKING_DAYS_SOURCE_DEF,WORKING_DAYS_REPLAY_DEF,WORKING_DAYS_CHECK,RECONSTRUCT_WORKING_DAYS_SQL} from '../scripts/restore-constraint.mjs';

const tableSQL=definition=>`CREATE TABLE public.business_settings(id int,working_days smallint[] NOT NULL,CONSTRAINT business_settings_working_days_check ${definition});`;
const metadataSQL="SELECT pg_get_constraintdef(oid) AS definition,convalidated,condeferrable,condeferred,connoinherit,conislocal,coninhcount,conparentid::text,conkey,obj_description(oid,'pg_constraint') AS comment FROM pg_constraint WHERE conrelid='public.business_settings'::regclass AND conname='business_settings_working_days_check'";

test('original BETWEEN parse tree is reconstructed exactly after native-style deparse/reparse',async()=>{
 const db=new PGlite();
 try{
  await db.exec(tableSQL(WORKING_DAYS_CHECK));
  const original=(await db.query(metadataSQL)).rows;
  assert.equal(original[0].definition,WORKING_DAYS_SOURCE_DEF);
  await db.exec('DROP TABLE public.business_settings;'+tableSQL(WORKING_DAYS_SOURCE_DEF));
  const replay=(await db.query(metadataSQL)).rows;
  assert.equal(replay[0].definition,WORKING_DAYS_REPLAY_DEF);
  await db.exec('BEGIN;'+RECONSTRUCT_WORKING_DAYS_SQL);
  assert.deepEqual((await db.query(metadataSQL)).rows,original);
  await db.exec('ROLLBACK;');
  assert.deepEqual((await db.query(metadataSQL)).rows,replay);
  await db.exec(RECONSTRUCT_WORKING_DAYS_SQL+RECONSTRUCT_WORKING_DAYS_SQL);
  assert.deepEqual((await db.query(metadataSQL)).rows,original);
 }finally{await db.close();}
});

test('reconstruction refuses unknown definitions, flags, comments, nonempty or inherited tables',async()=>{
 const db=new PGlite();
 try{
  await db.exec(tableSQL(WORKING_DAYS_SOURCE_DEF));
  const baseline=(await db.query(metadataSQL)).rows;
  for(const mutation of [
   'ALTER TABLE public.business_settings DROP CONSTRAINT business_settings_working_days_check;',
   'ALTER TABLE public.business_settings DROP CONSTRAINT business_settings_working_days_check;ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_working_days_check CHECK(cardinality(working_days)>0);',
   'ALTER TABLE public.business_settings DROP CONSTRAINT business_settings_working_days_check;ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_working_days_check '+WORKING_DAYS_CHECK+' NOT VALID;',
   "COMMENT ON CONSTRAINT business_settings_working_days_check ON public.business_settings IS 'metadata must survive';",
   'INSERT INTO public.business_settings VALUES(1,ARRAY[1]::smallint[]);',
   'CREATE TABLE public.child() INHERITS(public.business_settings);',
   'CREATE ROLE other_owner;ALTER TABLE public.business_settings OWNER TO other_owner;'
  ]){
   await db.exec('BEGIN;'+mutation);
   await assert.rejects(db.exec(RECONSTRUCT_WORKING_DAYS_SQL),/RESTORE_CHECK_RECONSTRUCTION_REFUSED/);
   await db.exec('ROLLBACK;');
   assert.deepEqual((await db.query(metadataSQL)).rows,baseline);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM public.business_settings')).rows[0].n,0);
  }
 }finally{await db.close();}
});

test('original and replay working-days checks accept and reject the same boundary values',async()=>{
 const db=new PGlite();
 try{
  await db.exec(tableSQL(WORKING_DAYS_CHECK));
  const cases=[[[],false],[[0],true],[[0,1,2,3,4,5,6],true],[[-1],false],[[7],false],[[0,0,0,0,0,0,0,0],false],[[1,1],true],[[null],false]];
  for(const definition of [WORKING_DAYS_SOURCE_DEF,WORKING_DAYS_CHECK]){
   await db.exec('ALTER TABLE public.business_settings DROP CONSTRAINT business_settings_working_days_check;ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_working_days_check '+definition+';');
   for(const [days,accepted] of cases){
    await db.exec('BEGIN;');
    const inserted=db.query('INSERT INTO public.business_settings VALUES(1,$1::smallint[])',[days]);
    if(accepted)await inserted;else await assert.rejects(inserted,/business_settings_working_days_check/);
    await db.exec('ROLLBACK;');
   }
  }
 }finally{await db.close();}
});
