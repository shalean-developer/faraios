// Evidence-only instrumentation: source files remain unchanged.
// Run from the repository root with Node 24 and --test-name-pattern.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../../../',import.meta.url);
let source=await readFile(new URL('test/staging-backup.test.js',root),'utf8');
source=source.replace("'../scripts/backup-staging.mjs'",JSON.stringify(new URL('scripts/backup-staging.mjs',root).href));
const marker=" }}));\n assert.deepEqual(await readdir(foreign),[]);assert.deepEqual(await readdir(moved),[]);";
source=source.replaceAll('\r\n','\n');
assert.equal(source.split(marker).length,2,'Instrumentation must match exactly one target');
source=source.replace(marker," }}),error=>{console.log('T19_BACKUP_DIAGNOSTIC',JSON.stringify({swapped,code:error.code}));return true;});\n assert.deepEqual(await readdir(foreign),[]);assert.deepEqual(await readdir(moved),[]);");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
