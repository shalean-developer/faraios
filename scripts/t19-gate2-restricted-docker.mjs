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
// Superseded by the integrated v2 gateway. Caller-supplied grant booleans
// cannot grant access to a native adapter. Retain the symbol for old imports.
export function makeRestrictedDocker(){
 throw Error('RESTRICTED_DOCKER_NO_GO_USE_AUTHENTICATED_V2_GATEWAY');
}
