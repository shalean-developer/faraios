// Separate owner-signed synthetic rehearsal; no checkpoint or hosted apply input.
import {readFile,open,lstat,statfs} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createPublicKey,randomBytes} from 'node:crypto';
import {operationalProcess} from './t19-operational-transport.mjs';
import {Host,bundleDigest,protectedPath,snapshot,compareCatalog,verifyImageLineage} from './t19-bootstrap-host.mjs';
import {canonical,digest,requireTrue,IMAGES} from './t19-bootstrap-engine.mjs';
import {OPERATIONAL_SCOPE,FOUNDATIONS,operationalStages,validateOperationalApproval,runOperationalRehearsal,identityGuard,reviewSetting,identifier,catalogSQL,objectsSQL} from './t19-operational-rehearsal.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const NODE_SHA='e32e2d16081cf644f88392934288086e7662529d0d43277c34f7aad2207cfafb';
const DOCKER_SHA='cb92457611ccecae73e395a97673de28e397eaf020f807d91153960bbfe41b01';
const TRUST='/etc/faraios/t19-gate2-trust.json';
export const SCOPE=OPERATIONAL_SCOPE;
const INHERITED_SOURCES=['test-support/t19-managed-final/overlay.sql','config/t19-bootstrap-images.json','scripts/t19-storage-tenant-migrate.mjs','test-support/t19-bootstrap-helpers/overlay.sql','test-support/t19-realtime-bootstrap/tenant_db_dump_17.sql','scripts/t19-bootstrap-env.mjs','scripts/t19-bootstrap-engine.mjs','scripts/t19-bootstrap-host.mjs','scripts/t19-bootstrap-catalog.sql','config/t19-bootstrap-files.json','scripts/restore-catalog.sql','scripts/t19-custody-recovery-compare.mjs','test-support/t19-custody-recovery-expected.json','docs/proposals/t19-inactive-custody-recovery.sql','docs/proposals/t19-inactive-custody-recovery-readback.sql'];
const SOURCES=['scripts/t19-operational-owner-prepare.sh','scripts/t19-operational-transport.mjs',...INHERITED_SOURCES,'scripts/t19-operational-rehearsal.mjs','scripts/t19-operational-rehearsal-host.mjs','test-support/t19-operational-sql-pins.json',...FOUNDATIONS,...['runtime','oauth','api'].map(s=>'database/t19-custody-'+s+'.sql')];
export async function operationalBundleDigest(){requireTrue(await bundleDigest()==='231e08e545544fb9483e97e2811a22f7ad85635441ba4a8aedd58915d063556a','ACCEPTED_BOOTSTRAP_CHANGED');return digest({bootstrap:await bundleDigest(),files:await Promise.all(SOURCES.map(async p=>[p,digest(await readFile(join(ROOT,p)))]))});}
async function durable(dir,name,value){
 requireTrue(/^[a-z0-9.-]+$/.test(name),'JOURNAL_NAME');const f=await open(join(dir,name),'wx',0o600);
 try{await f.writeFile(canonical(value));await f.sync();}finally{await f.close();}
 const d=await open(dir,'r');try{await d.sync();}finally{await d.close();}
}
async function inputs(expectedPath,dir){
 requireTrue(process.platform==='linux'&&process.getuid()===0&&process.version==='v24.22.1'&&digest(await readFile(process.execPath))===NODE_SHA,'WRONG_RUNTIME');
 for(const p of SOURCES)await protectedPath(join(ROOT,p));await protectedPath(TRUST);await protectedPath(expectedPath);await protectedPath(dir,true);
 const inputStat=await lstat(expectedPath);requireTrue(inputStat.size<=8388608&&inputStat.nlink===1&&!(inputStat.mode&0o077)&&!((await lstat(dir)).mode&0o077),'PRIVATE_INPUT_PERMISSIONS');
 const expected=JSON.parse(await readFile(expectedPath,'utf8'));requireTrue(expected.schemaVersion===1&&expected.sourceProject==='xdmfyrsauvqznkloroxg'&&expected.catalog&&Date.now()-expected.capturedAt>=0&&Date.now()-expected.capturedAt<86400000,'EXPECTED_CATALOG_INVALID');requireTrue(compareCatalog(expected,expected).match,'EXPECTED_CATALOG_INVALID');
 const trust=JSON.parse(await readFile(TRUST,'utf8'));await protectedPath(trust.dockerBinary);requireTrue(digest(await readFile(trust.dockerBinary))===DOCKER_SHA&&trust.context==='default','DOCKER_TRUST');const run=operationalProcess(trust.dockerBinary);
 const info=JSON.parse((await run(['info','--format','{{json .}}'])).stdout);requireTrue(info.OSType==='linux'&&['x86_64','amd64'].includes(info.Architecture)&&info.MemTotal>=4294967296,'DAEMON_RESOURCES');const context=JSON.parse((await run(['context','inspect','default'])).stdout);requireTrue(context.length===1&&context[0].Endpoints?.docker?.Host==='unix:///var/run/docker.sock','CONTEXT_REFUSED');
 const mem=(await readFile('/proc/meminfo','utf8')).match(/^MemAvailable:\s+(\d+) kB/m);const disk=await statfs(dir);requireTrue(Number(mem?.[1])*1024>=3221225472&&Number(disk.bavail)*Number(disk.bsize)>=2147483648,'HOST_RESOURCES');
 const baseline=await snapshot(run);requireTrue(baseline.containers.length===13&&baseline.containers.every(c=>c.State==='exited')&&!baseline.containers.some(c=>c.Names.startsWith('t19-bootstrap-'))&&!baseline.networks.some(n=>n.Name.startsWith('t19-bootstrap-')),'BASELINE_REFUSED');
 const lineage=JSON.parse(await readFile(join(ROOT,'config/t19-bootstrap-images.json'),'utf8'));
 requireTrue(lineage.version===1&&lineage.scope==='owner-signed-synthetic-only'&&canonical(Object.keys(lineage.images).sort())===canonical(Object.keys(IMAGES).sort()),'IMAGE_LINEAGE_POLICY');
 for(const [kind,id] of Object.entries(IMAGES)){
  const r=await run(['image','inspect',id]);requireTrue(r.code===0,'IMAGE_MISSING');const a=JSON.parse(r.stdout);
  requireTrue(a.length===1&&a[0].Id===id&&a[0].Os==='linux'&&a[0].Architecture==='amd64'&&!Object.keys(a[0].Config.Volumes??{}).length,'IMAGE_IDENTITY');
  const policy=lineage.images[kind],ancestors=[];requireTrue(policy.imageId===id,'IMAGE_POLICY_PIN');
  for(const parent of policy.ancestors){const p=await run(['image','inspect',parent.imageId]);requireTrue(p.code===0,'BASE_IMAGE_MISSING');const xs=JSON.parse(p.stdout);requireTrue(xs.length===1,'BASE_IMAGE_IDENTITY');ancestors.push(xs[0]);}
  verifyImageLineage(a[0],ancestors,policy);
 }
 return {expected,trust,run,baseline,files:JSON.parse(await readFile(join(ROOT,'config/t19-bootstrap-files.json'),'utf8')).files,bindings:{bundleSha256:await operationalBundleDigest(),binarySha256:DOCKER_SHA,expectedSha256:digest(expected),baselineSha256:digest(baseline),hostBootSha256:digest((await readFile('/proc/sys/kernel/random/boot_id','utf8')).trim()),daemonIdSha256:digest(info.ID),context:'default',journalPath:resolve(dir)}};
}
export class OperationalHost extends Host {
 async stopServices(){await this.remove('storage');await this.remove('auth');requireTrue(this.bound.size===1&&this.bound.has('postgres'),'OPERATIONAL_SERVICES_NOT_REMOVED');}
 async checkedSQL(sql,{expectedState=null,abort=false,user='postgres'}={}){
  requireTrue(!this.unknown,'COMMANDS_FENCED');requireTrue(Date.now()-this.started<900000,'RUN_DEADLINE');
  const b=this.bound.get('postgres');await this.assertBound(b);
  let r;try{r=await this.run(['container','exec','-i',b.id,'psql','-X','-qAt','--no-password','--set=ON_ERROR_STOP=1','--set=VERBOSITY=verbose','--username='+user,'--dbname=postgres'],{stdin:sql,timeoutMs:60000,maxBytes:8388608});}
  catch(e){this.unknown=true;await this.record('operational-command-unknown',{unknown:true});throw Error('OPERATIONAL_COMMAND_OUTCOME_UNKNOWN');}
  const states=[...r.stderr.toString().matchAll(/ERROR:\s+([A-Z0-9]{5}):/g)].map(m=>m[1]);
  await this.record('operational-command',{exitCode:r.code,expectedState,sqlstates:states,stdoutSha256:digest(r.stdout)});
  if(this.unknown||r.signal||!Number.isInteger(r.code)||r.inputClosed&&r.code===0){this.unknown=true;throw Error('OPERATIONAL_COMMAND_OUTCOME_UNKNOWN');}
  if(expectedState){requireTrue(r.code===3&&canonical(states)===canonical([expectedState])&&(!abort||r.stderr.toString().includes('T19_SYNTHETIC_PRECOMMIT_ABORT')),'OPERATIONAL_EXPECTED_DENIAL_FAILED');}
  else requireTrue(r.code===0&&states.length===0,'OPERATIONAL_SQL_FAILED');
  return r.stdout.toString();
 }
 async syntheticFoundation(){
  requireTrue(await this.sqlJSON("SELECT count(*)=0 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p');"),'SYNTHETIC_FOUNDATION_NONEMPTY');
  await this.checkedSQL(identityGuard+'CREATE EXTENSION IF NOT EXISTS btree_gist;');
  for(const path of FOUNDATIONS)await this.checkedSQL(identityGuard+await readFile(join(ROOT,path),'utf8'));
  // Actual provider Auth schema; three fixed synthetic records, never checkpoint users.
  await this.checkedSQL("INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000000001','owner@t19.invalid'),('00000000-0000-4000-8000-000000000002','manager@t19.invalid'),('00000000-0000-4000-8000-000000000003','staff@t19.invalid');",{user:'supabase_admin'});
  await this.checkedSQL(identityGuard+`INSERT INTO public.businesses(id,name,industry) VALUES ('00000000-0000-4000-8000-000000000010','Synthetic A','cleaning'),('00000000-0000-4000-8000-000000000020','Synthetic B','cleaning');
   INSERT INTO public.business_memberships(business_id,user_id,role) VALUES
   ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','owner'),
   ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','owner'),
   ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000002','manager'),
   ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000003','staff'),
   ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000003','staff');`);
  this.protectedBefore=await this.fingerprint(true);
  await this.record('synthetic-foundation',{authUsers:3,businesses:2,memberships:5,checkpointUsed:false});
 }
 async fingerprint(protectedOnly=false){
  const schemas=protectedOnly?"'public','audit','auth','storage','vault'":"'public','audit','auth','storage','vault','private_t19_custody'";
  const tables=await this.sqlJSON(`SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind) ORDER BY n.nspname,c.relname),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN (${schemas}) AND c.relkind IN ('r','p','S');`);
  const rows=tables.map(([schema,name,kind])=>{
   const table=identifier(schema)+'.'+identifier(name);
   const value=kind==='S'?`(SELECT jsonb_build_array(last_value::text,is_called) FROM ${table})`:`(SELECT jsonb_build_array(count(*)::text,md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''))) FROM ${table} t)`;
   return `jsonb_build_array(${"'"+schema.replaceAll("'","''")+"'"},${"'"+name.replaceAll("'","''")+"'"},${value})`;
  });
  const result=await this.sqlJSON("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL statement_timeout='30s';"+identityGuard+
   'SELECT jsonb_build_array('+rows.join(',')+');COMMIT;');
  // Both reads use fresh read-only sessions; Auth and Storage have been removed.
  // This compares a quiescent candidate, not concurrent production snapshots.
  const catalog=protectedOnly?null:await this.sqlJSON('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;'+catalogSQL+'COMMIT;');
  return digest({rows:result,catalog});
 }
 async operationalSQL(){
  const manifest=JSON.parse(await readFile(join(ROOT,'test-support/t19-operational-sql-pins.json'),'utf8'));
  const contents=new Map(await Promise.all(manifest.files.map(async f=>[f.path,await readFile(join(ROOT,f.path),'utf8')])));
  for(const {stage,sql,abortSQL,sha256} of operationalStages(manifest,contents)){
   const before=await this.fingerprint();
   await this.checkedSQL(identityGuard+reviewSetting+abortSQL,{expectedState:'55000',abort:true});
   requireTrue(await this.fingerprint()===before,'OPERATIONAL_ABORT_STATE_CHANGED');
   await this.checkedSQL(identityGuard+reviewSetting+sql);
   requireTrue(await this.fingerprint(true)===this.protectedBefore,'OPERATIONAL_PROTECTED_DATA_CHANGED');
   const committed=await this.fingerprint();
   await this.checkedSQL(identityGuard+reviewSetting+sql,{expectedState:'55000'});
   requireTrue(await this.fingerprint()===committed,'OPERATIONAL_COLLISION_STATE_CHANGED');
   const privileges=await this.sqlJSON("SELECT jsonb_build_array(pg_has_role(current_user,'t19_runtime_owner','SET'),has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE'),has_schema_privilege('t19_runtime_owner','auth','USAGE'));");
   requireTrue(privileges.every(x=>x===false),'OPERATIONAL_TEMPORARY_AUTHORITY_REMAINS');
   await this.record('operational-stage',{stage,sha256,rollbackVerified:true,committed:true,collisionDenied:true,protectedRowsUnchanged:true});
  }
 }
 async operationalBoundaries(){
  for(const role of ['anon','authenticated','service_role']){
   for(const sql of ["SELECT * FROM private_t19_custody.connections;","SELECT private_t19_custody.runtime('pending','{}');","SELECT private_t19_custody.oauth('consume','{}');","SELECT private_t19_custody.revoke_grant('claim','{}');"])
    await this.checkedSQL('SET ROLE '+role+';'+sql,{expectedState:'42501'});
  }
  const manager="SET ROLE authenticated;SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';";
  const status=JSON.parse(await this.checkedSQL(manager+"SELECT public.t19_accounting_status('00000000-0000-4000-8000-000000000020');"));
  requireTrue(status.business_id==='00000000-0000-4000-8000-000000000020','OPERATIONAL_MANAGER_ALLOWED_FAILED');
  await this.checkedSQL(manager+"SELECT public.t19_accounting_status('00000000-0000-4000-8000-000000000010');",{expectedState:'42501'});
  await this.checkedSQL("SET ROLE authenticated;SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';SELECT public.t19_accounting_status('00000000-0000-4000-8000-000000000020');",{expectedState:'42501'});
  const machine="SET SESSION AUTHORIZATION t19_hosted_custody;";
  requireTrue((await this.checkedSQL(machine+"SELECT private_t19_custody.runtime('machine',jsonb_build_object('fingerprint',repeat('a',64))) IS NULL;",{user:'supabase_admin'})).trim()==='t','OPERATIONAL_MACHINE_ALLOWED_FAILED');
  for(const sql of ['SELECT * FROM private_t19_custody.connections;','SELECT * FROM vault.decrypted_secrets;'])await this.checkedSQL(machine+sql,{user:'supabase_admin',expectedState:'42501'});
  const objects=await this.sqlJSON(objectsSQL);
  requireTrue(canonical(objects)===canonical({tables:10,ownedFunctions:11,allRLS:true,rolesRestricted:true,canSet:false,canCreate:false,authUsage:false,vaultEmpty:true}),'OPERATIONAL_FINAL_OBJECTS');
  const counts=await this.sqlJSON('SELECT jsonb_build_array('+['connections','operations','prepared_references','machines','machine_businesses','jobs','events','revocations','oauth_clients','oauth_states'].map(n=>'(SELECT count(*) FROM private_t19_custody.'+identifier(n)+')').join(',')+');');
  requireTrue(counts.every(n=>n===0)&&await this.fingerprint(true)===this.protectedBefore,'OPERATIONAL_FINAL_DATA_CHANGED');
  await this.record('operational-boundaries',{managerPermitted:true,foreignBusinessDenied:true,staffDenied:true,directCustodyDeniedRoles:['anon','authenticated','service_role'],privilegedMachineHandoffOnly:true,authenticatedCustodyLoginVerified:false,objects,emptyCustodyCounts:counts});
 }
}
export async function operationalCaptureSQL(){
 const sql=await readFile(join(ROOT,'scripts/t19-bootstrap-catalog.sql'),'utf8');
 const begin='BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;';
 requireTrue(sql.split(begin).length===2,'CAPTURE_SOURCE_SHAPE');
 const guard="DO $guard$ BEGIN IF current_user<>'postgres' OR session_user<>'postgres' OR current_database()<>'postgres' OR current_setting('server_version')<>'17.11' OR current_setting('transaction_read_only')<>'on' OR NOT COALESCE((SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid()),false) THEN RAISE EXCEPTION 'OPERATIONAL_CAPTURE_CONNECTION_REFUSED'; END IF; END $guard$;";
 return sql.replace(begin,begin+'\n'+guard);
}
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--capture-sql'){console.log(await operationalCaptureSQL());return;}
 const [mode,expectedPath,dir,approvalPath,...extra]=process.argv.slice(2);
 requireTrue(['--prepare','--run'].includes(mode)&&expectedPath&&dir&&!extra.length&&(mode==='--run'?!!approvalPath:!approvalPath),'USAGE_PREPARE_OR_RUN');
 const x=await inputs(resolve(expectedPath),resolve(dir));
 const owner=createPublicKey(x.trust.ownerKey);requireTrue(digest(owner.export({type:'spki',format:'der'}))==='9509ac682d7aa3bf5a6683aec53dbfc407834ba9302f3e58fbafe1c3ad3a1958','OWNER_KEY_MISMATCH');
 if(mode==='--prepare'){
  const issuedAt=Date.now(),receipt={scope:SCOPE,version:1,nonce:randomBytes(16).toString('hex'),issuedAt,expiresAt:issuedAt+900000,...x.bindings};
  await durable(dir,'operational-receipt.json',receipt);console.log(JSON.stringify({status:'SYNTHETIC_OPERATIONAL_RECEIPT_READY_NOT_EXECUTED',receiptPath:join(resolve(dir),'operational-receipt.json'),expiresAt:new Date(receipt.expiresAt).toISOString(),checkpointUsed:false}));return;
 }
 await protectedPath(approvalPath);const approval=JSON.parse(await readFile(approvalPath,'utf8'));
 const receipt=validateOperationalApproval(approval,x.bindings,x.trust.ownerKey);
 await protectedPath(join(resolve(dir),'operational-receipt.json'));requireTrue(canonical(JSON.parse(await readFile(join(resolve(dir),'operational-receipt.json'),'utf8')))===canonical(receipt),'RECEIPT_FILE_CHANGED');
 await durable(dir,'operational-consumed-'+receipt.nonce+'.json',{receiptDigest:digest(receipt)});
 await durable(dir,'operational-intent.json',{receipt,baseline:x.baseline});
 const host=new OperationalHost({...x,dir:resolve(dir),receipt});const interrupted=()=>{host.unknown=true;};
 process.on('SIGINT',interrupted);process.on('SIGTERM',interrupted);
 const result=await runOperationalRehearsal(host);process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);
 console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='SYNTHETIC_OPERATIONAL_SQL_PASS'?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error('T19_OPERATIONAL_REHEARSAL_STOP '+(/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNCLASSIFIED_FAILURE'));process.exitCode=1;});
