import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,unlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createRotationMaintenanceCheck,scanStagingWriterProcesses} from '../src/t19-standard-rotation-maintenance.js';
const ids=[randomUUID(),randomUUID()],deny={message:'accounting_rotation_maintenance_required'};
const baseline=()=>({environment:'staging',observedAt:1000,webStopped:true,schedulerPaused:true,inventoryComplete:true,processNamespaceVerified:true,foreignLeaseCount:0,pendingJobs:0,runningJobs:0,workerConfiguration:{version:1,environment:'staging',enabled:false,businessIds:ids},inventory:ids.map(businessId=>({businessId,environment:'staging',status:'connected',envelopeKeyId:'old'}))});
function check(facts,extra={}){return createRotationMaintenanceCheck({businessIds:ids,keyIds:['old','new'],readFacts:async()=>facts,scanProcesses:async()=>[],now:()=>1000,...extra});}
test('maintenance requires fresh complete inventory, disabled worker and stopped service/schedule',async()=>{assert.equal(await check(baseline())(),true);});
test('active/unknown processes, stale facts and incomplete or foreign key consumers deny maintenance',async()=>{
 for(const change of [f=>f.webStopped=false,f=>f.schedulerPaused=false,f=>f.inventoryComplete=false,f=>f.processNamespaceVerified=false,f=>f.workerConfiguration.enabled=true,f=>f.foreignLeaseCount=1,f=>f.pendingJobs=1,f=>f.runningJobs=1,f=>f.observedAt=-5000,f=>f.observedAt=1001,f=>f.inventory.pop(),f=>f.inventory.push({...f.inventory[0],businessId:randomUUID()}),f=>f.inventory[0].status='revocation_pending',f=>f.inventory[0].envelopeKeyId='unknown',f=>f.inventory[0].environment='production']){
  const facts=baseline();change(facts);await assert.rejects(check(facts)(),deny);
 }
 await assert.rejects(check(baseline(),{scanProcesses:async()=>[{pid:10,kind:'worker'}]})(),deny);
 await assert.rejects(check(baseline(),{scanProcesses:async()=>{throw Error('reader failed');}})(),deny);
 let time=1000;await assert.rejects(check(baseline(),{now:()=>time,scanProcesses:async()=>{time=10000;return [];}})(),deny);
});
test('maintenance rereads facts for every gate, never caches a prior PASS',async()=>{
 let f=baseline(),reads=0;const c=check(f,{readFacts:async()=>{reads++;return f;}});assert.equal(await c(),true);f={...f,schedulerPaused:false};await assert.rejects(c(),deny);assert.equal(reads,2);
});
test('Linux process scanner handles exact paths, Node flags and relative scripts without exposing arguments',{skip:process.platform!=='linux'},async t=>{
 const root=await mkdtemp(join(tmpdir(),'t19-proc-')),appRoot=join(root,'app'),procRoot=join(root,'proc');await mkdir(appRoot);await mkdir(procRoot);t.after(()=>rm(root,{recursive:true,force:true}));
 async function processEntry(id,args,cwd=appRoot,comm='node'){
  const path=join(procRoot,String(id));await mkdir(path);await writeFile(join(path,'comm'),comm+'\n');await writeFile(join(path,'stat'),id+' (node) S '+Array(18).fill('0').join(' ')+' 12345\n');await writeFile(join(path,'cmdline'),args.join('\0')+'\0');await symlink(cwd,join(path,'cwd'));await symlink(comm==='php'?'/usr/bin/php':process.execPath,join(path,'exe'));
 }
 await processEntry(101,['node',join(appRoot,'_standard_accounting.cjs')]);await processEntry(102,['node','--enable-source-maps','./scripts/t19-standard-invoice-worker.mjs']);await processEntry(103,['node','--require='+join(appRoot,'_standard_accounting.cjs'),'-e','SYNTHETIC']);
 await processEntry(104,['node','-e','console.log("_standard_accounting.cjs")']);await processEntry(105,['node','unrelated.mjs']);await processEntry(106,['php','_standard_accounting.cjs'],appRoot,'php');await processEntry(107,['node',join(appRoot,'scripts/t19-standard-scheduled-worker.mjs')]);await processEntry(108,['node',join(appRoot,'_standard_accounting.cjs')],appRoot,'renamed-node');
 const found=await scanStagingWriterProcesses({appRoot,procRoot,selfPid:999});assert.deepEqual(found,[{pid:101,kind:'web'},{pid:102,kind:'worker'},{pid:103,kind:'web'},{pid:107,kind:'scheduler'},{pid:108,kind:'web'}]);assert.ok(!JSON.stringify(found).includes('SYNTHETIC'));
 assert.ok(!(await scanStagingWriterProcesses({appRoot,procRoot,selfPid:101})).some(p=>p.pid===101));
 await unlink(join(procRoot,'105','cmdline'));await assert.rejects(scanStagingWriterProcesses({appRoot,procRoot,selfPid:999}),deny);await writeFile(join(procRoot,'105','cmdline'),'node\0unrelated.mjs\0');
 await writeFile(join(procRoot,'104','stat'),'malformed');await assert.rejects(scanStagingWriterProcesses({appRoot,procRoot,selfPid:999}),deny);
});
test('real Linux proc scan detects a running synthetic writer and clears only after its exit',{skip:process.platform!=='linux'},async t=>{
 const appRoot=await mkdtemp(join(tmpdir(),'t19-proc-real-'));await mkdir(join(appRoot,'scripts'));const file=join(appRoot,'scripts','t19-standard-invoice-worker.mjs');await writeFile(file,"console.log('SYNTHETIC_READY');setInterval(()=>{},1000);\n",{mode:0o600});
 const child=spawn(process.execPath,['--enable-source-maps',file],{env:{},stdio:['ignore','pipe','pipe']});const exit=once(child,'exit');t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await exit;}await rm(appRoot,{recursive:true,force:true});});
 await once(child.stdout,'data');const status=await readFile('/proc/self/status','utf8'),pid=Number(status.match(/^Pid:\s+(\d+)/m)?.[1]),nested=status.match(/^NSpid:\s+(.+)$/m)?.[1]?.trim().split(/\s+/);
 if(pid!==process.pid||nested&&nested.length!==1){await assert.rejects(scanStagingWriterProcesses({appRoot}),deny);t.diagnostic('T19_PROC_NAMESPACE_MISMATCH_DENIED');}
 else{const found=await scanStagingWriterProcesses({appRoot});assert.deepEqual(found,[{pid:child.pid,kind:'worker'}]);child.kill('SIGTERM');await exit;assert.deepEqual(await scanStagingWriterProcesses({appRoot}),[]);t.diagnostic('T19_PROC_MATCHING_NAMESPACE_PASS');}
});
