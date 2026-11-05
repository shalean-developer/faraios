import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE} from '../scripts/backup-staging.mjs';
import {validateV3RestoreBoundary,V3_DESTINATION_PROBE_SQL} from '../scripts/t30-v3-restore-boundary.mjs';

const H='a'.repeat(64),B='b'.repeat(64),C='c'.repeat(64);
const fixture=()=>({
 pins:{source:SOURCE,destination:'abcdefghijklmnopqrst',archiveId:'d'.repeat(32),archiveSha256:H,
  emptyApplicationCatalogSha256:B,managedCatalogSha256:C,importEnabled:false},
 archiveEvidence:{source:SOURCE,id:'d'.repeat(32),sha256:H,authenticated:true,
  profileVersion:3,applicationTables:65,privateTables:35},
 destinationEvidence:{source:'independent-destination-preflight',
  projectRef:'abcdefghijklmnopqrst',database:'postgres',role:'postgres',databaseMajor:17,
  applicationObjects:0,managedDataRows:0,largeObjects:0,vaultSecrets:0,
  foreignServers:0,unexpectedSchemas:[],applicationCatalogSha256:B,
  managedCatalogSha256:C,outboundDispatchDisabled:true,snapshotIsolationReviewed:true}
});
const errorCode=fn=>{try{fn();return null;}catch(e){return e.code||e.message;}};

test('T30 V3 evidence guard does not authorise execution for a matching candidate',()=>{
 const x=validateV3RestoreBoundary(fixture());
 assert.equal(x.boundary,'STRUCTURAL_EVIDENCE_CONSISTENT');
 assert.equal(x.restore,'NOT_RUN');
 assert.equal(x.independentlyObserved,false);
 assert.equal(x.executionAuthorised,false);
});

test('T30 V3 boundary rejects source and historical restore destinations',()=>{
 for(const dest of [SOURCE,'zrlojsvkqipuwkkyfrkn','',null,'malformed.invalid']){
  const f=fixture();f.pins.destination=dest;
  assert.equal(errorCode(()=>validateV3RestoreBoundary(f)),'T30_V3_BOUNDARY_PINS_INVALID');
 }
});

test('T30 V3 boundary rejects unreviewed profiles, mismatched ciphertext and all nonempty destination evidence',()=>{
 const mutations=[
  f=>f.pins.importEnabled=true,
  f=>f.pins.extra='injected',
  f=>f.archiveEvidence.authenticated=false,
  f=>f.archiveEvidence.profileVersion=2,
  f=>f.archiveEvidence.privateTables=34,
  f=>f.archiveEvidence.sha256='0'.repeat(64),
  f=>f.archiveEvidence.source='other',
  f=>f.destinationEvidence.projectRef='staging',
  f=>f.destinationEvidence.databaseMajor=16,
  f=>f.destinationEvidence.role='authenticated',
  f=>f.destinationEvidence.applicationObjects=1,
  f=>f.destinationEvidence.managedDataRows=1,
  f=>f.destinationEvidence.largeObjects=1,
  f=>f.destinationEvidence.vaultSecrets=1,
  f=>f.destinationEvidence.foreignServers=1,
  f=>f.destinationEvidence.unexpectedSchemas=['private_unknown'],
  f=>f.destinationEvidence.applicationCatalogSha256='0'.repeat(64),
  f=>f.destinationEvidence.managedCatalogSha256='0'.repeat(64),
  f=>f.destinationEvidence.outboundDispatchDisabled=false,
  f=>f.destinationEvidence.snapshotIsolationReviewed=false,
  f=>f.destinationEvidence.source='owner-asserted',
  f=>f.destinationEvidence.extra='unchecked'
 ];
 for(const [i,mutate] of mutations.entries()){
  const f=fixture();mutate(f);
  assert.notEqual(errorCode(()=>validateV3RestoreBoundary(f)),null,'mutation '+i);
 }
});

test('T30 V3 destination SQL is strictly read only, includes all seven protected schemas',()=>{
 assert.ok(V3_DESTINATION_PROBE_SQL.startsWith('SELECT jsonb_build_object('));
 for(const schema of ['private_t19_custody','private_t19_standard','private_t20',
  'private_t21','private_t22','private_t25','private_t26'])
  assert.ok(V3_DESTINATION_PROBE_SQL.includes("'"+schema+"'"));
 for(const token of [/\bINSERT\b/i,/\bUPDATE\b/i,/\bDELETE\b/i,/\bCREATE\b/i,/\bDROP\b/i,/\bALTER\b/i,/\bCOMMIT\b/i,/\bSET ROLE\b/i,/\bCOPY\b/i])
  assert.equal(token.test(V3_DESTINATION_PROBE_SQL),false,token.toString());
});
