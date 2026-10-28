// T19 Gate 2: fault-injectable reconciliation kernel. No Docker execution entrypoint.
const ID=/^[a-f0-9]{64}$/,NONCE=/^[a-f0-9]{32}$/;
export function reconcile({nonce,recordedId=null,containers=[]}={}){
 if(!NONCE.test(nonce??'')||!Array.isArray(containers))return {action:'QUARANTINE',reason:'INVALID_INPUT'};
 const candidates=containers.filter(c=>c?.Config?.Labels?.['faraios.t19.run-nonce']===nonce);
 if(candidates.length!==1)return {action:'QUARANTINE',reason:candidates.length?'MULTIPLE_MATCHES':'NO_EXACT_MATCH'};
 const c=candidates[0];
 if(!ID.test(c.Id??'')||(recordedId!==null&&c.Id!==recordedId)||
 c.Name!=='/faraios-t19-managed-qa'||
 c.Config?.Image!=='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda')
 return {action:'QUARANTINE',reason:'IDENTITY_MISMATCH'};
 return {action:'MANUAL_RECOVERY_REVIEW',reason:'IDENTIFIED_NOT_AUTHORIZED',id:c.Id,
 stopped:c.State?.Running===false};
}
export async function bounded(operation,timeoutMs,clock){
 if(typeof operation!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1)
 throw Error('INVALID_BOUND');
 // Only for cancellable adapters. Promise.race is insufficient for external docker processes.
 return clock(operation,timeoutMs);
}
export async function simulateFailure({stage,events=[]}={}){
 const allowed=['before-create','create-unknown','receipt-write-fail','start-timeout','stop-timeout','remove-unknown'];
 if(!allowed.includes(stage))throw Error('UNKNOWN_STAGE');
 const state={stage,executedMutations:0,action:'QUARANTINE',requiresManualReview:true};
 events.push({...state});return state;
}
