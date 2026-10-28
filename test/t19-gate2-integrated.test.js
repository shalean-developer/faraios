import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {IMAGE,NAME,SCOPE,canonical,digest,policyDigest,createArgs,checkApproval,
 integratedRun,localJournal,boundedProcess,executeGate2,bundleDigest,recoverInterrupted} from '../scripts/t19-gate2-integrated.mjs';
const keys=()=>generateKeyPairSync('ed25519');
const owner=keys(),other=keys();
const pem=k=>k.export({type:'spki',format:'pem'});
const id='e'.repeat(64),nonce='f'.repeat(32),time=100000;
function fixture(count=13){
 const calls=[],state={created:false,running:false};
 const baseline=Array.from({length:count},(_,i)=>({ID:digest('baseline'+i),Names:'existing-'+i,State:'running'})).sort((a,b)=>a.ID.localeCompare(b.ID));
 const trust={context:'default',dockerHost:'unix:///var/run/docker.sock',ownerKey:pem(owner.publicKey),
  imageEntrypoint:['docker-entrypoint.sh'],imageCmd:['postgres'],imageEnv:['PATH=/usr/bin:/bin']};
 const hostBootSha256=digest('fixture-host-boot');
 const receipt={version:4,scope:SCOPE,bundleSha256:digest('bundle'),binarySha256:digest('binary'),policySha256:policyDigest(),
  inventorySha256:digest(baseline),baselineCount:count,hostBootSha256,daemonIdSha256:digest('fixture-daemon'),context:trust.context,nonce,issuedAt:time-1,expiresAt:time+60000};
 const signed=receipt=>({receipt,ownerSignature:sign(null,Buffer.from(canonical(receipt)),owner.privateKey).toString('base64')});
 const args=createArgs(nonce),tmpfs={};for(let i=0;i<args.length;i++)if(args[i]==='--tmpfs'){const s=args[i+1],p=s.indexOf(':');tmpfs[s.slice(0,p)]=s.slice(p+1);}
 const container=()=>({Id:id,Image:IMAGE,Name:'/'+NAME,Config:{Image:IMAGE,User:'100:101',Labels:{'faraios.t19.run-nonce':nonce},
  Entrypoint:trust.imageEntrypoint,Cmd:trust.imageCmd,Env:[...trust.imageEnv,'POSTGRES_HOST_AUTH_METHOD=trust']},
  HostConfig:{NetworkMode:'none',ReadonlyRootfs:true,Memory:536870912,MemorySwap:536870912,NanoCpus:1000000000,PidsLimit:64,
   Privileged:false,PublishAllPorts:false,Binds:[],CapAdd:[],CapDrop:['ALL'],SecurityOpt:['no-new-privileges:true'],Tmpfs:tmpfs,PortBindings:{}},
  Mounts:[],NetworkSettings:{Ports:{}},State:{Running:state.running}});
 const list=()=>[...baseline,...(state.created?[{ID:id,Names:NAME,State:state.running?'running':'created'}]:[])];
 const run=async(a,opts)=>{
  calls.push({a,opts});const command=a.slice(0,2).join(' ');
  if(state.fail===command){if(command==='container create')state.created=true;throw Error('PROCESS_TIMEOUT_UNKNOWN');}
  let stdout='';
  if(a[0]==='info')stdout=JSON.stringify({ID:state.daemonId??'fixture-daemon',OSType:'linux',ServerVersion:'fixture'});
  else if(command==='context inspect')stdout=JSON.stringify([{Name:trust.context,Endpoints:{docker:{Host:trust.dockerHost}}}]);
  else if(command==='image inspect')stdout=JSON.stringify([{Id:IMAGE,Os:'linux',Architecture:'amd64',Config:{Entrypoint:trust.imageEntrypoint,Cmd:trust.imageCmd,Env:trust.imageEnv}}]);
  else if(command==='container ls')stdout=(a.includes('--filter')?list().filter(x=>x.ID===id):list()).map(canonical).join('\n');
  else if(command==='container create'){state.created=true;stdout=id;}
  else if(command==='container inspect'){const c=container();state.tamper?.(c);stdout=JSON.stringify(c);}
  else if(command==='container start')state.running=true;
  else if(command==='container stop')state.running=false;
  else if(command==='container rm')state.created=false;
  else if(command==='container exec'&&a.includes('psql'))stdout=state.sqlOutput??'NOTICE: T19_SQLSTATE_42501_PASS\nNOTICE: T19_DUPLICATE_23505_PASS\nNOTICE: T19_COLLISION_42P06_PASS\nNOTICE: T19_COLLISION_55000_PASS\nNOTICE: T19_ALLOWED_WRITE_PASS\nT19_ROLLBACK_PASS';
  else if(command==='container logs')stdout='synthetic startup log';
  return {stdout,stderr:''};
 };
 return {approval:signed(receipt),signed,receipt,trust,bundleSha256:receipt.bundleSha256,binarySha256:receipt.binarySha256,hostBootSha256,
  now:()=>time,sleep:async()=>{},sql:'fixed synthetic fixture',run,calls,state,baseline};
}
async function withJournal(fn){const dir=await mkdtemp(join(tmpdir(),'t19-g2-'));try{return await fn(localJournal(dir),dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('signed v4 lifecycle uses durable real files, fixed stdin, exact IDs and complete reconciliation',()=>withJournal(async(journal,dir)=>{
 const f=fixture();const r=await integratedRun({...f,journal});assert.equal(r.status,'PASS');assert.equal(r.cleanupVerified,true);
 const intent=JSON.parse(await readFile(join(dir,nonce+'.intent'),'utf8'));assert.deepEqual(intent.baseline,f.baseline);
 assert.equal(JSON.parse(await readFile(join(dir,nonce+'.binding'),'utf8')).id,id);
 assert.deepEqual(JSON.parse(await readFile(join(dir,nonce+'.inventory-after'),'utf8')),f.baseline);
 const sql=f.calls.find(c=>c.a.includes('psql'));assert.equal(sql.opts.stdin,f.sql);assert.ok(sql.a.includes('-X'));
 for(const c of f.calls.filter(c=>c.a[0]==='container'&&['start','stop','rm','exec','logs','inspect'].includes(c.a[1])))assert.ok(c.a.includes(id));
 // Replay across a new gateway invocation with the same persistent directory.
 const replay=await integratedRun({...fixture(),journal});assert.equal(replay.status,'NO_GO');assert.equal(replay.mutationAttempted,false);
}));
test('trusted owner signature and every exact binding are required',()=>{
 const f=fixture();assert.equal(checkApproval({...f,now:time}).nonce,nonce);
 for(const key of ['ownerSignature'])assert.throws(()=>checkApproval({...f,approval:{...f.approval,[key]:''},now:time}),/SIGNATURE/);
 for(const [key,value] of Object.entries({scope:'startup-only',bundleSha256:digest('tamper'),binarySha256:digest('other'),policySha256:digest('other'),context:'remote',expiresAt:time-1,issuedAt:time+1,nonce:'bad'})){
  assert.throws(()=>checkApproval({...f,approval:f.signed({...f.receipt,[key]:value}),now:time}),/INVALID/);
 }
 assert.throws(()=>checkApproval({...f,trust:{...f.trust,ownerKey:pem(other.publicKey)},now:time}),/SIGNATURE/);
 assert.throws(()=>checkApproval({...f,approval:f.signed({...f.receipt,version:3}),now:time}),/INVALID/);
 assert.throws(()=>checkApproval({...f,approval:{receipt:f.receipt,reviewerSignature:f.approval.ownerSignature},now:time}),/SIGNATURE/);
});
test('untrusted approval booleans cannot reach Docker or persistent state',()=>withJournal(async(journal)=>{
 const f=fixture();const r=await integratedRun({...f,journal,approval:{receipt:{...f.receipt,approved:true,consumed:true}}});
 assert.equal(r.mutationAttempted,false);assert.equal(f.calls.length,0);
}));
test('concurrent one-use claims and partial nonce files fail closed across restart',()=>withJournal(async(journal,dir)=>{
 const {receipt}=fixture();const attempts=await Promise.allSettled(Array.from({length:10},()=>journal.consume(receipt)));
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 await assert.rejects(localJournal(dir).consume(receipt),{code:'EEXIST'});
 const partial={...receipt,nonce:'a'.repeat(32)};await writeFile(join(dir,partial.nonce+'.consumed'),'');
 await assert.rejects(localJournal(dir).consume(partial),{code:'EEXIST'});
}));
test('lost create result recovers nonce to exact identity and quarantines without cleanup',()=>withJournal(async(journal,dir)=>{
 const f=fixture();f.state.fail='container create';const r=await integratedRun({...f,journal});
 assert.equal(r.status,'QUARANTINE');assert.deepEqual(r.recovery,[{id,owned:true,running:false}]);
 assert.equal(f.calls.some(c=>['start','stop','rm'].includes(c.a[1])),false);
 assert.equal(JSON.parse(await readFile(join(dir,nonce+'.quarantine'),'utf8')).recordedId,null);
 const recovered=await recoverInterrupted({nonce,journal:localJournal(dir),run:f.run});
 assert.equal(recovered.mutationAllowed,false);assert.equal(recovered.baselinePreserved,true);
 assert.deepEqual(recovered.candidates,[{id,identityMatches:true,durableBinding:false,running:false}]);
 assert.equal(f.calls.some(c=>['start','stop','rm'].includes(c.a[1])),false);
}));
test('timeouts at all mutating boundaries quarantine, never continue or auto-delete',async()=>{
 for(const stage of ['container start','container exec','container stop','container rm'])await withJournal(async journal=>{
  const f=fixture();f.state.fail=stage;const r=await integratedRun({...f,journal});assert.equal(r.status,'QUARANTINE',stage);
  const failIndex=f.calls.findIndex(c=>c.a.slice(0,2).join(' ')===stage);
  assert.equal(f.calls.slice(failIndex+1).some(c=>['start','exec','stop','rm'].includes(c.a[1])),false,stage);
 });
});
test('receipt failure after create preserves resource and recoverable intent',()=>withJournal(async journal=>{
 const f=fixture();const r=await integratedRun({...f,journal:{...journal,bind:async()=>{throw Error('DISK_FAILURE')}}});
 assert.equal(r.status,'QUARANTINE');assert.equal(f.state.created,true);assert.equal(f.calls.some(c=>c.a[1]==='start'),false);
}));
test('foreign nonce, added capabilities, mounts, environment and wrong image forbid startup',async()=>{
 const changes=[c=>c.Config.Labels['faraios.t19.run-nonce']='a'.repeat(32),c=>c.HostConfig.CapAdd=['SYS_ADMIN'],
  c=>c.Mounts.push({Type:'bind'}),c=>c.Config.Env.push('PROVIDER_TOKEN=fixture'),c=>c.Image=digest('foreign')];
 for(const change of changes)await withJournal(async journal=>{
  const f=fixture();f.state.tamper=change;const r=await integratedRun({...f,journal});assert.equal(r.status,'QUARANTINE');
  assert.equal(f.calls.some(c=>['start','stop','rm'].includes(c.a[1])),false);
 });
});
test('missing SQL evidence and final inventory drift cannot produce PASS',async()=>{
 await withJournal(async journal=>{const f=fixture();f.state.sqlOutput='T19_ROLLBACK_PASS';const r=await integratedRun({...f,journal});assert.equal(r.status,'QUARANTINE');assert.equal(r.reason,'SQL_EVIDENCE_MISSING');});
 await withJournal(async journal=>{const f=fixture(),original=f.run;f.run=async(a,o)=>{const r=await original(a,o);if(a[1]==='rm')f.baseline[0].State='exited';return r;};
  const r=await integratedRun({...f,journal});assert.equal(r.status,'QUARANTINE');assert.equal(r.reason,'INVENTORY_DRIFT');});
});
test('changed baseline or wrong number of existing containers blocks create',()=>withJournal(async journal=>{
 const f=fixture();f.baseline.pop();const r=await integratedRun({...f,journal});assert.equal(r.reason,'BASELINE_CHANGED');assert.equal(r.mutationAttempted,false);
}));
test('expiry during async intent persistence denies create; expiry after create denies start',async()=>{
 await withJournal(async journal=>{
  const f=fixture();let now=time;
  const result=await integratedRun({...f,now:()=>now,journal:{...journal,intent:async(...a)=>{await journal.intent(...a);now=f.receipt.expiresAt;}}});
  assert.equal(result.reason,'APPROVAL_EXPIRED');assert.equal(result.mutationAttempted,false);
 });
 await withJournal(async journal=>{
  const f=fixture();let now=time;
  const result=await integratedRun({...f,now:()=>now,journal:{...journal,bind:async(...a)=>{await journal.bind(...a);now=f.receipt.expiresAt;}}});
  assert.equal(result.status,'QUARANTINE');assert.equal(result.reason,'APPROVAL_EXPIRED');
  assert.equal(f.calls.some(c=>c.a[1]==='start'),false);
 });
});
test('durable binding substitution blocks cleanup even when runtime ownership matches',()=>withJournal(async journal=>{
 const f=fixture();const r=await integratedRun({...f,journal:{...journal,binding:async()=>false}});
 assert.equal(r.status,'QUARANTINE');assert.equal(r.reason,'DURABLE_BINDING_CHANGED');
 assert.equal(f.calls.some(c=>['stop','rm'].includes(c.a[1])),false);
}));
test('bounded adapter terminates an actual harmless child on deadline without invoking Docker',async()=>{
 let child;const run=boundedProcess('/not-used','test',{spawnProcess:()=>{child=spawn(process.execPath,['-e','setInterval(()=>{},1000)']);return child;}});
 await assert.rejects(run(['unused'],{timeoutMs:40}),/TIMEOUT_UNKNOWN/);
 await new Promise(resolve=>child.exitCode!==null||child.signalCode!==null?resolve():child.once('close',resolve));
 assert.equal(child.signalCode,'SIGKILL');
});
test('real entrypoint denies without externally installed trust; executable digest is deterministic',async()=>{
 const result=await executeGate2({approved:true,consumed:true});assert.equal(result.status,'NO_GO');assert.equal(result.mutationAttempted,false);
 assert.match(await bundleDigest(),/^[a-f0-9]{64}$/);
});
test('a separately signed empty baseline supports a clean disposable host without changing isolation',()=>withJournal(async journal=>{
 const f=fixture(0);const r=await integratedRun({...f,journal});assert.equal(r.status,'PASS');
 const create=f.calls.find(c=>c.a[1]==='create').a;
 assert.deepEqual(create,createArgs(nonce));assert.equal(f.receipt.baselineCount,0);
}));
test('unsigned, mismatched and unsupported baseline counts fail before mutation',async()=>{
 for(const count of [undefined,1,12,14])await withJournal(async journal=>{
  const f=fixture();const r=await integratedRun({...f,journal,approval:f.signed({...f.receipt,baselineCount:count})});
  assert.equal(r.status,'NO_GO');assert.equal(r.mutationAttempted,false);assert.equal(f.calls.length,0);
 });
 await withJournal(async journal=>{
  const f=fixture(0);const r=await integratedRun({...f,journal,approval:f.signed({...f.receipt,baselineCount:13})});
  assert.equal(r.reason,'BASELINE_CHANGED');assert.equal(r.mutationAttempted,false);
 });
});
test('a different host boot or Docker daemon cannot use a signed receipt',async()=>{
 await withJournal(async journal=>{const f=fixture();const r=await integratedRun({...f,journal,hostBootSha256:digest('other-boot')});
  assert.equal(r.reason,'EXACT_APPROVAL_INVALID');assert.equal(f.calls.length,0);});
 await withJournal(async journal=>{const f=fixture();f.state.daemonId='other-daemon';const r=await integratedRun({...f,journal});
  assert.equal(r.reason,'DOCKER_DAEMON_CHANGED');assert.equal(r.mutationAttempted,false);});
 await withJournal(async journal=>{const f=fixture(),original=f.run;f.run=async(a,o)=>{const r=await original(a,o);if(a[1]==='create')f.state.daemonId='changed-after-create';return r;};
  const r=await integratedRun({...f,journal});assert.equal(r.reason,'DOCKER_DAEMON_CHANGED');assert.equal(r.status,'QUARANTINE');
  assert.equal(f.calls.some(c=>['start','stop','rm','exec'].includes(c.a[1])),false);});
});
test('pre-existing container ID returned by create cannot be bound, inspected or mutated',()=>withJournal(async journal=>{
 const f=fixture(),original=f.run;const old=f.baseline[0].ID;
 f.run=async(a,o)=>{const r=await original(a,o);return a[1]==='create'?{stdout:old,stderr:''}:r;};
 const r=await integratedRun({...f,journal});assert.equal(r.reason,'PREEXISTING_CONTAINER_ID');
 assert.equal(f.calls.some(c=>c.a.includes(old)),false);
 assert.equal(f.calls.some(c=>['start','stop','rm','exec'].includes(c.a[1])),false);
}));
test('complete bounded command transcripts are durable before the next action',()=>withJournal(async(journal,dir)=>{
 const f=fixture();await integratedRun({...f,journal});
 const {readdir}=await import('node:fs/promises');const files=await readdir(dir);
 const intents=files.filter(n=>/command-\d+-intent$/.test(n));assert.ok(intents.length>10);
 for(const name of intents){const result=name.replace(/-intent$/,'-result');assert.ok(files.includes(result),name);
  const x=JSON.parse(await readFile(join(dir,result),'utf8'));assert.ok(Array.isArray(x.args));assert.equal(typeof x.stdout,'string');assert.equal(typeof x.stderr,'string');}
 const preflight=JSON.parse(await readFile(join(dir,nonce+'.preflight'),'utf8'));assert.equal(preflight.length,4);
}));
test('result-journal failure after create quarantines its unknown acknowledgement',()=>withJournal(async journal=>{
 const f=fixture();let createSeen=false;
 const r=await integratedRun({...f,journal:{...journal,event:async(r,name,value)=>{
  if(name.endsWith('-intent')&&value.args?.[1]==='create')createSeen=true;
  if(createSeen&&name.endsWith('-result')){createSeen=false;throw Error('DISK_FULL');}
  return journal.event(r,name,value);
 }}});
 assert.equal(r.status,'QUARANTINE');assert.equal(f.state.created,true);
 assert.equal(f.calls.some(c=>['start','stop','rm'].includes(c.a[1])),false);
}));
test('nonzero subprocess results retain stdout, stderr, exit code and signal without Docker',async()=>{
 const run=boundedProcess('/unused','default',{spawnProcess:()=>spawn(process.execPath,['-e',"process.stdout.write('observed out');process.stderr.write('observed err');process.exitCode=3;"])});
 await assert.rejects(run(['unused']),e=>{assert.equal(e.commandEvidence.stdout,'observed out');assert.equal(e.commandEvidence.stderr,'observed err');assert.equal(e.commandEvidence.exitCode,3);return true;});
});
test('SQL marker substrings and duplicate marker lines cannot masquerade as evidence',async()=>{
 for(const variant of ['prefix','duplicate'])await withJournal(async journal=>{
  const f=fixture(),original=f.run;f.run=async(a,o)=>{const r=await original(a,o);if(a.includes('psql'))r.stdout=variant==='prefix'?r.stdout.replace('T19_ROLLBACK_PASS','WRONG_T19_ROLLBACK_PASS'):r.stdout+'\nT19_ROLLBACK_PASS';return r;};
  const r=await integratedRun({...f,journal});assert.equal(r.reason,'SQL_EVIDENCE_MISSING');assert.equal(r.status,'QUARANTINE');
 });
});
