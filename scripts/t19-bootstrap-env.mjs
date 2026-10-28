// Docker's env-file reader needs a reopenable file, not a spawned stdin socket.
import {constants} from 'node:fs';
import {mkdtemp,open,lstat,realpath,unlink,rmdir,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {requireTrue} from './t19-bootstrap-engine.mjs';
export function encodeEnvironment(env){
 const entries=Object.entries(env);
 requireTrue(entries.every(([k,v])=>/^[A-Z_][A-Z0-9_]*$/.test(k)&&typeof v==='string'&&!/[\r\n\0]/.test(v)),'ENV_FILE_CONTENT_INVALID');
 const bytes=Buffer.from(entries.map(([k,v])=>k+'='+v).join('\n')+(entries.length?'\n':''));
 requireTrue(bytes.length<=65536,'ENV_FILE_TOO_LARGE');return bytes;
}
async function syncDirectory(path){const h=await open(path,'r');try{await h.sync();}finally{await h.close();}}
export async function environmentFilesAbsent(dir){return !(await readdir(dir)).some(n=>n.startsWith('env-'));}
export async function withEnvironmentFile(dir,env,run){
 // Host inputs() has already checked the complete root-owned parent chain.
 // Check the leaf again; tests may use an equally private current-user directory.
 const parent=resolve(dir),s=await lstat(parent);
 requireTrue(await realpath(parent)===parent&&s.isDirectory()&&s.uid===process.getuid()&&!(s.mode&0o077),'ENV_PARENT_UNSAFE');
 const bytes=encodeEnvironment(env),temporary=await mkdtemp(join(parent,'env-'));
 const path=join(temporary,'values.env');let identity;
 try{
  const h=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{identity=await h.stat();await h.writeFile(bytes);await h.sync();}finally{await h.close();bytes.fill(0);}
  const a=await lstat(path);requireTrue(a.isFile()&&a.nlink===1&&a.uid===process.getuid()&&(a.mode&0o777)===0o600,'ENV_FILE_UNSAFE');
  return await run(path);
 }finally{
  bytes.fill(0);
  if(identity){const a=await lstat(path);requireTrue(a.dev===identity.dev&&a.ino===identity.ino&&a.isFile()&&a.nlink===1,'ENV_FILE_IDENTITY_CHANGED');await unlink(path);await syncDirectory(temporary);}
  await rmdir(temporary);await syncDirectory(parent);
 }
}
