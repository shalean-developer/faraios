import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candidate,validateCandidate,proposedDockerArgs} from '../scripts/t19-03-docker-candidate.mjs';
test('T19-03 candidate is strictly isolated and nonexecuting',()=>{
 assert.deepEqual(validateCandidate(candidate),[]);
 const args=proposedDockerArgs();
 for(const flag of ['--pull','--network','--memory','--memory-swap','--pids-limit','--cpus','--read-only','--cap-drop','--user','--tmpfs','--label'])assert.ok(args.includes(flag));
 assert.equal(args[args.indexOf('--network')+1],'none');
 assert.equal(args[args.indexOf('--pull')+1],'never');
 assert.ok(!args.includes('--privileged'));
 assert.ok(!args.includes('-p'));
});
test('candidate fail-closed mutations',()=>{
 for(const mutation of [
  s=>s.network='bridge',s=>s.binds=['/'],s=>s.ports=['5432:5432'],
  s=>s.image='postgres:latest',s=>s.memoryMiB=2048,s=>s.cpus=4,s=>s.pids=999,
  s=>s.credentialsAllowed=true,s=>s.privileged=true,s=>s.readOnly=false,
  s=>s.noNewPrivileges=false,s=>s.capDrop='NET_ADMIN',s=>s.runtimeUser='0:0',
  s=>s.executionApproved=true,s=>s.ownershipVerified=true
 ]){const s=structuredClone(candidate);mutation(s);assert.notDeepEqual(validateCandidate(s),[]);}
});
test('no docker execution or database access implemented',()=>{
 const source=readFileSync(new URL('../scripts/t19-03-docker-candidate.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/child_process|execFile|spawn\(|psql|supabase db|PGPASSWORD/);
});
