import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('ordinary Node discovery does not execute the opt-in native accounting runner',async t=>{
 const root=await mkdtemp(join(tmpdir(),'faraios-t19-discovery-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 const command=pkg.scripts['test:accounting:postgres'];
 assert.match(command,/^node scripts\/[a-z0-9-]+\.mjs$/);
 const path=command.slice('node '.length);
 await mkdir(join(root,'scripts'));
 await writeFile(join(root,path),await readFile(new URL('../'+path,import.meta.url)));
 const env={...process.env,T19_PG_BIN:join(root,'nonexistent-postgres')};
 // A discovery regression must fail without ever starting PostgreSQL.
 for(const key of Object.keys(env))if(/^(PG|FARAIOS_|SUPABASE_|NODE_TEST_CONTEXT|NODE_OPTIONS)|DATABASE_URL/i.test(key))delete env[key];
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap'],{cwd:root,env,encoding:'utf8',timeout:15000,windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
 assert.match(result.stdout,/# tests 0\b/);
 assert.doesNotMatch(result.stdout,/T19_NATIVE_ACCEPTANCE_PASSED|T19 isolated PostgreSQL|called recursively/);
});
