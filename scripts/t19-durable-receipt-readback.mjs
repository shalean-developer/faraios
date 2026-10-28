// T19 local-only ownership journal. No Docker mutation or automatic cleanup.
import {open,rename,readFile,unlink,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {correctedCandidate} from './t19-gate2-corrected-candidate.mjs';
const HEX64=/^[0-9a-f]{64}$/,HEX32=/^[0-9a-f]{32}$/;
export function validateReceipt(x){
 if(!x||x.version!==1||!HEX64.test(x.id??'')||!HEX32.test(x.nonce??'')||
 x.image!==correctedCandidate.image||x.name!==correctedCandidate.name||
 !['CREATED','STOPPED','QUARANTINED'].includes(x.state))throw Error('INVALID_T19_RECEIPT');
 return Object.freeze({...x});
}
export async function writeReceiptOnce(directory,receipt){
 const x=validateReceipt(receipt),dir=resolve(directory);
 await mkdir(dir,{recursive:true,mode:0o700});
 const destination=join(dir,x.nonce+'.json'),temp=join(dir,x.nonce+'.pending');
 // Exclusive creation: do not overwrite an existing receipt or pending recovery record.
 let h=await open(temp,'wx',0o600);
 try{await h.writeFile(JSON.stringify(x)+'\n');await h.sync();}finally{await h.close();}
 try {
  // Exclusive final reservation: rename() alone can overwrite existing files.
  const f=await open(destination,'wx',0o600);await f.close();
  await rename(temp,destination);
  const dh=await open(dir,'r');try{await dh.sync();}finally{await dh.close();}
 }catch(e){/* Retain .pending for forensic recovery; NEVER unlink unknown journal. */throw e;}
 return destination;
}
export async function readReceipt(directory,nonce){
 if(!HEX32.test(nonce??''))throw Error('INVALID_NONCE');
 const raw=await readFile(join(resolve(directory),nonce+'.json'),'utf8');
 return validateReceipt(JSON.parse(raw));
}
export function verifyDockerReadback(x){
 const h=x?.HostConfig??{},c=x?.Config??{},n=x?.NetworkSettings??{};
 const problems=[];
 if(h.NetworkMode!=='none')problems.push('NETWORK');
 if(h.ReadonlyRootfs!==true)problems.push('ROOT_FS');
 if(h.Memory!==536870912||h.MemorySwap!==536870912||h.NanoCpus!==1000000000||h.PidsLimit!==64)problems.push('RESOURCES');
 if(h.Privileged!==false||h.PublishAllPorts!==false||Object.keys(n.Ports??{}).some(k=>(n.Ports[k]??[]).length))problems.push('EXPOSURE');
 if((h.Binds??[]).length||Object.keys(h.PortBindings??{}).length)problems.push('HOST_BINDINGS');
 if(c.Image!==correctedCandidate.image)problems.push('IMAGE');
 if(x?.Name!=='/'+correctedCandidate.name)problems.push('NAME');
 // Capability and tmpfs compatibility NOT approved yet; passing here cannot authorize startup/cleanup.
 return {readbackMatches:problems.length===0,startAllowed:false,cleanupAllowed:false,problems};
}
export function recoveryDecision(receipt,container,inventory){
 let valid=false;try{validateReceipt(receipt);valid=container?.Id===receipt.id&&
 container?.Config?.Labels?.['faraios.t19.run-nonce']===receipt.nonce&&
 container?.Config?.Image===receipt.image&&container?.Name==='/'+receipt.name&&
 container?.State?.Running===false&&Array.isArray(inventory)&&
 inventory.filter(x=>x===receipt.id).length===1;}catch{}
 return {action:valid?'MANUAL_REVIEW':'QUARANTINE',removeAllowed:false,startAllowed:false};
}
