// T19 B02 — pure source approval gate; does not open connections or execute SQL.
export const B02 = Object.freeze({
 project:'xdmfyrsauvqznkloroxg',
 runnerBlob:'03d7a733f63e70928faeb3bc3bc3c21741840327',
 sqlBlob:'89e13e8b55cec5503a67ed5486739e9d1d7560b4',
 stagingCommit:'2b84423e6ad1cbc9cbe7a1359587dcfe3947ed7e',
 environment:'faraios-t19-b02-staging-qa'
});
export function verifySourceGate(input) {
 if (input.ref!=='refs/heads/staging') throw Error('Staging branch only');
 if(input.project!==B02.project || input.runnerBlob!==B02.runnerBlob || input.sqlBlob!==B02.sqlBlob) throw Error('Source identity mismatch');
 if (input.environment!==B02.environment) throw Error('Wrong environment');
 if (input.hasCredential || input.executeSql || input.connectDb) throw Error('Source preflight forbids database interaction');
 return {status:'SOURCE_ONLY_PASS',executionAuthorized:false,protectedBaselineComplete:false};
}
export function assessProtectedState(before,after) {
 const expected=['scratchRoles','scratchSchemas','scratchFunctions','catalogDigest','financialDigest','vaultSecretCount'];
 if(!before||!after||expected.some(k=>!Object.hasOwn(before,k)||!Object.hasOwn(after,k)))throw Error('Missing independent baseline evidence');
 if(before.scratchRoles!==0||before.scratchSchemas!==0||before.scratchFunctions!==0||after.scratchRoles!==0||after.scratchSchemas!==0||after.scratchFunctions!==0)throw Error('Scratch state unsafe');
 if(expected.slice(3).some(k=>typeof before[k]!=='string'||typeof after[k]!=='string'||!before[k]||before[k]!==after[k]))throw Error('Protected state mismatch');
 if(before.connectionId===after.connectionId || !before.connectionId || !after.connectionId) throw Error('Fresh after-session evidence required');
 return 'PROTECTED_STATE_UNCHANGED';
}
