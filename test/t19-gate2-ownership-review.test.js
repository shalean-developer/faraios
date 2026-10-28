import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOwnership,startupPrerequisites,disposalPlanReview} from '../scripts/t19-gate2-ownership-review.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32);
const fixture=()=>({receipt:{id,nonce},inventory:[id],container:{
 Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda',
 Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:false}}});
test('identity matching is review-eligible but never permits actual cleanup',()=>{
 const x=inspectOwnership(fixture());
 assert.equal(x.eligibleForSeparateCleanupReview,true);
 assert.equal(x.cleanupAllowed,false);
 assert.equal(disposalPlanReview().removeAllowed,false);
});
test('cleanup fencing denies tampered IDs, labels, stopped state, inventory',()=>{
 for(const mutate of [x=>x.receipt.id='c'.repeat(64),x=>x.container.Config.Image='other',
 x=>x.container.Config.Labels['faraios.t19.run-nonce']='other',
 x=>x.container.State.Running=true,x=>x.inventory.push(id),x=>x.container.Name='/another']) {
  const x=fixture();mutate(x);assert.equal(inspectOwnership(x).eligibleForSeparateCleanupReview,false);
 }
});
test('startup remains denied even when fields are self asserted',()=>{
 assert.equal(startupPrerequisites().startupAllowed,false);
 const x=Object.fromEntries(startupPrerequisites().missing.map(k=>[k,true]));
 assert.equal(startupPrerequisites(x).startupAllowed,false);
});
