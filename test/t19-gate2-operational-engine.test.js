import test from 'node:test';import assert from 'node:assert/strict';
import {runDisposable} from '../scripts/t19-gate2-operational-engine.mjs';
const id='a'.repeat(64),nonce='b'.repeat(32),image='sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda';
const grant={consumed:true,scope:'local-disposable-postgres-startup-only',nonce,digest:'approved'};
function fixture(fail=''){
 const calls=[],state={running:false,exists:true};
 const record=o=>{calls.push(o);if(o===fail)throw Error('INJECTED_'+o);};
 const docker={
 create:async()=>{record('create');return id},inspect:async()=>{record('inspect');return {Id:id,Name:'/faraios-t19-managed-qa',Config:{Image:image,Labels:{'faraios.t19.run-nonce':nonce}},State:{Running:state.running}};},
 verifyIsolation:async()=>true,start:async()=>{record('start');state.running=true},
 awaitReady:async()=>record('ready'),runSyntheticSql:async()=>record('sql'),
 stop:async()=>{record('stop');state.running=false},
 remove:async()=>{record('remove');state.exists=false},exists:async()=>state.exists,
 findByNonce:async()=>[{Id:id}]
 };
 const journal={createIntent:async()=>record('intent'),bindId:async()=>record('bind'),
 markStopped:async()=>record('markStopped'),confirmBinding:async()=>true};
 return {docker,journal,calls};
}
test('complete injected lifecycle executes and verifies cleanup in order',async()=>{
 const f=fixture();const r=await runDisposable({...f,grant,expectedImage:image});
 assert.equal(r.status,'PASS');assert.equal(r.cleanupVerified,true);assert.ok(f.calls.indexOf('intent')<f.calls.indexOf('create'));
 assert.ok(f.calls.indexOf('sql')<f.calls.indexOf('remove'));
});
test('unknown create and crash stages quarantine; no automatic deletion',async()=>{
 for(const stage of ['create','bind','start','ready','sql','stop','markStopped']){
  const f=fixture(stage);const r=await runDisposable({...f,grant,expectedImage:image});
  assert.equal(r.status,'QUARANTINE');assert.ok(!f.calls.includes('remove'));
 }
});
test('missing consumed grant prevents all effects',async()=>{
 const f=fixture();
 await assert.rejects(runDisposable({...f,grant:{...grant,consumed:false},expectedImage:image}),/NO_GO/);
 assert.equal(f.calls.length,0);
});
