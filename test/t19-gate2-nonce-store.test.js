import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {makeLocalNonceStore} from '../scripts/t19-gate2-nonce-store.mjs';
test('consume once is exclusive across store instances and concurrent requests',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'t19-replay-'));
 const a=makeLocalNonceStore(dir),b=makeLocalNonceStore(dir),nonce='a'.repeat(32);
 const results=await Promise.all([a.consumeOnce(nonce),b.consumeOnce(nonce)]);
 assert.deepEqual(results.sort(),[false,true]);
 assert.equal(await a.consumeOnce(nonce),false);
 assert.equal((await b.inspect(nonce)).phase,'CONSUMED');
});
test('invalid nonce never creates grant',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'t19-replay-'));
 await assert.rejects(makeLocalNonceStore(dir).consumeOnce('../escape'),/INVALID_NONCE/);
});
