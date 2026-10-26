// T19 B02 transport proposal ONLY. Never invoke without a separately approved exact runner SHA.
// Uses existing pinned pg@8.23.1 from an isolated npm ci installation, not the hosted web app.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client} from 'pg';

export function splitSql(sql) {
 const text=sql.replace(/^\\set ON_ERROR_STOP on\s*$/m,'');
 if (/^\\/m.test(text)) throw new Error('Unsupported psql meta-command');
 let parts=[],start=0,single=false,double=false,line=false,block=0,dollar=null;
 for(let i=0;i<text.length;i++){
  let c=text[i],n=text[i+1];
  if(line){if(c==='\n')line=false;continue;}
  if(block){if(c==='/'&&n==='*'){block++;i++;}else if(c==='*'&&n==='/'){block--;i++;}continue;}
  if(single){if(c==="'"&&n==="'"){i++;}else if(c==="'")single=false;continue;}
  if(double){if(c==='"'&&n==='"'){i++;}else if(c==='"')double=false;continue;}
  if(dollar){if(text.startsWith(dollar,i)){i+=dollar.length-1;dollar=null;}continue;}
  if(c==='-'&&n==='-'){line=true;i++;continue;}
  if(c==='/'&&n==='*'){block=1;i++;continue;}
  if(c==="'"){single=true;continue;}
  if(c==='"'){double=true;continue;}
  if(c==='$'){const m=text.slice(i).match(/^\$[A-Za-z_][A-Za-z_0-9]*\$|^\$\$/);if(m){dollar=m[0];i+=dollar.length-1;continue;}}
  if(c===';'){const stmt=text.slice(start,i+1).trim();if(stmt&&!/^--/.test(stmt.replace(/^(?:--[^\n]*\n\s*)*/,'')))parts.push(stmt);start=i+1;}
 }
 if(single||double||block||dollar||text.slice(start).trim())throw new Error('Unterminated SQL or trailing unparsed text');
 return parts;
}

const isMain=process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1];
if(isMain){
 if(process.version.split('.')[0]!=='v24')throw new Error('Node.js 24 required');
 if(process.env.T19_B02_RUNNER_APPROVED!=='EXACT-SHA-OWNER-APPROVED')throw new Error('Owner execution gate missing');
 const file=new URL('../docs/proposals/t19-b02-managed-role-rollback.sql',import.meta.url);
 const sql=await readFile(file,'utf8');
 const digest=createHash('sha256').update(sql).digest('hex');
 if(!process.env.T19_B02_SQL_SHA256||digest!==process.env.T19_B02_SQL_SHA256)throw new Error('SQL byte digest mismatch');
 const chunks=splitSql(sql);
 if(chunks.length<15||!/^BEGIN\s*;/i.test(chunks[0])||!/^ROLLBACK\s*;/i.test(chunks.at(-2))||!/^SELECT\s/i.test(chunks.at(-1)))throw new Error('Unexpected exact SQL layout');
 const address=process.env.T19_B02_STAGING_DB_URL;
 if(!address)throw new Error('Separate staging DB URL required');
 const url=new URL(address);
 if(url.hostname!=='db.xdmfyrsauvqznkloroxg.supabase.co'||url.pathname!=='/postgres')throw new Error('Destination not allowlisted staging DB');
 const client=new Client({connectionString:address,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000});
 let begun=false,rolled=false;
 try{
  await client.connect();
  const check=await client.query("select current_user, session_user, current_setting('server_version_num')::int as version");
  if(check.rows[0].current_user!=='postgres'||check.rows[0].session_user!=='postgres'||check.rows[0].version<170000)throw new Error('Wrong SQL identity');
  for(let i=0;i<chunks.length;i++){
   const result=await client.query(chunks[i]);
   if(i===0)begun=true;
   if(i===chunks.length-2)rolled=true;
   if(i===chunks.length-1){
    const r=result.rows[0]||{};
    if(Number(r.leftover_roles)!==0||Number(r.leftover_schemas)!==0||Number(r.leftover_functions)!==0)throw new Error('Scratch objects remained');
   }
  }
  if(!rolled)throw new Error('Transaction did not reach ROLLBACK');
  console.log('T19_B02_RUNNER_ROLLBACK_AND_ZERO_SCRATCH_PASS');
 }catch(error){
  if(begun&&!rolled){try{await client.query('ROLLBACK');}catch{}}
  console.error('T19_B02_RUNNER_FAIL',String(error.code||'VERIFY_FAILED'));
  process.exitCode=1;
 }finally{await client.end().catch(()=>{});}
}
