// Inactive T19 SEC-02 adapter: a validated signature is required before any DB RPC call.
// DB connection is injected by a trusted service, never built from request/user credentials.
// NO hosted defaults, network access, real provider calls or key material.
import {createHmac} from 'node:crypto';
import {createCustodyEvidenceVerifier} from './t19-sec02-evidence.js';
const reject = () => Object.assign(new Error('custody_bridge_denied'),{code:'custody_bridge_denied'});
export function createRestrictedEvidenceBridge({sealerPublicKey,providerVerifierPublicKey,db,publicationKey}) {
  if(typeof publicationKey!=='string' || publicationKey.length<32 || !db || typeof db.query!=='function') throw reject();
  const verifier=createCustodyEvidenceVerifier({
    sealerPublicKey,providerVerifierPublicKey,
    consumeNonce:async ({signerFingerprint,purpose,nonce,operation,c1Key,lease})=>{
      // Exactly one restricted SQL function. The DB role must have EXECUTE only.
      // This call is intended to be one authoritative SQL transaction.
      const proof=createHmac('sha256',publicationKey).update([signerFingerprint,purpose,nonce,operation,c1Key,lease].join('\\x1f')).digest('hex');
      const result=await db.query(
        'select evidence_guard.consume_verified($1,$2,$3,$4,$5,$6,$7) as accepted',
        [signerFingerprint,purpose,nonce,operation,c1Key,lease,proof]
      );
      return result?.rows?.length===1 && result.rows[0].accepted===true;
    }
  });
  return Object.freeze({
    verifyAndCommit: ({evidence,signature})=>verifier.verifyAndConsume({evidence,signature})
  });
}
