// Creates its OWN disposable cluster; never reads application DB configuration.
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const correctionOnly=process.argv.includes('--test-correction');
if(Number(process.versions.node.split('.')[0])!==24)throw new Error('Node 24 required');
const bin=process.env.T19_PG_BIN??(process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin':'');
const executable=name=>bin?join(bin,name+(process.platform==='win32'?'.exe':'')):name;
const root=await mkdtemp(join(tmpdir(),'faraios-t19-synthetic-')),data=join(root,'data'),log=join(root,'postgres.log');
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
// Do not inherit database/service credentials from the host.
const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('PG')||k.includes('DATABASE_URL')||k.startsWith('FARAIOS_')||k.startsWith('SUPABASE_'))delete env[k];
env.PGPASSFILE=join(root,'absent-password-file');env.PGSERVICEFILE=join(root,'absent-service-file');
const run=(command,args,{stream=false,extraEnv={},background=false}={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:{...env,...extraEnv},windowsHide:true});let out='',err='';
 child.stdout.on('data',d=>{out+=d;if(stream)process.stdout.write(d);});child.stderr.on('data',d=>{err+=d;if(stream)process.stderr.write(d);});
 child.on('error',reject);child.on(background?'exit':'close',code=>{if(background){child.stdout.destroy();child.stderr.destroy();}code===0?resolve(out):reject(new Error(`Local test command failed (${code}): ${err||out}`));});
});
let started=false;
try{
 await run(executable('initdb'),['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--no-locale']);
 await run(executable('pg_ctl'),['-D',data,'-l',log,'-o',`-h 127.0.0.1 -p ${port} -k "${root.replaceAll('\\','/')}"`,'-w','start'],{background:true});started=true;

 console.log('T19 isolated PostgreSQL:',(await run(executable('psql'),['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-X','-Atc','show server_version'])).trim());
 await run(process.execPath,['--test','--test-name-pattern='+(correctionOnly?'explicit fictitious non-VAT correction':'approved standard worker creates'),'test/t19-standard-worker.test.js'],{stream:true,extraEnv:{T19_CUSTODY_NATIVE_URL:`postgresql://postgres@127.0.0.1:${port}/postgres`}});
 if(correctionOnly)console.log('T19_TEST_CORRECTION_NATIVE_PASS');
 console.log('T19_STANDARD_WORKER_NATIVE_PASS');
}finally{
 const hasPid=await stat(join(data,'postmaster.pid')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
 if(started||hasPid)await run(executable('pg_ctl'),['-D',data,'-m','fast','-w','stop']);
 // Validate the exact random directory before recursive deletion; one filesystem API.
 const rel=relative(resolve(tmpdir()),resolve(root));
 if(!rel||rel.startsWith('..')||isAbsolute(rel)||!rel.startsWith('faraios-t19-synthetic-'))throw new Error('Unsafe cleanup target');
 // Confirm the directory is ours before deleting even after a partial init failure.
 await rm(root,{recursive:true,force:true});console.log('T19_DISPOSABLE_CLUSTER_CLEANED');
}

if(!correctionOnly)await run(process.execPath,[fileURLToPath(import.meta.url),'--test-correction'],{stream:true});
