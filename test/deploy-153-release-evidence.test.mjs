import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReleaseEvidence} from '../scripts/deploy-153-release-evidence.mjs';
const sha='a'.repeat(40), fingerprint='b'.repeat(64);
const release={commit:sha,environment:'staging',startup:'_passenger.cjs',approvedCI:true,rollbackReady:true,sourceFingerprint:fingerprint};
const health={environment:'staging',projectRef:'xdmfyrsauvqznkloroxg',sourceFingerprint:fingerprint,transport:'litespeed',appPaymentDispatch:'disabled',appNotificationDispatch:'disabled',accountingWorker:'disabled'};
const verify=(r=release,h=health,s=sha,f=fingerprint)=>verifyReleaseEvidence({release:r,health:h,expectedSha:s,computedFingerprint:f});
test('matching inert staging release evidence passes',()=>assert.equal(verify().result,'PASS'));
for(const [label,field,value] of [['wrong SHA','commit','c'.repeat(40)],['inactive CI','approvedCI',false],['no rollback','rollbackReady',false],['accounting launcher','startup','_accounting.cjs'],['wrong environment','environment','production'],['fingerprint mismatch','sourceFingerprint','c'.repeat(64)]]){
  test('reject '+label,()=>assert.throws(()=>verify({...release,[field]:value}),/RELEASE_/));
}
for(const [label,field,value] of [['wrong database','projectRef','production-ref'],['financial runtime','accountingWorker','enabled'],['payments','appPaymentDispatch','enabled'],['notifications','appNotificationDispatch','enabled'],['wrong source','sourceFingerprint','c'.repeat(64)],['untrusted transport','transport','http']]){
  test('reject health '+label,()=>assert.throws(()=>verify(release,{...health,[field]:value}),/RELEASE_HEALTH_MISMATCH/));
}
