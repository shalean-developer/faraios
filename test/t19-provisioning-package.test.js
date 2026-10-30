import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PROJECT,PINS,sha,captureSQL,rehearsalPackage} from '../scripts/t19-provisioning-package.mjs';
test('packet pins each exact SQL stage and refuses drift, wrong scope and invalid lifetime',async()=>{
 const now=100000;
 for(const stage of Object.keys(PINS)){
  const sql=await readFile(new URL('../database/t19-custody-'+stage+'.sql',import.meta.url),'utf8');
  const input={projectRef:PROJECT,stage,sql,baselineSha256:'a'.repeat(64),issuedAt:now,expiresAt:now+60000};
  const p=rehearsalPackage(input,now);assert.equal(p.commitAuthorized,false);assert.equal(p.sqlSha256,sha(p.sql));
  assert.match(p.sql,/^ROLLBACK;$/m);assert.doesNotMatch(p.sql,/^commit;$/im);assert.match(p.sql,/T19_BASELINE_CHANGED/);assert.match(p.sql,/T19_PACKET_EXPIRED/);assert.match(p.sql,/pg_stat_ssl/);
  for(const patch of [{projectRef:'other'},{stage:'all'},{stage:['runtime']},{baselineSha256:['a'.repeat(64)]},{sql:sql+'\n'},{baselineSha256:'x'},{issuedAt:now+1},{expiresAt:now},{expiresAt:now+900001}])assert.throws(()=>rehearsalPackage({...input,...patch},now),/PROVISIONING_PACKET_REFUSED/);
 }
});
test('non-TLS/non-managed database refuses the capture without creating operational objects',async()=>{
 const db=new PGlite();try{
  await assert.rejects(db.exec(captureSQL()),/T19_PROVISIONING_IDENTITY_TLS_REFUSED/);await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='t19_runtime_owner'")).rows[0].n,0);
 }finally{await db.close();}
});

test('preparation CLI writes only exclusive private rollback files and refuses unsafe inputs',async t=>{
 const fs=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process');
 if(process.platform!=='linux')return t.skip('Linux private-file preparation only');
 const root=await fs.mkdtemp(join(tmpdir(),'t19-provisioning-packet-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const input=join(root,'input.json'),out=join(root,'packet');await fs.mkdir(out,{mode:0o700});
 const request={version:1,projectRef:PROJECT,stage:'runtime',baselineSha256:'a'.repeat(64),capturedAt:Date.now()};
 const save=()=>fs.writeFile(input,JSON.stringify(request),{mode:0o600});await save();
 const run=()=>spawnSync(process.execPath,['scripts/t19-provisioning-prepare.mjs','--prepare',input,out],{encoding:'utf8'});
 const r=run();assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).sqlExecuted,false);
 const files=await fs.readdir(out);assert.deepEqual(files.sort(),['fresh-after.sql','packet.json','rehearsal.sql']);
 for(const name of files)assert.equal((await fs.stat(join(out,name))).mode&0o777,0o600);
 const before=await fs.readFile(join(out,'rehearsal.sql'));assert.notEqual(run().status,0);assert.deepEqual(await fs.readFile(join(out,'rehearsal.sql')),before);
 await fs.chmod(input,0o644);assert.notEqual(run().status,0);
});
