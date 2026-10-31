// Explicit owner-only directories; no default path, environment read or overwrite.
import {open,lstat,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute,join} from 'node:path';
const reject=()=>new Error('accounting_recovery_files_rejected');
async function directory(path){
 if(process.platform!=='linux'||!isAbsolute(path)||await realpath(path)!==path)throw reject();
 const s=await lstat(path);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)throw reject();return s;
}
function stable(a,b){return ['dev','ino','uid','gid','mode'].every(k=>a[k]===b[k]);}
async function pair(dataDir,keyDir){const a=await directory(dataDir),b=await directory(keyDir);if(a.dev===b.dev&&a.ino===b.ino)throw reject();return {a,b};}
async function write(dir,name,value){
 const original=await directory(dir),body=JSON.stringify(value)+'\n';if(Buffer.byteLength(body)>1048576)throw reject();
 const h=await open(join(dir,name),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await h.chmod(0o600);await h.writeFile(body);await h.sync();const f=await h.stat();if(!f.isFile()||f.nlink!==1||f.uid!==process.getuid()||(f.mode&0o077)!==0||!stable(original,await directory(dir)))throw reject();}finally{await h.close();}
 const d=await open(dir,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await d.sync();}finally{await d.close();}
}
async function read(dir,name){
 const original=await directory(dir),path=join(dir,name),h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const before=await h.stat();if(!before.isFile()||before.nlink!==1||before.uid!==process.getuid()||(before.mode&0o077)!==0||before.size>1048576)throw reject();
  const buffer=Buffer.alloc(1048577);let size=0;for(;;){if(size===buffer.length)throw reject();const r=await h.read(buffer,size,buffer.length-size,null);if(!r.bytesRead)break;size+=r.bytesRead;}
  const after=await h.stat(),named=await lstat(path);if(!stable(before,after)||!stable(before,named)||['size','mtimeMs','ctimeMs'].some(k=>before[k]!==after[k]||before[k]!==named[k])||!stable(original,await directory(dir)))throw reject();
  return JSON.parse(buffer.subarray(0,size).toString('utf8'));
 }finally{await h.close();}
}
export async function writeRecoveryPair(dataDir,keyDir,backup){
 try{await pair(dataDir,keyDir);await write(dataDir,'credentials.json',backup.data);await write(keyDir,'key-escrow.json',backup.escrow);return {written:true};}catch{throw reject();}
}
export async function readRecoveryPair(dataDir,keyDir){
 try{await pair(dataDir,keyDir);return {data:await read(dataDir,'credentials.json'),escrow:await read(keyDir,'key-escrow.json')};}catch{throw reject();}
}
