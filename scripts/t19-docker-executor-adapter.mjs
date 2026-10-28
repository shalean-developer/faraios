// T19 operational adapter (dependency-injected, explicitly NOT wired to local Docker).
// All mutating methods are hard-disabled until an independently reviewed signed run gate exists.
import {inspectOwnership} from './t19-gate2-ownership-review.mjs';
import {correctedCandidate} from './t19-gate2-corrected-candidate.mjs';
export const NO_GO='EXECUTION_NO_GO';
const ID=/^[a-f0-9]{64}$/,NONCE=/^[a-f0-9]{32}$/;
function exactId(x){if(!ID.test(x??''))throw Error('INVALID_CONTAINER_ID');return x;}
export function createReadOnlyAdapter(docker){
 if(typeof docker!=='function')throw Error('DOCKER_ADAPTER_REQUIRED');
 return Object.freeze({
  async inspect(id){return JSON.parse(await docker(['container','inspect',exactId(id),'--format','{{json .}}']));},
  async inventory(){const v=await docker(['container','ls','--all','--no-trunc','--format','{{.ID}}']);
   if(typeof v!=='string')throw Error('BAD_INVENTORY');
   const ids=v.split(/\r?\n/).filter(Boolean);
   if(ids.some(x=>!ID.test(x)))throw Error('INVALID_INVENTORY_ID');
   return ids;
  },
  async verifyReceipt(receipt){
   if(!ID.test(receipt?.id??'')||!NONCE.test(receipt?.nonce??''))return {allowed:false,reason:'BAD_RECEIPT'};
   const [container,inventory]=await Promise.all([this.inspect(receipt.id),this.inventory()]);
   const r=inspectOwnership({receipt,container,inventory});
   return {allowed:false,reviewEligible:r.eligibleForSeparateCleanupReview,
    reason:r.status,failures:r.failures};
  },
  async create(){throw Error(NO_GO);},
  async start(){throw Error(NO_GO);},
  async stop(){throw Error(NO_GO);},
  async remove(){throw Error(NO_GO);}
 });
}
export function interruptionDecision({receipt,inspect,inventory}={}){
 if(!ID.test(receipt?.id??'')||!NONCE.test(receipt?.nonce??''))return {allowed:false,action:'QUARANTINE',reason:'RECEIPT_MISSING'};
 if(!inspect||!Array.isArray(inventory))return {allowed:false,action:'QUARANTINE',reason:'UNKNOWN_DOCKER_STATE'};
 const r=inspectOwnership({receipt,container:inspect,inventory});
 return {allowed:false,action:r.eligibleForSeparateCleanupReview?'MANUAL_CLEANUP_REVIEW':'QUARANTINE',
  reason:r.eligibleForSeparateCleanupReview?'OWNERSHIP_VERIFIED_BUT_EXECUTOR_DISABLED':r.failures.join(',')};
}
export const executorReview=Object.freeze({image:correctedCandidate.image,localDockerExecution:false,
 startupAllowed:false,cleanupAllowed:false,receiptPersistence:'NOT_IMPLEMENTED',
 atomicReceiptWrite:'NOT_IMPLEMENTED',interruptRecovery:'MANUAL_REVIEW_ONLY',
 networkAndPrivileges:'UNVERIFIED'});
