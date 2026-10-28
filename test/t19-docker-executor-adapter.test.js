import test from 'node:test';import assert from 'node:assert/strict';
import {createReadOnlyAdapter,interruptionDecision,executorReview} from '../scripts/t19-docker-executor-adapter.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32),image='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const inspect={Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:image,Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:false}};
test('only exact-ID inspection and inventory are admitted',async()=>{
 const seen=[];const a=createReadOnlyAdapter(async args=>{seen.push(args);return args[1]==='inspect'?JSON.stringify(inspect):id+'\n';});
 const r=await a.verifyReceipt({id,nonce});assert.equal(r.reviewEligible,true);assert.equal(r.allowed,false);
 assert.deepEqual(seen[0],['container','inspect',id,'--format','{{json .}}']);
 assert.deepEqual(seen[1],['container','ls','--all','--no-trunc','--format','{{.ID}}']);
});
test('mutation methods always deny without calling adapter',async()=>{
 let calls=0;const a=createReadOnlyAdapter(async()=>{calls++;return '';});
 for(const x of ['create','start','stop','remove'])await assert.rejects(a[x](),/EXECUTION_NO_GO/);
 assert.equal(calls,0);assert.equal(executorReview.cleanupAllowed,false);
});
test('interrupted run never auto-removes: receipt loss, unknown state, collision or matching',()=>{
 assert.equal(interruptionDecision().action,'QUARANTINE');
 assert.equal(interruptionDecision({receipt:{id,nonce}}).action,'QUARANTINE');
 assert.equal(interruptionDecision({receipt:{id,nonce},inspect,inventory:[id]}).action,'MANUAL_CLEANUP_REVIEW');
 assert.equal(interruptionDecision({receipt:{id,nonce},inspect,inventory:[id,id]}).action,'QUARANTINE');
});
