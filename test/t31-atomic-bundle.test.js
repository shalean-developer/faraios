import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('T31 atomic migration exactly matches the three approved source candidates',async()=>{
 const source=['t31-provisioning-candidate.sql','t31-branding-candidate.sql','t31-staff-invitations-candidate.sql'];
 const sql=await readFile(new URL('../database/migrations-review/20261105010000_t31_atomic_onboarding_review.sql',import.meta.url),'utf8');
 assert.equal((sql.match(/^begin;$/gm)??[]).length,1);
 assert.equal((sql.match(/^commit;$/gm)??[]).length,1);
 assert.match(sql,/T31 preexisting objects: stop for owner review/);
 assert.match(sql,/T31 missing baseline dependency/);
 for(const name of source){
  const marker='database/'+name;
  const begin='-- BEGIN SOURCE: '+marker+'\n',end='\n-- END SOURCE: '+marker;
  const pos=sql.indexOf(begin);
  assert.ok(pos>0,'missing source marker '+marker);
  const endAt=sql.indexOf(end,pos+begin.length);
  assert.ok(endAt>pos,'missing end source marker '+marker);
  const included=sql.slice(pos+begin.length,endAt).trim();
  const original=await readFile(new URL('../database/'+name,import.meta.url),'utf8');
  assert.equal((original.match(/^begin;\s*$/gm)??[]).length,1);
  assert.equal((original.match(/^commit;\s*$/gm)??[]).length,1);
  const expected=original.replace(/^begin;\s*\n/m,'').replace(/^commit;\s*$/m,'').trim();
  assert.equal(included,expected,'candidate drift: '+marker);
 }
 console.log('T31_ATOMIC_BUNDLE_SOURCE_INTEGRITY_PASS');
});
