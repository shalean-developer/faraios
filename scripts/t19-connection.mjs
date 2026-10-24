// Local Milestone A operator entrypoint. Never imports the accounting sync worker.
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createAuthSessions} from '../src/auth-session.js';
import {openVault} from '../src/t19-vault.js';
import {createConnectionService,validateManifest,origin} from '../src/t19-connection.js';
import {validateSuccessorPreparation,prepareSuccessor,validateSuccessorImport,validateSuccessorCleanup,cleanupSuccessor} from '../src/t19-successor.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const files=['scripts/t19-connection.mjs','scripts/t19-import-client.ps1','scripts/t19-dpapi.ps1','src/t19-connection.js','src/t19-successor.js','src/t19-page.js','src/t19-provider.js','src/t19-vault.js','src/auth-session.js','src/identity.js','src/access.js','src/zoho-books.js','package-lock.json'];
export async function probeDigest(){const hash=createHash('sha256');for(const path of files){hash.update(path+'\0');hash.update(await readFile(join(root,path)));}return hash.digest('hex');}
export function importClient(db,manifest,secret,{manifestSha256=createHash('sha256').update(JSON.stringify(manifest)).digest('hex')}={}){
 if(!secret||Object.keys(secret).length!==1||typeof secret.clientSecret!=='string'||!secret.clientSecret||secret.clientSecret.length>4096||/[\r\n\0]/.test(secret.clientSecret))throw new Error('Client import rejected');
 if(db.connections?.[manifest.businessId]?.successor&&!manifest.successor)throw new Error('Successor import requires exact manifest');
 if(manifest.successor)validateSuccessorImport(db,manifest,manifestSha256);
 db=structuredClone(db);db.clients??={};if(db.clients[manifest.clientId])throw new Error('Client import rejected');
 db.clients[manifest.clientId]={clientSecret:secret.clientSecret,businessId:manifest.businessId,organizationId:manifest.organizationId,approvalDigest:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')};return db;
}
// Local removal only, before any connection/consent record exists. Never revokes a grant.
export function cleanupImportedClient(db,manifest,evidence){
 if(manifest.successor||Object.values(db.connectionHistory??{}).some(h=>h.record?.clientId===manifest.clientId))throw new Error('Successor cleanup requires separate approval');
 const client=db.clients?.[manifest.clientId];
 const digest=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 if(!client||client.businessId!==manifest.businessId||client.organizationId!==manifest.organizationId||client.approvalDigest!==digest||!db.connections||Object.values(db.connections).some(c=>c.clientId===manifest.clientId)||evidence.clientId!==manifest.clientId||evidence.businessId!==manifest.businessId||evidence.organizationId!==manifest.organizationId||evidence.custodian!==manifest.custodian||evidence.noGrantInitiated!==true||typeof evidence.reference!=='string'||!evidence.reference.trim()||evidence.reference.length>500)throw new Error('Pre-consent cleanup rejected');
 db=structuredClone(db);delete db.clients[manifest.clientId];
 db.clientCleanupEvents??=[];db.clientCleanupEvents.push({event:'unused_client_removed_locally',clientId:manifest.clientId,businessId:manifest.businessId,organizationId:manifest.organizationId,custodian:manifest.custodian,approvalDigest:digest,reference:evidence.reference,time:Date.now(),providerRevocationClaimed:false});return db;
}
export function attestCleanup(db,manifest,evidence){
 if(manifest.successor)throw new Error('Successor cleanup requires separate approval');
 db=structuredClone(db);const c=db.connections[manifest.businessId];
 if(c?.successor||c?.successorCleanup)throw new Error('Successor cleanup requires separate approval');
 if(!c||c.status!=='disabled'||!c.cleanup||c.binding.businessId!==manifest.businessId||c.binding.organizationId!==manifest.organizationId||c.binding.identity!==manifest.identity||c.clientId!==manifest.clientId||evidence.connectionId!==c.id||evidence.generation!==c.generation||evidence.identity!==manifest.identity||evidence.custodian!==manifest.custodian||evidence.providerRevocationConfirmed!==true||typeof evidence.reference!=='string'||!evidence.reference.trim()||evidence.reference.length>500)throw new Error('Cleanup attestation rejected');
 delete c.cleanup;if(!Object.values(db.connections).some(other=>other.id!==c.id&&other.clientId===c.clientId))delete db.clients?.[c.clientId];c.events.push({event:'custodian_attested_provider_revocation',time:Date.now(),generation:c.generation,reference:evidence.reference});return db;
}
const recoveryFields=['action','approved','approvalReference','originalManifestSha256','recoveryProbeSha','clientId','businessId','organizationId','connectionId','generation','identity','custodian','consentRejected','noGrantIssued','reference'];
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const reference=value=>typeof value==='string'&&Boolean(value.trim())&&value.length<=500;
function recoveryBinding(manifest,e){
 if(!e||Array.isArray(e)||Object.keys(e).length!==recoveryFields.length||recoveryFields.some(k=>!Object.hasOwn(e,k))||e.action!=='cleanup_rejected_consent'||e.approved!==true||!reference(e.approvalReference)||e.approvalReference===manifest.approvalReference||!reference(e.reference)||!sha(e.originalManifestSha256)||!sha(e.recoveryProbeSha)||e.clientId!==manifest.clientId||e.businessId!==manifest.businessId||e.organizationId!==manifest.organizationId||e.identity!==manifest.identity||e.custodian!==manifest.custodian||!Number.isSafeInteger(e.generation)||e.generation<2||typeof e.connectionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.connectionId)||e.consentRejected!==true||e.noGrantIssued!==true)throw new Error('Rejected consent cleanup rejected');
}
// A separate cleanup approval pins OLD manifest bytes and CURRENT recovery code.
// Never relax the original execution/import gates or infer revocation from deletion.
export function validateRejectedConsentApproval(manifestRaw,evidenceRaw,approvedHash,currentProbeSha){
 if(manifestRaw.length>32768||evidenceRaw.length>16384||!sha(approvedHash)||!sha(currentProbeSha)||createHash('sha256').update(evidenceRaw).digest('hex')!==approvedHash)throw new Error('Rejected consent cleanup rejected');
 const m=validateManifest(JSON.parse(manifestRaw));
 validateManifest(m,{execution:true,now:m.startsAt}); // Cleanup only may follow the expired original window.
 const e=JSON.parse(evidenceRaw);recoveryBinding(m,e);
 if(!sha(m.probeSha)||e.originalManifestSha256!==createHash('sha256').update(manifestRaw).digest('hex')||e.recoveryProbeSha!==currentProbeSha)throw new Error('Rejected consent cleanup rejected');
 return {manifest:m,evidence:e};
}
export function cleanupRejectedConsent(db,manifest,evidence){
 recoveryBinding(manifest,evidence);
 const c=db.connections?.[manifest.businessId],client=db.clients?.[manifest.clientId];
 const digest=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 const expected={businessId:manifest.businessId,organizationId:manifest.organizationId,apiDomain:manifest.apiDomain,currency:manifest.currency,identity:manifest.identity,zohoUserId:manifest.zohoUserId,environment:'staging',provider:'zoho_books',region:'US'};
 if(!c||!client||Object.keys(client).length!==4||['clientSecret','businessId','organizationId','approvalDigest'].some(k=>!Object.hasOwn(client,k))||typeof client.clientSecret!=='string'||!client.clientSecret||client.clientSecret.length>4096||/[\r\n\0]/.test(client.clientSecret)||c.id!==evidence.connectionId||c.generation!==evidence.generation||c.status!=='disabled'||c.clientId!==manifest.clientId||c.approvalDigest!==digest||c.approvalReference!==manifest.approvalReference||Object.keys(c).length!==8||client.approvalDigest!==digest||client.businessId!==manifest.businessId||client.organizationId!==manifest.organizationId||!c.binding||Object.keys(c.binding).length!==Object.keys(expected).length||Object.entries(expected).some(([k,v])=>c.binding[k]!==v)||['credentials','cleanup','evidence','provenance','verificationAttempted','recovery'].some(k=>Object.hasOwn(c,k))||Object.entries(db.connections).some(([key,other])=>key!==manifest.businessId&&other.clientId===manifest.clientId)||!Array.isArray(c.events)||c.events.length!==2||c.events[0].event!=='consent_started'||c.events[0].generation!==1||c.events[1].event!=='locally_disabled'||c.events[1].generation!==2||c.generation!==2||!c.events.every(e=>Object.keys(e).length===3&&Number.isSafeInteger(e.time)&&e.time>=0)||c.events[1].time<c.events[0].time)throw new Error('Rejected consent cleanup rejected');
 const cleaned=structuredClone(db),target=cleaned.connections[manifest.businessId];
 delete cleaned.clients[manifest.clientId];target.generation++;
 target.recovery={kind:'rejected_consent_local_cleanup',originalManifestSha256:evidence.originalManifestSha256,recoveryProbeSha:evidence.recoveryProbeSha,approvalReference:evidence.approvalReference,reference:evidence.reference,custodian:evidence.custodian,noGrantIssuedAttested:true,providerRevocationClaimed:false};
 target.events.push({event:'rejected_consent_client_removed_locally',time:Date.now(),generation:target.generation,reference:evidence.reference,providerRevocationClaimed:false});
 return cleaned; // Disabled tombstone remains: no reset or automatic reauthorisation.
}
export async function main(args=process.argv.slice(2),{openStore=openVault,environment=process.env,print=console.log}={}){
 if(args.length===1&&args[0]==='--describe'){print(JSON.stringify({origin,probeSha:await probeDigest(),providerExecution:'disabled unless exact manifest hash approved',writes:'none',refresh:'none'}));return;}
 const allowed=new Set(['manifest','execute-approved','import-client','check-import','cleanup-evidence','cleanup-import-evidence','cleanup-rejected-consent-evidence','recovery-approved','predecessor-manifest','predecessor-recovery','prepare-successor-evidence','successor-cleanup-evidence','successor-approved']);const values={};
 for(const arg of args){const match=/^--([a-z-]+)=(.+)$/.exec(arg);if(!match||!allowed.has(match[1])||Object.hasOwn(values,match[1]))throw new Error();values[match[1]]=match[2];}
 if(!values.manifest||['import-client','check-import','cleanup-evidence','cleanup-import-evidence'].filter(k=>values[k]).length>1)throw new Error();
 const successorPreparation=Boolean(values['prepare-successor-evidence']||values['predecessor-manifest']||values['predecessor-recovery']);
 const successorCleanup=Boolean(values['successor-cleanup-evidence']);
 if(successorPreparation&&(!values['prepare-successor-evidence']||!values['predecessor-manifest']||!values['predecessor-recovery']||!values['successor-approved']||Object.keys(values).length!==5)||successorCleanup&&(!values['successor-approved']||Object.keys(values).length!==3)||values['successor-approved']&&!successorPreparation&&!successorCleanup)throw new Error();
 const recovery=Boolean(values['cleanup-rejected-consent-evidence']||values['recovery-approved']);
 if(recovery&&(!values['cleanup-rejected-consent-evidence']||!values['recovery-approved']||Object.keys(values).length!==3))throw new Error();
 const raw=await readFile(resolve(values.manifest));if(raw.length>32768)throw new Error();
 const manifest=validateManifest(JSON.parse(raw));const approved=values['execute-approved'];
 const execution=Boolean(approved);
 let recoveryEvidence,successorPackage,successorCleanupPackage;
 if(successorPreparation)successorPackage=validateSuccessorPreparation(await readFile(resolve(values['predecessor-manifest'])),await readFile(resolve(values['predecessor-recovery'])),raw,await readFile(resolve(values['prepare-successor-evidence'])),values['successor-approved'],await probeDigest());
 if(successorCleanup)successorCleanupPackage=validateSuccessorCleanup(raw,await readFile(resolve(values['successor-cleanup-evidence'])),values['successor-approved'],await probeDigest());
 if(recovery){
  const rawEvidence=await readFile(resolve(values['cleanup-rejected-consent-evidence']));
  recoveryEvidence=validateRejectedConsentApproval(raw,rawEvidence,values['recovery-approved'],await probeDigest()).evidence;
 }
 if(execution){if(approved!==createHash('sha256').update(raw).digest('hex')||manifest.probeSha!==await probeDigest())throw new Error();validateManifest(manifest,{execution:true,...((values['cleanup-evidence']||values['cleanup-import-evidence'])?{now:manifest.startsAt}:{})});}
 if((values['import-client']||values['check-import']||values['cleanup-evidence']||values['cleanup-import-evidence'])&&!execution)throw new Error();
 if(values['check-import']){if(values['check-import']!==manifest.clientId)throw new Error();print('TEST import gate validated; no storage or provider access performed.');return;}
 if(!environment.LOCALAPPDATA)throw new Error();
 const vault=await openStore({directory:join(environment.LOCALAPPDATA,'FaraiOS','T19','credentials'),repositoryRoot:root});
 try{
  if(successorPreparation){await vault.write(prepareSuccessor(await vault.read(),successorPackage));print('TEST successor prepared locally; predecessor retained; no provider request performed.');return;}
  if(successorCleanup){await vault.write(cleanupSuccessor(await vault.read(),manifest,successorCleanupPackage.evidence));print('TEST successor cleaned locally; history retained; provider revocation is custodian-attested only when required.');return;}
  if(recovery){
   await vault.write(cleanupRejectedConsent(await vault.read(),manifest,recoveryEvidence));
   print('Rejected TEST consent cleaned locally; connection remains disabled; no provider request or revocation performed.');return;
  }
  if(values['import-client']){
   if(values['import-client']!==manifest.clientId||process.stdin.isTTY)throw new Error();
   let input='';for await(const part of process.stdin){input+=part;if(Buffer.byteLength(input)>16384)throw new Error();}
   await vault.write(importClient(await vault.read(),manifest,JSON.parse(input),{manifestSha256:createHash('sha256').update(raw).digest('hex')}));print('TEST client stored; no provider request performed.');return;
  }
  if(values['cleanup-import-evidence']){
   const rawEvidence=await readFile(resolve(values['cleanup-import-evidence']));if(rawEvidence.length>16384)throw new Error();
   await vault.write(cleanupImportedClient(await vault.read(),manifest,JSON.parse(rawEvidence)));
   print('Unused TEST client removed locally; no provider request or revocation performed.');return;
  }
  if(values['cleanup-evidence']){
   // Custodian attestation only, not a provider revocation claim made by software.
   const evidence=JSON.parse(await readFile(resolve(values['cleanup-evidence']),'utf8'));
   await vault.write(attestCleanup(await vault.read(),manifest,evidence));print('Custodian cleanup attestation recorded; protected grant/client material removed.');return;
  }
  const config=JSON.parse(await readFile(join(root,'config/staging.json'),'utf8'));
  if(config.environment!=='staging'||config.projectRef!=='xdmfyrsauvqznkloroxg'||config.url!=='https://xdmfyrsauvqznkloroxg.supabase.co'||!config.publishableKey?.startsWith('sb_publishable_'))throw new Error();
  const sessions=createAuthSessions({createClient:()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})});
  const {server}=createConnectionService({vault,sessions,manifest,manifestSha256:createHash('sha256').update(raw).digest('hex'),execution});
  await new Promise((accept,reject)=>{server.once('error',reject);server.listen(3102,'127.0.0.1',accept);});
  print('T19 local service listening on '+origin+'; provider gate '+(execution?'approved':'disabled'));
  await new Promise(resolve=>{const stop=()=>{server.closeAllConnections();server.close(resolve);};process.once('SIGINT',stop);process.once('SIGTERM',stop);});
 }finally{await vault.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){main().catch(()=>{console.error('T19 startup/action rejected; inspect the non-secret manifest, gate and local storage configuration.');process.exitCode=1;});}
