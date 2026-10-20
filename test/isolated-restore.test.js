import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {restoreEnvironment,DESTINATION,RESTORE_CONFIG,validateRestoreBackup,validateDestination,importSQL,verificationSQL,restoreArchive,sequenceAssignments,preserveManagedParameterGrant,MANAGED_PARAMETER_GRANT,RestoreOutcomeFailure,RESTORE_CREATION_DEFAULTS_SQL} from '../scripts/restore-staging.mjs';
import {SOURCE,CLI,CLIENT_IMAGE,DUMPS,capture,run,BackupFailure,CLIENT_STARTED,metadataFailureLabel} from '../scripts/backup-staging.mjs';
import {restoreFetch,createRestoreServer} from '../restore-rehearsal.mjs';
import {createStagingServer} from '../src/staging-server.js';
import {COMPONENT_PREFIX,ROLLBACK_MARKER} from '../scripts/restore-diagnostic.mjs';
const versions={btree_gist:'1.7',pg_stat_statements:'1.11',pgcrypto:'1.3',plpgsql:'1.0',supabase_vault:'0.3.1','uuid-ossp':'1.1'};
function manifest(){return {version:1,source:SOURCE,filterSource:'supabase/cli@'+CLI,clientImage:CLIENT_IMAGE,finished:'2026-10-20T18:17:00Z',before:{catalog_sha256:RESTORE_CONFIG.captureCatalogSha256,extension_versions:{...versions},tables:[{schema:'public',table:'businesses',rows:2,sha256:'a'.repeat(64)},{schema:'auth',table:'users',rows:3,sha256:'b'.repeat(64)},{schema:'auth',table:'schema_migrations',rows:10,sha256:'c'.repeat(64)}]}};}
function backup(m=manifest()){return {id:RESTORE_CONFIG.captureId,sha256:RESTORE_CONFIG.archiveSha256,payload:{files:[...['roles.sql','schema.sql','migration-schema.sql','data.sql','migration-data.sql','managed-schema-reference.sql'].map(name=>({name,content:'-- '+name+(name==='roles.sql'?'\n'+MANAGED_PARAMETER_GRANT:'')+(name==='data.sql'?`\nSELECT pg_catalog.setval('\"auth\".\"refresh_tokens_id_seq\"', 50, true);`:'')})),{name:'manifest.json',content:JSON.stringify(m)}]}};}
function metadata(){const e={...versions};delete e.btree_gist;return {catalog:{application:RESTORE_CONFIG.emptyApplicationCatalogSha256,managed:RESTORE_CONFIG.managedCatalogSha256},preflight:{database_major:17,database:'postgres',role:'postgres',application_objects:0,managed_data_rows:0,large_objects:0,vault_secrets:0,foreign_servers:0,unexpected_schemas:[],extension_versions:e,btree_gist_default:'1.7',sequence_privileges:[{name:'auth.refresh_tokens_id_seq',can_select:true,can_update:true}]}};}

test('restore transport has one fixed destination and refuses inherited project/credential/trust overrides',()=>{
 const e=restoreEnvironment('synthetic private password',{PGHOST:'source.invalid',PGUSER:'postgres.'+SOURCE,PGSSLMODE:'disable',PGPASSWORD:'old',SUPABASE_PROJECT_ID:SOURCE,DOCKER_HOST:'tcp://remote',SSL_CERT_FILE:'bad'});
 assert.equal(e.PGUSER,'postgres.'+DESTINATION);assert.equal(e.PGSSLMODE,'verify-full');assert.equal(e.PGPASSWORD,'synthetic private password');assert.equal(e.SUPABASE_PROJECT_ID,undefined);assert.equal(e.DOCKER_HOST,undefined);assert.equal(e.SSL_CERT_FILE,undefined);assert.match(e.PGOPTIONS,/default_transaction_read_only=on/);
 assert.match(restoreEnvironment('synthetic',{},true).PGOPTIONS,/default_transaction_read_only=off/);assert.notEqual(SOURCE,DESTINATION);
});
test('only exact archive and the reviewed capture catalog can enter restoration',()=>{
 validateRestoreBackup(backup());
 for(const mutate of [b=>b.id='0'.repeat(32),b=>b.sha256='0'.repeat(64),b=>b.payload.files.at(-1).content=JSON.stringify({...manifest(),source:DESTINATION}),b=>{const m=manifest();m.before.catalog_sha256='0'.repeat(64);b.payload.files.at(-1).content=JSON.stringify(m);}]){const b=backup();mutate(b);assert.throws(()=>validateRestoreBackup(b));}
});
test('existing application/Auth/Vault/network state, structural drift and extension mismatch block import',()=>{
 validateDestination(metadata(),manifest());
 for(const mutate of [d=>d.preflight.application_objects++,d=>d.preflight.managed_data_rows++,d=>d.preflight.vault_secrets++,d=>d.preflight.large_objects++,d=>d.preflight.foreign_servers++,d=>d.preflight.role='other',d=>d.preflight.database_major=16,d=>d.preflight.unexpected_schemas=['unapproved'],d=>d.catalog.application='changed',d=>d.catalog.managed='changed',d=>d.preflight.extension_versions.pgcrypto='changed',d=>d.preflight.extension_versions.pg_net='1',d=>d.preflight.btree_gist_default='changed']){const d=metadata();mutate(d);assert.throws(()=>validateDestination(d,manifest()));}
});
test('import checks empty destination again, never replays managed reference and validates before psql commits',async()=>{
 const [c,p]=await Promise.all(['restore-catalog.sql','restore-preflight.sql'].map(f=>readFile(new URL('../scripts/'+f,import.meta.url),'utf8')));
 const sql=importSQL(backup(),manifest(),c,p);
 assert.ok(sql.startsWith('SAVEPOINT faraios_t11_replay;'));
 assert.ok(sql.indexOf('RESTORE_DESTINATION_NOT_EMPTY')<sql.indexOf('-- roles.sql'));
 assert.ok(sql.indexOf('-- migration-schema.sql')<sql.indexOf('-- data.sql'));
 assert.ok(!sql.includes('-- managed-schema-reference.sql'));
 assert.ok(sql.indexOf('RESTORE_DATA_MISMATCH')>sql.indexOf('-- migration-data.sql'));
 assert.match(sql,/RESTORE_CATALOG_MISMATCH/);assert.match(sql,/RESTORE_ACCOUNTING_ENABLED/);assert.match(sql,/CREATE EXTENSION IF NOT EXISTS btree_gist/);assert.ok(!/\bCOMMIT\b/i.test(sql));
 assert.equal(sql.split(RESTORE_CREATION_DEFAULTS_SQL).length,2);
 assert.ok(sql.indexOf(RESTORE_CREATION_DEFAULTS_SQL)>sql.indexOf('RESTORE_CATALOG_MISMATCH'));
 assert.ok(sql.indexOf(RESTORE_CREATION_DEFAULTS_SQL)<sql.indexOf('-- roles.sql'));
 const verify=verificationSQL(manifest(),c);assert.ok(!verify.includes('CREATE EXTENSION'));assert.ok(!verify.includes('FROM "auth"."schema_migrations"'));assert.match(verify,/FROM "auth"."users"/);
 assert.ok(!verify.includes('ALTER DEFAULT PRIVILEGES'));
});
test('only the exact existing managed parameter grant is omitted; unexpected ACL statements stop before connection',()=>{
 const original='-- Native cluster dump\n'+MANAGED_PARAMETER_GRANT+"\nALTER ROLE \"postgres\" SET \"statement_timeout\" TO '10s';";
 const rewritten=preserveManagedParameterGrant(original);assert.ok(!rewritten.includes(MANAGED_PARAMETER_GRANT));assert.ok(rewritten.includes('ALTER ROLE "postgres" SET "statement_timeout"'));
 for(const grant of ['',MANAGED_PARAMETER_GRANT+'\n'+MANAGED_PARAMETER_GRANT,MANAGED_PARAMETER_GRANT.replace('SET ON','ALTER SYSTEM ON'),MANAGED_PARAMETER_GRANT.replace(' TO ','\nTO '),MANAGED_PARAMETER_GRANT+'\nGRANT SET ON /*blocked*/ PARAMETER "work_mem" TO "anon";',MANAGED_PARAMETER_GRANT+'\nGRANT SET ON\nPARAMETER "work_mem" TO "anon";',MANAGED_PARAMETER_GRANT.replace('supabase_realtime_admin','anon'),MANAGED_PARAMETER_GRANT+'\nREVOKE SET ON PARAMETER "log_min_messages" FROM "supabase_realtime_admin";'])assert.throws(()=>preserveManagedParameterGrant(grant),{code:'RESTORE_PARAMETER_GRANT_UNREVIEWED'});
 assert.doesNotThrow(()=>preserveManagedParameterGrant('-- PARAMETER in comment\n'+MANAGED_PARAMETER_GRANT+"\nALTER ROLE \"postgres\" SET \"pgrst.test\" TO 'ON PARAMETER; -- ''';"));
 for(const inert of ['/*\n'+MANAGED_PARAMETER_GRANT+'\n*/',`ALTER ROLE "postgres" SET "pgrst.test" TO 'first\n${MANAGED_PARAMETER_GRANT}\nlast';`])assert.throws(()=>preserveManagedParameterGrant(inert+'\nGRANT SET ON PARAMETER "work_mem" TO "anon";'),{code:'RESTORE_PARAMETER_GRANT_UNREVIEWED'});
 const b=backup();b.payload.files.find(f=>f.name==='roles.sql').content+='\nGRANT SET ON PARAMETER "work_mem" TO "anon";';assert.throws(()=>validateRestoreBackup(b),{code:'RESTORE_PARAMETER_GRANT_UNREVIEWED'});
 assert.throws(()=>preserveManagedParameterGrant(MANAGED_PARAMETER_GRANT+'\n-- comment\rGRANT SET ON PARAMETER "work_mem" TO "anon";'),{code:'RESTORE_PARAMETER_GRANT_UNREVIEWED'});
});
test('uncertain outcome retains only allowlisted cause observations',()=>{
 const known=new RestoreOutcomeFailure('RESTORE_OUTCOME_UNCONFIRMED',new BackupFailure('METADATA_PERMISSION_DENIED'));assert.equal(known.causeLabel,'METADATA_PERMISSION_DENIED');
 for(const error of [new Error('private-password'),{code:'METADATA_PERMISSION_DENIED',message:'private-password'},new BackupFailure('private-password')]){
  const failure=new RestoreOutcomeFailure('RESTORE_OUTCOME_UNCONFIRMED',error);assert.equal(failure.causeLabel,'RESTORE_CAUSE_UNCLASSIFIED');assert.ok(!JSON.stringify(failure).includes('private-password'));
 }
});
test('sequence parsing preserves COPY records and rejects missing, duplicate, unknown or malformed assignments',()=>{
 const row="SELECT pg_catalog.setval('\"auth\".\"refresh_tokens_id_seq\"', 999, true);";
 const files=backup().payload.files;
 const data=files.find(f=>f.name==='data.sql');data.content='COPY "public"."sample" (content) FROM stdin;\n'+row+'\n\\.\n'+data.content;
 const result=sequenceAssignments(files);assert.equal(result.states.length,1);assert.equal(result.states[0].value,'50');assert.ok(result.rewritten['data.sql'].includes(row));assert.ok(!result.rewritten['data.sql'].includes("', 50, true);"));
 for(const content of ['-- no sequence',data.content+'\n'+data.content,data.content.replace('50, true','50;SELECT 1, true'),data.content.replace('50, true','9223372036854775808, true'),data.content.replace(/refresh_tokens_id_seq/g,'unknown_seq'),data.content+'\n '+row,data.content+'\n'+row.replace('setval(', 'setval (')]){const f=structuredClone(files);f.find(x=>x.name==='data.sql').content=content;assert.throws(()=>sequenceAssignments(f));}
});
test('native sequence-pending stderr remains a fixed diagnostic through the production child classifier',async()=>{
 const stderr='psql:<stdin>:8: ERROR: RESTORE_SEQUENCE_STATE_PENDING';
 assert.equal(metadataFailureLabel(stderr),'RESTORE_SEQUENCE_STATE_PENDING');
 await assert.rejects(run(process.execPath,['-e',"process.stderr.write(process.argv[1]);process.exit(1)",CLIENT_STARTED+'\n'+stderr],{failureContext:'pg-client'}),{code:'RESTORE_SEQUENCE_STATE_PENDING'});
 const denied='psql:<stdin>:8: ERROR: permission denied for parameter private-parameter';
 await assert.rejects(run(process.execPath,['-e',"process.stderr.write(process.argv[1]);process.exit(1)",CLIENT_STARTED+'\n'+denied],{failureContext:'pg-client'}),{code:'METADATA_PERMISSION_DENIED'});
});
test('restore outbound adapter permits destination reads and password/local logout only',async()=>{
 const calls=[],adapter=restoreFetch(async(...a)=>{calls.push(a);return new Response('{}');});
 const origin='https://'+DESTINATION+'.supabase.co';
 for(const [path,method] of [['/auth/v1/token?grant_type=password','POST'],['/auth/v1/user','GET'],['/auth/v1/logout?scope=local','POST'],['/rest/v1/businesses?select=id','GET'],['/rest/v1/rpc/invoice_totals','POST']])await adapter(origin+path,{method});
 assert.equal(calls.length,5);assert.ok(calls.every(([,i])=>i.redirect==='error'));
 for(const [url,method] of [['https://'+SOURCE+'.supabase.co/auth/v1/token?grant_type=password','POST'],['https://books.zoho.com/','GET'],[origin+'/auth/v1/signup','POST'],[origin+'/auth/v1/recover','POST'],[origin+'/auth/v1/logout?scope=global','POST'],[origin+'/auth/v1/token?grant_type=refresh_token','POST'],[origin+'/rest/v1/businesses','PATCH'],[origin+'/rest/v1/rpc/prepare_invoice','POST'],[origin+'/rest/v1/rpc/create_quote','GET']])await assert.rejects(adapter(url,{method}),/RESTORE_REQUEST_BLOCKED/);
 assert.equal(calls.length,5);
});
test('restore server has distinct cookie, visible restore marker and blocks every business mutation before auth',async t=>{
 let calls=0;const server=createStagingServer({restoreTest:true,createClient:()=>{calls++;throw Error('must not run');}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));t.after(()=>new Promise(done=>server.close(done)));
 const origin='http://127.0.0.1:'+server.address().port;
 const login=await fetch(origin+'/login');assert.match(await login.text(),/FaraiOS RESTORE TEST/);
 assert.deepEqual(await (await fetch(origin+'/restore-health')).json(),{environment:'restore-test',businessWrites:'disabled',accountingWorker:'disabled'});
 for(const path of ['/invoices','/quotes','/bookings','/settings','/catalogue','/recurring','/staff','/customers'])assert.equal((await fetch(origin+path,{method:'POST',headers:{Origin:origin},body:'action=write'})).status,405);
 const denied=await fetch(origin+'/dashboard',{redirect:'manual',headers:{Cookie:'faraios_staging=00000000-0000-4000-8000-000000000001'}});assert.equal(denied.status,303);assert.match(denied.headers.get('set-cookie'),/^faraios_restore_test=/);assert.equal(calls,0);
 assert.throws(()=>createStagingServer({restoreTest:true,createClient:()=>{},accountingWorker:{}}));
});
test('restore launcher ignores accounting credentials and creates only its pinned read-only server',async t=>{
 const server=createRestoreServer({fetchImpl:()=>{throw Error('No request expected');}});await new Promise(done=>server.listen(0,'127.0.0.1',done));t.after(()=>new Promise(done=>server.close(done)));
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/login');assert.equal(response.status,200);assert.match(await response.text(),/Read-only recovery workspace/);
});
test('private file/key loading and restore orchestration keep every destination client fixed and sanitize uncertain imports',async t=>{
 const home=await realpath(await mkdtemp(join(tmpdir(),'faraios-restore-test-')));t.after(()=>rm(home,{recursive:true,force:true}));
 const m={database_major:17,business_ids:['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'],extensions:Object.keys(versions).sort(),extension_versions:versions,vault_secrets:0,storage_objects:0,storage_buckets:0,large_objects:0,unexpected_schemas:[],catalog_sha256:RESTORE_CONFIG.captureCatalogSha256,tables:[...Array.from({length:15},(_,i)=>({schema:'public',table:'t'+i,rls:true,rows:0,sha256:'a'.repeat(64)})),...Array.from({length:2},(_,i)=>({schema:'audit',table:'t'+i,rls:true,rows:0,sha256:'b'.repeat(64)})),{schema:'auth',table:'users',rls:true,rows:3,sha256:'c'.repeat(64)},{schema:'supabase_migrations',table:'schema_migrations',rls:false,rows:21,sha256:'d'.repeat(64)}]};
 let restoring=false,sequencePending=false,uncertain=false,diagnosticFault=null,cancelAfterStep=null,cleanupAfterStep=null,pendingStep=null,controller;const calls=[];
 const runner=async(command,args,opts)=>{
  if(command!=='docker')return run(command,args,opts); // Use real Windows key/ACL checks.
  if(args[0]==='image')return {stdout:'sha256:'+'a'.repeat(64)};
  if(args[0]==='info')return {stdout:'linux'};
  if(args[0]==='context')return {stdout:args[1]==='show'?'desktop-linux':JSON.stringify(process.platform==='win32'?'npipe:////./pipe/dockerDesktopLinuxEngine':'unix:///var/run/docker.sock')};
  if(args[0]==='ps'||args[0]==='rm'){if(restoring&&pendingStep===cancelAfterStep&&controller){controller.abort();pendingStep=null;}if(restoring&&pendingStep===cleanupAfterStep&&cleanupAfterStep)throw Error('synthetic-private-password');return {stdout:''};}
  assert.equal(args[0],'run');
  const step=args[args.indexOf('--name')+1].replace(/^faraios-t11-[a-f0-9]{32}-/,'');
  if(restoring){
   calls.push(step);pendingStep=step;assert.equal(opts.env.PGUSER,'postgres.'+DESTINATION);assert.equal(opts.env.PGSSLMODE,'verify-full');assert.ok(!args.some(x=>x.includes('synthetic-private-password')));assert.ok(args.includes('--single-transaction')||args.at(-1).includes('--single-transaction'));
   if(step==='restore-preflight')return {stdout:JSON.stringify(metadata())};
   if(step.startsWith('diagnostic-')){
    assert.match(opts.env.PGOPTIONS,step==='diagnostic-schema'?/read_only=off/:/read_only=on/);
    if(step!=='diagnostic-schema'){
     const data={...metadata(),sequence_state:['11',true]};
     if(step==='diagnostic-postcheck'&&diagnosticFault==='nonempty')data.preflight.application_objects=1;
     if(step==='diagnostic-postcheck'&&diagnosticFault==='sequence')data.sequence_state=['12',true];
     return {stdout:JSON.stringify(data)};
    }
    assert.ok(!opts.input.includes('COPY '));assert.ok(!opts.input.includes('setval('));assert.match(opts.input,/ROLLBACK;/);
    if(diagnosticFault==='network')throw new BackupFailure('METADATA_NETWORK_FAILED');
    const actual=structuredClone(RESTORE_CONFIG.catalogComponents);actual.application.components.functions='0'.repeat(64);actual.application.sha256='1'.repeat(64);
    return {stdout:COMPONENT_PREFIX+JSON.stringify(actual)+'\n'+(diagnosticFault==='ack'?'':ROLLBACK_MARKER+'\n')};
   }
   assert.ok(['restore-verify','restore-import','restore-sequences','restore-verify-sequences'].includes(step));assert.match(opts.env.PGOPTIONS,['restore-import','restore-sequences'].includes(step)?/read_only=off/:/read_only=on/);
   if(sequencePending&&step==='restore-verify-sequences')throw new BackupFailure('RESTORE_SEQUENCE_STATE_PENDING');
   if(uncertain&&step==='restore-import')throw new BackupFailure('METADATA_NETWORK_FAILED');
   return {stdout:'FARAIOS_T11_RESTORE_VALIDATED\nFARAIOS_T11_SEQUENCES_VALIDATED\n'};
  }
  if(step==='metadata')return {stdout:JSON.stringify(m)};
  const name=step+'.sql';assert.ok(DUMPS.some(([n])=>n===name));let body="SELECT pg_catalog.set_config('search_path', '', false);";
  if(name==='schema.sql')body=m.tables.filter(t=>['public','audit'].includes(t.schema)).map(t=>`ALTER TABLE "${t.schema}"."${t.table}" ENABLE ROW LEVEL SECURITY;`).join('\n');
  if(name==='data.sql'||name==='migration-data.sql')body=m.tables.filter(t=>name==='migration-data.sql'?t.schema==='supabase_migrations':t.schema!=='supabase_migrations').map(t=>`COPY "${t.schema}"."${t.table}" (id) FROM stdin;\n`+Array.from({length:t.rows},(_,i)=>String(i)).join('\n')+(t.rows?'\n':'')+'\\.\n').join('');
  if(name==='roles.sql')body+='\n'+MANAGED_PARAMETER_GRANT;
  if(name==='data.sql')body+=`SELECT pg_catalog.setval('\"auth\".\"refresh_tokens_id_seq\"', 50, true);\n`;
  const banner='-- PostgreSQL database '+(name==='roles.sql'?'cluster ':'')+'dump';return {stdout:banner+'\n'+body+'\n'+banner+' complete\n'};
 };
 const captured=await capture({home,password:'synthetic-private-password',runner});
 const saved={...RESTORE_CONFIG};Object.assign(RESTORE_CONFIG,{captureId:JSON.parse(await readFile(captured.artifact,'utf8')).id,archiveSha256:captured.sha256,importEnabled:true});
 restoring=true;
 try{
  for(const mode of ['preflight','verify','restore']){
   calls.length=0;const report=await restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode});
   assert.equal(report.restore,mode==='preflight'?'NOT_RUN':mode==='verify'?'VERIFIED_READ_ONLY':'COMMITTED');
   assert.deepEqual(calls,mode==='verify'?['restore-verify','restore-verify-sequences']:mode==='preflight'?['restore-preflight']:['restore-preflight','restore-import','restore-sequences']);
   assert.ok(!JSON.stringify(report).includes('synthetic-private-password'));assert.ok(!JSON.stringify(report).includes('COPY'));
  }
  sequencePending=true;await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode:'verify'}),{code:'RESTORE_DATA_VALID_SEQUENCES_UNVERIFIED'});sequencePending=false;
  calls.length=0;uncertain=true;await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner}),{code:'RESTORE_OUTCOME_UNCONFIRMED',causeLabel:'METADATA_NETWORK_FAILED'});assert.deepEqual(calls,['restore-preflight','restore-import']);
  uncertain=false;
  for(const [mode,step,code] of [['preflight','restore-preflight','BACKUP_CANCELLED'],['verify','restore-verify','BACKUP_CANCELLED'],['restore','restore-import','RESTORE_OUTCOME_UNCONFIRMED'],['restore','restore-sequences','RESTORE_SEQUENCE_OUTCOME_UNCONFIRMED']]){controller=new AbortController();cancelAfterStep=step;calls.length=0;await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode,signal:controller.signal}),{code});assert.equal(calls.at(-1),step);}
  cancelAfterStep=null;controller=null;cleanupAfterStep='restore-import';await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner}),{code:'CONTAINER_CLEANUP_FAILED'});
  cleanupAfterStep=null;RESTORE_CONFIG.importEnabled=false;calls.length=0;
  const diagnostic=await restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode:'diagnose'});
  assert.deepEqual(calls,['diagnostic-preflight','diagnostic-schema','diagnostic-postcheck']);
  assert.equal(diagnostic.restore,'NOT_RUN');assert.equal(diagnostic.diagnostic,'ROLLED_BACK');assert.equal(diagnostic.sequenceUnchanged,'PASSED');assert.deepEqual(diagnostic.catalogMismatchComponents,['APPLICATION_FUNCTIONS']);
  assert.ok(!JSON.stringify(diagnostic).includes('synthetic-private-password'));
  for(const [fault,causeLabel] of [['ack','RESTORE_DIAGNOSTIC_ACK_MISSING'],['network','METADATA_NETWORK_FAILED'],['nonempty','RESTORE_DESTINATION_NOT_EMPTY'],['sequence','RESTORE_DIAGNOSTIC_SEQUENCE_CHANGED']]){
   diagnosticFault=fault;await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode:'diagnose'}),{code:'RESTORE_DIAGNOSTIC_OUTCOME_UNCONFIRMED',causeLabel});
  }
  diagnosticFault=null;
  for(const step of ['diagnostic-preflight','diagnostic-schema','diagnostic-postcheck']){controller=new AbortController();cancelAfterStep=step;await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode:'diagnose',signal:controller.signal}),{code:step==='diagnostic-preflight'?'BACKUP_CANCELLED':'RESTORE_DIAGNOSTIC_OUTCOME_UNCONFIRMED'});}
  cancelAfterStep=null;controller=null;cleanupAfterStep='diagnostic-schema';await assert.rejects(restoreArchive({home,archive:captured.artifact,password:'synthetic-private-password',runner,mode:'diagnose'}),{code:'CONTAINER_CLEANUP_FAILED'});
 }finally{Object.assign(RESTORE_CONFIG,saved);}
});
