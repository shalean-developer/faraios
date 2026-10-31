import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,stat,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {syntheticRecoveryFixture} from '../scripts/t19-standard-recovery-rehearsal.mjs';
import {prepareCredentialHandoff,preparePrivateStagingRecovery} from '../src/t19-standard-recovery-handoff.js';
import {restoreCredentialBackup,credentialMaterialDigest} from '../src/t19-standard-recovery.js';
import {readRecoveryPair} from '../src/t19-standard-recovery-files.js';
const denied={message:'accounting_recovery_handoff_rejected'},linux={skip:process.platform!=='linux'};
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'t19-handoff-')),f=syntheticRecoveryFixture();try{return await fn(root,f);}finally{f.config.key.fill(0);await rm(root,{recursive:true,force:true});}}
test('private handoff separates owner secret from upload files and records preparation only',linux,()=>fixture(async(root,{records,config})=>{
 const before=JSON.stringify(records),result=await prepareCredentialHandoff({root,records,config,readCurrent:async()=>records});
 assert.equal(result.connections,2);assert.equal(result.offHostVerified,false);assert.equal(result.activeWrites,0);assert.equal(JSON.stringify(records),before);
 const folder=join(root,result.folder),secretPath=join(folder,'owner-handoff','recovery-secret.txt'),pass=(await readFile(secretPath,'utf8')).trim();
 assert.equal(pass.length,64);assert.equal((await stat(secretPath)).mode&0o777,0o600);
 for(const dir of ['data','escrow','owner-handoff'])assert.equal((await stat(join(folder,dir))).mode&0o777,0o700);
 const saved=await readRecoveryPair(join(folder,'data'),join(folder,'escrow')),restored=await restoreCredentialBackup(saved.data,saved.escrow,pass);
 try{assert.equal(credentialMaterialDigest(restored.records,restored),credentialMaterialDigest(records,config));}finally{restored.key.fill(0);}
 const uploads=JSON.stringify(saved);assert.ok(!uploads.includes(pass));assert.ok(!uploads.includes(config.key.toString('hex')));assert.ok(!uploads.includes('SYNTHETIC-REFRESH-'));assert.ok(!JSON.stringify(result).includes(pass));
 assert.deepEqual(JSON.parse(await readFile(join(folder,'receipt.json'),'utf8')),result);
}));
test('stale snapshot fails with no receipt and preserves restricted partial artifacts',linux,()=>fixture(async(root,{records,config})=>{
 const changed=structuredClone(records);changed[0].generation++;
 await assert.rejects(prepareCredentialHandoff({root,records,config,readCurrent:async()=>changed}),denied);
 const folders=await readdir(root);assert.equal(folders.length,1);assert.ok(!(await readdir(join(root,folders[0]))).includes('receipt.json'));
 assert.equal((await stat(join(root,folders[0],'owner-handoff','recovery-secret.txt'))).mode&0o777,0o600);
}));
test('insecure root and foreign ciphertext reject before export',linux,()=>fixture(async(root,{records,config})=>{
 await chmod(root,0o755);await assert.rejects(prepareCredentialHandoff({root,records,config,readCurrent:async()=>records}),denied);await chmod(root,0o700);
 assert.deepEqual(await readdir(root),[]);const bad=structuredClone(records);bad[0].envelope=bad[1].envelope;
 await assert.rejects(prepareCredentialHandoff({root,records:bad,config,readCurrent:async()=>records}),denied);assert.deepEqual(await readdir(root),[]);
}));
function runtime(f){
 const settings={version:1,enabled:true,backend:{email:'synthetic@example.invalid',password:'SYNTHETIC-NOT-A-LOGIN',principalId:'00000000-0000-4000-8000-000000000001'},zoho:{clientId:f.records[0].clientId,clientSecret:'SYNTHETIC-NOT-A-CLIENT-SECRET',encryptionKey:f.config.key.toString('hex'),keyId:f.config.keyId}};
 const worker={version:1,environment:'staging',enabled:true,businessIds:f.records.map(r=>r.businessId)},calls=[];
 const createBackend=async()=>({rpc:async(name,{action,input})=>{calls.push({name,action,input});if(action==='health')return {data:{ready:true}};if(action==='connection')return {data:f.records.find(r=>r.businessId===input.businessId)};throw Error('unexpected operation');}});
 return {settings,worker,calls,createBackend};
}
test('host composition only reads health/connections; it never invokes jobs, provider or mutation RPCs',linux,()=>fixture(async(root,f)=>{
 const {settings,worker,calls,createBackend}=runtime(f);
 const result=await preparePrivateStagingRecovery({root,loadSettings:async()=>settings,loadWorker:async()=>worker,createBackend});
 assert.equal(result.prepared,true);assert.deepEqual(calls.map(c=>c.action),['health','connection','connection','connection','connection']);assert.ok(calls.every(c=>c.name==='t19_standard_store'));assert.ok(calls.slice(1).every(c=>c.input.environment==='staging'));
}));
test('changed private config, cross-business response and unhealthy enrollment cannot publish receipt',linux,()=>fixture(async(root,f)=>{
 for(const scenario of ['config','foreign','health']){
  const dir=await mkdtemp(join(root,'scenario-')),{settings,worker,createBackend}=runtime(f);let loads=0;
  const backend=scenario==='foreign'?async()=>({rpc:async(n,{action})=>({data:action==='health'?{ready:true}:f.records[1]})}):scenario==='health'?async()=>({rpc:async()=>({data:{ready:false}})}):createBackend;
  await assert.rejects(preparePrivateStagingRecovery({root:dir,loadSettings:async()=>++loads>1?{...settings,enabled:false}:settings,loadWorker:async()=>worker,createBackend:backend}),denied);
  for(const name of await readdir(dir))assert.ok(!(await readdir(join(dir,name))).includes('receipt.json'));
 }
}));
