// T19 B02 protected read-only evidence. Never imports or invokes the mutation runner.
import {Client} from 'pg';
import {parseStagingPoolerTarget} from './t19-b02-node24-runner.mjs';
import {collectProtectedSnapshot} from './t19-b02-readonly-fingerprints.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
export async function evidenceGate({ref,environment,project,runner,sql,collector,approval,credential}){
 if(ref!=='refs/heads/staging'||environment!=='staging'||project!=='xdmfyrsauvqznkloroxg'||approval!=='READ-ONLY-EVIDENCE-ONLY')throw Error('Read-only evidence gate refused');
 const expected={runner:['scripts/t19-b02-node24-runner.mjs','03d7a733f63e70928faeb3bc3bc3c21741840327'],sql:['docs/proposals/t19-b02-managed-role-rollback.sql','89e13e8b55cec5503a67ed5486739e9d1d7560b4'],collector:['scripts/t19-b02-readonly-fingerprints.mjs','3d9e04bee78db411567523b3df269a82a018f977']};
 for(const [name,[path,digest]] of Object.entries(expected)){
  const bytes=await readFile(new URL('../'+path,import.meta.url));
  if(sha(bytes)!==digest)throw Error(name+' source drift');
 }
 if(runner!==expected.runner[1]||sql!==expected.sql[1]||collector!==expected.collector[1])throw Error('Environment source identity mismatch');
 return parseStagingPoolerTarget(credential);
}
export async function verifyIndependentReadOnlyEvidence(clientFactory){
 const sessions=[];
 const results=[];
 try{
  for(let i=0;i<2;i++){
   const client=clientFactory();sessions.push(client);
   await client.connect();
   const result=await collectProtectedSnapshot(client);
   results.push(result);
   await client.end();
  }
  const [a,b]=results;
  if(!a||!b||a.connectionId===b.connectionId)throw Error('Independent backend identities not established');
  if(a.catalogDigest!==b.catalogDigest||a.financialDigest!==b.financialDigest||a.vaultSecretCount!==b.vaultSecretCount||JSON.stringify(a.tableCounts)!==JSON.stringify(b.tableCounts))throw Error('Protected baseline changed; concurrent activity or drift');
  return {result:'READ_ONLY_EVIDENCE_PASS',independentSessions:true,protectedStateStable:true,tableCount:Object.keys(a.tableCounts).length};
 }finally{
  await Promise.allSettled(sessions.map(c=>c.end()));
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 try{
  if(process.env.T19_B02_RUNNER_APPROVED)throw Error('Mutation approval flag must be absent');
  const target=await evidenceGate({ref:process.env.GITHUB_REF,environment:process.env.T19_B02_ENVIRONMENT,project:process.env.T19_B02_PROJECT_REF,runner:process.env.T19_B02_RUNNER_BLOB,sql:process.env.T19_B02_SQL_BLOB,collector:process.env.T19_B02_COLLECTOR_BLOB,approval:process.env.T19_B02_EVIDENCE_MODE,credential:process.env.T19_B02_STAGING_DB_URL});
  const result=await verifyIndependentReadOnlyEvidence(()=>new Client(target));
  console.log(JSON.stringify(result));
 }catch(err){console.error('T19_B02_EVIDENCE_NO_GO',String(err.code||'verification_failed'));process.exitCode=1;}
}
