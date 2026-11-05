// Dedicated disposable PostgreSQL cluster for T31. No hosted DB connections or provider calls.
import {mkdtemp,rm,stat,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
if(process.argv.length!==2||Number(process.versions.node.split('.')[0])!==24)throw Error('Node24 no-argument T31 runner required');
const bin=process.env.T31_PG_BIN??'';
const executable=name=>bin?join(bin,name):name;
const root=await mkdtemp(join(tmpdir(),'faraios-t31-synthetic-')),data=join(root,'data');
const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
const env={...process.env};
for(const k of Object.keys(env))if(k.startsWith('PG')||k.startsWith('T31_')||k.includes('DATABASE_URL')||k.startsWith('FARAIOS_')||k.startsWith('SUPABASE_')||k.startsWith('ZOHO_')||k.startsWith('PAYSTACK_'))delete env[k];
env.PGPASSFILE=join(root,'absent-password');env.PGSERVICEFILE=join(root,'absent-service');
const run=(command,args,{stream=false,background=false,extra={}}={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:{...env,...extra},windowsHide:true});let out='',err='';
 child.stdout.on('data',b=>{out+=b;if(stream)process.stdout.write(b);});
 child.stderr.on('data',b=>{err+=b;if(stream)process.stderr.write(b);});
 child.on('error',reject);
 child.on(background?'exit':'close',code=>{
  if(background){child.stdout.destroy();child.stderr.destroy();}
  code===0?resolve(out):reject(Error('Disposable T31 command failed: '+(err||out)));
 });
});
let started=false;
try{
 await run(executable('initdb'),['-D',data,'-U','postgres','-A','trust','--encoding=UTF8','--no-locale']);
 await run(executable('pg_ctl'),['-D',data,'-l',join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k "${root}"`,'-w','start'],{background:true});started=true;
 await run(executable('createdb'),['-h','127.0.0.1','-p',String(port),'-U','postgres','faraios_t31_test']);
 await run(process.execPath,['--test','test/t31-provisioning-native.test.js'],{stream:true,extra:{T31_DISPOSABLE:'yes',T31_NATIVE_URL:`postgresql://postgres@127.0.0.1:${port}/faraios_t31_test`}});
 console.log('T31_PROVISIONING_NATIVE_PASS');
 // Fresh backup/restore test: isolated source and separate recovery database.
 // Strictly this is a disposable DB-level rehearsal, NOT a hosted backup or independent cluster restore.
 const dump=join(root,'t31-synthetic-fresh.dump'),original='faraios_t31_test',recovered='faraios_t31_recovery_test';
 const conn=name=>['-h','127.0.0.1','-p',String(port),'-U','postgres','-d',name];
 await run(executable('pg_dump'),[...conn(original),'-Fc','-f',dump,'--no-comments','--no-publications','--no-subscriptions']);
 const bytes=await readFile(dump);
 if(bytes.length<1024)throw Error('T31 synthetic dump unexpectedly small');
 const checksum=createHash('sha256').update(bytes).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(checksum))throw Error('T31 dump digest invalid');
 await run(executable('createdb'),['-h','127.0.0.1','-p',String(port),'-U','postgres',recovered]);
 await run(executable('pg_restore'),['-h','127.0.0.1','-p',String(port),'-U','postgres','-d',recovered,'--exit-on-error','--clean','--if-exists',dump]);
 const check=async(database,sql)=>(await run(executable('psql'),[...conn(database),'-X','-w','-A','-t','-v','ON_ERROR_STOP=1','-c',sql])).trim();
 const snapshot=[
 "select count(*) from public.businesses",
 "select count(*) from public.business_memberships",
 "select count(*) from audit.events",
 "select count(*) from public.t31_business_branding",
 "select count(*) from private_t31.invitations",
 "select count(*) from private_t31.invitation_audit",
 "select count(*) from private_t31.brand_audit",
 "select md5(coalesce(string_agg(id::text||':'||status,'|' order by id),'')) from public.businesses",
 "select md5(coalesce(string_agg(business_id::text||':'||user_id::text||':'||role||':'||status,'|' order by business_id,user_id),'')) from public.business_memberships",
 "select count(*) from pg_policies where policyname like 't31_%'",
 "select count(*) from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='private_t31'",
 "select count(*) from pg_trigger where tgrelid='public.t31_business_branding'::regclass and not tgisinternal",
 "select has_table_privilege('authenticated','public.t31_business_branding','INSERT')",
 "select pg_get_userbyid(proowner) from pg_proc where oid='private_t31.t31_provision_business(text,uuid)'::regprocedure",
 "select pg_get_userbyid(proowner) from pg_proc where oid='private_t31.accept_invitation(uuid)'::regprocedure"
 ];
 for(const sql of snapshot){
  const before=await check(original,sql),after=await check(recovered,sql);
  if(before!==after)throw Error('T31 synthetic restore differs for '+sql.split(' ').slice(0,4).join(' '));
 }
 if(await check(recovered,"select count(*) from public.businesses")!=='3')throw Error('Synthetic recovery missing three businesses');
 if(await check(recovered,"select count(*) from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='private_t31'")==='0')throw Error('Synthetic recovery missing T31 functions');
 console.log('T31_DISPOSABLE_FRESH_BACKUP_RESTORE_PASS sha256='+checksum+' bytes='+bytes.length);
}finally{
 const exists=await stat(join(data,'postmaster.pid')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
 if(started||exists)await run(executable('pg_ctl'),['-D',data,'-m','fast','-w','stop']);
 const rel=relative(resolve(tmpdir()),resolve(root));
 if(!rel||rel.startsWith('..')||isAbsolute(rel)||!rel.startsWith('faraios-t31-synthetic-'))throw Error('Unsafe T31 cleanup');
 await rm(root,{recursive:true,force:true});console.log('T31_DISPOSABLE_CLUSTER_CLEANED');
}
