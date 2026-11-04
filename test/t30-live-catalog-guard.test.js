import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshCatalogSQL,parseFreshCatalog,assertFreshCatalog} from '../scripts/backup-live-catalog.mjs';
const A='a'.repeat(64),B='b'.repeat(64);
const portable=readFileSync(new URL('../scripts/t30-private-restore-catalog.sql',import.meta.url),'utf8');
test('T30 live catalog is read committed, independent of snapshot, and never reads protected table data',()=>{
 const sql=freshCatalogSQL(portable);
 assert.match(sql,/^begin transaction isolation level read committed read only;/);
 assert.match(sql,/set local search_path = '';/);
 assert.match(sql,/jsonb_object_agg\(scope,encode\(extensions.digest/);
 assert.match(sql,/rollback;$/);
 assert.ok(!sql.includes('set transaction snapshot'));
 assert.ok(!sql.includes('pg_export_snapshot'));
 for(const value of ['', 'select 1;',portable.replace('jsonb_object_agg','jsonb_agg')]){
  assert.throws(()=>freshCatalogSQL(value));
 }
});
test('T30 fresh role/schema fingerprint contract rejects malformed or changed values',()=>{
 const read=JSON.stringify({catalog:{application:A,managed:B}});
 const c=parseFreshCatalog(read);
 assert.deepEqual(c,{application:A,managed:B});
 assert.doesNotThrow(()=>assertFreshCatalog(c,{application:A,managed:B}));
 for(const text of ['not json','[]',JSON.stringify({catalog:{application:A}}),JSON.stringify({catalog:{application:A,managed:B,extra:1}}),JSON.stringify({catalog:{application:'bad',managed:B}}),JSON.stringify({other:{application:A,managed:B}})]){
  assert.throws(()=>parseFreshCatalog(text),/BACKUP_LIVE_CATALOG_INVALID/);
 }
 assert.throws(()=>assertFreshCatalog(c,{application:B,managed:B}),/BACKUP_LIVE_CATALOG_CHANGED/);
 assert.throws(()=>assertFreshCatalog(c,{application:A,managed:A}),/BACKUP_LIVE_CATALOG_CHANGED/);
});
