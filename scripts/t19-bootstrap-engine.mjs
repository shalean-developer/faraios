// Synthetic-only state machine. No database endpoint, archive or restore capability.
import {createHash} from 'node:crypto';
export const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export const digest=x=>createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:canonical(x)).digest('hex');
export const SCOPE='t19-synthetic-managed-bootstrap-v1';
export const LABEL='faraios.t19.bootstrap-nonce';
export const IMAGES=Object.freeze({postgres:'sha256:ab85056c03f387f1b544420d88198872035093af9df6455402284b2deabe6eec',auth:'sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f',storage:'sha256:d1ad18d4afde8f08ae8b18f0aede17737d83fb3f189664a741f626329e5e6b97'});
export const FREEZE='revoke-grants-to-unused-operations';
export const INDEXES=['idx_users_email','idx_users_created_at_desc','idx_users_last_sign_in_at_desc','idx_users_name'];
export const PHASES=['isolation','postgres','bootstrapHelpers','bootstrapDependencies','realtime','authMigrations','authIndexes','storage','managedCatalog','custody','security','stableCatalog'];
export function requireTrue(x,code){if(x!==true)throw Error(code);}
export function validNonce(n){requireTrue(typeof n==='string'&&/^[a-f0-9]{32}$/.test(n),'NONCE_INVALID');return n;}
export function containerSpec(nonce,kind,network,env={}){
 validNonce(nonce);requireTrue(['postgres','auth-migrate','auth','storage-migrate','storage','sentinel','probe'].includes(kind),'KIND_INVALID');
 requireTrue(network===`t19-bootstrap-${nonce}`||network===`t19-bootstrap-sentinel-${nonce}`,'NETWORK_INVALID');
 const pg=kind==='postgres',auth=kind.startsWith('auth');
 const tmpfs=pg?{'/var/lib/postgresql/data':'rw,noexec,nosuid,nodev,uid=100,gid=101,mode=0700,size=384m','/var/run/postgresql':'rw,noexec,nosuid,nodev,uid=100,gid=101,mode=0775,size=32m','/tmp':'rw,noexec,nosuid,nodev,uid=100,gid=101,mode=1777,size=32m'}:{'/tmp':'rw,noexec,nosuid,nodev,uid=1000,gid=1000,mode=1777,size=32m',...(!auth?{'/var/lib/storage':'rw,noexec,nosuid,nodev,uid=1000,gid=1000,mode=0700,size=128m'}:{})};
 return {name:`t19-bootstrap-${nonce}-${kind}`,nonce,kind,network,image:IMAGES[pg?'postgres':auth?'auth':'storage'],user:pg?'100:101':'1000:1000',tmpfs,env};
}
export function createArgs(s,command,environmentPath){
 requireTrue(typeof environmentPath==='string'&&environmentPath.startsWith('/')&&!/[\r\n\0]/.test(environmentPath)&&!['/dev/','/proc/','/sys/'].some(p=>environmentPath.startsWith(p)),'ENV_FILE_PATH_INVALID');
 const a=['container','create','--name',s.name,'--pull','never','--network',s.network,'--read-only','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user',s.user,'--restart','no','--log-driver','local','--log-opt','max-size=1m','--log-opt','max-file=1','--log-opt','compress=false','--label',LABEL+'='+s.nonce,'--env-file',environmentPath,...Object.entries(s.tmpfs).flatMap(([p,v])=>['--tmpfs',p+':'+v])];
 if(command?.entrypoint)a.push('--entrypoint',command.entrypoint);
 a.push(s.image,...(command?.args??[]));return a;
}
export function isolated(x,s,networkId){
 const h=x?.HostConfig,c=x?.Config,n=x?.NetworkSettings,e=n?.Networks?.[s.network];
 // Docker records the declared network before allocating its runtime endpoint.
 // This exception is limited to a provably unstarted created container.
 const declaredOnly=typeof networkId==='string'&&networkId.length>0&&x?.State?.Status==='created'&&x.State.Running===false&&x.State.Pid===0&&e?.NetworkID===''&&!e.EndpointID&&!e.IPAddress&&!e.GlobalIPv6Address&&!e.MacAddress;
 return x?.Name==='/'+s.name&&x.Image===s.image&&c?.Image===s.image&&c.User===s.user&&c.Labels?.[LABEL]===s.nonce&&
 h?.NetworkMode===s.network&&h.ReadonlyRootfs===true&&h.Memory===536870912&&h.MemorySwap===536870912&&h.NanoCpus===1e9&&h.PidsLimit===64&&h.Privileged===false&&h.PublishAllPorts===false&&h.AutoRemove===false&&h.RestartPolicy?.Name==='no'&&canonical(h.LogConfig)===canonical({Type:'local',Config:{'max-size':'1m','max-file':'1',compress:'false'}})&&
 canonical(h.Tmpfs)===canonical(s.tmpfs)&&canonical(h.CapDrop)===canonical(['ALL'])&&canonical(h.SecurityOpt)===canonical(['no-new-privileges:true'])&&
 ![h.PidMode,h.IpcMode,h.UTSMode].includes('host')&&!['Binds','CapAdd','Devices','DeviceRequests','VolumesFrom','Links','ExtraHosts'].some(k=>(h[k]??[]).length)&&
 !Object.keys(h.PortBindings??{}).length&&!(x.Mounts??[]).some(m=>m.Type!=='tmpfs')&&!Object.values(n?.Ports??{}).some(v=>v?.length)&&
 Object.keys(n?.Networks??{}).length===1&&typeof networkId==='string'&&networkId.length>0&&(e?.NetworkID===networkId||declaredOnly);
}
export function environment(actual,expected){
 if(!Array.isArray(actual)||!Array.isArray(expected))return false;
 const names=new Set();for(const v of actual){if(typeof v!=='string'||v.indexOf('=')<1||v.includes('\0')||names.has(v.split('=')[0]))return false;names.add(v.split('=')[0]);}
 return canonical([...actual].sort())===canonical([...expected].sort());
}
export function ledgerChecks(actual,files){
 const authFiles=files.filter(f=>f.component==='auth'&&f.path.endsWith('.up.sql')).map(f=>f.path.split('/').at(-1).split('_')[0]);
 const seeds=['20171026211738','20171026211808','20171026211834','20180103212743','20180108183307','20180119214651','20180125194653'];
 requireTrue(canonical([...actual.auth].sort())===canonical([...seeds,...authFiles].sort()),'AUTH_LEDGER_MISMATCH');
 const storageFiles=files.filter(f=>f.component==='storage'&&/\/migrations\/tenant\/\d+-/.test(f.path));
 const expected=storageFiles.filter(f=>Number(f.path.split('/').at(-1).match(/^\d+/)[0])<=73).map(f=>({id:Number(f.path.split('/').at(-1).match(/^\d+/)[0]),name:f.path.split('/').at(-1).replace(/^\d+-|\.sql$/g,'')}));
 requireTrue(expected.length===73&&actual.storage.length===74,'STORAGE_LEDGER_MISMATCH');
 requireTrue(actual.storage[0].id===0&&actual.storage[0].name==='create-migrations-table','STORAGE_LEDGER_ZERO');
 requireTrue(canonical(actual.storage.slice(1).map(({id,name})=>({id,name})))===canonical(expected.sort((a,b)=>a.id-b.id)),'STORAGE_FREEZE_VIOLATION');
 requireTrue(actual.indexes.length===4&&canonical(actual.indexes.map(x=>x.name).sort())===canonical([...INDEXES].sort())&&actual.indexes.every(x=>x.valid===true&&x.ready===true),'AUTH_INDEX_WORKER_INCOMPLETE');
}
export async function runBootstrap(platform,{now=Date.now}={}){
 const started=now(),stages=[];let failure=null,cleanupVerified=false;
 try{
  await platform.preflight();
  for(const phase of PHASES){requireTrue(now()-started<900000,'RUN_DEADLINE');await platform[phase]();stages.push(phase);await platform.record('phase',{phase,status:'PASS'});}
 }catch(e){failure=/^[A-Z0-9_]+$/.test(e.message)?e.message:'BOOTSTRAP_FAILURE';}
 finally{try{cleanupVerified=await platform.cleanup()===true;}catch{cleanupVerified=false;}}
 const status=!cleanupVerified?'QUARANTINE':failure?'FAIL':'SYNTHETIC_COMPATIBILITY_PASS';
 const result={status,stages,reason:failure,cleanupVerified,checkpointUsed:false,checkpointUseAuthorized:false,restoreAttempted:false,operationalCustodyInstalled:false};
 try{await platform.record('result',result);}catch{result.status='QUARANTINE';result.reason='JOURNAL_FAILURE';}
 return result;
}
// Only regular files/directories and bounded PAX metadata from docker cp are accepted.
export function tarFiles(bytes){
 const result=new Map();let at=0,pax={};
 while(at+512<=bytes.length){const h=bytes.subarray(at,at+512);at+=512;if(h.every(v=>v===0))break;
  const str=(a,b)=>h.subarray(a,b).toString().split('\0')[0];
  const oct=s=>{requireTrue(/^[0-7]*$/.test(s.trim()),'TAR_NUMBER');return parseInt(s.trim()||'0',8);};
  const size=oct(str(124,136));requireTrue(Number.isSafeInteger(size)&&size>=0&&at+size<=bytes.length,'TAR_SIZE');
  const stored=oct(str(148,156));const check=Buffer.from(h);check.fill(32,148,156);requireTrue(check.reduce((a,b)=>a+b,0)===stored,'TAR_CHECKSUM');
  const body=bytes.subarray(at,at+size);at+=Math.ceil(size/512)*512;const type=str(156,157)||'0';
  if(type==='x'){pax={};let p=0;while(p<body.length){const space=body.indexOf(32,p),len=Number(body.subarray(p,space).toString());requireTrue(space>p&&Number.isSafeInteger(len)&&len>space-p&&p+len<=body.length,'TAR_PAX');const entry=body.subarray(space+1,p+len-1).toString(),eq=entry.indexOf('=');pax[entry.slice(0,eq)]=entry.slice(eq+1);p+=len;}continue;}
  const name=pax.path??[str(345,500),str(0,100)].filter(Boolean).join('/');pax={};
  requireTrue(!name.startsWith('/')&&!name.split('/').includes('..')&&!name.includes('\0'),'TAR_PATH');
  if(type==='5')continue;
  requireTrue(type==='0'&&!result.has(name),'TAR_FILE_TYPE');result.set(name,Buffer.from(body));
 }
 requireTrue(result.size>0,'TAR_EMPTY');return result;
}
