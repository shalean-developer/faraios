import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {runtimeCommitPackage,runtimeContractGuard,CONTRACT_SHA256} from '../scripts/t19-runtime-commit-package.mjs';
import {rehearsalPackage,captureSQL,sha,PROJECT} from '../scripts/t19-provisioning-package.mjs';
const sql=fs.readFileSync(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8');
const contract=fs.readFileSync(new URL('../test-support/t19-runtime-contract-expected.json',import.meta.url),'utf8');
const now=Date.now(),baseline='a'.repeat(64);
const input={projectRef:PROJECT,stage:'runtime',sql,baselineSha256:baseline,issuedAt:now,expiresAt:now+900000,nonce:'b'.repeat(32),rehearsalEvidenceSha256:'c'.repeat(64)};
test('commit candidate binds exact runtime SQL, contract, lifetime and prior evidence without executing',()=>{
 assert.equal(sha(contract),CONTRACT_SHA256);
 const p=runtimeCommitPackage(input,contract,now);
 assert.equal(p.executionAuthorized,false);assert.equal(p.activationAuthorized,false);
 assert.match(p.sql,/T19_PROTECTED_DATA_CHANGED/);assert.match(p.sql,/T19_RUNTIME_EXACT_CONTRACT_MISMATCH/);assert.ok(p.sql.endsWith('COMMIT;\n'));
 assert.match(p.postCommitSQL,/READ ONLY/);assert.equal(sha(p.sql),p.sqlSha256);
 for(const change of [{stage:'oauth'},{projectRef:'other'},{sql:sql+' '},{nonce:['b'.repeat(32)]},{rehearsalEvidenceSha256:null},{expiresAt:now},{issuedAt:now+1},{extra:true}])assert.throws(()=>runtimeCommitPackage({...input,...change},contract,now));
 assert.throws(()=>runtimeContractGuard(contract+' '));
 assert.throws(()=>runtimeCommitPackage({...input,expectedContract:{}},contract,now));
});
test('owner preparation requires complete historical rollback evidence and writes private review files only',()=>{
 const dir=fs.mkdtempSync(join(os.tmpdir(),'t19-runtime-commit-'));fs.chmodSync(dir,0o700);
 const write=(p,x)=>fs.writeFileSync(join(dir,p),typeof x==='string'?x:JSON.stringify(x),{mode:0o600,flag:'wx'});
 try{
  fs.mkdirSync(join(dir,'history'),{mode:0o700});fs.mkdirSync(join(dir,'history/packet'),{mode:0o700});fs.mkdirSync(join(dir,'output'),{mode:0o700});
  const old=rehearsalPackage({projectRef:PROJECT,stage:'runtime',sql,baselineSha256:baseline,issuedAt:now-60000,expiresAt:now+30000},now-60000);
  const {sql:oldSQL,...binding}=old;
  write('history/packet/packet.json',{...binding,captureSha256:sha(captureSQL()),freshAfterCaptureRequired:true});write('history/packet/rehearsal.sql',oldSQL);
  write('history/execution-started.json',{stage:'runtime',sqlSha256:old.sqlSha256,startedAt:new Date(now-30000).toISOString(),rollbackOnly:true});
  write('history/rehearsal-output.txt','BEGIN\nDO\nROLLBACK\n');write('history/fresh-after.txt',baseline+'\n');
  write('history/result.json',{status:'RUNTIME_ROLLBACK_REHEARSAL_PASS',executionExit:0,freshBaselineUnchanged:true,commitAuthorized:false,evidenceDirectory:join(dir,'history')});
  write('input.json',{version:1,projectRef:PROJECT,baselineSha256:baseline,capturedAt:now,nonce:'b'.repeat(32)});
  const args=[new URL('../scripts/t19-runtime-commit-prepare.mjs',import.meta.url).pathname,join(dir,'input.json'),join(dir,'history'),join(dir,'output')];
  const result=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).sqlExecuted,false);
  assert.deepEqual(fs.readdirSync(join(dir,'output')).sort(),['packet.json','post-commit.sql','runtime-commit.sql']);
  for(const name of fs.readdirSync(join(dir,'output')))assert.equal(fs.statSync(join(dir,'output',name)).mode&0o777,0o600);
  assert.equal(spawnSync(process.execPath,args).status,1);
  fs.mkdirSync(join(dir,'rejected'),{mode:0o700});args[3]=join(dir,'rejected');fs.writeFileSync(join(dir,'history/fresh-after.txt'),'0'.repeat(64));
  assert.equal(spawnSync(process.execPath,args).status,1);assert.deepEqual(fs.readdirSync(join(dir,'rejected')),[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
