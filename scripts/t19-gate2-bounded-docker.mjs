// T19 Gate 2: bounded Docker subprocess adapter, not wired to startup or cleanup.
import {spawn} from 'node:child_process';
const READ_ONLY=new Set(['image inspect','container inspect','container ls','container logs']);
export function makeBoundedDocker({spawnProcess=spawn}={}){
 return async function docker(argv,{timeoutMs=10000}={}){
  if(!Array.isArray(argv)||argv.some(x=>typeof x!=='string'||!x)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)
   throw Error('INVALID_DOCKER_ARGS_OR_TIMEOUT');
  if(!READ_ONLY.has(argv.slice(0,2).join(' ')))throw Error('EXECUTION_NO_GO');
  return await new Promise((resolve,reject)=>{
   let settled=false,stdout='',stderr='',timer;
   const done=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(value);};
   let child;
   try{child=spawnProcess('docker',argv,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});}
   catch(e){done(e);return;}
   timer=setTimeout(()=>{try{child.kill('SIGKILL');}catch{}done(Error('DOCKER_TIMEOUT_QUARANTINE'));},timeoutMs);
   child.stdout?.on('data',d=>{stdout+=d;if(stdout.length>1048576){try{child.kill();}catch{}done(Error('DOCKER_OUTPUT_LIMIT'));}});
   child.stderr?.on('data',d=>{stderr+=d;if(stderr.length>1048576){try{child.kill();}catch{}done(Error('DOCKER_OUTPUT_LIMIT'));}});
   child.on('error',e=>done(e));
   child.on('close',code=>done(code===0?null:Error('DOCKER_READ_FAILURE'),stdout.trim()));
  });
 };
}
