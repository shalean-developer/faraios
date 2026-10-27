import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIndependentReadOnlyEvidence,evidenceGate} from '../scripts/t19-b02-evidence-runner.mjs';
test('fail closed without an execution-independent read-only approval',async()=>{
 await assert.rejects(evidenceGate({ref:'refs/heads/staging',environment:'staging',project:'xdmfyrsauvqznkloroxg',approval:'EXECUTE',credential:''}),/gate refused/);
});
function snapshot(id,change=false){return {connectionId:String(id),catalogDigest:'a',financialDigest:change?'changed':'b',vaultSecretCount:'0',tableCounts:{'public.business_invoices':'2'}}}
function factory(items){
 let i=0;
 return ()=>{const record=items[i++];return {connect:async()=>{},end:async()=>{},query:async()=>{},record};};
}
test('distinct backend and unchanged fingerprints required',async()=>{
 const results=[snapshot(111),snapshot(222)];let i=0;
 const get=()=>{const v=results[i++];return {connect:async()=>{},end:async()=>{},query:async()=>{},snapshot:v};};
 // Inject deterministic snapshot via pure comparison to avoid a real connection.
 const {assessProtectedState}=await import('../scripts/t19-b02-protected-preflight.mjs');
 assert.equal(assessProtectedState({connectionId:'111',scratchRoles:0,scratchSchemas:0,scratchFunctions:0,catalogDigest:'a',financialDigest:'b',vaultSecretCount:'0'},{connectionId:'222',scratchRoles:0,scratchSchemas:0,scratchFunctions:0,catalogDigest:'a',financialDigest:'b',vaultSecretCount:'0'}),'PROTECTED_STATE_UNCHANGED');
 assert.throws(()=>assessProtectedState({connectionId:'111',scratchRoles:0,scratchSchemas:0,scratchFunctions:0,catalogDigest:'a',financialDigest:'b',vaultSecretCount:'0'},{connectionId:'111',scratchRoles:0,scratchSchemas:0,scratchFunctions:0,catalogDigest:'a',financialDigest:'b',vaultSecretCount:'0'}),/Fresh/);
});
