import test from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {requireC2Pass,runC2Native} from '../test-support/t19-c3-ci.mjs';

const good='# tests 18\n# pass 18\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
test('native acceptance rejects skips, incomplete discovery, failures and ambiguous summaries',()=>{
 requireC2Pass(good);requireC2Pass(good.replaceAll('\n','\r\n'));
 for(const bad of ['',good+good,good.replace('# tests 18','# tests 0'),good.replace('# pass 18','# pass 17'),
  ...['fail','cancelled','skipped','todo'].map(k=>good.replace(`# ${k} 0`,`# ${k} 1`)),good.replace('# skipped 0\n','')])assert.throws(()=>requireC2Pass(bad));
});

function model(fault){
 const root=join(tmpdir(),'faraios-t19-synthetic-model'),calls=[],reports=[];let pid=false,removed=false;
 return {root,calls,reports,get removed(){return removed;},args:{root,port:12345,executable:n=>n,node:'node',
  async run(cmd,args,options){
   calls.push({cmd,args,options});
   if(cmd==='initdb'&&fault==='missing')throw new Error('missing executable');
   if(cmd==='pg_ctl'&&args.at(-1)==='start'){pid=true;if(fault==='partial-start')throw new Error('partial start');}
   if(cmd==='pg_ctl'&&args.at(-1)==='stop'){if(fault==='stop')throw new Error('stop failed');if(fault!=='pid')pid=false;}
   if(cmd==='psql')return fault==='version'?'16.9':'17.10';
   if(cmd==='node'){
    assert.deepEqual(args,['--test','--test-reporter=tap','test-support/t19-c2-native-suite.mjs']);
    assert.equal(options.extraEnv.T19_TEST_DATABASE_URL,'postgresql://t19_fixture@127.0.0.1:12345/faraios_t19_test');
    if(fault==='suite')throw new Error('suite nonzero');
    return fault==='skip'?good.replace('# skipped 0','# skipped 1'):good;
   }
   return '';
  },
  async exists(path){assert.ok(path===root||path===join(root,'data','postmaster.pid'));return path===root?!removed:pid;},
  async remove(path){assert.equal(path,root);assert.equal(pid,false);if(fault==='remove')throw new Error('remove failed');if(fault!=='directory')removed=true;},
  report:line=>reports.push(line)}};
}
test('native success is emitted only after stop, absent PID and removed fixture',async()=>{
 const m=model();await runC2Native(m.args);assert.equal(m.removed,true);
 assert.deepEqual(m.reports.slice(-3),['T19_C2_POSTGRES_PID_ABSENT','T19_C2_DISPOSABLE_CLUSTER_CLEANED','T19_C2_NATIVE_PROOF_PASSED']);
});
for(const fault of ['missing','partial-start','version','suite','skip','stop','pid','remove','directory'])test(`native ${fault} failure cannot report success`,async()=>{
 const m=model(fault);await assert.rejects(runC2Native(m.args));
 assert.ok(!m.reports.includes('T19_C2_NATIVE_PROOF_PASSED'));
 if(['missing','partial-start','version','suite','skip'].includes(fault))assert.equal(m.removed,true);
 else {assert.equal(m.removed,false);assert.ok(!m.reports.includes('T19_C2_DISPOSABLE_CLUSTER_CLEANED'));}
 if(fault==='partial-start')assert.ok(m.calls.some(x=>x.cmd==='pg_ctl'&&x.args.at(-1)==='stop'));
});
test('unsafe cleanup targets are refused before any command or deletion',async()=>{
 for(const root of [tmpdir(),join(tmpdir(),'unrelated'),join(tmpdir(),'faraios-t19-synthetic-model','child')]){
  const m=model();await assert.rejects(runC2Native({...m.args,root}));assert.equal(m.calls.length,0);assert.equal(m.removed,false);
 }
});
test('actual missing PostgreSQL executable exits nonzero, cleans only owned directory',async t=>{
 const root=await mkdtemp(join(tmpdir(),'faraios-c3-negative-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeFile(join(root,'sentinel'),'preserve');
 const env={...process.env};for(const k of Object.keys(env))if(/^(PG|FARAIOS_|SUPABASE_|NODE_TEST_CONTEXT|NODE_OPTIONS)|DATABASE_URL/i.test(k))delete env[k];
 Object.assign(env,{TMP:root,TEMP:root,TMPDIR:root,T19_PG_BIN:join(root,'missing-postgres')});
 const result=spawnSync(process.execPath,['scripts/run-t19-c2-postgres.mjs'],{env,encoding:'utf8',windowsHide:true,timeout:15000});
 assert.equal(result.error,undefined);assert.equal(result.status,1);
 assert.match(result.stdout,/T19_C2_DISPOSABLE_CLUSTER_CLEANED/);assert.doesNotMatch(result.stdout,/T19_C2_NATIVE_PROOF_PASSED/);
 assert.equal(await readFile(join(root,'sentinel'),'utf8'),'preserve');assert.deepEqual(await readdir(root),['sentinel']);
});
