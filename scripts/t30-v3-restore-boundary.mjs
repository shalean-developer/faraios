// T30 V3 source-only destination guard. No imports, remote connections, filesystem,
// credentials or provider operations. Evidence is caller-supplied and must be independently
// collected from a separately approved, isolated PostgreSQL 17 destination.
import {SOURCE} from './backup-staging.mjs';

const T11_DESTINATION='zrlojsvkqipuwkkyfrkn';
const HASH=/^[a-f0-9]{64}$/;
const REF=/^[a-z]{20}$/;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const keys=(object,names)=>object!==null&&typeof object==='object'&&
 !Array.isArray(object)&&same(Object.keys(object).sort(),[...names].sort());

// All pins are intentionally explicit; none of the fields authorise a restore.
// In particular, a user-supplied assertion of emptiness is not an observation.
export function validateV3RestoreBoundary({pins,archiveEvidence,destinationEvidence}={}){
 if(!keys(pins,['source','destination','archiveId','archiveSha256','emptyApplicationCatalogSha256','managedCatalogSha256','importEnabled'])||
    pins.source!==SOURCE||pins.importEnabled!==false||
    !REF.test(pins.destination??'')||[SOURCE,T11_DESTINATION].includes(pins.destination)||
    !/^[a-f0-9]{32}$/.test(pins.archiveId??'')||
    !HASH.test(pins.archiveSha256??'')||
    !HASH.test(pins.emptyApplicationCatalogSha256??'')||
    !HASH.test(pins.managedCatalogSha256??''))
  fail('T30_V3_BOUNDARY_PINS_INVALID');
 if(!keys(archiveEvidence,['source','id','sha256','authenticated','profileVersion','applicationTables','privateTables'])||
    archiveEvidence.source!==SOURCE||archiveEvidence.id!==pins.archiveId||
    archiveEvidence.sha256!==pins.archiveSha256||
    archiveEvidence.authenticated!==true||archiveEvidence.profileVersion!==3||
    archiveEvidence.applicationTables!==65||archiveEvidence.privateTables!==35)
  fail('T30_V3_BOUNDARY_ARCHIVE_INVALID');
 if(!keys(destinationEvidence,['source','projectRef','database','role','databaseMajor','applicationObjects','managedDataRows','largeObjects','vaultSecrets','foreignServers','unexpectedSchemas','applicationCatalogSha256','managedCatalogSha256','outboundDispatchDisabled','snapshotIsolationReviewed'])||
    destinationEvidence.source!=='independent-destination-preflight'||
    destinationEvidence.projectRef!==pins.destination||
    destinationEvidence.database!=='postgres'||destinationEvidence.role!=='postgres'||
    destinationEvidence.databaseMajor!==17||
    ![destinationEvidence.applicationObjects,destinationEvidence.managedDataRows,
      destinationEvidence.largeObjects,destinationEvidence.vaultSecrets,
      destinationEvidence.foreignServers].every(x=>x===0)||
    !same(destinationEvidence.unexpectedSchemas,[])||
    destinationEvidence.applicationCatalogSha256!==pins.emptyApplicationCatalogSha256||
    destinationEvidence.managedCatalogSha256!==pins.managedCatalogSha256||
    destinationEvidence.outboundDispatchDisabled!==true||
    destinationEvidence.snapshotIsolationReviewed!==true)
  fail('T30_V3_BOUNDARY_DESTINATION_INVALID');
 return Object.freeze({
  boundary:'STRUCTURAL_EVIDENCE_CONSISTENT',
  destination:pins.destination,
  restore:'NOT_RUN',
  snapshotImport:'NOT_RUN',
  independentlyObserved:false,
  executionAuthorised:false
 });
}

// A read-only standalone SQL projection for a new, empty isolated destination.
// Deliberately no transaction/role escalation, no DDL and no provider commands.
// The result is evidence, not permission to replay data.
export const V3_DESTINATION_PROBE_SQL=`SELECT jsonb_build_object(
 'database_major',current_setting('server_version_num')::integer/10000,
 'database',current_database(),
 'role',current_user,
 'application_objects',(SELECT count(*) FROM (
   SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','audit','supabase_migrations',
      'private_t19_custody','private_t19_standard','private_t20','private_t21',
      'private_t22','private_t25','private_t26') AND c.relkind IN ('r','p','v','m','S')
   UNION ALL
   SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','audit','supabase_migrations',
      'private_t19_custody','private_t19_standard','private_t20','private_t21',
      'private_t22','private_t25','private_t26')
 ) objects),
 'vault_secrets',(SELECT count(*) FROM vault.secrets),
 'large_objects',(SELECT count(*) FROM pg_largeobject_metadata),
 'foreign_servers',(SELECT count(*) FROM pg_foreign_server),
 'extension_versions',(SELECT jsonb_object_agg(extname,extversion) FROM pg_extension)
) AS v3_preflight;`;
