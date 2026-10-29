import {Pool} from 'pg';
import {createCustodyDatabase} from './t19-custody-database.js';
import {stagingProject} from './hosted-staging.js';
const denied=()=>new Error('custody_database_unavailable');
const role='t19_hosted_custody';
// Explicitly reviewed staging endpoints only; never infer another pooler from
// a region or accept a caller-supplied database role/project/connection URL.
export function custodyPostgresTarget({host,port=5432}){
 if(port!==5432)throw denied();
 if(host===`db.${stagingProject}.supabase.co`)return {host,port,user:role};
 if(host==='aws-0-eu-west-1.pooler.supabase.com')return {host,port,user:`${role}.${stagingProject}`};
 throw denied();
}
export function custodyPostgresOptions(config){
 const {host,port=5432,database='postgres',password,ca}=config??{};
 if(!config||Object.keys(config).some(k=>!['host','port','database','password','ca'].includes(k))||
 database!=='postgres'||typeof password!=='string'||!password||typeof ca!=='string'||!ca.trim())throw denied();
 return {...custodyPostgresTarget({host,port}),database,password,
  ssl:{ca,rejectUnauthorized:true,servername:host,minVersion:'TLSv1.2'},
  enableChannelBinding:true,options:'',application_name:'faraios-custody',sslnegotiation:'postgres',
  connectionTimeoutMillis:10000,idleTimeoutMillis:30000,max:4,statement_timeout:15000};
}
export function verifyCustodySession(r){
 if(!r||r.session_user!==role||r.current_user!==role||r.database!=='postgres'||
 r.rolcanlogin!==true||r.rolinherit!==false||
 ['rolsuper','rolcreaterole','rolcreatedb','rolreplication','rolbypassrls'].some(k=>r[k]!==false)||
 r.backend_tls!==true||!['TLSv1.2','TLSv1.3'].includes(r.backend_tls_version))throw denied();
}
// Explicit startup only, after hosted grants/credential/deployment approval.
// No environment URL, service-role fallback, caller SQL or TLS override is accepted.
export async function connectCustodyPostgres(config){
 const pool=new Pool(custodyPostgresOptions(config));
 // Idle connection failures are handled without logging driver messages/credentials.
 pool.on('error',()=>{});
 try{
  const {rows}=await pool.query("select session_user,current_user,current_database() as database,rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,(select ssl from pg_stat_ssl where pid=pg_backend_pid()) as backend_tls,(select version from pg_stat_ssl where pid=pg_backend_pid()) as backend_tls_version from pg_roles where rolname=current_user");
  if(rows.length!==1)throw denied();verifyCustodySession(rows[0]);
  const query=async(sql,params)=>{try{return await pool.query(sql,params);}catch{throw denied();}};
  return Object.freeze({database:createCustodyDatabase({query}),query,close:()=>pool.end()});
 }catch{await pool.end();throw denied();}
}
