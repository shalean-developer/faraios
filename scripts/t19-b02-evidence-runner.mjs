// T19 B02 protected read-only evidence. Never imports or invokes the mutation runner.
import {Client} from 'pg';
import {parseStagingPoolerTarget} from './t19-b02-node24-runner.mjs';
import {collectProtectedSnapshot} from './t19-b02-readonly-fingerprints.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
export function safeEvidenceFailure(error) {
 const message=String(error?.message||'');
 if(message==='Read-only evidence gate refused'||message==='Mutation approval flag must be absent')return 'GATE_DENIED';
 if(message.includes('source drift')||message==='Environment source identity mismatch')return 'SOURCE_IDENTITY';
 if(message.includes('staging DB URL')||message.includes('staging Session pooler')||message.includes('database password')||message.includes('DB URL'))return 'CONNECTION_CONFIG';
 if(message==='Database session close unverified')return 'SESSION_CLOSE';
 if(message.includes('Independent backend')||message.includes('Independent client'))return 'SESSION_INDEPENDENCE';
 if(message.includes('Protected baseline changed'))return 'PROTECTED_DRIFT';
 if(message.includes('staging read-only identity'))return 'TLS_OR_DATABASE_IDENTITY';
 if(message.includes('Scratch objects')||message.includes('fingerprint')||message.includes('Read-only snapshot'))return 'SNAPSHOT_EVIDENCE';
 if(['ENOTFOUND','EAI_AGAIN','ENETUNREACH','ECONNREFUSED','ETIMEDOUT','ECONNRESET'].includes(error?.code))return 'NETWORK';
 if(['28P01','28000'].includes(error?.code))return 'DATABASE_AUTH';
 if(['CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','ERR_TLS_CERT_ALTNAME_INVALID'].includes(error?.code))return 'TLS_CERTIFICATE';
 if(error?.code && /^[0-9A-Z]{5}$/.test(error.code))return 'DATABASE_QUERY';
 return 'UNCLASSIFIED_NO_GO';
}
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
export async function verifyIndependentReadOnlyEvidence(clientFactory,snapshot=collectProtectedSnapshot){
 const results=[];
 let previousClient=null;
 for(let i=0;i<2;i++){
  const client=clientFactory();
  if(!client||client===previousClient)throw Error('Independent client objects required');
  previousClient=client;
  let err;
  try{
   await client.connect();
   results.push(await snapshot(client));
  }catch(e){err=e;}
  try{await client.end();}catch(e){throw new Error('Database session close unverified',{cause:err||e});}
  if(err)throw err;
 }
 const [a,b]=results;
  if(!a||!b||a.connectionId===b.connectionId)throw Error('Independent backend identities not established');
  if(a.catalogDigest!==b.catalogDigest||a.financialDigest!==b.financialDigest||a.vaultSecretCount!==b.vaultSecretCount||JSON.stringify(a.tableCounts)!==JSON.stringify(b.tableCounts))throw Error('Protected baseline changed; concurrent activity or drift');
  return {result:'READ_ONLY_EVIDENCE_PASS',independentSessions:true,protectedStateStable:true,tableCount:Object.keys(a.tableCounts).length};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 try{
  if(process.env.T19_B02_RUNNER_APPROVED)throw Error('Mutation approval flag must be absent');
  const target=await evidenceGate({ref:process.env.GITHUB_REF,environment:process.env.T19_B02_ENVIRONMENT,project:process.env.T19_B02_PROJECT_REF,runner:process.env.T19_B02_RUNNER_BLOB,sql:process.env.T19_B02_SQL_BLOB,collector:process.env.T19_B02_COLLECTOR_BLOB,approval:process.env.T19_B02_EVIDENCE_MODE,credential:process.env.T19_B02_STAGING_DB_URL});
  const result=await verifyIndependentReadOnlyEvidence(()=>new Client(target));
  console.log(JSON.stringify(result));
 }catch(err){console.error('T19_B02_EVIDENCE_NO_GO',safeEvidenceFailure(err));process.exitCode=1;}
}
