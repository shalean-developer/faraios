import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('T19 OP-04 stage guards fail closed inside their own transactions',async()=>{
 for(const [name,checks] of [
  ['runtime',['private_t19_custody.connections','private_t19_custody.operations','private_t19_custody.prepared_references','t19_runtime_owner']],
  ['oauth',['private_t19_custody.jobs','private_t19_custody.oauth_clients','private_t19_custody.oauth_states']],
  ['api',['private_t19_custody.oauth_states','public.t19_accounting_status(uuid)','private_t19_custody.reconcile(uuid,uuid)']]
 ]){
  const sql=await readFile(new URL('../database/t19-custody-'+name+'.sql',import.meta.url),'utf8');
  assert.match(sql,/^begin;/mi);
  assert.match(sql,/end \$t19_preflight\$;/);
  assert.match(sql,/errcode='55000'/);
  assert.match(sql,/^commit;/mi);
  assert.ok(sql.indexOf('end $t19_preflight$;')<sql.indexOf('create ',sql.indexOf('end $t19_preflight$;')),'guard before payload');
  for(const check of checks)assert.ok(sql.includes(check),name+': missing '+check);
 }
});
