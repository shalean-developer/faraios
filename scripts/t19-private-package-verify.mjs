// Read-only content verification. Never imports runtime, config or credentials.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const canonical=v=>JSON.stringify(v);
export const check=(ok,code)=>{if(!ok)throw Error(code);};
export const safePath=p=>typeof p==='string'&&p.length<=240&&/^[A-Za-z0-9._@/+()-]+$/.test(p)&&!p.startsWith('/')&&posix.normalize(p)===p&&!p.split('/').some(s=>s==='.'||s==='..'||!s);
export async function regular(path){
 const before=await fs.lstat(path);check(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size<=8388608,'PACKAGE_FILE_REFUSED');
 const h=await fs.open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{
  const opened=await h.stat();check(opened.dev===before.dev&&opened.ino===before.ino,'PACKAGE_FILE_CHANGED');
  const buffer=Buffer.alloc(before.size+1);let length=0;while(length<buffer.length){const r=await h.read(buffer,length,buffer.length-length,null);if(!r.bytesRead)break;length+=r.bytesRead;}const bytes=buffer.subarray(0,length);const after=await h.stat(),current=await fs.lstat(path);
  for(const s of [after,current])check(['dev','ino','size','mtimeMs','ctimeMs','mode','nlink'].every(k=>s[k]===before[k]),'PACKAGE_FILE_CHANGED');
  check(bytes.length===before.size,'PACKAGE_FILE_CHANGED');return bytes;
 }finally{await h.close();}
}
export async function inventory(root,{ignore=[]}={}){
 root=resolve(root);check(await fs.realpath(root)===root,'PACKAGE_ROOT_SYMLINK');
 const result=[];let count=0,total=0;
 async function walk(rel){
  const entries=(await fs.readdir(join(root,rel))).sort();check(entries.length>0,'EMPTY_PACKAGE_DIRECTORY');
  for(const name of entries){
   const p=rel?rel+'/'+name:name;check(safePath(p),'PACKAGE_PATH_REFUSED');
   if(ignore.includes(p))continue;
   check(++count<=6000,'PACKAGE_ENTRY_LIMIT');const s=await fs.lstat(join(root,p));
   check(!s.isSymbolicLink(),'PACKAGE_SYMLINK_REFUSED');
   if(s.isDirectory())await walk(p);
   else{const bytes=await regular(join(root,p));total+=bytes.length;check(total<=67108864,'PACKAGE_SIZE_LIMIT');result.push({path:p,bytes:bytes.length,sha256:hash(bytes)});}
  }
 }
 await walk('');return result.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
export async function verifyPackage(root,expected,{manifestName='custody-production-manifest.json'}={}){
 check(['custody-package-manifest.json','custody-production-manifest.json'].includes(manifestName),'MANIFEST_NAME_REFUSED');
 check(/^[a-f0-9]{64}$/.test(expected??''),'EXTERNAL_PACKAGE_DIGEST_REQUIRED');
 root=resolve(root);check(await fs.realpath(root)===root,'PACKAGE_ROOT_SYMLINK');
 const bytes=await regular(join(root,manifestName));check(hash(bytes)===expected,'PACKAGE_MANIFEST_MISMATCH');
 const m=JSON.parse(bytes);check(m.version===1&&m.purpose==='inactive-private-custody-source'&&m.activationAuthorized===false&&m.phase===(manifestName==='custody-production-manifest.json'?'production-dependencies':'source')&&Array.isArray(m.files)&&m.files.length<=5000,'PACKAGE_MANIFEST_REFUSED');
 const paths=m.files.map(f=>f.path);check(paths.every(safePath)&&new Set(paths).size===paths.length&&!paths.includes(manifestName),'PACKAGE_MANIFEST_PATHS');
 check(canonical(await inventory(root,{ignore:[manifestName]}))===canonical(m.files),'PACKAGE_CONTENT_MISMATCH');return m;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [dir,expected,...extra]=process.argv.slice(2);
 try{check(dir&&!extra.length,'USAGE_DIRECTORY_EXTERNAL_DIGEST');const m=await verifyPackage(dir,expected);console.log(JSON.stringify({status:'INACTIVE_PACKAGE_CONTENT_VERIFIED',files:m.files.length,activationAuthorized:false,hostIdentityVerified:false,credentialsRead:false}));}
 catch(e){console.error('T19_PACKAGE_VERIFY_STOP '+e.message);process.exitCode=1;}
}
