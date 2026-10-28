import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {gate2Execute} from '../scripts/t19-gate2-execution-gateway.mjs';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const scriptBytes=Buffer.from('reviewed executable');
const receipt={version:1,scriptSha256:createHash('sha256').update(scriptBytes).digest('hex'),
 image:'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda',
 containerName:'faraios-t19-managed-qa',nonce:'a'.repeat(32),
 expiresAt:Date.now()+60000,scope:'local-disposable-postgres-startup-only'};
const signature=sign(null,Buffer.from(JSON.stringify(Object.fromEntries(Object.keys(receipt).sort().map(k=>[k,receipt[k]])))),privateKey).toString('base64');
const approval={receipt,signature};
test('missing trusted key custody cannot access runner or nonce store',async()=>{
 let calls=0;const result=await gate2Execute({approval,scriptBytes,
 processRunner:async()=>{calls++},nonceStore:{consumeOnce:async()=>{calls++}}});
 assert.equal(result.status,'NO_GO');assert.equal(calls,0);
});
test('valid independent signature still fails closed before replay consumption and mutation',async()=>{
 let calls=0;
 const result=await gate2Execute({approval,scriptBytes,
 trust:{resolveApprovedPublicKey:async()=>publicKey.export({type:'spki',format:'pem'})},
 nonceStore:{consumeOnce:async()=>{calls++;return true}},
 processRunner:async()=>{calls++;throw Error('MUTATION_SHOULD_NOT_HAPPEN')},
 journal:{createIntent:async()=>{calls++}},
 sqlIntegrity:async()=>{calls++}});
 assert.equal(result.reason,'SIGNED_BUT_EXECUTION_NOT_AUTHORIZED');
 assert.equal(result.mutationAttempted,false);assert.equal(calls,0);
});
test('script tampering and unsigned inputs deny before mutations',async()=>{
 let calls=0;
 const result=await gate2Execute({approval,scriptBytes:Buffer.from('changed'),
 trust:{resolveApprovedPublicKey:async()=>publicKey.export({type:'spki',format:'pem'})},
 processRunner:async()=>{calls++}});
 assert.equal(result.status,'NO_GO');assert.equal(calls,0);
});
test('v3 real entrypoint cannot use caller-injected approval dependencies',async()=>{
 let calls=0;
 const result=await gate2Execute({approval:{receipt:{version:3},approved:true},
  trust:{resolveApprovedPublicKey:async()=>{calls++;return publicKey;}},
  processRunner:async()=>{calls++;},nonceStore:{consumeOnce:async()=>{calls++;return true;}},
  journal:{createIntent:async()=>{calls++;}},sqlIntegrity:async()=>{calls++;}});
 assert.equal(result.status,'NO_GO');assert.equal(result.mutationAttempted,false);assert.equal(calls,0);
});
