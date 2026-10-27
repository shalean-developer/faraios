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
 if(['IDENTITY_ROLE_MISMATCH','IDENTITY_VERSION_MISMATCH','IDENTITY_NOT_READ_ONLY','IDENTITY_BACKEND_INVALID','IDENTITY_PG_SSL_UNVERIFIED'].includes(message))return message==='IDENTITY_PG_SSL_UNVERIFIED'?'BACKEND_SSL_UNVERIFIED':message;
 if(message==='CLIENT_TLS_UNVERIFIED')return 'CLIENT_TLS_UNVERIFIED';
 if(message.includes('staging read-only identity'))return 'TLS_OR_DATABASE_IDENTITY';
 if(message.includes('Scratch objects')||message.includes('fingerprint')||message.includes('Read-only snapshot'))return 'SNAPSHOT_EVIDENCE';
 if(['ENOTFOUND','EAI_AGAIN','ENETUNREACH','ECONNREFUSED','ETIMEDOUT','ECONNRESET'].includes(error?.code))return 'NETWORK';
 if(['28P01','28000'].includes(error?.code))return 'DATABASE_AUTH';
 if(['CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','ERR_TLS_CERT_ALTNAME_INVALID'].includes(error?.code))return 'TLS_CERTIFICATE';
 if(error?.code && /^[0-9A-Z]{5}$/.test(error.code))return 'DATABASE_QUERY';
 return 'UNCLASSIFIED_NO_GO';
}
export async function loadPinnedSupabaseCA(read=readFile) {
 const ca=await read(new URL('../test-support/t19-b02-supabase-root-2021.crt',import.meta.url));
 const bytes=Buffer.isBuffer(ca)?ca:Buffer.from(ca);
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!=='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7')throw Error('Pinned CA integrity mismatch');
 if(!bytes.toString('utf8').startsWith('-----BEGIN CERTIFICATE-----'))throw Error('Pinned CA invalid');
 return bytes.toString('utf8');
}
export async function protectedReadOnlyTarget(credential,read=readFile) {
 const target=parseStagingPoolerTarget(credential);
 const ca=await loadPinnedSupabaseCA(read);
 return {...target,ssl:{ca,rejectUnauthorized:true,servername:target.host}};
}
export async function evidenceGate({ref,environment,project,runner,sql,collector,approval,credential}){
 if(ref!=='refs/heads/staging'||environment!=='staging'||project!=='xdmfyrsauvqznkloroxg'||approval!=='READ-ONLY-EVIDENCE-ONLY')throw Error('Read-only evidence gate refused');
 const expected={runner:['scripts/t19-b02-node24-runner.mjs','03d7a733f63e70928faeb3bc3bc3c21741840327'],sql:['docs/proposals/t19-b02-managed-role-rollback.sql','89e13e8b55cec5503a67ed5486739e9d1d7560b4'],collector:['scripts/t19-b02-readonly-fingerprints.mjs','d6582da1d16bc65e427208cb926f8a97a5b15cc7']};
 for(const [name,[path,digest]] of Object.entries(expected)){
  const bytes=await readFile(new URL('../'+path,import.meta.url));
  if(sha(bytes)!==digest)throw Error(name+' source drift');
 }
 if(runner!==expected.runner[1]||sql!==expected.sql[1]||collector!==expected.collector[1])throw Error('Environment source identity mismatch');
 return parseStagingPoolerTarget(credential);
}
// Independently verify client -> pooler TLS before any financial/catalog query.
// pg_stat_ssl measures the distinct pooler -> PostgreSQL hop, not this TLS session.
export function verifyClientPoolerTls(client) {
 const stream=client?.connection?.stream;
 const peer=typeof stream?.getPeerCertificate==='function'?stream.getPeerCertificate():null;
 if(stream?.encrypted!==true || stream?.authorized!==true || !peer || !Object.keys(peer).length)
  throw new Error('CLIENT_TLS_UNVERIFIED');
 return 'CLIENT_TLS_VERIFIED';
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
   verifyClientPoolerTls(client);
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
  await evidenceGate({ref:process.env.GITHUB_REF,environment:process.env.T19_B02_ENVIRONMENT,project:process.env.T19_B02_PROJECT_REF,runner:process.env.T19_B02_RUNNER_BLOB,sql:process.env.T19_B02_SQL_BLOB,collector:process.env.T19_B02_COLLECTOR_BLOB,approval:process.env.T19_B02_EVIDENCE_MODE,credential:process.env.T19_B02_STAGING_DB_URL});
  const protectedTarget=await protectedReadOnlyTarget(process.env.T19_B02_STAGING_DB_URL);
  const result=await verifyIndependentReadOnlyEvidence(()=>new Client(protectedTarget));
  console.log(JSON.stringify(result));
 }catch(err){console.error('T19_B02_EVIDENCE_NO_GO',safeEvidenceFailure(err));process.exitCode=1;}
}
