// Gate 2 restricted real Docker adapter. NOT an entrypoint or execution authorization.
// Requires caller-supplied frozen run scope; execute only after independent review/owner grant.
import {spawn} from 'node:child_process';
const IMAGE='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const NAME='faraios-t19-managed-qa',ID=/^[a-f0-9]{64}$/,NONCE=/^[a-f0-9]{32}$/;
export function makeDockerProcess({spawnProcess=spawn}={}){
 return async(argv,deadlineMs=15000)=>{
  if(!Array.isArray(argv)||argv.some(a=>typeof a!=='string'||!a)||!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)throw Error('INVALID_DOCKER_COMMAND');
  return await new Promise((resolve,reject)=>{
   let child,stdout='',stderr='',timer,settled=false;
   const finish=(err,out)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(out);};
   try{child=spawnProcess('docker',argv,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});}
   catch(e){finish(e);return;}
   timer=setTimeout(()=>{try{child.kill('SIGKILL');}catch{}finish(Error('DOCKER_TIMEOUT_UNKNOWN_STATE'));},deadlineMs);
   child.stdout?.on('data',v=>{stdout+=v;if(stdout.length>1048576){try{child.kill();}catch{}finish(Error('DOCKER_OUTPUT_LIMIT'));}});
   child.stderr?.on('data',v=>{stderr+=v;if(stderr.length>1048576){try{child.kill();}catch{}finish(Error('DOCKER_OUTPUT_LIMIT'));}});
   child.on('error',e=>finish(e));
   child.on('close',code=>finish(code===0?null:Error('DOCKER_COMMAND_FAILED: '+stderr.slice(0,300)),stdout.trim()));
  });
 };
}
export function makeRestrictedDocker({run,nonce,image=IMAGE,name=NAME, grant}={}){
 if(typeof run!=='function'||!NONCE.test(nonce??'')||image!==IMAGE||name!==NAME||
  !grant||grant.consumed!==true||grant.nonce!==nonce||
  grant.scope!=='local-disposable-postgres-startup-only')throw Error('RESTRICTED_DOCKER_NO_GO');
 const exact=id=>{if(!ID.test(id??''))throw Error('INVALID_CONTAINER_ID');return id;};
 const byId=async id=>JSON.parse((await run(['container','inspect',exact(id),'--format','{{json .}}'],10000)));
 const owned=async id=>{const x=await byId(id);if(x.Id!==id||x.Name!=='/'+name||x.Config?.Image!==image||
  x.Config?.Labels?.['faraios.t19.run-nonce']!==nonce)throw Error('OWNERSHIP_QUARANTINE');return x;};
 return Object.freeze({
  async create(){const args=['create','--name',name,'--pull','never','--network','none',
   '--read-only','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64',
   '--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','100:101',
   '--label','faraios.t19.run-nonce='+nonce,
   '--tmpfs','/var/lib/postgresql/data:rw,nosuid,uid=100,gid=101,mode=0700,size=384m',
   '--tmpfs','/var/run/postgresql:rw,nosuid,uid=100,gid=101,mode=0775,size=32m',
   '--tmpfs','/tmp:rw,nosuid,uid=100,gid=101,mode=1777,size=32m',
   '-e','POSTGRES_HOST_AUTH_METHOD=trust',image];
   const result=await run(args,15000);return exact(result);
  },
  inspect:byId,
  async verifyIsolation(x){
   const h=x?.HostConfig??{},c=x?.Config??{};
   return x?.Name==='/'+name&&c.Image===image&&c.User==='100:101'&&
    h.NetworkMode==='none'&&h.ReadonlyRootfs===true&&h.Privileged===false&&
    h.Memory===536870912&&h.MemorySwap===536870912&&h.NanoCpus===1000000000&&
    h.PidsLimit===64&&h.PublishAllPorts===false&&!Object.keys(h.PortBindings??{}).length&&
    !(h.Binds??[]).length&&(h.CapDrop??[]).includes('ALL')&&
    (h.SecurityOpt??[]).includes('no-new-privileges:true');
  },
  async start(id){await owned(id);await run(['container','start',id],15000);},
  async awaitReady(id){await owned(id);const x=await run(['container','exec',id,'pg_isready','-U','supabase_admin','-h','/var/run/postgresql'],10000);if(!x)throw Error('READINESS_EMPTY');return x;},
  async stop(id){await owned(id);await run(['container','stop','--time','10',id],20000);},
  async remove(id){const x=await owned(id);if(x.State?.Running!==false)throw Error('RUNNING_CONTAINER_QUARANTINE');await run(['container','rm',id],15000);},
  async exists(id){try{await byId(id);return true;}catch(e){if(e.message.startsWith('DOCKER_COMMAND_FAILED:'))return true;throw e;}},
  async findByNonce(n){if(n!==nonce)throw Error('NONCE_MISMATCH');const ids=(await run(['container','ls','--all','--no-trunc','--filter','label=faraios.t19.run-nonce='+nonce,'--format','{{.ID}}'],10000)).split(/\r?\n/).filter(Boolean);return Promise.all(ids.map(byId));},
  async runSyntheticSql(){throw Error('SQL_INTEGRITY_EXECUTOR_NOT_REVIEWED');}
 });
}
