// Creates its OWN disposable cluster; never reads application DB configuration.
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {runC2Native} from '../test-support/t19-c3-ci.mjs';
if(Number(process.versions.node.split('.')[0])!==24)throw new Error('Node 24 required');
const bin=process.env.T19_PG_BIN??(process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin':'');
const executable=name=>bin?join(bin,name+(process.platform==='win32'?'.exe':'')):name;
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const root=await mkdtemp(join(tmpdir(),'faraios-t19-synthetic-'));
// Do not inherit database/service credentials from the host.
const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('PG')||k.includes('DATABASE_URL')||k.startsWith('FARAIOS_')||k.startsWith('SUPABASE_'))delete env[k];
env.PGPASSFILE=join(root,'absent-password-file');env.PGSERVICEFILE=join(root,'absent-service-file');
const run=(command,args,{stream=false,extraEnv={},background=false}={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:{...env,...extraEnv},windowsHide:true});let out='',err='';
 child.stdout.on('data',d=>{out+=d;if(stream)process.stdout.write(d);});child.stderr.on('data',d=>{err+=d;if(stream)process.stderr.write(d);});
 child.on('error',reject);child.on(background?'exit':'close',code=>{if(background){child.stdout.destroy();child.stderr.destroy();}code===0?resolve(out):reject(new Error(`Local test command failed (${code}): ${err||out}`));});
});
await runC2Native({root,port,executable,node:process.execPath,run,
 exists:path=>stat(path).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}),
 remove:path=>rm(path,{recursive:true,force:true}),report:line=>console.log(line)});
