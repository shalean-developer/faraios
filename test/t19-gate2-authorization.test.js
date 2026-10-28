import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {verifyExactRun} from '../scripts/t19-gate2-authorization.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const scriptBytes=Buffer.from('fixed reviewed script');
const receipt={version:1,scriptSha256:createHash('sha256').update(scriptBytes).digest('hex'),
 image:'sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda',
 containerName:'faraios-t19-managed-qa',nonce:'a'.repeat(32),expiresAt:100000,scope:'local-disposable-postgres-startup-only'};
const canonical=o=>JSON.stringify(Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]])));
const signed=o=>sign(null,Buffer.from(canonical(o)),privateKey).toString('base64');
const args=o=>({receipt:o,signature:signed(o),publicKeyPem:publicKey.export({type:'spki',format:'pem'}),scriptBytes,now:90000});
test('valid signature still cannot authorize execution without anti-replay custody',async()=>{
 const x=await verifyExactRun(args(receipt));assert.equal(x.signatureValid,true);assert.equal(x.authorized,false);
});
test('tampering and changed script deny',async()=>{
 assert.equal((await verifyExactRun({...args(receipt),scriptBytes:Buffer.from('changed')})).authorized,false);
 const changed={...receipt,image:'postgres:latest'};
 assert.equal((await verifyExactRun({...args(receipt),receipt:changed})).authorized,false);
 assert.equal((await verifyExactRun({...args(receipt),now:100001})).authorized,false);
});
