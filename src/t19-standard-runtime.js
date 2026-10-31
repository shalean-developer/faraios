// Staging-only composition. No private-file or network access at import time.
import {open,lstat,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname} from 'node:path';
import {standardConfig,createTokenCipher} from './t19-standard-secrets.js';
import {createStandardProvider} from './t19-standard-provider.js';
import {createStandardBackendClient} from './t19-standard-backend-client.js';
import {createStandardHttpsStore} from './t19-standard-https-store.js';
import {createStandardConnection} from './t19-standard-connection.js';
import {createStandardInvoiceWorker,createStandardInvoiceJobs} from './t19-standard-worker.js';
import {createStandardHandler} from './t19-standard-handler.js';
const privateRoot='/var/www/vhosts/faraios.com/.faraios-t19-standard/';
export const loadStandardHttpsConfiguration=()=>loadPrivateJson(privateRoot+'staging.json');
export const loadStandardWorkerConfiguration=()=>loadPrivateJson(privateRoot+'invoice-worker.json');
export const loadStandardPrivateProvisioning=()=>loadPrivateJson(privateRoot+'provision-staging.json');
async function loadPrivateJson(path){
 let handle;
 try{
  if(process.platform!=='linux'||await realpath(path)!==path)throw Error();
  for(let dir=dirname(path);;dir=dirname(dir)){
   const s=await lstat(dir);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o022)!==0||![0,process.getuid()].includes(s.uid))throw Error();if(dirname(dir)===dir)break;
  }
  handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const before=await handle.stat();
  if(!before.isFile()||before.nlink!==1||(before.mode&0o077)!==0||![0,process.getuid()].includes(before.uid)||before.size>65536)throw Error();
  const bytes=Buffer.alloc(65537);let size=0;
  while(size<bytes.length){const r=await handle.read(bytes,size,bytes.length-size,null);if(!r.bytesRead)break;size+=r.bytesRead;}
  const after=await handle.stat(),named=await lstat(path);
  if(size>65536||['dev','ino','uid','gid','mode','size','mtimeMs','ctimeMs'].some(k=>before[k]!==after[k]||before[k]!==named[k]))throw Error();
  return JSON.parse(bytes.subarray(0,size).toString('utf8'));
 }catch{throw Error('accounting_private_configuration_unavailable');}finally{await handle?.close();}
}
async function components(settings,{fetchImpl=globalThis.fetch,provisioning=false}={}){
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
 if(!exact(settings,['version','enabled','backend','zoho'])||settings.version!==1||settings.enabled!==!provisioning||!exact(settings.backend,['email','password','principalId'])||!exact(settings.zoho,['clientId','clientSecret','encryptionKey','keyId']))throw Error('accounting_runtime_configuration_rejected');
 const config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.faraios.com',ZOHO_API_DOMAIN:'https://www.zohoapis.com',ZOHO_CLIENT_ID:settings.zoho.clientId,ZOHO_CLIENT_SECRET:settings.zoho.clientSecret,ZOHO_TOKEN_ENCRYPTION_KEY:settings.zoho.encryptionKey,ZOHO_TOKEN_KEY_ID:settings.zoho.keyId});
 const backend=await createStandardBackendClient({...settings.backend,fetchImpl});
 // Startup must demonstrate enrollment before any browser OAuth route is admitted.
 const enrollment=await backend.rpc('t19_standard_store',{action:'health',input:{}});
 if(enrollment.error||enrollment.data?.ready!==true)throw Error('accounting_backend_enrollment_required');
 const store=createStandardHttpsStore({rpc:backend.rpc}),cipher=createTokenCipher(config),provider=createStandardProvider({...config,fetchImpl});
 return {config,store,cipher,provider,rpc:backend.rpc};
}
// Private setup is permitted only while the app configuration is disabled.
export const createStandardProvisioningComponents=(settings,options={})=>components(settings,{...options,provisioning:true});
export async function createStandardHttpsRuntime(settings,options={}){
 return createStandardHandler({...await components(settings,options),onboardingMode:'private'});
}

export async function createStandardWorkerRuntime(settings,options={}){
 const c=await components(settings,options);
 const jobs=createStandardInvoiceJobs({rpc:c.rpc,scope:c.store.leaseScope});
 const connection=createStandardConnection({...c,sessions:{read:async()=>null}});
 return createStandardInvoiceWorker({connection,jobs,fetchImpl:options.fetchImpl});
}
