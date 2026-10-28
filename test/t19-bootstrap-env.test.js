import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,lstat,readdir,rm,chmod,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {encodeEnvironment,withEnvironmentFile,environmentFilesAbsent} from '../scripts/t19-bootstrap-env.mjs';
const child=promisify(execFile);
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'t19-env-test-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('a spawned client reopens the private regular file without stdin or argv credentials',async()=>fixture(async dir=>{
 let saved;
 await withEnvironmentFile(dir,{OPAQUE_VALUE:'synthetic-only',EMPTY:''},async path=>{
  saved=path;const s=await lstat(path),parent=await lstat(join(path,'..'));assert.ok(s.isFile());assert.equal(s.mode&0o777,0o600);assert.equal(parent.mode&0o777,0o700);
  const {stdout}=await child(process.execPath,['-e',"const fs=require('fs');const x=fs.readFileSync(process.argv[1],'utf8');console.log(JSON.stringify({regular:fs.statSync(process.argv[1]).isFile(),content:x}));",path]);
  assert.deepEqual(JSON.parse(stdout),{regular:true,content:'OPAQUE_VALUE=synthetic-only\nEMPTY=\n'});
 });
 await assert.rejects(lstat(saved),{code:'ENOENT'});assert.deepEqual(await readdir(dir),[]);
}));
test('both a known command failure and an unknown timeout remove the temporary environment file',async()=>fixture(async dir=>{
 for(const unknown of [false,true]){const failure=Object.assign(Error('DOCKER_FAILURE'),{unknown});await assert.rejects(withEnvironmentFile(dir,{OPAQUE_VALUE:'synthetic-only'},async path=>{assert.equal(await readFile(path,'utf8'),'OPAQUE_VALUE=synthetic-only\n');throw failure;}),e=>e===failure);assert.deepEqual(await readdir(dir),[]);}
}));
test('concurrent creates use different private files and empty environments remain valid',async()=>fixture(async dir=>{
 const paths=new Set();await Promise.all([{},{}].map(env=>withEnvironmentFile(dir,env,async path=>{paths.add(path);assert.equal(await readFile(path,'utf8'),'');await new Promise(r=>setTimeout(r,10));})));assert.equal(paths.size,2);assert.ok(await environmentFilesAbsent(dir));
}));
test('newline, carriage return, NUL, invalid names and oversized values are refused before file creation',async()=>fixture(async dir=>{
 for(const env of [{'BAD-NAME':'x'},{OK:'a\nb'},{OK:'a\rb'},{OK:'a\0b'},{OK:undefined},{OK:'x'.repeat(65537)}]){await assert.rejects(withEnvironmentFile(dir,env,async()=>assert.fail('must not run')));assert.deepEqual(await readdir(dir),[]);}
 assert.equal(encodeEnvironment({USE_DBMATE:''}).toString(),'USE_DBMATE=\n');
}));
test('an exposed parent or residual environment entry blocks the handoff',async()=>fixture(async dir=>{
 await chmod(dir,0o755);await assert.rejects(withEnvironmentFile(dir,{},async()=>{}),/ENV_PARENT_UNSAFE/);await chmod(dir,0o700);await writeFile(join(dir,'env-residual'),'');assert.equal(await environmentFilesAbsent(dir),false);
}));
test('replacement of a temporary file is refused rather than deleting an unknown inode',async()=>fixture(async dir=>{
 let replacement;
 await assert.rejects(withEnvironmentFile(dir,{OPAQUE_VALUE:'synthetic-only'},async path=>{
  replacement=path;const {rename}=await import('node:fs/promises');await rename(path,path+'.original');await writeFile(path,'unrelated',{mode:0o600});
 }),/ENV_FILE_IDENTITY_CHANGED/);
 assert.equal(await readFile(replacement,'utf8'),'unrelated');assert.equal(await environmentFilesAbsent(dir),false);
}));
