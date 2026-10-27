import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIndependentReadOnlyEvidence,evidenceGate,safeEvidenceFailure} from '../scripts/t19-b02-evidence-runner.mjs';
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

test('safe errors expose categories only and never secrets',()=>{
 const secret='synthetic-only-private-password';
 const cases=[
  [{message:'Read-only evidence gate refused'},'GATE_DENIED'],
  [{message:'runner source drift'},'SOURCE_IDENTITY'],
  [{message:'Destination not allowlisted staging Session pooler'},'CONNECTION_CONFIG'],
  [{message:'Database session close unverified'},'SESSION_CLOSE'],
  [{message:'Independent backend identities not established'},'SESSION_INDEPENDENCE'],
  [{message:'Protected baseline changed; concurrent activity or drift'},'PROTECTED_DRIFT'],
  [{message:'Unexpected staging read-only identity'},'TLS_OR_DATABASE_IDENTITY'],
  [{message:'Missing financial fingerprint'},'SNAPSHOT_EVIDENCE'],
  [{code:'ECONNREFUSED',message:secret},'NETWORK'],
  [{code:'28P01',message:secret},'DATABASE_AUTH'],
  [{code:'UNABLE_TO_VERIFY_LEAF_SIGNATURE',message:secret},'TLS_CERTIFICATE'],
  [{code:'42501',message:secret},'DATABASE_QUERY'],
  [{message:secret},'UNCLASSIFIED_NO_GO']
 ];
 for(const [error,category] of cases){
  const actual=safeEvidenceFailure(error);
  assert.equal(actual,category);
  assert.equal(actual.includes(secret),false);
 }
});
