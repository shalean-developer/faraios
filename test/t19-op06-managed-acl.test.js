import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Client} from 'pg';

test('OP-06: exact source ACL blocks survive non-superuser ownership transfer',async()=>{
 const target=process.env.T19_CUSTODY_NATIVE_URL;
 let db;
 if(target){
  const u=new URL(target);assert.equal(u.hostname,'127.0.0.1');
  assert.equal(u.pathname,'/postgres');assert.equal(u.username,'postgres');
  assert.equal(u.password,'');assert.equal(u.search,'');
  db=new Client({connectionString:target,ssl:false});await db.connect();
 }else db=new PGlite();
 const q=async(s,p)=>!target&&p===undefined?(await db.exec(s)).at(-1):db.query(s,p);
 const sources={};
 for(const name of ['runtime','oauth','api'])sources[name]=await readFile(new URL('../database/t19-custody-'+name+'.sql',import.meta.url),'utf8');
 const stages=[
  {source:'runtime',functions:[['actor()','uuid'],['runtime(text,jsonb)','jsonb'],['enqueue(uuid,uuid,uuid,text)','uuid'],['disconnect(uuid,uuid,bigint)','boolean']],
   acl:sources.runtime.match(/-- OP-06:[\s\S]*?(?=-- OP-02:)/)?.[0]},
  ...['oauth','revoke_grant'].map(name=>({source:'oauth',functions:[[name+'(text,jsonb)','jsonb']],acl:sources.oauth.match(new RegExp('revoke all on function private_t19_custody\\.'+name+'\\(text,jsonb\\)[^;]+;\\s*grant execute on function private_t19_custody\\.'+name+'\\(text,jsonb\\)[^;]+;'))?.[0]})),
  {source:'api',functions:[['status(uuid)','jsonb'],['reconcile(uuid,uuid)','uuid']],acl:sources.api.match(/-- OP-06:[\s\S]*?(?=-- OP-02:)/)?.[0]}
 ];
 try{
  await q('BEGIN');
  assert.equal((await q("SELECT to_regnamespace('private_t19_custody') IS NULL AS empty")).rows[0].empty,true);
  await q(`CREATE ROLE op06_executor LOGIN CREATEROLE NOINHERIT;
   CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE ROLE t19_hosted_custody NOLOGIN;
   CREATE SCHEMA private_t19_custody AUTHORIZATION op06_executor;
   GRANT USAGE ON SCHEMA private_t19_custody TO anon,authenticated,service_role,t19_hosted_custody;
   SET SESSION AUTHORIZATION op06_executor;
   CREATE ROLE t19_runtime_owner NOLOGIN NOINHERIT;`);
  // Reproduce the old order: REVOKE can warn without changing the ACL after
  // transfer to a NOINHERIT/NOSET role. A successful SQL exit is insufficient.
  await q('SAVEPOINT original_order');
  await q(`GRANT t19_runtime_owner TO op06_executor WITH SET TRUE, INHERIT FALSE;
   GRANT USAGE,CREATE ON SCHEMA private_t19_custody TO t19_runtime_owner;
   CREATE FUNCTION private_t19_custody.old_order() RETURNS integer LANGUAGE sql AS $$SELECT 1$$;
   ALTER FUNCTION private_t19_custody.old_order() OWNER TO t19_runtime_owner;
   GRANT t19_runtime_owner TO op06_executor WITH SET FALSE, INHERIT FALSE;
   REVOKE ALL ON FUNCTION private_t19_custody.old_order() FROM PUBLIC;`);
  assert.equal((await q("SELECT has_function_privilege('anon','private_t19_custody.old_order()','EXECUTE') AS leaked")).rows[0].leaked,true);
  await q('ROLLBACK TO SAVEPOINT original_order');
  for(const stage of stages){
   assert.ok(stage.acl,'exact source ACL block exists');
   await q('GRANT t19_runtime_owner TO op06_executor WITH SET TRUE, INHERIT FALSE');
   await q('GRANT USAGE,CREATE ON SCHEMA private_t19_custody TO t19_runtime_owner');
   for(const [identity,result] of stage.functions){
    await q(`CREATE FUNCTION private_t19_custody.${identity} RETURNS ${result} LANGUAGE sql AS $$SELECT NULL::${result}$$`);
    assert.ok(sources[stage.source].indexOf(stage.acl)<sources[stage.source].indexOf('alter function private_t19_custody.'+identity),identity+' must be hardened before transfer');
   }
   await q(stage.acl); // execute actual source statements as the restricted creator
   for(const [identity] of stage.functions)await q('ALTER FUNCTION private_t19_custody.'+identity+' OWNER TO t19_runtime_owner');
   await q('REVOKE CREATE ON SCHEMA private_t19_custody FROM t19_runtime_owner');
   await q('GRANT t19_runtime_owner TO op06_executor WITH SET FALSE, INHERIT FALSE');
   for(const [identity] of stage.functions){
    const isMachine=/^(runtime|oauth|revoke_grant)\(/.test(identity);
    const isBrowser=/^(enqueue|disconnect|status|reconcile)\(/.test(identity);
    const row=(await q(`SELECT pg_get_userbyid(p.proowner) AS owner,
     has_function_privilege('anon',p.oid,'EXECUTE') AS anon,
     has_function_privilege('service_role',p.oid,'EXECUTE') AS service,
     has_function_privilege('authenticated',p.oid,'EXECUTE') AS browser,
     has_function_privilege('t19_hosted_custody',p.oid,'EXECUTE') AS machine
     FROM pg_proc p WHERE p.oid=$1::regprocedure`,['private_t19_custody.'+identity])).rows[0];
    assert.deepEqual(row,{owner:'t19_runtime_owner',anon:false,service:false,browser:isBrowser,machine:isMachine},identity);
   }
  }
  assert.equal((await q("SELECT pg_has_role(current_user,'t19_runtime_owner','SET') AS can_set")).rows[0].can_set,false);
  console.log('T19_OP06_MANAGED_FUNCTION_ACL_PASS');
 }finally{
  await q('ROLLBACK');await q('SET SESSION AUTHORIZATION postgres');
  if(target)await db.end();else await db.close();
 }
});
