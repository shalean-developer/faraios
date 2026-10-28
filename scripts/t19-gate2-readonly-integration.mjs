// T19 Gate 2 Windows read-only Docker integration preflight.
// Cannot create/start/stop/remove containers, execute SQL, or authorize startup.
import {makeBoundedDocker} from './t19-gate2-bounded-docker.mjs';
import {IMAGE} from './t19-03-docker-candidate.mjs';
const docker=makeBoundedDocker();
const result={status:'NO_GO',image:IMAGE,checked:[],blockers:[]};
try {
 const imageText=await docker(['image','inspect',IMAGE,'--format','{{.Id}}'],{timeoutMs:10000});
 if(imageText!==IMAGE)throw Error('IMAGE_ID_MISMATCH');
 result.checked.push('PINNED_LOCAL_IMAGE');
 const inventory=await docker(['container','ls','--all','--no-trunc','--format','{{.ID}}'],{timeoutMs:10000});
 const ids=inventory.split(/\r?\n/).filter(Boolean);
 if(ids.some(x=>!/^[a-f0-9]{64}$/.test(x)))throw Error('INVALID_INVENTORY');
 result.checked.push('READ_ONLY_INVENTORY');
 result.inventoryCount=ids.length;
 // Never print container IDs or contents; do not inspect unrelated business resources.
} catch(e){result.blockers.push(e.message);}
console.log(JSON.stringify(result,null,2));
if(result.blockers.length)process.exitCode=1;
