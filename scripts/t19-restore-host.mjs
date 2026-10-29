// Separate local-only recovery adapter. Never invokes the legacy hosted CLI.
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes,createPublicKey,verify} from 'node:crypto';
import {Host,protectedPath,dockerProcess,snapshot,verifyImageLineage,compareCatalog,bundleDigest as bootstrapDigest,storageDenied} from './t19-bootstrap-host.mjs';
import {canonical,digest,requireTrue,PHASES,IMAGES} from './t19-bootstrap-engine.mjs';
import {openBackup,SOURCE} from './backup-staging.mjs';
import {validateScope} from './backup-scope.mjs';
import {compareStructure} from './t19-custody-recovery-compare.mjs';
import {RESTORE_SCOPE,PRE_BOOTSTRAP,RESTORE_PHASES,LIMITS,INERT_SQL,planRestore,runRestore,catalogSQL,namespaceGate,PUBLICATIONS_SQL,publicationGate,RESTORE_GUARD_CODES,REALTIME_OWNER_GUARD,MANAGED_DIAGNOSTIC_CODES} from './t19-restore-plan.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ACCEPTED_BUNDLE='231e08e545544fb9483e97e2811a22f7ad85635441ba4a8aedd58915d063556a';
const OWNER='9509ac682d7aa3bf5a6683aec53dbfc407834ba9302f3e58fbafe1c3ad3a1958';
const NODE='e32e2d16081cf644f88392934288086e7662529d0d43277c34f7aad2207cfafb';
const DOCKER='cb92457611ccecae73e395a97673de28e397eaf020f807d91153960bbfe41b01';
const FILES=['database/t19-restore-boundaries.sql','scripts/t19-restore-host.mjs','scripts/t19-restore-plan.mjs','scripts/backup-staging.mjs','scripts/backup-scope.mjs','scripts/restore-staging.mjs','scripts/restore-diagnostic.mjs','scripts/restore-constraint.mjs','scripts/restore-catalog.sql','scripts/restore-preflight.sql','scripts/vendor/supabase-pg-dump.mjs','config/restore-test.json','test-support/t19-custody-recovery-expected.json','docs/proposals/t19-inactive-custody-recovery-readback.sql'];
const check=(ok,code)=>requireTrue(ok,code);
const json=b=>JSON.parse(b.toString());
async function privateFile(path,max=33554432){
 check(resolve(path).startsWith('/root/'),'RESTORE_PRIVATE_ROOT_REQUIRED');await protectedPath(path);
 const h=await fs.open(path,'r');try{const before=await h.stat();check(!(before.mode&0o077)&&before.nlink===1&&before.size<=max,'RESTORE_PRIVATE_FILE');const bytes=await h.readFile();const after=await h.stat();check(before.size===bytes.length&&before.ino===after.ino&&before.mtimeMs===after.mtimeMs&&before.ctimeMs===after.ctimeMs,'RESTORE_INPUT_CHANGED');return bytes;}finally{await h.close();}
}
async function durable(dir,name,value){const h=await fs.open(join(dir,name),'wx',0o600);try{await h.writeFile(canonical(value));await h.sync();}finally{await h.close();}const d=await fs.open(dir,'r');try{await d.sync();}finally{await d.close();}}
export async function restoreBundleDigest(){return digest({bootstrap:await bootstrapDigest(),files:await Promise.all(FILES.map(async p=>[p,digest(await fs.readFile(join(ROOT,p)))]))});}
export function validateRestoreApproval(approval,bindings,key,now=Date.now()){
 const r=approval?.receipt;check(r&&canonical(Object.keys(r).sort())===canonical(['scope','version','nonce','issuedAt','expiresAt',...Object.keys(bindings)].sort()),'RESTORE_APPROVAL_SHAPE');
 check(r.scope===RESTORE_SCOPE&&r.version===1&&/^[a-f0-9]{32}$/.test(r.nonce),'RESTORE_APPROVAL_SCOPE');
 check(Number.isSafeInteger(r.issuedAt)&&Number.isSafeInteger(r.expiresAt)&&r.issuedAt<=now&&r.expiresAt>now&&r.expiresAt-r.issuedAt===900000,'RESTORE_APPROVAL_EXPIRED');
 check(Object.entries(bindings).every(([k,v])=>r[k]===v),'RESTORE_APPROVAL_BINDING');
 const pub=key?.type==='public'?key:createPublicKey(key);check(pub.asymmetricKeyType==='ed25519','RESTORE_OWNER_KEY');
 check(typeof approval.ownerSignature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(approval.ownerSignature)&&verify(null,Buffer.from(canonical(r)),pub,Buffer.from(approval.ownerSignature,'base64')),'RESTORE_OWNER_SIGNATURE');return r;
}
export async function sourceAdmissionSQL(){
 const base=await fs.readFile(join(ROOT,'scripts/t19-bootstrap-catalog.sql'),'utf8');
 const portable=await fs.readFile(join(ROOT,'scripts/restore-catalog.sql'),'utf8');
 const custody=portable.replace("('managed',array['auth','storage']::text[])","('custody',array['private_t19_custody']::text[])").replace("select jsonb_object_agg(scope,encode(extensions.digest(value::text,'sha256'),'hex')) as catalog from catalogs;","select value from catalogs where scope='custody';");
 const role=await fs.readFile(join(ROOT,'docs/proposals/t19-inactive-custody-recovery-readback.sql'),'utf8');
 const roleSelect=role.slice(role.indexOf('SELECT jsonb_build_object('),role.lastIndexOf('COMMIT;')).trim().replace(/ AS custody_recovery_readback;$/,'');
 const extra=" 'restorePublications',("+PUBLICATIONS_SQL+"),'checkpointCatalog',("+catalogSQL(portable).trim().replace(/;$/,'')+"),'custodyDefinition',("+custody.trim().replace(/;$/,'')+"),'custodyReadback',("+roleSelect+"),'sourceState',jsonb_build_object('enabledConnections',(SELECT count(*) FROM public.business_accounting_connections WHERE enabled),'vaultSecrets',(SELECT count(*) FROM vault.secrets),'storageObjects',(SELECT count(*) FROM storage.objects),'storageBuckets',(SELECT count(*) FROM storage.buckets),'custodyFunctions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private_t19_custody'),'custodyPolicies',(SELECT count(*) FROM pg_policies WHERE schemaname='private_t19_custody')),";
 const begin='BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;';
 const guard="DO $guard$ BEGIN IF current_user<>'postgres' OR session_user<>'postgres' OR current_database()<>'postgres' OR current_setting('server_version')<>'17.11' OR current_setting('transaction_read_only')<>'on' OR NOT COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false) THEN RAISE EXCEPTION 'RESTORE_SOURCE_IDENTITY'; END IF; END $guard$;";
 check(base.split(" 'catalog',jsonb_build_object(").length===2,'RESTORE_CAPTURE_SHAPE');
 return base.replace(begin,begin+'\n'+guard).replace(" 'catalog',jsonb_build_object(",extra+"\n 'catalog',jsonb_build_object(");
}
async function compatibility(dir,indexPath,ownerKey){
 await protectedPath(dir,true);const index=json(await privateFile(indexPath));
 check(index.version===1&&index.purpose==='compatibility-evidence-index-not-restore-authorization'&&Array.isArray(index.files)&&index.files.length<=1000,'RESTORE_COMPATIBILITY_INDEX');
 const names=await fs.readdir(dir);check(canonical([...names].sort())===canonical(index.files.map(f=>f.name).sort()),'RESTORE_COMPATIBILITY_FILES');
 const records=new Map();for(const f of index.files){check(/^[a-zA-Z0-9.-]+$/.test(f.name)&&!f.name.startsWith('env-')&&!records.has(f.name),'RESTORE_COMPATIBILITY_NAME');const bytes=await privateFile(join(dir,f.name));check(digest(bytes)===f.sha256,'RESTORE_COMPATIBILITY_CHANGED');records.set(f.name,bytes);}
 const read=n=>json(records.get(n));const approval=read('approval.json'),r=approval.receipt;
 check(r.scope==='t19-synthetic-managed-bootstrap-v1'&&r.bundleSha256===ACCEPTED_BUNDLE&&r.journalPath===dir&&r.context==='default'&&/^[a-f0-9]{32}$/.test(r.nonce),'RESTORE_PRIOR_SCOPE');
 check(verify(null,Buffer.from(canonical(r)),createPublicKey(ownerKey),Buffer.from(approval.ownerSignature,'base64'))&&canonical(read('receipt.json'))===canonical(r)&&digest(read('expected.json'))===r.expectedSha256&&read('consumed-'+r.nonce+'.json').receiptDigest===digest(r)&&index.receiptDigest===digest(r)&&index.bundleSha256===ACCEPTED_BUNDLE,'RESTORE_PRIOR_SIGNATURE');
 const all=k=>[...records.keys()].sort().filter(n=>new RegExp('^\\d+-'+k+'\\.json$').test(n)).map(read);
 const one=k=>{const a=all(k);check(a.length===1,'RESTORE_PRIOR_RECORD_COUNT');return a[0];};
 check(!names.some(n=>/-command-(error|failure)\.json$/.test(n)),'RESTORE_PRIOR_COMMAND_ERROR');
 check(canonical(all('phase'))===canonical(PHASES.map(phase=>({phase,status:'PASS'}))),'RESTORE_PRIOR_PHASES');
 const result=one('result'),clean=one('cleanup'),stable=one('stable-catalog'),sec=one('security');
 check(result.status==='SYNTHETIC_COMPATIBILITY_PASS'&&canonical(result.stages)===canonical(PHASES)&&result.reason===null&&result.cleanupVerified&&!result.checkpointUsed&&!result.restoreAttempted&&!result.checkpointUseAuthorized&&!result.operationalCustodyInstalled&&clean.verified&&clean.baselineMatches,'RESTORE_PRIOR_RESULT');
 check(one('managed-catalog').match&&one('managed-catalog').differingComponents.length===0&&storageDenied(one('storage-denied-request'))&&stable.match&&canonical(stable.emptyCounts)===canonical([0,0,0,0,0,0,0])&&['authPermitted','authDenied','storagePermitted','storageDenied','databasePermitted'].every(k=>sec[k]===true)&&canonical(sec.databaseDeniedRoles)===canonical(['anon','authenticated','service_role']),'RESTORE_PRIOR_SECURITY');
 return digest(index);
}
// Restore-only transport: retain the child's bounded exit/SQLSTATE after EPIPE.
// A broken input pipe can never turn a zero exit into success. Timeout, signals,
// other pipe errors and output overflow remain unknown and fence the candidate.
export function restoreProcess(binary,{spawnProcess=spawn}={}){
 return (args,{stdin='',timeoutMs=10000,maxBytes=8388608}={})=>new Promise((resolve,reject)=>{
  let child,timer,killTimer,unknown=false,done=false,inputClosed=false,count=0;
  const out=[],err=[];
  const finish=(error,code=null,signal=null)=>{
   if(done)return;done=true;clearTimeout(timer);clearTimeout(killTimer);
   const value={stdout:Buffer.concat(out),stderr:Buffer.concat(err),code,signal,inputClosed};
   if(error){error.unknown=unknown;error.evidence=value;reject(error);}else resolve(value);
  };
  const stop=()=>{if(unknown||done)return;unknown=true;try{child.kill('SIGKILL');}catch{}killTimer=setTimeout(()=>finish(Error('RESTORE_TRANSPORT_KILL_UNKNOWN')),1000);};
  try{child=spawnProcess(binary,['--context','default',...args],{shell:false,env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C'},stdio:['pipe','pipe','pipe']});}catch{return finish(Error('RESTORE_TRANSPORT_SPAWN_FAILED'));}
  timer=setTimeout(stop,timeoutMs);
  for(const [stream,list] of [[child.stdout,out],[child.stderr,err]])stream.on('data',bytes=>{if(done||unknown)return;count+=bytes.length;if(count>maxBytes)stop();else list.push(bytes);});
  child.stdin.on('error',error=>{if(error.code==='EPIPE'){inputClosed=true;}else stop();});
  child.on('error',()=>finish(Error('RESTORE_TRANSPORT_SPAWN_FAILED')));
  child.on('close',(code,signal)=>{
   if(signal||inputClosed&&code===0||!Number.isInteger(code))unknown=true;
   finish(unknown?Error('RESTORE_TRANSPORT_OUTCOME_UNKNOWN'):null,code,signal);
  });
  child.stdin.end(stdin);
 });
}
export function restoreSQLStates(stderr){
 return [...new Set([...String(stderr??'').matchAll(/^(?:ERROR|FATAL):[ \t]+([0-9A-Z]{5})[ \t]*\r?$/gm)].map(m=>m[1]))];
}
export function restoreManagedComponents(stderr){
 return [...new Set([...String(stderr??'').matchAll(/^WARNING:[ \t]+(P2[01][0-9]{2})[ \t]*\r?$/gm)].map(m=>MANAGED_DIAGNOSTIC_CODES[m[1]]).filter(Boolean))].sort();
}
export class RestoreHost extends Host {
 constructor(options){super(options);this.plan=options.plan;this.restoreActive=false;this.restoreRun=options.restoreRun??options.run;this.archiveAuthenticated=options.archiveAuthenticated===true;}
 async command(args,options={}){
  if(!this.restoreActive||args[0]!=='container'||args[1]!=='exec')return super.command(args,options);
  check(!this.unknown&&Date.now()-this.started<900000,'RESTORE_COMMANDS_FENCED');
  let r;try{r=await this.restoreRun(args,options);}catch(e){if(e.unknown)this.unknown=true;await this.record('restore-command-error',{unknown:e.unknown===true,sqlstates:restoreSQLStates(e.evidence?.stderr),inputClosed:e.evidence?.inputClosed===true});throw Error('RESTORE_COMMAND_OUTCOME_UNKNOWN');}
  if(r.code!==0){const sqlstates=restoreSQLStates(r.stderr),guard=sqlstates.map(code=>RESTORE_GUARD_CODES[code]).find(Boolean);if(guard==='RESTORE_FULL_MANAGED_MISMATCH')this.managedMismatchComponents=restoreManagedComponents(r.stderr);await this.record('restore-command-failure',{code:r.code,sqlstates,inputClosed:r.inputClosed===true,...(guard?{guard}:{}),...(guard==='RESTORE_FULL_MANAGED_MISMATCH'?{differingComponents:this.managedMismatchComponents}:{})});throw Error(guard??'RESTORE_SQL_FAILED');}return r.stdout;
 }
 async restoreSQL(sql,user='postgres'){
  this.restoreActive=true;const b=this.bound.get('postgres');
  check(['postgres','supabase_admin'].includes(user),'RESTORE_SQL_PRINCIPAL');
  // A fresh candidate-only admin connection disables statement/error/audit
  // logging BEFORE any recovered SQL, then drops to the reviewed actor.
  const logging="SET log_min_messages=panic;SET log_min_error_statement=panic;SET log_statement=none;SET log_error_verbosity=terse;SET log_min_duration_statement=-1;SET log_min_duration_sample=-1;SET log_transaction_sample_rate=0;SET log_duration=off;SET log_parameter_max_length=0;SET log_parameter_max_length_on_error=0;SET auto_explain.log_min_duration=-1;SET pgaudit.log='none';SET pgaudit.role='';\n";
  const actor=user==='postgres'?'SET SESSION AUTHORIZATION postgres;\n':'';
  return this.exec(b,['psql','-X','-qAt','--no-password','--set=ON_ERROR_STOP=1','--set=VERBOSITY=sqlstate','--username=supabase_admin','--dbname=postgres'],logging+actor+sql,180000);
 }
 async apiControls(){
  const b=this.bound.get('storage'),auth='http://'+this.bound.get('auth').s.name+':9999/admin/users';
  check((await this.http(b,auth,'GET',this.serviceToken)).status===200,'RESTORE_AUTH_ALLOWED');check([401,403].includes((await this.http(b,auth,'GET',this.anonToken)).status),'RESTORE_AUTH_DENIED');
  const bucket='t19-'+this.nonce,url='http://127.0.0.1:5000/bucket';check([200,201].includes((await this.http(b,url,'POST',this.serviceToken,{id:bucket,name:bucket,public:false})).status),'RESTORE_STORAGE_ALLOWED');
  const response=await this.http(b,url,'POST',this.anonToken,{id:bucket+'-denied',name:bucket+'-denied',public:false});
  const state=await this.sqlJSON("SELECT jsonb_build_object('deniedBucketCount',(SELECT count(*) FROM storage.buckets WHERE id='"+bucket+"-denied'),'allowedBucketCount',(SELECT count(*) FROM storage.buckets WHERE id='"+bucket+"'),'totalBucketCount',(SELECT count(*) FROM storage.buckets));");
  await this.record('restore-api-denial',{...response,...state});check(storageDenied({...response,...state}),'RESTORE_STORAGE_DENIED');check((await this.http(b,url+'/'+bucket,'DELETE',this.serviceToken)).status===200,'RESTORE_API_FIXTURE_REMOVAL');
 }
 async stopServices(){await this.remove('storage');await this.remove('auth');check(this.bound.size===1&&this.bound.has('postgres'),'RESTORE_SERVICES_NOT_REMOVED');await this.record('restore-services-stopped',{auth:true,storage:true,postgresOnly:true});}
 async destinationEmpty(){
  const publication=await this.sqlJSON("SELECT jsonb_build_object('present',EXISTS(SELECT FROM pg_publication WHERE pubname='supabase_realtime'),'ownerMatches',EXISTS(SELECT FROM pg_publication WHERE pubname='supabase_realtime' AND pg_get_userbyid(pubowner)='postgres'));");
  await this.record('restore-publication-qualification',publication);
  await this.restoreSQL('BEGIN READ ONLY;'+REALTIME_OWNER_GUARD+'COMMIT;');
  this.initialNamespaces=await this.sqlJSON("SELECT coalesce(jsonb_agg(nspname ORDER BY nspname),'[]') FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema';");
  this.namespaceSQL=namespaceGate(this.initialNamespaces);
  await this.sql('BEGIN READ ONLY;'+INERT_SQL+'COMMIT;');
  const pre=await this.sqlJSON("SELECT jsonb_build_object('applicationObjects',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','audit','supabase_migrations'))+(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','audit','supabase_migrations')),'custodyAbsent',to_regnamespace('private_t19_custody') IS NULL AND NOT EXISTS(SELECT FROM pg_roles WHERE rolname IN ('t19_hosted_custody','t19_runtime_owner')),'managedRows',(SELECT COALESCE(sum(((xpath('//n/text()',query_to_xml(format('SELECT count(*) AS n FROM %I.%I',n.nspname,c.relname),false,false,'')))[1]::text)::bigint),0) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('auth','storage') AND NOT(n.nspname='auth' AND c.relname='schema_migrations') AND NOT(n.nspname='storage' AND c.relname='migrations')),'vaultSecrets',(SELECT count(*) FROM vault.secrets));");
  check(pre.applicationObjects===0&&pre.custodyAbsent&&pre.managedRows===0&&pre.vaultSecrets===0,'RESTORE_DESTINATION_NOT_EMPTY');check(compareCatalog(await this.catalog(),this.expected).match,'RESTORE_MANAGED_DRIFT');await this.record('restore-empty-destination',pre);
 }
 async replay(){const result=await this.restoreSQL(this.namespaceSQL+this.plan.replay.replace('SET LOCAL check_function_bodies=true;',this.namespaceSQL+'SET LOCAL check_function_bodies=true;'),'supabase_admin');check(result.split(/\r?\n/).filter(s=>s==='T19_RESTORE_TRANSACTION_COMMITTED').length===1,'RESTORE_COMMIT_ACK_MISSING');await this.record('restore-committed',{verifiedInTransaction:true,rowsNotLogged:true});}
 async verifyCommitted(){await this.restoreSQL('BEGIN READ ONLY;'+LIMITS+this.plan.verify+'COMMIT;');await this.record('restore-independent-rows',{freshConnection:true,match:true});}
 async sequences(){await this.restoreSQL('BEGIN;'+LIMITS+this.plan.sequenceSQL+'COMMIT;');await this.record('restore-sequences',{count:this.plan.states.length,verified:true,nontransactional:true});}
 async verifyFresh(){await this.restoreSQL('BEGIN READ ONLY;'+LIMITS+namespaceGate(this.initialNamespaces,{custody:true})+this.plan.verify+this.plan.sequenceVerify+'COMMIT;');await this.record('restore-independent-sequences',{match:true});}
 async boundaries(){
  for(const role of ['anon','authenticated','service_role'])await this.restoreSQL("BEGIN;SET LOCAL ROLE "+role+";DO $$ BEGIN BEGIN PERFORM 1 FROM private_t19_custody.connections; RAISE EXCEPTION 'DENIAL_NOT_ENFORCED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;END $$;ROLLBACK;");
  // Recovered business-boundary probes are separately reviewed SQL, bound to
  // the signed request; they must rollback and must not contain real tokens.
  const probe=await this.restoreSQL(this.boundarySQL);check(probe.split(/\r?\n/).filter(s=>s==='T19_RESTORE_BOUNDARIES_ROLLED_BACK').length===1,'RESTORE_BOUNDARY_ACK_MISSING');
  await this.verifyFresh();await this.record('restore-boundaries',{custodyDeniedRoles:['anon','authenticated','service_role'],reviewedBusinessProbe:true,postRollbackUnchanged:true});
 }
 async finalVerification(){check(compareCatalog(await this.catalog(),this.expected).match,'RESTORE_FINAL_MANAGED_DRIFT');await this.verifyFresh();await this.record('restore-final',{rows:true,sequences:true,catalog:true,operationalCustodyInstalled:false});}
}
async function inputs(requestPath,dir,authorized=null){
 check(process.platform==='linux'&&process.getuid()===0&&process.version==='v24.22.1'&&digest(await fs.readFile(process.execPath))===NODE,'RESTORE_RUNTIME');
 await protectedPath(dir,true);check(!((await fs.stat(dir)).mode&0o077),'RESTORE_JOURNAL_PRIVACY');
 for(const p of FILES)await protectedPath(join(ROOT,p));check(await bootstrapDigest()===ACCEPTED_BUNDLE,'RESTORE_BOOTSTRAP_SOURCE_CHANGED');
 const raw=await privateFile(requestPath),request=json(raw);
 check(request.version===1&&canonical(Object.keys(request).sort())===canonical(['version','archivePath','keyPath','profilePath','expectedPath','compatibilityDirectory','compatibilityIndexPath','checkpointSha256'].sort()),'RESTORE_REQUEST_SHAPE');
 const trust=json(await fs.readFile(await protectedPath('/etc/faraios/t19-gate2-trust.json'))),pub=createPublicKey(trust.ownerKey);
 check(digest(pub.export({type:'spki',format:'der'}))===OWNER&&pub.asymmetricKeyType==='ed25519','RESTORE_OWNER_KEY');
 await protectedPath(trust.dockerBinary);check(trust.context==='default'&&digest(await fs.readFile(trust.dockerBinary))===DOCKER,'RESTORE_DOCKER_TRUST');
 const evidenceDigest=await compatibility(request.compatibilityDirectory,request.compatibilityIndexPath,trust.ownerKey);
 const profileBytes=await privateFile(request.profilePath),scope=validateScope(json(profileBytes),SOURCE);
 const expectedBytes=await privateFile(request.expectedPath),expected=json(expectedBytes);
 check(expected.sourceProject===SOURCE&&expected.schemaVersion===1&&Date.now()-expected.capturedAt>=0&&Date.now()-expected.capturedAt<3600000,'RESTORE_SOURCE_CAPTURE_STALE');
 check(canonical(Object.keys(expected.sourceState??{}).sort())===canonical(['enabledConnections','vaultSecrets','storageObjects','storageBuckets','custodyFunctions','custodyPolicies'].sort())&&Object.values(expected.sourceState).every(v=>v===0)&&expected.custodyReadback?.roleConforms===true&&expected.custodyReadback.membershipConforms===true&&expected.custodyReadback.runtimeOwnerAbsent===true&&expected.custodyReadback.indexesValidReady===true&&canonical(expected.custodyReadback.tableCounts)===canonical({connections:0,operations:0,prepared_references:0}),'RESTORE_SOURCE_STATE');
 publicationGate(expected.restorePublications);
 const expectedCustody=json(await fs.readFile(join(ROOT,'test-support/t19-custody-recovery-expected.json')));
 check(compareStructure(expected.custodyDefinition,expectedCustody).status==='CUSTODY_STRUCTURE_MATCH','RESTORE_SOURCE_CUSTODY_DRIFT');
 check(expected.checkpointCatalog?.application===scope.application&&expected.checkpointCatalog?.managed===scope.managed,'RESTORE_CURRENT_SCOPE_DRIFT');
 const archive=await privateFile(request.archivePath,268435456);
 check(/^[a-f0-9]{64}$/.test(request.checkpointSha256)&&digest(archive)===request.checkpointSha256,'RESTORE_CHECKPOINT_BINDING');
 const boundaryBytes=await fs.readFile(join(ROOT,'database/t19-restore-boundaries.sql')),boundarySQL=boundaryBytes.toString('utf8');
 // This exact probe needs separate review; it is never inferred from a marker.
 // The source-controlled probe is pinned and tested on native PG17.
 check(digest(boundaryBytes)===REVIEWED_BOUNDARY_SHA,'RESTORE_BUSINESS_PROBE_NOT_REVIEWED');
 const run=dockerProcess(trust.dockerBinary),call=async args=>{const r=await run(args);check(r.code===0,'RESTORE_DOCKER_INSPECTION');return json(r.stdout);};
 const info=await call(['info','--format','{{json .}}']),context=await call(['context','inspect','default']);check(info.OSType==='linux'&&['amd64','x86_64'].includes(info.Architecture)&&info.MemTotal>=4294967296&&context.length===1&&context[0].Endpoints?.docker?.Host==='unix:///var/run/docker.sock','RESTORE_DOCKER_CONTEXT');
 const mem=(await fs.readFile('/proc/meminfo','utf8')).match(/^MemAvailable:\s+(\d+) kB/m),disk=await fs.statfs(dir);check(Number(mem?.[1])*1024>=3221225472&&Number(disk.bavail)*Number(disk.bsize)>=2147483648,'RESTORE_RESOURCES');
 const baseline=await snapshot(run);check(baseline.containers.length===13&&baseline.containers.every(c=>c.State==='exited')&&!baseline.containers.some(c=>c.Names.startsWith('t19-bootstrap-'))&&!baseline.networks.some(n=>n.Name.startsWith('t19-bootstrap-')),'RESTORE_BASELINE');
 const policy=json(await fs.readFile(join(ROOT,'config/t19-bootstrap-images.json')));
 for(const [kind,imageId] of Object.entries(IMAGES)){const images=await call(['image','inspect',imageId]);check(images.length===1&&!Object.keys(images[0].Config.Volumes??{}).length,'RESTORE_IMAGE');const ancestors=[];for(const parent of policy.images[kind].ancestors){const a=await call(['image','inspect',parent.imageId]);check(a.length===1,'RESTORE_IMAGE_PARENT');ancestors.push(a[0]);}verifyImageLineage(images[0],ancestors,policy.images[kind]);}
 const bindings={requestSha256:digest(raw),bundleSha256:await restoreBundleDigest(),archiveSha256:digest(archive),profileSha256:digest(profileBytes),expectedSha256:digest(expectedBytes),compatibilitySha256:evidenceDigest,boundarySha256:digest(boundaryBytes),baselineSha256:digest(baseline),binarySha256:DOCKER,nodeSha256:NODE,context:'default',hostBootSha256:digest((await fs.readFile('/proc/sys/kernel/random/boot_id','utf8')).trim()),daemonIdSha256:digest(info.ID),journalPath:resolve(dir)};
 if(authorized)check(Object.entries(bindings).every(([k,v])=>authorized[k]===v),'RESTORE_INPUT_BINDING_CHANGED');
 const key=await privateFile(request.keyPath,32);let backup;
 try{check(key.length===32,'RESTORE_KEY_LENGTH');backup=openBackup(archive,key,scope);}finally{key.fill(0);}
 const plan=planRestore(backup,scope,await fs.readFile(join(ROOT,'scripts/restore-catalog.sql'),'utf8'),{catalog:expected.catalog,publications:expected.restorePublications,sql:await fs.readFile(join(ROOT,'scripts/t19-bootstrap-catalog.sql'),'utf8')});
 bindings.planSha256=plan.planSha256;
 if(authorized)check(authorized.planSha256===plan.planSha256,'RESTORE_PLAN_CHANGED');
 return {run,restoreRun:restoreProcess(trust.dockerBinary),baseline,expected,plan,boundarySQL,bindings,trust,archiveAuthenticated:true,files:json(await fs.readFile(join(ROOT,'config/t19-bootstrap-files.json'))).files};
}
const REVIEWED_BOUNDARY_SHA='6c4efb80a6a55011fef42ed755e912f3390a44e6002561f753b4117747a1ba5a';
async function main(){
 const [mode,requestPath,dir,approvalPath,...extra]=process.argv.slice(2);
 if(mode==='--capture-sql'&&!requestPath){process.stdout.write(await sourceAdmissionSQL());return;}
 check(['--prepare','--run'].includes(mode)&&requestPath&&dir&&!extra.length&&(mode==='--run'?!!approvalPath:!approvalPath),'RESTORE_USAGE');
 let approval,authorized;
 if(mode==='--run'){
  // Verify authority, expiry and the exact request/source before reading an
  // archive key. Consume the nonce before deeper private admission as well.
  check(process.platform==='linux'&&process.getuid()===0&&process.version==='v24.22.1'&&digest(await fs.readFile(process.execPath))===NODE,'RESTORE_RUNTIME');
  await protectedPath(dir,true);check(!((await fs.stat(dir)).mode&0o077),'RESTORE_JOURNAL_PRIVACY');
  approval=json(await privateFile(approvalPath));
  const trust=json(await fs.readFile(await protectedPath('/etc/faraios/t19-gate2-trust.json'))),pub=createPublicKey(trust.ownerKey);
  check(digest(pub.export({type:'spki',format:'der'}))===OWNER,'RESTORE_OWNER_KEY');
  const keys=['requestSha256','bundleSha256','archiveSha256','profileSha256','expectedSha256','compatibilitySha256','planSha256','boundarySha256','baselineSha256','binarySha256','nodeSha256','context','hostBootSha256','daemonIdSha256','journalPath'];
  const expectedBindings=Object.fromEntries(keys.map(k=>[k,approval.receipt?.[k]]));
  authorized=validateRestoreApproval(approval,expectedBindings,trust.ownerKey);
  check(keys.filter(k=>k.endsWith('Sha256')).every(k=>/^[a-f0-9]{64}$/.test(authorized[k]))&&authorized.journalPath===resolve(dir)&&authorized.context==='default'&&authorized.requestSha256===digest(await privateFile(requestPath))&&authorized.bundleSha256===await restoreBundleDigest(),'RESTORE_EARLY_BINDING');
  await durable(dir,'restore-consumed-'+authorized.nonce+'.json',{receiptDigest:digest(authorized)});
 }
 const x=await inputs(resolve(requestPath),resolve(dir),authorized);
 if(mode==='--prepare'){const issuedAt=Date.now(),receipt={scope:RESTORE_SCOPE,version:1,nonce:randomBytes(16).toString('hex'),issuedAt,expiresAt:issuedAt+900000,...x.bindings};await durable(dir,'restore-receipt.json',receipt);console.log(JSON.stringify({status:'RESTORE_RECEIPT_READY_NOT_EXECUTED',receiptPath:join(resolve(dir),'restore-receipt.json'),summary:x.plan.summary,archiveAuthenticated:true,restoreAttempted:false}));return;}
 const receipt=validateRestoreApproval(approval,x.bindings,x.trust.ownerKey);
 await durable(dir,'restore-intent.json',{scope:RESTORE_SCOPE,nonce:receipt.nonce,bindings:x.bindings,baseline:x.baseline});
 const host=new RestoreHost({...x,dir:resolve(dir),receipt});host.boundarySQL=x.boundarySQL;
 const interrupt=()=>{host.unknown=true;};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 const result=await runRestore(host);process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='CURRENT_SCOPE_RESTORE_PASS'?0:1;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{const code=/^[A-Z0-9_]+$/.test(e.code??e.message)?(e.code??e.message):'PREPARATION_OR_AUTHORIZATION_FAILED';console.error('T19_RESTORE_STOP '+code);process.exitCode=1;});
