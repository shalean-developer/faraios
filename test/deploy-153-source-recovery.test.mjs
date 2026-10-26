// DEPLOY-153: source-only recovery preflight. Never boots app or contacts a provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const required=[
  '_passenger.cjs','hosted-staging.mjs','src/hosted-runtime.cjs',
  'src/staging-server.js','src/hosted-staging.js',
  'scripts/hosted-source-fingerprint.mjs','public/.htaccess',
  'config/staging.json','config/shalean-approved-earnings.json',
  'package.json','package-lock.json'
];

test('recovery checkout contains every declared startup prerequisite',async()=>{
  for(const path of required){
    const info=await stat(new URL('../'+path,import.meta.url));
    assert.ok(info.isFile(),'missing file: '+path);
    assert.ok(info.size>0,'empty file: '+path);
  }
});

test('lockfile matches package declarations and runtime major',async()=>{
  assert.equal(process.versions.node.split('.')[0],'24','must execute in Node 24');
  const p=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));
  const l=JSON.parse(await readFile(new URL('../package-lock.json',import.meta.url)));
  assert.equal(p.engines.node,'>=24 <25');
  assert.equal(l.packages[''].name,p.name);
  assert.deepEqual(l.packages[''].dependencies,p.dependencies);
  assert.deepEqual(l.packages[''].devDependencies,p.devDependencies);
});

test('hosted entrypoints parse without starting a server',()=>{
  for(const path of ['_passenger.cjs','hosted-staging.mjs','src/hosted-runtime.cjs',
    'src/staging-server.js','src/hosted-staging.js','scripts/hosted-source-fingerprint.mjs']){
    const result=spawnSync(process.execPath,['--check',path],{
      cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:10000,
      env:{PATH:process.env.PATH}
    });
    assert.equal(result.status,0,path+': syntax failure');
  }
});

test('standard launcher cannot opt in accounting proxy',async()=>{
  const launcher=await readFile(new URL('../_passenger.cjs',import.meta.url),'utf8');
  assert.match(launcher,/startHostedStaging\(\)/);
  assert.doesNotMatch(launcher,/accountingProxy\s*:/);
});
