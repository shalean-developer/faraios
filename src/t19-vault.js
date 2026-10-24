import {spawn} from 'node:child_process';
import {mkdir,lstat,open,readFile,rename,unlink,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

const MAX=4*1024*1024;
const helper=fileURLToPath(new URL('../scripts/t19-dpapi.ps1',import.meta.url));
const failure=()=>new Error('TEST credential store unavailable');
function beneath(root,path){const r=relative(root,path);return Boolean(r)&&!r.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&r!=='..'&&!isAbsolute(r);}
async function inspectAncestors(path){
 for(let p=path;;p=dirname(p)){
  try{const s=await lstat(p);if(s.isSymbolicLink()||!s.isDirectory())throw failure();}catch(e){if(e.code!=='ENOENT')throw failure();}
  if(dirname(p)===p)break;
 }
}
function windowsOperation(operation,data){
 return new Promise((resolvePromise,reject)=>{
  if(process.platform!=='win32')return reject(failure());
  const executable=join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-File',helper],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',size=0,settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(failure()):resolvePromise(value);};
  const timer=setTimeout(()=>{child.kill();finish(true);},30000);
  child.on('error',()=>finish(true));child.stdin.on('error',()=>finish(true));
  child.stderr.on('data',()=>{});
  child.stdout.on('data',part=>{size+=part.length;if(size>MAX*2){child.kill();finish(true);}else output+=part;});
  child.on('close',code=>{
   if(code!==0)return finish(true);
   const value=output.trim();if(!value||!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4!==0)return finish(true);
   finish(false,Buffer.from(value,'base64'));
  });
  child.stdin.end(JSON.stringify({operation,data:Buffer.from(data).toString('base64')}));
 });
}
function validate(value){if(!value||typeof value!=='object'||Array.isArray(value)||!value.connections||typeof value.connections!=='object'||Array.isArray(value.connections))throw failure();return value;}

/** Local TEST-only custody. DPAPI CurrentUser + user-only ACL. Not a hosted vault.
 * Injected protect/unprotect functions are for synthetic tests only.
 * The caller must validate each connection's immutable context after decryption.
 */
export async function openVault({directory,repositoryRoot,protect,unprotect}={}){
 let lock,closed=false,closing=false,closePromise,poisoned=false,queue=Promise.resolve();
 try{
  if(process.platform!=='win32'||typeof directory!=='string'||typeof repositoryRoot!=='string'||!isAbsolute(directory)||!isAbsolute(repositoryRoot)||!process.env.LOCALAPPDATA)throw failure();
  if(Boolean(protect)!==Boolean(unprotect)||protect&& (typeof protect!=='function'||typeof unprotect!=='function'))throw failure();
  const root=await realpath(process.env.LOCALAPPDATA),repo=await realpath(repositoryRoot);let folder=resolve(directory);
  if(!beneath(root,folder)||folder===repo||beneath(repo,folder)||beneath(folder,repo))throw failure();
  await inspectAncestors(folder);await mkdir(folder,{recursive:true});await inspectAncestors(folder);
  const canonical=await realpath(folder);if(!beneath(root,canonical)||canonical===repo||beneath(repo,canonical))throw failure();await inspectAncestors(canonical);
  await windowsOperation('secure-directory',Buffer.from(folder,'utf8'));
  const lockPath=join(folder,'vault.lock'),file=join(folder,'vault.dpapi');
  lock=await open(lockPath,'wx',0o600);
  await lock.writeFile('T19 exclusive writer\n');await lock.sync();
  const seal=protect??(bytes=>windowsOperation('protect',bytes)),unseal=unprotect??(bytes=>windowsOperation('unprotect',bytes));
  const active=()=>{if(closed||poisoned)throw failure();};
  const read=async()=>{
   active();await inspectAncestors(folder);
   let encrypted;
   try{const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size>MAX*2)throw failure();encrypted=await readFile(file);}catch(e){if(e.code==='ENOENT')return {connections:{}};throw failure();}
   let plain;try{plain=await unseal(encrypted);if(plain.length>MAX)throw failure();return structuredClone(validate(JSON.parse(plain.toString('utf8'))));}catch{throw failure();}finally{plain?.fill(0);}
  };
  // Detect corruption before exposing the store; never silently reset existing state.
  await read();
  return {
   read:()=>closing?Promise.reject(failure()):queue.then(read).catch(()=>{throw failure();}),
   write(value){
    let plain;try{if(closing)throw failure();active();plain=Buffer.from(JSON.stringify(validate(structuredClone(value))));if(plain.length>MAX)throw failure();}catch{plain?.fill(0);return Promise.reject(failure());}
    const task=queue.then(async()=>{
     let temp,handle;
     try{
      active();await inspectAncestors(folder);
      const encrypted=await seal(plain);if(!Buffer.isBuffer(encrypted)||!encrypted.length||encrypted.length>MAX*2)throw failure();
      temp=join(folder,'vault-'+randomUUID()+'.tmp');handle=await open(temp,'wx',0o600);await handle.writeFile(encrypted);await handle.sync();await handle.close();handle=null;
      // Existing target must be an ordinary file, never a link or directory.
      try{const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink())throw failure();}catch(e){if(e.code!=='ENOENT')throw e;}
      await rename(temp,file);temp=null;
     }catch{poisoned=true;throw failure();}finally{plain.fill(0);await handle?.close().catch(()=>{});if(temp)await unlink(temp).catch(()=>{});}
    });queue=task.catch(()=>{});return task;
   },
   close(){if(closePromise)return closePromise;closing=true;closePromise=(async()=>{await queue;closed=true;await lock.close();lock=null;await unlink(lockPath);})();return closePromise;}
  };
 }catch{await lock?.close().catch(()=>{});if(lock)await unlink(join(resolve(directory),'vault.lock')).catch(()=>{});throw failure();}
}
