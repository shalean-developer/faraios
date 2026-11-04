// T30 V3 offline-only compatibility qualification.
// Not an executable restore command. This module opens no sockets, files or
// processes, and never grants authority to import an archive.
import {validateScope,matchesCurrentScope} from './backup-scope.mjs';
import {PRIVATE_BACKUP_SCHEMAS,PRIVATE_BACKUP_TABLES} from './backup-private-scope.mjs';
import {SOURCE,DUMPS,validateManifest,openBackup,sha256} from './backup-staging.mjs';

const OLD_DESTINATION='zrlojsvkqipuwkkyfrkn';
const HASH=/^[a-f0-9]{64}$/;
const PROJECT=/^[a-z]{20}$/;
const tableName=t=>t.schema+'.'+t.table;
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const failure=code=>{throw Object.assign(new Error(code),{code});};
const expectedFiles=Object.freeze([...DUMPS.map(([name])=>name),'manifest.json'].sort());

// The validated scope is a reviewed, owner-only profile. A caller must still
// authenticate ciphertext independently before trusting any archive content.
export function inspectV3RestoreCandidate({profile,manifest,archive,destination}={}){
 let scope;
 try{scope=validateScope(profile,SOURCE);}
 catch{failure('T30_V3_PROFILE_INVALID');}
 if(scope.version!==3||scope.tables.length!==30||scope.privateTables.length!==35)
  failure('T30_V3_SCOPE_INVALID');
 if(typeof destination!=='string'||!PROJECT.test(destination)||
    [SOURCE,OLD_DESTINATION].includes(destination))
  failure('T30_V3_DESTINATION_NOT_APPROVED');
 if(!archive||typeof archive!=='object'||!HASH.test(archive.sha256)||
    !/^[a-f0-9]{32}$/.test(archive.id)||!Array.isArray(archive.files)||
    archive.files.length!==expectedFiles.length||
    JSON.stringify([...archive.files].sort())!==JSON.stringify(expectedFiles))
  failure('T30_V3_ARCHIVE_METADATA_INVALID');
 if(!manifest||manifest.version!==1||manifest.source!==SOURCE||
    !manifest.before||!manifest.after||
    typeof manifest.finished!=='string'||!Number.isFinite(Date.parse(manifest.finished))||
    typeof manifest.started!=='string'||!Number.isFinite(Date.parse(manifest.started))||
    Date.parse(manifest.started)>Date.parse(manifest.finished))
  failure('T30_V3_MANIFEST_INVALID');
 try{validateManifest(manifest.before,scope);validateManifest(manifest.after,scope);}
 catch{failure('T30_V3_MANIFEST_INVALID');}
 if(!matchesCurrentScope(manifest.before,scope)||
    JSON.stringify(manifest.before)!==JSON.stringify(manifest.after))
  failure('T30_V3_SNAPSHOT_MISMATCH');
 const application=[...manifest.before.tables].filter(t=>['public','audit',...PRIVATE_BACKUP_SCHEMAS].includes(t.schema));
 const privateRows=application.filter(t=>PRIVATE_BACKUP_SCHEMAS.includes(t.schema));
 if(application.length!==65||privateRows.length!==35||
    JSON.stringify(privateRows.map(tableName).sort())!==JSON.stringify([...PRIVATE_BACKUP_TABLES].sort()))
  failure('T30_V3_TABLE_SET_INVALID');
 // A structural inspection is NOT proof of encrypted archive authenticity,
 // destination emptiness, isolation, permission checks, or restore readiness.
 return Object.freeze({source:SOURCE,version:3,applicationTables:65,privateTables:35,
  restore:'NOT_RUN',archiveAuthentication:'NOT_CHECKED',
  destinationVerification:'NOT_RUN',executionAuthorised:false});
}

// SQL text generation only: caller must NOT execute it against an existing
// project. It verifies each approved row count and digest, including all 35
// private tables. Provider-owned migration reference rows are excluded as in T11.
export function v3RowVerificationSQL(scopeInput,manifest){
 let scope;
 try{scope=validateScope(scopeInput,SOURCE);}
 catch{failure('T30_V3_PROFILE_INVALID');}
 if(scope.version!==3||!matchesCurrentScope(manifest,scope))
  failure('T30_V3_SCOPE_INVALID');
 const tables=manifest.tables.filter(t=>!(t.schema==='auth'&&t.table==='schema_migrations')&&
    !(t.schema==='storage'&&t.table==='migrations'));
 if(tables.length!==new Set(tables.map(tableName)).size)
  failure('T30_V3_TABLE_SET_INVALID');
 const statements=tables.map(t=>{
  if(!/^[a-z_][a-z0-9_]*$/.test(t.schema)||!/^[a-z_][a-z0-9_]*$/.test(t.table)||
     !Number.isSafeInteger(t.rows)||t.rows<0||!HASH.test(t.sha256))
    failure('T30_V3_ROW_PIN_INVALID');
  const table=quote(t.schema)+'.'+quote(t.table);
  return `SELECT count(*),encode(extensions.digest(coalesce(string_agg(q.row_hash,'' ORDER BY q.row_hash),''),'sha256'),'hex') INTO n,h FROM (SELECT encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex') AS row_hash FROM ${table} t) q; IF n<>${t.rows} OR h<>'${t.sha256}' THEN RAISE EXCEPTION 'T30_V3_ROW_MISMATCH'; END IF;`;
 });
 return 'DO $t30_v3_rows$ DECLARE n bigint; h text; BEGIN\n'+
   statements.join('\n')+'\nEND $t30_v3_rows$;\n';
}

// Authenticate a sealed V3 archive entirely in memory, using the existing T11
// AES-GCM format, member hash/coverage checks and V3 profile scope validators.
// This function never reads files, opens a network connection or executes SQL.
// The plan is only an offline comparison against separately reviewed pins,
// NOT proof that a destination exists or is empty and NOT restore authority.
export function qualifySealedV3Offline({bytes,key,profile,pins}={}){
 if(!Buffer.isBuffer(bytes)||!Buffer.isBuffer(key)||key.length!==32||
    !pins||typeof pins!=='object'||
    JSON.stringify(Object.keys(pins).sort())!==
      JSON.stringify(['archiveId','archiveSha256','destination','importEnabled','source'].sort())||
    pins.source!==SOURCE||pins.importEnabled!==false||
    !/^[a-f0-9]{32}$/.test(pins.archiveId??'')||
    !HASH.test(pins.archiveSha256??''))
  failure('T30_V3_OFFLINE_PINS_INVALID');
 let scope;
 try{scope=validateScope(profile,SOURCE);}
 catch{failure('T30_V3_PROFILE_INVALID');}
 if(scope.version!==3)failure('T30_V3_SCOPE_INVALID');
 if(sha256(bytes)!==pins.archiveSha256)failure('T30_V3_CIPHERTEXT_HASH_MISMATCH');
 let result;
 try{result=openBackup(bytes,key,scope);}
 catch{failure('T30_V3_ARCHIVE_AUTHENTICATION_FAILED');}
 if(result.id!==pins.archiveId)failure('T30_V3_ARCHIVE_ID_MISMATCH');
 let manifest;
 try{manifest=JSON.parse(result.payload.files.find(f=>f.name==='manifest.json').content);}
 catch{failure('T30_V3_MANIFEST_INVALID');}
 const inspected=inspectV3RestoreCandidate({
  profile:scope,manifest,destination:pins.destination,
  archive:{id:result.id,sha256:pins.archiveSha256,files:result.payload.files.map(f=>f.name)}
 });
 return Object.freeze({...inspected,archiveAuthentication:'PASSED',
  ciphertextSha256:pins.archiveSha256,
  destinationVerification:'NOT_RUN',executionAuthorised:false});
}
