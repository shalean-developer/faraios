// T19 SEC-02: inactive verification boundary. No private keys, secrets, provider calls or env reads.
// A signed receipt proves only that the configured signer signed these bytes;
// it does not establish that Zoho itself supplied the underlying provider outcome.
import {createPublicKey, verify as verifySignature} from 'node:crypto';
import {credentialBinding, bindingKey} from './t19-c1.js';
const fail = () => Object.assign(new Error('untrusted_custody_evidence'),{code:'untrusted_custody_evidence'});
const allowed = ['success','invalid_grant','uncertain'];
export function canonicalCustodyEvidence({purpose,binding,operation,lease,reference,outcome,nonce}) {
  if (!['sealed_reference','provider_result'].includes(purpose) ||
      typeof operation!=='string' || !operation || typeof lease!=='string' || !lease ||
      typeof nonce!=='string' || !nonce ||
      (purpose==='sealed_reference' && (typeof reference!=='string' || !reference)) ||
      (purpose==='provider_result' && !allowed.includes(outcome))) throw fail();
  const b=credentialBinding(binding);
  return Buffer.from(JSON.stringify(['faraios-sec02-evidence-v1',purpose,bindingKey(b),operation,lease,
    purpose==='sealed_reference'?reference:null,purpose==='provider_result'?outcome:null,nonce]),'utf8');
}
export function createCustodyEvidenceVerifier({sealerPublicKey,providerVerifierPublicKey,consumeNonce}) {
  if(typeof consumeNonce!=='function') throw fail();
  const keys=[sealerPublicKey,providerVerifierPublicKey].map(k=>{
    try {const p=createPublicKey(k);if(p.asymmetricKeyType!=='ed25519') throw fail();return p;}catch{throw fail();}
  });
  if(keys[0].export({type:'spki',format:'der'}).equals(keys[1].export({type:'spki',format:'der'}))) throw fail();
  return Object.freeze({
    async verifyAndConsume({evidence,signature}) {
      if(!evidence || typeof signature!=='string' || !/^[A-Za-z0-9_-]{86}$/.test(signature)) throw fail();
      const message=canonicalCustodyEvidence(evidence), index=evidence.purpose==='sealed_reference'?0:1;
      const sig=Buffer.from(signature,'base64url');
      if(sig.length!==64 || !verifySignature(null,message,keys[index],sig)) throw fail();
      // Must be a durable, atomic insert-if-absent keyed by purpose/signing-key/nonce.
      // Caller must implement a transactional DB boundary, NEVER in-memory Set in deployment.
      const accepted=await consumeNonce({purpose:evidence.purpose,nonce:evidence.nonce,
        signerFingerprint:keys[index].export({type:'spki',format:'der'}).toString('base64url')});
      if(accepted!==true) throw fail();
      return Object.freeze({purpose:evidence.purpose,binding:credentialBinding(evidence.binding),
        operation:evidence.operation,lease:evidence.lease,reference:evidence.reference??null,outcome:evidence.outcome??null});
    }
  });
}
