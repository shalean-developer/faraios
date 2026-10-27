// T19 Gate 2 corrected runtime candidate. Not a Docker launcher.
// Supersedes the unverified UID 999 / single tmpfs proposal; keep EXECUTION_NO_GO.
import {IMAGE} from './t19-03-docker-candidate.mjs';
export const correctedCandidate=Object.freeze({
 image:IMAGE,name:'faraios-t19-managed-qa',
 initialUser:'IMAGE_DEFAULT_UNVERIFIED', effectivePostgresUid:'UNVERIFIED',
 entrypoint:'docker-entrypoint.sh',pgdata:'/var/lib/postgresql/data',
 socketDirectory:'/var/run/postgresql',configDirectory:'/etc/postgresql',
 writableTmpfs:Object.freeze([
  '/var/lib/postgresql/data:rw,nosuid,size=384m',
  '/var/run/postgresql:rw,nosuid,size=32m'
 ]),
 network:'none',publishedPorts:[],bindMounts:[],
 readOnlyRoot:true,autoPull:false,credentialsAllowed:false,
 memoryMiB:512,cpus:1,pids:64,
 capabilityPolicy:'UNVERIFIED_FOR_ROOT_ENTRYPOINT',
 directoryOwnership:'UNVERIFIED',
 vaultInitialization:'UNVERIFIED',
 executionApproved:false
});
export function assessCorrectedCandidate(c=correctedCandidate){
 const blockers=[];
 if(c.image!==IMAGE||c.name!=='faraios-t19-managed-qa')blockers.push('IMAGE_OR_NAME');
 if(c.network!=='none'||c.publishedPorts?.length||c.bindMounts?.length)blockers.push('ISOLATION');
 if(c.readOnlyRoot!==true||c.autoPull!==false||c.credentialsAllowed!==false)blockers.push('FILESYSTEM_OR_CREDENTIALS');
 if(c.memoryMiB!==512||c.cpus!==1||c.pids!==64)blockers.push('RESOURCE_POLICY');
 if(JSON.stringify(c.writableTmpfs)!==JSON.stringify(correctedCandidate.writableTmpfs))blockers.push('WRITABLE_PATHS');
 if(c.initialUser!=='IMAGE_DEFAULT_UNVERIFIED'||c.effectivePostgresUid!=='UNVERIFIED')blockers.push('UID_UNVERIFIED');
 if(c.capabilityPolicy!=='UNVERIFIED_FOR_ROOT_ENTRYPOINT'||c.directoryOwnership!=='UNVERIFIED')blockers.push('ENTRYPOINT_PERMISSIONS');
 if(c.vaultInitialization!=='UNVERIFIED')blockers.push('VAULT');
 blockers.push('ACTUAL_DOCKER_EXECUTION_NOT_AUTHORIZED');
 return {allowed:false,status:'EXECUTION_NO_GO',blockers};
}
export function correctedProposedArgs(){
 // Inspectable proposal only. No --user 999:999; root-to-postgres entrypoint
 // requires separate review of CHOWN/SETUID capabilities and actual image paths.
 return ['create','--name',correctedCandidate.name,'--pull','never',
 '--network','none','--cpus','1','--memory','512m','--memory-swap','512m',
 '--pids-limit','64','--read-only',
 '--tmpfs',correctedCandidate.writableTmpfs[0],
 '--tmpfs',correctedCandidate.writableTmpfs[1],correctedCandidate.image];
}
if(process.argv[1]?.endsWith('t19-gate2-corrected-candidate.mjs')){
 console.log('T19_CORRECTED_CANDIDATE_SOURCE_PASS; EXECUTION_NO_GO');
}
