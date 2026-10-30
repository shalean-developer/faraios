// Owner-side read-only SQL preparation; no database client or secret loading.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {runtimeReconciliationSQL} from './t19-runtime-reconciliation.mjs';
import {sha} from './t19-provisioning-package.mjs';
const refuse=()=>{throw Error('RECONCILIATION_PREPARATION_REFUSED');};
try{
 const [mode,directory,flag,candidate,...extra]=process.argv.slice(2);
 if(process.platform!=='linux'||process.versions.node.split('.')[0]!=='24'||
    mode!=='--packet'||!directory||extra.length||
    (flag!==undefined&&(flag!=='--candidate'||!candidate)))refuse();
 const dir=resolve(directory);
 if(await fs.realpath(dir)!==dir)refuse();
 for(let p=dir;;p=dirname(p)){
  const s=await fs.lstat(p);
  if(!s.isDirectory()||s.isSymbolicLink()||![0,process.getuid()].includes(s.uid)||
     ((s.mode&0o022)&&!(s.uid===0&&(s.mode&0o1000)))||
     (p===dir&&(s.uid!==process.getuid()||(s.mode&0o077))))refuse();
  if(await fs.lstat(join(p,'.git')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))refuse();
  if(dirname(p)===p)break;
 }
 async function read(name){
  const f=await fs.open(join(dir,name),constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const s=await f.stat();
   if(!s.isFile()||s.uid!==process.getuid()||s.nlink!==1||(s.mode&0o077)||s.size>1048576)refuse();
   return await f.readFile('utf8');
  }finally{await f.close();}
 }
 const packet=JSON.parse(await read('packet.json'));
 if(sha(await read('runtime-commit.sql'))!==packet.sqlSha256||
    sha(await read('post-commit.sql'))!==packet.postCommitSha256)refuse();
 const sql=runtimeReconciliationSQL(packet,
  await fs.readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8'),
  await fs.readFile(new URL('../test-support/t19-runtime-contract-expected.json',import.meta.url),'utf8'),
  candidate??null);
 process.stdout.write(sql);
}catch{console.error('T19_RUNTIME_RECONCILE_PREPARE_STOP');process.exitCode=1;}
