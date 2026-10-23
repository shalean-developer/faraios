import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const sql=await readFile(new URL('./t07-reset-restore-candidate.sql',import.meta.url),'utf8');
const names=['business_accounting_connections','business_catalogue','business_customers','business_invoices','business_memberships','business_quotes','business_settings','businesses','customer_addresses','identity_audit','one_off_bookings','quote_invoice_handoffs','recurring_schedules','staff_profiles','staff_teams'];
const fixture=`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA audit; CREATE TABLE audit.cleaner_reservations(id int); CREATE TABLE audit.events(id int);
CREATE SCHEMA auth; CREATE TABLE auth.users(id int primary key);
CREATE TABLE auth.sessions(id int primary key,user_id int references auth.users on delete cascade);
CREATE TABLE auth.refresh_tokens(id int,session_id int references auth.sessions on delete cascade);
CREATE TABLE auth.identities(id int,user_id int references auth.users on delete cascade);
CREATE TABLE auth.mfa_amr_claims(id int,session_id int references auth.sessions on delete cascade);
CREATE TABLE auth.schema_migrations(id int); CREATE TABLE auth.flow_state(id int);
CREATE SCHEMA storage; CREATE TABLE storage.objects(id int); CREATE TABLE storage.buckets(id int);
CREATE SCHEMA vault; CREATE TABLE vault.secrets(id int);
CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(id int);
INSERT INTO auth.users SELECT generate_series(1,3);
INSERT INTO auth.sessions SELECT n,1 FROM generate_series(1,59)n;
INSERT INTO auth.refresh_tokens SELECT n,n FROM generate_series(1,59)n;
INSERT INTO auth.identities SELECT n,n FROM generate_series(1,3)n;
INSERT INTO auth.mfa_amr_claims SELECT n,n FROM generate_series(1,59)n;
INSERT INTO auth.schema_migrations SELECT generate_series(1,82);
INSERT INTO supabase_migrations.schema_migrations SELECT generate_series(1,21);
${names.map(n=>`CREATE TABLE public.${n}(id int${n==='business_accounting_connections'?',enabled boolean,environment text':''});`).join('\n')}
${Object.entries({businesses:2,one_off_bookings:12,business_customers:3,business_quotes:3,business_invoices:2}).map(([n,c])=>`INSERT INTO public.${n} SELECT generate_series(1,${c});`).join('\n')}
INSERT INTO public.business_accounting_connections VALUES(1,false,'staging'),(2,false,'staging');
CREATE FUNCTION audit.fixture_trigger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
CREATE TRIGGER fixture_trigger BEFORE INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION audit.fixture_trigger();
CREATE FUNCTION public.fixture_default() RETURNS int LANGUAGE sql AS $$SELECT 1$$;
ALTER TABLE public.business_catalogue ALTER COLUMN id SET DEFAULT public.fixture_default();
`;
let passed=0;
async function run(name,{drift='',reject=false,source=sql}={}){
 const db=new PGlite(); await db.exec(fixture+drift);
 try{
  if(reject){await assert.rejects(db.exec('BEGIN;'+source+'COMMIT;'));await db.exec('ROLLBACK;');assert.equal((await db.query('SELECT count(*)::int n FROM public.one_off_bookings')).rows[0].n,12);assert.equal((await db.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,3);}
  else{await db.exec('BEGIN;'+source+'COMMIT;');assert.equal((await db.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int n FROM auth.sessions')).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int n FROM auth.refresh_tokens')).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int n FROM auth.schema_migrations')).rows[0].n,82);assert.equal((await db.query('SELECT count(*)::int n FROM public.t07_environment_guard')).rows[0].n,1);assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.t07_environment_guard','SELECT') AS permitted")).rows[0].permitted,false);assert.equal((await db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n,1);await assert.rejects(db.exec('BEGIN;'+source+'COMMIT;'));await db.exec('ROLLBACK;');}
  console.log('PASS '+name);passed++;
 } finally {await db.close();}
}
await run('reset clears reviewed test data, preserves managed schema history, denies clients and refuses replay');
await run('unknown public table aborts',{drift:'CREATE TABLE public.unknown(id int);',reject:true});
await run('changed Auth inventory aborts',{drift:'INSERT INTO auth.sessions VALUES(60,1);',reject:true});
await run('unknown Auth material aborts',{drift:'INSERT INTO auth.flow_state VALUES(1);',reject:true});
await run('nonempty Storage aborts',{drift:'INSERT INTO storage.objects VALUES(1);',reject:true});
await run('external dependent view is preserved and reset rolls back',{drift:'CREATE SCHEMA other;CREATE VIEW other.keep AS SELECT * FROM public.businesses;',reject:true});
await run('external user cascade is refused',{drift:'CREATE SCHEMA other;CREATE TABLE other.keep(id int references auth.users on delete cascade);INSERT INTO other.keep VALUES(1);',reject:true});
await run('Auth delete trigger is refused',{drift:'CREATE FUNCTION auth.keep() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN OLD;END$$;CREATE TRIGGER keep BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.keep();',reject:true});
await run('late postcheck failure rolls schema and account deletion back',{source:sql.replace("  IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM auth.sessions)","  IF true OR EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM auth.sessions)"),reject:true});
console.log(JSON.stringify({passed,failed:0,scope:'local synthetic PGlite; not hosted Supabase acceptance'}));
