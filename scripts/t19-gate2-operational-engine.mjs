// T19 Gate 2 operational lifecycle engine. Dependency-injected Docker; no direct CLI or entrypoint.
// Must be called only by a separately reviewed, authenticated one-time run gateway.
const ID=/^[a-f0-9]{64}$/,NONCE=/^[a-f0-9]{32}$/;
export async function runDisposable({docker,journal,grant,expectedImage,expectedName='faraios-t19-managed-qa'}={}){
 const report={status:'QUARANTINE',stages:[],containerId:null,cleanupVerified:false};
 const mark=s=>report.stages.push(s);
 if(!docker||!journal||!grant?.consumed||grant.scope!=='local-disposable-postgres-startup-only'||
 !NONCE.test(grant.nonce??'')||!expectedImage)throw Error('EXACT_RUN_GRANT_NO_GO');
 const nonce=grant.nonce;
 // Intent must exist and be durable before any create attempt.
 await journal.createIntent({nonce,image:expectedImage,name:expectedName,grantDigest:grant.digest});
 mark('INTENT_DURABLE');
 let id=null,mayExist=false;
 try{
  mayExist=true;
  id=await docker.create({nonce,image:expectedImage,name:expectedName});
  if(!ID.test(id??''))throw Error('CREATE_RESULT_UNKNOWN');
  report.containerId=id;mark('CREATED');
  await journal.bindId({nonce,id});mark('ID_DURABLE');
  const check=async(requiredStopped=false)=>{
   const x=await docker.inspect(id);
   if(x?.Id!==id||x?.Name!=='/'+expectedName||x?.Config?.Image!==expectedImage||
      x?.Config?.Labels?.['faraios.t19.run-nonce']!==nonce||
      !await docker.verifyIsolation(x)|| (requiredStopped&&x?.State?.Running!==false))
     throw Error('IDENTITY_OR_ISOLATION_MISMATCH');
   return x;
  };
  await check(true);mark('PRE_START_VERIFIED');
  await docker.start(id);mark('START_REQUESTED');
  await check();await docker.awaitReady(id);mark('READY');
  await docker.runSyntheticSql(id);mark('SQL_EVIDENCE');
  await docker.stop(id);await check(true);mark('STOPPED_VERIFIED');
  await journal.markStopped({nonce,id});
  // Removal requires re-inspection and durable binding in an independent cleanup gate.
  if(!await journal.confirmBinding({nonce,id,grantDigest:grant.digest}))throw Error('RECEIPT_MISMATCH');
  await check(true);
  await docker.remove(id);mark('REMOVE_REQUESTED');
  if(await docker.exists(id))throw Error('REMOVE_UNCERTAIN');
  report.cleanupVerified=true;report.status='PASS';mark('REMOVED_VERIFIED');
 }catch(e){
  report.error=e?.message??'UNKNOWN';
  if(mayExist) {
   // A lost create response is never evidence that the resource does not exist.
   try{report.recovery=await docker.findByNonce(nonce);}catch{report.recovery='UNKNOWN';}
  }
  // No automatic remove after an uncertain exception. Quarantine for human adjudication.
  mark('QUARANTINE');
 }
 return report;
}
