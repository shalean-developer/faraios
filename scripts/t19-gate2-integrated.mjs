// Gate 2 candidate. No automatic invocation, trust installation or approval issuer.
// Host administrator must independently provision /etc/faraios/t19-gate2-trust.json.
import {createHash, createPublicKey, verify} from 'node:crypto';
import {open, readFile, lstat, realpath} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

export const IMAGE='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
export const NAME='faraios-t19-managed-qa';
export const SCOPE='t19-local-disposable-start-readiness-synthetic-sql-stop-remove-v4';
const ID=/^[a-f0-9]{64}$/, NONCE=/^[a-f0-9]{32}$/;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const TRUST='/etc/faraios/t19-gate2-trust.json';
const STATE='/var/lib/faraios/t19-gate2';
const TMPFS={
 '/var/lib/postgresql/data':'rw,noexec,nosuid,nodev,uid=100,gid=101,mode=0700,size=384m',
 '/var/run/postgresql':'rw,noexec,nosuid,nodev,uid=100,gid=101,mode=0775,size=32m',
 '/tmp':'rw,noexec,nosuid,nodev,uid=100,gid=101,mode=1777,size=32m'
};
// Use the pinned vendor entrypoint. Compatibility remains a runtime gate; never
// silently add capabilities, enlarge tmpfs or bypass vendor bootstrap on failure.
const ENV=['POSTGRES_HOST_AUTH_METHOD=trust'];
export function canonical(x){
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(x!==null&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 return JSON.stringify(x);
}
export const digest=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
const equal=(a,b)=>canonical(a)===canonical(b);
const fail=code=>{throw Error(code);};
export function createArgs(nonce){
 if(!NONCE.test(nonce??''))fail('NONCE_INVALID');
 return ['container','create','--name',NAME,'--pull','never','--network','none',
  '--read-only','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64',
  '--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','100:101',
  '--label','faraios.t19.run-nonce='+nonce,...Object.entries(TMPFS).flatMap(([k,v])=>['--tmpfs',k+':'+v]),
  '-e',ENV[0],IMAGE];
}
export const policyDigest=()=>digest({scope:SCOPE,create:createArgs('0'.repeat(32)),
 commands:['context-inspect','daemon-info','image-inspect','inventory','inspect-owned-id','start-owned-id',
 'pg_isready-owned-id','psql-fixed-stdin-owned-id','logs-owned-id','stop-owned-id','remove-stopped-owned-id'],
 maxMs:30000,maxBytes:1048576,platform:'linux',allowedBaselineCounts:[0,13]});
export async function bundleDigest(){
 const files=['scripts/t19-gate2-integrated.mjs','database/t19-gate2-disposable-integrity.sql'];
 return digest({runtimeSha256:digest(await readFile(process.execPath)),
  files:await Promise.all(files.map(async p=>[p,digest(await readFile(join(root,p)))]))});
}
function fingerprint(pem){const key=createPublicKey(pem);if(key.asymmetricKeyType!=='ed25519')fail('KEY_TYPE');return digest(key.export({type:'spki',format:'der'}));}
export function checkApproval({approval,trust,bundleSha256,binarySha256,hostBootSha256,now=Date.now()}){
 const r=approval?.receipt;
 const fields=['version','scope','bundleSha256','binarySha256','policySha256','inventorySha256','baselineCount','hostBootSha256','daemonIdSha256','context','nonce','issuedAt','expiresAt'];
 if(!r||!equal(Object.keys(r).sort(),fields.sort())||r.version!==4||r.scope!==SCOPE||
  r.bundleSha256!==bundleSha256||r.binarySha256!==binarySha256||r.policySha256!==policyDigest()||
  !ID.test(r.inventorySha256??'')||![0,13].includes(r.baselineCount)||
  !ID.test(hostBootSha256??'')||r.hostBootSha256!==hostBootSha256||!ID.test(r.daemonIdSha256??'')||
  r.context!==trust.context||!NONCE.test(r.nonce??'')||
  !Number.isSafeInteger(r.issuedAt)||!Number.isSafeInteger(r.expiresAt)||r.issuedAt>now||
  r.expiresAt<=now||r.expiresAt-r.issuedAt>900000||now-r.issuedAt>900000)fail('EXACT_APPROVAL_INVALID');
 // Owner-directed acceptance replaces the former second-reviewer signature.
 // The owner public key remains independently provisioned, never caller-selected.
 fingerprint(trust.ownerKey);
 for(const [name,key] of [['owner',trust.ownerKey]]){
  const s=approval[name+'Signature'];
  if(typeof s!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(s)||
   !verify(null,Buffer.from(canonical(r)),createPublicKey(key),Buffer.from(s,'base64')))fail('SIGNATURE_INVALID');
 }
 return Object.freeze({...r}); // A signature check alone never produces a mutation capability.
}
async function protectedPath(path,directory=false){
 const p=resolve(path);
 if(await realpath(p)!==p)fail('SYMLINK_NO_GO');
 for(let current=p;;current=dirname(current)){
  const s=await lstat(current);
  if(s.isSymbolicLink()||s.uid!==0||(s.mode&0o022))fail('HOST_CUSTODY_NO_GO');
  if(current===p&&(directory?!s.isDirectory():!s.isFile()))fail('HOST_PATH_TYPE');
  if(dirname(current)===current)break;
 }
}
async function syncDir(dir){const f=await open(dir,'r');try{await f.sync();}finally{await f.close();}}
// Append-only exclusive records; incomplete records permanently burn the nonce.
// No rename-overwrite, repair, reuse, automatic cleanup or Windows fsync claim.
export function localJournal(dir){
 const write=async(name,value)=>{
  const h=await open(join(dir,name),'wx',0o600);
  try{await h.writeFile(canonical(value)+'\n');await h.sync();}finally{await h.close();}
  await syncDir(dir);
 };
 const read=async name=>JSON.parse(await readFile(join(dir,name),'utf8'));
 return Object.freeze({
  async consume(r){await write(r.nonce+'.consumed',{receiptDigest:digest(r)});},
  async intent(r,baseline){await write(r.nonce+'.intent',{receipt:r,baseline});},
  async bind(r,id){if(!ID.test(id))fail('INVALID_ID');await write(r.nonce+'.binding',{id,receiptDigest:digest(r)});},
  async binding(r,id){const x=await read(r.nonce+'.binding');return x.id===id&&x.receiptDigest===digest(r);},
  async readIntent(nonce){if(!NONCE.test(nonce??''))fail('NONCE_INVALID');return read(nonce+'.intent');},
  async event(r,name,value){await write(r.nonce+'.'+name,value);}
 });
}
// A timed-out client cannot cancel a daemon operation. The engine fences all
// subsequent mutations and reconciles read-only. Kill completion is separately logged.
export function boundedProcess(binary,context,{spawnProcess=spawn}={}){
 return (args,{stdin='',timeoutMs=10000}={})=>new Promise((resolveResult,reject)=>{
  if(timeoutMs<1||timeoutMs>30000||!Number.isInteger(timeoutMs))return reject(Error('DEADLINE_INVALID'));
  let child,timer,killTimer,termination,settled=false,bytes=0,out='',err='',exitCode=null,exitSignal=null;
  const done=(e)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(killTimer);
   if(e){e.commandEvidence={stdout:out,stderr:err,exitCode,signal:exitSignal,termination:termination??null};reject(e);}
   else resolveResult({stdout:out,stderr:err,exitCode,signal:exitSignal});};
  const terminate=code=>{
   if(termination||settled)return;termination=code;
   try{child.kill('SIGKILL');}catch{}
   killTimer=setTimeout(()=>done(Error('PROCESS_KILL_UNVERIFIED')),1000);
  };
  try{child=spawnProcess(binary,['--context',context,...args],{shell:false,windowsHide:true,
   env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C'},stdio:['pipe','pipe','pipe']});}
  catch{return done(Error('PROCESS_START_FAILED'));}
  timer=setTimeout(()=>terminate('PROCESS_TIMEOUT_UNKNOWN'),timeoutMs);
  for(const [stream,isErr] of [[child.stdout,false],[child.stderr,true]])stream.on('data',b=>{
   if(settled||termination)return;
   bytes+=b.length;if(bytes>1048576)return terminate('PROCESS_OUTPUT_UNKNOWN');
   if(isErr)err+=b;else out+=b;
  });
  child.stdin.on('error',()=>terminate('PROCESS_INPUT_UNKNOWN'));
  child.on('error',()=>done(Error('PROCESS_ERROR_UNKNOWN')));
  child.on('close',(code,signal)=>{exitCode=code;exitSignal=signal;done(termination?Error(termination):code===0&&!signal?null:Error('PROCESS_EXIT_UNKNOWN'));});
  child.stdin.end(stdin);
 });
}
function inventory(raw){
 const rows=raw.trim()?raw.trim().split(/\r?\n/).map(l=>JSON.parse(l)):[];
 if(rows.some(x=>!ID.test(x.ID??'')||typeof x.State!=='string'||typeof x.Names!=='string')||
  new Set(rows.map(x=>x.ID)).size!==rows.length)fail('INVENTORY_INVALID');
 return rows.map(({ID,State,Names})=>({ID,State,Names})).sort((a,b)=>a.ID.localeCompare(b.ID));
}
export function isolation(x,nonce){
 const h=x?.HostConfig,c=x?.Config;
 return x?.Name==='/'+NAME&&c?.Image===IMAGE&&x.Image===IMAGE&&c.User==='100:101'&&
  equal(c.Labels?.['faraios.t19.run-nonce'],nonce)&&h?.NetworkMode==='none'&&h.ReadonlyRootfs===true&&
  h.Memory===536870912&&h.MemorySwap===536870912&&h.NanoCpus===1000000000&&h.PidsLimit===64&&
  h.Privileged===false&&h.PublishAllPorts===false&&!(h.Binds??[]).length&&!(h.CapAdd??[]).length&&
  !h.AutoRemove&&![h.PidMode,h.IpcMode,h.UTSMode].includes('host')&&
  !(h.Devices??[]).length&&!(h.DeviceRequests??[]).length&&!(h.VolumesFrom??[]).length&&
  equal(h.CapDrop,['ALL'])&&equal(h.SecurityOpt,['no-new-privileges:true'])&&equal(h.Tmpfs,TMPFS)&&
  !Object.keys(h.PortBindings??{}).length&&!(x.Mounts??[]).some(m=>m.Type!=='tmpfs')&&
  !Object.values(x.NetworkSettings?.Ports??{}).some(p=>p?.length)&&
  // No caller environment. Vendor defaults are allowed only if attested below.
  Array.isArray(c.Env);
}

// Restart reconciliation is read-only even after grant expiry. It cannot resume
// startup/SQL/cleanup and cannot mint a second execution capability.
export async function recoverInterrupted({nonce,journal,run}){
 if(!NONCE.test(nonce??''))fail('NONCE_INVALID');
 const intent=await journal.readIntent(nonce),r=intent.receipt;
 if(r?.nonce!==nonce||r.scope!==SCOPE||!Array.isArray(intent.baseline))fail('INTENT_INVALID');
 const result={status:'QUARANTINE',mutationAllowed:false,candidates:[]};
 const raw=await run(['container','ls','--all','--no-trunc','--filter','label=faraios.t19.run-nonce='+nonce,'--format','{{json .}}']);
 for(const candidate of inventory(raw.stdout)){
  if(intent.baseline.some(old=>old.ID===candidate.ID)){
   result.candidates.push({id:candidate.ID,identityMatches:false,durableBinding:false,preExisting:true});continue;
  }
  const x=JSON.parse((await run(['container','inspect',candidate.ID,'--format','{{json .}}'])).stdout);
  result.candidates.push({id:candidate.ID,identityMatches:x.Id===candidate.ID&&isolation(x,nonce),
   durableBinding:await journal.binding(r,candidate.ID).catch(()=>false),running:x.State?.Running});
 }
 result.inventory=inventory((await run(['container','ls','--all','--no-trunc','--format','{{json .}}'])).stdout);
 result.baselinePreserved=intent.baseline.every(old=>result.inventory.some(c=>equal(c,old)));
 await journal.event(r,'restart-recovery',result);
 return result;
}

// Dependency seam for behavioural tests. No native process is selected here.
// Real execution uses executeGate2 below with fixed host trust and paths.
export async function integratedRun({approval,trust,bundleSha256,binarySha256,hostBootSha256,run,journal,sql,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const report={status:'NO_GO',mutationAttempted:false,cleanupVerified:false,stages:[],runtimeEvidence:false};
 let r,id,baseline,created=false,recordCommands=false,sequence=0;
 const preflight=[];
 const event=async(name,value)=>journal.event(r,name,value);
 const window=()=>{if(now()>=r.expiresAt)fail('APPROVAL_EXPIRED');};
 const invoke=async(args,opts={})=>{
  const n=String(++sequence).padStart(4,'0');
  const intent={args,timeoutMs:opts.timeoutMs??10000,...(opts.stdin?{stdinSha256:digest(opts.stdin)}:{})};
  if(recordCommands)await event('command-'+n+'-intent',intent);
  try{
   const x=await run(args,opts);
   const result={...intent,stdout:x.stdout,stderr:x.stderr,exitCode:x.exitCode??0,signal:x.signal??null};
   if(recordCommands)await event('command-'+n+'-result',result);else preflight.push(result);
   return x;
  }catch(e){
   const result={...intent,error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'PROCESS_FAILURE',...(e.commandEvidence??{})};
   if(recordCommands)await event('command-'+n+'-error',result);else preflight.push(result);
   throw e;
  }
 };
 const daemon=async()=>{
  const d=JSON.parse((await invoke(['info','--format','{"ID":{{json .ID}},"OSType":{{json .OSType}},"ServerVersion":{{json .ServerVersion}}}'])).stdout);
  if(typeof d.ID!=='string'||!d.ID||d.ID.length>256||d.OSType!=='linux'||digest(d.ID)!==r.daemonIdSha256)fail('DOCKER_DAEMON_CHANGED');
 };
 const dispatch=async(args,opts)=>{
  if(args[0]==='container'&&['create','start','exec','stop','rm'].includes(args[1])){window();await daemon();window();}
  return invoke(args,opts);
 };
 const call=async(args,opts)=>(await dispatch(args,opts)).stdout;
 const list=async()=>inventory(await call(['container','ls','--all','--no-trunc','--format','{{json .}}']));
 const inspect=async id=>{
  if(!ID.test(id??''))fail('INVALID_ID');
  const x=JSON.parse(await call(['container','inspect',id,'--format','{{json .}}']));
  if(x.Id!==id||!isolation(x,r.nonce))fail('OWNERSHIP_OR_ISOLATION');
  // Bind image defaults including entrypoint/cmd/env to independently reviewed image metadata.
  if(!equal(x.Config.Entrypoint,trust.imageEntrypoint)||!equal(x.Config.Cmd,trust.imageCmd)||
   !equal(x.Config.Env,[...trust.imageEnv.filter(v=>!v.startsWith('POSTGRES_HOST_AUTH_METHOD=')),...ENV]))fail('IMAGE_CONFIG_CHANGED');
  return x;
 };
 try{
  r=checkApproval({approval,trust,bundleSha256,binarySha256,hostBootSha256,now:now()});
  if(typeof sql!=='string'||!sql.length)fail('SQL_MISSING');
  if(!Array.isArray(trust.imageEnv)||trust.imageEnv.some(v=>typeof v!=='string'||
   /TOKEN|SECRET|PASSWORD|PRIVATE_KEY/i.test(v.split('=')[0])))fail('CREDENTIAL_ENVIRONMENT_DENIED');
  // Context must be a locally installed Unix socket. No remote Docker host.
  const context=JSON.parse(await call(['context','inspect',r.context]));
  if(r.context!=='default'||context.length!==1||context[0].Name!==r.context||context[0].Endpoints?.docker?.Host!==trust.dockerHost||
   trust.dockerHost!=='unix:///var/run/docker.sock')fail('DOCKER_CONTEXT_CHANGED');
  await daemon();
  const image=JSON.parse(await call(['image','inspect',IMAGE]));
  if(image.length!==1||image[0].Id!==IMAGE||image[0].Os!=='linux'||image[0].Architecture!=='amd64'||
   !equal(image[0].Config.Entrypoint,trust.imageEntrypoint)||!equal(image[0].Config.Cmd,trust.imageCmd)||
   !equal(image[0].Config.Env,trust.imageEnv))fail('IMAGE_IDENTITY_CHANGED');
  baseline=await list();
  if(baseline.length!==r.baselineCount||baseline.some(c=>c.Names.split(',').includes(NAME))||digest(baseline)!==r.inventorySha256)fail('BASELINE_CHANGED');
  // Recheck expiry immediately before single-use consumption. Any failure burns the grant.
  checkApproval({approval,trust,bundleSha256,binarySha256,hostBootSha256,now:now()});
  try{await journal.consume(r);}catch{fail('NONCE_ALREADY_USED_OR_UNCERTAIN');}report.stages.push('NONCE_DURABLE');
  await journal.intent(r,baseline);report.stages.push('INTENT_DURABLE');
  recordCommands=true;await event('preflight',preflight);
  if(now()>=r.expiresAt)fail('APPROVAL_EXPIRED');
  created=true;report.mutationAttempted=true;
  id=(await call(createArgs(r.nonce),{timeoutMs:15000})).trim();
  if(!ID.test(id))fail('CREATE_UNKNOWN');
  if(baseline.some(old=>old.ID===id))fail('PREEXISTING_CONTAINER_ID');
  await journal.bind(r,id);report.containerId=id;
  if((await inspect(id)).State?.Running!==false)fail('PRE_START_STATE');
  await call(['container','start',id],{timeoutMs:15000});
  const deadline=now()+20000;let ready=false;
  for(let attempt=0;attempt<20&&now()<deadline;attempt++){
   if(!(await inspect(id)).State?.Running)fail('STARTUP_STOPPED');
   try{await call(['container','exec',id,'pg_isready','-U','supabase_admin','-h','/var/run/postgresql'],{timeoutMs:Math.max(1,Math.min(3000,deadline-now()))});ready=true;break;}
   catch(e){if(e.message!=='PROCESS_EXIT_UNKNOWN')throw e;}
   await sleep(250);
  }
  if(!ready)fail('READINESS_TIMEOUT');report.stages.push('READY');
  await inspect(id);window();
  const sqlResult=await dispatch(['container','exec','--interactive',id,'psql','-X','-v','ON_ERROR_STOP=1','-U','supabase_admin','-h','/var/run/postgresql','-d','postgres'],{stdin:sql,timeoutMs:30000});
  const combined=sqlResult.stdout+'\n'+sqlResult.stderr;
  const lines=combined.split(/\r?\n/).map(line=>line.replace(/^NOTICE:\s+/,'').trim());
  for(const marker of ['T19_ALLOWED_WRITE_PASS','T19_SQLSTATE_42501_PASS','T19_DUPLICATE_23505_PASS','T19_COLLISION_42P06_PASS','T19_COLLISION_55000_PASS','T19_ROLLBACK_PASS']){
   if(lines.filter(line=>line===marker).length!==1)fail('SQL_EVIDENCE_MISSING');
  }
  await event('sql',{stdout:sqlResult.stdout,stderr:sqlResult.stderr});report.stages.push('SQL_EVIDENCE');
  await inspect(id);await event('logs',{stdout:await call(['container','logs',id])});
  if(!await journal.binding(r,id))fail('DURABLE_BINDING_CHANGED');
  await inspect(id);await call(['container','stop','--time','10',id],{timeoutMs:20000});
  if((await inspect(id)).State?.Running!==false)fail('STOP_UNVERIFIED');
  await event('stopped',{id});
  if(!await journal.binding(r,id))fail('DURABLE_BINDING_CHANGED');
  if((await inspect(id)).State?.Running!==false)fail('STOP_UNVERIFIED');
  await call(['container','rm',id],{timeoutMs:15000});
  const after=await list();await event('inventory-after',after);
  if(!equal(baseline,after))fail('INVENTORY_DRIFT');
  report.cleanupVerified=true;report.status='PASS';report.stages.push('RECONCILED');
 }catch(e){
  report.status=created?'QUARANTINE':'NO_GO';report.reason=/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNCLASSIFIED_FAILURE';
  if(created){
   // Recovery never restarts, stops or removes after uncertainty. Persist exact
   // nonce/ID candidates for a separately authorized recovery procedure.
   try{
    const after=await list();
    const found=await call(['container','ls','--all','--no-trunc','--filter','label=faraios.t19.run-nonce='+r.nonce,'--format','{{json .}}']);
    const candidates=inventory(found),bound=[];
    for(const candidate of candidates){if(baseline.some(old=>old.ID===candidate.ID)){bound.push({id:candidate.ID,owned:false,preExisting:true});continue;}
     try{const x=await inspect(candidate.ID);bound.push({id:x.Id,owned:!id||id===x.Id,running:x.State?.Running});}catch{bound.push({id:candidate.ID,owned:false});}}
    if(ID.test(id??'')&&!baseline.some(old=>old.ID===id)){
     try{await inspect(id);await event('failure-logs',await dispatch(['container','logs',id]));}catch{}
    }
    await event('quarantine',{reason:report.reason,recordedId:id??null,candidates:bound,inventory:after});
    report.recovery=bound;
   }catch{report.recovery='UNVERIFIED';}
  }
 }
 return report;
}

export async function executeGate2(approval){
 // Windows/reparse points and cross-host/backup ledger monotonicity are not
 // attested. Do not pretend POSIX file fsync establishes those properties.
 if(process.platform!=='linux')return {status:'NO_GO',reason:'HOST_DURABILITY_NOT_REVIEWED',mutationAttempted:false};
 try{
  // The reviewed bundle must be installed outside a caller-writable checkout.
  // Host administrators and the Node runtime remain inside the trust boundary.
  await protectedPath(fileURLToPath(import.meta.url));
  await protectedPath(join(root,'database/t19-gate2-disposable-integrity.sql'));
  await protectedPath(TRUST);await protectedPath(STATE,true);
  if(((await lstat(STATE)).mode&0o077)!==0)fail('STATE_PERMISSIONS');
  const trust=JSON.parse(await readFile(TRUST,'utf8'));
  await protectedPath(trust.dockerBinary);
  if(!ID.test(trust.binarySha256??'')||digest(await readFile(trust.dockerBinary))!==trust.binarySha256)fail('DOCKER_BINARY_CHANGED');
  return await integratedRun({approval,trust,bundleSha256:await bundleDigest(),binarySha256:trust.binarySha256,
   hostBootSha256:digest((await readFile('/proc/sys/kernel/random/boot_id','utf8')).trim()),
   run:boundedProcess(trust.dockerBinary,trust.context),journal:localJournal(STATE),
   sql:await readFile(join(root,'database/t19-gate2-disposable-integrity.sql'),'utf8')});
 }catch{return {status:'NO_GO',reason:'HOST_TRUST_UNAVAILABLE',mutationAttempted:false};}
}
