// T30 V3 OFFLINE REVIEW ONLY. Build a complete SQL envelope from an authenticated
// sealed archive. This module NEVER opens a connection, invokes psql, writes a
// file or authorises an actual restore. SQL contains sensitive dump records:
// never log, upload or return it through a public diagnostic endpoint.
import {readFileSync} from 'node:fs';
import {SOURCE,openBackup} from './backup-staging.mjs';
import {validateScope} from './backup-scope.mjs';
import {validateSchemaReplay} from './restore-diagnostic.mjs';
import {preserveManagedParameterGrant,sequenceAssignments,RESTORE_CREATION_DEFAULTS_SQL} from './restore-staging.mjs';
import {RECONSTRUCT_WORKING_DAYS_SQL} from './restore-constraint.mjs';
import {qualifySealedV3Offline,v3RowVerificationSQL} from './t30-v3-restore-qualification.mjs';
import {validateV3RestoreBoundary,V3_DESTINATION_PROBE_SQL} from './t30-v3-restore-boundary.mjs';
import {v3CatalogVerificationSQL,v3SequenceCompletionPlan} from './t30-v3-replay-gates.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const trim=s=>s.trim().replace(/;$/,'');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const limits="SET LOCAL statement_timeout='600s'; SET LOCAL lock_timeout='10s'; SET LOCAL timezone='UTC'; SET LOCAL search_path='';\n";

// Must be run inside a separately authorised psql --single-transaction session.
// A SAVEPOINT without the encompassing BEGIN fails BEFORE any replayed DDL.
function preflightGuard(emptyApplicationHash,managedHash){
 const portable=trim(readFileSync(new URL('./t30-private-restore-catalog.sql',import.meta.url),'utf8'));
 const baseline=trim(readFileSync(new URL('./restore-preflight.sql',import.meta.url),'utf8'));
 const privateProbe=trim(V3_DESTINATION_PROBE_SQL);
 return `SAVEPOINT faraios_t30_v3_replay;
${limits}SELECT pg_advisory_xact_lock(3011,20261104);
DO $t30_preflight$ DECLARE a jsonb; p jsonb; v jsonb; BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' THEN
  RAISE EXCEPTION 'T30_V3_RESTORE_ACTOR_CHANGED'; END IF;
 SELECT catalog INTO a FROM (${portable}) c;
 IF a->>'application'<>${quote(emptyApplicationHash)}
  OR a->>'managed'<>${quote(managedHash)}
  THEN RAISE EXCEPTION 'T30_V3_EMPTY_CATALOG_MISMATCH'; END IF;
 SELECT preflight INTO p FROM (${baseline}) c;
 SELECT v3_preflight INTO v FROM (${privateProbe}) c;
 IF p->>'database_major'<>'17' OR p->>'database'<>'postgres'
  OR p->>'role'<>'postgres' OR p->>'application_objects'<>'0'
  OR p->>'managed_data_rows'<>'0' OR p->>'vault_secrets'<>'0'
  OR p->>'large_objects'<>'0' OR p->>'foreign_servers'<>'0'
  OR p->'unexpected_schemas'<>'[]'::jsonb
  OR v->>'application_objects'<>'0' OR v->>'database_major'<>'17'
  OR v->>'database'<>'postgres' OR v->>'role'<>'postgres'
  THEN RAISE EXCEPTION 'T30_V3_DESTINATION_NOT_EMPTY'; END IF;
END $t30_preflight$;
`;
}

// Input pins and destination evidence are not independently observed. The
// resulting plan is NEVER equivalent to live recovery approval.
export function prepareSealedV3ReplayReview({bytes,key,profile,pins,destinationEvidence,
  emptyApplicationCatalogSha256,managedCatalogSha256}={}){
 const candidate=qualifySealedV3Offline({bytes,key,profile,pins});
 const boundary=validateV3RestoreBoundary({
  pins:{...pins,emptyApplicationCatalogSha256,managedCatalogSha256},
  archiveEvidence:{source:SOURCE,id:pins.archiveId,sha256:pins.archiveSha256,
   authenticated:candidate.archiveAuthentication==='PASSED',
   profileVersion:3,applicationTables:65,privateTables:35},
  destinationEvidence
 });
 if(boundary.executionAuthorised!==false||candidate.executionAuthorised!==false)
  fail('T30_V3_UNEXPECTED_EXECUTION_AUTHORITY');
 let scope;
 try{scope=validateScope(profile,SOURCE);}catch{fail('T30_V3_PROFILE_INVALID');}
 const backup=openBackup(bytes,key,scope);
 const fileMap=Object.fromEntries(backup.payload.files.map(f=>[f.name,f.content]));
 const manifest=JSON.parse(fileMap['manifest.json']);
 const role=validateSchemaReplay(preserveManagedParameterGrant(fileMap['roles.sql']));
 const schema=validateSchemaReplay(fileMap['schema.sql']);
 const migration=validateSchemaReplay(fileMap['migration-schema.sql']);
 const seq=v3SequenceCompletionPlan(scope,manifest.before,backup.payload.files);
 const rewrite=sequenceAssignments(backup.payload.files,false).rewritten;
 const structural=v3CatalogVerificationSQL(scope,manifest.before);
 const row=v3RowVerificationSQL(scope,manifest.before);
 // Still guarded even after a standalone preflight; a changed destination
 // between checks cannot skip the in-transaction emptiness/catalog tests.
 const transactionalSQL=preflightGuard(emptyApplicationCatalogSha256,managedCatalogSha256)+
   RESTORE_CREATION_DEFAULTS_SQL+'CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;\n'+
   [role,schema,migration].map(sql=>limits+sql+'\n').join('')+
   RECONSTRUCT_WORKING_DAYS_SQL+structural+
   ['data.sql','migration-data.sql'].map(name=>limits+rewrite[name]+'\n').join('')+
   row+structural;
 // setval is never included in the import transaction: it cannot roll back.
 if(transactionalSQL.includes('pg_catalog.setval(')||
    transactionalSQL.includes('COMMIT;'))fail('T30_V3_REPLAY_UNSAFE');
 return Object.freeze({
  transactionalSQL,
  sequenceCompletionSQL:seq.completionSQL,
  sequenceVerificationSQL:seq.verificationSQL,
  sequenceCount:seq.sequences,
  restore:'NOT_RUN',
  destinationIndependentlyVerified:false,
  requiresSingleTransaction:true,
  requiresSeparateSequenceApproval:true,
  executionAuthorised:false
 });
}
