// Explicit staging-only connection settings. No environment reads or fallback.
import {Pool} from 'pg';
const host='aws-0-eu-west-1.pooler.supabase.com',project='xdmfyrsauvqznkloroxg',role='t19_standard_backend';
export function standardPostgresOptions(c){
 const nonempty=value=>typeof value==='string'&&value.length>0;
 if(!c||!nonempty(c.password)||!nonempty(c.ca)||!c.ca.includes('-----BEGIN CERTIFICATE-----')||Object.keys(c).length!==2||Object.keys(c).some(k=>!['ca','password'].includes(k)))throw Error('accounting_database_configuration_rejected');
 return {host,port:5432,user:role+'.'+project,database:'postgres',password:c.password,
  ssl:{ca:c.ca,rejectUnauthorized:true,servername:host,minVersion:'TLSv1.2'},enableChannelBinding:true,
  application_name:'faraios-t19-standard-staging',options:'',max:4,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,statement_timeout:15000};
}
export async function connectStandardPostgres(config){
 const pool=new Pool(standardPostgresOptions(config));pool.on('error',()=>{});
 try{
  const r=await pool.query(`select session_user,current_user,current_database() as database,rolcanlogin,rolsuper,rolinherit,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,
   has_schema_privilege(current_user,'private_t19_standard','USAGE') as schema_usage,
   has_table_privilege(current_user,'private_t19_standard.connections','SELECT,INSERT,UPDATE') as token_access,
   (select ssl from pg_stat_ssl where pid=pg_backend_pid()) as backend_tls
   from pg_roles where rolname=current_user`),v=r.rows[0];
  if(r.rows.length!==1||v.session_user!==role||v.current_user!==role||v.database!=='postgres'||v.rolcanlogin!==true||v.schema_usage!==true||v.token_access!==true||v.backend_tls!==true||
   ['rolsuper','rolinherit','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'].some(k=>v[k]!==false))throw Error();
  return pool;
 }catch{await pool.end();throw Error('accounting_database_unavailable');}
}
