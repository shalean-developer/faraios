import test from 'node:test';import assert from 'node:assert/strict';
import {makeRestrictedDocker} from '../scripts/t19-gate2-restricted-docker.mjs';
test('legacy adapter cannot accept a caller-forged consumed grant',()=>{
 let calls=0;
 for(const grant of [undefined,{consumed:true,nonce:'b'.repeat(32),scope:'local-disposable-postgres-startup-only'}]){
  assert.throws(()=>makeRestrictedDocker({nonce:'b'.repeat(32),grant,run:async()=>{calls++}}),/NO_GO/);
 }
 assert.equal(calls,0);
});
