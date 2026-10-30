import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {hash,verifyPackage} from '../scripts/t19-private-package-verify.mjs';
import {upgradeInactive} from '../scripts/t19-private-upgrade.mjs';
async function fixture(t){
 const root=await fs.mkdtemp(join(tmpdir(),'t19-upgrade-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const privateDir=join(root,'private'),target=join(root,'app'),source=join(privateDir,'source');await fs.mkdir(privateDir,{mode:0o700});
 async function pkg(path,text){await fs.mkdir(path,{mode:0o700});const bytes=Buffer.from(text);await fs.writeFile(join(path,'_custody.cjs'),bytes,{mode:0o600});
 const manifest={version:1,purpose:'inactive-private-custody-source',activationAuthorized:false,phase:'production-dependencies',files:[{path:'_custody.cjs',bytes:bytes.length,sha256:hash(bytes)}]};
 const data=Buffer.from(JSON.stringify(manifest));await fs.writeFile(join(path,'custody-production-manifest.json'),data,{mode:0o600});return hash(data);}
 return {source,target,privateDir,previous:await pkg(target,'// old dummy'),expected:await pkg(source,'// new dummy')};
}
test('inactive upgrade preserves exact old installation and verifies new bytes without activation',async t=>{
 const f=await fixture(t),result=await upgradeInactive(f);assert.equal(result.activationAuthorized,false);assert.equal(result.applicationStarted,false);
 await verifyPackage(f.target,f.expected);await verifyPackage(result.backup,f.previous);
 assert.equal((await fs.stat(result.backup)).mode&0o777,0o700);
 await assert.rejects(upgradeInactive(f));await verifyPackage(result.backup,f.previous);await verifyPackage(f.target,f.expected);
});
test('config collision and changed previous bytes stop before any staging or preservation',async t=>{
 const f=await fixture(t);await fs.writeFile(join(f.privateDir,'custody.json'),'DO_NOT_READ',{mode:0o600});await assert.rejects(upgradeInactive(f));
 await verifyPackage(f.target,f.previous);await fs.rm(join(f.privateDir,'custody.json'));
 await fs.appendFile(join(f.target,'_custody.cjs'),'tamper');await assert.rejects(upgradeInactive(f));
 assert.deepEqual(await fs.readdir(f.privateDir),['source']);
});
test('interruption after old app preservation retains verified backup, stage and durable intent',async t=>{
 const f=await fixture(t),rename=fs.rename;let count=0;
 const mock=t.mock.method(fs,'rename',async(...args)=>{if(++count===2)throw Error('simulated interruption');return rename(...args);});
 await assert.rejects(upgradeInactive(f));mock.mock.restore();
 await assert.rejects(fs.stat(f.target),{code:'ENOENT'});
 await verifyPackage(join(f.privateDir,'rollback-'+f.previous+'-app'),f.previous);
 await verifyPackage(join(f.privateDir,'upgrade-'+f.expected),f.expected);
 assert.equal(JSON.parse(await fs.readFile(join(f.privateDir,'upgrade-'+f.expected+'.intent.json'))).previous,f.previous);
 await assert.rejects(fs.stat(join(f.privateDir,'upgrade-'+f.expected+'.result.json')),{code:'ENOENT'});
 await assert.rejects(upgradeInactive(f));
});
