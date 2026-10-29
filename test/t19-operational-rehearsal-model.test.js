import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {Client} from 'pg';
import {readFile} from 'node:fs/promises';
import {OperationalHost} from '../scripts/t19-operational-rehearsal-host.mjs';
test('owner rehearsal SQL adapter checks whole-stage state and boundaries against an embedded managed-role model',async()=>{
 const target=process.env.T19_OPERATIONAL_NATIVE_URL;let db;
 if(target){const u=new URL(target);assert.equal(u.protocol,'postgresql:');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.username,'postgres');assert.equal(u.password,'');assert.equal(u.pathname,'/postgres');assert.equal(u.search,'');assert.equal(u.hash,'');db=new Client({connectionString:target,ssl:false});await db.connect();}
 else db=new PGlite({extensions:{btree_gist}});
 const query=(s,p)=>db.query(s,p),exec=s=>target?db.query(s):db.exec(s);
 const scalar=async s=>(await query(s)).rows[0];
 try{
  if(target){assert.match(process.env.T19_OPERATIONAL_NATIVE_NONCE??'',/^[a-f0-9]{32}$/);assert.equal((await scalar("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).marker,'t19-operational-synthetic-'+process.env.T19_OPERATIONAL_NATIVE_NONCE);assert.equal((await scalar("SELECT count(*)::int AS n FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname<>'postgres'")).n,0);assert.ok(Number((await scalar("SELECT current_setting('server_version_num') AS n")).n)>=170000&&Number((await scalar("SELECT current_setting('server_version_num') AS n")).n)<180000);}
  await exec(`CREATE ROLE t19_fixture_admin SUPERUSER LOGIN;
   SET SESSION AUTHORIZATION t19_fixture_admin;
   ALTER ROLE postgres RENAME TO supabase_admin;
   CREATE ROLE postgres LOGIN CREATEROLE BYPASSRLS;
   GRANT CREATE ON DATABASE postgres TO postgres;
   GRANT USAGE,CREATE ON SCHEMA public TO postgres;
   CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
   GRANT anon,authenticated,service_role TO postgres WITH SET TRUE, INHERIT FALSE;
   CREATE EXTENSION btree_gist;
   CREATE SCHEMA auth AUTHORIZATION supabase_admin;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
   ALTER TABLE auth.users OWNER TO supabase_admin;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   ALTER FUNCTION auth.uid() OWNER TO supabase_admin;
   GRANT USAGE ON SCHEMA auth TO postgres,anon,authenticated;
   GRANT SELECT,INSERT,REFERENCES ON auth.users TO postgres;
   CREATE SCHEMA vault AUTHORIZATION supabase_admin;
   CREATE TABLE vault.fixture_material(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),decrypted_secret text);
   CREATE VIEW vault.decrypted_secrets AS SELECT * FROM vault.fixture_material;
   CREATE FUNCTION vault.create_secret(secret text,name text DEFAULT NULL,description text DEFAULT NULL,key_id uuid DEFAULT NULL)
    RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$DECLARE r uuid;BEGIN
     INSERT INTO vault.fixture_material(decrypted_secret) VALUES(secret) RETURNING id INTO r;RETURN r;END$$;
   ALTER TABLE vault.fixture_material OWNER TO supabase_admin;
   ALTER VIEW vault.decrypted_secrets OWNER TO supabase_admin;
   ALTER FUNCTION vault.create_secret(text,text,text,uuid) OWNER TO supabase_admin;
   REVOKE EXECUTE ON FUNCTION vault.create_secret(text,text,text,uuid) FROM PUBLIC;
   GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
   GRANT SELECT ON vault.decrypted_secrets TO postgres WITH GRANT OPTION;
   GRANT SELECT ON vault.fixture_material TO postgres WITH GRANT OPTION;
   GRANT EXECUTE ON FUNCTION vault.create_secret(text,text,text,uuid) TO postgres WITH GRANT OPTION;
   SET SESSION AUTHORIZATION postgres;`);
  await exec("SET faraios.t19_02_approved_project_ref='xdmfyrsauvqznkloroxg';"+await readFile(new URL('../docs/proposals/t19-02-staging-inactive-schema.sql',import.meta.url),'utf8'));
  await exec("SET faraios.t19_runtime_review='approved-source-test'");
  assert.deepEqual(await scalar(`SELECT current_user,session_user,rolsuper,rolcreaterole,rolbypassrls,
   has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') AS auth_grantable,
   has_function_privilege(current_user,'auth.uid()','EXECUTE WITH GRANT OPTION') AS uid_grantable
   FROM pg_roles WHERE rolname=current_user`),{current_user:'postgres',session_user:'postgres',rolsuper:false,rolcreaterole:true,rolbypassrls:true,auth_grantable:false,uid_grantable:false});

  await exec('SET SESSION AUTHORIZATION t19_fixture_admin;CREATE VIEW vault.secrets AS SELECT * FROM vault.fixture_material;GRANT SELECT ON vault.secrets TO postgres;SET SESSION AUTHORIZATION postgres');
  const host=new OperationalHost({dir:'/not-used',receipt:{nonce:'a'.repeat(32)},run:async(args,{stdin})=>{
   try{
    // Embedded PG18 models SQL behavior only; the native gate retains the exact PG17 guard.
    if(!target)stdin=stdin.replaceAll("current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999",'false');
    const raw=await exec('RESET ALL;SET SESSION AUTHORIZATION '+args.find(s=>s.startsWith('--username=')).split('=')[1]+';'+stdin);
    const results=Array.isArray(raw)?raw:[raw];
    const text=results.flatMap(r=>r.rows).map(row=>Object.values(row).map(v=>typeof v==='boolean'?(v?'t':'f'):v===null?'':typeof v==='object'?JSON.stringify(v):String(v)).join('|')).join('\n');
    return {code:0,signal:null,stdout:Buffer.from(text),stderr:Buffer.alloc(0)};
   }catch(e){await exec('ROLLBACK;SET SESSION AUTHORIZATION t19_fixture_admin;SET SESSION AUTHORIZATION postgres');return {code:3,signal:null,stdout:Buffer.alloc(0),stderr:Buffer.from('ERROR:  '+e.code+': '+e.message)};}
  }});
  host.assertBound=async()=>{};host.bound.set('postgres',{id:'b'.repeat(64)});const records=[];host.record=async(k,v)=>records.push([k,v]);
  await host.syntheticFoundation();
  await host.operationalSQL();await host.operationalBoundaries();
  assert.deepEqual(records.filter(([k])=>k==='operational-stage').map(([,v])=>v.stage),['runtime','oauth','api']);
  assert.equal(records.find(([k])=>k==='operational-boundaries')[1].authenticatedCustodyLoginVerified,false);
  if(target)console.log('T19_OWNER_OPERATIONAL_SQL_ADAPTER_NATIVE_PASS');
 }finally{if(target)await db.end();else await db.close();}
});
