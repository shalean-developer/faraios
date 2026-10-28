// T19: independently approved signer trust boundary, review-only.
// The caller may supply a public key resolver only after the security reviewer
// certifies the source and custody. No private key or auto-approval here.
import {createPublicKey,createHash} from 'node:crypto';
export function makePinnedReviewTrust({publicKeyPem,approvedFingerprint}={}){
 if(typeof publicKeyPem!=='string'||!/^[a-f0-9]{64}$/.test(approvedFingerprint??''))throw Error('TRUST_CONFIG_NO_GO');
 const key=createPublicKey(publicKeyPem);
 if(key.asymmetricKeyType!=='ed25519')throw Error('TRUST_KEY_TYPE');
 const fingerprint=createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
 if(fingerprint!==approvedFingerprint)throw Error('TRUST_FINGERPRINT_MISMATCH');
 return Object.freeze({async resolveApprovedPublicKey(){return publicKeyPem;},
  approvedFingerprint:fingerprint,executionAuthorized:false});
}
