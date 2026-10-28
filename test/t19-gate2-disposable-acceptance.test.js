import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../scripts/t19-gate2-disposable-acceptance.ps1',import.meta.url),'utf8');
test('run is opt-in and never touches hosted systems',()=>{for(const x of ['ApproveDisposableRun','EXECUTION_NO_GO','--network','none','--pull','never','--read-only','--cap-drop','ALL','--pids-limit','--memory','--tmpfs'])assert.ok(s.includes(x));assert.doesNotMatch(s,/supabase\.co|zoho\.com|paystack|prune|docker system/);});
test('resource guard and ownership cleanup by immutable ID',()=>{for(const x of ['NAME_COLLISION','OWNERSHIP_MISMATCH_PRE_START','RESOURCE_READBACK_MISMATCH','receipt mismatch','containerId','QUARANTINE','container\x27,\x27rm\x27'])assert.ok(s.includes(x));});

test('DockerRead calls pass the entire array through a named parameter',()=>{
 assert.doesNotMatch(s,/DockerRead @\(/);
 assert.ok((s.match(/DockerRead -arguments @\(/g)||[]).length>=6);
 assert.match(s,/DockerRead -arguments \$createArgs/);
 assert.doesNotMatch(s,/\$containerId = DockerRead \$args/);
});

test('pre-create intent precedes Docker create and ambiguous results require manual recovery',()=>{
 const intent=s.indexOf('$intentPath=[IO.Path]::Combine');
 const create=s.indexOf('$containerId = DockerRead -arguments $createArgs');
 assert.ok(intent>=0 && create>intent);
 assert.match(s,/MANUAL_RECOVERY_REQUIRED/);
 assert.match(s,/QUARANTINE: missing pre-create intent/);
});
