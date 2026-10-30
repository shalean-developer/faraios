import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {Client} from 'pg';
import {runtimeCommitPackage} from '../scripts/t19-runtime-commit-package.mjs';
import {runtimeContractSQL} from '../scripts/t19-runtime-contract.mjs';
import {captureSQL,rehearsalPackage} from '../scripts/t19-provisioning-package.mjs';
import {invoiceFixture} from '../test-support/t19-runtime-fixture.mjs';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const sha=b=>createHash('sha256').update(b).digest('hex');
const quote=s=>'"'+s.replaceAll('"','""')+'"';

test('whole operational SQL stages commit, deny collisions and fully roll back under managed-style postgres',async()=>{
 const target=process.env.T19_OPERATIONAL_NATIVE_URL;
 const guardCA=process.env.T19_PROVISIONING_GUARD_CA;
 const ssl=guardCA?{ca:await readFile(guardCA,'utf8'),rejectUnauthorized:true,servername:'localhost'}:false;
 let engine;
 if(target){
  const u=new URL(target);assert.equal(u.hostname,'127.0.0.1');assert.equal(u.pathname,'/postgres');
  assert.equal(u.protocol,'postgresql:');assert.equal(u.hash,'');
  assert.equal(u.username,'postgres');assert.equal(u.password,'');assert.equal(u.search,'');
  engine=new Client({connectionString:target,ssl});await engine.connect();
 }else engine=new PGlite({extensions:{btree_gist}});
 const query=(s,p)=>engine.query(s,p);
 const exec=s=>target?engine.query(s):engine.exec(s);
 const scalar=async s=>(await query(s)).rows[0];
 // This test changes cluster roles, so it may run natively ONLY in the fresh
 // cluster owned by run-t19-operational-postgres.mjs, never another test DB.
 try{
  const version=(await scalar("SELECT current_setting('server_version_num')::int AS n")).n;
  if(target)assert.ok(version>=170000&&version<180000);
  else assert.ok(version>=170000); // embedded model; native CI alone proves PG17
  const nonce=target?process.env.T19_OPERATIONAL_NATIVE_NONCE:randomBytes(16).toString('hex');
  assert.match(nonce??'',/^[a-f0-9]{32}$/);
  if(!target)await exec("COMMENT ON DATABASE postgres IS 't19-operational-synthetic-"+nonce+"'");
  assert.equal((await scalar("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).marker,'t19-operational-synthetic-'+nonce);
  assert.equal((await scalar("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")).n,0);
  assert.equal((await scalar("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema')")).n,0);
  assert.equal((await scalar("SELECT count(*)::int AS n FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname<>'postgres'")).n,0);
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
   CREATE VIEW vault.secrets AS SELECT id FROM vault.fixture_material;
   ALTER VIEW vault.secrets OWNER TO supabase_admin;
   GRANT SELECT ON vault.secrets TO postgres WITH GRANT OPTION;
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
  const adapter={query,exec,close:async()=>{}};
  await invoiceFixture({database:adapter,authPrepared:true});
  await exec("SET faraios.t19_02_approved_project_ref='xdmfyrsauvqznkloroxg';"+await readFile(new URL('../docs/proposals/t19-02-staging-inactive-schema.sql',import.meta.url),'utf8'));
  await exec("SET faraios.t19_runtime_review='approved-source-test'");
  assert.deepEqual(await scalar(`SELECT current_user,session_user,rolsuper,rolcreaterole,rolbypassrls,
   has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') AS auth_grantable,
   has_function_privilege(current_user,'auth.uid()','EXECUTE WITH GRANT OPTION') AS uid_grantable
   FROM pg_roles WHERE rolname=current_user`),{current_user:'postgres',session_user:'postgres',rolsuper:false,rolcreaterole:true,rolbypassrls:true,auth_grantable:false,uid_grantable:false});

  if(guardCA){
   // The setup backend began under the original role OID before role rename.
   // Reconnect as the actual managed actor, as hosted execution must do.
   await engine.end();engine=new Client({connectionString:target,ssl});await engine.connect();
   assert.equal((await scalar('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).ssl,true);
   await exec("SET faraios.t19_runtime_review='approved-source-test'");
  }

  async function state(client=adapter,{protectedOnly=false}={}){
   const run=(s,p)=>client.query(s,p);
   const schemas=protectedOnly?['public','audit','auth','vault']:['public','audit','auth','vault','private_t19_custody'];
   const tables=(await run("SELECT n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) AND c.relkind IN ('r','p','S') ORDER BY 1,2",[schemas])).rows;
   const data=[];
   for(const t of tables){
    const name=quote(t.nspname)+'.'+quote(t.relname);
    // Native SQL computes text digests before JavaScript can round bigint.
    const r=(await run(t.relkind==='S'?`SELECT last_value::text,is_called FROM ${name}`:
     `SELECT count(*)::text AS count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${name} t`)).rows[0];
    data.push([t.nspname,t.relname,r]);
   }
   if(protectedOnly)return sha(JSON.stringify(data));
   const catalog=(await run(`SELECT jsonb_build_object(
    'roles',(SELECT jsonb_agg(to_jsonb(x) ORDER BY rolname) FROM (SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname NOT LIKE 'pg_%') x),
    'memberships',(SELECT jsonb_agg(to_jsonb(x) ORDER BY roleid,member,grantor) FROM pg_auth_members x),
    'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner,nspacl) ORDER BY nspname) FROM pg_namespace WHERE nspname=ANY($1)),
    'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1)),
    'columns',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,a.attnum,a.attname,a.atttypid,a.attnotnull,a.attidentity,a.attacl,pg_get_expr(d.adbin,d.adrelid)) ORDER BY n.nspname,c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname=ANY($1) AND a.attnum>0 AND NOT a.attisdropped),
    'functions',(SELECT jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,p.proowner,p.proacl,pg_get_functiondef(p.oid)) ORDER BY p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=ANY($1) AND p.prokind<>'a'),
    'policies',(SELECT jsonb_agg(to_jsonb(x) ORDER BY schemaname,tablename,policyname) FROM pg_policies x WHERE schemaname=ANY($1)),
    'constraints',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.conname,pg_get_constraintdef(c.oid),c.convalidated) ORDER BY n.nspname,c.conname,c.conrelid) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=ANY($1)),
    'indexes',(SELECT jsonb_agg(to_jsonb(x) ORDER BY schemaname,tablename,indexname) FROM pg_indexes x WHERE schemaname=ANY($1)),
    'defaults',(SELECT jsonb_agg(to_jsonb(x) ORDER BY oid) FROM pg_default_acl x)
   ) AS value`,[schemas])).rows[0].value;
   return sha(JSON.stringify({data,catalog}));
  }
  async function fresh(options){
   if(!target)return state(adapter,options);
   const c=new Client({connectionString:target,ssl});await c.connect();
   try{
    const who=(await c.query('SELECT session_user,current_user,rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0];
    assert.deepEqual(who,{session_user:'postgres',current_user:'postgres',rolsuper:false});
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL statement_timeout='15s'");
    const value=await state(c,options);await c.query('COMMIT');return value;
   }finally{await c.end();}
  }
  if(target&&!guardCA){await assert.rejects(exec(captureSQL()),/T19_PROVISIONING_IDENTITY_TLS_REFUSED/);await exec('ROLLBACK');}
  const protectedBefore=await fresh({protectedOnly:true});
  const manifest=JSON.parse(await readFile(new URL('../test-support/t19-operational-sql-pins.json',import.meta.url),'utf8'));
  assert.equal(manifest.version,1);assert.equal(manifest.purpose,'reviewed-operational-sql-sha256');
  assert.deepEqual(manifest.files.map(f=>f.path),['runtime','oauth','api'].map(s=>'database/t19-custody-'+s+'.sql'));
  for(const file of manifest.files){
   const stage=file.path.match(/t19-custody-(runtime|oauth|api)\.sql$/)[1];
   const sql=await readFile(new URL('../'+file.path,import.meta.url),'utf8');assert.equal(sha(sql),file.sha256);
   assert.equal((sql.match(/^begin;$/gim)||[]).length,1);assert.equal((sql.match(/^commit;$/gim)||[]).length,1);
   const before=await fresh();
   if(guardCA){
    let baseline;const listener=n=>{const m=n.message.match(/^T19_NATIVE_BASELINE_SHA256 ([a-f0-9]{64})$/);if(m)baseline=m[1];};
    engine.on('notice',listener);await exec(captureSQL());engine.removeListener('notice',listener);assert.match(baseline??'',/^[a-f0-9]{64}$/);
    const now=Date.now(),input={projectRef:'xdmfyrsauvqznkloroxg',stage,sql,baselineSha256:baseline,issuedAt:now,expiresAt:now+900000};
    const packet=rehearsalPackage(input,now);assert.equal(packet.commitAuthorized,false);
    await exec(packet.sql);assert.equal(await fresh(),before,stage+' guarded rehearsal changed baseline');
    await exec('ALTER TABLE public.business_invoices DISABLE TRIGGER invoices_audit');
    try{await assert.rejects(exec(packet.sql),/T19_BASELINE_CHANGED/);}finally{await exec('ROLLBACK');await exec('ALTER TABLE public.business_invoices ENABLE TRIGGER invoices_audit');}
    assert.equal(await fresh(),before);
    assert.equal((await scalar("SELECT tgenabled FROM pg_trigger WHERE tgrelid='public.business_invoices'::regclass AND tgname='invoices_audit'")).tgenabled,'O');
    const changed=rehearsalPackage({...input,baselineSha256:'0'.repeat(64)},now);await assert.rejects(exec(changed.sql),/T19_BASELINE_CHANGED/);await exec('ROLLBACK');assert.equal(await fresh(),before);
    const expired=rehearsalPackage({...input,issuedAt:now-10000,expiresAt:now-5000},now-6000);await assert.rejects(exec(expired.sql),/T19_PACKET_EXPIRED/);await exec('ROLLBACK');assert.equal(await fresh(),before);
    console.log('T19_GUARDED_'+stage.toUpperCase()+'_TLS_ROLLBACK_DRIFT_EXPIRY_PASS');
   }
   const failed=sql.replace(/^commit;\s*$/im,()=>"DO $$BEGIN RAISE EXCEPTION 'synthetic abort' USING ERRCODE='55000';END$$;\nCOMMIT;");
   await assert.rejects(exec(failed),e=>e.code==='55000'&&e.message==='synthetic abort');await exec('ROLLBACK');
   assert.equal(await fresh(),before,stage+' forced abort leaked state');
   if(guardCA&&stage==='runtime'){
    let baseline;const capture=n=>{const m=n.message.match(/^T19_NATIVE_BASELINE_SHA256 ([a-f0-9]{64})$/);if(m)baseline=m[1];};
    engine.on('notice',capture);await exec(captureSQL());engine.removeListener('notice',capture);
    const now=Date.now(),contractText=await readFile(new URL('../test-support/t19-runtime-contract-expected.json',import.meta.url),'utf8');
    const commit=runtimeCommitPackage({projectRef:'xdmfyrsauvqznkloroxg',stage:'runtime',sql,baselineSha256:baseline,issuedAt:now,expiresAt:now+900000,nonce:'a'.repeat(32),rehearsalEvidenceSha256:'b'.repeat(64)},contractText,now);
    for(const tamper of [
     "GRANT SELECT ON private_t19_custody.connections TO authenticated;",
     "GRANT t19_runtime_owner TO postgres WITH SET TRUE;",
     "ALTER TABLE private_t19_custody.machines ALTER COLUMN active SET DEFAULT true;",
     "UPDATE public.businesses SET name='synthetic forbidden drift';"
    ]){
     const damaged=commit.sql.replace('DO $t19_contract$',tamper+'\nDO $t19_contract$');
     await assert.rejects(exec(damaged),/T19_RUNTIME_EXACT_CONTRACT_MISMATCH|T19_PROTECTED_DATA_CHANGED/);await exec('ROLLBACK');assert.equal(await fresh(),before);
    }
    const committed=await exec(commit.sql);
    const expectedHash=committed.find(r=>r.rows?.[0]?.candidate_committed_baseline)?.rows[0].candidate_committed_baseline;
    assert.match(expectedHash??'',/^[a-f0-9]{64}$/);
    const reader=new Client({connectionString:target,ssl});await reader.connect();
    try{const after=await reader.query(commit.postCommitSQL);assert.equal(after.find(r=>r.rows?.[0]?.fresh_committed_baseline)?.rows[0].fresh_committed_baseline,expectedHash);}finally{await reader.end();}
    await assert.rejects(exec(commit.sql),/T19_STAGE_SEQUENCE_REFUSED|T19_BASELINE_CHANGED/);await exec('ROLLBACK');
    console.log('T19_RUNTIME_EXACT_COMMIT_TAMPER_AND_FRESH_TLS_PASS');
   }else await exec(sql);
   if(stage==='runtime')assert.deepEqual((await scalar(runtimeContractSQL)).contract,JSON.parse(await readFile(new URL('../test-support/t19-runtime-contract-expected.json',import.meta.url),'utf8')));
   assert.equal(await fresh({protectedOnly:true}),protectedBefore,stage+' changed protected rows/sequences');
   const committed=await fresh();
   await assert.rejects(exec(sql),{code:'55000'});await exec('ROLLBACK');
   assert.equal(await fresh(),committed,stage+' collision leaked state');
   assert.deepEqual(await scalar(`SELECT pg_has_role(current_user,'t19_runtime_owner','SET') AS can_set,
    has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE') AS can_create,
    has_schema_privilege('t19_runtime_owner','auth','USAGE') AS auth_usage`),{can_set:false,can_create:false,auth_usage:false});
   console.log('T19_FULL_MANAGED_'+stage.toUpperCase()+'_COMMIT_ROLLBACK_COLLISION_PASS');
  }
  const denied=async(sql)=>{await assert.rejects(exec(sql),{code:'42501'});};
  for(const role of ['anon','authenticated','service_role']){
   await exec('SET ROLE '+role);
   await denied('SELECT * FROM private_t19_custody.connections');
   await denied('SELECT * FROM vault.decrypted_secrets');
   await denied("SELECT private_t19_custody.runtime('pending','{}')");
   await denied("SELECT private_t19_custody.oauth('consume','{}')");
   await denied("SELECT private_t19_custody.revoke_grant('claim','{}')");
   await exec('RESET ROLE');
  }
  await exec("SET ROLE authenticated;SET request.jwt.claim.sub='"+id(2)+"'");
  const status=await query('SELECT public.t19_accounting_status($1) AS value',[id(20)]);
  assert.equal(status.rows[0].value.business_id,id(20));
  await assert.rejects(query('SELECT public.t19_accounting_status($1)',[id(10)]),{code:'42501'});
  await exec("SET request.jwt.claim.sub='"+id(3)+"'");
  await assert.rejects(query('SELECT public.t19_accounting_status($1)',[id(20)]),{code:'42501'});
  await exec('RESET ROLE;RESET request.jwt.claim.sub');
  const objects=await scalar(`SELECT
   (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r') AS tables,
   (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private_t19_custody' AND pg_get_userbyid(p.proowner)='t19_runtime_owner') AS owned_functions,
   (SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody' AND c.relkind='r') AS all_rls,
   (SELECT bool_and(NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls) FROM pg_roles WHERE rolname IN ('t19_runtime_owner','t19_hosted_custody')) AS restricted_roles`);
  assert.deepEqual(objects,{tables:10,owned_functions:11,all_rls:true,restricted_roles:true});
  for(const name of ['connections','operations','prepared_references','machines','machine_businesses','jobs','events','revocations','oauth_clients','oauth_states']){
   assert.equal((await scalar('SELECT count(*)::int AS n FROM private_t19_custody.'+quote(name))).n,0);
  }
  // The managed actor must never acquire fixture-admin authority. Use a
  // separate disposable admin connection for the existing privileged fixture handoff.
  if(guardCA){await engine.end();const admin=new URL(target);admin.username='t19_fixture_admin';engine=new Client({connectionString:admin.href,ssl});await engine.connect();}
  // Privileged fixture handoff only, not a claim of credentialed machine login.
  await exec('SET SESSION AUTHORIZATION t19_fixture_admin;SET SESSION AUTHORIZATION t19_hosted_custody');
  assert.equal((await query("SELECT private_t19_custody.runtime('machine',$1) AS value",[JSON.stringify({fingerprint:'a'.repeat(64)})])).rows[0].value,null);
  await denied('SELECT * FROM vault.decrypted_secrets');
  await denied('SELECT * FROM private_t19_custody.connections');
  await exec('SET SESSION AUTHORIZATION postgres');
  assert.equal(await fresh({protectedOnly:true}),protectedBefore);
  assert.equal((await scalar("SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ('t19_hosted_custody','t19_runtime_owner') AND rolcanlogin")).n,0);
  console.log('T19_FULL_MANAGED_OPERATIONAL_SQL_PASS');
 }finally{if(target)await engine.end();else await engine.close();}
});
