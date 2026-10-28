import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {reviewExactRun,assessInterruptedRun} from '../scripts/t19-gate2-run-integration.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const scriptBytes=Buffer.from('reviewed script');
const receipt={version:1,scriptSha256:createHash('sha256').update(scriptBytes).digest('hex'),
 image:'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda',containerName:'faraios-t19-managed-qa',
 nonce:'b'.repeat(32),expiresAt:100000,scope:'local-disposable-postgres-startup-only'};
const canonical=JSON.stringify(Object.fromEntries(Object.keys(receipt).sort().map(k=>[k,receipt[k]])));
const approval={receipt,signature:sign(null,Buffer.from(canonical),privateKey).toString('base64'),
 publicKeyPem:publicKey.export({format:'pem',type:'spki'}),now:90000};
test('signed approval can trigger bounded read-only checks but never startup',async()=>{
 const seen=[];const docker=async a=>{seen.push(a);return a[0]==='image'?receipt.image:''};
 const x=await reviewExactRun({approval,docker,scriptBytes});
 assert.equal(x.status,'NO_GO');assert.equal(x.reason,'SIGNED_BUT_NOT_CONSUMABLE');
 assert.equal(x.startAllowed,false);assert.equal(seen.length,2);
});
test('invalid approval cannot query Docker',async()=>{
 let calls=0;const x=await reviewExactRun({approval:{...approval,signature:'invalid'},docker:async()=>{calls++;},scriptBytes});
 assert.equal(x.status,'NO_GO');assert.equal(calls,0);
});
test('interrupt reconciliation never authorizes cleanup',()=>{
 const x=assessInterruptedRun({nonce:'b'.repeat(32),containers:[]});
 assert.equal(x.cleanupAllowed,false);assert.equal(x.action,'QUARANTINE');
});
