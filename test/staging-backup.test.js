import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, lstat, symlink, mkdir, rename, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { SOURCE, CLIENT_IMAGE, POOLER_HOST, ROOT_CERT_CONTAINER, ROOT_CERT_PATH, ROOT_CERT_SHA256, CLIENT_STARTED, verifyProviderCertificate, certificateMount, ensureClientImage, DUMPS, validateManifest, parseManifest, clientEnvironment, clientArgs, dumpSpec, parsePgManifest, cleanupClient, terminalFailure, sealBackup, openBackup, sha256, capture, verifyFile, run, privateDirectory, assertDataCoverage, assertCompleteDump, outsideGit, localDocker, windowsEnvironment, metadataFailureLabel } from '../scripts/backup-staging.mjs';

function manifest() {
 const tables=[...Array.from({length:15},(_,i)=>({schema:'public',table:'t'+i,rls:true,rows:i===0?2:0,sha256:'a'.repeat(64)})),...Array.from({length:2},(_,i)=>({schema:'audit',table:'t'+i,rls:true,rows:0,sha256:'b'.repeat(64)})),{schema:'auth',table:'users',rls:true,rows:3,sha256:'c'.repeat(64)},{schema:'supabase_migrations',table:'schema_migrations',rls:false,rows:21,sha256:'d'.repeat(64)}];
 return {database_major:17,business_ids:['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'],extensions:['btree_gist','pg_stat_statements','pgcrypto','plpgsql','supabase_vault','uuid-ossp'],extension_versions:{btree_gist:'1.7',pg_stat_statements:'1.11',pgcrypto:'1.3',plpgsql:'1.0',supabase_vault:'0.3.1','uuid-ossp':'1.1'},vault_secrets:0,storage_objects:0,storage_buckets:0,large_objects:0,unexpected_schemas:[],catalog_sha256:'e'.repeat(64),tables};
}

function sqlFile(name,m=manifest()) {
 let body='SELECT 1;\n';
 if(name==='schema.sql') body=m.tables.filter(t=>['public','audit'].includes(t.schema)).map(t=>'ALTER TABLE "'+t.schema+'"."'+t.table+'" ENABLE ROW LEVEL SECURITY;').join('\n');
 if(['data.sql','migration-data.sql'].includes(name)) body=m.tables.filter(t=>name==='migration-data.sql'?t.schema==='supabase_migrations':t.schema!=='supabase_migrations').map(t=>'COPY "'+t.schema+'"."'+t.table+'" (id) FROM stdin;\n'+Array.from({length:t.rows},(_,i)=>String(i)+'\tRéka 😀').join('\n')+(t.rows?'\n':'')+'\\.\n').join('');
 const marker='-- PostgreSQL database '+(name==='roles.sql'?'cluster ':'')+'dump';
 return marker+'\n'+body+'\n'+marker+' complete\n';
}

function payload(m=manifest()) {
 const files=DUMPS.map(([name])=>{const content=sqlFile(name,m);return {name,content,sha256:sha256(content)};});
 const content=JSON.stringify({before:m,after:m});files.push({name:'manifest.json',content,sha256:sha256(content)});
 return {source:SOURCE,files};
}

async function home(t) {
 // Windows runner TEMP uses an 8.3 alias; production intentionally requires a
 // canonical private root, so resolve the synthetic fixture before testing it.
 const p=await realpath(await mkdtemp(join(tmpdir(),'faraios-backup-test-')));
 t.after(()=>rm(p,{recursive:true,force:true}));return p;
}

function mockRunner({change=false,failName,missingAuth=false,calls=[]}={}) {
 let queries=0;
 return async (command,args,opts)=>{
  if(command!=='docker')return run(command,args,opts); // Real Windows ACL verification.
  if(args[0]==='image')return {stdout:'sha256:'+'a'.repeat(64)+'\n',stderr:''};
  if(args[0]==='info')return {stdout:'linux\n',stderr:''};
  if(args[0]==='ps'||args[0]==='rm')return {stdout:'',stderr:''};
  if(args[0]==='context') {
   if(args[1]==='show')return {stdout:'desktop-linux\n',stderr:''};
   return {stdout:JSON.stringify(process.platform==='win32'?'npipe:////./pipe/dockerDesktopLinuxEngine':'unix:///var/run/docker.sock'),stderr:''};
  }
  assert.equal(args[0],'run');
  calls.push({command,args,env:{...opts.env},cwd:opts.cwd});
  assert.equal(opts.env.PGPASSWORD,'synthetic private password');
  assert.equal(opts.env.PGSSLMODE,'verify-full');assert.equal(opts.env.PGSSLROOTCERT,ROOT_CERT_CONTAINER);
  assert.equal(opts.env.PGHOST,POOLER_HOST);assert.equal(opts.env.PGUSER,'postgres.'+SOURCE);assert.equal(opts.env.PGPORT,'5432');
  assert.ok(!args.some(a=>a.includes('synthetic private password')));
  assert.ok(args.includes(CLIENT_IMAGE));assert.equal(args[args.indexOf('--log-driver')+1],'none');
  const step=args[args.indexOf('--name')+1].replace(/^faraios-t11-[a-f0-9]{32}-/,'');
  const m=manifest();
  if(step==='metadata') {
   assert.equal(opts.failureContext,'pg-client');assert.ok(opts.input.startsWith('begin transaction'));
   if(change&&queries++>0)m.tables[0].sha256='f'.repeat(64);
   return {stdout:JSON.stringify(m)+'\n',stderr:''};
  }
  assert.equal(opts.input,undefined);
  const name=step+'.sql';assert.ok(DUMPS.some(([n])=>n===name));
  if(name===failName)throw new Error('untrusted error with synthetic private password');
  let text=sqlFile(name,m);if(missingAuth&&name==='data.sql')text='SELECT 1;';
  return {stdout:text,stderr:'sensitive child diagnostics are never printed'};
 };
}

test('source scope fails closed for foreign IDs, new schemas, storage, Vault, missing history or lost RLS',()=>{
 validateManifest(manifest());
 for(const mutate of [m=>m.business_ids.reverse(),m=>m.unexpected_schemas=['new_private'],m=>m.storage_objects=1,m=>m.vault_secrets=1,m=>m.tables[0].rls=false,m=>m.tables=m.tables.filter(t=>t.schema!=='supabase_migrations'),m=>m.extensions.push('pg_net'),m=>m.tables[0].rows=-1]) {
  const m=manifest();mutate(m);assert.throws(()=>validateManifest(m));
 }
});

test('manifest parser accepts only the explicit single-row JSON contract',()=>{
 const m=manifest();assert.deepEqual(parseManifest(JSON.stringify([{manifest:m}])),m);
 assert.deepEqual(parseManifest(JSON.stringify({rows:[{manifest:m}]})),m);
 for(const s of ['diagnostic',JSON.stringify([]),JSON.stringify([{manifest:m},{manifest:m}]),JSON.stringify({manifest:m})])assert.throws(()=>parseManifest(s));
});

test('password remains in child env; project, profile, PG, host and image overrides are removed',()=>{
 const env=clientEnvironment('secret',{PATH:'safe',SUPABASE_DB_PASSWORD:'old',SUPABASE_PROJECT_ID:'wrong',SUPABASE_PROFILE:'wrong.yaml',SUPABASE_API_URL:'https://wrong.invalid',SUPABASE_INTERNAL_IMAGE_REGISTRY:'wrong',PGHOST:'wrong',PGPASSWORD:'old',SUPABASE_HOME:'/private/cli-home'});
 assert.equal(env.PGPASSWORD,'secret');assert.equal(env.SUPABASE_HOME,undefined);assert.equal(env.PGHOST,POOLER_HOST);assert.equal(env.PGSSLMODE,'verify-full');assert.equal(env.PGSSLROOTCERT,ROOT_CERT_CONTAINER);
 for(const k of ['SUPABASE_PROJECT_ID','SUPABASE_PROFILE','SUPABASE_API_URL','SUPABASE_INTERNAL_IMAGE_REGISTRY'])assert.equal(env[k],undefined);
 for(const p of ['',null,'a\nb','a\0b'])assert.throws(()=>clientEnvironment(p));
});

test('container commands enforce source-bound verified TLS, fixed image, no log output or credential arguments',()=>{
 const env=clientEnvironment('secret',{PATH:'safe',pgsslmode:'disable',SSL_CERT_FILE:'/bad',PGSERVICE:'bad'});
 assert.equal(env.pgsslmode,undefined);assert.equal(env.SSL_CERT_FILE,undefined);assert.equal(env.PGSERVICE,undefined);
 for(const [name] of DUMPS) {
  const spec=dumpSpec(name),args=clientArgs('a'.repeat(32),name.replace('.sql',''),spec.script,{...env,...spec.env});
  assert.ok(!args.includes('secret'));assert.ok(args.includes('PGSSLMODE'));assert.ok(args.includes('PGSSLROOTCERT'));assert.ok(args.includes('PGGSSENCMODE'));
  assert.equal(args[args.indexOf('--entrypoint')+1],'/bin/bash');assert.ok(args.includes('--read-only'));assert.ok(args.includes(CLIENT_IMAGE));
 }
 assert.throws(()=>dumpSpec('other.sql'));assert.throws(()=>clientArgs('invalid','metadata','',env));
 assert.deepEqual(parsePgManifest(JSON.stringify(manifest())+'\n'),manifest());
 for(const bad of ['not json',JSON.stringify(manifest())+'\n'+JSON.stringify(manifest()),JSON.stringify([manifest()])])assert.throws(()=>parsePgManifest(bad));
 assert.deepEqual(windowsEnvironment({FARAIOS_BACKUP_ACL_PATH:'private'},{PSModulePath:'pwsh7',psmodulepath:'other',PATH:'trusted'}),{PATH:'trusted',FARAIOS_BACKUP_ACL_PATH:'private'});
});

test('authenticated encryption preserves Unicode SQL and rejects key, ciphertext, tag and source/header changes',()=>{
 const key=randomBytes(32),id='1'.repeat(32),p=payload();
 const bytes=sealBackup(p,key,id);assert.deepEqual(openBackup(bytes,key).payload,p);
 assert.ok(!bytes.toString().includes('Réka'));assert.throws(()=>openBackup(bytes,randomBytes(32)));
 for(const alter of [e=>e.source='other',e=>e.id='2'.repeat(32),e=>e.tag=Buffer.alloc(16).toString('base64'),e=>e.ciphertext=Buffer.alloc(64).toString('base64')]) {
  const e=JSON.parse(bytes);alter(e);assert.throws(()=>openBackup(Buffer.from(JSON.stringify(e)),key));
 }
});

test('archive validation rejects missing files, false checksums and inconsistent manifests even with a valid encryption key',()=>{
 const key=randomBytes(32),id='3'.repeat(32);
 for(const alter of [p=>p.files.pop(),p=>p.files[0].sha256='0'.repeat(64),p=>{const f=p.files.at(-1),m=JSON.parse(f.content);m.after.catalog_sha256='f'.repeat(64);f.content=JSON.stringify(m);f.sha256=sha256(f.content);}]) {
  const p=payload();alter(p);assert.throws(()=>openBackup(sealBackup(p,key,id),key));
 }
});

test('coverage requires Auth rows, application rows, migration history and every app/audit RLS declaration',()=>{
 const m=manifest(),p=payload(m);assertDataCoverage(p.files,m);
 for(const name of ['data.sql','migration-data.sql','schema.sql']) {
  const files=structuredClone(p.files);files.find(f=>f.name===name).content='SELECT 1;';
  assert.throws(()=>assertDataCoverage(files,m));
 }
});

test('successful capture verifies the encrypted archive, separates keys and removes its static workdir',async t=>{
 const p=await home(t),calls=[];
 const report=await capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:mockRunner({calls})});
 assert.equal(report.encryptedLocalVerification,'PASSED');assert.equal(report.privateWorkdirCleanup,'PASSED');assert.equal(report.helperPlaintextSQLFiles,'NEVER_WRITTEN');assert.equal(report.offsiteBackup,'PENDING');assert.equal(report.restore,'NOT_RUN');
 assert.ok(report.keyPath.startsWith(join(p,'.faraios-recovery-keys')));assert.ok(!report.keyPath.startsWith(join(p,'.faraios-backups')));
 assert.equal((await verifyFile(report.artifact,join(p,'.faraios-recovery-keys'))).sha256,report.sha256);
 assert.deepEqual((await readdir(join(report.artifact,'..'))).sort(),[report.artifact.split(/[\\/]/).at(-1),report.artifact.split(/[\\/]/).at(-1)+'.sha256'].sort());
 assert.equal(calls.length,8);assert.equal(calls.filter(c=>!c.args[c.args.indexOf('--name')+1].endsWith('-metadata')).length,6);
 const key=await readFile(report.keyPath),opened=openBackup(await readFile(report.artifact),key);
 assert.ok(opened.payload.files.find(f=>f.name==='data.sql').content.includes('Réka 😀'));
});

test('concurrent source changes abort before creating a key or ready archive',async t=>{
 const p=await home(t),messages=[];
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:mockRunner({change:true}),progress:x=>messages.push(x)}),{code:'SOURCE_CHANGED_DURING_BACKUP'});
 assert.deepEqual(await readdir(join(p,'.faraios-recovery-keys')),[]);
 assert.ok(messages.at(-1).includes('Do not upload'));assert.ok(!messages.join('').includes('synthetic private password'));
});

test('failed or incomplete dumps never produce a verified archive and never disclose child diagnostics',async t=>{
 for(const options of [{failName:'data.sql'},{missingAuth:true}]) {
  const p=await home(t),messages=[];
  await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:mockRunner(options),progress:x=>messages.push(x)}),e=>!e.message.includes('synthetic private password'));
  assert.deepEqual(await readdir(join(p,'.faraios-recovery-keys')),[]);assert.ok(messages.at(-1).includes('Do not upload'));
 }
});

test('private output directories reject symlinks and broad POSIX permissions',async t=>{
 const p=await home(t),target=join(p,'target'),link=join(p,'link');await mkdir(target,{mode:0o700});
 await symlink(target,link,process.platform==='win32'?'junction':'dir');await assert.rejects(privateDirectory(link));
 if(process.platform!=='win32') {const broad=join(p,'broad');await mkdir(broad,{mode:0o755});await assert.rejects(privateDirectory(broad),{code:'PRIVATE_PERMISSIONS_FAILED'});}
});

test('child failures discard arbitrary stdout/stderr and return only fixed labels',async()=>{
 await assert.rejects(run(process.execPath,['-e','console.log("synthetic secret");console.error("another synthetic secret");process.exit(1)']),e=>e.code==='CHILD_FAILED'&&!e.message.includes('secret'));
});

test('cancellation cannot produce a ready archive and child cancellation is bounded',async t=>{
 const p=await home(t),controller=new AbortController();controller.abort();
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:mockRunner(),signal:controller.signal}),{code:'BACKUP_CANCELLED'});
 assert.deepEqual(await readdir(p),[]);
 const running=new AbortController();
 const child=run(process.execPath,['-e','setTimeout(()=>{},60000)'],{signal:running.signal});
 running.abort();await assert.rejects(child,{code:'BACKUP_CANCELLED'});
});

test('COPY coverage rejects empty bodies, wrong row counts, missing terminators and concatenated retry attempts',()=>{
 const m=manifest(),p=payload(m);
 for(const edit of [s=>s.replace('0\tRéka 😀\n',''),s=>s.replaceAll('\\.\n',''),s=>s+s]) {
  const files=structuredClone(p.files);const f=files.find(f=>f.name==='data.sql');f.content=edit(f.content);assert.throws(()=>assertDataCoverage(files,m));
 }
 for(const [name] of DUMPS) {
  const s=sqlFile(name);assertCompleteDump(name,s);
  for(const broken of [s+s,s.replace(/-- PostgreSQL database (cluster )?dump complete/g,''),s.slice(s.indexOf('\n')+1)])assert.throws(()=>assertCompleteDump(name,broken));
 }
});

test('canonical private boundaries reject an ancestor Git checkout and directory replacement before encryption',async t=>{
 const p=await home(t),repo=join(p,'repo'),nested=join(repo,'home');await mkdir(repo);await mkdir(join(repo,'.git'));await mkdir(nested);
 await assert.rejects(outsideGit(nested),{code:'PRIVATE_PATH_IN_GIT'});
 const backupRoot=join(p,'.faraios-backups'),moved=join(p,'moved'),runner=mockRunner();let swapped=false;
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:async(command,args,opts)=>{
  if(command==='docker'&&args[0]==='run'&&!args[args.indexOf('--name')+1].endsWith('-metadata')&&!swapped){swapped=true;await rename(backupRoot,moved);await symlink(repo,backupRoot,process.platform==='win32'?'junction':'dir');}
  return runner(command,args,opts);
 }}));
 assert.deepEqual(await readdir(repo),['.git','home']);assert.deepEqual(await readdir(join(p,'.faraios-recovery-keys')),[]);
});

test('Docker environment overrides are removed and remote contexts fail before any credentialed database child',async()=>{
 const env=clientEnvironment('secret',{DOCKER_HOST:'tcp://remote:2375',DOCKER_CONTEXT:'remote',DOCKER_CONFIG:'/wrong',PATH:process.env.PATH});
 for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG'])assert.equal(env[k],undefined);
 let calls=0;
 await assert.rejects(localDocker(env,async(command,args)=>{calls++;return {stdout:args[1]==='show'?'remote\n':JSON.stringify('ssh://remote.invalid'),stderr:''};}),{code:'DOCKER_CONTEXT_NOT_LOCAL'});
 assert.equal(calls,2);
});

test('runner deadline settles when an owned descendant holds inherited pipes open',async()=>{
 const descendant='setTimeout(()=>{},5000)';
 const parent='require("node:child_process").spawn(process.execPath,["-e",'+JSON.stringify(descendant)+'],{stdio:"inherit"});setTimeout(()=>{},5000)';
 const started=Date.now();await assert.rejects(run(process.execPath,['-e',parent],{timeout:250}),{code:'CHILD_TIMEOUT'});
 assert.ok(Date.now()-started<2500);
});


test('key boundary replacement stops before encryption and public key permissions fail retrieval',async t=>{
 const p=await home(t),keyRoot=join(p,'.faraios-recovery-keys'),moved=join(p,'moved-keys'),foreign=join(p,'foreign');
 await mkdir(foreign,{mode:0o700});const runner=mockRunner();let swapped=false;
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:async(command,args,opts)=>{
  if(command==='docker'&&args[0]==='run'&&!args[args.indexOf('--name')+1].endsWith('-metadata')&&!swapped){swapped=true;await rename(keyRoot,moved);await symlink(foreign,keyRoot,process.platform==='win32'?'junction':'dir');}
  return runner(command,args,opts);
 }}));
 assert.deepEqual(await readdir(foreign),[]);assert.deepEqual(await readdir(moved),[]);
 const q=await home(t),report=await capture({home:q,password:'synthetic private password',npmPath:join(q,'npm-cli.js'),runner:mockRunner()});
 if(process.platform!=='win32') {
  const {chmod}=await import('node:fs/promises');await chmod(report.keyPath,0o644);
  await assert.rejects(verifyFile(report.artifact,join(q,'.faraios-recovery-keys')),{code:'KEY_FILE_PERMISSIONS_UNSAFE'});
 } else {
  // Deliberately loosen only this disposable synthetic key; verification must
  // refuse it without repairing its DACL or reading any key bytes.
  const script="$ErrorActionPreference='Stop'; $a=[System.IO.File]::GetAccessControl($env:FARAIOS_SYNTHETIC_KEY); $sid=[System.Security.Principal.SecurityIdentifier]::new('S-1-5-11'); $r=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::Read,[System.Security.AccessControl.AccessControlType]::Allow); $a.AddAccessRule($r); [System.IO.File]::SetAccessControl($env:FARAIOS_SYNTHETIC_KEY,$a); 'SYNTHETIC_ACL_LOOSENED'";
  await run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{timeout:60000,env:windowsEnvironment({FARAIOS_SYNTHETIC_KEY:report.keyPath})});
  await assert.rejects(verifyFile(report.artifact,join(q,'.faraios-recovery-keys')),{code:'PRIVATE_ACL_UNSAFE'});
 }
});

test('cancellation during final workdir removal cannot return a PASSED report',async t=>{
 const p=await home(t),controller=new AbortController();let cleanupRan=false;
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:mockRunner(),signal:controller.signal,removeWorkdir:async path=>{await rm(path,{recursive:true});cleanupRan=true;controller.abort();}}),{code:'BACKUP_CANCELLED'});
 assert.equal(cleanupRan,true);
});


test('abort during local preflight stops the next Docker or Windows ACL child',async t=>{
 const p=await home(t),controller=new AbortController(),runner=mockRunner();let localCalls=0,dbCalls=0;
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),signal:controller.signal,runner:async(command,args,options)=>{
  if(command==='docker'&&args[0]==='run')dbCalls++;
  if(command==='docker'||command==='powershell.exe') {
   localCalls++;assert.equal(options.signal,controller.signal);controller.abort();
   return {stdout:command==='docker'?'desktop-linux':'PRIVATE_ACL_SET',stderr:''};
  }
  return runner(command,args,options);
 }}),{code:'BACKUP_CANCELLED'});
 assert.equal(localCalls,1);assert.equal(dbCalls,0);
});


test('metadata diagnostics map upstream text to fixed observations and discard all interpolated content',()=>{
 const cases=[
  ['Access token not provided. Supply an access token by running supabase login','METADATA_LOGIN_REQUIRED'],
  ['unexpected status 403: private provider body','METADATA_API_ACCESS_DENIED'],
  ['unexpected status 404: private provider body','METADATA_PROJECT_NOT_FOUND'],
  ['IPv6 is not supported on your current network','METADATA_IPV6_UNAVAILABLE'],
  ['SELF_SIGNED_CERT_IN_CHAIN','METADATA_TLS_FAILED'],
  ['request failed: ECONNRESET','METADATA_NETWORK_FAILED'],
  ['password authentication failed for user private-user','METADATA_DATABASE_AUTH_FAILED'],
  ['failed to read SQL file: private-path','METADATA_SQL_FILE_UNREADABLE'],
  ['failed to read profile: Unsupported Config Type','METADATA_CONFIG_INVALID'],
  ['unknown flag --private-argument','METADATA_CLI_COMMAND_INVALID'],
  ['Cannot find module private-module','METADATA_CLI_LAUNCH_FAILED'],
  ['unexpected status 400: private query error SQLSTATE 42601','METADATA_QUERY_FAILED'],
  ['unrecognized private response','METADATA_UNCLASSIFIED'],
 ];
 for(const [upstream,label] of cases) {
  for(const text of [upstream,'\u001b[31m'+upstream+'\u001b[0m']) {
   const observation=metadataFailureLabel(text+' synthetic-private-password private-auth-row');
   assert.equal(observation,label);assert.ok(!observation.includes('private'));
  }
 }
});

test('real child metadata failures expose no raw output and preserve timeout/cancellation labels',async()=>{
 const args=['-e','console.log("private stdout");console.error("unexpected status 403: private password and Auth rows");process.exit(1)'];
 await assert.rejects(run(process.execPath,args,{failureContext:'metadata'}),error=>{
  assert.equal(error.code,'METADATA_API_ACCESS_DENIED');assert.equal(error.message,error.code);
  assert.deepEqual(Object.keys(error),['code']);assert.ok(!JSON.stringify(error).includes('private'));return true;
 });
 await assert.rejects(run(process.execPath,args),{code:'CHILD_FAILED'});
 await assert.rejects(run(process.execPath,['-e','console.error("private unknown error");process.exit(1)'],{failureContext:'metadata'}),{code:'METADATA_UNCLASSIFIED'});
 await assert.rejects(run(process.execPath,['-e','setTimeout(()=>{},60000)'],{failureContext:'metadata',timeout:100}),{code:'CHILD_TIMEOUT'});
 const controller=new AbortController();const child=run(process.execPath,['-e','setTimeout(()=>{},60000)'],{failureContext:'metadata',signal:controller.signal});controller.abort();
 await assert.rejects(child,{code:'BACKUP_CANCELLED'});
});

test('a metadata diagnostic stops capture before dumps, keys or archives',async t=>{
 const p=await home(t),runner=mockRunner();let databaseCalls=0;
 await assert.rejects(capture({home:p,password:'synthetic private password',npmPath:join(p,'npm-cli.js'),runner:async(command,args,options)=>{
  if(command==='docker'&&args[0]==='run') {
   databaseCalls++;assert.equal(options.failureContext,'pg-client');assert.ok(options.input.startsWith('begin transaction'));
   return run(process.execPath,['-e','console.error("FARAIOS_T11_POSTGRES_CLIENT_STARTED\\nrequest failed: ECONNRESET private request details");process.exit(1)'],{failureContext:options.failureContext});
  }
  return runner(command,args,options);
 }}),{code:'METADATA_NETWORK_FAILED'});
 assert.equal(databaseCalls,1);assert.deepEqual(await readdir(join(p,'.faraios-recovery-keys')),[]);
 const work=join(p,'.faraios-backups',(await readdir(join(p,'.faraios-backups')))[0]);
 assert.deepEqual(await readdir(work),['private-export']);
});


test('owned container cleanup is bounded, checks exact run/name and refuses ambiguous matches',async()=>{
 const id='a'.repeat(32),calls=[];let lists=0;
 await cleanupClient(id,'metadata',{},async(cmd,args,opts)=>{
  calls.push(args);assert.equal(cmd,'docker');assert.equal(opts.signal,undefined);assert.equal(opts.timeout,10000);
  return {stdout:args[0]==='ps'&&lists++===0?'b'.repeat(12):'',stderr:''};
 });
 assert.ok(calls[0].includes('label=com.faraios.t11.run='+id));assert.ok(calls[0].includes('name=^/faraios-t11-'+id+'-metadata$'));
 assert.deepEqual(calls[1],['rm','--force','b'.repeat(12)]);
 await assert.rejects(cleanupClient(id,'metadata',{},async()=>({stdout:'ambiguous\nmatch'})),{code:'CONTAINER_CLEANUP_FAILED'});
});

test('stdin-only query runner accepts input and does not place query bytes into argv',async()=>{
 const text='private synthetic input';
 const result=await run(process.execPath,['-e','process.stdin.pipe(process.stdout)'],{input:text});assert.equal(result.stdout,text);
});


test('daemon cleanup failure blocks capture before keys or a success report',async t=>{
 const p=await home(t),runner=mockRunner();
 await assert.rejects(capture({home:p,password:'synthetic private password',runner:async(command,args,options)=>{
  if(command==='docker'&&args[0]==='ps')throw new Error('private daemon response');
  return runner(command,args,options);
 }}),{code:'CONTAINER_CLEANUP_FAILED'});
 assert.deepEqual(await readdir(join(p,'.faraios-recovery-keys')),[]);
});


test('cleanup failure retains its operator label after cancellation while other aborted errors are normalized',async t=>{
 const p=await home(t),runner=mockRunner(),controller=new AbortController();
 let observed;
 try {
  await capture({home:p,password:'synthetic private password',signal:controller.signal,runner:async(command,args,options)=>{
   if(command==='docker'&&args[0]==='run')controller.abort();
   if(command==='docker'&&args[0]==='ps')throw new Error('private daemon response');
   return runner(command,args,options);
  }});
 } catch(error) {observed=terminalFailure(error,controller.signal);}
 assert.equal(observed?.code,'CONTAINER_CLEANUP_FAILED');assert.equal(observed.message,observed.code);
 assert.equal(terminalFailure(new Error('private aborted detail'),controller.signal).code,'BACKUP_CANCELLED');
 assert.deepEqual(await readdir(join(p,'.faraios-recovery-keys')),[]);
});


test('provider CA is pinned, self-signed, current and mounted read-only without accepting another trust anchor',async t=>{
 const result=await verifyProviderCertificate();assert.equal(result.sha256,ROOT_CERT_SHA256);
 const p=await home(t),copy=join(p,'other.crt');await writeFile(copy,(await readFile(ROOT_CERT_PATH,'utf8')).replace('MIID','NIID'));
 await assert.rejects(verifyProviderCertificate(copy),{code:'PROVIDER_CA_INVALID'});
 await assert.rejects(verifyProviderCertificate(ROOT_CERT_PATH,Date.parse('2032-01-01')),{code:'PROVIDER_CA_INVALID'});
 await writeFile(copy,(await readFile(ROOT_CERT_PATH,'utf8'))+(await readFile(ROOT_CERT_PATH,'utf8')));
 await assert.rejects(verifyProviderCertificate(copy),{code:'PROVIDER_CA_INVALID'});
 const special=join(p,'comma, and "quote".crt'),mount=certificateMount(special);
 assert.ok(mount.includes('"src='+special.replaceAll('"','""')+'"'));assert.ok(mount.endsWith(',dst='+ROOT_CERT_CONTAINER+',readonly'));
 assert.throws(()=>certificateMount('relative.crt'));
 const args=clientArgs('a'.repeat(32),'metadata','exec psql',clientEnvironment('secret'));
 assert.equal(args[args.indexOf('--mount')+1],certificateMount());
});

test('image acquisition is credential-free and registry certificate errors retain an image-stage label',async()=>{
 const env=clientEnvironment('private-password');let calls=0;
 await assert.rejects(ensureClientImage(env,async(command,args,options)=>{
  calls++;assert.equal(command,'docker');assert.ok(!Object.keys(options.env).some(k=>/^PG/i.test(k)));
  assert.ok(!args.includes('private-password'));
  throw new Error('certificate verify failed private registry diagnostics');
 }),{code:'CLIENT_IMAGE_FETCH_FAILED'});
 assert.equal(calls,2);
});

test('only a started container can classify PostgreSQL TLS text; raw output stays private',async()=>{
 const body='console.error("certificate verify failed private details");process.exit(1)';
 await assert.rejects(run(process.execPath,['-e',body],{failureContext:'pg-client'}),{code:'CLIENT_CONTAINER_START_FAILED'});
 const started='console.error('+JSON.stringify(CLIENT_STARTED)+');'+body;
 await assert.rejects(run(process.execPath,['-e',started],{failureContext:'pg-client'}),{code:'METADATA_TLS_FAILED'});
 // The command text alone is not the standalone runtime marker.
 await assert.rejects(run(process.execPath,['-e','console.error('+JSON.stringify("printf '%s\\n' '"+CLIENT_STARTED+"' >&2")+');'+body],{failureContext:'pg-client'}),{code:'CLIENT_CONTAINER_START_FAILED'});
});
