import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE} from '../scripts/backup-staging.mjs';
import {PRIVATE_BACKUP_TABLES} from '../scripts/backup-private-scope.mjs';
import {v3CatalogVerificationSQL,v3SequenceCompletionPlan} from '../scripts/t30-v3-replay-gates.mjs';

const H='a'.repeat(64);
const tables=[...Array.from({length:27},(_,i)=>'public.example_'+i),
 ...Array.from({length:3},(_,i)=>'audit.example_'+i)].sort();
const profile={source:SOURCE,version:3,id:'synthetic-v3-replay',catalog:H,
 application:'b'.repeat(64),managed:'c'.repeat(64),
 tables,privateTables:[...PRIVATE_BACKUP_TABLES]};
const rows=[...tables,...PRIVATE_BACKUP_TABLES,'auth.users','supabase_migrations.schema_migrations']
 .map(n=>{const [schema,table]=n.split('.');return {schema,table,owner:'postgres',rls:true,rows:0,sha256:H};});
const manifest=()=>({scope:profile.id,catalog_sha256:H,
 restore_catalog:{application:profile.application,managed:profile.managed},
 unexpected_schemas:[],sequence_state:[],tables:rows});
const files=()=>[{name:'data.sql',content:''},{name:'migration-data.sql',content:''}];
const failure=fn=>{try{fn();return false;}catch{return true;}};

test('V3 catalog verifier pins portable role and private schema catalog',()=>{
 const sql=v3CatalogVerificationSQL(profile,manifest());
 assert.ok(sql.includes(profile.application));
 assert.ok(sql.includes(profile.managed));
 assert.ok(sql.includes('T30_V3_RESTORE_CATALOG_MISMATCH'));
 assert.ok(sql.includes('private_t26'));
 assert.ok(sql.includes('role_memberships'));
});

test('V3 empty sequence completion is gated and not authorised',()=>{
 const plan=v3SequenceCompletionPlan(profile,manifest(),files());
 assert.equal(plan.sequences,0);
 assert.equal(plan.executionAuthorised,false);
 assert.equal(plan.mustReverifyCommittedRestore,true);
});

test('V3 catalog and sequence plans reject private scope drift',()=>{
 const m=manifest();m.tables=m.tables.filter(t=>t.schema!=='private_t26');
 assert.ok(failure(()=>v3CatalogVerificationSQL(profile,m)));
 assert.ok(failure(()=>v3SequenceCompletionPlan(profile,m,files())));
});

test('V3 sequence plans reject omitted dump members',()=>{
 assert.ok(failure(()=>v3SequenceCompletionPlan(profile,manifest(),[])));
});
