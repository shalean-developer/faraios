// T19-03 candidate Docker invocation builder. PURE DATA ONLY; never calls Docker.
// Owner-authorized execution requires a separately reviewed runner that is absent here.
export const IMAGE='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
export function validateCandidate(x){
 const errors=[];
 if(x?.name!=='faraios-t19-managed-qa')errors.push('name');
 if(x?.image!==IMAGE)errors.push('image');
 if(x?.memoryMiB!==512||x?.cpus!==1||x?.pids!==64)errors.push('resources');
 if(x?.network!=='none'||x?.ports?.length||x?.binds?.length)errors.push('network/binds');
 if(x?.credentialsAllowed!==false||x?.privileged!==false)errors.push('credentials/privileges');
 if(x?.readOnly!==true||x?.noNewPrivileges!==true||x?.capDrop!=='ALL')errors.push('sandbox');
 if(x?.runtimeUser!=='999:999')errors.push('runtime identity not validated');
 if(x?.scratch!=='/var/lib/postgresql:rw,noexec,nosuid,size=256m')errors.push('scratch');
 if(x?.ownershipVerified!==false||x?.executionApproved!==false)errors.push('execution must remain disabled');
 return errors;
}
export const candidate=Object.freeze({
 name:'faraios-t19-managed-qa',image:IMAGE,memoryMiB:512,cpus:1,pids:64,
 network:'none',ports:[],binds:[],credentialsAllowed:false,privileged:false,
 readOnly:true,noNewPrivileges:true,capDrop:'ALL',
 runtimeUser:'999:999',scratch:'/var/lib/postgresql:rw,noexec,nosuid,size=256m',
 ownershipVerified:false,executionApproved:false
});
export function proposedDockerArgs(x=candidate){
 const errors=validateCandidate(x);
 if(errors.length)throw new Error('T19_CANDIDATE_NO_GO: '+errors.join(','));
 // Candidate only. Docker's enforcement, UID compatibility, effective mounts,
 // image bootstrap, network and cleanup MUST be tested only after approval.
 return ['create','--name',x.name,'--pull','never','--network','none',
  '--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64',
  '--read-only','--security-opt','no-new-privileges:true','--cap-drop','ALL',
  '--user','999:999','--tmpfs',x.scratch,
  '--label','faraios.t19.disposable=candidate',
  x.image];
}
