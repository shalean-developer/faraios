import test from 'node:test';import assert from 'node:assert/strict';
import {exerciseDisposableWorkflow,recoverAmbiguousCreate,reviewExactCleanup} from '../scripts/t19-gate2-workflow.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32),image='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const container={Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:image,Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:false}};
test('even forged approval never mutates Docker',async()=>{
 let calls=0;const adapter={create:async()=>{calls++},start:async()=>{calls++},remove:async()=>{calls++}};
 const result=await exerciseDisposableWorkflow({adapter,journal:{},nonce,image,approved:true});
 assert.equal(result.status,'NO_GO');assert.equal(calls,0);
});
test('lost create result recovers exact nonce for manual review only',async()=>{
 const x=await recoverAmbiguousCreate({nonce,adapter:{findByNonce:async()=>[container]}});
 assert.equal(x.status,'IDENTIFIED_FOR_REVIEW');assert.equal(x.cleanupAuthorized,false);
 const y=await recoverAmbiguousCreate({nonce,adapter:{findByNonce:async()=>[container,container]}});
 assert.equal(y.status,'QUARANTINE');
});
test('stopped matching container and receipt cannot auto-delete',async()=>{
 const x=await reviewExactCleanup({receipt:{id,nonce},journal:{read:async()=>({id,nonce})},adapter:{inspect:async()=>container}});
 assert.equal(x.status,'MANUAL_CLEANUP_REVIEW');assert.equal(x.cleanupAuthorized,false);
 const y=await reviewExactCleanup({receipt:{id,nonce},journal:{read:async()=>({id,nonce})},adapter:{inspect:async()=>({...container,State:{Running:true}})}});
 assert.equal(y.status,'QUARANTINE');
});
