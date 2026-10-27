import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const policy=JSON.parse(readFileSync(new URL('../config/t19-managed-harness-policy.json',import.meta.url)));
const source=readFileSync(new URL('../scripts/t19-managed-preflight.mjs',import.meta.url),'utf8');
test('managed preflight remains fail-closed and read-only',()=>{
 assert.equal(policy.executionAllowed,false);
 assert.equal(policy.network,'none');
 assert.deepEqual(policy.ports,[]);
 assert.deepEqual(policy.mounts,[]);
 assert.equal(policy.credentialsAllowed,false);
 assert.equal(policy.autoPull,false);
 assert.match(source,/EXECUTION_NO_GO/);
 assert.match(source,/docker.*image|\['image','inspect'/);
 assert.doesNotMatch(source,/\['(?:run|pull|create|start|stop|rm|exec|network|volume)'/);
 assert.doesNotMatch(source,/psql|supabase db|PGPASSWORD/i);
});
