// Explicit T20 TEST runtime. No file or network access at import.
import {open,lstat,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,join} from 'node:path';
import {createPaymentBackend} from './t20-payment-backend.js';
import {createPaymentController} from './t20-payment-controller.js';
import {createPaymentHandler} from './t20-payment-handler.js';
const root='/var/www/vhosts/faraios.com/.faraios-t20-payments';
export async function readPaymentPrivateJson(path){
 let h;
 try{
  if(process.platform!=='linux'||await realpath(path)!==path)throw Error();
  for(let d=dirname(path);;d=dirname(d)){const s=await lstat(d);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o022)||![0,process.getuid()].includes(s.uid))throw Error();if(dirname(d)===d)break;}
  h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const before=await h.stat();
  if(!before.isFile()||before.nlink!==1||(before.mode&0o077)||before.uid!==process.getuid()||before.size>8192)throw Error();
  const bytes=Buffer.alloc(8193);let size=0;
  while(size<bytes.length){const r=await h.read(bytes,size,bytes.length-size,null);if(!r.bytesRead)break;size+=r.bytesRead;}
  const after=await h.stat(),named=await lstat(path);
  if(size>8192||['dev','ino','uid','mode','size','mtimeMs','ctimeMs'].some(k=>before[k]!==after[k]||before[k]!==named[k]))throw Error();
  return JSON.parse(bytes.subarray(0,size).toString('utf8'));
 }catch{throw Error('payment_private_configuration_rejected');}finally{await h?.close();}
}
export function validatePaymentSettings(settings,accounts){
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
 if(!exact(settings,['environment','enabled','backend','accounts'])||settings.environment!=='staging'||typeof settings.enabled!=='boolean'||!exact(settings.backend,['email','password','principalId'])||!Array.isArray(settings.accounts)||!Array.isArray(accounts)||settings.accounts.length!==accounts.length||accounts.length>2)throw Error('payment_runtime_configuration_rejected');
 const configured=new Set(settings.accounts);
 if(configured.size!==accounts.length||accounts.some(a=>!exact(a,['environment','domain','enabled','businessId','accountId','secretKey'])||!configured.has(a.businessId)||a.enabled!==true||a.domain!=='test'||a.environment!=='staging'))throw Error('payment_runtime_configuration_rejected');
 return settings.enabled;
}
export async function createPaymentRuntime(settings,accounts,{fetchImpl,backendFactory=createPaymentBackend}={}){
 if(!validatePaymentSettings(settings,accounts))return {handler:null,close:async()=>{}};
 if(!accounts.length)throw Error('payment_runtime_configuration_rejected');
 let backend;
 try{
  backend=await backendFactory({...settings.backend,fetchImpl});
  for(const a of accounts)if((await backend.rpc('health',{businessId:a.businessId,accountId:a.accountId}))?.ready!==true)throw Error();
  const controller=createPaymentController({accounts,backend,fetchImpl});
  return {handler:createPaymentHandler({controller}),close:()=>backend.close()};
 }catch{await backend?.close().catch(()=>{});throw Error('payment_runtime_startup_rejected');}
}
export async function loadPaymentRuntime(){
 const settings=await readPaymentPrivateJson(join(root,'staging.json'));
 // Disabled settings never cause account-key reads or authentication.
 if(settings.enabled===false){validatePaymentSettings(settings,[]);return {handler:null,close:async()=>{}};}
 const accounts=[];
 for(const name of ['shalean-test.json','bokkie-test.json']){const a=await readPaymentPrivateJson(join(root,name));if(settings.accounts?.includes(a.businessId))accounts.push(a);}
 return createPaymentRuntime(settings,accounts);
}
