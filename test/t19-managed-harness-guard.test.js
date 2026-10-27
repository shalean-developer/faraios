import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('../scripts/t19-managed-harness-guard.ps1',import.meta.url),'utf8');
test('managed harness refuses unsafe execution and requires pinned images',()=>{
 assert.match(ps,/faraios-t19-managed-qa/);
 assert.match(ps,/docker image inspect/);
 assert.match(ps,/docker container ls --all/);
 assert.match(ps,/\$LASTEXITCODE -ne 0/);
 assert.match(ps,/\$names -contains \$ContainerName/);
 assert.doesNotMatch(ps,/docker container inspect/);
 assert.match(ps,/throw 'Disposable container name already exists/);
 for (const marker of ['VAULT_EXTENSION_NO_GO','BOOTSTRAP_ACTOR_NO_GO','MIGRATION_DIGESTS_NO_GO','IMAGE_CATALOG_NO_GO','RESOURCE_CONTROLS_NO_GO','EXECUTION_NO_GO']) {
  assert.ok(ps.includes(marker), `missing fail-closed marker: ${marker}`);
 }
 assert.doesNotMatch(ps,/EXECUTION_READY|EXECUTION_GO/);
 assert.doesNotMatch(ps,/docker\s+(?:run|create|start|pull|stop|rm|exec)|psql|PGPASSWORD|supabase\s+db/i);
});
