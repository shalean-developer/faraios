import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm,writeFile,rename,symlink,mkdir,chmod,link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CURRENT_SCOPE,installProfile} from './backup-profile-fixture.js';
import {validateScope} from '../scripts/backup-scope.mjs';
import {SOURCE,loadCurrentProfile,capture,run,windowsEnvironment} from '../scripts/backup-staging.mjs';

async function fixture(t,install=true){
 const home=await realpath(await mkdtemp(join(tmpdir(),'t11-profile-test-')));
 t.after(()=>rm(home,{recursive:true,force:true}));
 if(install)await installProfile(home);
 return {home,root:join(home,'.faraios-backup-profile'),file:join(home,'.faraios-backup-profile','current.json')};
}

test('profile contract rejects unknown versions, source, fields, unsorted/duplicate names and invalid hashes',()=>{
 const valid=validateScope(CURRENT_SCOPE,SOURCE);assert.ok(Object.isFrozen(valid.tables));
 for(const mutate of [p=>p.version=2,p=>p.source='other',p=>p.id="bad'",p=>p.tables.reverse(),p=>p.tables.push(p.tables[0]),p=>p.tables=['public.only'],p=>p.catalog='bad',p=>p.extra=true,p=>p.tables[0]='vault.secrets']){
  const p=structuredClone(CURRENT_SCOPE);mutate(p);assert.throws(()=>validateScope(p,SOURCE));
 }
});

test('missing or malformed private profile refuses capture before any child process/export',async t=>{
 const {home,file}=await fixture(t,false);let calls=0;
 const runner=async()=>{calls++;throw new Error('CHILD_MUST_NOT_RUN');};
 await assert.rejects(capture({home,password:'synthetic',runner}),{code:'PRIVATE_PROFILE_MISSING'});assert.equal(calls,0);
 await installProfile(home);await writeFile(file,'{}');
 // Real ACL checks are allowed, but no Docker/database child may start.
 await assert.rejects(capture({home,password:'synthetic',runner:async(c,a,o)=>{if(c==='docker'){calls++;throw new Error('NO_EXPORT');}return run(c,a,o);}}),{code:'PRIVATE_PROFILE_UNSAFE_OR_INVALID'});
 assert.equal(calls,0);
});

test('profile loader freezes reviewed values and detects edits and identical-content replacement',async t=>{
 const {home,file}=await fixture(t);const loaded=await loadCurrentProfile(home);assert.deepEqual(loaded.scope,CURRENT_SCOPE);await loaded.check();
 await writeFile(file,JSON.stringify({...CURRENT_SCOPE,catalog:'4'.repeat(64)}));
 await assert.rejects(loaded.check(),{code:'PRIVATE_PROFILE_CHANGED'});
 const second=await loadCurrentProfile(home);await rename(file,file+'.old');
 await writeFile(file,JSON.stringify({...CURRENT_SCOPE,catalog:'4'.repeat(64)}),{mode:0o600});
 await assert.rejects(second.check(),{code:'PRIVATE_PROFILE_CHANGED'});
});

test('profile loader rejects linked root and Git ancestors',async t=>{
 const {home,root}=await fixture(t);await rename(root,root+'.old');await symlink(root+'.old',root,process.platform==='win32'?'junction':'dir');
 await assert.rejects(loadCurrentProfile(home),{code:'PRIVATE_PROFILE_UNSAFE_OR_INVALID'});
 const other=await fixture(t);await mkdir(join(other.home,'.git'));
 await assert.rejects(loadCurrentProfile(other.home),{code:'PRIVATE_PROFILE_UNSAFE_OR_INVALID'});
});

test('unsafe profile permissions are rejected without repair',async t=>{
 const {home,file}=await fixture(t);
 if(process.platform==='win32'){
  const script="$a=[System.IO.File]::GetAccessControl($env:T11_TEST_PROFILE); $sid=[System.Security.Principal.SecurityIdentifier]::new('S-1-1-0'); $r=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::Read,[System.Security.AccessControl.AccessControlType]::Allow); $a.AddAccessRule($r); [System.IO.File]::SetAccessControl($env:T11_TEST_PROFILE,$a)";
  await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{env:windowsEnvironment({T11_TEST_PROFILE:file})});
 }else await chmod(file,0o644);
 await assert.rejects(loadCurrentProfile(home),{code:'PRIVATE_PROFILE_UNSAFE_OR_INVALID'});
 await assert.rejects(loadCurrentProfile(home),{code:'PRIVATE_PROFILE_UNSAFE_OR_INVALID'});
});


test('profile hard links are refused before reading profile contents',async t=>{
 const {home,file}=await fixture(t);await link(file,file+'.link');
 await assert.rejects(loadCurrentProfile(home),{code:'PRIVATE_PROFILE_UNSAFE_OR_INVALID'});
});
