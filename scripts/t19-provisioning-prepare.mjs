// Owner-side file preparation only. No pg client, environment DB config or SQL execution.
import fs from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {captureSQL,rehearsalPackage,PROJECT,PINS,sha} from './t19-provisioning-package.mjs';
const [mode,input,output,...extra]=process.argv.slice(2);
const fail=()=>{throw Error('PROVISIONING_PREPARATION_REFUSED');};
async function privatePath(path,dir=false){
 const full=resolve(path);if(await fs.realpath(full)!==full)fail();const s=await fs.lstat(full);
 if(dir?!s.isDirectory():!s.isFile()||s.nlink!==1||s.size>8192)fail();
 if(process.platform!=='linux'||s.uid!==process.getuid()||(s.mode&0o077)!==0)fail();
 for(let p=dirname(full);;p=dirname(p)){
  const x=await fs.lstat(p);if(!x.isDirectory()||x.isSymbolicLink()||![0,process.getuid()].includes(x.uid)||((x.mode&0o022)&&!(x.uid===0&&(x.mode&0o1000))))fail();
  if(await fs.lstat(join(p,'.git')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))fail();
  if(dirname(p)===p)break;
 }
 return full;
}
async function write(path,text){const f=await fs.open(path,'wx',0o600);try{await f.writeFile(text);await f.sync();}finally{await f.close();}}
try{
 if(process.versions.node.split('.')[0]!=='24'||extra.length)fail();
 if(mode==='--capture-sql'&&!input&&!output){process.stdout.write(captureSQL());}
 else{
  if(mode!=='--prepare'||!input||!output)fail();
  const file=await privatePath(input),dir=await privatePath(output,true);if((await fs.readdir(dir)).length)fail();
  const r=JSON.parse(await fs.readFile(file,'utf8')),now=Date.now();
  if(Object.keys(r).sort().join(',')!=='baselineSha256,capturedAt,projectRef,stage,version'||r.version!==1||r.projectRef!==PROJECT||!Object.hasOwn(PINS,r.stage)||!Number.isSafeInteger(r.capturedAt)||r.capturedAt>now||now-r.capturedAt>300000)fail();
  // One stage only. Rehearsal of later stages requires the corresponding prior
  // stage to have been separately accepted and a fresh capture of that state.
  const sql=await fs.readFile(new URL('../database/t19-custody-'+r.stage+'.sql',import.meta.url),'utf8');
  const packet=rehearsalPackage({projectRef:r.projectRef,stage:r.stage,sql,baselineSha256:r.baselineSha256,issuedAt:now,expiresAt:r.capturedAt+900000},now);
  const {sql:script,...binding}=packet;
  await write(join(dir,'rehearsal.sql'),script);await write(join(dir,'packet.json'),JSON.stringify({...binding,captureSha256:sha(captureSQL()),freshAfterCaptureRequired:true},null,2)+'\n');
  await write(join(dir,'fresh-after.sql'),captureSQL());const d=await fs.open(dir,'r');try{await d.sync();}finally{await d.close();}
  console.log(JSON.stringify({status:'ROLLBACK_REHEARSAL_PACKAGE_PREPARED_NOT_AUTHORIZED',stage:r.stage,sqlSha256:packet.sqlSha256,expiresAt:new Date(packet.expiresAt).toISOString(),commitAuthorized:false,sqlExecuted:false}));
 }
}catch{console.error('T19_PROVISIONING_PREPARE_STOP');process.exitCode=1;}
