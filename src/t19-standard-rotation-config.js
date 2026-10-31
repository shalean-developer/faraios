// Inactive private operator adapter. No runtime imports/network/restart/provider calls.
import {open,lstat,realpath,rename,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,dirname,isAbsolute,basename} from 'node:path';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
const reject=()=>new Error('accounting_rotation_configuration_recovery_required');
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===k.slice().sort().join();
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
const keyId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(v);
const hash=b=>createHash('sha256').update(b).digest('hex');
const stable=(a,b)=>['dev','ino','uid','gid','mode','size','mtimeMs','ctimeMs'].every(k=>a[k]===b[k]);
function settings(v){
 if(!exact(v,['version','enabled','backend','zoho'])||v.version!==1||v.enabled!==true||!exact(v.backend,['email','password','principalId'])||typeof v.backend.email!=='string'||!v.backend.email.includes('@')||typeof v.backend.password!=='string'||!v.backend.password||!uuid(v.backend.principalId)||!exact(v.zoho,['clientId','clientSecret','encryptionKey','keyId'])||typeof v.zoho.clientId!=='string'||!v.zoho.clientId||typeof v.zoho.clientSecret!=='string'||!v.zoho.clientSecret||typeof v.zoho.encryptionKey!=='string'||!/^[a-f0-9]{64}$/.test(v.zoho.encryptionKey)||!keyId(v.zoho.keyId))throw reject();return v;
}
function scope(ids){if(!Array.isArray(ids)||!ids.length||ids.length>20||ids.some(b=>!uuid(b))||new Set(ids).size!==ids.length)throw reject();return [...ids].sort();}
export function createRotationConfiguration({root,directory,onStage=async()=>{}}){
 if(typeof root!=='string'||typeof directory!=='string'||!isAbsolute(root)||!isAbsolute(directory)||typeof onStage!=='function')throw reject();
 const live=join(root,'staging.json'),lockPath=join(root,'.rotation-configuration.lock');
 async function dir(p){if(process.platform!=='linux'||!isAbsolute(p)||await realpath(p)!==p)throw reject();const s=await lstat(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)throw reject();return s;}
 async function roots(){if(dirname(directory)!==root||!/^rotation-[a-zA-Z0-9_-]{1,80}$/.test(basename(directory)))throw reject();await dir(root);await dir(directory);}
 async function read(path){
  const parent=await dir(dirname(path)),h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{const before=await h.stat();if(!before.isFile()||before.nlink!==1||before.uid!==process.getuid()||(before.mode&0o077)!==0||before.size>65536)throw reject();
   const b=Buffer.alloc(65537);let n=0;while(n<b.length){const r=await h.read(b,n,b.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}
   const after=await h.stat(),named=await lstat(path),p=await dir(dirname(path));if(n>65536||!stable(before,after)||!stable(before,named)||['dev','ino','uid','gid','mode'].some(k=>parent[k]!==p[k]))throw reject();return {bytes:b.subarray(0,n),stat:before};
  }finally{await h.close();}
 }
 async function sync(path){const h=await open(path,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
 async function write(path,bytes){const h=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await h.chmod(0o600);await h.writeFile(bytes);await h.sync();}finally{await h.close();}await sync(dirname(path));}
 async function locked(action){
  await roots();let h,identity;
  try{h=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);identity=await h.stat();await h.writeFile(JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()})+'\n');await h.sync();await sync(root);return await action();}
  finally{await h?.close();if(identity){const current=await lstat(lockPath);if(current.dev!==identity.dev||current.ino!==identity.ino||current.nlink!==1||!current.isFile())throw reject();await unlink(lockPath);await sync(root);}}
 }
 async function pair(){
  await roots();const m=JSON.parse((await read(join(directory,'configuration-plan.json'))).bytes.toString('utf8'));
  if(!exact(m,['version','environment','rotationId','businessIds','fromKeyId','toKeyId','fromHash','toHash'])||m.version!==1||m.environment!=='staging'||!uuid(m.rotationId)||!keyId(m.fromKeyId)||!keyId(m.toKeyId)||m.fromKeyId===m.toKeyId||! /^[a-f0-9]{64}$/.test(m.fromHash)||! /^[a-f0-9]{64}$/.test(m.toHash)||JSON.stringify(scope(m.businessIds))!==JSON.stringify(m.businessIds))throw reject();
  const before=await read(join(directory,'configuration-before.json')),after=await read(join(directory,'configuration-after.json'));
  if(hash(before.bytes)!==m.fromHash||hash(after.bytes)!==m.toHash)throw reject();
  const a=settings(JSON.parse(before.bytes.toString('utf8'))),b=settings(JSON.parse(after.bytes.toString('utf8'))),normalized=structuredClone(b);
  normalized.zoho.encryptionKey=a.zoho.encryptionKey;normalized.zoho.keyId=a.zoho.keyId;
  if(a.zoho.keyId!==m.fromKeyId||b.zoho.keyId!==m.toKeyId||a.zoho.encryptionKey===b.zoho.encryptionKey||JSON.stringify(a)!==JSON.stringify(normalized))throw reject();
  return {m,before,after,a,b};
 }
 async function quiet(callback){if(typeof callback!=='function'||await callback()!==true)throw reject();}
 return Object.freeze({
  async prepare({businessIds,assertQuiescent}){try{return await locked(async()=>{
   const ids=scope(businessIds);await quiet(assertQuiescent);const current=await read(live),a=settings(JSON.parse(current.bytes.toString('utf8'))),b=structuredClone(a);let key;
   do{key=randomBytes(32);}while(timingSafeEqual(key,Buffer.from(a.zoho.encryptionKey,'hex')));
   b.zoho.encryptionKey=key.toString('hex');key.fill(0);b.zoho.keyId='staging-'+randomUUID().replaceAll('-','').slice(0,24);if(b.zoho.keyId===a.zoho.keyId)throw reject();
   const next=Buffer.from(JSON.stringify(b,null,2)+'\n'),m={version:1,environment:'staging',rotationId:randomUUID(),businessIds:ids,fromKeyId:a.zoho.keyId,toKeyId:b.zoho.keyId,fromHash:hash(current.bytes),toHash:hash(next)};
   await write(join(directory,'configuration-before.json'),current.bytes);await write(join(directory,'configuration-after.json'),next);await onStage('candidatesWritten');
   await quiet(assertQuiescent);const now=await read(live);if(!stable(current.stat,now.stat)||hash(now.bytes)!==m.fromHash)throw reject();
   await write(join(directory,'configuration-plan.json'),Buffer.from(JSON.stringify(m)+'\n'));
   return {prepared:true,environment:'staging',rotationId:m.rotationId,businesses:ids.length,activeConfigurationChanged:false};
  });}catch{throw reject();}},
  async loadKeys(){try{const p=await pair();return {rotationId:p.m.rotationId,businessIds:[...p.m.businessIds],fromConfig:{environment:'staging',keyId:p.m.fromKeyId,key:Buffer.from(p.a.zoho.encryptionKey,'hex')},toConfig:{environment:'staging',keyId:p.m.toKeyId,key:Buffer.from(p.b.zoho.encryptionKey,'hex')}};}catch{throw reject();}},
  async status(){try{const p=await pair(),current=await read(live),digest=hash(current.bytes);if(digest!==p.m.fromHash&&digest!==p.m.toHash)throw reject();return {environment:'staging',rotationId:p.m.rotationId,active:digest===p.m.fromHash?'before':'after',businesses:p.m.businessIds.length};}catch{throw reject();}},
  async activate({direction='forward',assertQuiescent,verifyCredentials}){let keys;try{return await locked(async()=>{
   if(!['forward','rollback'].includes(direction)||typeof verifyCredentials!=='function')throw reject();await quiet(assertQuiescent);const p=await pair(),current=await read(live),target=direction==='forward'?p.after:p.before,targetHash=direction==='forward'?p.m.toHash:p.m.fromHash;
   const digest=hash(current.bytes);if(digest!==p.m.fromHash&&digest!==p.m.toHash)throw reject();
   const config=direction==='forward'?p.b:p.a;keys={environment:'staging',keyId:config.zoho.keyId,key:Buffer.from(config.zoho.encryptionKey,'hex')};
   const verify=async()=>{await quiet(assertQuiescent);if(await verifyCredentials({config:keys,businessIds:[...p.m.businessIds]})!==true)throw reject();};
   await verify();if(digest===targetHash)return {environment:'staging',direction,alreadyTarget:true,configurationChanged:false,resumeAllowed:false};
   const temporary=join(root,'.staging.rotation-'+randomUUID()+'.tmp');await write(temporary,target.bytes);await onStage('beforeRename');await verify();
   const latest=await read(live);if(!stable(current.stat,latest.stat)||hash(latest.bytes)!==digest)throw reject();
   await rename(temporary,live);await sync(root);await onStage('afterRename');const installed=await read(live);if(hash(installed.bytes)!==targetHash)throw reject();
   return {environment:'staging',direction,alreadyTarget:false,configurationChanged:true,resumeAllowed:false};
  });}catch{throw reject();}finally{keys?.key.fill(0);}}
 });
}
