// T19 controlled executor gate. Pure authorization/state machine; no Docker execution.
// Never remove an existing resource on the basis of its name or label alone.
import {candidate,proposedDockerArgs} from './t19-03-docker-candidate.mjs';
export const EXECUTION_NO_GO='EXECUTION_NO_GO';
export function precreateDecision({existingNames=[],imageVerified=false,resourcesVerified=false,ownerApproved=false}={}){
 if(!Array.isArray(existingNames)||existingNames.some(n=>typeof n!=='string'))throw Error('Invalid inventory');
 if(existingNames.includes(candidate.name))return {allowed:false,reason:'NAME_COLLISION'};
 if(!imageVerified||!resourcesVerified||!ownerApproved)return {allowed:false,reason:EXECUTION_NO_GO};
 // An explicit approval boolean cannot serve as an authenticated approval receipt.
 return {allowed:false,reason:'SIGNED_RUN_RECEIPT_NOT_IMPLEMENTED'};
}
export function cleanupDecision({createdContainerId,inspectedContainer,runNonce,approvedContainerId}={}){
 if(!/^[a-f0-9]{64}$/.test(createdContainerId??'')||
    !/^[a-f0-9]{64}$/.test(approvedContainerId??'')||
    createdContainerId!==approvedContainerId ||
    !/^[a-f0-9]{32}$/.test(runNonce??'') ||
    inspectedContainer?.Id!==createdContainerId ||
    inspectedContainer?.Name!=='/'+candidate.name ||
    inspectedContainer?.Config?.Image!==candidate.image ||
    inspectedContainer?.Config?.Labels?.['faraios.t19.run-nonce']!==runNonce ||
    inspectedContainer?.State?.Running!==false)
    return {allowed:false,reason:'OWNERSHIP_OR_STOP_STATE_NOT_PROVEN'};
 // Never provide removal authorization until a separate approved cleanup implementation.
 return {allowed:false,reason:'CLEANUP_EXECUTION_NOT_IMPLEMENTED'};
}
export function proposedPlan(){
 return Object.freeze({dockerArgv:proposedDockerArgs(),executionAllowed:false,
  cleanupAllowed:false,authorization:'SEPARATE_EXACT_RUN_APPROVAL_REQUIRED'});
}
if(process.argv[1]?.endsWith('t19-04-executor-gate.mjs')){
 console.log('T19_EXECUTOR_GATE_SOURCE_PASS; '+EXECUTION_NO_GO);
}
