import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {retainRelease,verifyRelease,activateAndVerify} from '../scripts/deploy-153-disposable-rollback.mjs';
const old='a'.repeat(40),next='b'.repeat(40);
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),'faraios-153-'));try{await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('retains immutable prior release and returns to it after failed health',()=>fixture(async dir=>{
  await retainRelease(dir,{sha:old,content:'old-good'});
  await activateAndVerify(dir,{candidateSha:old,verify:async()=>true});
  await retainRelease(dir,{sha:next,content:'new-candidate'});
  await assert.rejects(activateAndVerify(dir,{candidateSha:next,verify:async()=>false}),/ROLLED_BACK/);
  assert.deepEqual(JSON.parse(await readFile(join(dir,'active.json'),'utf8')),{sha:old});
  assert.equal((await verifyRelease(dir,old)).content,'old-good');
}));
test('successful verification promotes new release retaining old',()=>fixture(async dir=>{
  await retainRelease(dir,{sha:old,content:'old-good'});await activateAndVerify(dir,{candidateSha:old,verify:async()=>true});
  await retainRelease(dir,{sha:next,content:'new-good'});
  assert.equal((await activateAndVerify(dir,{candidateSha:next,verify:async()=>true})).previous,old);
  assert.equal((await verifyRelease(dir,old)).content,'old-good');
}));
test('tampered candidate denied before active slot moves',()=>fixture(async dir=>{
  await retainRelease(dir,{sha:old,content:'old-good'});await activateAndVerify(dir,{candidateSha:old,verify:async()=>true});
  await retainRelease(dir,{sha:next,content:'new-good'});
  await writeFile(join(dir,'release-'+next+'.json'),JSON.stringify({sha:next,content:'tampered',checksum:'fake'}));
  await assert.rejects(activateAndVerify(dir,{candidateSha:next,verify:async()=>true}),/RELEASE_TAMPERED/);
  assert.equal(JSON.parse(await readFile(join(dir,'active.json'),'utf8')).sha,old);
}));
