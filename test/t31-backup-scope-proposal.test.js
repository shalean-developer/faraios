import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIVATE_BACKUP_TABLES} from '../scripts/backup-private-scope.mjs';
import {SOURCE} from '../scripts/backup-staging.mjs';
import {validateScope,matchesCurrentScope} from '../scripts/backup-scope.mjs';
import {T31_NEW_PUBLIC_TABLES,T31_NEW_PRIVATE_TABLES,T31_NEW_ROLES,T31_NEW_PRIVATE_SEQUENCES,T31_REVIEWED_FUNCTIONS,T31_BASELINE_BUSINESS_IDS,proposePostT31Scope,validatePostT31Inventory} from '../scripts/t31-backup-scope-proposal.mjs';
const original={version:3,source:SOURCE,id:'owner-controlled-pre-t31',catalog:'a'.repeat(64),application:'b'.repeat(64),managed:'c'.repeat(64),
 tables:['audit.events','audit.fixture', 'public.business_catalogue','public.business_memberships','public.business_settings','public.businesses'],
 privateTables:[...PRIVATE_BACKUP_TABLES]};
const hash={catalog:'d'.repeat(64),application:'e'.repeat(64),managed:'f'.repeat(64)};
function manifest(proposal){
 const all=[...proposal.tables,...proposal.privateTables];
 return {database_major:17,business_ids:[...T31_BASELINE_BUSINESS_IDS],unexpected_schemas:[],sequence_state:[{schema:'auth',sequence:'refresh_tokens_id_seq',last_value:'20'},{schema:'private_t31',sequence:'brand_audit_id_seq',last_value:'2'}],catalog_sha256:hash.catalog,
 restore_catalog:{application:hash.application,managed:hash.managed},
 tables:all.map(name=>{const [schema,table]=name.split('.');return {schema,table,owner:'postgres',rls:true,rows:0,sha256:'1'.repeat(64)};})};
}
test('T31 backup scope requires exact owner V3 and never modifies it',()=>{
 const previous=structuredClone(original);
 const v3=validateScope(original,SOURCE);
 const plan=proposePostT31Scope(previous,SOURCE);
 assert.deepEqual(previous,original);
 assert.equal(plan.activation,'DISABLED');assert.equal(plan.version,4);
 assert.deepEqual(plan.roles,T31_NEW_ROLES);
 assert.deepEqual(plan.tables.filter(x=>x.startsWith('public.t31_')),T31_NEW_PUBLIC_TABLES);
 assert.deepEqual(plan.privateTables.filter(x=>x.startsWith('private_t31.')),T31_NEW_PRIVATE_TABLES);
 assert.equal(plan.tables.length,v3.tables.length+1);
 assert.equal(plan.privateTables.length,PRIVATE_BACKUP_TABLES.length+4);
 assert.deepEqual(T31_NEW_PRIVATE_SEQUENCES,['private_t31.brand_audit_id_seq']);
 assert.throws(()=>validateScope(plan,SOURCE),/PRIVATE_PROFILE_INVALID/);
 assert.throws(()=>proposePostT31Scope({...original,version:2},SOURCE));
 assert.throws(()=>proposePostT31Scope({...original,privateTables:[...PRIVATE_BACKUP_TABLES].slice(1)},SOURCE));
 assert.throws(()=>proposePostT31Scope({...original,tables:[...original.tables,'public.t31_business_branding']},SOURCE),/T31_TABLE_COLLISION/);
});
test('T31 post-migration manifest refuses partial capture, foreign tenants, roles and RLS drift',()=>{
 const proposal=proposePostT31Scope(original,SOURCE),manifestOk=manifest(proposal);
 const inputs={businessIds:[...T31_BASELINE_BUSINESS_IDS],fingerprints:hash,roles:T31_NEW_ROLES.map(name=>({name,canlogin:false,bypassrls:false,createrole:false})),functions:structuredClone(T31_REVIEWED_FUNCTIONS)};
 assert.deepEqual(validatePostT31Inventory(proposal,manifestOk,inputs),{
 review:'POST_T31_INVENTORY_MATCHED',activation:'DISABLED',tables:proposal.tables.length+proposal.privateTables.length,businesses:2
 });
 assert.equal(matchesCurrentScope({...manifestOk,scope:original.id},original),false,'old V3 must not silently accept post-T31 schema');
 for(const mutate of [
  m=>m.tables.pop(),
  m=>m.tables.push({...m.tables[0]}),
  m=>m.tables.find(t=>t.schema==='private_t31').rls=false,
  m=>m.tables.find(t=>t.schema==='private_t31').owner='anon',
  m=>m.tables.find(t=>t.schema==='private_t31').sha256='invalid',
  m=>m.tables.find(t=>t.schema==='private_t31').rows=-1,
  m=>m.tables.push({schema:'private_unknown',table:'sensitive',owner:'postgres',rls:true,rows:0,sha256:'1'.repeat(64)}),
  m=>m.business_ids=['00000000-0000-4000-8000-000000000000',...T31_BASELINE_BUSINESS_IDS],
  m=>m.catalog_sha256='0'.repeat(64),
  m=>m.unexpected_schemas=['private_other'],
  m=>m.sequence_state=m.sequence_state.filter(seq=>seq.schema!=='private_t31'),
  m=>m.sequence_state.push({schema:'private_t31',sequence:'unexpected_seq',last_value:'9'})
 ]){
  const m=structuredClone(manifestOk);mutate(m);
  assert.throws(()=>validatePostT31Inventory(proposal,m,inputs));
 }
 assert.throws(()=>validatePostT31Inventory(proposal,manifestOk,{...inputs,roles:[...inputs.roles].slice(1)}));
 assert.throws(()=>validatePostT31Inventory(proposal,manifestOk,{...inputs,roles:[{...inputs.roles[0],canlogin:true},inputs.roles[1]]}));
 assert.throws(()=>validatePostT31Inventory(proposal,manifestOk,{...inputs,functions:{...inputs.functions,['private_t31.accept_invitation(uuid)']:{owner:'postgres',securityDefiner:true}}}));
 assert.throws(()=>validatePostT31Inventory(proposal,manifestOk,{...inputs,functions:{...inputs.functions,['public.t31_invite_staff(uuid,text,text)']:{owner:'postgres',securityDefiner:true}}}));
 assert.throws(()=>validatePostT31Inventory(proposal,manifestOk,{...inputs,businessIds:[]}));
 assert.throws(()=>validatePostT31Inventory(proposal,manifestOk,{...inputs,fingerprints:{...hash,managed:'0'.repeat(63)}}));
});
console.log('T31_BACKUP_SCOPE_PROPOSAL_DENIALS_PASS');
