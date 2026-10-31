// Inactive host-reader primitives. Do not equate caller-supplied facts with hosted proof.
import {readdir,stat,readlink,open,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute,basename} from 'node:path';
const deny=()=>new Error('accounting_rotation_maintenance_required');
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
const equal=(a,b)=>a.length===b.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i]);
const scripts=new Map([['_standard_accounting.cjs','web'],['scripts/t19-standard-invoice-worker.mjs','worker'],['scripts/t19-standard-scheduled-worker.mjs','scheduler']]);
async function bounded(path,max){const h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const b=Buffer.alloc(max+1);let n=0;while(n<b.length){const r=await h.read(b,n,b.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}if(n>max)throw deny();return b.subarray(0,n).toString('utf8');}finally{await h.close();}}
export async function scanStagingWriterProcesses({appRoot,procRoot='/proc',selfPid=process.pid}){
 try{
  if(process.platform!=='linux'||!isAbsolute(appRoot)||await realpath(appRoot)!==appRoot||!isAbsolute(procRoot)||await realpath(procRoot)!==procRoot||!Number.isSafeInteger(selfPid)||selfPid<1)throw deny();
  if(procRoot==='/proc'){const status=await bounded('/proc/self/status',65536),pid=Number(status.match(/^Pid:\s+(\d+)/m)?.[1]),uid=Number(status.match(/^Uid:\s+(\d+)/m)?.[1]),nested=status.match(/^NSpid:\s+(.+)$/m)?.[1]?.trim().split(/\s+/);if(pid!==process.pid||uid!==process.getuid()||nested&&nested.length!==1)throw deny();}
  const start=async p=>{const text=await bounded(join(p,'stat'),4096),tail=text.slice(text.lastIndexOf(')')+1).trim().split(/\s+/),value=tail[19];if(!/^[0-9]+$/.test(value??''))throw deny();return {ticks:value,state:tail[0]};};
  const entries=await readdir(procRoot);if(entries.length>20000)throw deny();const found=[];
  for(const id of entries){if(!/^[1-9][0-9]*$/.test(id)||Number(id)===selfPid)continue;const path=join(procRoot,id);let before;
   try{before=await stat(path);if(before.uid!==process.getuid())continue;
    const started=await start(path);if(['Z','X'].includes(started.state))continue;const comm=(await bounded(join(path,'comm'),128)).trim(),executable=basename((await readlink(join(path,'exe'))).replace(/ \(deleted\)$/,''));if(!['node','nodejs','lsnode'].includes(comm)&&!['node','nodejs','lsnode'].includes(executable))continue;
    const args=(await bounded(join(path,'cmdline'),65536)).split('\0').filter(Boolean),cwd=await readlink(join(path,'cwd'));
    const after=await stat(path);if(before.dev!==after.dev||before.ino!==after.ino||before.uid!==after.uid||started.ticks!==(await start(path)).ticks)throw deny();
    // Exact arguments, including flags/preloads; never substring-match source in -e.
    for(const [script,kind]of scripts){const absolute=join(appRoot,script);if(args.slice(1).some(a=>a===absolute||a==='--require='+absolute||a==='--import=file://'+absolute||(cwd===appRoot&&(a===script||a==='./'+script)))){found.push({pid:Number(id),kind});break;}}
   }catch(e){if(e.code==='ENOENT'||e.code==='ESRCH'){let alive;try{alive=await stat(path);}catch(gone){if(gone.code==='ENOENT'||gone.code==='ESRCH')continue;throw gone;}if(alive&&['Z','X'].includes((await start(path)).state))continue;}throw e;}
  }return found.sort((a,b)=>a.pid-b.pid);
 }catch{throw deny();}
}
export function createRotationMaintenanceCheck({businessIds,keyIds,readFacts,scanProcesses,now=Date.now,maxAgeMs=5000}){
 if(!Array.isArray(businessIds)||!businessIds.length||businessIds.length>20||businessIds.some(b=>!uuid(b))||new Set(businessIds).size!==businessIds.length||!Array.isArray(keyIds)||!keyIds.length||keyIds.length>2||keyIds.some(k=>typeof k!=='string'||!/^[a-zA-Z0-9_-]{1,40}$/.test(k))||new Set(keyIds).size!==keyIds.length||typeof readFacts!=='function'||typeof scanProcesses!=='function'||typeof now!=='function'||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||maxAgeMs>5000)throw deny();
 return async()=>{
  try{const facts=await readFacts(),current=now();
   const fresh=()=>Number.isSafeInteger(facts?.observedAt)&&Number.isSafeInteger(now())&&now()>=facts.observedAt&&now()-facts.observedAt<=maxAgeMs;
   if(!Number.isSafeInteger(current)||!fresh()||facts.environment!=='staging'||facts.webStopped!==true||facts.schedulerPaused!==true||facts.inventoryComplete!==true||facts.processNamespaceVerified!==true||['foreignLeaseCount','pendingJobs','runningJobs'].some(k=>!Number.isSafeInteger(facts[k])||facts[k]!==0))throw deny();
   const worker=facts.workerConfiguration;if(worker?.version!==1||worker.environment!=='staging'||worker.enabled!==false||!Array.isArray(worker.businessIds)||!equal(worker.businessIds,businessIds))throw deny();
   const rows=facts.inventory;if(!Array.isArray(rows)||rows.length!==businessIds.length||!equal(rows.map(c=>c.businessId),businessIds)||rows.some(c=>c.environment!=='staging'||c.status!=='connected'||!keyIds.includes(c.envelopeKeyId)))throw deny();
   const processes=await scanProcesses();if(!Array.isArray(processes)||processes.length||!fresh())throw deny();return true;
  }catch{throw deny();}
 };
}
