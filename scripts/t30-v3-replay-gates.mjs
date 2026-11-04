// T30 V3 catalog and sequence replay qualification. OFFLINE SQL generation only.
// No host, database, secrets or restore execution are accessed by this module.
// The SQL must not be executed outside a separately approved isolated restore.
import {readFileSync} from 'node:fs';
import {validateScope,matchesCurrentScope} from './backup-scope.mjs';
import {SOURCE} from './backup-staging.mjs';
import {PRIVATE_BACKUP_SCHEMAS} from './backup-private-scope.mjs';
import {sequenceAssignments} from './restore-staging.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const hash=/^[a-f0-9]{64}$/;
const ident=/^[a-z_][a-z0-9_]*$/;
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const allowed=new Set(['public','audit','auth','storage','supabase_migrations',...PRIVATE_BACKUP_SCHEMAS]);

function scopeOf(raw,manifest){
 let scope;
 try{scope=validateScope(raw,SOURCE);}catch{fail('T30_V3_PROFILE_INVALID');}
 if(scope.version!==3||scope.tables.length!==30||scope.privateTables.length!==35||
   !matchesCurrentScope(manifest,scope))fail('T30_V3_SCOPE_INVALID');
 return scope;
}

// The portable SQL is read from the exact repository file, never from an
// archive member, untrusted argument, environment override or network input.
export function v3CatalogVerificationSQL(profile,manifest){
 const scope=scopeOf(profile,manifest);
 if(!hash.test(scope.application)||!hash.test(scope.managed))
  fail('T30_V3_CATALOG_PINS_INVALID');
 const catalog=readFileSync(new URL('./t30-private-restore-catalog.sql',import.meta.url),'utf8')
  .trim().replace(/;$/,'');
 return `DO $t30_catalog$ DECLARE actual jsonb; BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' THEN
  RAISE EXCEPTION 'T30_V3_RESTORE_ACTOR_CHANGED'; END IF;
 SELECT catalog INTO actual FROM (${catalog}) pinned_projection;
 IF actual->>'application'<>${literal(scope.application)}
  OR actual->>'managed'<>${literal(scope.managed)}
  THEN RAISE EXCEPTION 'T30_V3_RESTORE_CATALOG_MISMATCH'; END IF;
 END $t30_catalog$;
`;
}

// Validate a recovery sequence completion plan against the authenticated
// capture manifest. setval is NOT transactional: completion remains a separate,
// explicitly authorised stage following committed row/catalog verification.
export function v3SequenceCompletionPlan(profile,manifest,files){
 scopeOf(profile,manifest);
 if(!Array.isArray(manifest.sequence_state)||
    !Array.isArray(files)||files.length===0)fail('T30_V3_SEQUENCE_MANIFEST_INVALID');
 let states;
 try{states=sequenceAssignments(files,false).states;}
 catch{fail('T30_V3_SEQUENCE_DUMP_INVALID');}
 const approved=manifest.sequence_state;
 const names=new Set();
 for(const s of approved){
  if(!s||!allowed.has(s.schema)||!ident.test(s.sequence)||
   (s.last_value!==null&&
     (typeof s.last_value!=='string'||!/^[-]?[0-9]+$/.test(s.last_value)))||
   names.has(s.schema+'.'+s.sequence))fail('T30_V3_SEQUENCE_MANIFEST_INVALID');
  names.add(s.schema+'.'+s.sequence);
 }
 const actual=states.map(s=>s.schema+'.'+s.sequence);
 if(actual.length!==new Set(actual).size||
    actual.some(n=>!names.has(n))||
    names.size!==new Set(actual).size)
  fail('T30_V3_SEQUENCE_SCOPE_MISMATCH');
 const lookup=new Map(approved.map(s=>[s.schema+'.'+s.sequence,s]));
 for(const state of states){
  const expected=lookup.get(state.schema+'.'+state.sequence);
  if(expected.last_value!==null&&BigInt(expected.last_value)!==BigInt(state.value))
   fail('T30_V3_SEQUENCE_VALUE_MISMATCH');
 }
 const sql=states.map(s=>{
  const name=quote(s.schema)+'.'+quote(s.sequence);
  return `SELECT pg_catalog.setval(${literal(name)},${s.value},${s.isCalled});`;
 }).join('\n');
 const verification=states.map(s=>{
  const name=quote(s.schema)+'.'+quote(s.sequence);
  return `SELECT last_value::text,is_called INTO observed,called FROM ${name};
 IF observed<>${literal(s.value)} OR called<>${s.isCalled}
 THEN RAISE EXCEPTION 'T30_V3_SEQUENCE_STATE_MISMATCH'; END IF;`;
 }).join('\n');
 return Object.freeze({
  sequences:states.length,
  completionSQL:sql,
  verificationSQL:`DO $t30_sequence$ DECLARE observed text; called boolean; BEGIN
${verification}
END $t30_sequence$;`,
  executionAuthorised:false,
  mustReverifyCommittedRestore:true
 });
}
