import { createHash, randomBytes, createCipheriv, createDecipheriv, X509Certificate } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdir, lstat, open, readFile, rm, realpath } from 'node:fs/promises';
import { join, resolve, basename, isAbsolute, dirname } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { dumpSchemaScript, dumpDataScript, dumpRoleScript, INTERNAL_SCHEMAS, EXCLUDED_SCHEMAS, RESERVED_ROLES, ALLOWED_CONFIGS } from './vendor/supabase-pg-dump.mjs';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import {validateScope,matchesCurrentScope,currentManifestSQL} from './backup-scope.mjs';

export const SOURCE = 'xdmfyrsauvqznkloroxg';
export const CLI = '2.121.0'; // Vendored filter provenance, not an executed CLI.
export const CLIENT_IMAGE = 'postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
export const POOLER_HOST = 'aws-0-eu-west-1.pooler.supabase.com';
export const ROOT_CERT_PATH = fileURLToPath(new URL('./vendor/supabase-root-2021.crt',import.meta.url));
export const ROOT_CERT_CONTAINER = '/faraios-ca.crt';
export const ROOT_CERT_SHA256 = '807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa';
export const CLIENT_STARTED = 'FARAIOS_T11_POSTGRES_CLIENT_STARTED';
const FORMAT = 'faraios-staging-logical-backup-v1';
const MAX_FILE = 128 * 1024 * 1024;
const MAX_ARCHIVE = 256 * 1024 * 1024;
const MAX_PAYLOAD = 384 * 1024 * 1024;
const BUSINESS_IDS = ['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'];
const EXTENSIONS = ['btree_gist','pg_stat_statements','pgcrypto','plpgsql','supabase_vault','uuid-ossp'];
export const DUMPS = Object.freeze([
 ['roles.sql',['--role-only','--keep-comments']],
 ['schema.sql',['--keep-comments']],
 ['data.sql',['--data-only','--use-copy','--exclude','storage.buckets_vectors','--exclude','storage.vector_indexes']],
 ['migration-schema.sql',['--schema','supabase_migrations','--keep-comments']],
 ['migration-data.sql',['--schema','supabase_migrations','--data-only','--use-copy']],
 // Reference only: never blindly replay platform-owned Auth/Storage schema definitions.
 ['managed-schema-reference.sql',['--schema','auth,storage','--keep-comments']],
]);
const FILES = [...DUMPS.map(([name])=>name),'manifest.json'];
export class BackupFailure extends Error { constructor(code) { super(code); this.code=code; } }
const fail = code => { throw new BackupFailure(code); };
const checkCancelled = signal => {if(signal?.aborted)fail('BACKUP_CANCELLED');};
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const aad = header => Buffer.from(JSON.stringify(header));

export function validateManifest(m,scope) {
 if (!m || m.database_major!==17 || !same(m.business_ids,BUSINESS_IDS) || !same(m.extensions,EXTENSIONS) || m.vault_secrets!==0 || m.storage_objects!==0 || m.storage_buckets!==0 || m.large_objects!==0 || !same(m.unexpected_schemas,[]) || !/^[a-f0-9]{64}$/.test(m.catalog_sha256) || !Array.isArray(m.tables)) fail('SOURCE_SCOPE_CHANGED');
 const names=new Set();
 if(!m.extension_versions||Object.keys(m.extension_versions).sort().join(',')!==EXTENSIONS.join(',')||Object.values(m.extension_versions).some(v=>typeof v!=='string'||v.length===0)) fail('INVALID_MANIFEST');
 for(const t of m.tables) {
  const name=t.schema+'.'+t.table;
  if(names.has(name)||!Number.isSafeInteger(t.rows)||t.rows<0||!/^[a-f0-9]{64}$/.test(t.sha256)) fail('INVALID_MANIFEST');
  names.add(name);
  if(['public','audit'].includes(t.schema)&&t.rls!==true) fail('SOURCE_RLS_CHANGED');
  if(['storage.buckets_vectors','storage.vector_indexes'].includes(name)&&t.rows!==0) fail('VECTOR_DATA_UNSUPPORTED');
 }
 if(!names.has('auth.users') || !names.has('supabase_migrations.schema_migrations')) fail('SOURCE_SCOPE_CHANGED');
 if(m.scope!==undefined) {
  if(!matchesCurrentScope(m,scope) || m.catalog_version!==2 || !Array.isArray(m.sequence_state))fail('SOURCE_SCOPE_CHANGED');
  const sequenceNames=new Set();
  for(const seq of m.sequence_state){
   if(!seq || !['public','audit','auth','storage','supabase_migrations'].includes(seq.schema) || typeof seq.sequence!=='string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(seq.sequence) || (seq.last_value!==null && (typeof seq.last_value!=='string'||!/^[-]?[0-9]+$/.test(seq.last_value))) || sequenceNames.has(seq.schema+'.'+seq.sequence))fail('INVALID_MANIFEST');
   sequenceNames.add(seq.schema+'.'+seq.sequence);
  }
 } else if(m.tables.filter(t=>t.schema==='public').length!==15 || m.tables.filter(t=>t.schema==='audit').length!==2) fail('SOURCE_SCOPE_CHANGED');
 return m;
}

export function assertDataCoverage(files,manifest) {
 const content=Object.fromEntries(files.map(f=>[f.name,f.content]));
 const identifier=s=>'"'+s.replaceAll('"','""')+'"';
 const counts={};
 for(const name of ['data.sql','migration-data.sql']) {
  const map=new Map();let active=null,rows=0;
  for(const line of content[name].split(/\r?\n/)) {
   if(active!==null) {
    if(line==='\\.') { if(map.has(active))fail('DUMP_COPY_INVALID');map.set(active,rows);active=null; }
    else rows++;
   } else if(line.startsWith('COPY ')) {
    const match=line.match(/^COPY ("(?:[^"]|"")+")\.("(?:[^"]|"")+") \(.*\) FROM stdin;$/);
    if(!match)fail('DUMP_COPY_INVALID');active=match[1]+'.'+match[2];rows=0;
   }
  }
  if(active!==null)fail('DUMP_COPY_INCOMPLETE');counts[name]=map;
 }
 for(const t of manifest.tables) {
  const table=identifier(t.schema)+'.'+identifier(t.table);
  if(['public','audit'].includes(t.schema)&&!content['schema.sql'].includes('ALTER TABLE '+table+' ENABLE ROW LEVEL SECURITY;')) fail('DUMP_RLS_COVERAGE_FAILED');
  if(t.schema==='auth'&&t.table==='schema_migrations'||t.schema==='storage'&&['migrations','buckets_vectors','vector_indexes'].includes(t.table)) continue;
  const data=t.schema==='supabase_migrations'?counts['migration-data.sql']:counts['data.sql'];
  if(data.get(table)!==t.rows) fail('DUMP_DATA_COVERAGE_FAILED');
 }
}

export function assertCompleteDump(name,content) {
 const kind=name==='roles.sql'?'cluster':'database';
 const start='-- PostgreSQL database '+(kind==='cluster'?'cluster ':'')+'dump';
 const end=start+' complete';
 const lines=content.split(/\r?\n/);
 if(lines.filter(l=>l===start).length!==1||lines.filter(l=>l===end).length!==1||lines.indexOf(end)<=lines.indexOf(start))fail('DUMP_INCOMPLETE_OR_RETRIED');
}

export function parseManifest(stdout,scope) {
 let rows;
 try { const parsed=JSON.parse(stdout); rows=Array.isArray(parsed)?parsed:parsed.rows; } catch { fail('MANIFEST_OUTPUT_INVALID'); }
 if(!Array.isArray(rows)||rows.length!==1||!rows[0]?.manifest) fail('MANIFEST_OUTPUT_INVALID');
 return validateManifest(rows[0].manifest,scope);
}

export function clientEnvironment(password, original=process.env) {
 if(typeof password!=='string'||password.length===0||password.length>4096||/[\r\n\0]/.test(password)) fail('EMPTY_OR_INVALID_PASSWORD');
 const env={...original};
 for(const key of Object.keys(env))if(/^(PG|SUPABASE_|DOCKER_|SSL_CERT_)/i.test(key))delete env[key];
 return {...env,PGHOST:POOLER_HOST,PGPORT:'5432',PGUSER:'postgres.'+SOURCE,PGPASSWORD:password,PGDATABASE:'postgres',
  PGSSLMODE:'verify-full',PGSSLROOTCERT:ROOT_CERT_CONTAINER,PGGSSENCMODE:'disable',PGCONNECT_TIMEOUT:'15',
  PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=600000 -c lock_timeout=10000',PGAPPNAME:'faraios-t11-backup'};
}

// Public trust anchor downloaded from the source Dashboard's certificate link.
// No peer-leaf trust, custom CA override or runtime certificate download is allowed.
export async function verifyProviderCertificate(path=ROOT_CERT_PATH,now=Date.now()) {
 try {
  const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)fail('PROVIDER_CA_INVALID');
  const pem=await readFile(path,'utf8');
  if(!/^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----\r?\n?$/.test(pem))fail('PROVIDER_CA_INVALID');
  const cert=new X509Certificate(pem);
  if(sha256(cert.raw)!==ROOT_CERT_SHA256||!cert.ca||cert.subject!==cert.issuer||!cert.verify(cert.publicKey)||now<Date.parse(cert.validFrom)||now>=Date.parse(cert.validTo))fail('PROVIDER_CA_INVALID');
  return {sha256:ROOT_CERT_SHA256,validTo:cert.validTo};
 } catch {fail('PROVIDER_CA_INVALID');}
}

// Docker --mount uses CSV fields: quote the whole src field, including commas.
export function certificateMount(path=ROOT_CERT_PATH) {
 if(!isAbsolute(path)||/[\r\n\0]/.test(path))fail('PROVIDER_CA_PATH_INVALID');
 return 'type=bind,"src='+path.replaceAll('"','""')+'",dst='+ROOT_CERT_CONTAINER+',readonly';
}

// Image acquisition has no PostgreSQL credentials or query and its own labels.
export async function ensureClientImage(env,runner=run,signal) {
 checkCancelled(signal);
 const clean={...env};for(const key of Object.keys(clean))if(/^PG/i.test(key))delete clean[key];
 const inspect=()=>runner('docker',['image','inspect',CLIENT_IMAGE,'--format','{{.Id}}'],{env:clean,signal,timeout:20000,maxOutput:4096});
 const interrupted=e=>['BACKUP_CANCELLED','CHILD_TIMEOUT','CHILD_OUTPUT_TOO_LARGE'].includes(e.code);
 let result;
 try {result=await inspect();}
 catch(error) {
  if(interrupted(error))throw error;
  try {await runner('docker',['pull',CLIENT_IMAGE],{env:clean,signal,timeout:900000,maxOutput:1024*1024});result=await inspect();}
  catch(error){if(interrupted(error))throw error;fail('CLIENT_IMAGE_FETCH_FAILED');}
 }
 checkCancelled(signal);
 if(!/^sha256:[a-f0-9]{64}$/.test(result.stdout.trim()))fail('CLIENT_IMAGE_INVALID');
}

// Only fixed modes and reviewed filters enter the container command/environment.
export function dumpSpec(name) {
 if(!DUMPS.some(([allowed])=>allowed===name))fail('DUMP_MODE_INVALID');
 if(name==='roles.sql')return {script:dumpRoleScript,env:{RESERVED_ROLES:RESERVED_ROLES.join('|'),ALLOWED_CONFIGS:ALLOWED_CONFIGS.join('|')}};
 const schema=name.startsWith('migration-')?'supabase_migrations':name==='managed-schema-reference.sql'?'auth|storage':null;
 if(name.endsWith('data.sql'))return {script:dumpDataScript,env:{INCLUDED_SCHEMAS:schema??'*',...(schema?{}:{EXCLUDED_SCHEMAS:EXCLUDED_SCHEMAS.join('|'),EXTRA_FLAGS:'--exclude-table "storage"."buckets_vectors" --exclude-table "storage"."vector_indexes"'})}};
 return {script:dumpSchemaScript,env:schema?{EXTRA_FLAGS:'--schema='+schema}:{EXCLUDED_SCHEMAS:INTERNAL_SCHEMAS.join('|')}};
}

export function clientArgs(id,step,script,env,input=false) {
 if(!/^[a-f0-9]{32}$/.test(id)||!/^([a-z]+-?)+$/.test(step))fail('CONTAINER_ID_INVALID');
 const keys=Object.keys(env).filter(k=>k.startsWith('PG')||['RESERVED_ROLES','ALLOWED_CONFIGS','INCLUDED_SCHEMAS','EXCLUDED_SCHEMAS','EXTRA_FLAGS'].includes(k));
 return ['run','--rm','--name','faraios-t11-'+id+'-'+step,'--label','com.faraios.t11.run='+id,
  '--log-driver','none','--mount',certificateMount(),'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534',
  ...(input?['--interactive']:[]),...keys.flatMap(k=>['--env',k]),'--entrypoint','/bin/bash',CLIENT_IMAGE,'-c',"printf '%s\\n' '"+CLIENT_STARTED+"' >&2\n"+script];
}

export function parsePgManifest(stdout,scope) {
 let m;try{m=JSON.parse(stdout);}catch{fail('MANIFEST_OUTPUT_INVALID');}
 return validateManifest(m,scope);
}

// Remove only containers bearing this exact random run label and exact name.
// Cleanup has its own bounded deadline and still runs after operator cancellation.
export async function cleanupClient(id,step,env,runner=run) {
 const name='faraios-t11-'+id+'-'+step;
 const list=['ps','--all','--filter','label=com.faraios.t11.run='+id,'--filter','name=^/'+name+'$','--format','{{.ID}}'];
 try {
  const found=(await runner('docker',list,{env,timeout:10000,maxOutput:4096})).stdout.trim();
  if(!found)return;
  if(!/^[a-f0-9]{12,64}$/.test(found))fail('CONTAINER_CLEANUP_FAILED');
  await runner('docker',['rm','--force',found],{env,timeout:10000,maxOutput:4096});
  if((await runner('docker',list,{env,timeout:10000,maxOutput:4096})).stdout.trim())fail('CONTAINER_CLEANUP_FAILED');
 } catch {fail('CONTAINER_CLEANUP_FAILED');}
}

// These are observations of allowlisted failure text, not proof of cause.
// Return constants only: upstream messages/bodies may contain credentials or SQL.
export function metadataFailureLabel(stderr) {
 const message=stderr.slice(-65536).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
 const rules=[
  ['RESTORE_SEQUENCE_STATE_PENDING',/\bERROR:\s+RESTORE_SEQUENCE_STATE_PENDING\b/],
  ['RESTORE_ACTOR_CHANGED',/\bERROR:\s+RESTORE_ACTOR_CHANGED\b/],
  ['RESTORE_CHECK_RECONSTRUCTION_REFUSED',/\bERROR:\s+RESTORE_CHECK_RECONSTRUCTION_REFUSED\b/],
  ['RESTORE_TRANSACTION_REQUIRED',/\bERROR:\s+SAVEPOINT can only be used in transaction blocks\b/],
  ['RESTORE_CATALOG_MISMATCH',/\bERROR:\s+RESTORE_CATALOG_MISMATCH\b/],
  ['RESTORE_DATA_MISMATCH',/\bERROR:\s+RESTORE_DATA_MISMATCH\b/],
  ['METADATA_LOGIN_REQUIRED',/Access token not provided|DbQueryLoginRequiredError|not logged in/i],
  ['METADATA_API_ACCESS_DENIED',/unexpected(?: [a-z]+){0,4} status(?: code)?\s*[:=]?\s*(?:401|403)\b|\b(?:unauthorized|forbidden)\b/i],
  ['METADATA_PROJECT_NOT_FOUND',/unexpected status\s*[:=]?\s*404\b|project (?:not found|does not exist)/i],
  ['METADATA_IPV6_UNAVAILABLE',/IPv6 is not supported on your current network|DbConfigIpv6Error/],
  ['METADATA_TLS_FAILED',/CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT_IN_CHAIN|unable to verify (?:the first certificate|leaf signature)|certificate (?:has expired|verify failed)|server certificate .*does not match host name|server does not support SSL/i],
  ['METADATA_NETWORK_FAILED',/\b(?:ETIMEDOUT|ECONNRESET|ENETUNREACH|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|EHOSTUNREACH|UND_ERR_CONNECT_TIMEOUT)\b|failed to (?:resolve host|fetch)|could not translate host name|connection (?:timed out|refused)|network (?:is unreachable|request failed)/i],
  ['METADATA_DATABASE_AUTH_FAILED',/password authentication failed|SQLSTATE\s*[:=]?\s*28P01\b/i],
  ['METADATA_PERMISSION_DENIED',/\bERROR:\s+(?:permission denied for|must be owner of)|SQLSTATE\s*[:=]?\s*42501\b/i],
  ['METADATA_SQL_FILE_UNREADABLE',/failed to read SQL file|DbQueryReadFileError/i],
  ['METADATA_CONFIG_INVALID',/DbConfigLoadError|failed to (?:load|parse|read) (?:project )?config|failed to read profile|Unsupported Config Type/i],
  ['METADATA_CLI_COMMAND_INVALID',/unknown (?:command|flag)|unrecognized (?:command|option)|DbQueryMutuallyExclusiveFlagsError/i],
  ['METADATA_CLI_LAUNCH_FAILED',/Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/i],
  ['METADATA_QUERY_FAILED',/DbQueryExecError|DbQueryUnexpectedStatusError|failed to execute query|unexpected status\s*[:=]?\s*(?:400|408|429|5\d\d)\b|SQLSTATE\s*[:=]?\s*[0-9A-Z]{5}\b/i],
 ];
 return rules.find(([,pattern])=>pattern.test(message))?.[0]??'METADATA_UNCLASSIFIED';
}

// Child output stays in memory; callers receive only fixed failure labels on error.
export function run(command,args,options={}) {
 return new Promise((resolveRun,rejectRun)=>{
  let child,stdout=[],stderr=[],size=0,settled=false,stopping=false,timer;
  const error=code=>new BackupFailure(code);
  const settle=(e,result)=>{if(settled)return;settled=true;clearTimeout(timer);options.signal?.removeEventListener('abort',abort);e?rejectRun(e):resolveRun(result);};
  const stop=async code=>{
   if(stopping||settled)return;stopping=true;
   if(child.pid) {
    if(process.platform==='win32') {
     await new Promise(done=>{
      const killer=spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore',windowsHide:true,shell:false});
      const limit=setTimeout(()=>{killer.kill();done();},1500);
      killer.once('error',()=>{clearTimeout(limit);done();});killer.once('close',()=>{clearTimeout(limit);done();});
     });
     try{child.kill('SIGKILL');}catch{}
    } else {try{process.kill(-child.pid,'SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}}
   }
   // Close inherited pipes even when an already-exited Windows parent prevents
   // taskkill from finding descendants. No dump files are ever child-writable.
   child.stdin?.destroy();child.stdout.destroy();child.stderr.destroy();child.unref();settle(error(code));
  };
  const abort=()=>void stop('BACKUP_CANCELLED');
  if(options.signal?.aborted){settle(error('BACKUP_CANCELLED'));return;}
  const processFailure=()=>error(options.failureContext==='pg-client'?'CLIENT_CONTAINER_PROCESS_FAILED':options.failureContext==='metadata'?'METADATA_PROCESS_FAILED':'CHILD_FAILED');
  try { child=spawn(command,args,{cwd:options.cwd,env:options.env,stdio:[options.input===undefined?'ignore':'pipe','pipe','pipe'],shell:false,windowsHide:true,detached:process.platform!=='win32'}); } catch { settle(processFailure()); return; }
  options.signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>void stop('CHILD_TIMEOUT'),options.timeout??900000);
  const collect=destination=>chunk=>{
   size+=chunk.length;
   if(size>(options.maxOutput??8*1024*1024)){void stop('CHILD_OUTPUT_TOO_LARGE');return;}
   destination.push(chunk);
  };
  if(options.input!==undefined){child.stdin.on('error',()=>{});child.stdin.end(options.input);}
  child.stdout.on('data',collect(stdout));child.stderr.on('data',collect(stderr));
  child.once('error',()=>{if(!stopping)settle(processFailure());});
  child.once('close',code=>{
   if(stopping)return;
   if(code!==0){
    const text=Buffer.concat(stderr).toString('utf8');
    const label=options.failureContext==='pg-client'?(text.split(/\r?\n/).includes(CLIENT_STARTED)?metadataFailureLabel(text):'CLIENT_CONTAINER_START_FAILED'):options.failureContext==='metadata'?metadataFailureLabel(text):'CHILD_FAILED';
    settle(error(label));return;
   }
   const stdoutBytes=Buffer.concat(stdout);
   settle(null,{stdout:stdoutBytes.toString('utf8'),stdoutBytes,stderr:Buffer.concat(stderr).toString('utf8')});
  });
 });
}

async function plainDirectory(path) {
 const s=await lstat(path);
 if(!s.isDirectory()||s.isSymbolicLink()) fail('PRIVATE_PATH_UNSAFE');
}

const pathIdentity=p=>process.platform==='win32'?p.toLowerCase():p;
export async function outsideGit(path) {
 const absolute=resolve(path),canonical=await realpath(path);
 if(pathIdentity(absolute)!==pathIdentity(canonical)) fail('PRIVATE_PATH_NOT_CANONICAL');
 for(let current=absolute;;current=dirname(current)) {
  const s=await lstat(current);if(!s.isDirectory()||s.isSymbolicLink())fail('PRIVATE_PATH_UNSAFE');
  try{await lstat(join(current,'.git'));fail('PRIVATE_PATH_IN_GIT');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(dirname(current)===current)break;
 }
}

export function directoryGuard(signal) {
 const snapshots=new Map();
 const check=async()=>{
  checkCancelled(signal);
  for(const [path,expected] of snapshots) {
   await outsideGit(path);const now=await lstat(path);
   if(now.dev!==expected.dev||now.ino!==expected.ino)fail('PRIVATE_DIRECTORY_REPLACED');
  }
  checkCancelled(signal);
 };
 return {check,async add(path){await check();await outsideGit(path);await plainDirectory(path);snapshots.set(path,await lstat(path));}};
}

// Fixed local configuration; never an environment override or archive trust anchor.
export async function loadCurrentProfile(home=homedir(),runner=run,signal) {
 const root=join(home,'.faraios-backup-profile'),path=join(root,'current.json');
 const guard=directoryGuard(signal);let initial;
 const read=async()=>{
  try {
   await guard.check();await outsideGit(root);await plainDirectory(root);
   const dir=await lstat(root),stat=await lstat(path);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>65536)fail('PRIVATE_PROFILE_UNSAFE');
   if(process.platform==='win32'){await verifyWindowsACL(root,true,runner,signal);await verifyWindowsACL(path,false,runner,signal);}
   else if((dir.mode&0o077)||(stat.mode&0o077)||dir.uid!==process.getuid()||stat.uid!==process.getuid())fail('PRIVATE_PROFILE_UNSAFE');
   const handle=await open(path,'r');
   try {
    const opened=await handle.stat();
    if(opened.dev!==stat.dev||opened.ino!==stat.ino)fail('PRIVATE_PROFILE_CHANGED');
    const buffer=Buffer.alloc(65537);const {bytesRead}=await handle.read(buffer,0,buffer.length,0);const bytes=buffer.subarray(0,bytesRead);const after=await lstat(path),finished=await handle.stat();await guard.check();
    if(bytes.length!==stat.size||bytes.length>65536||after.isSymbolicLink()||after.dev!==stat.dev||after.ino!==stat.ino||finished.size!==stat.size||finished.mtimeMs!==stat.mtimeMs||finished.ctimeMs!==stat.ctimeMs)fail('PRIVATE_PROFILE_CHANGED');
    const identity=[stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs,sha256(bytes)];
    if(initial&&!same(initial,identity))fail('PRIVATE_PROFILE_CHANGED');
    initial??=identity;
    return validateScope(JSON.parse(bytes.toString('utf8')),SOURCE);
   } finally {await handle.close();}
  } catch(e) {
   if(e.code==='BACKUP_CANCELLED')throw e;
   if(e.code==='ENOENT')fail('PRIVATE_PROFILE_MISSING');
   if(e.code==='PRIVATE_PROFILE_CHANGED')throw e;
   fail('PRIVATE_PROFILE_UNSAFE_OR_INVALID');
  }
 };
 try {await guard.add(root);}catch(e){if(e.code==='ENOENT')fail('PRIVATE_PROFILE_MISSING');if(e.code==='BACKUP_CANCELLED')throw e;fail('PRIVATE_PROFILE_UNSAFE_OR_INVALID');}
 const scope=await read();return {scope,check:async()=>{await read();}};
}

export async function localDocker(env,runner=run,signal) {
 checkCancelled(signal);
 const context=(await runner('docker',['context','show'],{env,timeout:15000,signal})).stdout.trim();
 checkCancelled(signal);
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(context))fail('DOCKER_CONTEXT_INVALID');
 const raw=(await runner('docker',['context','inspect',context,'--format','{{json .Endpoints.docker.Host}}'],{env,timeout:15000,signal})).stdout;
 checkCancelled(signal);
 let endpoint;try{endpoint=JSON.parse(raw);}catch{fail('DOCKER_CONTEXT_INVALID');}
 const local=process.platform==='win32'?/^npipe:\/\/\/\/\.\/pipe\/[a-zA-Z0-9_.-]+$/:/^unix:\/\/\//;
 if(typeof endpoint!=='string'||!local.test(endpoint)||/[\r\n\0]/.test(endpoint))fail('DOCKER_CONTEXT_NOT_LOCAL');
 const pinned={...env,DOCKER_HOST:endpoint};delete pinned.DOCKER_CONTEXT;
 const os=(await runner('docker',['info','--format','{{.OSType}}'],{env:pinned,timeout:20000,signal})).stdout.trim();
 checkCancelled(signal);
 if(os!=='linux')fail('DOCKER_LINUX_REQUIRED');return pinned;
}

// Windows PowerShell launched through Node can inherit PowerShell7 module paths.
// Let its own runtime build the module path; ACL access itself uses .NET APIs.
export function windowsEnvironment(extra,original=process.env) {
 const env={...original,...extra};
 for(const key of Object.keys(env))if(key.toLowerCase()==='psmodulepath')delete env[key];
 return env;
}

// The read-only verifier never repairs permissions on an existing recovery key.
export async function verifyWindowsACL(path,directory,runner=run,signal) {
 checkCancelled(signal);
 const script="$ErrorActionPreference='Stop'; try { $p=$env:FARAIOS_BACKUP_ACL_PATH; $s=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; if($env:FARAIOS_BACKUP_ACL_DIRECTORY -eq '1'){$a=[System.IO.Directory]::GetAccessControl($p)}else{$a=[System.IO.File]::GetAccessControl($p)}; if($a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $s.Value){'PRIVATE_ACL_OWNER_MISMATCH'; exit}; $rules=@($a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])); if(($env:FARAIOS_BACKUP_ACL_DIRECTORY -eq '1' -and !$a.AreAccessRulesProtected) -or $rules.Count -ne 1 -or $rules[0].IdentityReference.Value -ne $s.Value -or $rules[0].AccessControlType -ne 'Allow' -or ($rules[0].FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -ne [System.Security.AccessControl.FileSystemRights]::FullControl){'PRIVATE_ACL_UNSAFE'; exit}; 'PRIVATE_ACL_OK' } catch { 'PRIVATE_ACL_FAILED' }";
 const result=await runner('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{timeout:60000,signal,env:windowsEnvironment({FARAIOS_BACKUP_ACL_PATH:path,FARAIOS_BACKUP_ACL_DIRECTORY:directory?'1':'0'})});
 checkCancelled(signal);
 if(result.stdout.trim()!=='PRIVATE_ACL_OK')fail(['PRIVATE_ACL_OWNER_MISMATCH','PRIVATE_ACL_UNSAFE'].includes(result.stdout.trim())?result.stdout.trim():'PRIVATE_ACL_FAILED');
}

async function setWindowsPrivateACL(path,directory,created,runner,signal) {
 checkCancelled(signal);
 const labels=['PRIVATE_ACL_IDENTITY_FAILED','PRIVATE_ACL_READ_FAILED','PRIVATE_ACL_OWNER_MISMATCH','PRIVATE_ACL_BUILD_FAILED','PRIVATE_ACL_WRITE_FAILED'];
 // Explicit .NET constructors avoid PowerShell New-Object overload coercion.
 // Fixed phase labels diagnose local setup without returning paths or errors.
 const script="$ErrorActionPreference='Stop'; $phase='PRIVATE_ACL_IDENTITY_FAILED'; try { $p=$env:FARAIOS_BACKUP_ACL_PATH; $s=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; $phase='PRIVATE_ACL_READ_FAILED'; if($env:FARAIOS_BACKUP_ACL_DIRECTORY -eq '1'){$old=[System.IO.Directory]::GetAccessControl($p)}else{$old=[System.IO.File]::GetAccessControl($p)}; if($env:FARAIOS_BACKUP_ACL_CREATED -ne '1' -and $old.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $s.Value){'PRIVATE_ACL_OWNER_MISMATCH'; exit}; $phase='PRIVATE_ACL_BUILD_FAILED'; if($env:FARAIOS_BACKUP_ACL_DIRECTORY -eq '1'){$a=[System.Security.AccessControl.DirectorySecurity]::new(); $inherit=[System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit}else{$a=[System.Security.AccessControl.FileSecurity]::new(); $inherit=[System.Security.AccessControl.InheritanceFlags]::None}; $a.SetOwner($s); $a.SetAccessRuleProtection($true,$false); $rule=[System.Security.AccessControl.FileSystemAccessRule]::new($s,[System.Security.AccessControl.FileSystemRights]::FullControl,$inherit,[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow); $a.AddAccessRule($rule); $phase='PRIVATE_ACL_WRITE_FAILED'; if($env:FARAIOS_BACKUP_ACL_DIRECTORY -eq '1'){[System.IO.Directory]::SetAccessControl($p,$a)}else{[System.IO.File]::SetAccessControl($p,$a)}; 'PRIVATE_ACL_SET' } catch { $phase }";
 const result=await runner('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{timeout:60000,signal,env:windowsEnvironment({FARAIOS_BACKUP_ACL_PATH:path,FARAIOS_BACKUP_ACL_DIRECTORY:directory?'1':'0',FARAIOS_BACKUP_ACL_CREATED:created?'1':'0'})});
 checkCancelled(signal);
 if(result.stdout.trim()!=='PRIVATE_ACL_SET')fail(labels.includes(result.stdout.trim())?result.stdout.trim():'PRIVATE_ACL_SET_FAILED');
 await verifyWindowsACL(path,directory,runner,signal);
}

export async function privateDirectory(path, runner=run,signal) {
 checkCancelled(signal);let created=false;
 try { await mkdir(path,{mode:0o700});created=true; } catch(e) { if(e.code!=='EEXIST') fail('PRIVATE_DIRECTORY_FAILED'); }
 await plainDirectory(path);checkCancelled(signal);
 if(process.platform==='win32') {
  // Set the current user as owner only for newly created objects. An existing
  // foreign-owned directory is refused; existing key verification is read-only.
  await setWindowsPrivateACL(path,true,created,runner,signal);
 } else {
  const s=await lstat(path);
  if((s.mode&0o077)!==0||s.uid!==process.getuid()) fail('PRIVATE_PERMISSIONS_FAILED');
 }
}

export async function writePrivate(path,data,guard,runner=run,signal) {
 await guard?.check();
 const f=await open(path,'wx',0o600);
 try {
  await guard?.check();
  // Elevated Windows tokens may default new files to Administrators ownership,
  // even inside a user-owned directory. Pin this newly created file's ACL too.
  if(process.platform==='win32')await setWindowsPrivateACL(path,false,true,runner,signal);
  await guard?.check();await f.writeFile(data);await f.sync();await guard?.check();
 } finally { await f.close(); }
}

export function sealBackup(payload,key,id) {
 if(!Buffer.isBuffer(key)||key.length!==32||!/^[a-f0-9]{32}$/.test(id)) fail('KEY_OR_ID_INVALID');
 const header={format:FORMAT,source:SOURCE,id};
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(aad(header));
 const zipped=gzipSync(Buffer.from(JSON.stringify(payload)));
 if(zipped.length>MAX_ARCHIVE/2) fail('BACKUP_TOO_LARGE');
 const encrypted=Buffer.concat([cipher.update(zipped),cipher.final()]);
 return Buffer.from(JSON.stringify({...header,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')}));
}

function decryptBackup(bytes,key) {
 try {
  if(bytes.length>MAX_ARCHIVE||key.length!==32) fail('ARCHIVE_INVALID');
  const e=JSON.parse(bytes.toString('utf8'));
  if(e.format!==FORMAT||e.source!==SOURCE||!/^[a-f0-9]{32}$/.test(e.id)) fail('ARCHIVE_INVALID');
  const iv=Buffer.from(e.iv,'base64'),tag=Buffer.from(e.tag,'base64');
  if(iv.length!==12||tag.length!==16) fail('ARCHIVE_INVALID');
  const decipher=createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAAD(aad({format:e.format,source:e.source,id:e.id}));decipher.setAuthTag(tag);
  const compressed=Buffer.concat([decipher.update(Buffer.from(e.ciphertext,'base64')),decipher.final()]);
  const p=JSON.parse(gunzipSync(compressed,{maxOutputLength:MAX_PAYLOAD}).toString('utf8'));
  if(p.source!==SOURCE||!Array.isArray(p.files)||!same(p.files.map(f=>f.name),FILES)) fail('ARCHIVE_INVALID');
  for(const f of p.files) {
   if(typeof f.content!=='string'||sha256(Buffer.from(f.content,'utf8'))!==f.sha256) fail('ARCHIVE_INVALID');
  }
  return {id:e.id,payload:p};
 } catch { fail('ARCHIVE_VERIFICATION_FAILED'); }
}
export function openBackup(bytes,key,scope) {
 try {
  const result=decryptBackup(bytes,key),p=result.payload;
  const m=JSON.parse(p.files.find(f=>f.name==='manifest.json').content);
  validateManifest(m.before,scope);validateManifest(m.after,scope);
  if(m.before.scope!==undefined && (m.version!==1 || m.source!==SOURCE || m.filterSource!=='supabase/cli@'+CLI || m.clientImage!==CLIENT_IMAGE || !Number.isFinite(Date.parse(m.started)) || !Number.isFinite(Date.parse(m.finished)) || Date.parse(m.finished)<Date.parse(m.started)))fail('ARCHIVE_VERIFICATION_FAILED');
  if(!same(m.before,m.after)) fail('SOURCE_CHANGED_DURING_BACKUP');
  for(const [name] of DUMPS) assertCompleteDump(name,p.files.find(f=>f.name===name).content);
  assertDataCoverage(p.files,m.before);
  return result;
 } catch { fail('ARCHIVE_VERIFICATION_FAILED'); }
}

// Private in-memory API for the isolated restore helper. Never log its payload.
export async function readVerifiedBackup(archive,keyRoot,runner=run,signal) {
 checkCancelled(signal);
 await outsideGit(keyRoot);const guard=directoryGuard(signal);await guard.add(keyRoot);
 const s=await lstat(archive);
 if(!s.isFile()||s.isSymbolicLink()||s.size>MAX_ARCHIVE) fail('ARCHIVE_INVALID');
 const bytes=await readFile(archive);
 let id;
 try { id=JSON.parse(bytes.toString('utf8')).id; } catch { fail('ARCHIVE_INVALID'); }
 if(!/^[a-f0-9]{32}$/.test(id)) fail('ARCHIVE_INVALID');
 await plainDirectory(keyRoot);
 const keyPath=join(keyRoot,id+'.key'),k=await lstat(keyPath);
 if(!k.isFile()||k.isSymbolicLink()||k.size!==32) fail('KEY_FILE_INVALID');
 if(process.platform!=='win32'&&((k.mode&0o077)!==0||k.uid!==process.getuid()||((await lstat(keyRoot)).mode&0o077)!==0))fail('KEY_FILE_PERMISSIONS_UNSAFE');
 if(process.platform==='win32'){await verifyWindowsACL(keyRoot,true,runner,signal);await verifyWindowsACL(keyPath,false,runner,signal);}
 await guard.check();
 const handle=await open(keyPath,'r');let key;
 try {
  await guard.check();const opened=await handle.stat(),current=await lstat(keyPath);
  if(!opened.isFile()||current.isSymbolicLink()||opened.dev!==k.dev||opened.ino!==k.ino||current.dev!==k.dev||current.ino!==k.ino)fail('KEY_FILE_CHANGED');
  key=await handle.readFile();await guard.check();
 } finally {await handle.close();}
 try {
  const decoded=decryptBackup(bytes,key);
  let m;try{m=JSON.parse(decoded.payload.files.find(f=>f.name==='manifest.json').content);}catch{fail('ARCHIVE_VERIFICATION_FAILED');}
  const profile=m.before?.scope!==undefined?await loadCurrentProfile(dirname(keyRoot),runner,signal):undefined;
  const result=openBackup(bytes,key,profile?.scope);await profile?.check();
  return {id:result.id,sha256:sha256(bytes),fileCount:result.payload.files.length,payload:result.payload,scope:profile?.scope,checkProfile:profile?.check};
 }
 finally { key.fill(0); }
}

export async function verifyFile(archive,keyRoot,runner=run,signal) {
 const {id,sha256,fileCount}=await readVerifiedBackup(archive,keyRoot,runner,signal);
 return {id,sha256,fileCount};
}

export async function capture({home=homedir(),password,runner=run,progress=()=>{},signal,removeWorkdir=path=>rm(path,{recursive:true})}) {
 if(signal?.aborted) fail('BACKUP_CANCELLED');
 const profile=await loadCurrentProfile(home,runner,signal),scope=profile.scope;
 const root=join(home,'.faraios-backups'),keyRoot=join(home,'.faraios-recovery-keys');
 // Refuse command-line credentials, inherited project/host overrides and repo-local dumps.
 let env=clientEnvironment(password);
 const guard=directoryGuard(signal);await guard.add(home);
 await privateDirectory(root,runner,signal);await guard.add(root);
 await guard.check();await privateDirectory(keyRoot,runner,signal);await guard.add(keyRoot);
 await verifyProviderCertificate();
 env=await localDocker(env,runner,signal);
 const id=randomBytes(16).toString('hex'),work=join(root,id),temporary=join(work,'private-export');
 await guard.check();await privateDirectory(work,runner,signal);await guard.add(work);
 await guard.check();await privateDirectory(temporary,runner,signal);await guard.add(temporary);
 const sql=currentManifestSQL(await readFile(new URL('./staging-backup-manifest.sql',import.meta.url),'utf8'),await readFile(new URL('./restore-catalog.sql',import.meta.url),'utf8'),scope);
 const client=async (step,script,extra={},input)=>{
  checkCancelled(signal);
  const heartbeat=setInterval(()=>progress('This backup step is still running...'),20000);
  const childEnv={...env,...extra};
  try {
   await guard.check();await profile.check();await verifyProviderCertificate();checkCancelled(signal);
   const result=await runner('docker',clientArgs(id,step,script,childEnv,input!==undefined),{cwd:temporary,env:childEnv,signal,input,maxOutput:MAX_FILE,failureContext:'pg-client'});
   await guard.check();return result;
  } finally {
   clearInterval(heartbeat);
   await cleanupClient(id,step,env,runner);
   delete childEnv.PGPASSWORD;
  }
 };
 let artifact,keyPath,checksum,completed=false,cleanup='NOT_RUN';
 const started=new Date().toISOString();
 try {
  progress('Checking pinned PostgreSQL client image');
  const imageHeartbeat=setInterval(()=>progress('This backup step is still running...'),20000);
  try{await ensureClientImage(env,runner,signal);}finally{clearInterval(imageHeartbeat);}
  progress('Checking source metadata');
  const readManifest=async()=>{
   const m=parsePgManifest((await client('metadata','exec psql -X -w -q -A -t --set=ON_ERROR_STOP=1',{},sql)).stdout,scope);
   if(m.scope!==scope.id || !matchesCurrentScope(m,scope))fail('SOURCE_SCOPE_CHANGED');
   return m;
  };
  const before=await readManifest();
  const files=[];let totalBytes=0;
  for(const [name] of DUMPS) {
   progress('Exporting '+name);
   let result;
   try { const spec=dumpSpec(name);result=await client(name.replace('.sql',''),spec.script,spec.env); }
   catch(error) { if(['BACKUP_CANCELLED','CONTAINER_CLEANUP_FAILED','CHILD_TIMEOUT','CHILD_OUTPUT_TOO_LARGE','CLIENT_CONTAINER_START_FAILED','CLIENT_CONTAINER_PROCESS_FAILED','PROVIDER_CA_INVALID','PRIVATE_PROFILE_CHANGED','PRIVATE_PROFILE_MISSING','PRIVATE_PROFILE_UNSAFE_OR_INVALID'].includes(error.code))throw error;fail('DUMP_'+name.replace(/\.sql$/,'').replaceAll('-','_').toUpperCase()+'_FAILED'); }
   const bytes=result.stdoutBytes??Buffer.from(result.stdout,'utf8'),content=bytes.toString('utf8');
   totalBytes+=bytes.length;
   if(bytes.length===0||bytes.length>MAX_FILE||totalBytes>MAX_PAYLOAD/2)fail('BACKUP_TOO_LARGE');
   if(!Buffer.from(content,'utf8').equals(bytes))fail('DUMP_ENCODING_INVALID');
   assertCompleteDump(name,content);
   files.push({name,content,sha256:sha256(bytes)});
  }
  progress('Checking capture consistency');
  const after=await readManifest();
  if(signal?.aborted) fail('BACKUP_CANCELLED');
  if(!same(before,after)) fail('SOURCE_CHANGED_DURING_BACKUP');
  const manifest={version:1,source:SOURCE,filterSource:'supabase/cli@'+CLI,clientImage:CLIENT_IMAGE,transport:{host:POOLER_HOST,port:5432,sslmode:'verify-full',sslrootcert:'Supabase Root 2021 CA',caSha256:ROOT_CERT_SHA256},started,finished:new Date().toISOString(),consistency:'Operator-confirmed write freeze plus before/after row and catalog SHA-256 comparison; individual pg_dump transactions.',before,after,scope:'Logical database export with Auth data and separate migration history. Platform configuration, custom managed-schema replay, Storage bytes and provider secrets require separate recovery treatment.'};
  const content=JSON.stringify(manifest);files.push({name:'manifest.json',content,sha256:sha256(content)});
  assertDataCoverage(files,before);
  if(Buffer.byteLength(JSON.stringify(files))>MAX_PAYLOAD/2) fail('BACKUP_TOO_LARGE');
  await profile.check();
  progress('Encrypting and verifying locally');
  if(signal?.aborted) fail('BACKUP_CANCELLED');
  const key=randomBytes(32);
  try {
   keyPath=join(keyRoot,id+'.key');await writePrivate(keyPath,key,guard,runner,signal);
   const bytes=sealBackup({source:SOURCE,files},key,id);openBackup(bytes,key,scope);
   artifact=join(work,'faraios-staging-'+id+'.fbackup');await writePrivate(artifact,bytes,guard,runner,signal);
   await guard.check();
   const result=await verifyFile(artifact,keyRoot,runner,signal);
   checksum=result.sha256;
   await writePrivate(artifact+'.sha256',result.sha256+'\n',guard,runner,signal);
  } finally { key.fill(0); }
  if(signal?.aborted) fail('BACKUP_CANCELLED');
  await guard.check();await removeWorkdir(temporary);
  if(signal?.aborted)fail('BACKUP_CANCELLED');
  await profile.check();
  cleanup='PASSED';completed=true;
  return {source:SOURCE,artifact,keyPath,sha256:checksum,privateWorkdirCleanup:cleanup,helperPlaintextSQLFiles:'NEVER_WRITTEN',encryptedLocalVerification:'PASSED',offsiteBackup:'PENDING',offlineKeyCopy:'PENDING',restore:'NOT_RUN'};
 } finally {
  delete env.PGPASSWORD;
  if(!completed) {
   // SQL was captured only in memory; no child can write plaintext dump files.
   progress('Stopped. Incomplete local backup setup may remain in '+work+'. Do not upload it.');
  }
 }
}

// Preserve an unresolved daemon cleanup even when Ctrl+C caused the interruption.
export function terminalFailure(error,signal) {
 return signal?.aborted&&error?.code!=='CONTAINER_CLEANUP_FAILED'?new BackupFailure('BACKUP_CANCELLED'):error;
}

async function main() {
 const argv=process.argv.slice(2),home=homedir(),keyRoot=join(home,'.faraios-recovery-keys');
 if(argv[0]==='--verify-file'&&argv.length===2) {
  const result=await verifyFile(resolve(argv[1]),keyRoot);
  console.log(JSON.stringify({encryptedBackupVerification:'PASSED',...result},null,2));return;
 }
 if(argv.length!==0||!process.stdin.isTTY||!process.stdout.isTTY) fail('RUN_INTERACTIVELY');
 let muted=false;
 const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
 const terminal=createInterface({input:process.stdin,output,terminal:true,historySize:0});
 const cancellation=new AbortController(),cancel=()=>cancellation.abort();
 terminal.on('SIGINT',cancel);process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 const ask=async(prompt,hidden=false)=>{process.stdout.write(prompt+'\n');muted=hidden;try{return await terminal.question('',{signal:cancellation.signal});}finally{muted=false;if(hidden)process.stdout.write('\n');}};
 try {
  console.log('FaraiOS STAGING logical backup only: '+SOURCE+'.');
  console.log('Stop the FaraiOS staging app. Make no schema, account or business changes until this helper finishes.');
  console.log('The existing database password is entered privately. No password reset or remote restore is performed.');
  console.log('If you do not have that existing password, press Ctrl+C and report PASSWORD_UNKNOWN.');
  if((await ask('Confirm writes are paused for this capture (type QUIET):')).trim()!=='QUIET') fail('WRITE_FREEZE_NOT_CONFIRMED');
  const password=await ask('Existing FaraiOS STAGING database password (hidden; never paste in chat):',true);
  const report=await capture({password,progress:message=>console.log(message),signal:cancellation.signal});
  if(cancellation.signal.aborted)fail('BACKUP_CANCELLED');
  console.log(JSON.stringify(report,null,2));
  console.log('Keep the .key file separate and copy it to protected offline storage. Upload only the .fbackup and .sha256 files to the approved private Drive folder.');
  console.log('T11 remains In progress: off-site retrieval/decryption, isolated restore and access/audit acceptance are pending.');
 } catch(error) { throw terminalFailure(error,cancellation.signal); }
 finally { terminal.close();process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel); }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 main().catch(error=>{console.error('Backup stopped ['+(error instanceof BackupFailure?error.code:'LOCAL_FAILURE')+']. Share only this label. Keep keys, dumps, passwords and terminal captures private.');process.exitCode=1;});
}
