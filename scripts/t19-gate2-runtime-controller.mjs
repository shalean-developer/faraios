// Gate 2: injectable Docker control flow; live execution disabled at entrypoint.
// The adapter is supplied by isolated tests. Never imports child_process.
import {candidate,proposedDockerArgs} from './t19-03-docker-candidate.mjs';
const ID=/^[a-f0-9]{64}$/;
export function inspectEnforcement(x){
 const h=x?.HostConfig??{},c=x?.Config??{},n=x?.NetworkSettings??{};
 return x?.Name==='/'+candidate.name && c.Image===candidate.image &&
 h.NetworkMode==='none' && h.ReadonlyRootfs===true &&
 h.Memory===536870912 && h.MemorySwap===536870912 &&
 h.NanoCpus===1000000000 && h.PidsLimit===64 &&
 h.Privileged===false && h.PublishAllPorts===false &&
 (!h.Binds||h.Binds.length===0) &&
 (!c.ExposedPorts||Object.keys(c.ExposedPorts).length===0) &&
 (h.CapDrop??[]).includes('ALL') &&
 (h.SecurityOpt??[]).includes('no-new-privileges:true') &&
 c.User==='999:999' && Object.keys(n.Ports??{}).length===0;
}
export async function verifyDryRun(docker){
 if(typeof docker!=='function')throw Error('Controlled adapter required');
 const inventory=await docker(['container','ls','--all','--format','{{.Names}}']);
 if(typeof inventory!=='string')throw Error('Inventory failed');
 if(inventory.split(/\r?\n/).includes(candidate.name))throw Error('NAME_COLLISION');
 const image=JSON.parse(await docker(['image','inspect',candidate.image]));
 if(image.length!==1 ||image[0].Id!==candidate.image)throw Error('IMAGE_MISMATCH');
 return {gate:'EXECUTION_NO_GO',proposedArgv:proposedDockerArgs(),reviewedImage:candidate.image};
}
export function decidePostCreate({id,inspection,nonce,approvalReceipt}={}){
 // No live creation permitted yet; decisions only.
 if(!ID.test(id??'')||inspection?.Id!==id||!inspectEnforcement(inspection))
  return {pass:false,reason:'RUNTIME_ENFORCEMENT_NOT_VERIFIED'};
 if(!/^[a-f0-9]{32}$/.test(nonce??'')||
 inspection?.Config?.Labels?.['faraios.t19.run-nonce']!==nonce)
  return {pass:false,reason:'OWNERSHIP_NOT_VERIFIED'};
 return {pass:false,reason:'EXECUTION_APPROVAL_NOT_IMPLEMENTED'};
}
if(import.meta.url===`file://${process.argv[1]?.replaceAll('\\','/')}`){
 console.log('T19_GATE2_RUNTIME_CONTROLLER_SOURCE_PASS; EXECUTION_NO_GO');
}
