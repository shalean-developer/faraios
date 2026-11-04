import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIVATE_BACKUP_TABLES} from '../scripts/backup-private-scope.mjs';
import {DUMPS,SOURCE,CLI,CLIENT_IMAGE,sealBackup,sha256} from '../scripts/backup-staging.mjs';
import {qualifySealedV3Offline} from '../scripts/t30-v3-restore-qualification.mjs';

const HASH='a'.repeat(64);
const publicAudit=[...Array.from({length:27},(_,i)=>'public.qa_'+String(i).padStart(2,'0')),
 ...Array.from({length:3},(_,i)=>'audit.qa_'+String(i).padStart(2,'0'))].sort();
const profile=()=>({version:3,source:SOURCE,id:'synthetic-sealed-v3',tables:publicAudit,
 privateTables:[...PRIVATE_BACKUP_TABLES],catalog:HASH,
 application:'b'.repeat(64),managed:'c'.repeat(64)});
const row=name=>{const [schema,table]=name.split('.');return {schema,table,owner:'postgres',rls:true,rows:0,sha256:HASH};};
const original=()=>{
 const p=profile();
 return {database_major:17,
  business_ids:['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'],
  extensions:['btree_gist','pg_stat_statements','pgcrypto','plpgsql','supabase_vault','uuid-ossp'],
  extension_versions:{btree_gist:'1.7',pg_stat_statements:'1.11',pgcrypto:'1.3',plpgsql:'1.0',supabase_vault:'0.3.1','uuid-ossp':'1.1'},
  vault_secrets:0,storage_objects:0,storage_buckets:0,large_objects:0,unexpected_schemas:[],
  catalog_sha256:p.catalog,catalog_version:2,scope:p.id,
  restore_catalog:{application:p.application,managed:p.managed},sequence_state:[],
  tables:[...publicAudit,...PRIVATE_BACKUP_TABLES,'auth.users','supabase_migrations.schema_migrations'].map(row)};
};
const quote=s=>'"'+s+'"';
const copy=t=>'COPY '+quote(t.schema)+'.'+quote(t.table)+' ("id") FROM stdin;\n\\.\n';
const banner=name=>{
 const base=name==='roles.sql'?'-- PostgreSQL database cluster dump':'-- PostgreSQL database dump';
 return [base,base+' complete'];
};
function build(mutate=()=>{}){
 const m=original(),manifest={version:1,source:SOURCE,filterSource:'supabase/cli@'+CLI,
  clientImage:CLIENT_IMAGE,started:'2026-11-04T10:00:00Z',
  finished:'2026-11-04T10:02:00Z',before:m,after:structuredClone(m)};
 mutate(manifest);
 const files=DUMPS.map(([name])=>{
  const [start,end]=banner(name);
  let part='';
  if(name==='schema.sql')part=m.tables.filter(t=>publicAudit.includes(t.schema+'.'+t.table)||
   PRIVATE_BACKUP_TABLES.includes(t.schema+'.'+t.table)).map(t=>
     'ALTER TABLE '+quote(t.schema)+'.'+quote(t.table)+' ENABLE ROW LEVEL SECURITY;\n').join('');
  if(name==='data.sql')part=m.tables.filter(t=>t.schema!=='supabase_migrations')
   .map(copy).join('');
  if(name==='migration-data.sql')part=m.tables.filter(t=>t.schema==='supabase_migrations').map(copy).join('');
  const content=start+'\n'+part+end+'\n';
  return {name,content,sha256:sha256(content)};
 });
 const manifestText=JSON.stringify(manifest);
 files.push({name:'manifest.json',content:manifestText,sha256:sha256(manifestText)});
 const key=Buffer.alloc(32,42),id='a'.repeat(32);
 const bytes=sealBackup({source:SOURCE,files},key,id);
 return {bytes,key,profile:profile(),
  pins:{archiveId:id,archiveSha256:sha256(bytes),destination:'abcdefghijklmnopqrst',
    source:SOURCE,importEnabled:false}};
}
const outcome=fn=>{try{fn();return null;}catch(e){return e.code||e.message;}};

test('T30 authenticated synthetic V3 ciphertext remains offline and cannot grant execution',()=>{
 const result=qualifySealedV3Offline(build());
 assert.equal(result.archiveAuthentication,'PASSED');
 assert.equal(result.applicationTables,65);
 assert.equal(result.privateTables,35);
 assert.equal(result.restore,'NOT_RUN');
 assert.equal(result.destinationVerification,'NOT_RUN');
 assert.equal(result.executionAuthorised,false);
});

test('T30 refuses altered ciphertext, key, pins, original projects and import enablement',()=>{
 const mutations=[
  x=>{x.bytes=Buffer.from(x.bytes);x.bytes[x.bytes.length-10]^=1;},
  x=>{x.key=Buffer.alloc(32,1);},
  x=>{x.pins.archiveSha256='0'.repeat(64);},
  x=>{x.pins.archiveId='0'.repeat(32);},
  x=>{x.pins.destination=SOURCE;},
  x=>{x.pins.destination='zrlojsvkqipuwkkyfrkn';},
  x=>{x.pins.importEnabled=true;},
  x=>{x.pins.source='another';},
  x=>{x.pins.extra='unreviewed';}
 ];
 for(const [i,mutate] of mutations.entries()){
  const x=build();mutate(x);
  assert.notEqual(outcome(()=>qualifySealedV3Offline(x)),null,'mutation '+i+' must fail');
 }
});

test('T30 rejects authenticated archive whose source manifest disagrees with V3 profile',()=>{
 const x=build(m=>{m.after.tables.find(t=>t.schema==='private_t20').rows=1;});
 assert.equal(outcome(()=>qualifySealedV3Offline(x)),'T30_V3_ARCHIVE_AUTHENTICATION_FAILED');
});
