// Real Docker adapter. Fixed synthetic resources only; no hosted/restore client.
import {spawn} from 'node:child_process';
import {readFile,open,lstat,realpath,statfs} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {createPublicKey,verify,randomBytes,createHmac} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {canonical,digest,requireTrue,validNonce,containerSpec,createArgs,isolated,environment,tarFiles,ledgerChecks,INDEXES,FREEZE,IMAGES,LABEL,SCOPE,runBootstrap} from './t19-bootstrap-engine.mjs';
import {withEnvironmentFile,environmentFilesAbsent} from './t19-bootstrap-env.mjs';
import {STORAGE_TENANT_MIGRATE_CODE} from './t19-storage-tenant-migrate.mjs';
import {compareStructure} from './t19-custody-recovery-compare.mjs';
export const CATALOG_KEYS=['managed','roles','memberships','extensions','extensionFunctions','events','authLedger','storageLedger','indexStates','views','parameterACL','databaseACL'];
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const NODE_SHA='e32e2d16081cf644f88392934288086e7662529d0d43277c34f7aad2207cfafb';
const DOCKER_SHA='cb92457611ccecae73e395a97673de28e397eaf020f807d91153960bbfe41b01';
const TRUST='/etc/faraios/t19-gate2-trust.json';
const SOURCES=['test-support/t19-managed-final/overlay.sql','config/t19-bootstrap-images.json','scripts/t19-storage-tenant-migrate.mjs','test-support/t19-bootstrap-helpers/overlay.sql','test-support/t19-realtime-bootstrap/tenant_db_dump_17.sql','scripts/t19-bootstrap-env.mjs','scripts/t19-bootstrap-engine.mjs','scripts/t19-bootstrap-host.mjs','scripts/t19-bootstrap-catalog.sql','config/t19-bootstrap-files.json','scripts/restore-catalog.sql','scripts/t19-custody-recovery-compare.mjs','test-support/t19-custody-recovery-expected.json','docs/proposals/t19-inactive-custody-recovery.sql','docs/proposals/t19-inactive-custody-recovery-readback.sql'];
export async function bundleDigest(){return digest(await Promise.all(SOURCES.map(async p=>[p,digest(await readFile(join(ROOT,p)))])));}
export async function protectedPath(path,directory=false){
 const p=resolve(path);requireTrue(await realpath(p)===p,'PROTECTED_PATH_SYMLINK');
 for(let c=p;;c=dirname(c)){const s=await lstat(c);requireTrue(s.uid===0&&!(s.mode&0o022)&&!s.isSymbolicLink(),'PROTECTED_PATH_UNSAFE');if(c===p)requireTrue(directory?s.isDirectory():s.isFile(),'PROTECTED_PATH_TYPE');if(dirname(c)===c)break;}
 return p;
}
async function durable(dir,name,value){
 requireTrue(/^[a-z0-9.-]+$/.test(name),'JOURNAL_NAME');const h=await open(join(dir,name),'wx',0o600);
 try{await h.writeFile(canonical(value));await h.sync();}finally{await h.close();}
 const d=await open(dir,'r');try{await d.sync();}finally{await d.close();}
}
// The exit code and timeout are different: a timeout leaves daemon outcome unknown.
export function dockerProcess(binary,{spawnProcess=spawn}={}){
 return (args,{stdin='',timeoutMs=10000,maxBytes=8388608}={})=>new Promise((res,rej)=>{
  let child,timer,killTimer,unknown=false,done=false,count=0;const out=[],err=[];
  const finish=(e,code,signal)=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(killTimer);const value={stdout:Buffer.concat(out),stderr:Buffer.concat(err),code,signal};if(e){e.evidence=value;e.unknown=unknown;rej(e);}else res(value);};
  const stop=()=>{if(unknown||done)return;unknown=true;try{child.kill('SIGKILL');}catch{}killTimer=setTimeout(()=>finish(Error('COMMAND_KILL_UNKNOWN')),1000);};
  try{child=spawnProcess(binary,['--context','default',...args],{shell:false,env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C'},stdio:['pipe','pipe','pipe']});}catch{return finish(Error('COMMAND_SPAWN_FAILED'));}
  timer=setTimeout(stop,timeoutMs);
  for(const [stream,list] of [[child.stdout,out],[child.stderr,err]])stream.on('data',b=>{if(done||unknown)return;count+=b.length;if(count>maxBytes)stop();else list.push(b);});
  child.stdin.on('error',stop);child.on('error',()=>finish(Error('COMMAND_SPAWN_FAILED')));child.on('close',(code,signal)=>{if(signal)unknown=true;finish(unknown?Error('COMMAND_OUTCOME_UNKNOWN'):null,code,signal);});child.stdin.end(stdin);
 });
}
export function validateApproval(approval,bindings,key,now=Date.now()){
 const r=approval?.receipt;const keys=['scope','version','nonce','issuedAt','expiresAt',...Object.keys(bindings)].sort();
 requireTrue(r&&canonical(Object.keys(r).sort())===canonical(keys)&&r.scope===SCOPE&&r.version===1,'APPROVAL_SHAPE');validNonce(r.nonce);
 requireTrue(Object.entries(bindings).every(([k,v])=>r[k]===v),'APPROVAL_BINDING');
 requireTrue(Number.isSafeInteger(r.issuedAt)&&Number.isSafeInteger(r.expiresAt)&&r.issuedAt<=now&&r.expiresAt>now&&r.expiresAt-r.issuedAt<=900000&&r.expiresAt>r.issuedAt,'APPROVAL_EXPIRED');
 const pub=createPublicKey(key);requireTrue(pub.asymmetricKeyType==='ed25519','OWNER_KEY_TYPE');
 requireTrue(typeof approval.ownerSignature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(approval.ownerSignature)&&verify(null,Buffer.from(canonical(r)),pub,Buffer.from(approval.ownerSignature,'base64')),'OWNER_SIGNATURE');return r;
}
export function compareCatalog(actual,expected){
 const a=actual?.catalog,b=expected?.catalog;requireTrue(a&&b&&canonical(Object.keys(b).sort())===canonical([...CATALOG_KEYS].sort()),'CATALOG_SHAPE');
 const differingComponents=[...new Set([...Object.keys(a),...Object.keys(b)])].sort().filter(k=>canonical(a[k])!==canonical(b[k]));
 return {match:differingComponents.length===0,differingComponents};
}
export function verifyImageLineage(image,ancestors,policy){
 requireTrue(image?.Id===policy?.imageId&&image.Os==='linux'&&image.Architecture==='amd64'&&image.RootFS?.Layers?.length===policy.layers,'IMAGE_LINEAGE_IDENTITY');
 requireTrue(Array.isArray(policy.ancestors)&&ancestors.length===policy.ancestors.length,'IMAGE_LINEAGE_ANCESTORS');
 let previous=policy.layers;
 for(let i=0;i<ancestors.length;i++){
  const a=ancestors[i],p=policy.ancestors[i];
  requireTrue(a?.Id===p.imageId&&a.Os==='linux'&&a.Architecture==='amd64'&&Number.isSafeInteger(p.layers)&&p.layers>0&&p.layers<previous&&a.RootFS?.Layers?.length===p.layers,'IMAGE_LINEAGE_ANCESTOR');
  requireTrue(canonical(image.RootFS.Layers.slice(0,p.layers))===canonical(a.RootFS.Layers)&&canonical(image.Config)===canonical(a.Config),'DERIVATIVE_INHERITANCE');previous=p.layers;
 }
}
export function verifyCoreExtensionBootstrap(actual){
 const expected=[['pg_stat_statements','1.11'],['pgcrypto','1.3'],['uuid-ossp','1.1']].map(([name,version])=>({name,version,schema:'extensions',owner:'postgres'}));
 const configured=typeof actual?.privilegedExtensions==='string'?actual.privilegedExtensions.split(',').map(x=>x.trim().replace(/^"|"$/g,'')):[];
 const byName=(a,b)=>String(a?.name).localeCompare(String(b?.name),'en');
 const extensions=Array.isArray(actual?.extensions)?[...actual.extensions].sort(byName):null;
 requireTrue(canonical(extensions)===canonical(expected.sort(byName))&&expected.every(e=>configured.includes(e.name)),'POSTGRES_EXTENSION_OWNER_OR_CONFIG');
}
export class Host {
 constructor({run,dir,receipt,expected,files,baseline}){Object.assign(this,{run,dir,receipt,expected,files,baseline});this.nonce=validNonce(receipt.nonce);this.net=`t19-bootstrap-${this.nonce}`;this.outnet=`t19-bootstrap-sentinel-${this.nonce}`;this.bound=new Map();this.nets=new Map();this.sequence=0;this.unknown=false;this.started=Date.now();this.secrets=[];}
 async record(kind,value){await durable(this.dir,String(++this.sequence).padStart(4,'0')+'-'+kind+'.json',value);}
 redact(v){let s=v;for(const secret of this.secrets)s=s.split(secret).join('[SYNTHETIC_REDACTED]');return s;}
 async command(args,options={}){
  requireTrue(Date.now()-this.started<900000||this.cleaning,'RUN_DEADLINE');
  const readOnly=args[0]==='image'&&args[1]==='inspect'||['container','network'].includes(args[0])&&['inspect','ls','logs','cp'].includes(args[1]);
  requireTrue(!this.unknown||readOnly,'COMMANDS_FENCED');
  let r;try{r=await this.run(args,options);}catch(e){if(e.unknown)this.unknown=true;await this.record('command-error',{operation:args.slice(0,2),unknown:e.unknown===true});throw e;}
  if(r.code!==0){await this.record('command-failure',{operation:args.slice(0,2),code:r.code,stderr:this.redact(r.stderr.toString()).slice(0,8192)});throw Error('DOCKER_COMMAND_FAILED');}
  return args[0]==='container'&&args[1]==='logs'?Buffer.concat([r.stdout,r.stderr]):r.stdout;
 }
 async json(args){return JSON.parse((await this.command(args)).toString());}
 async inspect(id){const a=await this.json(['container','inspect',id]);requireTrue(a.length===1&&a[0].Id===id,'INSPECT_ID');return a[0];}
 async network(name){const intent={name,nonce:this.nonce};await this.record('network-intent',intent);const id=(await this.command(['network','create','--internal','--driver','bridge','--label',LABEL+'='+this.nonce,name])).toString().trim();requireTrue(/^[a-f0-9]{64}$/.test(id),'NETWORK_ID');this.nets.set(name,id);await this.record('network-binding',{...intent,id});const n=(await this.json(['network','inspect',id]))[0];requireTrue(n.Id===id&&n.Name===name&&n.Internal===true&&n.Driver==='bridge'&&n.Labels?.[LABEL]===this.nonce,'NETWORK_ISOLATION');return id;}
 async create(kind,env={},command,network=this.net){
  requireTrue(this.bound.size<4,'CONTAINER_BUDGET');const s=containerSpec(this.nonce,kind,network,env),image=(await this.json(['image','inspect',s.image]))[0];
  const base=image.Config.Env??[];const names=new Set(Object.keys(env));const expected=[...base.filter(v=>!names.has(v.split('=')[0])),...Object.entries(env).map(([k,v])=>k+'='+v)];
  await this.record('container-intent',{name:s.name,image:s.image,kind,network,envNames:[...names].sort()});
  return await withEnvironmentFile(this.dir,env,async environmentPath=>{
  const id=(await this.command(createArgs(s,command,environmentPath))).toString().trim();requireTrue(/^[a-f0-9]{64}$/.test(id),'CONTAINER_ID');
  const b={id,s,command,expectedEnv:expected,expectedEntrypoint:command?.entrypoint?[command.entrypoint]:image.Config.Entrypoint,expectedCmd:command?command.args??[]:image.Config.Cmd};this.bound.set(kind,b);await this.record('container-binding',{kind,id,name:s.name,image:s.image});
  await this.assertBound(b,expected);return b;
  });
 }
 async assertBound(b,expected){const x=await this.inspect(b.id);requireTrue(isolated(x,b.s,this.nets.get(b.s.network)),'CONTAINER_ISOLATION');requireTrue(environment(x.Config.Env,expected??b.expectedEnv),'CONTAINER_ENVIRONMENT');requireTrue(canonical(x.Config.Entrypoint)===canonical(b.expectedEntrypoint),'CONTAINER_ENTRYPOINT');requireTrue(canonical(x.Config.Cmd)===canonical(b.expectedCmd),'CONTAINER_COMMAND');return x;}
 async absent(b,path){const r=await this.run(['container','cp',b.id+':'+path,'-'],{maxBytes:1048576});requireTrue(r.code===1&&/Could not find|not found|No such file/i.test(r.stderr.toString()),'UNREVIEWED_IMAGE_CONFIG');}
 async start(b){await this.assertBound(b);await this.command(['container','start',b.id]);const x=await this.assertBound(b);requireTrue(['running','exited'].includes(x.State.Status),'CONTAINER_NOT_STARTED');}
 async exec(b,args,stdin='',timeoutMs=60000){await this.assertBound(b);return (await this.command(['container','exec','-i',b.id,...args],{stdin,timeoutMs})).toString();}
 async cp(b,path,maxBytes=8388608){const bytes=await this.command(['container','cp',b.id+':'+path,'-'],{maxBytes,timeoutMs:30000});return tarFiles(bytes);}
 async file(b,path,maxBytes){const a=await this.cp(b,path,maxBytes);requireTrue(a.size===1,'COPY_SINGLE_FILE');return [...a.values()][0];}
 async audit(b,component){
  const groups=component==='postgres'?['/docker-entrypoint-initdb.d','/usr/local/bin/docker-entrypoint.sh',...this.files.filter(f=>f.component==='postgres'&&f.path.endsWith('.control')).map(f=>f.path)]:component==='auth'?['/usr/local/etc/auth/migrations','/usr/local/bin/auth']:['/app/migrations/tenant','/app/dist/internal/database/migrations','/app/package.json'];
  const found=new Map();for(const path of groups){const a=await this.cp(b,path,path==='/usr/local/bin/auth'?67108864:8388608);const parent=path.slice(0,path.lastIndexOf('/')+1);for(const [name,bytes] of a)found.set(parent+name.replace(/^\.\//,''),bytes);}
  const expected=this.files.filter(f=>f.component===component);for(const f of expected)requireTrue(found.has(f.path)&&digest(found.get(f.path))===f.sha256,'IMAGE_FILE_HASH_MISMATCH');
  const sql=[...found.keys()].filter(p=>p.endsWith('.sql')).sort(),want=expected.filter(f=>f.path.endsWith('.sql')).map(f=>f.path).sort();requireTrue(canonical(sql)===canonical(want),'IMAGE_SQL_SET_CHANGED');
  const passwd=(await this.file(b,'/etc/passwd')).toString();requireTrue(passwd.split('\n').some(l=>{const v=l.split(':');return v[0]===(component==='postgres'?'postgres':component==='auth'?'supabase':'node')&&v[2]===(component==='postgres'?'100':'1000')&&v[3]===(component==='postgres'?'101':'1000');}),'OS_IDENTITY_CHANGED');
  if(component==='postgres')requireTrue(found.get('/docker-entrypoint-initdb.d/migrate.sh')?.toString().includes('USE_DBMATE'),'POSTGRES_RUNNER_MISSING');
  if(component==='storage'){
   const server=(await this.file(b,'/app/dist/start/server.js')).toString();requireTrue(/upToMigration:\s*dbMigrationFreezeAt/.test(server)&&server.includes('runMigrationsOnTenant'),'STORAGE_FREEZE_CALL_PATH');
  }
  await this.record('image-files',{component,verifiedFiles:expected.length,orderedSQL:want.map(path=>({path,sha256:digest(found.get(path))}))});
 }
 async sql(sql,user='postgres'){
  const b=this.bound.get('postgres');return await this.exec(b,['psql','-X','-qAt','--no-password','--set=ON_ERROR_STOP=1','--username='+user,'--dbname=postgres'],sql);
 }
 async sqlJSON(sql,user='postgres'){return JSON.parse((await this.sql(sql,user)).trim());}
 async poll(fn,code,timeoutMs=180000){const until=Date.now()+timeoutMs;while(Date.now()<until){if(await fn())return;await new Promise(r=>setTimeout(r,500));}throw Error(code);}
 async preflight(){requireTrue(await environmentFilesAbsent(this.dir),'STALE_ENVIRONMENT_FILE');requireTrue(canonical(await snapshot(this.run))===canonical(this.baseline),'BASELINE_CHANGED');}
 async node(b,code,input={}){return JSON.parse((await this.exec(b,['node','-e',code],JSON.stringify(input))).trim());}
 async remove(kind){const b=this.bound.get(kind);if(!b)return;let x=await this.assertBound(b);if(x.State.Running){await this.command(['container','stop','--timeout','10',b.id],{timeoutMs:15000});x=await this.assertBound(b);}requireTrue(!x.State.Running,'STOP_NOT_VERIFIED');await this.command(['container','rm',b.id]);this.bound.delete(kind);await this.record('removed',{kind,id:b.id});}
 async isolation(){
  await this.network(this.net);await this.network(this.outnet);
  const sentinel=await this.create('sentinel',{}, {entrypoint:'node',args:['-e',"require('http').createServer((q,s)=>s.end('t19-synthetic-sentinel')).listen(8080,'0.0.0.0')"]},this.outnet);await this.audit(sentinel,'storage');await this.absent(sentinel,'/app/.env');await this.start(sentinel);
  const ip=(await this.inspect(sentinel.id)).NetworkSettings.Networks[this.outnet].IPAddress;requireTrue(/^\d+\.\d+\.\d+\.\d+$/.test(ip),'SENTINEL_IP');
  const probeCode="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{const {url}=JSON.parse(s);try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});console.log(JSON.stringify({reachable:r.ok&&(await r.text())==='t19-synthetic-sentinel'}));}catch{console.log(JSON.stringify({reachable:false}));}});";
  let probe=await this.create('probe',{}, {entrypoint:'node',args:['-e','setInterval(()=>{},1000)']},this.outnet);await this.start(probe);
  await this.poll(async()=>(await this.node(probe,probeCode,{url:'http://'+ip+':8080'})).reachable,'SENTINEL_POSITIVE_FAILED',10000);
  await this.remove('probe');probe=await this.create('probe',{}, {entrypoint:'node',args:['-e','setInterval(()=>{},1000)']});await this.start(probe);
  requireTrue((await this.node(probe,probeCode,{url:'http://'+ip+':8080'})).reachable===false,'CROSS_NETWORK_REACHABLE');
  await this.remove('probe');await this.remove('sentinel');await this.record('isolation-proof',{sameNetworkReachable:true,crossNetworkReachable:false});
 }
 async postgres(){
  const password=randomBytes(32).toString('hex');this.secrets.push(password);this.password=password;
  const b=await this.create('postgres',{POSTGRES_USER:'supabase_admin',POSTGRES_PASSWORD:password,POSTGRES_DB:'postgres',POSTGRES_HOST:'/var/run/postgresql',POSTGRES_HOST_AUTH_METHOD:'scram-sha-256',USE_DBMATE:''});await this.audit(b,'postgres');
  // Presence of optional postinit SQL is forbidden; cp's known missing-file exit is inspected explicitly.
  await this.absent(b,'/etc/postgresql.schema.sql');
  await this.start(b);
  await this.poll(async()=>{const x=await this.assertBound(b);if(!x.State.Running)throw Error('POSTGRES_STARTUP_STOPPED');const logs=(await this.command(['container','logs','--tail','200',b.id])).toString();if(!logs.includes('PostgreSQL init process complete')||!logs.includes('database system is ready to accept connections'))return false;let ready;try{ready=await this.run(['container','exec',b.id,'pg_isready','--host=/var/run/postgresql','--username=supabase_admin','--dbname=postgres']);}catch(e){if(e.unknown)this.unknown=true;throw e;}requireTrue([0,1,2].includes(ready.code),'READINESS_PROBE_FAILED');return ready.code===0;},'POSTGRES_NOT_READY');
  const r=await this.sqlJSON("SELECT jsonb_build_object('version',current_setting('server_version_num')::int,'bootstrap',EXISTS(SELECT FROM pg_roles WHERE oid=10 AND rolname='supabase_admin' AND rolsuper),'managed',EXISTS(SELECT FROM pg_roles WHERE rolname='postgres' AND NOT rolsuper AND rolcreaterole),'owners',(SELECT count(*) FROM pg_roles WHERE rolname IN ('supabase_auth_admin','supabase_storage_admin')));",'supabase_admin');requireTrue(r.version>=170000&&r.version<180000&&r.bootstrap===true&&r.managed===true&&r.owners===2,'MANAGED_BOOTSTRAP_ROLE_MISMATCH');
  const core=await this.sqlJSON("SELECT jsonb_build_object('privilegedExtensions',current_setting('supautils.privileged_extensions',true),'extensions',(SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner)) ORDER BY e.extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname IN ('pg_stat_statements','pgcrypto','uuid-ossp')));",'supabase_admin');
  await this.coreExtensionGate(core);
  // Password changes are restricted to the two fresh candidate-local vendor roles.
  await this.sql("ALTER ROLE supabase_auth_admin PASSWORD '"+password+"'; ALTER ROLE supabase_storage_admin PASSWORD '"+password+"';",'supabase_admin');
 }
 async coreExtensionGate(core){
  // Record only this non-secret extension metadata before assertion/cleanup.
  // A failed gate must retain the actual values, not just its reason string.
  await this.record('postgres-extension-readback',core);
  verifyCoreExtensionBootstrap(core);
  await this.record('postgres-extension-owners',{extensions:core.extensions,privilegedExtensionsRestored:true});
 }
 async bootstrapHelpers(){
  const sql=await readFile(join(ROOT,'test-support/t19-bootstrap-helpers/overlay.sql'));
  requireTrue(digest(sql)==='f31ed2fb751d7b060569fefb2c448a21ef550d08eb8758d10f645c24def6d9d5','HELPER_OVERLAY_BYTES_CHANGED');
  const pre=await this.sqlJSON("SELECT jsonb_build_object('bootstrap',current_user='supabase_admin','count',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='extensions' AND p.proname IN ('grant_pg_cron_access','grant_pg_graphql_access','grant_pg_net_access','pgrst_ddl_watch','pgrst_drop_watch','set_graphql_placeholder') AND p.pronargs=0 AND pg_get_userbyid(p.proowner)='supabase_admin' AND NOT p.prosecdef));",'supabase_admin');
  requireTrue(pre.bootstrap&&pre.count===6,'HELPER_INITIAL_STATE_MISMATCH');
  await this.sql('BEGIN;\n'+sql.toString()+'\nCOMMIT;','supabase_admin');
  await this.record('helper-overlay',{sha256:digest(sql),functions:6,roleSettingsCorrected:['supabase_admin.search_path']});
 }
 async bootstrapDependencies(){
  const pre=await this.sqlJSON("SELECT jsonb_build_object('available',EXISTS(SELECT FROM pg_available_extensions WHERE name='btree_gist' AND default_version='1.7'),'absent',NOT EXISTS(SELECT FROM pg_extension WHERE extname='btree_gist'));",'supabase_admin');
  requireTrue(pre.available&&pre.absent,'BTREE_GIST_INITIAL_STATE');
  await this.sql("CREATE EXTENSION btree_gist WITH SCHEMA extensions VERSION '1.7';",'supabase_admin');
  const actual=await this.sqlJSON("SELECT jsonb_build_object('version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner)) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='btree_gist';",'supabase_admin');
  requireTrue(actual.version==='1.7'&&actual.schema==='extensions'&&actual.owner==='supabase_admin','BTREE_GIST_INSTALLATION');
  await this.record('bootstrap-dependencies',{btree_gist:actual});
 }
 async realtime(){
  const sql=await readFile(join(ROOT,'test-support/t19-realtime-bootstrap/tenant_db_dump_17.sql'));
  requireTrue(digest(sql)==='f98beb234131e3295d2d7651607db5b79a754b7c745b1a853ba0e1b76f757c47','REALTIME_VENDOR_BYTES_CHANGED');
  const empty=await this.sqlJSON("SELECT jsonb_build_object('bootstrap',current_user='supabase_admin','objects',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='realtime'),'roleAbsent',NOT EXISTS(SELECT FROM pg_roles WHERE rolname='supabase_realtime_admin'));",'supabase_admin');
  requireTrue(empty.bootstrap&&empty.objects===0&&empty.roleAbsent,'REALTIME_NOT_FRESH');
  // Vendor-supported tenant dump, inside the fresh candidate only. No Realtime
  // daemon/control database, hosted connection or archived SQL is involved.
  await this.sql('BEGIN;\n'+sql.toString()+'\nCOMMIT;','supabase_admin');
  const result=await this.sqlJSON("SELECT jsonb_build_object('count',(SELECT count(*) FROM realtime.schema_migrations),'last',(SELECT max(version)::text FROM realtime.schema_migrations),'messages',(SELECT count(*) FROM realtime.messages),'subscriptions',(SELECT count(*) FROM realtime.subscription));",'supabase_admin');
  requireTrue(result.count===91&&result.last==='20261009120000'&&result.messages===0&&result.subscriptions===0,'REALTIME_BOUNDARY_MISMATCH');
  await this.record('realtime-bootstrap',{vendorSha256:digest(sql),...result});
 }
 authEnv(){return {GOMAXPROCS:'1',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${this.password}@${this.bound.get('postgres').s.name}:5432/postgres`,GOTRUE_DB_NAMESPACE:'auth',GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://t19.invalid',GOTRUE_SITE_URL:'http://t19.invalid',GOTRUE_JWT_SECRET:this.jwtSecret,GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_DISABLE_SIGNUP:'true',GOTRUE_EXTERNAL_EMAIL_ENABLED:'false',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_INDEX_WORKER_ENSURE_USER_SEARCH_INDEXES_EXIST:'true',GOTRUE_INDEX_WORKER_MAX_USERS_THRESHOLD:'0',GOTRUE_TRACING_ENABLED:'false'};}
 async authMigrations(){this.jwtSecret=randomBytes(32).toString('hex');this.secrets.push(this.jwtSecret);const b=await this.create('auth-migrate',this.authEnv(),{entrypoint:'/usr/local/bin/auth',args:['migrate']});await this.audit(b,'auth');await this.absent(b,'/.env');await this.start(b);await this.poll(async()=>{const x=await this.assertBound(b);if(x.State.Running)return false;requireTrue(x.State.ExitCode===0&&!x.State.OOMKilled,'AUTH_MIGRATION_FAILED');return true;},'AUTH_MIGRATION_TIMEOUT');await this.remove('auth-migrate');const before=await this.sqlJSON("SELECT jsonb_build_object('count',count(*)::int) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relname IN ('idx_users_email','idx_users_created_at_desc','idx_users_last_sign_in_at_desc','idx_users_name');");requireTrue(before.count===0,'AUTH_INDEXES_PREEXIST_WORKER');await this.record('auth-index-config',{ensureUserSearchIndexesExist:true,maxUsersThreshold:0,indexesAbsentBeforeWorker:true});}
 async authIndexes(){const b=await this.create('auth',this.authEnv(),{entrypoint:'/usr/local/bin/auth',args:['serve']});await this.start(b);await this.poll(async()=>{const x=await this.assertBound(b);if(!x.State.Running)throw Error('AUTH_STOPPED');const indexes=await this.sqlJSON("SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'ready',i.indisready,'valid',i.indisvalid)),'[]') FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relname IN ('idx_users_email','idx_users_created_at_desc','idx_users_last_sign_in_at_desc','idx_users_name');");return indexes.length===4&&indexes.every(i=>i.valid&&i.ready);},'AUTH_INDEX_WORKER_INCOMPLETE');}
 token(role){const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const v=b({alg:'HS256',typ:'JWT'})+'.'+b({role,iss:'supabase',aud:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+900});const token=v+'.'+createHmac('sha256',this.jwtSecret).update(v).digest('base64url');this.secrets.push(token);return token;}
 storageEnv(){return {DATABASE_URL:`postgres://supabase_storage_admin:${this.password}@${this.bound.get('postgres').s.name}:5432/postgres`,AUTH_JWT_SECRET:this.jwtSecret,SERVICE_KEY:this.serviceToken,ANON_KEY:this.anonToken,MULTI_TENANT:'false',DB_INSTALL_ROLES:'false',DB_SUPER_USER:'postgres',DB_ALLOW_MIGRATION_REFRESH:'false',DB_MIGRATIONS_FREEZE_AT:FREEZE,STORAGE_BACKEND:'file',FILE_STORAGE_BACKEND_PATH:'/var/lib/storage',PG_QUEUE_ENABLE:'false',PG_QUEUE_WORKERS_ENABLE:'false',VECTOR_ENABLED:'false',VECTOR_STORE_MIGRATIONS_ENABLED:'false',VECTOR_DATABASE_CREATE:'false',ICEBERG_ENABLED:'false',S3_PROTOCOL_ENABLED:'false',LOGFLARE_ENABLED:'false',TRACING_ENABLED:'false',OTEL_METRICS_ENABLED:'false',PROMETHEUS_METRICS_ENABLED:'false',SERVER_HOST:'0.0.0.0',SERVER_PORT:'5000',WORKERS_NUM:'1',TENANT_ID:'t19-synthetic',REGION:'local',FILE_SIZE_LIMIT:'1048576'};}
 async storage(){
  this.serviceToken=this.token('service_role');this.anonToken=this.token('anon');const env=this.storageEnv();
  const migrate=await this.create('storage-migrate',{...env,MULTI_TENANT:'true',DATABASE_MULTITENANT_URL:env.DATABASE_URL,T19_EXPECTED_DATABASE_HOST:this.bound.get('postgres').s.name},{entrypoint:'node',args:['-e',STORAGE_TENANT_MIGRATE_CODE]});
  await this.audit(migrate,'storage');await this.start(migrate);
  await this.poll(async()=>{const x=await this.assertBound(migrate);if(x.State.Running)return false;requireTrue(x.State.ExitCode===0&&!x.State.OOMKilled,'STORAGE_TENANT_MIGRATION_FAILED');return true;},'STORAGE_TENANT_MIGRATION_TIMEOUT');
  requireTrue((await this.command(['container','logs','--tail','20',migrate.id])).toString().includes('T19_STORAGE_TENANT_MIGRATIONS_PASS'),'STORAGE_TENANT_MIGRATION_EVIDENCE');
  const migrated=await this.ledgers();ledgerChecks(migrated,this.files);await this.remove('storage-migrate');
  const b=await this.create('storage',env,{entrypoint:'node',args:['dist/start/server.js']});await this.audit(b,'storage');await this.start(b);await this.poll(async()=>{if(!(await this.assertBound(b)).State.Running)throw Error('STORAGE_STOPPED');const p=await this.http(b,'http://127.0.0.1:5000/status');return p.status===200;},'STORAGE_NOT_READY');
  const standalone=await this.ledgers();requireTrue(canonical(standalone.storage)===canonical(migrated.storage),'STORAGE_RUNTIME_LEDGER_CHANGED');
  const context=await this.sqlJSON("SELECT jsonb_build_object('standaloneTablesAbsent',to_regclass('storage.iceberg_namespaces') IS NULL AND to_regclass('storage.iceberg_tables') IS NULL);");requireTrue(context.standaloneTablesAbsent,'STORAGE_STANDALONE_OBJECTS_CREATED');
  await this.record('storage-context',{tenantMigrationMultitenant:true,apiMultitenant:false,runtimeLedgerUnchanged:true,standaloneIcebergTablesAbsent:true});
  const ledger=await this.ledgers();ledgerChecks(ledger,this.files);await this.record('migration-boundaries',{authVersions:ledger.auth,storageRows:ledger.storage.map(({id,name})=>({id,name})),indexes:ledger.indexes});
 }
 async ledgers(){return await this.sqlJSON("SELECT jsonb_build_object('auth',(SELECT jsonb_agg(version ORDER BY version) FROM auth.schema_migrations),'storage',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id) FROM storage.migrations),'indexes',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'ready',i.indisready,'valid',i.indisvalid) ORDER BY c.relname) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relname IN ('idx_users_email','idx_users_created_at_desc','idx_users_last_sign_in_at_desc','idx_users_name')));");}
 async catalog(){const x=await this.sqlJSON(await readFile(join(ROOT,'scripts/t19-bootstrap-catalog.sql'),'utf8'));return {...x,sourceProject:'synthetic-candidate'};}
 async managedCatalog(){
  const overlay=await readFile(join(ROOT,'test-support/t19-managed-final/overlay.sql'));
  requireTrue(digest(overlay)==='868b53c274b293fc877736715b688f01b755437631dda2edfb2db3b8b1af8aa8','MANAGED_OVERLAY_BYTES_CHANGED');
  await this.sql("BEGIN;SET LOCAL faraios.t19_bootstrap='synthetic-only';\n"+overlay.toString()+"\nCOMMIT;",'supabase_admin');
  await this.record('managed-final-overlay',{sha256:digest(overlay),pgbouncerDefinition:true,storageOwnerGrantOptions:16});
  this.before=await this.catalog();requireTrue(Array.isArray(this.before.catalog.indexStates)&&this.before.catalog.indexStates.every(x=>x[2]===true&&x[3]===true&&x[4]===true),'MANAGED_INDEX_INVALID');const result=compareCatalog(this.before,this.expected);await this.record('managed-catalog',{...result,actual:this.before});requireTrue(result.match,'MANAGED_CATALOG_MISMATCH');}
 async custody(){await this.sql("SET faraios.t19_restore_candidate='isolated-disposable-reviewed';\n"+await readFile(join(ROOT,'docs/proposals/t19-inactive-custody-recovery.sql'),'utf8'));
  const projection=(await readFile(join(ROOT,'scripts/restore-catalog.sql'),'utf8')).replace("('managed',array['auth','storage']::text[])","('custody',array['private_t19_custody']::text[])").replace("select jsonb_object_agg(scope,encode(extensions.digest(value::text,'sha256'),'hex')) as catalog from catalogs;","select value from catalogs where scope='custody';");
  const actual=await this.sqlJSON("BEGIN READ ONLY;SET LOCAL search_path='';SET LOCAL timezone='UTC';"+projection+'COMMIT;');const result=compareStructure(actual,JSON.parse(await readFile(join(ROOT,'test-support/t19-custody-recovery-expected.json'),'utf8')));await this.record('custody-structure',result);requireTrue(result.status==='CUSTODY_STRUCTURE_MATCH','CUSTODY_STRUCTURE_MISMATCH');
  const check=await this.sqlJSON(await readFile(join(ROOT,'docs/proposals/t19-inactive-custody-recovery-readback.sql'),'utf8'));await this.record('custody-roles',check);requireTrue(check.roleConforms&&check.membershipConforms&&check.runtimeOwnerAbsent&&check.indexesValidReady&&Object.values(check.tableCounts).every(x=>x===0),'CUSTODY_ROLE_MISMATCH');
 }
 async http(b,url,method='GET',token='',body){return this.node(b,"let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{const x=JSON.parse(s);try{const r=await fetch(x.url,{method:x.method,headers:{'content-type':'application/json',...(x.token?{authorization:'Bearer '+x.token}:{})},body:x.body===undefined?undefined:JSON.stringify(x.body),signal:AbortSignal.timeout(3000)});await r.arrayBuffer();console.log(JSON.stringify({status:r.status}));}catch{console.log(JSON.stringify({status:0}));}});",{url,method,token,body});}
 async security(){const b=this.bound.get('storage'),auth='http://'+this.bound.get('auth').s.name+':9999/admin/users';
  requireTrue((await this.http(b,auth,'GET',this.serviceToken)).status===200,'AUTH_ALLOWED_REQUEST_FAILED');requireTrue([401,403].includes((await this.http(b,auth,'GET',this.anonToken)).status),'AUTH_DENIED_REQUEST_FAILED');
  const bucket='t19-'+this.nonce,url='http://127.0.0.1:5000/bucket';requireTrue([200,201].includes((await this.http(b,url,'POST',this.serviceToken,{id:bucket,name:bucket,public:false})).status),'STORAGE_ALLOWED_REQUEST_FAILED');
  requireTrue([401,403].includes((await this.http(b,url,'POST',this.anonToken,{id:bucket+'-denied',name:bucket+'-denied',public:false})).status),'STORAGE_DENIED_REQUEST_FAILED');
  requireTrue((await this.http(b,url+'/'+bucket,'DELETE',this.serviceToken)).status===200,'STORAGE_FIXTURE_CLEANUP_FAILED');
  for(const role of ['anon','authenticated','service_role']){const db=await this.sqlJSON("BEGIN;SET LOCAL ROLE "+role+";DO $$ BEGIN BEGIN PERFORM 1 FROM private_t19_custody.connections; RAISE EXCEPTION 'DENIAL_NOT_ENFORCED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;END $$;RESET ROLE; SELECT jsonb_build_object('denied',true);ROLLBACK;");requireTrue(db.denied,'DATABASE_DENIAL_FAILED');}
  const permitted=await this.sqlJSON("SELECT jsonb_build_object('count',count(*)) FROM private_t19_custody.connections;");requireTrue(permitted.count===0,'DATABASE_ALLOWED_REQUEST_FAILED');await this.record('security',{authPermitted:true,authDenied:true,storagePermitted:true,storageDenied:true,databasePermitted:true,databaseDeniedRoles:['anon','authenticated','service_role']});
 }
 async stableCatalog(){const after=await this.catalog();requireTrue(compareCatalog(after,this.before).match&&compareCatalog(after,this.expected).match,'CATALOG_UNSTABLE');const counts=await this.sqlJSON("SELECT jsonb_build_array((SELECT count(*) FROM auth.users),(SELECT count(*) FROM storage.objects),(SELECT count(*) FROM storage.buckets),(SELECT count(*) FROM vault.secrets),(SELECT count(*) FROM private_t19_custody.connections),(SELECT count(*) FROM private_t19_custody.operations),(SELECT count(*) FROM private_t19_custody.prepared_references));");requireTrue(counts.every(x=>x===0),'SYNTHETIC_DATA_REMAINS');await this.record('stable-catalog',{match:true,emptyCounts:counts});}
 async cleanup(){this.cleaning=true;let ok=!this.unknown;for(const kind of ['probe','sentinel','storage','storage-migrate','auth','auth-migrate','postgres']){try{await this.remove(kind);}catch{ok=false;}}
  for(const [name,id] of [...this.nets].reverse()){try{const n=(await this.json(['network','inspect',id]))[0];requireTrue(n.Id===id&&n.Name===name&&n.Internal===true&&n.Labels?.[LABEL]===this.nonce&&!Object.keys(n.Containers??{}).length,'NETWORK_CLEANUP_OWNERSHIP');await this.command(['network','rm',id]);this.nets.delete(name);}catch{ok=false;}}
  const after=await snapshot(this.run);const owned=await this.command(['container','ls','--all','--filter','label='+LABEL+'='+this.nonce,'--quiet']);const nets=await this.command(['network','ls','--filter','label='+LABEL+'='+this.nonce,'--quiet']);ok=ok&&canonical(after)===canonical(this.baseline)&&!owned.toString().trim()&&!nets.toString().trim();ok=await environmentFilesAbsent(this.dir)&&ok;await this.record('cleanup',{verified:ok,baselineMatches:canonical(after)===canonical(this.baseline)});this.secrets.fill('');this.password='';this.jwtSecret='';return ok;
 }
}
export async function snapshot(run){
 const rows=async(args)=>{const r=await run(args);requireTrue(r.code===0,'INVENTORY_FAILED');return r.stdout.toString().trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);};
 const containers=(await rows(['container','ls','--all','--no-trunc','--format','{{json .}}'])).map(({ID,State,Names,Image})=>({ID,State,Names,Image})).sort((a,b)=>a.ID.localeCompare(b.ID));
 const networks=(await rows(['network','ls','--no-trunc','--format','{{json .}}'])).map(({ID,Name,Driver,Scope})=>({ID,Name,Driver,Scope})).sort((a,b)=>a.ID.localeCompare(b.ID));
 const volumeRows=await rows(['volume','ls','--format','{{json .}}']);const volumes=[];for(const {Name} of volumeRows){const r=await run(['volume','inspect',Name]);requireTrue(r.code===0,'VOLUME_INSPECT_FAILED');const v=JSON.parse(r.stdout)[0];volumes.push({Name:v.Name,Driver:v.Driver,Scope:v.Scope,CreatedAt:v.CreatedAt,Mountpoint:v.Mountpoint,configurationSha256:digest({Options:v.Options,Labels:v.Labels})});}volumes.sort((a,b)=>a.Name.localeCompare(b.Name));return {containers,networks,volumes};
}
async function inputs(expectedPath,dir){
 requireTrue(process.platform==='linux'&&process.getuid()===0&&process.version==='v24.22.1'&&digest(await readFile(process.execPath))===NODE_SHA,'WRONG_RUNTIME');
 for(const p of SOURCES)await protectedPath(join(ROOT,p));await protectedPath(TRUST);await protectedPath(expectedPath);await protectedPath(dir,true);
 requireTrue(!((await lstat(expectedPath)).mode&0o077)&&!((await lstat(dir)).mode&0o077),'PRIVATE_INPUT_PERMISSIONS');
 const expected=JSON.parse(await readFile(expectedPath,'utf8'));requireTrue(expected.schemaVersion===1&&expected.sourceProject==='xdmfyrsauvqznkloroxg'&&expected.catalog&&Date.now()-expected.capturedAt>=0&&Date.now()-expected.capturedAt<86400000,'EXPECTED_CATALOG_INVALID');requireTrue(compareCatalog(expected,expected).match,'EXPECTED_CATALOG_INVALID');
 const trust=JSON.parse(await readFile(TRUST,'utf8'));await protectedPath(trust.dockerBinary);requireTrue(digest(await readFile(trust.dockerBinary))===DOCKER_SHA&&trust.context==='default','DOCKER_TRUST');const run=dockerProcess(trust.dockerBinary);
 const info=JSON.parse((await run(['info','--format','{{json .}}'])).stdout);requireTrue(info.OSType==='linux'&&['x86_64','amd64'].includes(info.Architecture)&&info.MemTotal>=4294967296,'DAEMON_RESOURCES');const context=JSON.parse((await run(['context','inspect','default'])).stdout);requireTrue(context.length===1&&context[0].Endpoints?.docker?.Host==='unix:///var/run/docker.sock','CONTEXT_REFUSED');
 const mem=(await readFile('/proc/meminfo','utf8')).match(/^MemAvailable:\s+(\d+) kB/m);const disk=await statfs(dir);requireTrue(Number(mem?.[1])*1024>=3221225472&&Number(disk.bavail)*Number(disk.bsize)>=2147483648,'HOST_RESOURCES');
 const baseline=await snapshot(run);requireTrue(baseline.containers.length===13&&baseline.containers.every(c=>c.State==='exited')&&!baseline.containers.some(c=>c.Names.startsWith('t19-bootstrap-'))&&!baseline.networks.some(n=>n.Name.startsWith('t19-bootstrap-')),'BASELINE_REFUSED');
 const lineage=JSON.parse(await readFile(join(ROOT,'config/t19-bootstrap-images.json'),'utf8'));
 requireTrue(lineage.version===1&&lineage.scope==='owner-signed-synthetic-only'&&canonical(Object.keys(lineage.images).sort())===canonical(Object.keys(IMAGES).sort()),'IMAGE_LINEAGE_POLICY');
 for(const [kind,id] of Object.entries(IMAGES)){
  const r=await run(['image','inspect',id]);requireTrue(r.code===0,'IMAGE_MISSING');const a=JSON.parse(r.stdout);
  requireTrue(a.length===1&&a[0].Id===id&&a[0].Os==='linux'&&a[0].Architecture==='amd64'&&!Object.keys(a[0].Config.Volumes??{}).length,'IMAGE_IDENTITY');
  const policy=lineage.images[kind],ancestors=[];requireTrue(policy.imageId===id,'IMAGE_POLICY_PIN');
  for(const parent of policy.ancestors){const p=await run(['image','inspect',parent.imageId]);requireTrue(p.code===0,'BASE_IMAGE_MISSING');const xs=JSON.parse(p.stdout);requireTrue(xs.length===1,'BASE_IMAGE_IDENTITY');ancestors.push(xs[0]);}
  verifyImageLineage(a[0],ancestors,policy);
 }
 return {expected,trust,run,baseline,files:JSON.parse(await readFile(join(ROOT,'config/t19-bootstrap-files.json'),'utf8')).files,bindings:{bundleSha256:await bundleDigest(),binarySha256:DOCKER_SHA,expectedSha256:digest(expected),baselineSha256:digest(baseline),hostBootSha256:digest((await readFile('/proc/sys/kernel/random/boot_id','utf8')).trim()),daemonIdSha256:digest(info.ID),context:'default',journalPath:resolve(dir)}};
}
async function main(){
 const [mode,expectedPath,dir,approvalPath,...extra]=process.argv.slice(2);requireTrue(['--prepare','--run'].includes(mode)&&expectedPath&&dir&&!extra.length&&(mode==='--run'?!!approvalPath:!approvalPath),'USAGE_PREPARE_OR_RUN');
 const x=await inputs(resolve(expectedPath),resolve(dir));
 if(mode==='--prepare'){const issuedAt=Date.now(),receipt={scope:SCOPE,version:1,nonce:randomBytes(16).toString('hex'),issuedAt,expiresAt:issuedAt+900000,...x.bindings};await durable(dir,'receipt.json',receipt);console.log(JSON.stringify({status:'SYNTHETIC_RECEIPT_READY_NOT_EXECUTED',receiptPath:join(resolve(dir),'receipt.json'),expiresAt:new Date(receipt.expiresAt).toISOString()}));return;}
 await protectedPath(approvalPath);const approval=JSON.parse(await readFile(approvalPath,'utf8')),receipt=validateApproval(approval,x.bindings,x.trust.ownerKey);await durable(dir,'consumed-'+receipt.nonce+'.json',{receiptDigest:digest(receipt)});
 const host=new Host({...x,dir,receipt});const interrupted=()=>{host.unknown=true;};process.on('SIGINT',interrupted);process.on('SIGTERM',interrupted);
 const result=await runBootstrap(host);process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='SYNTHETIC_COMPATIBILITY_PASS'?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error('T19_BOOTSTRAP_STOP '+(/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNCLASSIFIED_FAILURE'));process.exitCode=1;});
