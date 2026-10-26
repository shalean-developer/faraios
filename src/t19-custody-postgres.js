import {Pool} from 'pg';
import {createCustodyDatabase} from './t19-custody-database.js';
// Explicit startup only, after hosted grants/credential/deployment approval.
// No environment URL, service-role fallback, caller SQL or TLS override is accepted.
export async function connectCustodyPostgres({host,port=5432,database='postgres',password,ca}){
 const denied=()=>new Error('custody_database_unavailable');
 if(typeof host!=='string'||!host||host.includes('/')||!Number.isInteger(port)||port<1||port>65535
  ||database!=='postgres'||typeof password!=='string'||!password||typeof ca!=='string'||!ca)throw denied();
 const pool=new Pool({host,port,database,user:'t19_hosted_custody',password,ssl:{ca,rejectUnauthorized:true},
  enableChannelBinding:true,options:'',application_name:'faraios-custody',sslnegotiation:'postgres',connectionTimeoutMillis:10000,idleTimeoutMillis:30000,max:4,statement_timeout:15000});
 // Idle connection failures are handled without logging driver messages/credentials.
 pool.on('error',()=>{});
 try{
  const {rows}=await pool.query("select session_user,current_user,rolsuper,rolcreaterole,rolbypassrls from pg_roles where rolname=current_user");
  const r=rows[0];if(!r||r.session_user!=='t19_hosted_custody'||r.current_user!=='t19_hosted_custody'||r.rolsuper||r.rolcreaterole||r.rolbypassrls)throw denied();
  const query=async(sql,params)=>{try{return await pool.query(sql,params);}catch{throw denied();}};
  return Object.freeze({database:createCustodyDatabase({query}),query,close:()=>pool.end()});
 }catch{await pool.end();throw denied();}
}
