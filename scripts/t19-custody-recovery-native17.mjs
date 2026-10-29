// Explicit synthetic CI fixture only. No hosted destination or archive access.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {compareStructure} from './t19-custody-recovery-compare.mjs';
import {fullManagedGate,namespaceGate} from './t19-restore-plan.mjs';
import {sourceAdmissionSQL} from './t19-restore-host.mjs';

if(process.env.T19_SYNTHETIC_CATALOG_ONLY!=='yes'||process.env.PGHOST!=='127.0.0.1'||process.env.PGPORT!=='5432'||process.env.PGUSER!=='postgres'||!process.env.PGPASSWORD)
 throw Error('SYNTHETIC_NATIVE17_GATE_REFUSED');
const sql=await readFile(new URL('../docs/proposals/t19-inactive-custody-recovery.sql',import.meta.url),'utf8');
assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
const body=sql.slice(sql.indexOf('\nBEGIN;')+'\nBEGIN;'.length,sql.lastIndexOf('COMMIT;'));
const expected=JSON.parse(await readFile(new URL('../test-support/t19-custody-recovery-expected.json',import.meta.url),'utf8'));
// Native PG17 uses the historical projection without filtering constraints.
const projection=(await readFile(new URL('./restore-catalog.sql',import.meta.url),'utf8'))
 .replace("('managed',array['auth','storage']::text[])","('custody',array['private_t19_custody']::text[])")
 .replace("select jsonb_object_agg(scope,encode(extensions.digest(value::text,'sha256'),'hex')) as catalog from catalogs;","select value from catalogs where scope='custody';");
const client=new Client({host:'127.0.0.1',port:5432,user:'postgres',database:'postgres',password:process.env.PGPASSWORD,connectionTimeoutMillis:5000});
let begun=false;
try{
 await client.connect();
 const who=(await client.query("SELECT current_user AS u,current_database() AS d,current_setting('server_version_num')::int AS v")).rows[0];
 assert.equal(who.u,'postgres');assert.equal(who.d,'postgres');assert.ok(who.v>=170000&&who.v<180000);
 await client.query('BEGIN');begun=true;
 await client.query("CREATE ROLE fixture_admin SUPERUSER; SET SESSION AUTHORIZATION fixture_admin; ALTER ROLE postgres RENAME TO supabase_admin; CREATE ROLE postgres CREATEROLE BYPASSRLS; GRANT CREATE ON DATABASE postgres TO postgres; GRANT USAGE,CREATE ON SCHEMA public TO postgres; SET SESSION AUTHORIZATION postgres; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; SET LOCAL faraios.t19_restore_candidate='isolated-disposable-reviewed';");
 await client.query(body);
 const membership=(await client.query("SELECT pg_get_userbyid(grantor) AS grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid='t19_hosted_custody'::regrole AND member='postgres'::regrole")).rows;
 assert.deepEqual(membership,[{grantor:'supabase_admin',admin_option:true,inherit_option:false,set_option:false}]);
 await client.query("SET LOCAL search_path=''; SET LOCAL timezone='UTC';");
 const actual=(await client.query(projection)).rows[0].value;
 assert.equal(actual.constraints.length,13);
 assert.equal(compareStructure(actual,expected).status,'CUSTODY_STRUCTURE_MATCH');
 const nullable=structuredClone(actual);
 const column=nullable.columns.find(c=>c.table_name==='connections'&&c.column_name==='business_id');
 assert.equal(column.is_nullable,'NO');column.is_nullable='YES';
 assert.deepEqual(compareStructure(nullable,expected).differingComponents,['columns']);
 const changed=structuredClone(actual);changed.constraints[0][4]=false;
 assert.deepEqual(compareStructure(changed,expected).differingComponents,['constraints']);
 // Validate the new managed catalogue projection on native PG17, using only
 // empty scratch ledger tables inside this same rollback-only fixture.
 await client.query('CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE TABLE auth.schema_migrations(version text); CREATE TABLE storage.migrations(id int,name text,hash text);');
 const bootstrapProjection=await readFile(new URL('./t19-bootstrap-catalog.sql',import.meta.url),'utf8');
 // The fixture already has a transaction. Strip transaction control only;
 // READ ONLY is validated by the separate embedded execution test.
 const captureBody=bootstrapProjection.replace('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;','').replace(/COMMIT;\s*$/,'');
 const captured=(await client.query(captureBody)).find(r=>r.rows?.[0]?.jsonb_build_object)?.rows[0].jsonb_build_object;
 assert.equal(captured.schemaVersion,1);assert.equal(Object.keys(captured.catalog).length,12);assert.equal(Object.keys(captured.catalog.managed).length,17);
 console.log('T19_NATIVE_PG17_BOOTSTRAP_CAPTURE_SQL_PASS');
 // Compile/execute the full admission projection on native PG17. This fixture
 // deliberately removes only its TLS/runtime guard and transaction wrapper;
 // the production generated SQL keeps both. No hosted TLS claim is made.
 await client.query('CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;CREATE TABLE public.business_accounting_connections(enabled boolean);CREATE SCHEMA vault;CREATE TABLE vault.secrets(id integer);CREATE TABLE storage.buckets(id text);CREATE TABLE storage.objects(id text);');
 const sourceCapture=(await sourceAdmissionSQL()).replace('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;','').replace(/DO \$guard\$[\s\S]*?\$guard\$;/,'').replace(/COMMIT;\s*$/,'');
 const admission=(await client.query(sourceCapture)).find(r=>r.rows?.[0]?.jsonb_build_object)?.rows[0].jsonb_build_object;
 assert.equal(admission.sourceProject,'xdmfyrsauvqznkloroxg');assert.equal(admission.custodyReadback.roleConforms,true);assert.equal(admission.custodyReadback.membershipConforms,true);
 assert.equal(compareStructure(admission.custodyDefinition,expected).status,'CUSTODY_STRUCTURE_MATCH');
 assert.equal(admission.sourceState.enabledConnections,0);assert.equal(typeof admission.checkpointCatalog.application,'string');
 await client.query(fullManagedGate(admission.catalog,bootstrapProjection));
 await client.query('SAVEPOINT full_managed_negative');
 const componentWarnings=[];const onComponentNotice=n=>componentWarnings.push({code:n.code,message:n.message});client.on('notice',onComponentNotice);
 await assert.rejects(client.query(fullManagedGate({...admission.catalog,events:'different',roles:'different'},bootstrapProjection)),e=>e.code==='P1905'&&e.message==='RESTORE_FULL_MANAGED_MISMATCH');
 client.removeListener('notice',onComponentNotice);assert.deepEqual(componentWarnings,[{code:'P2002',message:'T19_MANAGED_COMPONENT_MISMATCH'},{code:'P2006',message:'T19_MANAGED_COMPONENT_MISMATCH'}]);
 await client.query('ROLLBACK TO SAVEPOINT full_managed_negative');
 const detailWarnings=[];const onDetailNotice=n=>detailWarnings.push(n.code);client.on('notice',onDetailNotice);
 await client.query('SAVEPOINT managed_detail_negative');
 await assert.rejects(client.query(fullManagedGate({...admission.catalog,managed:{...admission.catalog.managed,columns:'different'}},bootstrapProjection)),e=>e.code==='P1905');
 client.removeListener('notice',onDetailNotice);assert.deepEqual(detailWarnings,['P2001','P2101']);
 await client.query('ROLLBACK TO SAVEPOINT managed_detail_negative');
 const namespaces=(await client.query("SELECT nspname FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname<>'information_schema'")).rows.map(r=>r.nspname);
 await client.query(namespaceGate(namespaces));
 await client.query('SAVEPOINT namespace_negative;CREATE SCHEMA unexpected_fixture;');
 await assert.rejects(client.query(namespaceGate(namespaces)),/RESTORE_UNEXPECTED_NAMESPACE/);
 await client.query('ROLLBACK TO SAVEPOINT namespace_negative');
 await client.query('DROP TABLE public.business_accounting_connections;DROP TABLE storage.buckets,storage.objects;DROP SCHEMA vault CASCADE;DROP EXTENSION pgcrypto;DROP SCHEMA extensions;');
 console.log('T19_NATIVE_PG17_RESTORE_ADMISSION_SQL_PASS');

 // Execute the two exact historical vendor files in a minimal prerequisite
 // fixture, then prove the disabled-versioning constraint on native PG17.
 await client.query("SET LOCAL storage.install_roles='false';");
 await client.query(await readFile(new URL('../test-support/t19-storage-history/0002-storage-schema.sql',import.meta.url),'utf8'));
 await client.query("ALTER TABLE storage.buckets ADD COLUMN type text NOT NULL DEFAULT 'STANDARD';");
 await client.query(await readFile(new URL('../test-support/t19-storage-history/0062-object-versioning-core.sql',import.meta.url),'utf8'));
 await client.query("INSERT INTO storage.buckets(id,name) VALUES ('synthetic-history','synthetic-history'); SAVEPOINT t19_storage_history_denial;");
 let denied=false;
 try{await client.query("UPDATE storage.buckets SET versioning_status='ENABLED' WHERE id='synthetic-history';");}
 catch(e){denied=e.code==='23514';}
 await client.query('ROLLBACK TO SAVEPOINT t19_storage_history_denial');assert.equal(denied,true);
 assert.equal((await client.query("SELECT versioning_status FROM storage.buckets WHERE id='synthetic-history'")).rows[0].versioning_status,'DISABLED');
 console.log('T19_NATIVE_PG17_STORAGE_HISTORY_DARK_GUARD_PASS');

 // Run the unmodified vendor PG17 tenant dump as its bootstrap owner, never
 // against a hosted connection. The enclosing transaction removes every role,
 // grant and object, including the parameter ACL, at the end of this fixture.
 await client.query('SET SESSION AUTHORIZATION supabase_admin; CREATE ROLE dashboard_user; CREATE SCHEMA extensions;');
 await client.query(await readFile(new URL('../test-support/t19-realtime-bootstrap/tenant_db_dump_17.sql',import.meta.url),'utf8'));
 const realtime=(await client.query("SELECT (SELECT count(*)::int FROM realtime.schema_migrations) AS migrations,(SELECT max(version)::text FROM realtime.schema_migrations) AS last,(SELECT count(*)::int FROM realtime.messages) AS messages,(SELECT count(*)::int FROM realtime.subscription) AS subscriptions")).rows[0];
 assert.deepEqual(realtime,{migrations:91,last:'20261009120000',messages:0,subscriptions:0});
 const realtimeRole=(await client.query("SELECT rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconfig FROM pg_roles WHERE rolname='supabase_realtime_admin'")).rows[0];
 assert.deepEqual(realtimeRole,{rolsuper:false,rolinherit:false,rolcreaterole:false,rolcreatedb:false,rolcanlogin:false,rolreplication:false,rolbypassrls:false,rolconfig:['search_path=public, extensions, realtime']});
 const realtimeMemberships=(await client.query("SELECT pg_get_userbyid(roleid) AS role,pg_get_userbyid(grantor) AS grantor,admin_option,inherit_option,set_option FROM pg_auth_members WHERE member='supabase_realtime_admin'::regrole ORDER BY 1")).rows;
 assert.deepEqual(realtimeMemberships,['anon','authenticated','service_role'].map(role=>({role,grantor:'supabase_admin',admin_option:false,inherit_option:false,set_option:true})));
 const realtimeIndexes=(await client.query("SELECT c.relname,i.indisvalid,i.indisready FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='realtime' ORDER BY c.relname")).rows;
 assert.deepEqual(realtimeIndexes.map(r=>r.relname),['ix_realtime_subscription_entity','messages_inserted_at_topic_index','messages_pkey','pk_subscription','schema_migrations_pkey','subscription_subscription_id_entity_filters_action_filter_selec']);
 assert.ok(realtimeIndexes.every(r=>r.indisvalid&&r.indisready));
 assert.equal((await client.query("SELECT has_parameter_privilege('supabase_realtime_admin','log_min_messages','SET') AS allowed")).rows[0].allowed,true);
 console.log('T19_NATIVE_PG17_REALTIME_TENANT_BOOTSTRAP_PASS');

 await client.query(await readFile(new URL('../test-support/t19-bootstrap-helpers/overlay.sql',import.meta.url),'utf8'));
 const helpers=(await client.query("SELECT p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='extensions' ORDER BY p.proname")).rows;
 assert.equal(helpers.length,6);
 assert.ok(helpers.every(p=>p.owner==='supabase_admin'&&!p.prosecdef&&JSON.stringify(p.proconfig)===JSON.stringify(['search_path=""'])));
 assert.deepEqual((await client.query("SELECT rolconfig FROM pg_roles WHERE rolname='supabase_admin'")).rows[0].rolconfig,['search_path="$user", public, auth, extensions']);
 // Actually invoke the event helper, then inspect the generated nested function.
 await client.query("CREATE SCHEMA graphql_public; CREATE FUNCTION graphql_public.fixture_placeholder() RETURNS int LANGUAGE sql AS 'SELECT 1'; CREATE EVENT TRIGGER fixture_placeholder_hardening ON sql_drop WHEN TAG IN ('DROP FUNCTION') EXECUTE FUNCTION extensions.set_graphql_placeholder(); DROP FUNCTION graphql_public.fixture_placeholder();");
 const nested=(await client.query("SELECT p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='graphql_public' AND p.proname='graphql'")).rows;
 assert.deepEqual(nested,[{prosecdef:false,proconfig:['search_path=""']}]);
 const stub=(await client.query('SELECT graphql_public.graphql() AS value')).rows[0].value;
 assert.equal(stub.errors[0].message,'pg_graphql extension is not enabled.');
 console.log('T19_NATIVE_PG17_BOOTSTRAP_HELPER_HARDENING_PASS');

 await client.query("CREATE EXTENSION btree_gist WITH SCHEMA extensions VERSION '1.7';");
 const gist=(await client.query("SELECT e.extversion,n.nspname,pg_get_userbyid(e.extowner) AS owner FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='btree_gist'")).rows[0];
 assert.deepEqual(gist,{extversion:'1.7',nspname:'extensions',owner:'supabase_admin'});
 await client.query("SET LOCAL search_path=extensions,pg_catalog; CREATE TABLE extensions.fixture_gist(id integer,span int4range,EXCLUDE USING gist(id WITH =,span WITH &&)); INSERT INTO extensions.fixture_gist VALUES(1,int4range(1,4)); SAVEPOINT fixture_gist_denial;");
 let gistDenied=false;
 try{await client.query('INSERT INTO extensions.fixture_gist VALUES(1,int4range(2,5));');}catch(e){gistDenied=e.code==='23P01';}
 await client.query('ROLLBACK TO SAVEPOINT fixture_gist_denial');assert.equal(gistDenied,true);
 console.log('T19_NATIVE_PG17_BTREE_GIST_DEPENDENCY_PASS');

 // Stats initialization must precede the existing dashboard grants and normal
 // supabase_admin migration replay. No extension owner/catalogue repair.
 const statsSQL=await readFile(new URL('../test-support/t19-postgres-stat-owner/00-extension.sql',import.meta.url),'utf8');
 await client.query('ALTER ROLE postgres SUPERUSER; SET SESSION AUTHORIZATION postgres;');
 await client.query(statsSQL);
 const statsBefore=(await client.query("SELECT oid,extversion,pg_get_userbyid(extowner) AS owner FROM pg_extension WHERE extname='pg_stat_statements'")).rows[0];
 assert.equal(statsBefore.extversion,'1.11');assert.equal(statsBefore.owner,'postgres');
 // Exact grant forms from vendor post-setup and its extensions-perms migration.
 await client.query('GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO dashboard_user;');
 await client.query('SET SESSION AUTHORIZATION supabase_admin; ALTER ROLE postgres NOSUPERUSER;');
 await client.query(statsSQL);
 await client.query('GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA extensions TO postgres WITH GRANT OPTION;');
 const statsAfter=(await client.query("SELECT oid,extversion,pg_get_userbyid(extowner) AS owner FROM pg_extension WHERE extname='pg_stat_statements'")).rows[0];
 assert.deepEqual(statsAfter,statsBefore);
 const statsFunctions=(await client.query("SELECT p.proname,pg_get_userbyid(p.proowner) AS owner,has_function_privilege('dashboard_user',p.oid,'EXECUTE') AS dashboard,has_function_privilege('anon',p.oid,'EXECUTE') AS anon,EXISTS(SELECT FROM aclexplode(p.proacl) a WHERE a.grantee='dashboard_user'::regrole AND a.grantor='postgres'::regrole AND a.privilege_type='EXECUTE' AND NOT a.is_grantable) AS dashboard_grantor,EXISTS(SELECT FROM aclexplode(p.proacl) a WHERE a.grantee='postgres'::regrole AND a.grantor='postgres'::regrole AND a.privilege_type='EXECUTE' AND a.is_grantable) AS owner_grant_option FROM pg_extension e JOIN pg_depend d ON d.refobjid=e.oid AND d.refclassid='pg_extension'::regclass AND d.classid='pg_proc'::regclass AND d.deptype='e' JOIN pg_proc p ON p.oid=d.objid WHERE e.extname='pg_stat_statements' ORDER BY p.proname")).rows;
 assert.deepEqual(statsFunctions,['pg_stat_statements','pg_stat_statements_info','pg_stat_statements_reset'].map(proname=>({proname,owner:'postgres',dashboard:true,anon:proname!=='pg_stat_statements_reset',dashboard_grantor:true,owner_grant_option:true})));
 console.log('T19_NATIVE_PG17_STATS_OWNER_REPLAY_AND_PRIVILEGES_PASS');

 // Reproduce the two remaining captured managed metadata differences, then
 // execute the exact candidate overlay and verify its bounded effects.
 await client.query("DROP SCHEMA private_t19_custody CASCADE; CREATE ROLE supabase_storage_admin; CREATE ROLE pgbouncer; CREATE SCHEMA pgbouncer;");
 await client.query(await readFile(new URL('../test-support/t19-managed-final/get-auth-before.sql',import.meta.url),'utf8'));
 await client.query("REVOKE ALL ON FUNCTION pgbouncer.get_auth(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION pgbouncer.get_auth(text) TO pgbouncer; DELETE FROM storage.objects; DELETE FROM storage.buckets; ALTER TABLE storage.buckets OWNER TO supabase_storage_admin; ALTER TABLE storage.objects OWNER TO supabase_storage_admin; ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY; ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT ALL ON storage.buckets,storage.objects TO supabase_storage_admin; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.buckets,storage.objects TO anon; GRANT ALL ON storage.buckets,storage.objects TO service_role;");
 const aclSQL="SELECT c.relname,a.grantor::regrole::text AS grantor,a.grantee::regrole::text AS grantee,a.privilege_type,a.is_grantable FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE c.oid IN ('storage.buckets'::regclass,'storage.objects'::regclass) ORDER BY 1,2,3,4";
 const aclBefore=(await client.query(aclSQL)).rows;
 const finalOverlay=await readFile(new URL('../test-support/t19-managed-final/overlay.sql',import.meta.url),'utf8');
 await client.query("SAVEPOINT final_overlay_context;");
 let finalDenied=false;
 try{await client.query(finalOverlay);}catch(e){finalDenied=e.message.includes('T19_MANAGED_OVERLAY_CONTEXT');}
 await client.query('ROLLBACK TO SAVEPOINT final_overlay_context');assert.equal(finalDenied,true);
 await client.query("SET LOCAL faraios.t19_bootstrap='synthetic-only'; SAVEPOINT final_overlay_drift; ALTER FUNCTION pgbouncer.get_auth(text) RESET search_path;");
 let driftDenied=false;
 try{await client.query(finalOverlay);}catch(e){driftDenied=e.message.includes('T19_PGBOUNCER_INITIAL_STATE');}
 await client.query('ROLLBACK TO SAVEPOINT final_overlay_drift');assert.equal(driftDenied,true);
 assert.deepEqual((await client.query(aclSQL)).rows,aclBefore);
 await client.query(finalOverlay);
 assert.deepEqual((await client.query(aclSQL)).rows,aclBefore.map(x=>({...x,is_grantable:x.grantee==='supabase_storage_admin'?true:x.is_grantable})));
 const finalDef=(await client.query("SELECT pg_get_functiondef('pgbouncer.get_auth(text)'::regprocedure) AS value")).rows[0].value;
 assert.equal(finalDef,(await readFile(new URL('../test-support/t19-managed-final/get-auth-expected.sql',import.meta.url),'utf8')).slice(0,-2));
 assert.equal((await client.query("SELECT count(*)::int AS n FROM pgbouncer.get_auth('t19_missing_synthetic_login')")).rows[0].n,0);
 console.log('T19_NATIVE_PG17_FINAL_MANAGED_OVERLAY_PASS');


 await client.query('ROLLBACK');begun=false;
 await client.query('RESET SESSION AUTHORIZATION');
 const clean=(await client.query("SELECT to_regnamespace('private_t19_custody') IS NULL AND to_regnamespace('realtime') IS NULL AS absent, NOT EXISTS(SELECT FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','t19_hosted_custody','fixture_admin','supabase_admin','supabase_realtime_admin','dashboard_user')) AS roles_absent")).rows[0];
 assert.deepEqual(clean,{absent:true,roles_absent:true});
 console.log('T19_NATIVE_PG17_RECOVERY_CATALOG_PASS');
 console.log('T19_NATIVE_PG17_AUTOMATIC_BOOTSTRAP_GRANTOR_PASS');
 console.log('T19_NATIVE_PG17_NULLABILITY_AND_CONSTRAINT_DRIFT_REJECTED');
 console.log('T19_NATIVE_PG17_RECOVERY_FIXTURE_ROLLBACK_PASS');
}catch(e){
 console.error('T19_NATIVE_PG17_RECOVERY_CATALOG_FAIL');console.error('SYNTHETIC_FIXTURE_DIAGNOSTIC '+String(e.code??'ASSERT')+' '+String(e.message).split('\n')[0].slice(0,240));process.exitCode=1;
}finally{
 if(begun){try{await client.query('ROLLBACK');await client.query('RESET SESSION AUTHORIZATION');}catch{console.error('T19_NATIVE_PG17_ROLLBACK_UNKNOWN');process.exitCode=1;}}
 await client.end();
}
