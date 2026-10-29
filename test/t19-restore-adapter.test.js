import test from 'node:test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonical} from '../scripts/t19-bootstrap-engine.mjs';
import {RESTORE_SCOPE,RESTORE_PHASES,dataMember,schemaMember,runRestore,catalogSQL,fullManagedGate,namespaceGate,publicationGate,REALTIME_OWNER_GUARD,RESTORE_GUARD_CODES} from '../scripts/t19-restore-plan.mjs';
import {validateRestoreApproval,sourceAdmissionSQL,RestoreHost,restoreProcess,restoreSQLStates} from '../scripts/t19-restore-host.mjs';
import {readFile} from 'node:fs/promises';
test('data replay is COPY-only with opaque escaped rows, bounded table and member scope',()=>{
 const m={tables:[{schema:'public',table:'sample',rows:2},{schema:'supabase_migrations',table:'schema_migrations',rows:0}]};
 const sql=`SET session_replication_role = replica;\nCOPY "public"."sample" ("value") FROM stdin;\nCOMMIT; SELECT dangerous();\n\\\\.\n\\.\nRESET ALL;\n`;
 const result=dataMember(sql,m,'data.sql');assert.ok(result.includes('COMMIT; SELECT dangerous();'));assert.ok(!result.includes('SET session_replication_role'));
 for(const bad of ['COMMIT;','\\connect host','COPY "public"."sample" ("value") FROM PROGRAM \'x\';','SELECT dangerous();','SET ROLE supabase_admin;','INSERT INTO public.sample VALUES(1);'])assert.throws(()=>dataMember(bad,m,'data.sql'));
 assert.throws(()=>dataMember('COPY "public"."sample" ("value") FROM stdin;\n\\.\n',m,'data.sql'),/ROW_COUNT/);
 assert.throws(()=>dataMember('COPY "public"."sample" ("value") FROM stdin;\na\nb\n',m,'data.sql'),/UNTERMINATED/);
 assert.throws(()=>dataMember(sql,m,'migration-data.sql'),/MEMBER/);
 assert.throws(()=>dataMember('COPY "storage"."migrations" ("id") FROM stdin;\n\\.\n',{tables:[{schema:'storage',table:'migrations',rows:0}]},'data.sql'),/SCOPE/);
});
test('schema transform preserves function bodies and refuses privileged top-level statements',()=>{
 const sql=`SET statement_timeout = 0;\nCREATE FUNCTION public.sample() RETURNS text LANGUAGE sql AS $fn$ SELECT 'RESET ALL; COMMIT;'; $fn$;\nRESET ALL;\n`;
 const result=schemaMember(sql,'schema');assert.ok(result.includes("$fn$ SELECT 'RESET ALL; COMMIT;'; $fn$"));assert.ok(!result.includes('SET statement_timeout = 0;'));assert.ok(result.includes("statement_timeout='120s'"));
 assert.doesNotThrow(()=>schemaMember('CREATE TABLE public.roles(role text); ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;','schema'));
 for(const sql of ['CREATE DATABASE other;','CREATE ROLE elevated SUPERUSER;','ALTER SYSTEM SET x=1;','CREATE EXTENSION IF NOT EXISTS dblink;','CREATE FUNCTION public.bad() RETURNS void AS \'lib\',\'fn\' LANGUAGE c;','COMMIT;','\\! x'])assert.throws(()=>schemaMember(sql,'schema'));
 assert.throws(()=>schemaMember('CREATE ROLE elevated SUPERUSER;','roles'));
 assert.throws(()=>schemaMember('ALTER ROLE postgres SUPERUSER;','roles'));
 assert.doesNotThrow(()=>schemaMember('ALTER ROLE postgres SET statement_timeout TO 60000;','roles'));
});
test('restore source capture is explicitly read only and carries current scope and custody admission',async()=>{
 const sql=await sourceAdmissionSQL();assert.equal((sql.match(/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;/g)||[]).length,1);assert.ok(sql.indexOf('RESTORE_SOURCE_IDENTITY')>sql.indexOf('BEGIN TRANSACTION'));
 for(const name of ['checkpointCatalog','custodyDefinition','custodyReadback','sourceState'])assert.ok(sql.includes("'"+name+"'"));
 assert.equal((sql.match(/^COMMIT;/gm)||[]).length,1);
 const projection=catalogSQL(await readFile(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8'));assert.ok(projection.includes("r.rolname<>'t19_hosted_custody'"));
});
test('bootstrap approvals, hosted destination bindings, expired and unsigned requests cannot authorize restore',()=>{
 const {publicKey}=generateKeyPairSync('ed25519');
 for(const scope of ['t19-synthetic-managed-bootstrap-v1',RESTORE_SCOPE]){
  const receipt={scope,version:1,nonce:'0'.repeat(32),issuedAt:0,expiresAt:900000,context:'default'};
  assert.throws(()=>validateRestoreApproval({receipt,ownerSignature:'x'},{context:'default'},publicKey,1));
  assert.throws(()=>validateRestoreApproval({receipt,ownerSignature:'x'},{context:'hosted'},publicKey,1));
  assert.throws(()=>validateRestoreApproval({receipt,ownerSignature:'x'},{context:'default'},publicKey,900000));
 }
});
function fake({fail,unknown=false,cleanup=true,journalFail=false}={}){
 const calls=[];const p={calls,preflight:async()=>calls.push('preflight'),record:async(kind,value)=>{calls.push(kind);if(journalFail&&kind==='restore-result')throw Error('disk');},cleanup:async()=>{calls.push('cleanup');return cleanup;}};
 for(const phase of RESTORE_PHASES)p[phase]=async()=>{calls.push(phase);if(phase===fail)throw Error(unknown?'OUTCOME_UNKNOWN':'PHASE_REFUSED');};return p;
}
test('full restore phases require independent committed/data/sequence/boundary gates and cleanup',async()=>{
 const p=fake(),r=await runRestore(p);assert.equal(r.status,'CURRENT_SCOPE_RESTORE_PASS');assert.deepEqual(r.stages,RESTORE_PHASES);assert.ok(p.calls.indexOf('stopServices')<p.calls.indexOf('replay'));assert.ok(p.calls.indexOf('verifyCommitted')<p.calls.indexOf('sequences'));assert.ok(p.calls.indexOf('verifyFresh')<p.calls.indexOf('custody'));assert.equal(r.operationalCustodyInstalled,false);
});
test('every failing phase stops progression without retry and cannot be rescued by cleanup',async()=>{
 for(const phase of RESTORE_PHASES){const p=fake({fail:phase});const r=await runRestore(p);assert.equal(r.status,'FAIL');assert.equal(p.calls.filter(x=>x===phase).length,1);assert.deepEqual(r.stages,RESTORE_PHASES.slice(0,RESTORE_PHASES.indexOf(phase)));assert.ok(p.calls.includes('cleanup'));}
 assert.equal((await runRestore(fake({cleanup:false}))).status,'QUARANTINE');assert.equal((await runRestore(fake({journalFail:true}))).status,'QUARANTINE');
 const p=fake();let t=0;const r=await runRestore(p,{now:()=>t++?900001:0});assert.equal(r.reason,'RESTORE_DEADLINE');assert.ok(!p.calls.includes('isolation'));
});
test('recovery command failures never journal SQL errors or recovered row data',async()=>{
 const records=[];const host={restoreActive:true,unknown:false,started:Date.now(),restoreRun:async()=>({code:1,stdout:Buffer.alloc(0),stderr:Buffer.from('private-recovered-row password credential')}),record:async(kind,value)=>records.push({kind,value})};
 await assert.rejects(RestoreHost.prototype.command.call(host,['container','exec','candidate','psql']),/RESTORE_SQL_FAILED/);assert.ok(!JSON.stringify(records).includes('private'));assert.deepEqual(records,[{kind:'restore-command-failure',value:{code:1,sqlstates:[],inputClosed:false}}]);
});
test('distinct signed restore receipt binds every input and rejects replay-context changes',()=>{
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 const bindings={context:'default',archiveSha256:'a'.repeat(64),journalPath:'/root/new-private-run'};
 const receipt={scope:RESTORE_SCOPE,version:1,nonce:'1'.repeat(32),issuedAt:100,expiresAt:900100,...bindings};
 const approval={receipt,ownerSignature:sign(null,Buffer.from(canonical(receipt)),privateKey).toString('base64')};
 assert.deepEqual(validateRestoreApproval(approval,bindings,publicKey,101),receipt);
 assert.throws(()=>validateRestoreApproval(approval,{...bindings,journalPath:'/root/another-run'},publicKey,101));
 assert.throws(()=>validateRestoreApproval(approval,{...bindings,archiveSha256:'b'.repeat(64)},publicKey,101));
 assert.throws(()=>validateRestoreApproval({...approval,receipt:{...receipt,scope:'t19-synthetic-managed-bootstrap-v1'}},bindings,publicKey,101));
 const wrong=generateKeyPairSync('ed25519');assert.throws(()=>validateRestoreApproval(approval,bindings,wrong.publicKey,101));
});
test('authenticated synthetic checkpoint plan binds members, rows, source date and sequence state',async()=>{
 const {restorePlanFixture}=await import('./t19-restore-plan-fixture.js');
 const {planRestore}=await import('../scripts/t19-restore-plan.mjs');
 const {sealBackup,openBackup}=await import('../scripts/backup-staging.mjs');
 const {randomBytes}=await import('node:crypto');
 const {digest}=await import('../scripts/t19-bootstrap-engine.mjs');
 const portable=await readFile(new URL('../scripts/restore-catalog.sql',import.meta.url),'utf8');
 const fixture=restorePlanFixture();
 // Native dump completeness markers are normally inserted by pg_dump.
 for(const f of fixture.backup.payload.files){if(f.name==='manifest.json')continue;const start='-- PostgreSQL database '+(f.name==='roles.sql'?'cluster ':'')+'dump';f.content=start+'\n'+f.content+'\n'+start+' complete\n';f.sha256=digest(f.content);}
 const key=randomBytes(32),ciphertext=sealBackup(fixture.backup.payload,key,'0'.repeat(32));
 const authenticated=openBackup(ciphertext,key,fixture.scope);
 const plan=planRestore(authenticated,fixture.scope,portable);
 assert.equal(plan.summary.applicationTables,30);assert.equal(plan.summary.managedSchemaReplay,false);assert.equal(plan.states[0].value,'50');assert.ok(!plan.replay.includes("SELECT pg_catalog.setval("));assert.ok(plan.sequenceSQL.includes("SELECT pg_catalog.setval("));assert.ok(plan.replay.indexOf('RESTORE_CATALOG_MISMATCH')<plan.replay.indexOf('COPY '));
 const bad=structuredClone(authenticated);bad.payload.files.find(f=>f.name==='data.sql').content+='COMMIT;';assert.throws(()=>planRestore(bad,fixture.scope,portable),/MEMBER_BINDING/);
 const changed=restorePlanFixture();const mf=changed.backup.payload.files.find(f=>f.name==='manifest.json');const m=JSON.parse(mf.content);m.started='2026-10-20T18:13:08.484Z';mf.content=JSON.stringify(m);mf.sha256=digest(mf.content);assert.throws(()=>planRestore(changed.backup,changed.scope,portable),/CANDIDATE_ONE/);
});
test('recovered SQL uses candidate-local logging suppression before actor drop and input',async()=>{
 let observed;const host={bound:new Map([['postgres',{}]]),exec:async(b,args,stdin)=>{observed={args,stdin};return '';}};
 await RestoreHost.prototype.restoreSQL.call(host,'SELECT synthetic_private_value;');
 assert.ok(observed.args.includes('--username=supabase_admin'));assert.ok(observed.args.includes('--set=VERBOSITY=sqlstate'));
 assert.ok(observed.stdin.indexOf('SET log_min_error_statement=panic')<observed.stdin.indexOf('SET SESSION AUTHORIZATION postgres'));
 assert.ok(observed.stdin.indexOf("SET pgaudit.log='none'")<observed.stdin.indexOf('SELECT synthetic_private_value'));
 await assert.rejects(RestoreHost.prototype.restoreSQL.call(host,'SELECT 1;','service_role'),/PRINCIPAL/);
});
test('recovered RLS query aliases remain intact while managed DDL targets are refused',()=>{
 const policy="CREATE POLICY scoped_read ON public.connections FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.business_memberships m WHERE m.business_id=connections.business_id AND m.user_id=auth.uid()));";
 assert.equal(schemaMember(policy,'schema').trim(),policy);
 for(const sql of ['ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;','CREATE TABLE storage.new_table(id int);','GRANT SELECT ON TABLE auth.users TO authenticated;','CREATE SCHEMA net;'])assert.throws(()=>schemaMember(sql,'schema'),/NAMESPACE/);
});
test('existing application foundation DDL and policy joins fit the bounded schema classifier',async()=>{
 for(const file of ['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','invoices-draft.sql']){
  // These repository development drafts have wrappers; native pg_dump members
  // do not. Strip only those wrappers in this source-compatibility fixture.
  const sql=(await readFile(new URL('../database/'+file,import.meta.url),'utf8')).replace(/^begin;\s*$/gmi,'').replace(/^commit;\s*$/gmi,'');
  assert.doesNotThrow(()=>schemaMember(sql,'schema'),file);
 }
});

test('full managed equality precedes data and namespace drift is fenced',async()=>{
 const sql=await readFile(new URL('../scripts/t19-bootstrap-catalog.sql',import.meta.url),'utf8');
 const expected=Object.fromEntries(Array.from({length:12},(_,i)=>['key'+i,null]));
 const gate=fullManagedGate(expected,sql);
 assert.ok(gate.includes("q.jsonb_build_object->'catalog'"));
 assert.ok(gate.includes('IS DISTINCT FROM'));
 assert.ok(!gate.includes('BEGIN TRANSACTION'));
 assert.ok(namespaceGate(['public']).includes('RESTORE_UNEXPECTED_NAMESPACE'));
 for(const statement of ['CREATE AGGREGATE public.bad(int) (sfunc=int4pl,stype=int);','GRANT postgres TO authenticated;','GRANT CONNECT ON DATABASE postgres TO authenticated;'])assert.throws(()=>schemaMember(statement,'schema'));
});

test('only exact platform ownership becomes an owner assertion; publication changes remain refused',async()=>{
 assert.equal(schemaMember('ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";','schema'),REALTIME_OWNER_GUARD);
 for(const sql of ['CREATE PUBLICATION supabase_realtime;','ALTER PUBLICATION another OWNER TO postgres;','ALTER PUBLICATION supabase_realtime OWNER TO authenticated;','ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;'])assert.throws(()=>schemaMember(sql,'schema'));
 assert.throws(()=>publicationGate(undefined),/CAPTURE_REQUIRED/);assert.throws(()=>publicationGate([]),/CAPTURE_REQUIRED/);
 assert.ok(publicationGate([{name:'supabase_realtime',owner:'postgres'}]).includes('IS DISTINCT FROM'));
 assert.ok((await sourceAdmissionSQL()).includes("'restorePublications'"));
});

test('restore-only transport drains a nonzero early exit after EPIPE, never accepts truncated success',async()=>{
 const early=code=>(binary,args,options)=>spawn(process.execPath,['-e',"process.stderr.write('ERROR:  42501\\nPRIVATE_CONTENT\\n');process.exit("+code+")"],options);
 const input='-- synthetic padding\n'.repeat(500000);
 const r=await restoreProcess('/unused',{spawnProcess:early(3)})(['container','exec'],{stdin:input,timeoutMs:5000});
 assert.equal(r.code,3);assert.equal(r.inputClosed,true);assert.deepEqual(restoreSQLStates(r.stderr),['42501']);
 await assert.rejects(restoreProcess('/unused',{spawnProcess:early(0)})(['container','exec'],{stdin:input,timeoutMs:5000}),e=>e.unknown===true);
 const wait=(binary,args,options)=>spawn(process.execPath,['-e','setInterval(()=>{},1000)'],options);
 await assert.rejects(restoreProcess('/unused',{spawnProcess:wait})(['container','exec'],{timeoutMs:50}),e=>e.unknown===true);
 const overflow=(binary,args,options)=>spawn(process.execPath,['-e',"process.stdout.write('x'.repeat(10000));setInterval(()=>{},1000)"],options);
 await assert.rejects(restoreProcess('/unused',{spawnProcess:overflow})(['container','exec'],{maxBytes:128,timeoutMs:5000}),e=>e.unknown===true);
 assert.deepEqual(restoreSQLStates('ERROR:  private details\nCONTEXT: 42501\nERROR:  22012\n'),['22012']);
});
test('restore SQL failures journal only exit status, input state and SQLSTATE',async()=>{
 const records=[];
 const host=new RestoreHost({run:async()=>({code:3,stderr:Buffer.from('ERROR:  42501\nPRIVATE_CONTENT\n'),inputClosed:true}),receipt:{nonce:'a'.repeat(32)},dir:'/unused'});
 host.restoreActive=true;host.record=async(kind,value)=>records.push({kind,value});
 await assert.rejects(host.command(['container','exec']),/RESTORE_SQL_FAILED/);
 assert.equal(host.unknown,false);assert.deepEqual(records,[{kind:'restore-command-failure',value:{code:3,sqlstates:['42501'],inputClosed:true}}]);assert.ok(!JSON.stringify(records).includes('PRIVATE_CONTENT'));
});

test('fixed restore guard SQLSTATEs identify failure without exposing error text or changing archive bodies',async()=>{
 assert.equal(new Set(Object.keys(RESTORE_GUARD_CODES)).size,13);
 assert.ok(Object.keys(RESTORE_GUARD_CODES).every(code=>/^P19[0-9]{2}$/.test(code)));
 assert.ok(REALTIME_OWNER_GUARD.includes("ERRCODE='P1903'"));
 const records=[];const host=new RestoreHost({run:async()=>({code:3,stderr:Buffer.from('ERROR:  P1903\nPRIVATE_MESSAGE\n')}),receipt:{nonce:'b'.repeat(32)},dir:'/unused'});
 host.restoreActive=true;host.record=async(kind,value)=>records.push({kind,value});
 await assert.rejects(host.command(['container','exec']),/RESTORE_PUBLICATION_OWNER_MISMATCH/);
 assert.equal(records[0].value.guard,'RESTORE_PUBLICATION_OWNER_MISMATCH');assert.ok(!JSON.stringify(records).includes('PRIVATE_MESSAGE'));
 const body="CREATE FUNCTION public.fixture() RETURNS void LANGUAGE plpgsql AS $body$ BEGIN RAISE EXCEPTION 'RESTORE_DATA_MISMATCH'; END $body$;";
 assert.ok(schemaMember(body,'schema').includes("RAISE EXCEPTION 'RESTORE_DATA_MISMATCH';"));
});

test('publication owner qualification stops before namespace or checkpoint replay work',async()=>{
 const host={restoreSQL:async sql=>{assert.ok(sql.includes("ERRCODE='P1903'"));assert.ok(sql.startsWith('BEGIN READ ONLY;'));throw Error('RESTORE_PUBLICATION_OWNER_MISMATCH');},sqlJSON:async()=>{throw Error('UNEXPECTED_LATER_WORK');}};
 await assert.rejects(RestoreHost.prototype.destinationEmpty.call(host),/RESTORE_PUBLICATION_OWNER_MISMATCH/);
});
