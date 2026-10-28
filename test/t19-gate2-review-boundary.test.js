import test from 'node:test';import assert from 'node:assert/strict';
import {assessAuthorization} from '../scripts/t19-gate2-review-boundary.mjs';
test('self-asserted independent PASS cannot unlock execution',async()=>{
 let calls=0;
 const reviewRecord={decision:'PASS',independent:true,headSha:'a'.repeat(40),approvedHeadSha:'a'.repeat(40)};
 const result=await assessAuthorization({reviewRecord,trust:{resolveApprovedPublicKey:async()=>{calls++;return null}},nonceStore:{consumeOnce:async()=>{calls++;return true}}});
 assert.equal(result.authorized,false);assert.equal(calls,1);
});
test('missing or contradictory security review denies without touching key custody',async()=>{
 let calls=0;
 const result=await assessAuthorization({reviewRecord:{decision:'PASS',independent:false},trust:{resolveApprovedPublicKey:async()=>{calls++}}});
 assert.equal(result.authorized,false);assert.equal(calls,0);
});
