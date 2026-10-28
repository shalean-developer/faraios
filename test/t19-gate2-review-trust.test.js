import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {makePinnedReviewTrust} from '../scripts/t19-gate2-review-trust.mjs';
const {publicKey}=generateKeyPairSync('ed25519');
const pem=publicKey.export({type:'spki',format:'pem'});
const digest=createHash('sha256').update(publicKey.export({type:'spki',format:'der'})).digest('hex');
test('pinned independent key fingerprint resolves for verification only',async()=>{
 const t=makePinnedReviewTrust({publicKeyPem:pem,approvedFingerprint:digest});
 assert.equal(await t.resolveApprovedPublicKey(),pem);assert.equal(t.executionAuthorized,false);
});
test('wrong fingerprint and missing custody deny',()=>{
 assert.throws(()=>makePinnedReviewTrust({publicKeyPem:pem,approvedFingerprint:'0'.repeat(64)}),/MISMATCH/);
 assert.throws(()=>makePinnedReviewTrust({}),/NO_GO/);
});
