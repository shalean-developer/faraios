// Restricted managed-Auth permission model; not a replacement for hosted acceptance.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GREENFIELD_T31_FILES} from '../src/t31-greenfield-manifest.js';

export async function installRestrictedGreenfield(db) {
 await db.query(`create role authenticated nologin; create role anon nologin;
 create role t31_fixture_auth_owner nologin;
 create role t31_fixture_installer nologin nosuperuser nobypassrls noinherit createrole;
 create schema auth authorization t31_fixture_auth_owner;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 alter table auth.users owner to t31_fixture_auth_owner;
 create function auth.uid() returns uuid language sql stable set search_path=''
 as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable set search_path=''
 as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 alter function auth.uid() owner to t31_fixture_auth_owner;
 alter function auth.jwt() owner to t31_fixture_auth_owner;
 revoke all on schema auth from public;
 grant usage on schema auth to authenticated,anon,t31_fixture_installer;
 grant select,references on auth.users to t31_fixture_installer;
 grant create,usage on schema public to t31_fixture_installer;
 grant create on database faraios_t31_greenfield_test to t31_fixture_installer;`);
 const managedObjects=async()=>(await db.query(`select c.relname,c.relowner::regrole::text owner,c.relacl::text acl
 from pg_class c where c.relnamespace='auth'::regnamespace order by c.relname`)).rows;
 const managedBefore=await managedObjects();
 const authBefore=(await db.query(`select nspowner::regrole::text owner,nspacl::text acl
 from pg_namespace where nspname='auth'`)).rows;
 // Unlike the first rehearsal, candidate SQL executes without superuser rights.
 await db.query('set role t31_fixture_installer');
 try {
  assert.equal((await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0].rolsuper,false);
  for(const path of GREENFIELD_T31_FILES)
   await db.query(await readFile(new URL('../'+path,import.meta.url),'utf8'));
 } catch(error) { await db.query('rollback'); throw error; }
 finally { await db.query('reset role'); }
 assert.deepEqual((await db.query(`select nspowner::regrole::text owner,nspacl::text acl
 from pg_namespace where nspname='auth'`)).rows,authBefore);
 assert.deepEqual(await managedObjects(),managedBefore);
 for(const role of ['t31_bootstrap','t31_invite_worker']) {
  const state=(await db.query(`select rolsuper,rolbypassrls,rolcanlogin,
   has_schema_privilege(rolname,'auth','usage') auth_usage,
   has_schema_privilege(rolname,'private_t31','create') schema_create,
   pg_has_role('t31_fixture_installer',oid,'set') installer_set,
   pg_has_role(oid,'authenticated','member') inherits_authenticated
   from pg_roles where rolname=$1`,[role])).rows[0];
  assert.deepEqual(state,{rolsuper:false,rolbypassrls:false,rolcanlogin:false,
   auth_usage:false,schema_create:false,installer_set:false,inherits_authenticated:false});
 }
 assert.equal((await db.query(`select proowner::regrole::text owner from pg_proc
 where oid='private_t31.t31_provision_business(text,uuid)'::regprocedure`)).rows[0].owner,'t31_bootstrap');
 assert.equal((await db.query(`select proowner::regrole::text owner from pg_proc
 where oid='private_t31.accept_invitation(uuid)'::regprocedure`)).rows[0].owner,'t31_invite_worker');
 console.log('T31_RESTRICTED_INSTALLER_AUTH_PRIVILEGES_PASS');
}
