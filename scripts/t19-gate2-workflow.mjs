// T19 single-cycle executor state machine. Real Docker mutation is deliberately absent.
// The injected adapter is used in fault tests; neither approval nor source tests unlock execution.
import {reconcile} from './t19-gate2-failure-kernel.mjs';
const ID=/^[a-f0-9]{64}$/;
export async function exerciseDisposableWorkflow({adapter,journal,nonce,image,approved=false}={}){
 const history=[];const log=(step)=>history.push(step);
 const fail=(reason)=>({status:'NO_GO',reason,history,mutationAuthorized:false});
 if(!adapter||!journal||!nonce||!image)return fail('MISSING_DEPENDENCY');
 if(approved!==true)return fail('SEPARATE_APPROVAL_REQUIRED');
 // An untrusted Boolean can never replace a consumed signed grant.
 return fail('AUTHORIZATION_CUSTODY_AND_REPLAY_GUARD_MISSING');
}
export async function recoverAmbiguousCreate({adapter,nonce,recordedId=null}={}){
 if(!adapter||!nonce)return {status:'QUARANTINE',reason:'MISSING_EVIDENCE'};
 try{
  const candidates=await adapter.findByNonce(nonce);
  const result=reconcile({nonce,recordedId,containers:candidates});
  return {status:result.action==='MANUAL_RECOVERY_REVIEW'?'IDENTIFIED_FOR_REVIEW':'QUARANTINE',
   id:result.id??null,cleanupAuthorized:false,reason:result.reason};
 }catch{return {status:'QUARANTINE',cleanupAuthorized:false,reason:'DOCKER_STATE_UNKNOWN'};}
}
export async function reviewExactCleanup({adapter,journal,receipt}={}){
 if(!adapter||!journal||!receipt||!ID.test(receipt.id??''))return {status:'QUARANTINE',cleanupAuthorized:false};
 try {
  const [recorded,container]=await Promise.all([journal.read(receipt.nonce),adapter.inspect(receipt.id)]);
  if(recorded.id!==receipt.id||recorded.nonce!==receipt.nonce||container.Id!==receipt.id||
   container.Config?.Labels?.['faraios.t19.run-nonce']!==receipt.nonce||
   container.State?.Running!==false)return {status:'QUARANTINE',cleanupAuthorized:false};
  return {status:'MANUAL_CLEANUP_REVIEW',cleanupAuthorized:false};
 }catch{return {status:'QUARANTINE',cleanupAuthorized:false};}
}
