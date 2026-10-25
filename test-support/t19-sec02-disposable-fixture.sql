-- T19 SEC-02 initial isolated privilege fixture. NEVER run against hosted DB.
-- Requires the existing test runner's independently-created disposable cluster.
\set ON_ERROR_STOP on
begin;
do $$
begin
 if current_database() <> 'faraios_t19_test'
    or current_user <> 't19_fixture'
    or current_setting('faraios.sec02',true) is distinct from 'synthetic'
 then raise exception 'SEC-02 disposable test context required';
 end if;
end $$;
-- Synthetic LOGIN principals authenticate in independent PostgreSQL sessions.
-- Passwords are disposable GitHub Actions fixture literals, never hosted secrets.
create role t19_web login password 'fake-web-only';
create role t19_invoice_worker login password 'fake-invoice-only';
create role t19_historical_publisher login password 'fake-historical-only';
create role t19_custody login password 'fake-custody-only';
create schema custody_test;
revoke all on schema custody_test from public;
create table custody_test.grants (
 operation_id uuid primary key,
 business_id uuid not null,
 connection_id uuid not null,
 generation integer not null check(generation>0),
 organization_id text not null,
 credential_version integer not null check(credential_version>0),
 synthetic_reference uuid not null,
 state text not null default 'prepared' check(state in ('prepared','published','disabled'))
);
revoke all on custody_test.grants from public;
create function custody_test.publish_prepared(op uuid, expected_reference uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 update custody_test.grants g set state='published'
 where g.operation_id=op and g.synthetic_reference=expected_reference
 and g.state='prepared';
 get diagnostics changed=row_count;
 return changed=1;
end $$;
revoke all on function custody_test.publish_prepared(uuid,uuid) from public;
grant usage on schema custody_test to t19_custody;
grant select,update on custody_test.grants to t19_custody;
grant execute on function custody_test.publish_prepared(uuid,uuid) to t19_custody;
-- Synthetic prepared grant; no real credential payload is stored.\ninsert into custody_test.grants (operation_id,business_id,connection_id,generation,organization_id,credential_version,synthetic_reference) values ('11111111-1111-4111-8111-111111111111','612be091-b1d7-4911-9c3b-143446a9fe27','22222222-2222-4222-8222-222222222222',1,'synthetic-shalean',1,'33333333-3333-4333-8333-333333333333');\n-- Never grant privileges to t19_web, t19_invoice_worker or t19_historical_publisher.
commit;
-- Test fixture is deliberately *not* production-complete: no live secrets,
-- machine auth, encryption, durable intent, disconnect or provider egress.
-- Existing A12/F2 probe is read-only and verifies only initial direct grants.
