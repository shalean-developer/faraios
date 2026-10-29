// Explicit synthetic CI fixture only. No hosted destination or archive access.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {compareStructure} from './t19-custody-recovery-compare.mjs';

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

 await client.query('ROLLBACK');begun=false;
 await client.query('RESET SESSION AUTHORIZATION');
 const clean=(await client.query("SELECT to_regnamespace('private_t19_custody') IS NULL AND to_regnamespace('realtime') IS NULL AS absent, NOT EXISTS(SELECT FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','t19_hosted_custody','fixture_admin','supabase_admin','supabase_realtime_admin','dashboard_user')) AS roles_absent")).rows[0];
 assert.deepEqual(clean,{absent:true,roles_absent:true});
 console.log('T19_NATIVE_PG17_RECOVERY_CATALOG_PASS');
 console.log('T19_NATIVE_PG17_AUTOMATIC_BOOTSTRAP_GRANTOR_PASS');
 console.log('T19_NATIVE_PG17_NULLABILITY_AND_CONSTRAINT_DRIFT_REJECTED');
 console.log('T19_NATIVE_PG17_RECOVERY_FIXTURE_ROLLBACK_PASS');
}catch{
 console.error('T19_NATIVE_PG17_RECOVERY_CATALOG_FAIL');process.exitCode=1;
}finally{
 if(begun){try{await client.query('ROLLBACK');await client.query('RESET SESSION AUTHORIZATION');}catch{console.error('T19_NATIVE_PG17_ROLLBACK_UNKNOWN');process.exitCode=1;}}
 await client.end();
}
