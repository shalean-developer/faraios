import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {runtimeReconciliationSQL} from '../scripts/t19-runtime-reconciliation.mjs';
import {runtimeCommitPackage} from '../scripts/t19-runtime-commit-package.mjs';
import {PROJECT} from '../scripts/t19-provisioning-package.mjs';
const source=fs.readFileSync(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8');
const contract=fs.readFileSync(new URL('../test-support/t19-runtime-contract-expected.json',import.meta.url),'utf8');
const issuedAt=Date.now()-3600000;
const full=runtimeCommitPackage({projectRef:PROJECT,stage:'runtime',sql:source,
 baselineSha256:'a'.repeat(64),nonce:'b'.repeat(32),rehearsalEvidenceSha256:'c'.repeat(64),
 issuedAt,expiresAt:issuedAt+900000},contract,issuedAt);
const {sql,postCommitSQL,...packet}=full;
test('expired execution packets remain inspectable but altered bindings are refused',()=>{
 const inspection=runtimeReconciliationSQL(packet,source,contract);
 assert.match(inspection,/READ ONLY/);assert.match(inspection,/'retryAuthorized',false/);
 for(const change of [{executionAuthorized:true},{activationAuthorized:true},{sqlSha256:'d'.repeat(64)},
  {baselineSha256:'d'.repeat(64)},{contractSha256:'d'.repeat(64)},{unexpected:true}])
  assert.throws(()=>runtimeReconciliationSQL({...packet,...change},source,contract));
 for(const candidate of ['',"';DROP SCHEMA public;--",['d'.repeat(64)]])
  assert.throws(()=>runtimeReconciliationSQL(packet,source,contract,candidate));
});
test('owner CLI verifies protected packet bytes and only emits read-only inspection SQL',()=>{
 const dir=fs.mkdtempSync(join(os.tmpdir(),'t19-reconcile-'));fs.chmodSync(dir,0o700);
 const args=[new URL('../scripts/t19-runtime-reconcile-prepare.mjs',import.meta.url).pathname,'--packet',dir];
 try{
  for(const [name,value] of Object.entries({'packet.json':JSON.stringify(packet),'runtime-commit.sql':sql,'post-commit.sql':postCommitSQL}))
   fs.writeFileSync(join(dir,name),value,{mode:0o600});
  const run=()=>spawnSync(process.execPath,args,{encoding:'utf8'});
  let r=run();assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,runtimeReconciliationSQL(packet,source,contract));
  fs.appendFileSync(join(dir,'runtime-commit.sql'),' ');assert.equal(run().status,1);
  fs.writeFileSync(join(dir,'runtime-commit.sql'),sql);fs.chmodSync(join(dir,'packet.json'),0o644);assert.equal(run().status,1);
  fs.chmodSync(join(dir,'packet.json'),0o600);fs.renameSync(join(dir,'packet.json'),join(dir,'saved.json'));
  fs.symlinkSync(join(dir,'saved.json'),join(dir,'packet.json'));assert.equal(run().status,1);
  fs.unlinkSync(join(dir,'packet.json'));
  assert.equal(spawnSync('mkfifo',[join(dir,'packet.json')]).status,0);
  const fifo=spawnSync(process.execPath,args,{encoding:'utf8',timeout:5000});
  assert.equal(fifo.error,undefined);assert.equal(fifo.status,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('reconciliation SQL parses and refuses an ineligible database without mutations',async()=>{
 const db=new PGlite();
 try{
  await assert.rejects(db.exec(runtimeReconciliationSQL(packet,source,contract)),/T19_PROVISIONING_IDENTITY_TLS_REFUSED/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='t19_runtime_owner'")).rows[0].n,0);
 }finally{await db.close();}
});
