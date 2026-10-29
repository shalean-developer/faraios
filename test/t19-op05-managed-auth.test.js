import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Client} from 'pg';

test('OP-05: existing Auth identity works without delegated Auth schema access',async()=>{
 const target=process.env.T19_CUSTODY_NATIVE_URL;
 let db;
 if(target){
  const u=new URL(target);
  assert.equal(u.hostname,'127.0.0.1');assert.equal(u.pathname,'/postgres');
  assert.equal(u.username,'postgres');assert.equal(u.password,'');assert.equal(u.search,'');
  db=new Client({connectionString:target,ssl:false});await db.connect();
 }else db=new PGlite();
 const sql=await readFile(new URL('../database/t19-custody-runtime.sql',import.meta.url),'utf8');
 const helper=sql.match(/create function private_t19_custody.actor\(\) returns uuid[\s\S]*?\nend;/)?.[0];
 const guard=sql.match(/do \$op05\$ begin[\s\S]*?end \$op05\$;/)?.[0];
 assert.ok(helper);assert.ok(guard);
 const q=async(s,p)=>!target&&p===undefined?(await db.exec(s)).at(-1):db.query(s,p);
 const deny=async statement=>{
  await q('SAVEPOINT negative');
  try{await assert.rejects(q(statement),{code:'42501'});}
  finally{await q('ROLLBACK TO SAVEPOINT negative');}
 };
 try{
  await q('BEGIN');
  assert.equal((await q("SELECT to_regnamespace('auth') IS NULL AS empty")).rows[0].empty,true);
  await q(`CREATE ROLE op05_admin LOGIN CREATEROLE NOINHERIT;
   CREATE ROLE op05_vendor NOLOGIN; CREATE ROLE op05_caller NOLOGIN;
   CREATE SCHEMA auth AUTHORIZATION op05_vendor;
   GRANT USAGE ON SCHEMA auth TO op05_admin;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
    AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   ALTER FUNCTION auth.uid() OWNER TO op05_vendor;
   CREATE SCHEMA private_t19_custody AUTHORIZATION op05_admin;
   SET SESSION AUTHORIZATION op05_admin;
   CREATE ROLE t19_runtime_owner NOLOGIN NOINHERIT;
   GRANT t19_runtime_owner TO op05_admin WITH SET TRUE, INHERIT FALSE;
   GRANT USAGE,CREATE ON SCHEMA private_t19_custody TO t19_runtime_owner;
   GRANT USAGE ON SCHEMA private_t19_custody TO op05_caller;`);
  const rights=(await q(`SELECT
   has_schema_privilege('op05_admin','auth','USAGE WITH GRANT OPTION') AS can_delegate,
   has_schema_privilege('t19_runtime_owner','auth','USAGE') AS runtime_usage,
   has_function_privilege('op05_admin','auth.uid()','EXECUTE WITH GRANT OPTION') AS function_delegate`)).rows[0];
  assert.deepEqual(rights,{can_delegate:false,runtime_usage:false,function_delegate:false});
  await q(`CREATE FUNCTION private_t19_custody.probe() RETURNS uuid LANGUAGE plpgsql
   SECURITY DEFINER SET search_path=pg_catalog AS $$BEGIN RETURN auth.uid(); END$$;
   ALTER FUNCTION private_t19_custody.probe() OWNER TO t19_runtime_owner;`);
  await deny('SELECT private_t19_custody.probe()'); // original late lookup fails
  await q(guard);await q(helper);
  await q(`REVOKE ALL ON FUNCTION private_t19_custody.actor() FROM PUBLIC;
   ALTER FUNCTION private_t19_custody.actor() OWNER TO t19_runtime_owner;
   SET ROLE t19_runtime_owner;
   CREATE OR REPLACE FUNCTION private_t19_custody.probe() RETURNS uuid LANGUAGE plpgsql
    SECURITY DEFINER SET search_path=pg_catalog AS $$BEGIN RETURN private_t19_custody.actor(); END$$;
   CREATE FUNCTION private_t19_custody.protected_probe() RETURNS uuid LANGUAGE plpgsql
    SECURITY DEFINER SET search_path=pg_catalog AS $$DECLARE actor uuid; BEGIN
     actor:=private_t19_custody.actor();
     IF actor IS NULL THEN RAISE EXCEPTION 'denied' USING ERRCODE='42501'; END IF;
     RETURN actor; END$$;
   RESET ROLE; REVOKE CREATE ON SCHEMA private_t19_custody FROM t19_runtime_owner;
   GRANT t19_runtime_owner TO op05_admin WITH SET FALSE, INHERIT FALSE;`);
  await q('SET SESSION AUTHORIZATION postgres; RESET ROLE');
  const metadata=(await q(`SELECT p.prosecdef,p.prosqlbody IS NOT NULL AS parsed,
   EXISTS(SELECT FROM pg_depend d WHERE d.classid='pg_proc'::regclass
    AND d.objid=p.oid AND d.refclassid='pg_proc'::regclass
    AND d.refobjid='auth.uid()'::regprocedure) AS bound,
   has_schema_privilege('t19_runtime_owner','auth','USAGE') AS auth_usage
   FROM pg_proc p WHERE p.oid='private_t19_custody.actor()'::regprocedure`)).rows[0];
  assert.deepEqual(metadata,{prosecdef:false,parsed:true,bound:true,auth_usage:false});
  await q('SET SESSION AUTHORIZATION op05_caller');
  await deny('SELECT private_t19_custody.actor()');
  await q("SET search_path=pg_temp,public; CREATE TEMP TABLE op05_shadow(id integer)");
  for(const actor of ['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','']){
   await q("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor]);
   assert.equal((await q('SELECT private_t19_custody.probe() AS actor')).rows[0].actor,actor||null);
  }
  await q("SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true)");
  assert.equal((await q('SELECT private_t19_custody.protected_probe() AS actor')).rows[0].actor,'00000000-0000-4000-8000-000000000001');
  await q('SET SESSION AUTHORIZATION postgres; RESET ROLE');
  await q('REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC');
  await q('SET SESSION AUTHORIZATION op05_admin');
  await deny(guard); // prerequisite absence fails closed
  await q('SET SESSION AUTHORIZATION postgres; SET SESSION AUTHORIZATION op05_caller');
  await q('SAVEPOINT revoked_identity');
  try{
   // Engines may reject the underlying EXECUTE before evaluating the CASE;
   // cached native plans must instead yield no identity. Neither may return it.
   assert.equal((await q('SELECT private_t19_custody.probe() AS actor')).rows[0].actor,null);
  }catch(e){assert.equal(e.code,'42501');}
  finally{await q('ROLLBACK TO SAVEPOINT revoked_identity');}
  await deny('SELECT private_t19_custody.protected_probe()'); // cached identity fails closed
  console.log('T19_OP05_MANAGED_AUTH_IDENTITY_PASS');
 }finally{
  await q('ROLLBACK');await q('SET SESSION AUTHORIZATION postgres');
  if(target)await db.end();else await db.close();
 }
});
