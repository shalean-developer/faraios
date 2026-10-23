// Local Milestone A operator entrypoint. Never imports the accounting sync worker.
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createAuthSessions} from '../src/auth-session.js';
import {openVault} from '../src/t19-vault.js';
import {createConnectionService,validateManifest,origin} from '../src/t19-connection.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const files=['scripts/t19-connection.mjs','scripts/t19-import-client.ps1','scripts/t19-dpapi.ps1','src/t19-connection.js','src/t19-page.js','src/t19-provider.js','src/t19-vault.js','src/auth-session.js','src/identity.js','src/access.js','src/zoho-books.js','package-lock.json'];
export async function probeDigest(){const hash=createHash('sha256');for(const path of files){hash.update(path+'\0');hash.update(await readFile(join(root,path)));}return hash.digest('hex');}
export function importClient(db,manifest,secret){
 if(!secret||Object.keys(secret).length!==1||typeof secret.clientSecret!=='string'||!secret.clientSecret||/[\r\n\0]/.test(secret.clientSecret))throw new Error('Client import rejected');
 db=structuredClone(db);db.clients??={};if(db.clients[manifest.clientId])throw new Error('Client import rejected');
 db.clients[manifest.clientId]={clientSecret:secret.clientSecret,businessId:manifest.businessId,organizationId:manifest.organizationId};return db;
}
export function attestCleanup(db,manifest,evidence){
 db=structuredClone(db);const c=db.connections[manifest.businessId];
 if(!c||c.status!=='disabled'||!c.cleanup||c.binding.businessId!==manifest.businessId||c.binding.organizationId!==manifest.organizationId||c.binding.identity!==manifest.identity||c.clientId!==manifest.clientId||evidence.connectionId!==c.id||evidence.generation!==c.generation||evidence.identity!==manifest.identity||evidence.custodian!==manifest.custodian||evidence.providerRevocationConfirmed!==true||typeof evidence.reference!=='string'||!evidence.reference.trim()||evidence.reference.length>500)throw new Error('Cleanup attestation rejected');
 delete c.cleanup;if(!Object.values(db.connections).some(other=>other.id!==c.id&&other.clientId===c.clientId))delete db.clients?.[c.clientId];c.events.push({event:'custodian_attested_provider_revocation',time:Date.now(),generation:c.generation,reference:evidence.reference});return db;
}
async function main(){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--describe'){console.log(JSON.stringify({origin,probeSha:await probeDigest(),providerExecution:'disabled unless exact manifest hash approved',writes:'none',refresh:'none'}));return;}
 const allowed=new Set(['manifest','execute-approved','import-client','check-import','cleanup-evidence']);const values={};
 for(const arg of args){const match=/^--([a-z-]+)=(.+)$/.exec(arg);if(!match||!allowed.has(match[1])||Object.hasOwn(values,match[1]))throw new Error();values[match[1]]=match[2];}
 if(!values.manifest||['import-client','check-import','cleanup-evidence'].filter(k=>values[k]).length>1)throw new Error();
 const raw=await readFile(resolve(values.manifest));if(raw.length>32768)throw new Error();
 const manifest=validateManifest(JSON.parse(raw));const approved=values['execute-approved'];
 const execution=Boolean(approved);
 if(execution){if(approved!==createHash('sha256').update(raw).digest('hex')||manifest.probeSha!==await probeDigest())throw new Error();validateManifest(manifest,{execution:true,...(values['cleanup-evidence']?{now:manifest.startsAt}:{})});}
 if((values['import-client']||values['check-import']||values['cleanup-evidence'])&&!execution)throw new Error();
 if(values['check-import']){if(values['check-import']!==manifest.clientId)throw new Error();console.log('TEST import gate validated; no storage or provider access performed.');return;}
 if(!process.env.LOCALAPPDATA)throw new Error();
 const vault=await openVault({directory:join(process.env.LOCALAPPDATA,'FaraiOS','T19','credentials'),repositoryRoot:root});
 try{
  if(values['import-client']){
   if(values['import-client']!==manifest.clientId||process.stdin.isTTY)throw new Error();
   let input='';for await(const part of process.stdin){input+=part;if(Buffer.byteLength(input)>16384)throw new Error();}
   await vault.write(importClient(await vault.read(),manifest,JSON.parse(input)));console.log('TEST client stored; no provider request performed.');return;
  }
  if(values['cleanup-evidence']){
   // Custodian attestation only, not a provider revocation claim made by software.
   const evidence=JSON.parse(await readFile(resolve(values['cleanup-evidence']),'utf8'));
   await vault.write(attestCleanup(await vault.read(),manifest,evidence));console.log('Custodian cleanup attestation recorded; protected grant/client material removed.');return;
  }
  const config=JSON.parse(await readFile(join(root,'config/staging.json'),'utf8'));
  if(config.environment!=='staging'||config.projectRef!=='xdmfyrsauvqznkloroxg'||config.url!=='https://xdmfyrsauvqznkloroxg.supabase.co'||!config.publishableKey?.startsWith('sb_publishable_'))throw new Error();
  const sessions=createAuthSessions({createClient:()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})});
  const {server}=createConnectionService({vault,sessions,manifest,execution});
  await new Promise((accept,reject)=>{server.once('error',reject);server.listen(3102,'127.0.0.1',accept);});
  console.log('T19 local service listening on '+origin+'; provider gate '+(execution?'approved':'disabled'));
  await new Promise(resolve=>{const stop=()=>{server.closeAllConnections();server.close(resolve);};process.once('SIGINT',stop);process.once('SIGTERM',stop);});
 }finally{await vault.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){main().catch(()=>{console.error('T19 startup/action rejected; inspect the non-secret manifest, gate and local storage configuration.');process.exitCode=1;});}
