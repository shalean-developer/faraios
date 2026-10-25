import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalCustodyEvidence} from '../src/t19-sec02-evidence.js';
import {createRestrictedEvidenceBridge} from '../src/t19-sec02-evidence-bridge.js';
const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
const binding={business_id:'612be091-b1d7-4911-9c3b-143446a9fe27',environment:'synthetic',provider:'synthetic',connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'synthetic-shalean',credential_version:1};
const e={purpose:'provider_result',binding,operation:'operation-1',lease:'lease-1',nonce:'nonce-1',outcome:'uncertain'};
const signature=()=>sign(null,canonicalCustodyEvidence(e),b.privateKey).toString('base64url');
test('forged evidence never reaches injected DB caller',async()=>{
 let count=0;
 const bridge=createRestrictedEvidenceBridge({sealerPublicKey:a.publicKey,providerVerifierPublicKey:b.publicKey,db:{query:async()=>{count++;return {rows:[{accepted:true}]};}}});
 await assert.rejects(bridge.verifyAndCommit({evidence:{...e,outcome:'success'},signature:signature()}));
 await assert.rejects(bridge.verifyAndCommit({evidence:e,signature:sign(null,canonicalCustodyEvidence(e),a.privateKey).toString('base64url')}));
 assert.equal(count,0);
});
test('authenticated evidence invokes restricted parameterized SQL and rejects replay',async()=>{
 const seen=new Set(),calls=[];
 const bridge=createRestrictedEvidenceBridge({sealerPublicKey:a.publicKey,providerVerifierPublicKey:b.publicKey,db:{query:async(sql,params)=>{
  calls.push({sql,params});
  const k=JSON.stringify(params.slice(0,3));
  if(seen.has(k))return {rows:[{accepted:false}]};
  seen.add(k);return {rows:[{accepted:true}]};
 }}});
 const verified=await bridge.verifyAndCommit({evidence:e,signature:signature()});
 assert.equal(verified.operation,e.operation);
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/^select evidence_guard\.consume_verified\(\$1,\$2,\$3,\$4,\$5,\$6\)/);
 assert.equal(calls[0].params[3],'operation-1');
 assert.equal(calls[0].params[5],'lease-1');
 assert.match(calls[0].params[4],/synthetic-shalean/);
 await assert.rejects(bridge.verifyAndCommit({evidence:e,signature:signature()}));
 assert.equal(calls.length,2);
});
test('database exception fails closed',async()=>{
 const bridge=createRestrictedEvidenceBridge({sealerPublicKey:a.publicKey,providerVerifierPublicKey:b.publicKey,db:{query:async()=>{throw new Error('synthetic-db-unavailable');}}});
 await assert.rejects(bridge.verifyAndCommit({evidence:e,signature:signature()}));
});
