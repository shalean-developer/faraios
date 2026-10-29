import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=new URL('../test-support/t19-bootstrap-helpers/',import.meta.url);
const read=n=>readFileSync(new URL(n,base),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const names=['grant_pg_cron_access','grant_pg_graphql_access','grant_pg_net_access','pgrst_ddl_watch','pgrst_drop_watch','set_graphql_placeholder'];
function body(sql,name){
 const start=sql.search(new RegExp('CREATE (?:OR REPLACE )?FUNCTION extensions\\.'+name+'\\(\\)'));
 assert.ok(start>=0);const chunk=sql.slice(start),m=chunk.match(/\bAS (\$[a-zA-Z_]*\$)/);
 assert.ok(m);const from=m.index+m[0].length,to=chunk.indexOf(m[1],from);assert.ok(to>from);
 return chunk.slice(from,to);
}
test('helper provenance snapshots and candidate overlay retain their exact bytes',()=>{
 for(const [file,hash] of Object.entries({
  'upstream-current.sql':'ceab43c0ad7d40edd5b9b3a9caf1042006e16c99443b703df614817572f6018a',
  'upstream-before-cron-cascade.sql':'cf4a78fc7f6a61e0914c495320b320554785423bc1567da08770dc0230e34913',
  'overlay.sql':'f31ed2fb751d7b060569fefb2c448a21ef550d08eb8758d10f645c24def6d9d5',
  'LICENSE':'fd313c784c2e3c964fe043fdb7bcffa8f84627d53d2cf3a61c61586ff6c3f4c1'
 }))assert.equal(sha(read(file)),hash,file);
});
test('all six overlay bodies derive from public source with one explicit nested hardening',()=>{
 const overlay=read('overlay.sql');
 for(const name of names){
  const source=['grant_pg_graphql_access','grant_pg_net_access'].includes(name)?'upstream-current.sql':'upstream-before-cron-cascade.sql';
  let expected=body(read(source),name);
  if(name==='set_graphql_placeholder'){
   const before='            language plpgsql\n        as $$';
   assert.equal(expected.split(before).length,2);
   expected=expected.replace(before,()=>"            language plpgsql\n            set search_path to ''\n        as $$");
  }
  assert.equal(body(overlay,name),expected,name);
 }
 assert.equal((overlay.match(/SET search_path TO ''/g)||[]).length,6);
 assert.equal((overlay.match(/ALTER ROLE/g)||[]).length,1);
 assert.ok(overlay.includes('ALTER ROLE supabase_admin SET search_path TO "$user", public, auth, extensions;'));
});
