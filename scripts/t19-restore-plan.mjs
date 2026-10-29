// Pure restore planning. No destination, network, process, key or filesystem API.
import {canonical,digest,requireTrue} from './t19-bootstrap-engine.mjs';
import {validateScope,matchesCurrentScope} from './backup-scope.mjs';
import {SOURCE,CLIENT_IMAGE,validateManifest,assertDataCoverage} from './backup-staging.mjs';
import {validateSchemaReplay} from './restore-diagnostic.mjs';
import {preserveManagedParameterGrant,sequenceAssignments,sequenceVerificationSQL,verificationSQL,RESTORE_CREATION_DEFAULTS_SQL} from './restore-staging.mjs';
import {RECONSTRUCT_WORKING_DAYS_SQL} from './restore-constraint.mjs';
export const RESTORE_SCOPE='t19-current-scope-isolated-restore-v1';
export const PRE_BOOTSTRAP=['isolation','postgres','bootstrapHelpers','bootstrapDependencies','realtime','authMigrations','authIndexes','storage','managedCatalog'];
export const RESTORE_PHASES=[...PRE_BOOTSTRAP,'apiControls','stopServices','destinationEmpty','replay','verifyCommitted','sequences','verifyFresh','custody','boundaries','finalVerification'];
export const LIMITS="SET LOCAL statement_timeout='120s';SET LOCAL lock_timeout='10s';SET LOCAL search_path='';SET LOCAL timezone='UTC';SET LOCAL standard_conforming_strings=on;\n";
export const INERT_SQL=`DO $inert$ DECLARE target text; n bigint; BEGIN
 IF EXISTS(SELECT FROM pg_largeobject_metadata) OR EXISTS(SELECT FROM pg_foreign_server)
 OR EXISTS(SELECT FROM vault.secrets) OR EXISTS(SELECT FROM storage.objects) OR EXISTS(SELECT FROM storage.buckets) THEN RAISE EXCEPTION 'RESTORE_EXTERNAL_ASSET_SCOPE'; END IF;
 FOREACH target IN ARRAY ARRAY['cron.job','net.http_request_queue'] LOOP
  IF to_regclass(target) IS NOT NULL THEN
   EXECUTE 'SELECT count(*) FROM '||target INTO n;
   IF n<>0 THEN RAISE EXCEPTION 'RESTORE_EXTERNAL_WORK_PRESENT'; END IF;
  END IF;
 END LOOP;
END $inert$;\n`;
const id=s=>'"'+s.replaceAll('"','""')+'"';
const lit=s=>"'"+s.replaceAll("'","''")+"'";
const trim=s=>s.trim().replace(/;$/,'');
const check=(b,c)=>requireTrue(b,c);
export function catalogSQL(portable,{omitCustody=true}={}){
 if(!omitCustody)return portable;
 check(portable.split('from pg_roles r)').length===2&&portable.split('from pg_auth_members a)').length===2,'RESTORE_PROJECTION_SHAPE');
 return portable.replace('from pg_roles r)',"from pg_roles r where r.rolname<>'t19_hosted_custody')")
  .replace('from pg_auth_members a)',"from pg_auth_members a where pg_get_userbyid(a.roleid)<>'t19_hosted_custody' and pg_get_userbyid(a.member)<>'t19_hosted_custody')");
}
export function catalogGate(portable,scope){
 return `DO $t19_catalog$ DECLARE actual jsonb; BEGIN SELECT catalog INTO actual FROM (${trim(portable)}) q;
 IF actual->>'application'<>${lit(scope.application)} OR actual->>'managed'<>${lit(scope.managed)} THEN RAISE EXCEPTION 'RESTORE_CATALOG_MISMATCH'; END IF; END $t19_catalog$;\n`;
}
// The dump's COPY rows are opaque: SQL-like text inside a row is never parsed.
export function dataMember(sql,manifest,name){
 const allowed=new Map(manifest.tables.map(t=>[t.schema+'.'+t.table,t]));let active=null,rows=0;
 const copied=new Set(),out=[];
 for(const line of sql.split(/\r?\n/)){
  if(active!==null){out.push(line);if(line==='\\.'){check(rows===allowed.get(active).rows,'RESTORE_COPY_ROW_COUNT');active=null;}else rows++;continue;}
  if(!line.trim()||/^\s*--/.test(line)){out.push(line);continue;}
  const copy=/^COPY "([a-z_][a-z0-9_]*)"\."([a-z_][a-z0-9_]*)" \(("[a-z_][a-z0-9_]*"(?:, "[a-z_][a-z0-9_]*")*)\) FROM stdin;$/.exec(line);
  if(copy){const key=copy[1]+'.'+copy[2];check(allowed.has(key)&&!copied.has(key)&&!['auth.schema_migrations','storage.migrations','storage.buckets_vectors','storage.vector_indexes'].includes(key),'RESTORE_COPY_SCOPE');check((name==='migration-data.sql')===(copy[1]==='supabase_migrations'),'RESTORE_COPY_MEMBER');copied.add(key);active=key;rows=0;out.push(line);continue;}
  // Strip only reviewed native dump session setup. Wrapper supplies fixed local
  // safety settings and replication mode; no arbitrary SET/SELECT is allowed.
  if(/^SET (statement_timeout|lock_timeout|idle_in_transaction_session_timeout|transaction_timeout) = 0;$/.test(line)||/^SET (client_encoding = 'UTF8'|standard_conforming_strings = on|check_function_bodies = false|xmloption = content|client_min_messages = warning|row_security = off|session_replication_role = replica);$/i.test(line)||line==='RESET ALL;'||line==="SELECT pg_catalog.set_config('search_path', '', false);")continue;
  if(line==='-- Sequence state deferred to the guarded completion phase.')continue;
  throw Error('RESTORE_DATA_STATEMENT_REFUSED');
 }
 check(active===null,'RESTORE_COPY_UNTERMINATED');return out.join('\n');
}
// Top-level lexer for bounded dump transforms. Bodies/strings/comments remain
// byte-identical; only their executable outer statements are classified here.
export function schemaMember(sql,kind){
 validateSchemaReplay(sql);
 const statements=[];let start=0,code='';
 for(let i=0;i<sql.length;){
  const ch=sql[i],next=sql[i+1];
  if(ch==='-'&&next==='-'){while(i<sql.length&&sql[i]!=='\n')i++;code+=' ';continue;}
  if(ch==='/'&&next==='*'){let depth=1;i+=2;while(i<sql.length&&depth){if(sql[i]==='/'&&sql[i+1]==='*'){depth++;i+=2;}else if(sql[i]==='*'&&sql[i+1]==='/'){depth--;i+=2;}else i++;}check(!depth,'RESTORE_SCHEMA_COMMENT');code+=' ';continue;}
  const dollar=ch==='$'?/^\$(?:[a-z_][a-z0-9_]*)?\$/i.exec(sql.slice(i)):null;
  if(dollar){const end=sql.indexOf(dollar[0],i+dollar[0].length);check(end>=0,'RESTORE_SCHEMA_BODY');i=end+dollar[0].length;code+=' ? ';continue;}
  if(ch==="'"||ch==='"'){
   const quote=ch,escaped=quote==="'"&&/[eE]/.test(sql[i-1]??'')&&!/[a-z0-9_$]/i.test(sql[i-2]??'');let value='';i++;
   while(i<sql.length){if(escaped&&sql[i]==='\\'){i+=2;continue;}if(sql[i]===quote){if(sql[i+1]===quote){value+=quote;i+=2;continue;}i++;break;}value+=sql[i++];}
   code+=quote==='"'?' '+value.toUpperCase()+' ':' ? ';continue;
  }
  if(ch===';'){statements.push({text:sql.slice(start,i+1),code:code.trim().toUpperCase()});start=++i;code='';continue;}
  code+=ch;i++;
 }
 check(!code.trim(),'RESTORE_SCHEMA_TERMINATOR');
 const out=[];
 for(const statement of statements){const c=statement.code.replace(/\s+/g,' ');if(!c)continue;
  if(/^RESET ALL$/.test(c)||/^SET\b/.test(c)||/^SELECT PG_CATALOG\s*\.\s*SET_CONFIG\b/.test(c)){out.push('-- Reviewed dump session setup replaced by fixed local limits.\n'+LIMITS);continue;}
  if(kind==='roles'){
   check(/^ALTER ROLE [A-Z_][A-Z0-9_]* SET (?:PGAUDIT\.[A-Z_]+|PGRST\.[A-Z_]+|SESSION_REPLICATION_ROLE|STATEMENT_TIMEOUT|TRACK_IO_TIMING) (?:TO|=) /.test(c),'RESTORE_ROLE_STATEMENT_REFUSED');
  }else{
   check(!/^(?:CREATE|ALTER) (?:DATABASE|TABLESPACE|FOREIGN|SERVER|EVENT TRIGGER|SUBSCRIPTION|PUBLICATION|ROLE|USER|SYSTEM)\b/.test(c)&&!/\b(?:PG_AUTHID|PG_READ_FILE|PROGRAM)\b/.test(c),'RESTORE_SCHEMA_PRIVILEGED_STATEMENT');
   if(/^ALTER DEFAULT PRIVILEGES/.test(c))check(/^ALTER DEFAULT PRIVILEGES FOR ROLE POSTGRES IN SCHEMA (?:PUBLIC|AUDIT|SUPABASE_MIGRATIONS) /.test(c),'RESTORE_DEFAULT_ROLE');
   check(!/\bLANGUAGE (?!PLPGSQL\b|SQL\b)[A-Z_]+/.test(c),'RESTORE_SCHEMA_LANGUAGE');
   if(/^CREATE EXTENSION\b/.test(c))check(/^CREATE EXTENSION IF NOT EXISTS (?:BTREE_GIST|PG_STAT_STATEMENTS|PGCRYPTO|PLPGSQL|SUPABASE_VAULT|UUID-OSSP)(?: WITH SCHEMA (?:EXTENSIONS|PG_CATALOG|VAULT))?$/.test(c),'RESTORE_EXTENSION_REFUSED');
   // Every qualified target outside literals/bodies belongs to recovered scope.
   for(const match of c.matchAll(/\b([A-Z_][A-Z0-9_]*)\s*\.\s*[A-Z_]/g))check(['PUBLIC','AUDIT','AUTH','STORAGE','SUPABASE_MIGRATIONS','PG_CATALOG','EXTENSIONS'].includes(match[1]),'RESTORE_SCHEMA_NAMESPACE');
  }
  out.push(statement.text+'\n');
 }
 return out.join('\n');
}
export function planRestore(backup,scope,portable){
 scope=validateScope(scope,SOURCE);check(scope.tables.length===30,'RESTORE_APPLICATION_TABLE_SCOPE');
 check(backup.payload.source===SOURCE&&canonical(backup.payload.files.map(f=>f.name))===canonical(['roles.sql','schema.sql','data.sql','migration-schema.sql','migration-data.sql','managed-schema-reference.sql','manifest.json'])&&backup.payload.files.every(f=>typeof f.content==='string'&&digest(f.content)===f.sha256),'RESTORE_MEMBER_BINDING');
 const files=Object.fromEntries(backup.payload.files.map(f=>[f.name,f.content]));
 const manifest=JSON.parse(files['manifest.json']);validateManifest(manifest.before,scope);validateManifest(manifest.after,scope);
 check(manifest.version===1&&manifest.filterSource==='supabase/cli@2.121.0'&&manifest.clientImage===CLIENT_IMAGE&&manifest.source===SOURCE&&matchesCurrentScope(manifest.before,scope)&&canonical(manifest.before)===canonical(manifest.after),'RESTORE_MANIFEST_SCOPE');
 check(manifest.started==='2026-10-26T08:54:31.422Z'&&manifest.finished==='2026-10-26T08:58:22.674Z','RESTORE_CHECKPOINT_NOT_CANDIDATE_ONE');
 check(manifest.before.tables.every(t=>['public','audit','auth','storage','supabase_migrations'].includes(t.schema)&&/^[a-z_][a-z0-9_]*$/.test(t.table)),'RESTORE_TABLE_SCOPE');
 check(backup.payload.files.reduce((n,f)=>n+Buffer.byteLength(f.content),0)<=33554432,'RESTORE_INPUT_BUDGET');
 assertDataCoverage(backup.payload.files,manifest.before);
 const role=schemaMember(preserveManagedParameterGrant(files['roles.sql']),'roles');
 const schema=schemaMember(files['schema.sql'],'schema'),migration=schemaMember(files['migration-schema.sql'],'schema');
 const {states,rewritten}=sequenceAssignments(backup.payload.files,false);
 const sequenceState=manifest.before.sequence_state;
 check(canonical(states.map(s=>s.schema+'.'+s.sequence))===canonical(sequenceState.map(s=>s.schema+'.'+s.sequence).sort()),'RESTORE_SEQUENCE_SCOPE');
 for(const state of states){const m=sequenceState.find(s=>s.schema===state.schema&&s.sequence===state.sequence);check(m.last_value===null?!state.isCalled:m.last_value===state.value,'RESTORE_SEQUENCE_MANIFEST_MISMATCH');}
 const cat=catalogSQL(portable),gate=catalogGate(cat,scope);
 const verify=verificationSQL(manifest,cat,scope)+INERT_SQL;
 const data=['data.sql','migration-data.sql'].map(name=>dataMember(rewritten[name],manifest.before,name));
 const actor="DO $actor$ BEGIN IF current_user<>'postgres' OR session_user<>'supabase_admin' OR current_database()<>'postgres' THEN RAISE EXCEPTION 'RESTORE_ACTOR_CHANGED'; END IF; END $actor$;\n";
 // Only the fresh recovery connection is bootstrap-admin. Schema is created
 // as managed postgres; data COPY needs replica mode, so runs as bootstrap
 // admin after schema/ACL equality passes. No service gets this connection.
 const replay='BEGIN;SET LOCAL ROLE postgres;\n'+LIMITS+actor+RESTORE_CREATION_DEFAULTS_SQL+role+'\n'+schema+'\n'+migration+'\n'+LIMITS+actor+RECONSTRUCT_WORKING_DAYS_SQL+gate+
  'RESET ROLE;SET LOCAL session_replication_role=replica;\n'+data.join('\n')+'\nSET LOCAL session_replication_role=origin;SET LOCAL ROLE postgres;\n'+LIMITS+actor+verify+"COMMIT;\nSELECT 'T19_RESTORE_TRANSACTION_COMMITTED';\n";
 const setSequences=states.map(s=>`SELECT pg_catalog.setval(${lit(id(s.schema)+'.'+id(s.sequence))},${s.value},${s.isCalled});`).join('\n');
 return {manifest,scope,states,catalog:cat,replay,verify,sequenceSQL:verify+setSequences+'\n'+sequenceVerificationSQL(states),sequenceVerify:sequenceVerificationSQL(states),planSha256:digest({replay,verify,setSequences,states,scope}),summary:{applicationTables:30,coveredTables:manifest.before.tables.length,sequenceCount:states.length,managedSchemaReplay:false,operationalCustodyInstalled:false}};
}
export async function runRestore(platform,{now=Date.now}={}){
 const stages=[],started=now();let reason=null,cleanupVerified=false,checkpointUsed=platform.archiveAuthenticated===true,restoreAttempted=false;
 try{
  await platform.preflight();
  for(const phase of RESTORE_PHASES){check(now()-started<900000,'RESTORE_DEADLINE');if(phase==='replay'){checkpointUsed=true;restoreAttempted=true;}await platform[phase]();stages.push(phase);await platform.record('restore-phase',{phase,status:'PASS'});}
 }catch(e){reason=/^[A-Z0-9_]+$/.test(e.message)?e.message:'RESTORE_STAGE_FAILED';}
 finally{try{cleanupVerified=await platform.cleanup()===true;}catch{cleanupVerified=false;}}
 const result={status:!cleanupVerified?'QUARANTINE':reason?'FAIL':'CURRENT_SCOPE_RESTORE_PASS',stages,reason,cleanupVerified,checkpointUsed,restoreAttempted,operationalCustodyInstalled:false};
 try{await platform.record('restore-result',result);}catch{result.status='QUARANTINE';result.reason='RESTORE_JOURNAL_FAILURE';}
 return result;
}
