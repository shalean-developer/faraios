import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {recipeInputs,verifyDerivedImage,buildBundleDigest} from '../scripts/t19-bootstrap-image-build.mjs';
const dir=new URL('../test-support/t19-postgres-init-owners/',import.meta.url);
test('copy-only build contexts are byte-bound and do not activate new image pins',async()=>{
 const recipes=await recipeInputs();assert.equal(recipes.length,2);
 for(const r of recipes){const sql=r.files.find(f=>f.name==='Dockerfile').bytes.toString();
  const commands=sql.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  assert.equal(commands[0],'FROM '+r.baseTag);assert.equal(commands.length,3);
  assert.ok(commands.slice(1).every(l=>l.startsWith('COPY --chown=0:0 --chmod=')));
 }
 assert.match(await buildBundleDigest(),/^[a-f0-9]{64}$/);
});
test('built image verification rejects inherited configuration or layer changes',()=>{
 const base={Id:'sha256:'+'a'.repeat(64),Config:{User:'',Env:['PATH=/bin']},RootFS:{Layers:['base']}};
 const good={Id:'sha256:'+'b'.repeat(64),Os:'linux',Architecture:'amd64',Config:structuredClone(base.Config),RootFS:{Layers:['base','copy','docs']}};
 const r={baseLayers:1,addedLayers:2};verifyDerivedImage(base,good,r);
 for(const change of [x=>x.Config.User='0',x=>x.Config.Env.push('BAD=1'),x=>x.RootFS.Layers[0]='other',x=>x.RootFS.Layers.pop(),x=>x.Id=base.Id,x=>x.Architecture='arm64']){
  const x=structuredClone(good);change(x);assert.throws(()=>verifyDerivedImage(base,x,r));
 }
});
test('patched runner retains immutable upstream source provenance',()=>{
 const original=readFileSync(new URL('upstream-migrate.sh',dir));
 assert.equal(createHash('sha256').update(original).digest('hex'),'eb6a57848a73dfbc3b8e40edbadcc7a933f1099ac62cef8c138a18115655b745');
 const current=readFileSync(new URL('migrate.sh',dir),'utf8');
 assert.equal(spawnSync('/bin/sh',['-n'],{input:current}).status,0);
 assert.ok(current.includes('ALTER SYSTEM RESET supautils.privileged_extensions'));
 assert.ok(!current.includes('SET supautils.privileged_extensions ='));
});
async function shellFixture(failReload,stats=false){
 const root=await mkdtemp(join(tmpdir(),'t19-init-owner-'));
 try{
  await mkdir(join(root,'init-scripts'));await mkdir(join(root,'migrations'));
  await writeFile(join(root,'migrate.sh'),readFileSync(stats?new URL('../t19-postgres-stat-owner/migrate.sh',dir):new URL('migrate.sh',dir)));
  await writeFile(join(root,'init-scripts','fixture.sql'),'SELECT 1;');
  await writeFile(join(root,'migrations','fixture.sql'),'SELECT 1;');
  if(stats)await writeFile(join(root,'migrations','00-extension.sql'),readFileSync(new URL('../t19-postgres-stat-owner/00-extension.sql',dir)));
  await writeFile(join(root,'sleep'),'#!/bin/sh\nexit 0\n',{mode:0o700});
  const fake=`#!/usr/bin/env node
const fs=require('node:fs');const p=process.env.T19_FAKE_STATE;let s=fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):{value:'original',events:[]};
const a=process.argv.slice(2),c=a[a.indexOf('-c')+1];let out='';
if(a.includes('-f')){const file=a[a.indexOf('-f')+1],user=a[a.indexOf('-U')+1];const phase=file.endsWith('/00-extension.sql')?(user==='postgres'?'stats-prime':'stats-replay'):(file.includes('/init-scripts/')?'init':'migration');s.events.push(phase);if(phase.startsWith('stats-'))(s.stats??=[]).push({phase,user,redirection:s.value});}
else if(a.includes('-c')&&c.startsWith('SHOW ')){out=s.value;s.events.push('show');}
else if(a.includes('-c')&&c.startsWith('ALTER SYSTEM SET ')){s.pending='';s.events.push('override');}
else if(a.includes('-c')&&c.startsWith('ALTER SYSTEM RESET ')){s.pending='original';s.events.push('reset');}
else if(a.includes('-c')&&c.includes('pg_reload_conf')){if(process.env.T19_FAIL_RELOAD!=='yes')s.value=s.pending;s.events.push('reload');}
else s.events.push('vendor');fs.writeFileSync(p,JSON.stringify(s));if(out)console.log(out);
`;
  await writeFile(join(root,'psql'),fake,{mode:0o700});
  const state=join(root,'state.json');
  const r=spawnSync('/bin/sh',[join(root,'migrate.sh')],{encoding:'utf8',timeout:10000,env:{PATH:root+':'+dirname(process.execPath)+':/usr/bin:/bin',POSTGRES_HOST:'/nonexistent',POSTGRES_PASSWORD:'synthetic-fixture-only',USE_DBMATE:'',T19_FAKE_STATE:state,T19_FAIL_RELOAD:failReload?'yes':'no'}});
  return {status:r.status,stderr:r.stderr,state:JSON.parse(await readFile(state,'utf8'))};
 }finally{await rm(root,{recursive:true,force:true});}
}
test('real shell control flow restores the GUC before running vendor migrations',async()=>{
 const r=await shellFixture(false);assert.equal(r.status,0);assert.equal(r.state.value,'original');
 assert.ok(r.state.events.indexOf('override')<r.state.events.indexOf('init'));
 assert.ok(r.state.events.indexOf('init')<r.state.events.indexOf('reset'));
 assert.ok(r.state.events.indexOf('reset')<r.state.events.indexOf('migration'));
});
test('failed SIGHUP observation stops the shell before any initialization SQL file',async()=>{
 const r=await shellFixture(true);assert.notEqual(r.status,0);
 assert.ok(r.stderr.includes('T19_INIT_EXTENSION_CONFIG_RELOAD_FAILED'));
 assert.ok(!r.state.events.includes('init')&&!r.state.events.includes('migration'));
});
test('stats file runs as postgres with redirection cleared before init grants, then replays normally',async()=>{
 const r=await shellFixture(false,true);assert.equal(r.status,0);assert.equal(r.state.value,'original');
 assert.deepEqual(r.state.stats,[{phase:'stats-prime',user:'postgres',redirection:''},{phase:'stats-replay',user:'supabase_admin',redirection:'original'}]);
 assert.ok(r.state.events.indexOf('stats-prime')<r.state.events.indexOf('init'));
 assert.ok(r.state.events.indexOf('init')<r.state.events.indexOf('reset'));
 assert.ok(r.state.events.indexOf('reset')<r.state.events.indexOf('stats-replay'));
 const failed=await shellFixture(true,true);assert.notEqual(failed.status,0);assert.equal(failed.state.stats,undefined);
});
test('stats-only builder has one new PostgreSQL tag and unchanged vendor stats bytes',async()=>{
 const recipes=await recipeInputs('--build-postgres-stat-owner');assert.equal(recipes.length,1);
 assert.equal(recipes[0].component,'postgres');assert.equal(recipes[0].outputTag,'faraios-t19-stat-owner:20261029');assert.equal(recipes[0].baseLayers,30);
 const bytes=readFileSync(new URL('../t19-postgres-stat-owner/00-extension.sql',dir));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'a12e0eb4192d188e0dc5058e888ec981c1fd619d5542235d5b692ea0a1d751b2');
 const active=JSON.parse(readFileSync(new URL('../config/t19-bootstrap-files.json',import.meta.url)));
 assert.equal(active.files.find(x=>x.path==='/docker-entrypoint-initdb.d/migrations/00-extension.sql').sha256,createHash('sha256').update(bytes).digest('hex'));
 await assert.rejects(recipeInputs('/arbitrary/plan'),/BUILD_MODE/);
 assert.match(await buildBundleDigest('--build-postgres-stat-owner'),/^[a-f0-9]{64}$/);
});
