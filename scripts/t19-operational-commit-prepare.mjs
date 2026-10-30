// Owner-only offline preparation. No DB dependency, secret loading or execution.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {operationalCommitPackage} from './t19-operational-commit-package.mjs';
import {sha,PROJECT,captureSQL,rehearsalPackage} from './t19-provisioning-package.mjs';
const refuse=()=>{throw Error('T19_OPERATIONAL_COMMIT_PREPARATION_REFUSED');};
async function checked(path,directory=false){
 const p=resolve(path),s=await fs.lstat(p);
 if(await fs.realpath(p)!==p||s.uid!==process.getuid()||(s.mode&0o077)||
 (directory?!s.isDirectory():!s.isFile()||s.nlink!==1||s.size>1048576))refuse();
 for(let a=dirname(p);;a=dirname(a)){
  const t=await fs.lstat(a);
  if(!t.isDirectory()||t.isSymbolicLink()||![0,process.getuid()].includes(t.uid)||
  ((t.mode&0o022)&&!(t.uid===0&&(t.mode&0o1000))))refuse();
  if(await fs.lstat(join(a,'.git')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))refuse();
  if(dirname(a)===a)break;
 }return {path:p,stat:s};
}
async function read(path){
 const before=await checked(path),h=await fs.open(before.path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const opened=await h.stat();if(opened.dev!==before.stat.dev||opened.ino!==before.stat.ino)refuse();
  const buffer=Buffer.alloc(before.stat.size+1);let length=0;
  while(length<buffer.length){const r=await h.read(buffer,length,buffer.length-length,null);if(!r.bytesRead)break;length+=r.bytesRead;}
  for(const s of [await h.stat(),await fs.lstat(before.path)])
   if(['dev','ino','size','mtimeMs','ctimeMs','mode','nlink'].some(k=>s[k]!==before.stat[k]))refuse();
  if(length!==before.stat.size)refuse();return buffer.subarray(0,length).toString('utf8');
 }finally{await h.close();}
}
async function write(path,value){const h=await fs.open(path,'wx',0o600);try{await h.writeFile(value);await h.sync();}finally{await h.close();}}
try{
 const [inputPath,historyPath,outputPath,...extra]=process.argv.slice(2);
 if(process.platform!=='linux'||process.versions.node.split('.')[0]!=='24'||!inputPath||!historyPath||!outputPath||extra.length)refuse();
 const input=JSON.parse(await read(inputPath)),history=(await checked(historyPath,true)).path,out=(await checked(outputPath,true)).path,now=Date.now();
 if(out===history||out.startsWith(history+'/'))refuse();
 if(Object.keys(input).sort().join(',')!=='baselineSha256,capturedAt,nonce,projectRef,stage,version'||input.version!==1||input.projectRef!==PROJECT||
 !['oauth','api'].includes(input.stage)||!Number.isSafeInteger(input.capturedAt)||input.capturedAt>now||now-input.capturedAt>300000||
 (await fs.readdir(out)).length)refuse();
 const names=['packet/packet.json','packet/rehearsal.sql','packet/fresh-after.sql','execution-started.json',
 'rehearsal-output.txt','rehearsal-stderr.txt','fresh-after.txt','result.json'];
 const saved=Object.fromEntries(await Promise.all(names.map(async n=>[n,await read(history+'/'+n)])));
 const old=JSON.parse(saved['packet/packet.json']),started=JSON.parse(saved['execution-started.json']),result=JSON.parse(saved['result.json']);
 const source=await fs.readFile(new URL('../database/t19-custody-'+input.stage+'.sql',import.meta.url),'utf8');
 const replay=rehearsalPackage({projectRef:old.projectRef,stage:old.stage,sql:source,baselineSha256:old.baselineSha256,
 issuedAt:old.issuedAt,expiresAt:old.expiresAt},old.issuedAt);
 const {sql:replaySQL,...binding}=replay;
 if(JSON.stringify(old)!==JSON.stringify({...binding,captureSha256:sha(captureSQL()),freshAfterCaptureRequired:true})||
 old.projectRef!==PROJECT||old.stage!==input.stage||old.baselineSha256!==input.baselineSha256||
 replaySQL!==saved['packet/rehearsal.sql']||saved['packet/fresh-after.sql']!==captureSQL()||
 started.sqlSha256!==old.sqlSha256||started.stage!==input.stage||started.rollbackOnly!==true||
 started.ownerApproved!==true||started.quietWindowConfirmed!==true||
 !Number.isFinite(Date.parse(started.startedAt))||Date.parse(started.startedAt)<old.issuedAt||Date.parse(started.startedAt)>=old.expiresAt||
 result.status!==input.stage.toUpperCase()+'_ROLLBACK_REHEARSAL_PASS'||result.executionExit!==0||result.freshCheckExit!==0||
 result.freshBaselineUnchanged!==true||result.rollbackRecorded!==true||result.postconditionsRecorded!==true||
 result.commitAuthorized!==false||result.activationAuthorized!==false||result.evidenceDirectory!==history||
 saved['fresh-after.txt'].trim()!==input.baselineSha256||!/^ROLLBACK\s*$/m.test(saved['rehearsal-output.txt'])||
 !saved['rehearsal-stderr.txt'].includes('T19_'+input.stage.toUpperCase()+'_REHEARSAL_POSTCONDITIONS_PASS'))refuse();
 const previous=input.stage==='oauth'?'runtime':'oauth';
 const contracts={before:await fs.readFile(new URL('../test-support/t19-'+previous+'-contract-expected.json',import.meta.url),'utf8'),
 after:await fs.readFile(new URL('../test-support/t19-'+input.stage+'-contract-expected.json',import.meta.url),'utf8')};
 const packet=operationalCommitPackage({projectRef:PROJECT,stage:input.stage,sql:source,baselineSha256:input.baselineSha256,
 nonce:input.nonce,rehearsalEvidenceSha256:sha(JSON.stringify(names.map(name=>({name,sha256:sha(saved[name])})))),
 issuedAt:now,expiresAt:input.capturedAt+900000},contracts,now);
 const {sql,postCommitSQL,...bound}=packet;
 await write(out+'/stage-commit.sql',sql);await write(out+'/post-commit.sql',postCommitSQL);await write(out+'/packet.json',JSON.stringify(bound,null,2)+'\n');
 const d=await fs.open(out,'r');try{await d.sync();}finally{await d.close();}
 console.log(JSON.stringify({status:'OPERATIONAL_COMMIT_CANDIDATE_PREPARED_NOT_AUTHORIZED',stage:input.stage,
 sqlSha256:packet.sqlSha256,contractSha256:packet.contractSha256,expiresAt:new Date(packet.expiresAt).toISOString(),
 executionAuthorized:false,activationAuthorized:false,sqlExecuted:false}));
}catch{console.error('T19_OPERATIONAL_COMMIT_PREPARE_STOP');process.exitCode=1;}
