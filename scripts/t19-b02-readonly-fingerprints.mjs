// T19 B02 staging-only, read-only evidence collector. Never imports or runs mutation SQL.
// The caller supplies a privately authenticated, TLS-verified single-use pg Client.
import {createHash} from 'node:crypto';
export const PROTECTED_TABLES=Object.freeze([
 'private_t19_custody.connections','private_t19_custody.operations','private_t19_custody.prepared_references',
 'public.business_accounting_connections','public.business_invoices','public.business_quotes',
 'public.settlement_review_claims','public.settlement_review_statements'
]);
const TABLE_RE=/^(public|private_t19_custody)\.[a-z_]+$/;
export function tableFingerprintQuery(name){
 if(!PROTECTED_TABLES.includes(name)||!TABLE_RE.test(name))throw Error('Unapproved protected table');
 // Digest is computed in PostgreSQL; no raw financial/customer rows cross the connection.
 return `SELECT count(*)::bigint AS n, md5(coalesce(string_agg(md5(to_jsonb(t)::text),'|' ORDER BY md5(to_jsonb(t)::text)),'')) AS fingerprint FROM ${name} AS t`;
}
const CATALOG_SQL=`SELECT md5(coalesce(string_agg(item,'|' ORDER BY item),'')) AS fingerprint FROM (
 SELECT 'schema:'||n.nspname||':'||n.nspowner::text||':'||coalesce(n.nspacl::text,'') AS item
 FROM pg_namespace n WHERE n.nspname='private_t19_custody'
 UNION ALL
 SELECT 'relation:'||c.oid::text||':'||c.relname||':'||c.relkind::text||':'||c.relowner::text||':'||coalesce(c.relacl::text,'')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody'
 UNION ALL
 SELECT 'function:'||p.oid::text||':'||p.proname||':'||p.proowner::text||':'||coalesce(p.proacl::text,'')
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private_t19_custody'
 UNION ALL
 SELECT 'role:'||r.rolname||':'||r.rolcanlogin::text||':'||r.rolinherit::text||':'||r.rolcreaterole::text FROM pg_roles r WHERE r.rolname='t19_hosted_custody'
 UNION ALL
 SELECT 'membership:'||m.roleid::text||':'||m.member::text||':'||m.admin_option::text||':'||m.inherit_option::text||':'||m.set_option::text
 FROM pg_auth_members m WHERE m.roleid=(SELECT oid FROM pg_roles WHERE rolname='t19_hosted_custody') OR m.member=(SELECT oid FROM pg_roles WHERE rolname='t19_hosted_custody')
 UNION ALL
 SELECT 'defaultacl:'||d.oid::text||':'||d.defaclrole::text||':'||d.defaclnamespace::text||':'||d.defaclobjtype::text||':'||d.defaclacl::text
 FROM pg_default_acl d WHERE d.defaclnamespace=(SELECT oid FROM pg_namespace WHERE nspname='private_t19_custody')
 UNION ALL
 SELECT 'column:'||a.attrelid::text||':'||a.attnum::text||':'||a.attname||':'||a.atttypid::text||':'||a.attnotnull::text||':'||coalesce(a.attacl::text,'')
 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND a.attnum>0 AND NOT a.attisdropped
 UNION ALL
 SELECT 'vaultschema:'||n.nspname||':'||n.nspowner::text||':'||coalesce(n.nspacl::text,'')
 FROM pg_namespace n WHERE n.nspname='vault'
 UNION ALL
 SELECT 'vaultrelation:'||c.relname||':'||c.relowner::text||':'||coalesce(c.relacl::text,'')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='vault' AND c.relname IN ('secrets','decrypted_secrets')
 UNION ALL
 SELECT 'vaultfunction:'||p.oid::text||':'||p.proname||':'||p.proowner::text||':'||coalesce(p.proacl::text,'')
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vault'
) x`;
export async function collectProtectedSnapshot(client,{readOnly=true}={}){
 if(!readOnly)throw Error('Read-only snapshot required');
 const rows={};
 let begun=false;
 try{
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;
  const who=await client.query("SELECT current_user AS u,session_user AS s,current_setting('server_version_num')::int AS v,current_setting('transaction_read_only') AS ro,pg_backend_pid()::int AS backend, (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls");
  const w=who.rows?.[0];
  if(!w||w.u!=='postgres'||w.s!=='postgres'||Number(w.v)<170000||w.ro!=='on'||!Number.isInteger(Number(w.backend))||Number(w.backend)<=0||w.tls!==true)throw Error('Unexpected staging read-only identity');
  const scratch=await client.query("SELECT (SELECT count(*)::int FROM pg_roles WHERE rolname IN ('t19_b02_qa_executor','t19_b02_qa_owner')) AS roles,(SELECT count(*)::int FROM pg_namespace WHERE nspname='t19_b02_qa_schema') AS schemas,(SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='t19_b02_qa_schema') AS functions");
  const x=scratch.rows[0];
  if(Number(x.roles)||Number(x.schemas)||Number(x.functions))throw Error('Scratch objects detected');
  const cat=await client.query(CATALOG_SQL);
  for(const name of PROTECTED_TABLES){
   const res=await client.query(tableFingerprintQuery(name));
   if(!res.rows?.[0]||!/^[a-f0-9]{32}$/i.test(res.rows[0].fingerprint))throw Error('Missing financial fingerprint');
   rows[name]={count:String(res.rows[0].n),digest:res.rows[0].fingerprint};
  }
  const vault=await client.query('SELECT count(*)::bigint AS n FROM vault.secrets');
  await client.query('COMMIT');begun=false;
  const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
  return {connectionId:String(w.backend),scratchRoles:0,scratchSchemas:0,scratchFunctions:0,catalogDigest:hash(cat.rows),financialDigest:hash(rows),vaultSecretCount:String(vault.rows[0].n),tableCounts:Object.fromEntries(Object.entries(rows).map(([n,v])=>[n,v.count]))};
 }catch(e){if(begun)await client.query('ROLLBACK').catch(()=>{});throw e;}
}
