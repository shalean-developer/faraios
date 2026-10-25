-- T19 A12/F2: disposable-only READ-ONLY privilege probe TEMPLATE.
-- Not a migration and NOT a security pass. Execute ONLY inside a separate
-- faraios_t19_test disposable PostgreSQL cluster created by the T19 runner.
-- These checks assume distinct principals have already been created by a
-- separately approved SEC-02 fixture. If absent, fail loudly; never PASS.
-- Do not point psql at Supabase, staging, production or a real Vault.
\set ON_ERROR_STOP on
begin read only;
do $guard$
begin
 if current_database() <> 'faraios_t19_test'
    or current_setting('faraios.a12_f2', true) is distinct from 'synthetic'
 then raise exception 'A12/F2 probe requires disposable synthetic database';
 end if;
 if to_regclass('custody_test.grants') is null
    or to_regprocedure('custody_test.publish_prepared(uuid,uuid)') is null
 then raise exception 'SEC-02 custody fixture absent: no privilege PASS possible';
 end if;
 if exists (
   select 1 from (values ('t19_web'),('t19_invoice_worker'),
     ('t19_historical_publisher'),('t19_custody')) as p(role_name)
   where not exists(select 1 from pg_roles where rolname=p.role_name)
 ) then raise exception 'SEC-02 test principals absent: no privilege PASS possible';
 end if;
end $guard$;
-- These introspection assertions supplement, never replace, hostile attempts
-- logged in distinct authenticated PostgreSQL sessions.
do $checks$
declare role_name text;
begin
 foreach role_name in array array[
   't19_web','t19_invoice_worker','t19_historical_publisher'
 ] loop
   if has_table_privilege(role_name,'custody_test.grants','SELECT')
      or has_table_privilege(role_name,'custody_test.grants','INSERT')
      or has_table_privilege(role_name,'custody_test.grants','UPDATE')
      or has_table_privilege(role_name,'custody_test.grants','DELETE')
      or has_function_privilege(role_name,
        'custody_test.publish_prepared(uuid,uuid)','EXECUTE')
   then raise exception 'A12/F2 forbidden direct grant for %', role_name;
   end if;
 end loop;
 if not has_function_privilege('t19_custody',
      'custody_test.publish_prepared(uuid,uuid)','EXECUTE')
 then raise exception 'Missing permitted custody control';
 end if;
end $checks$;
rollback;
-- No test-pass marker: requires hostile-session, indirect-function and state
-- invariance probes in SEC-02, including privilege inheritance and SET ROLE.
