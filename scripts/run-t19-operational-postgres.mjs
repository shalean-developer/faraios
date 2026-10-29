// Creates its OWN disposable cluster; never reads application DB configuration.
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
if(Number(process.versions.node.split('.')[0])!==24)throw new Error('Node 24 required');
const ownerAdapter=process.argv[2]==='--owner-adapter';
if(process.argv.length>3||process.argv[2]&&!ownerAdapter)throw Error('Fixed test mode required');
const bin=process.env.T19_PG_BIN??(process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin':'');
const executable=name=>bin?join(bin,name+(process.platform==='win32'?'.exe':'')):name;
const root=await mkdtemp(join(tmpdir(),'faraios-t19-operational-synthetic-')),data=join(root,'data'),log=join(root,'postgres.log');
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
// Do not inherit database/service credentials from the host.
const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('PG')||k.includes('DATABASE_URL')||k.startsWith('FARAIOS_')||k.startsWith('SUPABASE_'))delete env[k];
env.PGPASSFILE=join(root,'absent-password-file');env.PGSERVICEFILE=join(root,'absent-service-file');
const run=(command,args,{stream=false,extraEnv={},background=false,timeoutMs=60000}={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:{...env,...extraEnv},windowsHide:true});let out='',err='',bytes=0,stopped=false;
 const stop=()=>{stopped=true;child.kill('SIGKILL');};
 const timer=setTimeout(stop,timeoutMs);
 const output=(d,error=false)=>{bytes+=d.length;if(bytes>8388608){stop();return;}if(error)err+=d;else out+=d;if(stream)(error?process.stderr:process.stdout).write(d);};
 child.stdout.on('data',d=>output(d));child.stderr.on('data',d=>output(d,true));
 child.on('error',e=>{clearTimeout(timer);reject(e);});child.on(background?'exit':'close',code=>{clearTimeout(timer);if(background){child.stdout.destroy();child.stderr.destroy();}code===0&&!stopped?resolve(out):reject(new Error(`Local test command failed (${code}): ${stopped?'bounded process stopped':err||out}`));});
});
let started=false;
try{
 await run(executable('initdb'),['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--no-locale']);
 await run(executable('pg_ctl'),['-D',data,'-l',log,'-o',`-h 127.0.0.1 -p ${port} -k "${root.replaceAll('\\','/')}"`,'-w','start'],{background:true});started=true;

 console.log('T19 operational PostgreSQL:',(await run(executable('psql'),['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-X','-Atc','show server_version'])).trim());
 const nonce=randomBytes(16).toString('hex');
 await run(executable('psql'),['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1','-c',`COMMENT ON DATABASE postgres IS 't19-operational-synthetic-${nonce}'`]);
 await run(process.execPath,['--test',ownerAdapter?'test/t19-operational-rehearsal-model.test.js':'test/t19-operational-full-stage.test.js'],{stream:true,timeoutMs:180000,extraEnv:{T19_OPERATIONAL_NATIVE_URL:`postgresql://postgres@127.0.0.1:${port}/postgres`,T19_OPERATIONAL_NATIVE_NONCE:nonce}});
 console.log(ownerAdapter?'T19_OWNER_OPERATIONAL_ADAPTER_NATIVE_GATE_PASS':'T19_OPERATIONAL_FULL_STAGE_NATIVE_PASS');

}finally{
 const hasPid=await stat(join(data,'postmaster.pid')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
 if(started||hasPid)await run(executable('pg_ctl'),['-D',data,'-m','fast','-w','stop']);
 // Validate the exact random directory before recursive deletion; one filesystem API.
 const rel=relative(resolve(tmpdir()),resolve(root));
 if(!rel||rel.startsWith('..')||isAbsolute(rel)||!rel.startsWith('faraios-t19-operational-synthetic-'))throw new Error('Unsafe cleanup target');
 // Confirm the directory is ours before deleting even after a partial init failure.
 await rm(root,{recursive:true,force:true});console.log('T19_OPERATIONAL_DISPOSABLE_CLUSTER_CLEANED');
}
