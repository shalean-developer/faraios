import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {SOURCE,CLI,CLIENT_IMAGE,BackupFailure,readVerifiedBackup,clientEnvironment,clientArgs,localDocker,ensureClientImage,verifyProviderCertificate,cleanupClient,run} from './backup-staging.mjs';

export const DESTINATION='zrlojsvkqipuwkkyfrkn';
export const RESTORE_CONFIG=JSON.parse(await readFile(new URL('../config/restore-test.json',import.meta.url),'utf8'));
export const MANAGED_PARAMETER_GRANT='GRANT SET ON PARAMETER "log_min_messages" TO "supabase_realtime_admin";';
const causeLabels=new Set(['METADATA_PERMISSION_DENIED','METADATA_NETWORK_FAILED','METADATA_TLS_FAILED','METADATA_DATABASE_AUTH_FAILED','METADATA_QUERY_FAILED','METADATA_UNCLASSIFIED','RESTORE_CATALOG_MISMATCH','CHILD_TIMEOUT','BACKUP_CANCELLED','RESTORE_VALIDATION_MARKER_MISSING']);
export class RestoreOutcomeFailure extends BackupFailure {
 constructor(code,error){super(code);this.causeLabel=error instanceof BackupFailure&&causeLabels.has(error.code)?error.code:'RESTORE_CAUSE_UNCLASSIFIED';}
}
const fail=code=>{throw new BackupFailure(code);};
const cancelled=signal=>{if(signal?.aborted)fail('BACKUP_CANCELLED');};
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
const identifier=s=>'"'+s.replaceAll('"','""')+'"';
const limits="SET LOCAL statement_timeout='600s'; SET LOCAL lock_timeout='10s'; SET LOCAL timezone='UTC'; SET LOCAL search_path='';\n";
const trimSQL=sql=>sql.trim().replace(/;$/,'');
const sqlFile=name=>readFile(new URL(name,import.meta.url),'utf8');

export function restoreEnvironment(password,original=process.env,write=false){
 const env=clientEnvironment(password,original);
 return {...env,PGUSER:'postgres.'+DESTINATION,PGAPPNAME:'faraios-t11-restore-test',PGOPTIONS:'-c default_transaction_read_only='+(write?'off':'on')+' -c statement_timeout=600000 -c lock_timeout=10000'};
}

export function validateRestoreBackup(backup){
 const c=RESTORE_CONFIG;
 if(c.environment!=='restore-test'||c.projectRef!==DESTINATION||c.url!=='https://'+DESTINATION+'.supabase.co'||DESTINATION===SOURCE)fail('RESTORE_CONFIG_INVALID');
 if(backup.id!==c.captureId||backup.sha256!==c.archiveSha256)fail('RESTORE_CAPTURE_NOT_APPROVED');
 const m=JSON.parse(backup.payload.files.find(f=>f.name==='manifest.json').content);
 if(m.version!==1||m.source!==SOURCE||m.filterSource!=='supabase/cli@'+CLI||m.clientImage!==CLIENT_IMAGE||!Number.isFinite(Date.parse(m.finished)))fail('RESTORE_MANIFEST_INVALID');
 if(m.before.catalog_sha256!==c.captureCatalogSha256)fail('RESTORE_CAPTURE_CATALOG_NOT_REVIEWED');
 sequenceAssignments(backup.payload.files);
 preserveManagedParameterGrant(backup.payload.files.find(f=>f.name==='roles.sql')?.content);
 return m;
}

export function validateDestination(metadata,manifest){
 const p=metadata?.preflight,c=metadata?.catalog;
 if(!p||p.database_major!==17||p.database!=='postgres'||p.role!=='postgres'||p.application_objects!==0||p.managed_data_rows!==0||p.large_objects!==0||p.vault_secrets!==0||p.foreign_servers!==0||JSON.stringify(p.unexpected_schemas)!=='[]')fail('RESTORE_DESTINATION_NOT_EMPTY');
 if(c?.application!==RESTORE_CONFIG.emptyApplicationCatalogSha256||c?.managed!==RESTORE_CONFIG.managedCatalogSha256)fail('RESTORE_DESTINATION_SCHEMA_CHANGED');
 const expected={...manifest.before.extension_versions},actual={...p.extension_versions};
 if(p.btree_gist_default!==expected.btree_gist)fail('RESTORE_EXTENSION_VERSION_CHANGED');
 if(!Object.hasOwn(actual,'btree_gist'))delete expected.btree_gist;
 if(Object.keys(actual).sort().join('|')!==Object.keys(expected).sort().join('|')||Object.keys(expected).some(k=>actual[k]!==expected[k]))fail('RESTORE_EXTENSION_VERSION_CHANGED');
 const privileges=p.sequence_privileges??[];
 if(JSON.stringify(privileges.map(x=>x.name).sort())!==JSON.stringify(RESTORE_CONFIG.sequences)||privileges.some(x=>x.can_select!==true||x.can_update!==true))fail('RESTORE_SEQUENCE_PRIVILEGES_CHANGED');
 return metadata;
}

// Only keyword detection uses this lexical view. Quoted text and SQL comments
// cannot masquerade as parameter statements; the replayed bytes stay unchanged.
function roleKeywords(sql){
 let code='',quote=null,escaped=false,block=0;
 for(let i=0;i<sql.length;i++){
  const ch=sql[i],next=sql[i+1];
  if(block){if(ch==='/'&&next==='*'){block++;i++;}else if(ch==='*'&&next==='/'){block--;i++;}code+=' ';continue;}
  if(quote){if(escaped&&ch==='\\'){i++;code+='  ';continue;}if(ch===quote){if(next===quote)i++;else quote=null;}code+=' ';continue;}
  if(ch==='-'&&next==='-'){while(i<sql.length&&sql[i]!=='\n')i++;code+='\n';continue;}
  if(ch==='/'&&next==='*'){block=1;i++;code+=' ';continue;}
  if(ch==="'"||ch==='"'){quote=ch;escaped=ch==="'"&&/[eE]/.test(sql[i-1]??'')&&!/[a-z0-9_$]/i.test(sql[i-2]??'');code+=' ';continue;}
  code+=ch;
 }
 if(quote||block)fail('RESTORE_ROLE_DUMP_INVALID');return code;
}

export function preserveManagedParameterGrant(sql){
 if(typeof sql!=='string')fail('RESTORE_ROLE_DUMP_INVALID');
 const keywords=roleKeywords(sql).match(/\bPARAMETER\b/gi)??[];
 const lines=sql.split('\n');let seen=0;
 const rewritten=lines.map(line=>{if(line.replace(/\r$/,'')!==MANAGED_PARAMETER_GRANT)return line;seen++;return '-- Existing provider parameter grant preserved; full parameter ACL equality is required.';}).join('\n');
 if(keywords.length!==1||seen!==1||/\bPARAMETER\b/i.test(roleKeywords(rewritten)))fail('RESTORE_PARAMETER_GRANT_UNREVIEWED');
 return rewritten;
}

// Native data dumps only. COPY rows can contain arbitrary text, including SQL.
// Sequence assignments are delayed until committed table/catalog verification.
export function sequenceAssignments(files,approved=true){
 const states=[],rewritten={};
 for(const name of ['data.sql','migration-data.sql']){
  const content=files.find(f=>f.name===name)?.content;if(typeof content!=='string')fail('RESTORE_SEQUENCE_DUMP_INVALID');
  let copy=false;
  rewritten[name]=content.split('\n').map(line=>{
   const text=line.replace(/\r$/,'');
   if(copy){if(text==='\\.')copy=false;return line;}
   if(/^COPY /.test(text)){copy=true;return line;}
   if(!/\bsetval\b/i.test(text)||/^\s*--/.test(text))return line;
   const m=/^SELECT pg_catalog\.setval\('\x22([a-z_][a-z0-9_]*)\x22\.\x22([a-z_][a-z0-9_]*)\x22', (-?[0-9]+), (true|false)\);$/.exec(text);
   if(!m||BigInt(m[3])<-(2n**63n)||BigInt(m[3])>=2n**63n)fail('RESTORE_SEQUENCE_DUMP_INVALID');
   const state={schema:m[1],sequence:m[2],value:BigInt(m[3]).toString(),isCalled:m[4]==='true'};
   if(states.some(x=>x.schema===state.schema&&x.sequence===state.sequence))fail('RESTORE_SEQUENCE_DUMP_INVALID');states.push(state);
   return '-- Sequence state deferred to the guarded completion phase.';
  }).join('\n');
  if(copy)fail('RESTORE_SEQUENCE_DUMP_INVALID');
 }
 states.sort((a,b)=>(a.schema+'.'+a.sequence).localeCompare(b.schema+'.'+b.sequence));
 if(approved&&JSON.stringify(states.map(x=>x.schema+'.'+x.sequence))!==JSON.stringify(RESTORE_CONFIG.sequences))fail('RESTORE_SEQUENCE_SCOPE_CHANGED');
 return {states,rewritten};
}

export function sequenceVerificationSQL(states){
 return `DO $t11_sequences$ DECLARE v text; called boolean; BEGIN\n`+states.map(s=>`SELECT last_value::text,is_called INTO v,called FROM ${identifier(s.schema)}.${identifier(s.sequence)}; IF v<>${literal(s.value)} OR called<>${s.isCalled} THEN RAISE EXCEPTION 'RESTORE_SEQUENCE_STATE_PENDING'; END IF;`).join('\n')+"\nEND $t11_sequences$;\nSELECT 'FARAIOS_T11_SEQUENCES_VALIDATED';\n";
}
export function finishSequencesSQL(manifest,catalogSQL,states){
 // setval cannot roll back. It is allowed only after an independent row/catalog
 // recheck on the held, unused destination; no table or schema changes here.
 return verificationSQL(manifest,catalogSQL)+states.map(s=>`SELECT pg_catalog.setval(${literal(identifier(s.schema)+'.'+identifier(s.sequence))},${s.value},${s.isCalled});`).join('\n')+'\n'+sequenceVerificationSQL(states);
}

// The same emptiness and catalog checks run again inside the import transaction.
function catalogCheck(sql,application){
 return `DO $t11_catalog$ DECLARE actual jsonb; BEGIN
 SELECT catalog INTO actual FROM (${trimSQL(sql)}) q;
 IF actual->>'application'<>${literal(application)} OR actual->>'managed'<>${literal(RESTORE_CONFIG.managedCatalogSha256)} THEN RAISE EXCEPTION 'RESTORE_CATALOG_MISMATCH'; END IF;
 END $t11_catalog$;\n`;
}
function emptyCheck(sql){
 return `DO $t11_empty$ DECLARE actual_preflight jsonb; BEGIN
 SELECT preflight INTO actual_preflight FROM (${trimSQL(sql)}) q;
 IF actual_preflight->>'database_major'<>'17' OR actual_preflight->>'role'<>'postgres' OR actual_preflight->>'database'<>'postgres' OR actual_preflight->>'application_objects'<>'0' OR actual_preflight->>'managed_data_rows'<>'0' OR actual_preflight->>'vault_secrets'<>'0' OR actual_preflight->>'large_objects'<>'0' OR actual_preflight->>'foreign_servers'<>'0' OR actual_preflight->'unexpected_schemas'<>'[]'::jsonb THEN RAISE EXCEPTION 'RESTORE_DESTINATION_NOT_EMPTY'; END IF;
 END $t11_empty$;\n`;
}

export function verificationSQL(manifest,catalogSQL){
 const m=manifest.before;
 const assertions=[];
 for(const t of m.tables){
  if(t.schema==='auth'&&t.table==='schema_migrations'||t.schema==='storage'&&t.table==='migrations')continue;
  if(!['public','audit','auth','storage','supabase_migrations'].includes(t.schema)||!/^[a-z_][a-z0-9_]*$/.test(t.table)||!/^[a-f0-9]{64}$/.test(t.sha256)||!Number.isSafeInteger(t.rows)||t.rows<0)fail('RESTORE_TABLE_INVALID');
  const table=identifier(t.schema)+'.'+identifier(t.table);
  assertions.push(`SELECT count(*),encode(extensions.digest(coalesce(string_agg(q.row_hash,'' ORDER BY q.row_hash),''),'sha256'),'hex') INTO n,actual_hash FROM (SELECT encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex') row_hash FROM ${table} t) q;
 IF n<>${t.rows} OR actual_hash<>${literal(t.sha256)} THEN RAISE EXCEPTION 'RESTORE_DATA_MISMATCH'; END IF;`);
 }
 const versions=Object.entries(m.extension_versions).sort().map(([k,v])=>literal(k)+','+literal(v)).join(',');
 return limits+catalogCheck(catalogSQL,RESTORE_CONFIG.applicationCatalogSha256)+`DO $t11_rows$ DECLARE n bigint; actual_hash text; BEGIN
 ${assertions.join('\n')}
 IF (SELECT jsonb_object_agg(extname,extversion) FROM pg_extension)<>jsonb_build_object(${versions}) THEN RAISE EXCEPTION 'RESTORE_EXTENSION_MISMATCH'; END IF;
 IF EXISTS(SELECT 1 FROM public.business_accounting_connections WHERE enabled) THEN RAISE EXCEPTION 'RESTORE_ACCOUNTING_ENABLED'; END IF;
 END $t11_rows$;\nSELECT 'FARAIOS_T11_RESTORE_VALIDATED';\n`;
}

export function importSQL(backup,manifest,catalogSQL,preflightSQL){
 const content=Object.fromEntries(backup.payload.files.map(f=>[f.name,f.content]));
 content['roles.sql']=preserveManagedParameterGrant(content['roles.sql']);
 Object.assign(content,sequenceAssignments(backup.payload.files,false).rewritten);
 // Only the five supported import members run. Managed schemas are never replayed.
 const ordered=['roles.sql','schema.sql','migration-schema.sql','data.sql','migration-data.sql'];
 const members=ordered.map(name=>limits+content[name]+'\n');
 return limits+"SELECT pg_advisory_xact_lock(1711,20261020);\n"+emptyCheck(preflightSQL)+catalogCheck(catalogSQL,RESTORE_CONFIG.emptyApplicationCatalogSha256)+
  'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;\n'+members.join('\n')+verificationSQL(manifest,catalogSQL);
}

export async function restoreArchive({archive,password,mode='restore',home=homedir(),runner=run,signal,progress=()=>{}}){
 if(!['restore','preflight','verify','finish-sequences'].includes(mode))fail('RESTORE_MODE_INVALID');
 cancelled(signal);
 const backup=await readVerifiedBackup(resolve(archive),join(home,'.faraios-recovery-keys'),runner,signal);
 const manifest=validateRestoreBackup(backup),started=Date.now();
 const {states}=sequenceAssignments(backup.payload.files);
 const [catalogSQL,preflightSQL]=await Promise.all([sqlFile('./restore-catalog.sql'),sqlFile('./restore-preflight.sql')]);
 let env=restoreEnvironment(password),importStarted=false,sequenceStarted=false;
 const id=randomBytes(16).toString('hex');
 try{
  await verifyProviderCertificate();env=await localDocker(env,runner,signal);await ensureClientImage(env,runner,signal);
  const client=async(step,input,write=false)=>{
   cancelled(signal);await verifyProviderCertificate();
   const childEnv={...env,PGOPTIONS:restoreEnvironment(password,{},write).PGOPTIONS};
   const heartbeat=setInterval(()=>progress('This restore step is still running...'),20000);
   let result;
   try{result=await runner('docker',clientArgs(id,step,'exec psql -X -w -q -A -t --set=ON_ERROR_STOP=1 --single-transaction --file=-',childEnv,true),{env:childEnv,input,signal,maxOutput:1024*1024,failureContext:'pg-client'});}
   finally{clearInterval(heartbeat);try{await cleanupClient(id,step,env,runner);}finally{delete childEnv.PGPASSWORD;}}
   cancelled(signal);return result;
  };
  if(['restore','preflight'].includes(mode)){
   progress('Checking exact empty restore destination');
   const query=limits+`SELECT jsonb_build_object('catalog',(SELECT catalog FROM (${trimSQL(catalogSQL)}) c),'preflight',(SELECT preflight FROM (${trimSQL(preflightSQL)}) p));\n`;
   let metadata;try{metadata=JSON.parse((await client('restore-preflight',query)).stdout);}catch(e){if(e instanceof BackupFailure)throw e;fail('RESTORE_PREFLIGHT_INVALID');}
   validateDestination(metadata,manifest);
   if(mode==='preflight')return {destination:DESTINATION,captureId:backup.id,restorePreflight:'PASSED',restore:'NOT_RUN'};
  }
  progress(mode==='verify'?'Verifying restored data without writes':mode==='finish-sequences'?'Rechecking committed restore before sequence completion':'Importing and verifying tables/schema in one transaction');
  importStarted=mode==='restore';
  if(mode!=='finish-sequences'){
   const result=await client(mode==='verify'?'restore-verify':'restore-import',mode==='verify'?verificationSQL(manifest,catalogSQL):importSQL(backup,manifest,catalogSQL,preflightSQL),mode==='restore');
   if(!result.stdout.split(/\r?\n/).includes('FARAIOS_T11_RESTORE_VALIDATED'))fail('RESTORE_VALIDATION_MARKER_MISSING');
   if(mode==='verify'){
    let sequenceResult;
    try{sequenceResult=await client('restore-verify-sequences',sequenceVerificationSQL(states));}
    catch(error){if(error.code==='RESTORE_SEQUENCE_STATE_PENDING')fail('RESTORE_DATA_VALID_SEQUENCES_UNVERIFIED');throw error;}
    if(!sequenceResult.stdout.split(/\r?\n/).includes('FARAIOS_T11_SEQUENCES_VALIDATED'))fail('RESTORE_VALIDATION_MARKER_MISSING');
   }
  }
  if(mode!=='verify'){
   sequenceStarted=true;progress('Completing sequence positions after committed row/catalog validation');
   const result=await client('restore-sequences',finishSequencesSQL(manifest,catalogSQL,states),true);
   if(!result.stdout.split(/\r?\n/).includes('FARAIOS_T11_SEQUENCES_VALIDATED'))fail('RESTORE_VALIDATION_MARKER_MISSING');
  }
  cancelled(signal);
  return {destination:DESTINATION,captureId:backup.id,sha256:backup.sha256,restore:mode==='verify'?'VERIFIED_READ_ONLY':mode==='finish-sequences'?'SEQUENCES_COMPLETED':'COMMITTED',dataVerification:'PASSED',catalogVerification:'PASSED',sequenceVerification:'PASSED',captureFinished:manifest.finished,elapsedMs:Date.now()-started,helperPlaintextSQLFiles:'NEVER_WRITTEN',restoredAppAcceptance:'NOT_RUN',offlineKeyCopy:'PENDING'};
 }catch(error){
  // A broken connection can lose the commit acknowledgement. Never retry blindly.
  if(sequenceStarted&&error.code!=='CONTAINER_CLEANUP_FAILED')throw new RestoreOutcomeFailure('RESTORE_SEQUENCE_OUTCOME_UNCONFIRMED',error);
  if(importStarted&&error.code!=='CONTAINER_CLEANUP_FAILED')throw new RestoreOutcomeFailure('RESTORE_OUTCOME_UNCONFIRMED',error);
  throw error;
 }finally{delete env.PGPASSWORD;}
}

async function pickArchive(signal){
 if(process.platform!=='win32')fail('RESTORE_FILE_ARGUMENT_REQUIRED');
 const script="Add-Type -AssemblyName System.Windows.Forms; $t11Picker=New-Object System.Windows.Forms.OpenFileDialog; $t11Picker.Title='Select the verified FaraiOS backup downloaded from Drive'; $t11Picker.Filter='FaraiOS backup (*.fbackup)|*.fbackup'; if($t11Picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){[Console]::Write($t11Picker.FileName)}; $t11Picker.Dispose()";
 const result=await run('powershell.exe',['-NoLogo','-NoProfile','-STA','-Command',script],{signal,timeout:300000,maxOutput:32768});
 if(!result.stdout)fail('RESTORE_CANCELLED');return result.stdout;
}

async function main(){
 const args=process.argv.slice(2);
 if(!process.stdin.isTTY||!process.stdout.isTTY)fail('RUN_INTERACTIVELY');
 if(args.length&&!(args.length===2&&['--restore-file','--preflight-file','--verify-restored-file','--finish-sequences-file'].includes(args[0])))fail('RESTORE_OPTIONS_INVALID');
 const mode=args[0]==='--preflight-file'?'preflight':args[0]==='--verify-restored-file'?'verify':args[0]==='--finish-sequences-file'?'finish-sequences':'restore';
 const cancellation=new AbortController(),cancel=()=>cancellation.abort();let muted=false;
 const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
 const terminal=createInterface({input:process.stdin,output,terminal:true,historySize:0});
 terminal.on('SIGINT',cancel);process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 const ask=async(prompt,hidden=false)=>{process.stdout.write(prompt+'\n');muted=hidden;try{return await terminal.question('',{signal:cancellation.signal});}finally{muted=false;if(hidden)process.stdout.write('\n');}};
 try{
  console.log('FaraiOS isolated restore only: faraios-restore-test '+DESTINATION+'.');
  console.log('Source staging is never connected. Keep restore-project apps, signups, email/SMS, providers and jobs isolated.');
  const archive=args[1]??await pickArchive(cancellation.signal);
  if(['restore','finish-sequences'].includes(mode)&&(await ask('Confirm the isolated destination is unused and outbound integrations are disabled (type RESTORE_TEST):')).trim()!=='RESTORE_TEST')fail('RESTORE_ISOLATION_NOT_CONFIRMED');
  const password=await ask('Existing faraios-restore-test DATABASE password (hidden; never paste in chat):',true);
  console.log(JSON.stringify(await restoreArchive({archive,password,mode,signal:cancellation.signal,progress:console.log}),null,2));
  console.log('T11 remains In progress: restored sign-in/access/audit acceptance and offline key custody are separate checks.');
 }finally{terminal.close();process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error('Restore stopped ['+(error instanceof BackupFailure?error.code:'LOCAL_FAILURE')+']. Share only fixed labels. If import started, verify the outcome read-only before any retry.');if(error instanceof RestoreOutcomeFailure)console.error('Restore observation ['+error.causeLabel+'].');process.exitCode=1;});
