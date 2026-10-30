import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {operationalCommitPackage} from '../scripts/t19-operational-commit-package.mjs';
import {sqlEditorCommitPackage,assessEditorReadback,editorPacketFromVerifiedHistory,editorSourceEnvelope} from '../scripts/t19-sql-editor-commit-package.mjs';
import {sha,PROJECT} from '../scripts/t19-provisioning-package.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const stage of ['oauth','api'])test(stage+' editor route preserves exact source bytes and all execution guards',async()=>{
 const now=Date.now(),input={projectRef:PROJECT,stage,sql:read('database/t19-custody-'+stage+'.sql'),
  baselineSha256:'a'.repeat(64),nonce:'b'.repeat(32),rehearsalEvidenceSha256:'c'.repeat(64),issuedAt:now,expiresAt:now+900000};
 const contracts={before:read('test-support/t19-'+(stage==='oauth'?'runtime':'oauth')+'-contract-expected.json'),
  after:read('test-support/t19-'+stage+'-contract-expected.json')};
 const base=operationalCommitPackage(input,contracts,now),packet=sqlEditorCommitPackage(input,contracts,now);
 const {sql:oldSQL,postCommitSQL:oldPost,...binding}=base;
 const next={...input,nonce:'d'.repeat(32),issuedAt:now+1,expiresAt:now+900001};
 const moved=editorPacketFromVerifiedHistory(binding,base.sqlSha256,next,contracts,now+1);
 assert.equal(moved.originalPacketSqlSha256,base.sqlSha256);assert.equal(moved.executionAuthorized,false);
 for(const patch of [{nonce:input.nonce},{baselineSha256:'e'.repeat(64)},
  {rehearsalEvidenceSha256:'f'.repeat(64)},{issuedAt:now}])
  assert.throws(()=>editorPacketFromVerifiedHistory(binding,base.sqlSha256,{...next,...patch},contracts,now+1));
 assert.throws(()=>editorPacketFromVerifiedHistory({...binding,sqlSha256:'a'.repeat(64)},base.sqlSha256,next,contracts,now+1));
 assert.throws(()=>editorPacketFromVerifiedHistory(binding,'a'.repeat(64),next,contracts,now+1));
 assert.equal(packet.baseSqlSha256,sha(base.sql));assert.equal(packet.basePostCommitSha256,sha(base.postCommitSQL));
 const body=input.sql.match(/^begin;\r?\n([\s\S]*)^commit;\s*$/im)[1];
 assert.equal(packet.sourceTransport,'hex-utf8-exact-bytes');
 assert.equal(packet.sql.replace(editorSourceEnvelope(body)+'\n',()=>body).replace(', pg_backend_pid() AS execution_backend_pid',''),base.sql);
 assert.equal(packet.postCommitSQL.replace(', pg_backend_pid() AS verification_backend_pid',''),base.postCommitSQL);
 assert.equal(packet.executionAuthorized,false);assert.equal(packet.activationAuthorized,false);assert.equal(packet.independentBackendRequired,true);
 assert.equal(packet.sqlSha256,sha(packet.sql));assert.equal(packet.postCommitSha256,sha(packet.postCommitSQL));
 assert.throws(()=>sqlEditorCommitPackage({...input,expiresAt:now},contracts,now));
 const db=new PGlite();try{
  await assert.rejects(db.exec(packet.sql),/T19_PROVISIONING_IDENTITY_TLS_REFUSED/);await db.exec('ROLLBACK');
  await assert.rejects(db.exec(packet.postCommitSQL),/T19_PROVISIONING_IDENTITY_TLS_REFUSED/);await db.exec('ROLLBACK');
 }finally{await db.close();}
});
test('CRLF clipboard transport preserves exact multi-statement function source and atomic rollback',async()=>{
 const db=new PGlite();
 const body="CREATE TABLE public.editor_probe(id integer);\nCREATE FUNCTION public.editor_probe() RETURNS text LANGUAGE sql AS $$\nSELECT $value$source $& $` $' é$value$;\n$$;\nINSERT INTO public.editor_probe VALUES(1);\n";
 try{
  await db.exec('BEGIN;'+body);
  const original=(await db.query("SELECT pg_get_functiondef('public.editor_probe()'::regprocedure) AS source")).rows[0].source;
  await db.exec('ROLLBACK');
  await db.exec(('BEGIN;'+body).replaceAll('\n','\r\n'));
  assert.notEqual((await db.query("SELECT pg_get_functiondef('public.editor_probe()'::regprocedure) AS source")).rows[0].source,original);
  await db.exec('ROLLBACK');
  await db.exec(('BEGIN;\n'+editorSourceEnvelope(body)+'\n').replaceAll('\n','\r\n'));
  assert.equal((await db.query("SELECT pg_get_functiondef('public.editor_probe()'::regprocedure) AS source")).rows[0].source,original);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.editor_probe')).rows[0].n,1);
  await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT to_regclass('public.editor_probe') AS object")).rows[0].object,null);
 }finally{await db.close();}
});
test('readback requires exact fingerprints, valid independent backend IDs and never permits replay or activation',()=>{
 const c={candidate_committed_baseline:'a'.repeat(64),execution_backend_pid:123};
 const f={fresh_committed_baseline:'a'.repeat(64),verification_backend_pid:456};
 assert.deepEqual(assessEditorReadback(c,f),{status:'INDEPENDENT_BACKEND_FINGERPRINT_MATCH',activationAuthorized:false,retryAuthorized:false});
 for(const [candidate,fresh] of [[null,f],[c,null],[{...c,execution_backend_pid:0},f],
  [{...c,execution_backend_pid:'123'},f],[c,{...f,verification_backend_pid:123}],
  [c,{...f,verification_backend_pid:0}],[c,{...f,fresh_committed_baseline:'b'.repeat(64)}],
  [{...c,candidate_committed_baseline:'bad'},{...f,fresh_committed_baseline:'bad'}]])
  assert.equal(assessEditorReadback(candidate,fresh).status,'READBACK_REQUIRES_REVIEW');
});
