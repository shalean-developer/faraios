// T19: isolated ownership and startup prerequisite review (pure; NO Docker runner).
import {correctedCandidate} from './t19-gate2-corrected-candidate.mjs';
const hex64=/^[a-f0-9]{64}$/,hex32=/^[a-f0-9]{32}$/;
export function inspectOwnership({receipt,container,inventory=[]}={}){
 const failures=[];
 if(!receipt||!hex64.test(receipt.id??'')||!hex32.test(receipt.nonce??''))failures.push('INVALID_RECEIPT');
 if(!container||!hex64.test(container.Id??'')||container.Id!==receipt?.id)failures.push('ID_MISMATCH');
 if(container?.Name!=='/'+correctedCandidate.name)failures.push('NAME_MISMATCH');
 if(container?.Config?.Image!==correctedCandidate.image)failures.push('IMAGE_MISMATCH');
 if(container?.Config?.Labels?.['faraios.t19.run-nonce']!==receipt?.nonce)failures.push('NONCE_MISMATCH');
 if(container?.State?.Running!==false)failures.push('NOT_STOPPED');
 if(!Array.isArray(inventory)||inventory.some(x=>typeof x!=='string')||
   inventory.filter(id=>id===receipt?.id).length!==1)failures.push('INVENTORY_NOT_UNIQUE');
 return {eligibleForSeparateCleanupReview:failures.length===0,cleanupAllowed:false,
   status:'CLEANUP_EXECUTION_NO_GO',failures};
}
export function startupPrerequisites(x={}){
 const required=['imageRegistryDigestVerified','uid100gid101Verified','dataAndSocketMountPermissionsVerified',
 'capabilitiesLeastPrivilegeReviewed','additionalWritablePathsReviewed','initdbAndVaultScriptsReviewed',
 'memoryBudgetVerified','uniqueOwnedResourceProvisioningReviewed',
 'stopTimeoutAndCrashRecoveryReviewed','isolatedNetworkAndNoPortsReviewed',
 'syntheticCredentialsReviewed','independentSecurityReview','exactRunOwnerApproval'];
 const missing=required.filter(k=>x[k]!==true);
 return {startupAllowed:false,status:'EXECUTION_NO_GO',missing};
}
export function disposalPlanReview(){
 return Object.freeze({createAllowed:false,startAllowed:false,removeAllowed:false,
   explicitOnly:true,neverDeleteByName:true,runOwnershipReceiptRequired:true,
   inspectBeforeRemoval:true,requireStopped:true,cleanupImplementation:'ABSENT'});
}
