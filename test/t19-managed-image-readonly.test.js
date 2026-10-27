import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps = readFileSync(new URL('../scripts/t19-managed-image-readonly.ps1',import.meta.url), 'utf8');
test('T19 inventory reads images only and fails on identity or platform mismatch',()=>{
 assert.match(ps,/docker image inspect/);
 assert.match(ps,/img\.Id -ne \$spec\.Id/);
 assert.match(ps,/img\.Architecture -ne 'amd64'/);
 assert.match(ps,/VERSION=1\.84\.23/);
 assert.match(ps,/if \(\$fail\) \{ exit 1 \}/);
 assert.doesNotMatch(ps,/docker\s+(?:run|pull|create|start|stop|rm|exec|compose)|psql|supabase\s+db|Invoke-WebRequest|curl|PGPASSWORD/i);
});
