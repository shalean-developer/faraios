import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED,assessRunEvidence,proposedInspectionContract,assessSimulatedInspection} from '../scripts/t19-gate2-exact-run.mjs';
test('missing run evidence is explicit and fails closed',()=>{
 const r=assessRunEvidence(REQUIRED);
 assert.equal(r.allowed,false);
 assert.ok(r.missing.includes('ownershipReceipt'));
 assert.ok(r.missing.includes('separate execution approval'));
 const forged=Object.fromEntries(Object.entries(REQUIRED).map(([k,v])=>[k,v==='UNVERIFIED'?'VERIFIED':v]));
 forged.executionApproved=true;
 assert.equal(assessRunEvidence(forged).allowed,false);
});
test('candidate never starts resources',()=>{
 const p=proposedInspectionContract();
 assert.equal(p.runtimeExecution,false);
 assert.equal(p.cleanupExecution,false);
 assert.equal(p.sqlExecution,false);
 assert.equal(assessSimulatedInspection({}).authorized,false);
});
