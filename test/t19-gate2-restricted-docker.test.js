import test from 'node:test';import assert from 'node:assert/strict';
import {makeRestrictedDocker} from '../scripts/t19-gate2-restricted-docker.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32),image='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const grant={consumed:true,nonce,scope:'local-disposable-postgres-startup-only'};
test('reject missing or mismatched grant before Docker operations',()=>{
 assert.throws(()=>makeRestrictedDocker({run:async()=>'',nonce}),/NO_GO/);
 assert.throws(()=>makeRestrictedDocker({run:async()=>'',nonce,grant:{...grant,nonce:'c'.repeat(32)}}),/NO_GO/);
});
test('create sends bounded exact isolated arguments without host mounts or ports',async()=>{
 const calls=[],d=makeRestrictedDocker({nonce,grant,run:async(a,t)=>{calls.push([a,t]);return id}});
 assert.equal(await d.create(),id);const [a,t]=calls[0];
 assert.equal(a[0],'create');assert.equal(a[a.indexOf('--network')+1],'none');
 assert.equal(a[a.indexOf('--pull')+1],'never');assert.equal(a.at(-1),image);
 assert.equal(a.includes('-p'),false);assert.equal(a.includes('--privileged'),false);
 assert.equal(t,15000);
});
test('mutation denies mismatched ownership and refuses running removal',async()=>{
 const calls=[];let running=true;
 const d=makeRestrictedDocker({nonce,grant,run:async(a)=>{calls.push(a);if(a[1]==='inspect')return JSON.stringify({Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:image,Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:running}});return id;}});
 await assert.rejects(d.remove(id),/RUNNING_CONTAINER_QUARANTINE/);
 assert.equal(calls.some(x=>x[1]==='rm'),false);
 running=false;await d.remove(id);
 assert.equal(calls.some(x=>x[1]==='rm'),true);
});
test('SQL is explicitly outside approved startup scope',async()=>{
 const d=makeRestrictedDocker({nonce,grant,run:async()=>id});
 await assert.rejects(d.runSyntheticSql(),/NOT_REVIEWED/);
});
