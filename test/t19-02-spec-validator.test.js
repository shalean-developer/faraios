import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validate} from '../scripts/t19-02-spec-validator.mjs';
const p=JSON.parse(readFileSync(new URL('../config/t19-managed-runtime-spec.json',import.meta.url)));
const clone=()=>structuredClone(p);
test('T19-02 specification remains fail-closed',()=>{
 assert.deepEqual(validate(p),[]);
 for(const mutate of [
  s=>s.executionAllowed=true,s=>s.networkMode='bridge',s=>s.publishedPorts=[5432],
  s=>s.bindMounts=['C:/'],s=>s.credentialsAllowed=true,s=>s.security.privileged=true,
  s=>s.security.dropCapabilities=[],s=>s.resources.memoryMiB=8192,
  s=>s.resources.cpus=8,s=>s.resources.pidsLimit=1000,
  s=>s.cleanup.requireIndependentOwnershipProof=false,s=>s.bootstrap.identity='postgres',
  s=>s.migrations.managedOrder='VERIFIED',s=>s.runtime.containerExecutionImplemented=true
 ]){const s=clone();mutate(s);assert.ok(validate(s).length>0);}
});
test('no runtime implementation exists in this T19-02 change',()=>{
 const source=readFileSync(new URL('../scripts/t19-02-spec-validator.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/child_process|docker run|docker create|psql|supabase db|PGPASSWORD/);
});
