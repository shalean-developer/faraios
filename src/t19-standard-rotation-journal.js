// Private immutable ciphertext plan and bounded event log. Never stores plaintext keys/tokens.
import {open,lstat,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute,join} from 'node:path';
const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===k.slice().sort().join();
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
const keyId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(v);
function planShape(p){return exact(p,['version','environment','rotationId','fromKeyId','toKeyId','records'])&&p.version===1&&p.environment==='staging'&&uuid(p.rotationId)&&keyId(p.fromKeyId)&&keyId(p.toKeyId)&&p.fromKeyId!==p.toKeyId&&Array.isArray(p.records)&&p.records.length>0&&p.records.length<=20&&p.records.every(c=>exact(c,['environment','businessId','connectionId','generation','organizationId','apiDomain','clientId','status','envelope'])&&c.environment==='staging'&&uuid(c.businessId)&&uuid(c.connectionId)&&Number.isSafeInteger(c.generation)&&c.generation>0&&c.status==='connected'&&exact(c.envelope,['version','keyId','iv','body','tag'])&&c.envelope.version===1&&c.envelope.keyId===p.fromKeyId);}
const fail=()=>new Error('accounting_rotation_journal_rejected');
export function createRotationJournal(directory){
 async function parent(){if(process.platform!=='linux'||!isAbsolute(directory)||await realpath(directory)!==directory)throw fail();const s=await lstat(directory);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)throw fail();return s;}
 async function check(h,max){const s=await h.stat();if(!s.isFile()||s.nlink!==1||s.uid!==process.getuid()||(s.mode&0o077)!==0||s.size>max)throw fail();return s;}
 const same=(a,b)=>['dev','ino','uid','gid','mode'].every(k=>a[k]===b[k]);
 async function sync(){const h=await open(directory,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
 return Object.freeze({
  async load(){let h;try{const p=await parent(),path=join(directory,'rotation-plan.json');try{h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);}catch(e){if(e.code==='ENOENT')return null;throw e;}
   const before=await check(h,1048576),b=Buffer.alloc(1048577);let size=0;while(size<b.length){const r=await h.read(b,size,b.length-size,null);if(!r.bytesRead)break;size+=r.bytesRead;}
   const after=await h.stat(),named=await lstat(path);if(size>1048576||!same(before,after)||!same(before,named)||['size','mtimeMs','ctimeMs'].some(k=>before[k]!==after[k]||before[k]!==named[k])||!same(p,await parent()))throw fail();const value=JSON.parse(b.subarray(0,size).toString('utf8'));if(!planShape(value))throw fail();return value;
  }catch{throw fail();}finally{await h?.close();}},
  async prepare(plan){let h;try{const p=await parent();if(!planShape(plan))throw fail();const body=JSON.stringify(plan)+'\n';if(Buffer.byteLength(body)>1048576)throw fail();h=await open(join(directory,'rotation-plan.json'),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);await h.chmod(0o600);await check(h,1048576);await h.writeFile(body);await h.sync();if(!same(p,await parent()))throw fail();await sync();}catch{throw fail();}finally{await h?.close();}},
  async record(event){let h;try{const p=await parent();if(!event||!uuid(event.rotationId)||!['forward','rollback'].includes(event.direction)||!(event.state==='verified'&&exact(event,['rotationId','direction','businessId','state'])&&uuid(event.businessId)||event.state==='rewrapped'&&exact(event,['rotationId','direction','state','count'])&&Number.isSafeInteger(event.count)&&event.count>0&&event.count<=20))throw fail();const body=JSON.stringify(event)+'\n';if(Buffer.byteLength(body)>1024)throw fail();h=await open(join(directory,'rotation-events.jsonl'),constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|constants.O_NOFOLLOW|constants.O_NONBLOCK,0o600);const s=await check(h,65536);if(s.size+Buffer.byteLength(body)>65536)throw fail();await h.writeFile(body);await h.sync();if(!same(p,await parent()))throw fail();await sync();}catch{throw fail();}finally{await h?.close();}}
 });
}
