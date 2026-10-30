import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {operationalCommitPackage,operationalContractGuard,CONTRACT_PINS} from '../scripts/t19-operational-commit-package.mjs';
import {rehearsalPackage,captureSQL,sha,PROJECT} from '../scripts/t19-provisioning-package.mjs';
const source=stage=>fs.readFileSync(new URL('../database/t19-custody-'+stage+'.sql',import.meta.url),'utf8');
const contract=stage=>fs.readFileSync(new URL('../test-support/t19-'+stage+'-contract-expected.json',import.meta.url),'utf8');
const now=Date.now(),baseline='a'.repeat(64);
const input=stage=>({projectRef:PROJECT,stage,sql:source(stage),baselineSha256:baseline,nonce:'b'.repeat(32),
 rehearsalEvidenceSha256:'c'.repeat(64),issuedAt:now,expiresAt:now+900000});
for(const stage of ['oauth','api']){
 const previous=stage==='oauth'?'runtime':'oauth',contracts={before:contract(previous),after:contract(stage)};
 test(stage+' candidate pins both contracts, original source, bounds and a fresh read-only check',()=>{
  assert.equal(sha(contracts.before),CONTRACT_PINS[previous]);assert.equal(sha(contracts.after),CONTRACT_PINS[stage]);
  const p=operationalCommitPackage(input(stage),contracts,now);
  assert.equal(p.priorStage,previous);assert.equal(p.executionAuthorized,false);assert.equal(p.activationAuthorized,false);
  assert.equal(p.sourceSha256,sha(source(stage)));assert.equal(p.sqlSha256,sha(p.sql));assert.equal(p.postCommitSha256,sha(p.postCommitSQL));
  assert.match(p.sql,/T19_PROTECTED_DATA_CHANGED/);assert.match(p.sql,/T19_PACKET_EXPIRED/);assert.ok(p.sql.endsWith('COMMIT;\n'));
  assert.equal((p.sql.match(/DO \$t19_operational_contract\$/g)||[]).length,2);
  assert.match(p.postCommitSQL,/REPEATABLE READ READ ONLY/);assert.match(p.postCommitSQL,/T19_OPERATIONAL_EXACT_CONTRACT_MISMATCH/);
  for(const patch of [{stage:'runtime'},{stage:'other'},{sql:source(stage)+' '},{projectRef:'other'},
   {baselineSha256:'bad'},{nonce:['b'.repeat(32)]},{nonce:'bad'},{rehearsalEvidenceSha256:null},
   {issuedAt:now+1},{expiresAt:now},{expiresAt:now+900001},{extra:true}])
   assert.throws(()=>operationalCommitPackage({...input(stage),...patch},contracts,now));
  assert.throws(()=>operationalCommitPackage(input(stage),{...contracts,extra:true},now));
  assert.throws(()=>operationalCommitPackage(input(stage),{before:contracts.after,after:contracts.before},now));
  assert.throws(()=>operationalContractGuard(stage,contracts.after+' '));
  const projected=JSON.parse(contracts.after);
  assert.equal(projected.relations.filter(r=>r[1]==='r').length,10);assert.equal(projected.functions.length,stage==='oauth'?9:11);
  assert.equal(projected.publicWrappers.length,stage==='oauth'?0:4);
  if(stage==='api')assert.ok(projected.publicWrappers.every(w=>w[3]===false));
 });
 test(stage+' owner preparation binds accepted rollback evidence and refuses tamper without changing history',()=>{
  const dir=fs.mkdtempSync(join(os.tmpdir(),'t19-stage-commit-'));fs.chmodSync(dir,0o700);
  const write=(p,x)=>fs.writeFileSync(join(dir,p),typeof x==='string'?x:JSON.stringify(x),{mode:0o600,flag:'wx'});
  try{
   fs.mkdirSync(join(dir,'history'),{mode:0o700});fs.mkdirSync(join(dir,'history/packet'),{mode:0o700});fs.mkdirSync(join(dir,'output'),{mode:0o700});
   const old=rehearsalPackage({projectRef:PROJECT,stage,sql:source(stage),baselineSha256:baseline,
    issuedAt:now-60000,expiresAt:now+30000},now-60000);
   const {sql:oldSQL,...binding}=old;
   write('history/packet/packet.json',{...binding,captureSha256:sha(captureSQL()),freshAfterCaptureRequired:true});
   write('history/packet/rehearsal.sql',oldSQL);write('history/packet/fresh-after.sql',captureSQL());
   write('history/execution-started.json',{stage,sqlSha256:old.sqlSha256,startedAt:new Date(now-30000).toISOString(),
    rollbackOnly:true,ownerApproved:true,quietWindowConfirmed:true});
   write('history/rehearsal-output.txt','BEGIN\nDO\nROLLBACK\n');
   write('history/rehearsal-stderr.txt','NOTICE: T19_'+stage.toUpperCase()+'_REHEARSAL_POSTCONDITIONS_PASS\n');
   write('history/fresh-after.txt',baseline+'\n');
   write('history/result.json',{status:stage.toUpperCase()+'_ROLLBACK_REHEARSAL_PASS',executionExit:0,freshCheckExit:0,
    freshBaselineUnchanged:true,rollbackRecorded:true,postconditionsRecorded:true,commitAuthorized:false,
    activationAuthorized:false,evidenceDirectory:join(dir,'history')});
   write('input.json',{version:1,projectRef:PROJECT,stage,baselineSha256:baseline,capturedAt:now,nonce:'b'.repeat(32)});
   const historyFiles=['packet/packet.json','packet/rehearsal.sql','packet/fresh-after.sql','execution-started.json',
    'rehearsal-output.txt','rehearsal-stderr.txt','fresh-after.txt','result.json'];
   const history=()=>historyFiles.map(p=>sha(fs.readFileSync(join(dir,'history',p))));
   const original=history();
   const args=[new URL('../scripts/t19-operational-commit-prepare.mjs',import.meta.url).pathname,
    join(dir,'input.json'),join(dir,'history'),join(dir,'output')];
   const run=()=>spawnSync(process.execPath,args,{encoding:'utf8',timeout:10000});
   const result=run();assert.equal(result.status,0,result.stderr);const printed=JSON.parse(result.stdout);
   assert.equal(printed.stage,stage);assert.equal(printed.executionAuthorized,false);assert.equal(printed.sqlExecuted,false);
   assert.deepEqual(history(),original);
   assert.deepEqual(fs.readdirSync(join(dir,'output')).sort(),['packet.json','post-commit.sql','stage-commit.sql']);
   for(const name of fs.readdirSync(join(dir,'output')))assert.equal(fs.statSync(join(dir,'output',name)).mode&0o777,0o600);
   assert.equal(run().status,1);
   fs.mkdirSync(join(dir,'rejected'),{mode:0o700});args[3]=join(dir,'rejected');
   const saved=fs.readFileSync(join(dir,'history/result.json'),'utf8');
   for(const patch of [{freshCheckExit:3},{postconditionsRecorded:false},{activationAuthorized:true},{commitAuthorized:true}]){
    fs.writeFileSync(join(dir,'history/result.json'),JSON.stringify({...JSON.parse(saved),...patch}));
    assert.equal(run().status,1);assert.deepEqual(fs.readdirSync(join(dir,'rejected')),[]);
   }
   fs.writeFileSync(join(dir,'history/result.json'),saved);
   fs.mkdirSync(join(dir,'history/forbidden-output'),{mode:0o700});args[3]=join(dir,'history/forbidden-output');
   assert.equal(run().status,1);assert.deepEqual(fs.readdirSync(args[3]),[]);
   args[3]=join(dir,'rejected');fs.writeFileSync(join(dir,'history/rehearsal-stderr.txt'),'');
   assert.equal(run().status,1);assert.deepEqual(fs.readdirSync(join(dir,'rejected')),[]);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
}
