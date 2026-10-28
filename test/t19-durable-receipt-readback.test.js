import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {writeReceiptOnce,readReceipt,verifyDockerReadback,recoveryDecision} from '../scripts/t19-durable-receipt-readback.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32),image='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const receipt={version:1,id,nonce,image,name:'faraios-t19-managed-qa',state:'CREATED'};
test('receipt survives readback and never overwrites existing receipt',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'t19-journal-'));
 const path=await writeReceiptOnce(dir,receipt);
 assert.deepEqual(await readReceipt(dir,nonce),receipt);
 await assert.rejects(writeReceiptOnce(dir,receipt));
 assert.equal(JSON.parse(await readFile(path,'utf8')).id,id);
});
test('Docker readback denial for missing restrictions',()=>{
 const r=verifyDockerReadback({HostConfig:{NetworkMode:'bridge'},Config:{Image:image}});
 assert.equal(r.startAllowed,false);assert.equal(r.cleanupAllowed,false);assert.ok(r.problems.includes('NETWORK'));
});
test('recovery stays manual even with matching stopped container',()=>{
 const c={Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:image,Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:false}};
 assert.equal(recoveryDecision(receipt,c,[id]).action,'MANUAL_REVIEW');
 assert.equal(recoveryDecision(receipt,c,[id]).removeAllowed,false);
 assert.equal(recoveryDecision(receipt,{...c,State:{Running:true}},[id]).action,'QUARANTINE');
});
