import test from 'node:test';
import assert from 'node:assert/strict';
import {correctedCandidate,assessCorrectedCandidate,correctedProposedArgs} from '../scripts/t19-gate2-corrected-candidate.mjs';
test('corrected candidate removes unverified forced UID and includes both required writable paths',()=>{
 const a=correctedProposedArgs();
 assert.equal(a.includes('--user'),false);
 assert.equal(a.includes('--tmpfs'),true);
 assert.equal(a.filter(x=>x==='--tmpfs').length,2);
 assert.ok(a.some(x=>x.startsWith('/var/lib/postgresql/data:')));
 assert.ok(a.some(x=>x.startsWith('/var/run/postgresql:')));
 assert.equal(a.includes('--network'),true);
 assert.equal(a[a.indexOf('--network')+1],'none');
 assert.equal(assessCorrectedCandidate().allowed,false);
});
test('unsafe or assumed candidate conditions remain denied',()=>{
 for(const change of [
 x=>x.image='postgres:latest',x=>x.network='bridge',x=>x.bindMounts=['C:/'],
 x=>x.initialUser='999:999',x=>x.effectivePostgresUid='999',
 x=>x.capabilityPolicy='VERIFIED',x=>x.writableTmpfs.pop(),
 x=>x.credentialsAllowed=true,x=>x.memoryMiB=8192,x=>x.executionApproved=true
 ]){const s=structuredClone(correctedCandidate);change(s);assert.equal(assessCorrectedCandidate(s).allowed,false);}
});
