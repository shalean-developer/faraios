import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/t19-gate2-readonly-integration.mjs',import.meta.url),'utf8');
test('integration is read-only with bounded process calls',()=>{
 assert.match(source,/makeBoundedDocker/);
 assert.match(source,/status:'NO_GO'/);
 assert.doesNotMatch(source,/\['container','(?:create|start|stop|rm)'/);
 assert.doesNotMatch(source,/execSync|spawnSync/);
});
