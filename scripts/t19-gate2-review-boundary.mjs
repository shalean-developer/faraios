// T19 Gate 2 reviewer-facing authorization boundary.
// A signed receipt alone is never an execution grant. The only permitted
// outcome in the current build is an auditable NO-GO until a qualified
// independent assessor approves key custody and runtime startup.
import {verifyExactRun} from './t19-gate2-authorization.mjs';
import {createHash} from 'node:crypto';
export async function assessAuthorization({approval,scriptBytes,trust,nonceStore,reviewRecord}={}){
 const deny=(reason)=>Object.freeze({status:'NO_GO',authorized:false,reason});
 if(!reviewRecord||reviewRecord.decision!=='PASS'||reviewRecord.independent!==true||
    reviewRecord.headSha!==reviewRecord.approvedHeadSha||
    !/^[a-f0-9]{40}$/.test(reviewRecord.headSha??''))
    return deny('INDEPENDENT_REVIEW_MISSING');
 if(!trust||typeof trust.resolveApprovedPublicKey!=='function')return deny('TRUST_CUSTODY_MISSING');
 const publicKeyPem=await trust.resolveApprovedPublicKey(approval?.receipt);
 if(!publicKeyPem)return deny('TRUST_KEY_UNAVAILABLE');
 const verdict=await verifyExactRun({...approval,scriptBytes,publicKeyPem});
 if(verdict.signatureValid!==true)return deny(verdict.reason);
 if(typeof nonceStore?.consumeOnce!=='function')return deny('SINGLE_USE_LEDGER_MISSING');
 const digest=createHash('sha256').update(scriptBytes).digest('hex');
 if(digest!==approval.receipt.scriptSha256)return deny('EXECUTABLE_DIGEST_CHANGED');
 // Never consume a nonce on the basis of a caller-supplied review record alone.
 // The independent reviewer must install its own authenticated review provider;
 // the current build cannot authenticate reviewRecord.
 return deny('AUTHENTICATED_REVIEW_PROVIDER_NOT_IMPLEMENTED');
}
