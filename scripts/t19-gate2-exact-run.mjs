// T19 Gate 2 exact-run candidate: inspect-only evidence contract, never executes Docker.
// This is NOT an authorization receipt or a launcher.
import {candidate,proposedDockerArgs} from './t19-03-docker-candidate.mjs';
import {inspectEnforcement} from './t19-gate2-runtime-controller.mjs';
export const REQUIRED = Object.freeze({
 baseline:'75c835542c50aac38c0a941cac6bc0fa95a5d59a',
 image:candidate.image,
 imageProvenance:'UNVERIFIED',
 runtimeUser:'UNVERIFIED',
 writablePaths:'UNVERIFIED',
 networkTopology:'UNVERIFIED',
 resourceSufficiency:'UNVERIFIED',
 ownershipReceipt:'UNVERIFIED',
 sqlScope:'UNVERIFIED',
 cleanupProtocol:'UNVERIFIED',
 executionApproved:false
});
export function assessRunEvidence(e={}){
 const missing=[];
 for(const key of ['imageProvenance','runtimeUser','writablePaths','networkTopology','resourceSufficiency','ownershipReceipt','sqlScope','cleanupProtocol']){
  if(e[key]!== 'VERIFIED')missing.push(key);
 }
 if(e.executionApproved!==true)missing.push('separate execution approval');
 return {allowed:false,status:'EXECUTION_NO_GO',missing};
}
export function proposedInspectionContract(){
 return {createArgv:proposedDockerArgs(),requiredImage:REQUIRED.image,
  inspectValidator:'inspectEnforcement',runtimeExecution:false,sqlExecution:false,
  cleanupExecution:false};
}
export function assessSimulatedInspection(inspection){
 return {configurationMatches:inspectEnforcement(inspection),
   authorized:false,status:'EXECUTION_NO_GO'};
}
if(import.meta.url.endsWith('/t19-gate2-exact-run.mjs'))
 console.log('T19_EXACT_RUN_CONTRACT_PASS; EXECUTION_NO_GO');
