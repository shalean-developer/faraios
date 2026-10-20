import {BackupFailure} from './backup-staging.mjs';

export const COMPONENTS=Object.freeze(['column_acl','columns','constraints','custom_types','default_acl','enums','functions','indexes','parameter_acl','policies','relations','role_capabilities','role_memberships','schemas','sequences','triggers','views']);
export const COMPONENT_PREFIX='FARAIOS_T11_CATALOG_COMPONENTS:';
export const ROLLBACK_MARKER='FARAIOS_T11_DIAGNOSTIC_ROLLED_BACK';
export const ACTOR_SQL="DO $t11_actor$ BEGIN IF current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'RESTORE_ACTOR_CHANGED'; END IF; END $t11_actor$;\n";
const fail=code=>{throw new BackupFailure(code);};
const trim=sql=>sql.trim().replace(/;$/,'');
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===[...keys].sort().join('|');

// Mask native quoted/dollar-quoted function bodies and nested comments while
// inspecting top-level commands. No data/COPY member enters this envelope.
export function validateSchemaReplay(sql){
 if(typeof sql!=='string')fail('RESTORE_DIAGNOSTIC_SCHEMA_INVALID');
 const statements=[];let tokens=[];
 for(let i=0;i<sql.length;){
  const ch=sql[i],next=sql[i+1];
  if(/\s/.test(ch)){i++;continue;}
  if(ch==='-'&&next==='-'){i=sql.indexOf('\n',i);if(i<0)break;continue;}
  if(ch==='/'&&next==='*'){let depth=1;i+=2;while(i<sql.length&&depth){if(sql[i]==='/'&&sql[i+1]==='*'){depth++;i+=2;}else if(sql[i]==='*'&&sql[i+1]==='/'){depth--;i+=2;}else i++;}if(depth)fail('RESTORE_DIAGNOSTIC_SCHEMA_INVALID');continue;}
  if(ch==='\\')fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
  if(/^[uU]\s*&\s*["']/.test(sql.slice(i)))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
  if(ch===';' ){if(tokens.length)statements.push(tokens);tokens=[];i++;continue;}
  const dollar=ch==='$'?/^\$(?:[a-z_][a-z0-9_]*)?\$/i.exec(sql.slice(i)):null;
  if(dollar){const end=sql.indexOf(dollar[0],i+dollar[0].length);if(end<0)fail('RESTORE_DIAGNOSTIC_SCHEMA_INVALID');tokens.push({literal:true,value:null});i=end+dollar[0].length;continue;}
  if(ch==="'"||ch==='"'){
   const escaped=ch==="'"&&/[eE]/.test(sql[i-1]??'')&&!/[a-z0-9_$]/i.test(sql[i-2]??'');let value='',closed=false;i++;
   while(i<sql.length){if(escaped&&sql[i]==='\\'){value+='\\'+(sql[i+1]??'');i+=2;continue;}if(sql[i]===ch){if(sql[i+1]===ch){value+=ch;i+=2;continue;}i++;closed=true;break;}value+=sql[i++];}
   if(!closed)fail('RESTORE_DIAGNOSTIC_SCHEMA_INVALID');tokens.push({literal:ch==="'",value:ch==="'"?value:value.toUpperCase()});continue;
  }
  const word=/^[a-z_][a-z0-9_$]*/i.exec(sql.slice(i));
  if(word){tokens.push({literal:false,value:word[0].toUpperCase()});i+=word[0].length;}else{tokens.push({literal:false,value:ch});i++;}
 }
 if(tokens.length)statements.push(tokens);
 const searchPath=['SELECT','PG_CATALOG','.','SET_CONFIG','(','search_path',',','',',','FALSE',')'];
 for(const statement of statements){
  const words=statement.map(t=>t.literal?'?':t.value),first=words[0];
  if(!['CREATE','ALTER','GRANT','REVOKE','COMMENT','SECURITY','SET','RESET','SELECT'].includes(first))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
  if(first==='SET'){
   let p=1;if(['LOCAL','SESSION'].includes(words[p]))p++;
   if(!['DEFAULT_TRANSACTION_READ_ONLY','CLIENT_ENCODING','STANDARD_CONFORMING_STRINGS','CHECK_FUNCTION_BODIES','XMLOPTION','CLIENT_MIN_MESSAGES','ROW_SECURITY','DEFAULT_TABLESPACE','DEFAULT_TABLE_ACCESS_METHOD','STATEMENT_TIMEOUT','LOCK_TIMEOUT','IDLE_IN_TRANSACTION_SESSION_TIMEOUT','TRANSACTION_TIMEOUT'].includes(words[p]))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
   if(words[p]==='STANDARD_CONFORMING_STRINGS'&&!(statement.length===p+3&&words[p+1]==='='&&words[p+2]==='ON'))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
   if(words[p]==='CLIENT_ENCODING'&&!(statement.length===p+3&&words[p+1]==='='&&statement[p+2].literal&&statement[p+2].value==='UTF8'))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
  }
  if(first==='RESET'&&!(words.length===2&&words[1]==='ALL'))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
  if(first==='SELECT'||words.includes('SET_CONFIG')){
   if(statement.length!==searchPath.length||statement.some((t,i)=>t.value!==searchPath[i]||t.literal!==[5,7].includes(i)))fail('RESTORE_DIAGNOSTIC_SCHEMA_UNSAFE');
  }
 }
 return sql;
}

export function catalogComponentsSQL(sql){
 const tail="select jsonb_object_agg(scope,encode(extensions.digest(value::text,'sha256'),'hex')) as catalog from catalogs;";
 if(typeof sql!=='string'||sql.split(tail).length!==2)fail('RESTORE_DIAGNOSTIC_PROJECTION_CHANGED');
 return sql.replace(tail,"select jsonb_object_agg(scope,jsonb_build_object('sha256',encode(extensions.digest(value::text,'sha256'),'hex'),'components',(select jsonb_object_agg(key,encode(extensions.digest(item::text,'sha256'),'hex')) from jsonb_each(value) p(key,item)))) as catalog_components from catalogs;");
}

function validComponents(value){
 return sameKeys(value,['application','managed'])&&['application','managed'].every(scope=>sameKeys(value[scope],['sha256','components'])&&hash(value[scope].sha256)&&sameKeys(value[scope].components,COMPONENTS)&&COMPONENTS.every(key=>hash(value[scope].components[key])));
}
export function compareCatalogComponents(actual,expected){
 if(!validComponents(actual)||!validComponents(expected))fail('RESTORE_DIAGNOSTIC_COMPONENTS_INVALID');
 const mismatches=[];
 for(const scope of ['application','managed']){
  const keys=COMPONENTS.filter(key=>actual[scope].components[key]!==expected[scope].components[key]);
  if((actual[scope].sha256===expected[scope].sha256)!==(keys.length===0))fail('RESTORE_DIAGNOSTIC_COMPONENTS_INCONSISTENT');
  mismatches.push(...keys.map(key=>scope.toUpperCase()+'_'+key.toUpperCase()));
 }
 return {matchingComponents:COMPONENTS.length*2-mismatches.length,catalogMismatchComponents:mismatches};
}
export function parseDiagnosticOutput(stdout){
 const lines=String(stdout).split(/\r?\n/),matches=lines.filter(line=>line.startsWith(COMPONENT_PREFIX));
 if(matches.length!==1||lines.filter(line=>line===ROLLBACK_MARKER).length!==1||lines.indexOf(matches[0])>lines.indexOf(ROLLBACK_MARKER))fail('RESTORE_DIAGNOSTIC_ACK_MISSING');
 let result;try{result=JSON.parse(matches[0].slice(COMPONENT_PREFIX.length));}catch{fail('RESTORE_DIAGNOSTIC_COMPONENTS_INVALID');}
 if(!validComponents(result))fail('RESTORE_DIAGNOSTIC_COMPONENTS_INVALID');return result;
}
export function diagnosticSQL(replay,catalogSQL,limits){
 return replay+'RESET ALL;\n'+limits+ACTOR_SQL+`SELECT '${COMPONENT_PREFIX}'||catalog_components::text FROM (${trim(catalogComponentsSQL(catalogSQL))}) c;\nROLLBACK;\nSELECT '${ROLLBACK_MARKER}';\n`;
}
export function diagnosticMetadataSQL(catalogSQL,preflightSQL,limits){
 return limits+ACTOR_SQL+`SELECT jsonb_build_object('catalog',(SELECT catalog FROM (${trim(catalogSQL)}) c),'preflight',(SELECT preflight FROM (${trim(preflightSQL)}) p),'sequence_state',(SELECT jsonb_build_array(last_value::text,is_called) FROM auth.refresh_tokens_id_seq));\n`;
}
export function validateSequenceState(metadata){
 const state=metadata?.sequence_state;
 if(!Array.isArray(state)||state.length!==2||typeof state[0]!=='string'||!/^[-]?[0-9]{1,20}$/.test(state[0])||BigInt(state[0])<-(2n**63n)||BigInt(state[0])>=2n**63n||typeof state[1]!=='boolean')fail('RESTORE_DIAGNOSTIC_SEQUENCE_INVALID');
 return state;
}
