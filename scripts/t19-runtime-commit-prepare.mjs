// Owner-side files only. No database dependency, credential loading or execution.
import fs from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {runtimeCommitPackage} from './t19-runtime-commit-package.mjs';
import {sha,PROJECT,captureSQL,rehearsalPackage} from './t19-provisioning-package.mjs';
const refuse=()=>{throw Error('RUNTIME_COMMIT_PREPARATION_REFUSED');};
async function checked(path,directory=false){
 const p=resolve(path),s=await fs.lstat(p);
 if(await fs.realpath(p)!==p||s.uid!==process.getuid()||(s.mode&0o077)!==0||(directory?!s.isDirectory():!s.isFile()||s.nlink!==1||s.size>1048576))refuse();
 for(let a=dirname(p);;a=dirname(a)){
  const t=await fs.lstat(a);if(!t.isDirectory()||t.isSymbolicLink()||![0,process.getuid()].includes(t.uid)||((t.mode&0o022)&&!(t.uid===0&&(t.mode&0o1000))))refuse();
  if(await fs.lstat(join(a,'.git')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))refuse();
  if(dirname(a)===a)break;
 }return p;
}
async function read(path){return fs.readFile(await checked(path),'utf8');}
async function write(path,value){const f=await fs.open(path,'wx',0o600);try{await f.writeFile(value);await f.sync();}finally{await f.close();}}
try{
 const [inputPath,historyPath,outputPath,...extra]=process.argv.slice(2);
 if(process.platform!=='linux'||process.versions.node.split('.')[0]!=='24'||!inputPath||!historyPath||!outputPath||extra.length)refuse();
 const input=JSON.parse(await read(inputPath)),history=await checked(historyPath,true),out=await checked(outputPath,true),now=Date.now();
 if(Object.keys(input).sort().join(',')!=='baselineSha256,capturedAt,nonce,projectRef,version'||input.version!==1||input.projectRef!==PROJECT||!Number.isSafeInteger(input.capturedAt)||input.capturedAt>now||now-input.capturedAt>300000||(await fs.readdir(out)).length)refuse();
 const names=['packet/packet.json','packet/rehearsal.sql','execution-started.json','rehearsal-output.txt','fresh-after.txt','result.json'];
 const saved=Object.fromEntries(await Promise.all(names.map(async n=>[n,await read(history+'/'+n)])));
 const old=JSON.parse(saved['packet/packet.json']),started=JSON.parse(saved['execution-started.json']),result=JSON.parse(saved['result.json']);
 if(old.projectRef!==PROJECT||old.stage!=='runtime'||old.commitAuthorized!==false||old.sourceSha256!==sha(await fs.readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url)))||old.sqlSha256!==sha(saved['packet/rehearsal.sql'])||old.captureSha256!==sha(captureSQL())||old.baselineSha256!==input.baselineSha256||started.sqlSha256!==old.sqlSha256||started.stage!=='runtime'||started.rollbackOnly!==true||!Number.isFinite(Date.parse(started.startedAt))||Date.parse(started.startedAt)<old.issuedAt||Date.parse(started.startedAt)>=old.expiresAt||result.status!=='RUNTIME_ROLLBACK_REHEARSAL_PASS'||result.executionExit!==0||result.freshBaselineUnchanged!==true||result.commitAuthorized!==false||result.evidenceDirectory!==history||saved['fresh-after.txt'].trim()!==input.baselineSha256||!/^ROLLBACK\s*$/m.test(saved['rehearsal-output.txt']))refuse();
 const replay=rehearsalPackage({projectRef:old.projectRef,stage:old.stage,sql:await fs.readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8'),baselineSha256:old.baselineSha256,issuedAt:old.issuedAt,expiresAt:old.expiresAt},old.issuedAt);
 if(replay.sql!==saved['packet/rehearsal.sql'])refuse();
 const rehearsalEvidenceSha256=sha(JSON.stringify(names.map(name=>({name,sha256:sha(saved[name])}))));
 const sql=await fs.readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8');
 const expected=await fs.readFile(new URL('../test-support/t19-runtime-contract-expected.json',import.meta.url),'utf8');
 const packet=runtimeCommitPackage({projectRef:PROJECT,stage:'runtime',baselineSha256:input.baselineSha256,sql,nonce:input.nonce,rehearsalEvidenceSha256,issuedAt:now,expiresAt:input.capturedAt+900000},expected,now);
 const {sql:commitSQL,postCommitSQL,...binding}=packet;
 await write(out+'/runtime-commit.sql',commitSQL);await write(out+'/post-commit.sql',postCommitSQL);await write(out+'/packet.json',JSON.stringify(binding,null,2)+'\n');
 const d=await fs.open(out,'r');try{await d.sync();}finally{await d.close();}
 console.log(JSON.stringify({status:'RUNTIME_COMMIT_CANDIDATE_PREPARED_NOT_AUTHORIZED',sqlSha256:packet.sqlSha256,contractSha256:packet.contractSha256,expiresAt:new Date(packet.expiresAt).toISOString(),executionAuthorized:false,activationAuthorized:false,sqlExecuted:false}));
}catch{console.error('T19_RUNTIME_COMMIT_PREPARE_STOP');process.exitCode=1;}
