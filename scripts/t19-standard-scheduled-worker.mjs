// Staging scheduler entry point. Fixed protected log, bounded retention, no secrets.
import {spawn} from 'node:child_process';
import {open,lstat,rename} from 'node:fs/promises';
import {constants} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadStandardWorkerConfiguration} from '../src/t19-standard-runtime.js';
const root='/var/www/vhosts/faraios.com/.faraios-t19-standard/',path=root+'invoice-worker.log';
async function safeStat(p){
 const s=await lstat(p).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(s&&(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&0o077)!==0))throw Error();return s;
}
let log;
try{
 if(process.argv.length!==2||Number(process.versions.node.split('.')[0])!==24)throw Error();
 // Reuse parent-directory, owner, no-follow and fixed-path verification before writes.
 const config=await loadStandardWorkerConfiguration();if(config?.environment!=='staging'||config.enabled!==true)throw Error();
 const old=await safeStat(path);await safeStat(path+'.previous');
 if(old?.size>65536)await rename(path,path+'.previous');
 log=await open(path,constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|constants.O_NOFOLLOW,0o600);
 const s=await log.stat();if(!s.isFile()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&0o077)!==0)throw Error();
 const start=new Date().toISOString();await log.write(JSON.stringify({event:'start',at:start,pid:process.pid})+'\n');
 const child=spawn(process.execPath,[fileURLToPath(new URL('t19-standard-invoice-worker.mjs',import.meta.url)),'--run-once'],{stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:110000,killSignal:'SIGKILL'});
 let output='',oversized=false;
 child.stdout.on('data',d=>{output+=d;if(output.length>16384){oversized=true;output='';child.kill();}});
 // CLI stderr is intentionally not retained; record a fixed safe failure marker.
 child.stderr.on('data',()=>{});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 const results=[];
 if(!oversized)for(const line of output.trim().split('\n')){
  let value;try{value=JSON.parse(line);}catch{continue;}
  if(typeof value.businessId!=='string'||!config.businessIds.includes(value.businessId)||!['idle','matched','failed','review_required','unavailable'].includes(value.status))throw Error();
  results.push({businessId:value.businessId,status:value.status,...(typeof value.jobId==='string'&&/^[0-9a-f-]{36}$/i.test(value.jobId)?{jobId:value.jobId}:{})});
 }
 const ok=code===0&&!oversized&&results.length===config.businessIds.length;
 const record={event:'finish',startedAt:start,at:new Date().toISOString(),pid:process.pid,ok,results};
 await log.write(JSON.stringify(record)+'\n');await log.sync();await log.close();log=null;
 console.log(JSON.stringify(record));process.exit(ok?0:1);
}catch{
 if(log){await log.write(JSON.stringify({event:'failed',at:new Date().toISOString(),code:'worker_unavailable'})+'\n').catch(()=>{});await log.close().catch(()=>{});}
 console.error('T19_SCHEDULED_WORKER_UNAVAILABLE');process.exit(1);
}
