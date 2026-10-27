// T19-02 source-only specification validator. This program cannot start containers.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const path=fileURLToPath(new URL('../config/t19-managed-runtime-spec.json',import.meta.url));
export function validate(spec){
 const errors=[];
 const require=(ok,key)=>{if(!ok)errors.push(key)};
 require(spec.schemaVersion===1,'schemaVersion');
 require(spec.executionAllowed===false && spec.mode==='source-only','execution gate');
 require(spec.containerName==='faraios-t19-managed-qa','disposable identity');
 require(spec.imagePull==='never','image pull');
 require(spec.networkMode==='none','network');
 require(Array.isArray(spec.publishedPorts)&&spec.publishedPorts.length===0,'ports');
 require(Array.isArray(spec.bindMounts)&&spec.bindMounts.length===0,'mounts');
 require(spec.credentialsAllowed===false && Array.isArray(spec.envAllowlist)&&spec.envAllowlist.length===0,'credentials');
 require(spec.security?.readOnlyRootFilesystem===true && spec.security?.noNewPrivileges===true,'security');
 require(spec.security?.privileged===false && spec.security?.user==='non-root-required','privilege');
 require(JSON.stringify(spec.security?.dropCapabilities)==='["ALL"]','capabilities');
 const r=spec.resources||{};
 require(Number.isFinite(r.cpus)&&r.cpus>0&&r.cpus<=1,'cpus');
 require(Number.isInteger(r.memoryMiB)&&r.memoryMiB>0&&r.memoryMiB<=512,'memory');
 require(Number.isInteger(r.pidsLimit)&&r.pidsLimit>0&&r.pidsLimit<=64,'pids');
 require(Number.isInteger(r.storageMiB)&&r.storageMiB>0&&r.storageMiB<=1024,'storage');
 require(spec.cleanup?.onlyNamedDisposableResources===true && spec.cleanup?.requireIndependentOwnershipProof===true && spec.cleanup?.unknownOutcome==='STOP_AND_INSPECT' && spec.cleanup?.neverRemoveUnownedResources===true,'cleanup');
 require(spec.bootstrap?.identity==='UNVERIFIED' && spec.bootstrap?.leastPrivilegeGrantEvidence===false,'bootstrap');
 require(spec.vault?.extensionAvailability==='UNVERIFIED','vault');
 require(spec.migrations?.managedOrder==='UNVERIFIED' && spec.migrations?.rollbackEvidence===false,'migrations');
 require(spec.catalog?.completeImageProvenance===false,'catalog');
 require(spec.runtime?.containerExecutionImplemented===false,'runtime');
 return errors;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const errors=validate(JSON.parse(readFileSync(path,'utf8')));
 if(errors.length){console.error('T19_SPEC_INVALID: '+errors.join(', '));process.exitCode=1;}
 else console.log('T19_SOURCE_SPEC_PASS; EXECUTION_NO_GO');
}
