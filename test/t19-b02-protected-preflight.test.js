import test from 'node:test';
import assert from 'node:assert/strict';
import {B02,verifySourceGate,assessProtectedState} from '../scripts/t19-b02-protected-preflight.mjs';
const valid={ref:'refs/heads/staging',project:B02.project,runnerBlob:B02.runnerBlob,sqlBlob:B02.sqlBlob,environment:B02.environment,hasCredential:false,executeSql:false,connectDb:false};
test('only pinned source context is admitted, never execution',()=>assert.deepEqual(verifySourceGate(valid),{status:'SOURCE_ONLY_PASS',executionAuthorized:false,protectedBaselineComplete:false}));
test('deny unsafe ref, project, runner, SQL, environment, credentials and execution',()=>{
 for(const delta of [{ref:'refs/heads/main'},{project:'other'},{runnerBlob:'other'},{sqlBlob:'other'},{environment:'other'},{hasCredential:true},{executeSql:true},{connectDb:true}])
  assert.throws(()=>verifySourceGate({...valid,...delta}));
});
const before={scratchRoles:0,scratchSchemas:0,scratchFunctions:0,catalogDigest:'digest1',financialDigest:'digest2',vaultSecretCount:'0',connectionId:'before'};
test('independent protected evidence requires fresh matching state',()=>assert.equal(assessProtectedState(before,{...before,connectionId:'after'}),'PROTECTED_STATE_UNCHANGED'));
test('fail closed on missing, altered, nonzero or reused evidence',()=>{
 for(const after of [{...before},{...before,connectionId:'after',financialDigest:'changed'},{...before,connectionId:'after',scratchRoles:1},{connectionId:'after'}])
  assert.throws(()=>assessProtectedState(before,after));
});
