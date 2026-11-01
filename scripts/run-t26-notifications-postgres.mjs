// Own disposable PostgreSQL cluster only. No hosted/application DB configuration.
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
if(process.argv.length!==2||Number(process.versions.node.split('.')[0])!==24)throw Error('Node24 no-argument disposable runner required');
const bin=process.env.T26_PG_BIN??'';
const executable=name=>bin?join(bin,name):name;
const root=await mkdtemp(join(tmpdir(),'faraios-t26-synthetic-')),data=join(root,'data');
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
const env={...process.env};
for(const k of Object.keys(env))if(k.startsWith('PG')||k.startsWith('T26_')||k.includes('DATABASE_URL')||k.startsWith('FARAIOS_')||k.startsWith('SUPABASE_')||k.startsWith('ZOHO_')||k.startsWith('PAYSTACK_'))delete env[k];
env.PGPASSFILE=join(root,'absent-password');env.PGSERVICEFILE=join(root,'absent-service');
const run=(command,args,{stream=false,background=false,extra={}}={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:{...env,...extra},windowsHide:true});let out='',err='';
 child.stdout.on('data',b=>{out+=b;if(stream)process.stdout.write(b);});child.stderr.on('data',b=>{err+=b;if(stream)process.stderr.write(b);});
 child.on('error',reject);child.on(background?'exit':'close',code=>{if(background){child.stdout.destroy();child.stderr.destroy();}code===0?resolve(out):reject(Error('Disposable T26 command failed: '+(err||out)));});
});
let started=false;
try{
 await run(executable('initdb'),['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--no-locale']);
 await run(executable('pg_ctl'),['-D',data,'-l',join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k "${root}"`,'-w','start'],{background:true});started=true;
 await run(executable('createdb'),['-h','127.0.0.1','-p',String(port),'-U','postgres','faraios_t26_test']);
 await run(process.execPath,['--test','--test-name-pattern=T26 native','test/t26-notifications-native.test.js'],{stream:true,extra:{T26_DISPOSABLE:'yes',T26_NATIVE_URL:`postgresql://postgres@127.0.0.1:${port}/faraios_t26_test`}});
 console.log('T26_NOTIFICATIONS_NATIVE_PASS');
}finally{
 const exists=await stat(join(data,'postmaster.pid')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
 if(started||exists)await run(executable('pg_ctl'),['-D',data,'-m','fast','-w','stop']);
 const rel=relative(resolve(tmpdir()),resolve(root));if(!rel||rel.startsWith('..')||isAbsolute(rel)||!rel.startsWith('faraios-t26-synthetic-'))throw Error('Unsafe T26 cleanup');
 await rm(root,{recursive:true,force:true});console.log('T26_DISPOSABLE_CLUSTER_CLEANED');
}
