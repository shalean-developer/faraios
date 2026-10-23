import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openVault} from '../src/t19-vault.js';
const repositoryRoot=fileURLToPath(new URL('..',import.meta.url));
const parent=join(process.env.LOCALAPPDATA??'', 'FaraiOS','T19-vault-tests');
async function fixture(t){await mkdir(parent,{recursive:true});const directory=await mkdtemp(join(parent,'synthetic-'));t.after(async()=>{const r=relative(resolve(parent),resolve(directory));if(!r||r.startsWith('..')||isAbsolute(r))throw new Error('Unsafe test cleanup');await rm(directory,{recursive:true,force:true});});return directory;}
const windows={skip:process.platform!=='win32'};
test('real CurrentUser DPAPI stores only ciphertext, survives restart and returns isolated snapshots',windows,async t=>{
 const directory=await fixture(t),value={connections:{a:{generation:1,secret:'dummy-not-a-provider-credential'}}};
 let vault=await openVault({directory,repositoryRoot});assert.deepEqual(await vault.read(),{connections:{}});
 await vault.write(value);const bytes=await readFile(join(directory,'vault.dpapi'));assert.equal(bytes.includes(Buffer.from(value.connections.a.secret)),false);assert.equal(bytes.includes(Buffer.from('connections')),false);
 const copy=await vault.read();copy.connections.a.generation=900;assert.equal((await vault.read()).connections.a.generation,1);
 await vault.close();vault=await openVault({directory,repositoryRoot});assert.deepEqual(await vault.read(),value);
 await vault.write({connections:{a:{generation:2,status:'disabled'}}});await vault.close();
 vault=await openVault({directory,repositoryRoot});assert.equal((await vault.read()).connections.a.status,'disabled');assert.equal((await vault.read()).connections.a.secret,undefined);await vault.close();await assert.rejects(vault.read(),/store unavailable/);
});
test('exclusive writer blocks another process instance and serialized writes persist last generation',windows,async t=>{
 const directory=await fixture(t),vault=await openVault({directory,repositoryRoot});
 await assert.rejects(openVault({directory,repositoryRoot}),/store unavailable/);
 await Promise.all([vault.write({connections:{a:{generation:1}}}),vault.write({connections:{a:{generation:2}}})]);
 assert.equal((await vault.read()).connections.a.generation,2);await vault.close();
 const next=await openVault({directory,repositoryRoot});await next.close();
});
test('corrupted ciphertext fails closed and does not reset registry or leak content',windows,async t=>{
 const directory=await fixture(t);let vault=await openVault({directory,repositoryRoot});await vault.write({connections:{}});await vault.close();
 const file=join(directory,'vault.dpapi'),bad=Buffer.from('sensitive-looking-dummy-invalid');await writeFile(file,bad);
 await assert.rejects(openVault({directory,repositoryRoot}),e=>e.message==='TEST credential store unavailable');assert.deepEqual(await readFile(file),bad);
});
test('repository paths, non-local paths and junctions are rejected',windows,async t=>{
 await assert.rejects(openVault({directory:repositoryRoot,repositoryRoot}),/store unavailable/);
 await assert.rejects(openVault({directory:'C:\\not-local-app-data',repositoryRoot}),/store unavailable/);
 const directory=await fixture(t),target=await fixture(t),junction=join(directory,'link');await symlink(target,junction,'junction');
 await assert.rejects(openVault({directory:join(junction,'child'),repositoryRoot}),/store unavailable/);
});
test('protection failure leaves no plaintext and poisons writes',windows,async t=>{
 const directory=await fixture(t),vault=await openVault({directory,repositoryRoot,protect:async()=>{throw new Error('dummy-secret-do-not-log');},unprotect:async x=>x});
 await assert.rejects(vault.write({connections:{a:{secret:'dummy-secret'}}}),e=>!e.message.includes('dummy'));
 await assert.rejects(vault.write({connections:{}}),/store unavailable/);await vault.close();
 await assert.rejects(readFile(join(directory,'vault.dpapi')),e=>e.code==='ENOENT');
});
