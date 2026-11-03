import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRIVATE_BACKUP_TABLES,PRIVATE_BACKUP_SCHEMAS} from '../scripts/backup-private-scope.mjs';
import {validateScope,matchesCurrentScope,currentManifestSQL} from '../scripts/backup-scope.mjs';
import {validateManifest,assertDataCoverage,SOURCE} from '../scripts/backup-staging.mjs';

const H='a'.repeat(64);
const tables=['audit.example','public.example'];
const profile={
 version:3,source:SOURCE,id:'synthetic-private-schema-v3',
 catalog:H,application:'b'.repeat(64),managed:'c'.repeat(64),
 tables,privateTables:[...PRIVATE_BACKUP_TABLES]
};
const v2={version:2,source:SOURCE,id:'synthetic-old-v2',
 catalog:H,application:'b'.repeat(64),managed:'c'.repeat(64),tables};
const row=name=>{
 const [schema,table]=name.split('.');
 return {schema,table,owner:'postgres',rls:true,rows:0,sha256:H};
};
function manifest(){
 return {
  database_major:17,
  business_ids:['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'],
  extensions:['btree_gist','pg_stat_statements','pgcrypto','plpgsql','supabase_vault','uuid-ossp'],
  extension_versions:{btree_gist:'1.7',pg_stat_statements:'1.11',pgcrypto:'1.3',plpgsql:'1.0',supabase_vault:'0.3.1','uuid-ossp':'1.1'},
  vault_secrets:0,storage_objects:0,storage_buckets:0,large_objects:0,
  unexpected_schemas:[],catalog_sha256:H,catalog_version:2,
  scope:profile.id,restore_catalog:{application:profile.application,managed:profile.managed},
  sequence_state:[],
  tables:[...tables,...PRIVATE_BACKUP_TABLES,'auth.users','supabase_migrations.schema_migrations'].map(row),
 };
}
const copy=t=>'COPY "'+t.schema+'"."'+t.table+'" ("id") FROM stdin;\n\\.\n';
const rls=t=>'ALTER TABLE "'+t.schema+'"."'+t.table+'" ENABLE ROW LEVEL SECURITY;\n';
function dumps(m){
 return [
  {name:'schema.sql',content:m.tables.filter(t=>['public','audit',...PRIVATE_BACKUP_SCHEMAS].includes(t.schema)).map(rls).join('')},
  {name:'data.sql',content:m.tables.filter(t=>t.schema!=='supabase_migrations').map(copy).join('')},
  {name:'migration-data.sql',content:m.tables.filter(t=>t.schema==='supabase_migrations').map(copy).join('')},
 ];
}
test('T30 exact reviewed private inventory has no wildcards, omissions or duplicates',()=>{
 assert.equal(PRIVATE_BACKUP_SCHEMAS.length,7);
 assert.equal(PRIVATE_BACKUP_TABLES.length,35);
 assert.deepEqual([...PRIVATE_BACKUP_TABLES].sort(),PRIVATE_BACKUP_TABLES);
 assert.equal(new Set(PRIVATE_BACKUP_TABLES).size,35);
 assert.ok(PRIVATE_BACKUP_TABLES.every(n=>/^private_t[0-9a-z_]+\.[a-z_]+$/.test(n)));
});
test('T30 private capture requires v3 exact private inventory; legacy v2 remains bounded',()=>{
 assert.deepEqual(validateScope(profile,SOURCE).privateTables,PRIVATE_BACKUP_TABLES);
 assert.doesNotThrow(()=>validateScope(v2,SOURCE));
 for(const mutate of [
  p=>p.privateTables.pop(),
  p=>p.privateTables.push('private_t99.example'),
  p=>p.privateTables.reverse(),
  p=>p.privateTables[0]='private_t20.accounts',
  p=>p.version=2,
 ]){
  const p=structuredClone(profile);mutate(p);
  assert.throws(()=>validateScope(p,SOURCE));
 }
});
test('T30 all 35 private tables must match exact reviewed manifest and retain RLS and owner',()=>{
 const m=manifest();
 assert.equal(matchesCurrentScope(m,profile),true);
 assert.doesNotThrow(()=>validateManifest(m,profile));
 assert.equal(matchesCurrentScope(m,v2),false);
 assert.throws(()=>validateManifest(m,v2));
 for(const mutate of [
  x=>x.tables.pop(),
  x=>x.tables.find(t=>t.schema==='private_t20').rls=false,
  x=>x.tables.find(t=>t.schema==='private_t21').owner='other',
  x=>x.unexpected_schemas=['private_t99'],
  x=>x.tables.push(row('private_t99.new_table')),
 ]){
  const x=structuredClone(m);mutate(x);
  assert.equal(matchesCurrentScope(x,profile),false);
  assert.throws(()=>validateManifest(x,profile));
 }
});
test('T30 private table schema/RLS and row-copy completeness are enforced',()=>{
 const m=manifest(),files=dumps(m);
 assert.doesNotThrow(()=>assertDataCoverage(files,m));
 const missingCopy=structuredClone(files);
 missingCopy[1].content=missingCopy[1].content.replace(copy(row(PRIVATE_BACKUP_TABLES[0])),'');
 assert.throws(()=>assertDataCoverage(missingCopy,m),{code:'DUMP_DATA_COVERAGE_FAILED'});
 const missingRls=structuredClone(files);
 missingRls[0].content=missingRls[0].content.replace(rls(row(PRIVATE_BACKUP_TABLES[1])),'');
 assert.throws(()=>assertDataCoverage(missingRls,m),{code:'DUMP_RLS_COVERAGE_FAILED'});
});
test('T30 source manifest catalogs only reviewed private schemas and all private sequences',()=>{
 const raw=readFileSync(new URL('../scripts/staging-backup-manifest.sql',import.meta.url),'utf8');
 const portable=readFileSync(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8');
 const sql=currentManifestSQL(raw,portable,profile);
 for(const schema of PRIVATE_BACKUP_SCHEMAS){
  assert.ok(raw.includes("'"+schema+"'"),schema+' included in raw manifest');
  assert.ok(portable.includes("'"+schema+"'"),schema+' included in portable app catalog');
  assert.ok(sql.includes("'"+schema+"'"),schema+' included in final generated SQL');
 }
 assert.ok(sql.includes("'sequence_state'"));
 assert.ok(sql.includes("'catalog_version',2"));
 assert.ok(sql.includes("'restore_catalog'"));
 assert.ok(sql.includes("'private_t19_custody'"));
 assert.ok(!sql.includes('${PRIVATE_BACKUP_SCHEMAS'));
});
