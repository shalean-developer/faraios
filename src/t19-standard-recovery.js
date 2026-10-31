// Offline staging credential recovery only. No database/provider/config mutation.
import {createHash,randomBytes,randomUUID,scrypt,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {createTokenCipher,tokenBinding} from './t19-standard-secrets.js';
const derive=promisify(scrypt),reject=()=>new Error('accounting_recovery_rejected');
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===keys.sort().join();
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const keyName=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(v);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function bytes(v,size,max=size){if(typeof v!=='string'||v.length>max*2)throw reject();const b=Buffer.from(v,'base64');if(b.toString('base64')!==v||b.length<size||b.length>max)throw reject();return b;}
function configuration(c){if(!Buffer.isBuffer(c?.key)||c.key.length!==32||!keyName(c.keyId))throw reject();}
function records(value,keyId){
 if(!Array.isArray(value)||!value.length||value.length>20)throw reject();
 const business=new Set(),connections=new Set(),orgs=new Set();
 const rows=value.map(c=>{
  if(!exact(c,['environment','businessId','connectionId','generation','organizationId','apiDomain','clientId','status','envelope'])||c.environment!=='staging'||!uuid(c.businessId)||!uuid(c.connectionId)||!Number.isSafeInteger(c.generation)||c.generation<1||typeof c.clientId!=='string'||!c.clientId||c.clientId.length>512||!['connected','revocation_pending','disconnected'].includes(c.status))throw reject();
  tokenBinding(c);
  const org=c.apiDomain+'|'+c.organizationId;
  if(business.has(c.businessId)||connections.has(c.connectionId)||orgs.has(org))throw reject();business.add(c.businessId);connections.add(c.connectionId);orgs.add(org);
  if(c.status==='disconnected'){if(c.envelope!==null)throw reject();}
  else{const e=c.envelope;if(!exact(e,['version','keyId','iv','body','tag'])||e.version!==1||e.keyId!==keyId)throw reject();bytes(e.iv,12);bytes(e.tag,16);bytes(e.body,1,32768);}
  return structuredClone(c);
 });
 return rows.sort((a,b)=>a.businessId.localeCompare(b.businessId));
}
function material(c,cipher){
 if(c.status==='disconnected')return null;
 const v=cipher.open(c,c.envelope);
 if(!exact(v,['refreshToken','accessToken','expiresAt'])||typeof v.refreshToken!=='string'||!v.refreshToken||v.refreshToken.length>8192||typeof v.accessToken!=='string'||!v.accessToken||v.accessToken.length>8192||!Number.isSafeInteger(v.expiresAt)||v.expiresAt<0)throw reject();
 return v;
}
function dataDocument(d){
 if(!exact(d,['version','environment','backupId','createdAt','keyId','records'])||d.version!==1||d.environment!=='staging'||!uuid(d.backupId)||!keyName(d.keyId)||typeof d.createdAt!=='string'||!Number.isFinite(Date.parse(d.createdAt))||new Date(d.createdAt).toISOString()!==d.createdAt)throw reject();
 const rows=records(d.records,d.keyId);if(JSON.stringify(rows)!==JSON.stringify(d.records))throw reject();return d;
}
function password(v){if(typeof v!=='string'||Buffer.byteLength(v)<24||Buffer.byteLength(v)>256)throw reject();}
const aad=id=>Buffer.from(JSON.stringify(['FaraiOS T19 credential escrow',1,'staging',id]));
const wrappingKey=(passphrase,salt)=>derive(passphrase,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
export function credentialMaterialDigest(rows,config){
 try{configuration(config);const cipher=createTokenCipher(config);return hash(records(rows,config.keyId).map(c=>({binding:tokenBinding(c),status:c.status,material:material(c,cipher)})));}catch{throw reject();}
}
export async function createCredentialBackup(rows,config,passphrase){
 let wrap;
 try{
  configuration(config);password(passphrase);const clean=records(rows,config.keyId);credentialMaterialDigest(clean,config);
  const data={version:1,environment:'staging',backupId:randomUUID(),createdAt:new Date().toISOString(),keyId:config.keyId,records:clean};
  const salt=randomBytes(16),iv=randomBytes(12);wrap=await wrappingKey(passphrase,salt);
  const cipher=createCipheriv('aes-256-gcm',wrap,iv);cipher.setAAD(aad(data.backupId));
  const body=Buffer.concat([cipher.update(JSON.stringify({version:1,keyId:config.keyId,keyHex:config.key.toString('hex'),dataDigest:hash(data)}),'utf8'),cipher.final()]);
  return {data,escrow:{version:1,environment:'staging',backupId:data.backupId,kdf:'scrypt-N32768-r8-p1',salt:salt.toString('base64'),iv:iv.toString('base64'),body:body.toString('base64'),tag:cipher.getAuthTag().toString('base64')}};
 }catch{throw reject();}finally{wrap?.fill(0);}
}
export async function restoreCredentialBackup(data,escrow,passphrase){
 let wrap,key;
 try{
  dataDocument(data);password(passphrase);
  if(!exact(escrow,['version','environment','backupId','kdf','salt','iv','body','tag'])||escrow.version!==1||escrow.environment!=='staging'||escrow.backupId!==data.backupId||escrow.kdf!=='scrypt-N32768-r8-p1')throw reject();
  const salt=bytes(escrow.salt,16),iv=bytes(escrow.iv,12),tag=bytes(escrow.tag,16),body=bytes(escrow.body,1,2048);wrap=await wrappingKey(passphrase,salt);
  const decipher=createDecipheriv('aes-256-gcm',wrap,iv);decipher.setAAD(aad(data.backupId));decipher.setAuthTag(tag);
  const value=JSON.parse(Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8'));
  if(!exact(value,['version','keyId','keyHex','dataDigest'])||value.version!==1||value.keyId!==data.keyId||! /^[0-9a-f]{64}$/.test(value.keyHex)||! /^[0-9a-f]{64}$/.test(value.dataDigest)||!timingSafeEqual(Buffer.from(value.dataDigest,'hex'),Buffer.from(hash(data),'hex')))throw reject();
  key=Buffer.from(value.keyHex,'hex');const result={key,keyId:value.keyId,records:records(data.records,data.keyId),backupId:data.backupId};credentialMaterialDigest(result.records,result);return result;
 }catch{key?.fill(0);throw reject();}finally{wrap?.fill(0);}
}
// Stale/revoked/refreshed state is not authority to overwrite current state.
export function assertRecoveryMatchesCurrent(restored,current){
 try{configuration(restored);if(JSON.stringify(records(restored.records,restored.keyId))!==JSON.stringify(records(current,restored.keyId)))throw reject();return {matched:true,count:current.length};}catch{throw reject();}
}
export function rekeyCredentialSnapshot(rows,oldConfig,newConfig){
 try{
  configuration(oldConfig);configuration(newConfig);if(oldConfig.keyId===newConfig.keyId||timingSafeEqual(oldConfig.key,newConfig.key))throw reject();
  const oldCipher=createTokenCipher(oldConfig),next=createTokenCipher(newConfig);
  const converted=records(rows,oldConfig.keyId).map(c=>({...c,envelope:c.envelope===null?null:next.seal(c,material(c,oldCipher))}));
  if(credentialMaterialDigest(converted,newConfig)!==credentialMaterialDigest(rows,oldConfig))throw reject();return converted;
 }catch{throw reject();}
}
