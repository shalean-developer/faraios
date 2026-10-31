// Private operator preparation only. No activation, import, provider call or secret output.
import {randomBytes} from 'node:crypto';
import {mkdtemp,mkdir,lstat,realpath,open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,basename,isAbsolute} from 'node:path';
import {standardConfig} from './t19-standard-secrets.js';
import {createCredentialBackup,restoreCredentialBackup,assertRecoveryMatchesCurrent} from './t19-standard-recovery.js';
import {writeRecoveryPair,readRecoveryPair} from './t19-standard-recovery-files.js';
const reject=()=>new Error('accounting_recovery_handoff_rejected');
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
async function privateFile(path,body){
 const h=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await h.chmod(0o600);await h.writeFile(body);await h.sync();const s=await h.stat();if(!s.isFile()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&0o077)!==0)throw reject();}finally{await h.close();}
}
export async function prepareCredentialHandoff({root,records,config,readCurrent}){
 let restored;
 try{
  if(process.platform!=='linux'||!isAbsolute(root)||await realpath(root)!==root||typeof readCurrent!=='function')throw reject();
  const parent=await lstat(root);if(!parent.isDirectory()||parent.isSymbolicLink()||parent.uid!==process.getuid()||(parent.mode&0o077)!==0)throw reject();
  // Verify ciphertext and passphrase before making any files. Output never includes either.
  const passphrase=randomBytes(48).toString('base64'),backup=await createCredentialBackup(records,config,passphrase);
  const folder=await mkdtemp(join(root,'recovery-export-')),dataDir=join(folder,'data'),keyDir=join(folder,'escrow'),handoffDir=join(folder,'owner-handoff');
  for(const path of [dataDir,keyDir,handoffDir])await mkdir(path,{mode:0o700});
  await writeRecoveryPair(dataDir,keyDir,backup);
  // Owner transfers this secret directly to a password manager. Never include it in Drive.
  await privateFile(join(handoffDir,'recovery-secret.txt'),passphrase+'\n');
  const saved=await readRecoveryPair(dataDir,keyDir);restored=await restoreCredentialBackup(saved.data,saved.escrow,passphrase);
  assertRecoveryMatchesCurrent(restored,await readCurrent());
  const after=await lstat(root);if(['dev','ino','uid','gid','mode'].some(k=>parent[k]!==after[k]))throw reject();
  const receipt={prepared:true,environment:'staging',connections:records.length,backupId:backup.data.backupId,folder:basename(folder),sameHostRestore:true,offHostVerified:false,activeWrites:0};
  // Receipt is written last; absent receipt means incomplete, never an accepted backup.
  await privateFile(join(folder,'receipt.json'),JSON.stringify(receipt)+'\n');
  return receipt;
 }catch{throw reject();}finally{restored?.key.fill(0);}
}
export async function preparePrivateStagingRecovery({root,loadSettings,loadWorker,createBackend}){
 let config;
 try{
  const settings=await loadSettings(),worker=await loadWorker();
  if(!exact(settings,['version','enabled','backend','zoho'])||settings.version!==1||settings.enabled!==true||!exact(settings.backend,['email','password','principalId'])||!exact(settings.zoho,['clientId','clientSecret','encryptionKey','keyId'])||!exact(worker,['version','environment','enabled','businessIds'])||worker.version!==1||worker.environment!=='staging'||typeof worker.enabled!=='boolean'||!Array.isArray(worker.businessIds)||!worker.businessIds.length||worker.businessIds.length>20||worker.businessIds.some(b=>!uuid(b))||new Set(worker.businessIds).size!==worker.businessIds.length)throw reject();
  config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.faraios.com',ZOHO_API_DOMAIN:'https://www.zohoapis.com',ZOHO_CLIENT_ID:settings.zoho.clientId,ZOHO_CLIENT_SECRET:settings.zoho.clientSecret,ZOHO_TOKEN_ENCRYPTION_KEY:settings.zoho.encryptionKey,ZOHO_TOKEN_KEY_ID:settings.zoho.keyId});
  const backend=await createBackend(settings.backend);
  async function read(action,input){const r=await backend.rpc('t19_standard_store',{action,input});if(r.error||r.data===undefined)throw reject();return r.data;}
  if((await read('health',{}))?.ready!==true)throw reject();
  async function current(){
   const rows=[];
   for(const businessId of worker.businessIds){
    const value=await read('connection',{environment:'staging',businessId});
    if(!value||value.businessId!==businessId||value.environment!=='staging'||value.clientId!==config.clientId||value.apiDomain!==config.apiDomain)throw reject();
    const row={};for(const field of ['environment','businessId','connectionId','generation','organizationId','apiDomain','clientId','status','envelope'])row[field]=value[field];rows.push(row);
   }return rows;
  }
  return await prepareCredentialHandoff({root,records:await current(),config,readCurrent:async()=>{
   const latest=await loadSettings(),latestWorker=await loadWorker();
   if(JSON.stringify(latest)!==JSON.stringify(settings)||JSON.stringify(latestWorker)!==JSON.stringify(worker))throw reject();
   return current();
  }});
 }catch{throw reject();}finally{config?.key.fill(0);}
}
