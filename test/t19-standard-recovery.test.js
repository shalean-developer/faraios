import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp,chmod,rm,readFile,symlink,unlink,link,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syntheticRecoveryFixture,runSyntheticRecoveryRehearsal} from '../scripts/t19-standard-recovery-rehearsal.mjs';
import {createCredentialBackup,restoreCredentialBackup,credentialMaterialDigest,rekeyCredentialSnapshot,assertRecoveryMatchesCurrent} from '../src/t19-standard-recovery.js';
import {writeRecoveryPair,readRecoveryPair} from '../src/t19-standard-recovery-files.js';
const pass='synthetic rehearsal passphrase 123456789';
const denied={message:'accounting_recovery_rejected'},filesDenied={message:'accounting_recovery_files_rejected'};
test('backup restores identical bound tokens; data and escrow expose no plaintext tokens or key',async()=>{
 const {config,records}=syntheticRecoveryFixture(),backup=await createCredentialBackup(records,config,pass),r=await restoreCredentialBackup(backup.data,backup.escrow,pass);
 try{
  assert.equal(credentialMaterialDigest(r.records,r),credentialMaterialDigest(records,config));
  assert.deepEqual(assertRecoveryMatchesCurrent(r,records),{matched:true,count:2});
  const serialized=JSON.stringify(backup);assert.ok(!serialized.includes(config.key.toString('hex')));assert.ok(!serialized.includes('SYNTHETIC-REFRESH-'));assert.ok(!serialized.includes('SYNTHETIC-ACCESS-'));
 }finally{r.key.fill(0);config.key.fill(0);}
});
test('wrong passphrase, swapped escrow, manifest and ciphertext mutations fail closed and redact errors',async()=>{
 const {config,records}=syntheticRecoveryFixture(),b=await createCredentialBackup(records,config,pass),other=await createCredentialBackup(records,config,pass);
 await assert.rejects(restoreCredentialBackup(b.data,b.escrow,pass+'wrong'),denied);
 await assert.rejects(restoreCredentialBackup(b.data,other.escrow,pass),denied);
 for(const mutate of [d=>d.records[0].businessId=records[1].businessId,d=>d.records[0].organizationId='999',d=>d.records[0].generation++,d=>d.records[0].clientId='OTHER',d=>d.records[0].environment='production',d=>d.records[0].status='revocation_pending',d=>d.createdAt='2026-01-01T00:00:00.000Z',d=>d.records[0].envelope.body='AAAA']){
  const d=structuredClone(b.data);mutate(d);await assert.rejects(restoreCredentialBackup(d,b.escrow,pass),denied);
 }
 config.key.fill(0);
});
test('snapshot cannot replace refreshed/reconnected/revoked current state',async()=>{
 const {config,records}=syntheticRecoveryFixture(),b=await createCredentialBackup(records,config,pass),r=await restoreCredentialBackup(b.data,b.escrow,pass);
 for(const mutate of [c=>c.generation++,c=>c.status='revocation_pending',c=>c.envelope.body='AAAA']){const current=structuredClone(records);mutate(current[0]);assert.throws(()=>assertRecoveryMatchesCurrent(r,current),denied);}
 r.key.fill(0);config.key.fill(0);
});
test('shadow rotation preserves bindings, pending revocation, disconnected state and material; old key denied',()=>{
 const {config,records}=syntheticRecoveryFixture(),next={key:randomBytes(32),keyId:'next'};records[0].status='revocation_pending';
 const offline=structuredClone(records[1]);offline.businessId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';offline.connectionId='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';offline.organizationId='30003';offline.status='disconnected';offline.envelope=null;records.push(offline);
 const before=JSON.stringify(records),rotated=rekeyCredentialSnapshot(records,config,next);
 assert.equal(credentialMaterialDigest(rotated,next),credentialMaterialDigest(records,config));assert.equal(JSON.stringify(records),before);
 assert.equal(rotated.find(c=>c.businessId===offline.businessId).envelope,null);assert.equal(rotated.find(c=>c.businessId===records[0].businessId).status,'revocation_pending');
 assert.throws(()=>credentialMaterialDigest(rotated,config),denied);assert.throws(()=>rekeyCredentialSnapshot(records,config,config),denied);
 config.key.fill(0);next.key.fill(0);
});
test('duplicate business/organisation, cross-binding ciphertext, malformed material and production rejected',async()=>{
 const {config,records}=syntheticRecoveryFixture();
 for(const mutate of [r=>r[1].businessId=r[0].businessId,r=>r[1].organizationId=r[0].organizationId,r=>r[1].envelope=r[0].envelope,r=>r[0].environment='production',r=>r[0].envelope.keyId='wrong']){
  const rows=structuredClone(records);mutate(rows);await assert.rejects(createCredentialBackup(rows,config,pass),denied);
 }
 config.key.fill(0);
});
test('owner-only files reject overwrite, shared directories, symlinks, hardlinks and insecure modes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'t19-recovery-test-')),data=join(root,'data'),escrow=join(root,'escrow');
 const {mkdir}=await import('node:fs/promises');await mkdir(data,{mode:0o700});await mkdir(escrow,{mode:0o700});
 const {config,records}=syntheticRecoveryFixture(),b=await createCredentialBackup(records,config,pass);
 try{
  await assert.rejects(writeRecoveryPair(data,data,b),filesDenied);await writeRecoveryPair(data,escrow,b);
  assert.deepEqual(await readRecoveryPair(data,escrow),b);assert.equal((await stat(join(data,'credentials.json'))).mode&0o777,0o600);
  await assert.rejects(writeRecoveryPair(data,escrow,b),filesDenied);
  await chmod(data,0o755);await assert.rejects(readRecoveryPair(data,escrow),filesDenied);await chmod(data,0o700);
  const path=join(data,'credentials.json'),saved=await readFile(path);await unlink(path);await symlink(join(escrow,'key-escrow.json'),path);await assert.rejects(readRecoveryPair(data,escrow),filesDenied);await unlink(path);
  await writeFile(path,saved,{mode:0o600});await link(path,join(root,'hardlink'));await assert.rejects(readRecoveryPair(data,escrow),filesDenied);await unlink(join(root,'hardlink'));
  await chmod(path,0o644);await assert.rejects(readRecoveryPair(data,escrow),filesDenied);await chmod(path,0o600);
  await writeFile(path,'x'.repeat(1048577));await assert.rejects(readRecoveryPair(data,escrow),filesDenied);
 }finally{config.key.fill(0);await rm(root,{recursive:true,force:true});}
});
test('fresh process recovers two synthetic businesses and shadow rotates without active writes',async()=>{
 assert.deepEqual(await runSyntheticRecoveryRehearsal(),{syntheticOnly:true,freshProcessRestore:true,connections:2,shadowRotation:true,oldKeyDenied:true,activeWrites:0});
});
