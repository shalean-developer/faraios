import test from 'node:test';
import assert from 'node:assert/strict';
import {assessV3QuietWindowEvidence} from '../scripts/t30-quiet-window-evidence.mjs';

const names=['t19_plesk_scheduler','staging_node_web','test_payment_webhooks',
 'direct_supabase_rest_rpc','supabase_auth','backend_and_manual_sql',
 'external_and_unidentified_writers'];
const fixture=()=>({scope:'faraios-staging-v3',evidence:{
 baselineCaptured:false,independentOperator:false,
 controls:Object.fromEntries(names.map(key=>[key,{
  identified:false,reversiblePauseReviewed:false,pauseActive:false,
  independentlyVerified:false
 }])),
 inflightDrained:false,pendingFinancialEventsPreserved:false,
 sourceCatalogStable:false,profileFingerprintStable:false,
 observedNoWrites:false,reversalPrepared:false,externalEffectsReconciled:false
}});
const rejects=fn=>{try{fn();return false;}catch{return true;}};

test('T30 quiet-window assessment is held without real operator observations',()=>{
 const a=assessV3QuietWindowEvidence(fixture());
 assert.equal(a.assessment,'HOLD');
 assert.equal(a.backupAuthorised,false);
 assert.equal(a.actualFreezeVerified,false);
 assert.equal(a.backup,'NOT_RUN');
 assert.ok(a.gaps.includes('supabase_auth:UNIDENTIFIED'));
 assert.ok(a.gaps.includes('test_payment_webhooks:NOT_QUIET'));
});

test('all supplied claims remain unverified and cannot authorize a backup',()=>{
 const f=fixture();
 for(const key of names)Object.keys(f.evidence.controls[key])
  .forEach(k=>f.evidence.controls[key][k]=true);
 for(const key of Object.keys(f.evidence)){
  if(key!=='controls')f.evidence[key]=true;
 }
 const a=assessV3QuietWindowEvidence(f);
 assert.equal(a.assessment,'UNVERIFIED_CLAIMS_COMPLETE');
 assert.equal(a.actualFreezeVerified,false);
 assert.equal(a.backupAuthorised,false);
 assert.equal(a.observedByThisTool,false);
 assert.equal(a.servicesChanged,false);
});

test('unknown writer, missing key, or malformed evidence fails closed',()=>{
 for(const change of [
  f=>delete f.evidence.controls.supabase_auth,
  f=>f.evidence.controls.unknown_worker={identified:true,reversiblePauseReviewed:true,pauseActive:true,independentlyVerified:true},
  f=>f.evidence.controls.test_payment_webhooks.pauseActive='true',
  f=>f.evidence.observedNoWrites='true',
  f=>f.scope='production'
 ]){
  const f=fixture();change(f);
  assert.equal(rejects(()=>assessV3QuietWindowEvidence(f)),true);
 }
});
