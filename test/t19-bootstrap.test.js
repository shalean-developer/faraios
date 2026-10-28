import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {generateKeyPairSync,sign} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {canonical,digest,containerSpec,createArgs,isolated,environment,tarFiles,ledgerChecks,FREEZE,SCOPE,PHASES,runBootstrap} from '../scripts/t19-bootstrap-engine.mjs';
import {dockerProcess,validateApproval,compareCatalog,Host,CATALOG_KEYS} from '../scripts/t19-bootstrap-host.mjs';
const nonce='1'.repeat(32),network='t19-bootstrap-'+nonce;
const files=JSON.parse(await readFile(new URL('../config/t19-bootstrap-files.json',import.meta.url))).files;
function specFixture(kind='postgres'){
 const s=containerSpec(nonce,kind,network),x={Id:'a'.repeat(64),Name:'/'+s.name,Image:s.image,Config:{Image:s.image,User:s.user,Labels:{'faraios.t19.bootstrap-nonce':nonce}},HostConfig:{NetworkMode:s.network,ReadonlyRootfs:true,Memory:536870912,MemorySwap:536870912,NanoCpus:1e9,PidsLimit:64,Privileged:false,PublishAllPorts:false,AutoRemove:false,RestartPolicy:{Name:'no'},Tmpfs:s.tmpfs,CapDrop:['ALL'],SecurityOpt:['no-new-privileges:true']},NetworkSettings:{Networks:{[network]:{NetworkID:'network-id'}},Ports:{}},Mounts:[]};return {s,x};
}
test('fixed creation bounds contain no restore, bind, published-port or pull capability',()=>{
 const {s}=specFixture();const a=createArgs(s,undefined,'/private/env-test/values.env');assert.equal(a[a.length-1],s.image);assert.ok(a.includes('/private/env-test/values.env'));assert.throws(()=>createArgs(s,undefined,'/dev/stdin'));assert.equal(a[a.indexOf('--pull')+1],'never');assert.equal(a[a.indexOf('--network')+1],network);
 for(const bad of ['--privileged','--publish','-p','--mount','--volume','--cap-add'])assert.ok(!a.includes(bad));assert.throws(()=>containerSpec(nonce,'postgres','host'));assert.throws(()=>containerSpec('bad','postgres',network));
});
test('inspect verifies isolation rather than trusting creation arguments',()=>{
 const {s,x}=specFixture();assert.ok(isolated(x,s,'network-id'));
 for(const change of [x=>x.HostConfig.ReadonlyRootfs=false,x=>x.HostConfig.Binds=['/root:/data'],x=>x.HostConfig.CapAdd=['SYS_ADMIN'],x=>x.HostConfig.MemorySwap=0,x=>x.HostConfig.NetworkMode='host',x=>x.NetworkSettings.Networks.extra={},x=>x.Config.User='0',x=>x.Config.Labels={},x=>x.HostConfig.PortBindings={'5432/tcp':[{}]},x=>x.Image='wrong',x=>x.Mounts=[{Type:'volume'}]]){const y=structuredClone(x);change(y);assert.equal(isolated(y,s,'network-id'),false);}
});
test('environment equality rejects duplicates and unknown entries, ignoring order only',()=>{
 assert.ok(environment(['A=1','B=2'],['B=2','A=1']));for(const values of [['A=1','A=1'],['A=2','B=2'],['A=1','B=2','EVIL=1'],['A']])assert.equal(environment(values,['A=1','B=2']),false);
});
function goodLedgers(){return {auth:[...['20171026211738','20171026211808','20171026211834','20180103212743','20180108183307','20180119214651','20180125194653'],...files.filter(f=>f.component==='auth'&&f.path.endsWith('.up.sql')).map(f=>f.path.split('/').at(-1).split('_')[0])],storage:[{id:0,name:'create-migrations-table'},...files.filter(f=>f.component==='storage'&&/\/migrations\/tenant\/\d+-/.test(f.path)).map(f=>({id:Number(f.path.split('/').at(-1).match(/^\d+/)[0]),name:f.path.split('/').at(-1).replace(/^\d+-|\.sql$/g,'')})).filter(f=>f.id<=73).sort((a,b)=>a.id-b.id)],indexes:['idx_users_email','idx_users_created_at_desc','idx_users_last_sign_in_at_desc','idx_users_name'].map(name=>({name,ready:true,valid:true}))};}
test('Storage 0074, a skipped 0073, missing Auth seed and invalid worker index all block compatibility',()=>{
 ledgerChecks(goodLedgers(),files);assert.equal(goodLedgers().storage.at(-1).name,FREEZE);
 for(const change of [x=>x.storage.push({id:74,name:'unlock-object-versioning'}),x=>x.storage.pop(),x=>x.storage[30].id=31,x=>x.auth.pop(),x=>x.auth.push(x.auth[0]),x=>x.indexes[0].ready=false]){const a=goodLedgers();change(a);assert.throws(()=>ledgerChecks(a,files));}
});
function platform(failure,cleanup=true){const calls=[];return {calls,record:async(k)=>calls.push('record:'+k),preflight:async()=>{calls.push('preflight');if(failure==='preflight')throw Error('PREFLIGHT_FAILED');},...Object.fromEntries(PHASES.map(p=>[p,async()=>{calls.push(p);if(failure===p)throw Error('PHASE_FAILED');}])),cleanup:async()=>{calls.push('cleanup');if(cleanup==='throw')throw Error('CLEANUP_FAILED');return cleanup;}};}
test('the state machine never proceeds past a failed compatibility phase and always reconciles',async()=>{
 for(const failure of ['preflight',...PHASES]){const p=platform(failure);const r=await runBootstrap(p);assert.equal(r.status,'FAIL');assert.ok(p.calls.includes('cleanup'));if(failure!=='preflight'){const i=PHASES.indexOf(failure);assert.deepEqual(r.stages,PHASES.slice(0,i));for(const after of PHASES.slice(i+1))assert.ok(!p.calls.includes(after));}assert.equal(r.checkpointUseAuthorized,false);assert.equal(r.restoreAttempted,false);}
});
test('success requires cleanup; unknown cleanup cannot be reported as PASS',async()=>{
 const r=await runBootstrap(platform());assert.equal(r.status,'SYNTHETIC_COMPATIBILITY_PASS');assert.equal(r.checkpointUseAuthorized,false);
 for(const c of [false,'throw'])assert.equal((await runBootstrap(platform(null,c))).status,'QUARANTINE');
});
test('a journal failure cannot leave a successful result',async()=>{const p=platform();p.record=async(k)=>{if(k==='result')throw Error('DISK_FULL');};assert.equal((await runBootstrap(p)).status,'QUARANTINE');});
test('deadline prevents starting later phases while preserving cleanup',async()=>{let tick=0;const p=platform(),r=await runBootstrap(p,{now:()=>tick++?900001:0});assert.equal(r.reason,'RUN_DEADLINE');assert.deepEqual(r.stages,[]);assert.ok(p.calls.includes('cleanup'));});
test('owner approval binds every input, current expiry and a distinct synthetic-only scope',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');const bindings={bundleSha256:'a',baselineSha256:'b',expectedSha256:'c',hostBootSha256:'d',daemonIdSha256:'e',context:'default',journalPath:'/root/test'};
 const receipt={scope:SCOPE,version:1,nonce,issuedAt:100,expiresAt:1000,...bindings};const key=publicKey.export({type:'spki',format:'pem'});const approval={receipt,ownerSignature:sign(null,Buffer.from(canonical(receipt)),privateKey).toString('base64')};
 assert.deepEqual(validateApproval(approval,bindings,key,500),receipt);assert.throws(()=>validateApproval(approval,bindings,key,1001));
 for(const k of Object.keys(bindings))assert.throws(()=>validateApproval(approval,{...bindings,[k]:'changed'},key,500));
 const bad=structuredClone(approval);bad.receipt.scope='t19-checkpoint-restore';assert.throws(()=>validateApproval(bad,bindings,key,500));
});
const cat=()=>({catalog:Object.fromEntries(CATALOG_KEYS.map(k=>[k,[]]))});
test('catalogue comparison fails on role/grantor, hash, extension helper or index-definition drift',()=>{const a=cat();assert.equal(compareCatalog(a,a).match,true);for(const k of Object.keys(a.catalog)){const b=structuredClone(a);b.catalog[k]=['changed'];assert.deepEqual(compareCatalog(b,a).differingComponents,[k]);}const b=cat();delete b.catalog.extensions;assert.throws(()=>compareCatalog(a,b));});
function tar(name,body,type='0'){
 const h=Buffer.alloc(512),b=Buffer.from(body);h.write(name);h.write('0000644\0',100);h.write('0000000\0',108);h.write('0000000\0',116);h.write(b.length.toString(8).padStart(11,'0')+'\0',124);h.fill(32,148,156);h.write(type,156);const sum=h.reduce((a,b)=>a+b,0);h.write(sum.toString(8).padStart(6,'0')+'\0 ',148);return Buffer.concat([h,b,Buffer.alloc((512-b.length%512)%512),Buffer.alloc(1024)]);
}
test('Docker copy parser validates checksums, paths and regular-file type',()=>{
 assert.equal(tarFiles(tar('dir/a.sql','select 1')).get('dir/a.sql').toString(),'select 1');for(const bytes of [tar('../escape','x'),tar('/root/x','x'),tar('link','x','2'),tar('link','x','1')])assert.throws(()=>tarFiles(bytes));const bad=tar('file','x');bad[0]=120;assert.throws(()=>tarFiles(bad));
});
test('daemon timeout differs from a known nonzero exit and fences subsequent mutations',async()=>{
 const spawnProcess=()=>{const p=new EventEmitter();p.stdin=new PassThrough();p.stdout=new PassThrough();p.stderr=new PassThrough();p.kill=()=>{setImmediate(()=>p.emit('close',null,'SIGKILL'));return true;};return p;};
 await assert.rejects(dockerProcess('/docker',{spawnProcess})(['container','create'],{timeoutMs:5}),e=>e.unknown===true&&e.message==='COMMAND_OUTCOME_UNKNOWN');
 let calls=0;const host=new Host({run:async()=>{calls++;return {code:0,stdout:Buffer.from('[]'),stderr:Buffer.alloc(0)};},dir:'/never',receipt:{nonce},expected:cat(),files,baseline:{}});host.unknown=true;
 await assert.rejects(host.command(['container','start','id']),/COMMANDS_FENCED/);assert.equal(calls,0);
 await host.command(['container','inspect','id']);assert.equal(calls,1);
});
test('new capture SQL runs against a real embedded PostgreSQL catalogue and remains read-only',async()=>{
 const pg=new PGlite();try{await pg.exec('CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE TABLE auth.schema_migrations(version text);CREATE TABLE storage.migrations(id int,name text,hash text);');const sql=await readFile(new URL('../scripts/t19-bootstrap-catalog.sql',import.meta.url),'utf8');const result=await pg.exec(sql);const captured=result.flatMap(x=>x.rows??[]).find(x=>x.jsonb_build_object)?.jsonb_build_object;assert.equal(captured.schemaVersion,1);assert.equal(captured.sourceProject,'xdmfyrsauvqznkloroxg');assert.equal(compareCatalog(captured,captured).match,true);assert.equal(Object.keys(captured.catalog.managed).length,17);assert.equal((await pg.query('SELECT count(*)::int AS n FROM storage.migrations')).rows[0].n,0);}finally{await pg.close();}
});
test('real cleanup adapter removes only inspected bound resources and quarantines changed ownership',async()=>{
 for(const mode of ['owned','foreign','unknown','created']){
  const privateDir=await mkdtemp(join(tmpdir(),'t19-cleanup-'));
  const {s,x}=specFixture();x.Config.Env=[];x.Config.Entrypoint=['docker-entrypoint.sh'];x.Config.Cmd=['postgres'];x.State={Running:true};
  if(mode==='created'){x.State={Status:'created',Running:false,Pid:0};x.NetworkSettings.Networks[network].NetworkID='';}
  let present=true;const mutations=[];const run=async a=>{
   let output='';if(a[0]==='container'&&a[1]==='inspect')output=JSON.stringify([x]);
   else if(a[0]==='container'&&a[1]==='stop'){mutations.push('stop');x.State.Running=false;}
   else if(a[0]==='container'&&a[1]==='rm'){mutations.push('rm');present=false;}
   else if(a[0]==='network'&&a[1]==='inspect')output=JSON.stringify([{Id:'network-id',Name:network,Internal:true,Labels:{'faraios.t19.bootstrap-nonce':nonce},Containers:present?{[x.Id]:{}}:{}}]);
   else if(a[0]==='network'&&a[1]==='rm')mutations.push('network-rm');
   else if(a[0]==='container'&&a[1]==='ls')output=present?(a.includes('--quiet')?x.Id:JSON.stringify({ID:x.Id,State:x.State.Running?'running':'exited',Names:s.name,Image:s.image})):'';
   return {code:0,stdout:Buffer.from(output),stderr:Buffer.alloc(0)};
  };
  const baseline={containers:[],networks:[],volumes:[]};const h=new Host({run,dir:privateDir,receipt:{nonce},expected:cat(),files,baseline});h.record=async()=>{};h.nets.set(network,'network-id');
  h.bound.set('postgres',{id:x.Id,s,expectedEnv:[],expectedEntrypoint:x.Config.Entrypoint,expectedCmd:x.Config.Cmd});
  if(mode==='foreign')x.Config.Labels={};if(mode==='unknown')h.unknown=true;
  const clean=await h.cleanup();assert.equal(clean,['owned','created'].includes(mode));assert.deepEqual(mutations,mode==='owned'?['stop','rm','network-rm']:mode==='created'?['rm','network-rm']:[]);await rm(privateDir,{recursive:true});
 }
});
test('Docker log inspection includes stderr readiness messages',async()=>{const h=new Host({run:async()=>({code:0,stdout:Buffer.from('init complete\n'),stderr:Buffer.from('server ready')}),dir:'/unused',receipt:{nonce},expected:cat(),files,baseline:{}});assert.equal((await h.command(['container','logs','id'])).toString(),'init complete\nserver ready');});
test('PostgreSQL logs cannot advance to SQL until the final socket answers readiness',async()=>{
 let probes=0,queries=0;const h=new Host({run:async a=>{assert.ok(a.includes('pg_isready'));probes++;return {code:probes===1?2:probes===2?1:0,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};},dir:'/unused',receipt:{nonce},expected:cat(),files,baseline:{}});
 h.create=async()=>{const b={id:'a'.repeat(64)};h.bound.set('postgres',b);return b;};h.audit=h.absent=h.start=h.record=async()=>{};h.assertBound=async()=>({State:{Running:true}});h.command=async()=>Buffer.from('temporary server ready\nPostgreSQL init process complete\ndatabase system is ready to accept connections');
 h.poll=async fn=>{for(let i=0;i<3;i++)if(await fn())return;assert.fail('readiness never completed');};h.sqlJSON=async()=>{queries++;assert.equal(probes,3);return {version:170011,bootstrap:true,managed:true,owners:2};};h.sql=async()=>{};
 await h.postgres();assert.equal(queries,1);assert.equal(probes,3);
});
test('Host.create gives the Docker client a private environment path and removes it after binding',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'t19-create-env-'));try{
  const {s,x}=specFixture();x.Config.Env=['BASE=value','OPAQUE_VALUE=synthetic-only'];x.Config.Cmd=['postgres'];x.Config.Entrypoint=['docker-entrypoint.sh'];let envPath;
  const run=async(a,options={})=>{let value;
   if(a[0]==='image')value=JSON.stringify([{Config:{Env:['BASE=value'],Cmd:x.Config.Cmd,Entrypoint:x.Config.Entrypoint}}]);
   else if(a[1]==='create'){envPath=a[a.indexOf('--env-file')+1];assert.notEqual(envPath,'/dev/stdin');assert.ok(!a.join(' ').includes('synthetic-only'));assert.ok(!options.stdin);assert.equal(await readFile(envPath,'utf8'),'OPAQUE_VALUE=synthetic-only\n');value=x.Id;}
   else value=JSON.stringify([x]);return {code:0,stdout:Buffer.from(value),stderr:Buffer.alloc(0)};
  };
  const h=new Host({run,dir,receipt:{nonce},expected:cat(),files,baseline:{}});h.record=async()=>{};h.nets.set(network,'network-id');const b=await h.create('postgres',{OPAQUE_VALUE:'synthetic-only'});assert.equal(b.id,x.Id);assert.ok(envPath);assert.deepEqual(await import('node:fs/promises').then(fs=>fs.readdir(dir)),[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('an empty network ID is accepted only for a declared, unstarted created container',()=>{
 const {s,x}=specFixture('sentinel');x.State={Status:'created',Running:false,Pid:0};const e=x.NetworkSettings.Networks[network];Object.assign(e,{NetworkID:'',EndpointID:'',IPAddress:'',GlobalIPv6Address:'',MacAddress:''});
 assert.equal(isolated(x,s,'network-id'),true);
 for(const change of [x=>x.State.Status='running',x=>x.State.Status='exited',x=>x.State.Running=true,x=>x.State.Pid=1,x=>x.NetworkSettings.Networks[network].NetworkID='foreign',x=>delete x.NetworkSettings.Networks[network].NetworkID,x=>x.NetworkSettings.Networks[network].EndpointID='active',x=>x.NetworkSettings.Networks[network].IPAddress='172.1.2.3',x=>x.NetworkSettings.Networks.extra={},x=>x.HostConfig.ReadonlyRootfs=false,x=>x.Config.Labels={}]){const y=structuredClone(x);change(y);assert.equal(isolated(y,s,'network-id'),false);}
 assert.equal(isolated(x,s,undefined),false);assert.equal(isolated(x,s,''),false);
});
test('start validates the real network attachment after Docker acknowledges startup',async()=>{
 for(const attached of [true,false]){const {s,x}=specFixture('sentinel');x.State={Status:'created',Running:false,Pid:0};x.NetworkSettings.Networks[network].NetworkID='';x.Config.Env=[];x.Config.Entrypoint=['node'];x.Config.Cmd=['sentinel'];let starts=0;
  const run=async a=>{if(a[1]==='start'){starts++;x.State={Status:'running',Running:true,Pid:123};x.NetworkSettings.Networks[network].NetworkID=attached?'network-id':'';return {code:0,stdout:Buffer.from(x.Id),stderr:Buffer.alloc(0)};}return {code:0,stdout:Buffer.from(JSON.stringify([x])),stderr:Buffer.alloc(0)};};
  const h=new Host({run,dir:'/unused',receipt:{nonce},files,expected:cat(),baseline:{}});h.nets.set(network,'network-id');const b={id:x.Id,s,expectedEnv:[],expectedEntrypoint:x.Config.Entrypoint,expectedCmd:x.Config.Cmd};
  if(attached)await h.start(b);else await assert.rejects(h.start(b),/CONTAINER_ISOLATION/);assert.equal(starts,1);
 }
});
