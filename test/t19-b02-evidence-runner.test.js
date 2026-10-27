import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIndependentReadOnlyEvidence,evidenceGate} from '../scripts/t19-b02-evidence-runner.mjs';
test('wrong ref or approval fails before opening a database connection',async()=>{
 await assert.rejects(evidenceGate({ref:'refs/heads/staging',environment:'staging',project:'xdmfyrsauvqznkloroxg',approval:'EXECUTE',credential:''}),/gate refused/);
});
const snap=(id,drift=false)=>({connectionId:String(id),catalogDigest:'a',financialDigest:drift?'z':'b',vaultSecretCount:'0',tableCounts:{'public.business_invoices':'2'}});
function inputs(results){
 let opened=0,closed=0,observed=0;
 const factory=()=>({connect:async()=>{opened++},end:async()=>{closed++}});
 const snapshot=async()=>results[observed++];
 return {factory,snapshot,get:()=>({opened,closed,observed})};
}
test('two independent connections and stable fingerprints pass',async()=>{
 const x=inputs([snap(111),snap(222)]);
 const result=await verifyIndependentReadOnlyEvidence(x.factory,x.snapshot);
 assert.equal(result.result,'READ_ONLY_EVIDENCE_PASS');
 assert.equal(result.independentSessions,true);
 assert.equal(x.get().opened,2);
 assert.equal(x.get().closed>=2,true);
});
test('same backend identity or changed protected state is no-go',async()=>{
 for(const results of [[snap(111),snap(111)],[snap(111),snap(222,true)]]){
  const x=inputs(results);
  await assert.rejects(verifyIndependentReadOnlyEvidence(x.factory,x.snapshot));
  assert.equal(x.get().opened,2);
  assert.equal(x.get().closed>=2,true);
 }
});
test('snapshot failure is no-go and closes the session',async()=>{
 const x=inputs([snap(111)]);
 await assert.rejects(verifyIndependentReadOnlyEvidence(x.factory,async()=>{throw Error('read failure')}),/read failure/);
 assert.equal(x.get().closed>=1,true);
});

test('database close failure cannot claim independent evidence success',async()=>{
 let n=0;
 const factory=()=>({connect:async()=>{},end:async()=>{if(++n===1)throw Error('close failed')}});
 await assert.rejects(verifyIndependentReadOnlyEvidence(factory,async()=>snap(111)),/close unverified/);
});
test('reject reused client object even with different mock fingerprints',async()=>{
 const one={connect:async()=>{},end:async()=>{}};
 let index=0;
 await assert.rejects(verifyIndependentReadOnlyEvidence(()=>one,async()=>snap(++index)),/Independent client objects/);
});
