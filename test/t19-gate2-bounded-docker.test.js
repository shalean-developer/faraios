import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {makeBoundedDocker} from '../scripts/t19-gate2-bounded-docker.mjs';
const fake=(exit=0)=>()=>{const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.kill=()=>{c.killed=true;return true};queueMicrotask(()=>c.emit('close',exit));return c;};
test('read-only docker adapter allows exact inspect and rejects mutations',async()=>{
 const docker=makeBoundedDocker({spawnProcess:fake()});
 assert.equal(await docker(['container','ls']),'');
 await assert.rejects(docker(['container','start','abc']),/EXECUTION_NO_GO/);
 await assert.rejects(docker(['container','rm','abc']),/EXECUTION_NO_GO/);
});
test('nonzero and invalid limits fail closed',async()=>{
 const docker=makeBoundedDocker({spawnProcess:fake(1)});
 await assert.rejects(docker(['image','inspect','sha256:test']),/DOCKER_READ_FAILURE/);
 await assert.rejects(docker(['container','ls'],{timeoutMs:0}),/INVALID/);
});
test('hung child is terminated and quarantined',async()=>{
 let killed=false;const docker=makeBoundedDocker({spawnProcess:()=>{const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.kill=()=>{killed=true;return true};return c;}});
 await assert.rejects(docker(['container','ls'],{timeoutMs:5}),/TIMEOUT_QUARANTINE/);
 assert.equal(killed,true);
});
