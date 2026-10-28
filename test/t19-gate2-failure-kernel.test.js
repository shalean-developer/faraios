import test from 'node:test';import assert from 'node:assert/strict';
import {reconcile,bounded,simulateFailure} from '../scripts/t19-gate2-failure-kernel.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32);
const container={Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda',Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:false}};
test('nonce recovery only identifies, never grants removal',()=>{
 const r=reconcile({nonce,containers:[container]});assert.equal(r.action,'MANUAL_RECOVERY_REVIEW');assert.equal('removeAllowed' in r,false);
 for(const containers of [[],[container,container],[{...container,Id:'c'.repeat(64)}]]) {
 const x=reconcile({nonce,recordedId:id,containers});assert.equal(x.action,'QUARANTINE');
 }
});
test('timeouts must use cancellable adapter contract',async()=>{
 await assert.rejects(bounded(()=>{},0,()=>{}),/INVALID_BOUND/);
 const result=await bounded(async()=>42,100,async(fn,ms)=>{assert.equal(ms,100);return fn();});
 assert.equal(result,42);
});
test('each simulated interruption quarantines without mutation',async()=>{
 for(const stage of ['before-create','create-unknown','receipt-write-fail','start-timeout','stop-timeout','remove-unknown']){
 const events=[];const result=await simulateFailure({stage,events});assert.equal(result.executedMutations,0);assert.equal(events.length,1);assert.equal(result.action,'QUARANTINE');
 }
});
