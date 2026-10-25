import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {bindingKey} from '../src/t19-c1.js';
import {canonicalCustodyEvidence,createCustodyEvidenceVerifier} from '../src/t19-sec02-evidence.js';
const b={business_id:'612be091-b1d7-4911-9c3b-143446a9fe27',environment:'synthetic',provider:'synthetic',
connection_id:'22222222-2222-4222-8222-222222222222',generation:1,organization_id:'synthetic-shalean',credential_version:1};
const sealer=generateKeyPairSync('ed25519'),provider=generateKeyPairSync('ed25519');
const evidence={purpose:'sealed_reference',binding:b,operation:'op-01',lease:'lease-01',reference:'synthetic-ref',nonce:'nonce-01'};
const signEvidence=(e,k)=>sign(null,canonicalCustodyEvidence(e),k.privateKey).toString('base64url');
test('signed, bound sealing evidence requires distinct pinned signer and atomic nonce acceptance',async()=>{
 const seen=new Set();
 const verifier=createCustodyEvidenceVerifier({sealerPublicKey:sealer.publicKey,providerVerifierPublicKey:provider.publicKey,
 consumeNonce:async({purpose,nonce,signerFingerprint})=>{const k=JSON.stringify([purpose,nonce,signerFingerprint]);if(seen.has(k))return false;seen.add(k);return true;}});
 const signature=signEvidence(evidence,sealer);
 await assert.rejects(verifier.verifyAndConsume({evidence:{...evidence,binding:{...b,organization_id:'other-org'}},signature}));
 await assert.rejects(verifier.verifyAndConsume({evidence,signature:signEvidence(evidence,provider)}));
 const accepted=await verifier.verifyAndConsume({evidence,signature});
 assert.equal(bindingKey(accepted.binding),bindingKey(b));
 await assert.rejects(verifier.verifyAndConsume({evidence,signature}));
});
test('provider-result identity and outcome are cryptographically bound',async()=>{
 const verifier=createCustodyEvidenceVerifier({sealerPublicKey:sealer.publicKey,providerVerifierPublicKey:provider.publicKey,
 consumeNonce:async()=>true});
 const result={purpose:'provider_result',binding:b,operation:'op-02',lease:'lease-02',outcome:'uncertain',nonce:'nonce-02'};
 const signature=signEvidence(result,provider);
 await assert.rejects(verifier.verifyAndConsume({evidence:{...result,outcome:'success'},signature}));
 await assert.rejects(verifier.verifyAndConsume({evidence:result,signature:signEvidence(result,sealer)}));
 assert.equal((await verifier.verifyAndConsume({evidence:result,signature})).outcome,'uncertain');
});
test('unknown signer and malformed signature fail closed',async()=>{
 assert.throws(()=>createCustodyEvidenceVerifier({sealerPublicKey:sealer.publicKey,providerVerifierPublicKey:sealer.publicKey,consumeNonce:async()=>true}));
 const verifier=createCustodyEvidenceVerifier({sealerPublicKey:sealer.publicKey,providerVerifierPublicKey:provider.publicKey,consumeNonce:async()=>true});
 await assert.rejects(verifier.verifyAndConsume({evidence,signature:'not-a-signature'}));
});
