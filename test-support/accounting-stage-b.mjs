import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
export const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const A=id(10),B=id(20),ownerA=id(1),ownerB=id(2),managerB=id(3),staff=id(4),platform=id(5),shared=id(6);
const quote=v=>v===null?'null':typeof v==='number'?String(v):"'"+String(typeof v==='object'?JSON.stringify(v):v).replaceAll("'","''")+"'";
export const sqlArgs=(sql,args)=>sql.replace(/\$(\d+)/g,(_,n)=>quote(args[Number(n)-1]));
const userFunctions=new Set(['connect','change_connection','register_intent','enqueue']);
const workerFunctions=new Set(['claim','dispatch','finish']);
export async function fixture({native=false}={}){
 let db,args;
 if(native){
  const target=new URL(process.env.T19_TEST_DATABASE_URL);
  if(target.hostname!=='127.0.0.1'||target.pathname!=='/faraios_t19_test'||target.search||target.username!=='t19_fixture'||target.password)throw new Error('Only isolated T19 synthetic database allowed');
  args=[target.href,'-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'];
 }else db=new PGlite();
 const nativeRun=(text,{name='t19_test'}={})=>new Promise((resolve,reject)=>{
  const child=spawn(process.env.T19_PSQL??'psql',args,{windowsHide:true,env:{...process.env,PGAPPNAME:name}});let out='',err='';
  child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);
  const timer=setTimeout(()=>child.kill(),20000);
  child.on('close',code=>{clearTimeout(timer);if(code===0)resolve(out.trim());else reject(Object.assign(new Error(err),{code:err.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]}));});child.stdin.end(text);
 });
 const exec=text=>native?nativeRun(text):db.exec(text);
 if(native){const exists=await nativeRun("select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema')");if(exists!=='0')throw new Error('Refusing nonempty database');}
 await exec(`create role anon;create role authenticated;create role service_role;create role t19_worker nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await exec(await readFile(new URL('../database/identity-draft.sql',import.meta.url),'utf8'));
 await exec("set faraios.stage_b='synthetic';"+await readFile(new URL('../database/accounting-stage-b.sql',import.meta.url),'utf8'));
 await exec(`insert into auth.users values ${[ownerA,ownerB,managerB,staff,platform,shared].map(x=>`('${x}')`).join(',')};
 insert into public.businesses(id,name,industry) values('${A}','Synthetic A','cleaning'),('${B}','Synthetic B','cleaning');
 insert into public.business_memberships(business_id,user_id,role) values('${A}','${ownerA}','owner'),('${B}','${ownerB}','owner'),('${B}','${managerB}','manager'),('${A}','${staff}','staff'),('${B}','${staff}','staff'),('${A}','${shared}','manager'),('${B}','${shared}','manager');`);
 // Serialize entire PGlite transactions; native requests use separate connections.
 let tail=Promise.resolve();
 async function query(sql,params=[],{role,user}={}){
  const text=sqlArgs(sql,params),prefix=`begin;${role?'set local role '+role+';':''}${user?"set local request.jwt.claim.sub="+quote(user)+';':''}`;
  if(native){const output=await nativeRun(prefix+text+';commit;');return output?JSON.parse(output):null;}
  const run=async()=>{await db.exec(prefix);try{const r=await db.query(text);await db.exec('commit');return r.rows[0]?.value??null;}catch(e){await db.exec('rollback');throw e;}};
  const task=tail.then(run);tail=task.catch(()=>{});return task;
 }
 const call=(name,params,who)=>query(`select to_jsonb(t19_local.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')})) as value`,params,who);
 const store={
  user(user,name,params){if(!userFunctions.has(name))throw new Error('Invalid user function');return call(name,params,{role:'authenticated',user});},
  worker(name,params){if(!workerFunctions.has(name))throw new Error('Invalid worker function');return call(name,params,{role:'t19_worker'});},
  allowed(user,b){return query('select to_jsonb(t19_local.can_read($1)) as value',[b],{role:'authenticated',user});},
  read(user,b,table){if(!['connections','operations','events','generations','intents'].includes(table))throw new Error('Invalid read');return query(`select coalesce(jsonb_agg(to_jsonb(x)),'[]') as value from (select * from t19_local.${table} where business_id=$1 order by 1) x`,[b],{role:'authenticated',user});}
 };
 return {store,query,exec,nativeRun,args,close:()=>db?.close()};
}
