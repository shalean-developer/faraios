// T19 Gate 2 orchestrator gate: connects signed approval review, bounded read-only Docker
// and nonce reconciliation. No mutation-capable adapter, no startup authorization.
import {verifyExactRun} from './t19-gate2-authorization.mjs';
import {makeBoundedDocker} from './t19-gate2-bounded-docker.mjs';
import {reconcile} from './t19-gate2-failure-kernel.mjs';
export async function reviewExactRun({approval,docker=makeBoundedDocker(),scriptBytes}={}){
 const verdict=await verifyExactRun({...approval,scriptBytes});
 if(!verdict.signatureValid)return {stage:'AUTHORIZATION',status:'NO_GO',reason:verdict.reason};
 const image=approval.receipt.image,nonce=approval.receipt.nonce;
 try {
  const actual=await docker(['image','inspect',image,'--format','{{.Id}}'],{timeoutMs:10000});
  if(actual!==image)return {stage:'IMAGE',status:'NO_GO',reason:'IMAGE_MISMATCH'};
  // Read-only enumeration; do not read/modify unrelated container contents.
  const raw=await docker(['container','ls','--all','--no-trunc','--format','{{.ID}}'],{timeoutMs:10000});
  if(raw.split(/\r?\n/).filter(Boolean).some(x=>!/^[a-f0-9]{64}$/.test(x)))
   return {stage:'INVENTORY',status:'NO_GO',reason:'INVALID_ID'};
  return {stage:'PREFLIGHT',status:'NO_GO',reason:'SIGNED_BUT_NOT_CONSUMABLE',
    nonce,cleanupAllowed:false,startAllowed:false};
 } catch(e){return {stage:'READ_ONLY_DOCKER',status:'NO_GO',reason:e.message};}
}
export function assessInterruptedRun({nonce,recordedId,containers}={}){
 const result=reconcile({nonce,recordedId,containers});
 return {...result,startAllowed:false,cleanupAllowed:false};
}
