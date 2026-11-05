import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIVATE_BACKUP_TABLES} from '../scripts/backup-private-scope.mjs';
import {SOURCE} from '../scripts/backup-staging.mjs';
import {validateScope} from '../scripts/backup-scope.mjs';
import {ORIGINAL_T30_FINGERPRINTS,CURRENT_REVIEWED_FINGERPRINTS,proposeT31A02V3Rebaseline} from '../scripts/t31-a02-v3-rebaseline-review.mjs';

const head='3d1de9155cbb09e4e95d8e6b64699351716e62bc';
const old=()=>({
 version:3,source:SOURCE,id:'owner-original-t30-v3',
 tables:[...'abc'.split('').map(k=>'audit.'+k),...Array.from({length:27},(_,i)=>'public.t'+String(i).padStart(2,'0'))],
 privateTables:[...PRIVATE_BACKUP_TABLES],
 ...ORIGINAL_T30_FINGERPRINTS
});
test('T31-A02 creates only a different, inactive, validated V3 proposal, preserving source and profile',()=>{
 const original=old(),before=JSON.stringify(original);
 const answer=proposeT31A02V3Rebaseline(original,{fingerprints:{...CURRENT_REVIEWED_FINGERPRINTS},reviewedSourceSha:head});
 assert.equal(JSON.stringify(original),before);
 assert.equal(answer.activation,'DISABLED');
 assert.equal(answer.approval,'NOT_GRANTED');
 assert.equal(answer.originalPreserved,true);
 assert.equal(answer.classification,'UNEXPLAINED_HISTORICAL_DRIFT');
 assert.notEqual(answer.candidate.id,original.id);
 assert.deepEqual(answer.candidate.tables,original.tables);
 assert.deepEqual(answer.candidate.privateTables,original.privateTables);
 assert.equal(answer.candidate.catalog,CURRENT_REVIEWED_FINGERPRINTS.catalog);
 assert.equal(answer.candidate.application,CURRENT_REVIEWED_FINGERPRINTS.application);
 assert.equal(answer.candidate.managed,CURRENT_REVIEWED_FINGERPRINTS.managed);
 assert.ok(Object.isFrozen(answer)&&Object.isFrozen(answer.candidate));
 assert.ok(validateScope(answer.candidate,SOURCE));
});
test('T31-A02 refuses unreviewed hashes, changed baseline, missing protected tables or absent provenance',()=>{
 const base=old();
 const acceptable={fingerprints:{...CURRENT_REVIEWED_FINGERPRINTS},reviewedSourceSha:head};
 for(const mutate of [
  p=>{p.version=2;},
  p=>{p.source='different';},
  p=>{p.catalog='0'.repeat(64);},
  p=>{p.application='0'.repeat(64);},
  p=>{p.managed='0'.repeat(64);},
  p=>{p.tables.pop();},
  p=>{p.privateTables.pop();},
  p=>{p.tables.push('public.unknown');},
  p=>{p.id='t31-a02-v3-rebaseline-review-20261105';}
 ]){
  const p=base;mutate(p);
  assert.throws(()=>proposeT31A02V3Rebaseline(p,acceptable));
 }
 for(const opts of [
  {},{fingerprints:CURRENT_REVIEWED_FINGERPRINTS},
  {...acceptable,reviewedSourceSha:'unknown'},
  {...acceptable,fingerprints:{...CURRENT_REVIEWED_FINGERPRINTS,catalog:'0'.repeat(64)}},
  {...acceptable,fingerprints:{...CURRENT_REVIEWED_FINGERPRINTS,application:'0'.repeat(64)}},
  {...acceptable,fingerprints:{...CURRENT_REVIEWED_FINGERPRINTS,managed:'0'.repeat(64)}}
 ])assert.throws(()=>proposeT31A02V3Rebaseline(old(),opts));
});
console.log('T31_A02_INACTIVE_V3_REBASE_PROPOSAL_DENIALS_PASS');
