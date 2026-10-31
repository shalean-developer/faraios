import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir,unlink,chmod,symlink,link,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRotationConfiguration} from '../src/t19-standard-rotation-config.js';
import {createTokenCipher} from '../src/t19-standard-secrets.js';
const linux={skip:process.platform!=='linux'},denied={message:'accounting_rotation_configuration_recovery_required'},ids=[randomUUID(),randomUUID()];
const initial=()=>({version:1,enabled:true,backend:{email:'synthetic@example.invalid',password:'SYNTHETIC-NOT-A-LOGIN',principalId:randomUUID()},zoho:{clientId:'SYNTHETIC-CLIENT',clientSecret:'SYNTHETIC-NOT-A-SECRET',encryptionKey:'ab'.repeat(32),keyId:'synthetic-old'}});
async function setup(t,onStage){const root=await mkdtemp(join(tmpdir(),'t19-config-')),directory=join(root,'rotation-test');await mkdir(directory,{mode:0o700});const settings=initial(),original=JSON.stringify(settings)+'\n';await writeFile(join(root,'staging.json'),original,{mode:0o600});t.after(()=>rm(root,{recursive:true,force:true}));return {root,directory,settings,original,adapter:createRotationConfiguration({root,directory,onStage})};}
const prepare=f=>f.adapter.prepare({businessIds:ids,assertQuiescent:async()=>true});
const activate=(f,options={})=>f.adapter.activate({assertQuiescent:async()=>true,verifyCredentials:async()=>true,...options});
test('configuration prepares privately and forward/rollback preserve every non-key setting',linux,async t=>{
 const f=await setup(t),result=await prepare(f);assert.equal(result.activeConfigurationChanged,false);assert.equal(await readFile(join(f.root,'staging.json'),'utf8'),f.original);
 const keys=await f.adapter.loadKeys();assert.notEqual(keys.fromConfig.keyId,keys.toConfig.keyId);assert.notDeepEqual(keys.fromConfig.key,keys.toConfig.key);keys.fromConfig.key.fill(0);keys.toConfig.key.fill(0);
 for(const file of ['configuration-before.json','configuration-after.json','configuration-plan.json'])assert.equal((await stat(join(f.directory,file))).mode&0o777,0o600);
 const old=structuredClone(f.settings);await activate(f);const next=JSON.parse(await readFile(join(f.root,'staging.json'),'utf8'));next.zoho.encryptionKey=old.zoho.encryptionKey;next.zoho.keyId=old.zoho.keyId;assert.deepEqual(next,old);assert.equal((await f.adapter.status()).active,'after');
 assert.equal((await activate(f)).alreadyTarget,true);await activate(f,{direction:'rollback'});assert.equal(await readFile(join(f.root,'staging.json'),'utf8'),f.original);assert.equal((await f.adapter.status()).active,'before');assert.equal((await stat(join(f.root,'staging.json'))).mode&0o777,0o600);
});
test('maintenance and all-record decryption gates reject without touching active configuration',linux,async t=>{
 const f=await setup(t);await assert.rejects(f.adapter.prepare({businessIds:ids,assertQuiescent:async()=>false}),denied);await prepare(f);
 for(const options of [{assertQuiescent:async()=>false},{verifyCredentials:async()=>false},{direction:'production'}])await assert.rejects(activate(f,options),denied);
 assert.equal(await readFile(join(f.root,'staging.json'),'utf8'),f.original);
});
test('pre-rename interruption and concurrent edits cannot overwrite current settings',linux,async t=>{
 let mode='throw',f;f=await setup(t,async stage=>{if(stage==='beforeRename'){if(mode==='throw')throw Error('synthetic private failure');const altered=initial();await writeFile(join(f.root,'staging.json'),JSON.stringify(altered)+'\n');}});await prepare(f);
 await assert.rejects(activate(f),denied);assert.equal(await readFile(join(f.root,'staging.json'),'utf8'),f.original);mode='edit';await assert.rejects(activate(f),denied);assert.notEqual(await readFile(join(f.root,'staging.json'),'utf8'),f.original);await assert.rejects(f.adapter.status(),denied);
});
test('post-rename interruption reports actual state; recovery is idempotent and rollback remains explicit',linux,async t=>{
 let crash=true;const f=await setup(t,async stage=>{if(stage==='afterRename'&&crash)throw Error('synthetic interruption');});await prepare(f);await assert.rejects(activate(f),denied);assert.equal((await f.adapter.status()).active,'after');crash=false;
 assert.equal((await activate(f)).alreadyTarget,true);await activate(f,{direction:'rollback'});assert.equal((await f.adapter.status()).active,'before');
});
test('candidate tampering, duplicate scope, insecure mode and links fail closed',linux,async t=>{
 const f=await setup(t);await assert.rejects(f.adapter.prepare({businessIds:[ids[0],ids[0]],assertQuiescent:async()=>true}),denied);await prepare(f);await assert.rejects(prepare(f),denied);
 const path=join(f.directory,'configuration-after.json'),bytes=await readFile(path);await chmod(path,0o644);await assert.rejects(f.adapter.loadKeys(),denied);await chmod(path,0o600);
 await link(path,join(f.directory,'hardlink'));await assert.rejects(f.adapter.loadKeys(),denied);await unlink(join(f.directory,'hardlink'));
 await unlink(path);await symlink(join(f.root,'staging.json'),path);await assert.rejects(f.adapter.loadKeys(),denied);await unlink(path);await writeFile(path,bytes,{mode:0o600});
 const changed=JSON.parse(bytes);changed.backend.email='changed@example.invalid';await writeFile(path,JSON.stringify(changed));await assert.rejects(activate(f),denied);assert.equal(await readFile(join(f.root,'staging.json'),'utf8'),f.original);
});
test('real SIGKILL after rename leaves a recoverable lock and complete target bytes',linux,async t=>{
 const f=await setup(t);await prepare(f);const moduleUrl=new URL('../src/t19-standard-rotation-config.js',import.meta.url).href;
 const code=`import {createRotationConfiguration} from ${JSON.stringify(moduleUrl)};const a=createRotationConfiguration({root:${JSON.stringify(f.root)},directory:${JSON.stringify(f.directory)},onStage:async s=>{if(s==='afterRename')process.kill(process.pid,'SIGKILL');}});await a.activate({assertQuiescent:async()=>true,verifyCredentials:async()=>true});`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code],{env:{},encoding:'utf8',timeout:15000,maxBuffer:1024});assert.equal(child.signal,'SIGKILL');assert.equal((await f.adapter.status()).active,'after');await assert.rejects(activate(f),denied);
 const lock=JSON.parse(await readFile(join(f.root,'.rotation-configuration.lock'),'utf8'));assert.equal(typeof lock.pid,'number');assert.equal(child.stdout,'');
 // Test-owned lock removal only after confirming the fixture child exited; no runtime auto-reclaim.
 await unlink(join(f.root,'.rotation-configuration.lock'));assert.equal((await activate(f)).alreadyTarget,true);await activate(f,{direction:'rollback'});
});
test('fresh process reads installed key and decrypts both matching synthetic credentials',linux,async t=>{
 const f=await setup(t);await prepare(f);const keys=await f.adapter.loadKeys(),cipher=createTokenCipher(keys.toConfig);
 const records=ids.map((businessId,i)=>{const c={environment:'staging',businessId,connectionId:randomUUID(),generation:1,organizationId:String(100+i),apiDomain:'https://www.zohoapis.com',clientId:'SYNTHETIC-CLIENT'};return {binding:c,envelope:cipher.seal(c,{refreshToken:'SYNTHETIC-REFRESH',accessToken:'SYNTHETIC-ACCESS',expiresAt:2000000000000})};});
 await writeFile(join(f.directory,'synthetic-records.json'),JSON.stringify(records),{mode:0o600});await activate(f,{verifyCredentials:async({config,businessIds})=>businessIds.length===2&&records.every(r=>createTokenCipher(config).open(r.binding,r.envelope).refreshToken==='SYNTHETIC-REFRESH')});
 const moduleUrl=new URL('../src/t19-standard-secrets.js',import.meta.url).href;
 const code=`import fs from 'node:fs';import {createTokenCipher} from ${JSON.stringify(moduleUrl)};const s=JSON.parse(fs.readFileSync(${JSON.stringify(join(f.root,'staging.json'))},'utf8'));const rows=JSON.parse(fs.readFileSync(${JSON.stringify(join(f.directory,'synthetic-records.json'))},'utf8'));const c=createTokenCipher({key:Buffer.from(s.zoho.encryptionKey,'hex'),keyId:s.zoho.keyId});if(rows.some(r=>c.open(r.binding,r.envelope).refreshToken!=='SYNTHETIC-REFRESH'))process.exit(1);console.log(JSON.stringify({decrypted:rows.length}));`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code],{env:{},encoding:'utf8',timeout:15000,maxBuffer:1024});assert.equal(child.status,0);assert.deepEqual(JSON.parse(child.stdout),{decrypted:2});keys.fromConfig.key.fill(0);keys.toConfig.key.fill(0);
});
test('exclusive cooperative lock prevents another configuration operation from preparing concurrently',linux,async t=>{
 let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const f=await setup(t,async s=>{if(s==='candidatesWritten'){entered();await gate;}});
 const directory=join(f.root,'rotation-second');await mkdir(directory,{mode:0o700});const other=createRotationConfiguration({root:f.root,directory});const first=prepare(f);await started;
 await assert.rejects(other.prepare({businessIds:ids,assertQuiescent:async()=>true}),denied);release();await first;assert.equal(await readFile(join(f.root,'staging.json'),'utf8'),f.original);
});
