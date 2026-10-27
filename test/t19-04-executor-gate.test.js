import test from 'node:test';
import assert from 'node:assert/strict';
import {precreateDecision,cleanupDecision,proposedPlan} from '../scripts/t19-04-executor-gate.mjs';
test('no condition can authorize a create without signed receipt implementation',()=>{
 for(const args of [{},{existingNames:['faraios-t19-managed-qa']},{imageVerified:true,resourcesVerified:true,ownerApproved:true}])
  assert.equal(precreateDecision(args).allowed,false);
 assert.equal(proposedPlan().executionAllowed,false);
});
test('cleanup is denied even for matching synthetic identity',()=>{
 const id='a'.repeat(64),nonce='b'.repeat(32);
 const fixture={createdContainerId:id,approvedContainerId:id,runNonce:nonce,inspectedContainer:{
  Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda',
  Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:false}}};
 assert.equal(cleanupDecision(fixture).allowed,false);
 for(const change of [x=>x.approvedContainerId='c'.repeat(64),x=>x.inspectedContainer.State.Running=true,
 x=>x.inspectedContainer.Config.Labels['faraios.t19.run-nonce']='wrong']){
  const altered=structuredClone(fixture);change(altered);
  assert.equal(cleanupDecision(altered).reason,'OWNERSHIP_OR_STOP_STATE_NOT_PROVEN');
 }
});
