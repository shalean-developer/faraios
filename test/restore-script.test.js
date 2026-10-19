import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
test('offline restore handles empty snapshots, unordered rows and audit-probe name collision',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'faraios-restore-'));try{
 const base={version:1,project_ref:'xdmfyrsauvqznkloroxg',businesses:[],memberships:[],events:[]};
 const business=(id,name)=>({id,name,industry:'cleaning',status:'active',created_at:'2026-10-19T00:00:00.000000Z'});
 const a=business('10000000-0000-4000-8000-000000000001','Isolated restore verification'),b=business('10000000-0000-4000-8000-000000000002','Example B');
 for(const [index,rows] of [[],[b,a],[a]].entries()){
  const path=join(dir,`${index}.json`);await writeFile(path,JSON.stringify({...base,businesses:rows}));
  const {stdout}=await run(process.execPath,['scripts/rehearse-foundation-restore.mjs',path],{cwd:new URL('../',import.meta.url),timeout:30000});
  const result=JSON.parse(stdout);assert.equal(result.result,'PASS');assert.equal(result.auditAfterRestore,'PASS');assert.equal(result.counts.businesses,rows.length);
 }
 }finally{await rm(dir,{recursive:true,force:true});}
});
