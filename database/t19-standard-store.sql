-- REVIEW CANDIDATE ONLY. Not a deployed migration. Preserve all custody objects.
-- Apply only in a transaction after exact-role/hosting review and approval.
begin;
create schema private_t19_standard;
revoke all on schema private_t19_standard from public,anon,authenticated,service_role;
create table private_t19_standard.connections (
 environment text not null check(environment in ('staging','production')),
 business_id uuid not null references public.businesses(id),
 connection_id uuid not null unique,generation integer not null check(generation>0),
 organization_id text not null check(organization_id ~ '^[0-9]{1,30}$'),
 api_domain text not null,client_id text not null,
 status text not null check(status in ('connected','revocation_pending','disconnected')),
 envelope jsonb,organization jsonb,
 primary key(environment,business_id),unique(environment,api_domain,organization_id),
 check((status='disconnected')=(envelope is null))
);
create table private_t19_standard.oauth_states (
 digest text primary key,session_digest text not null,actor uuid not null,
 business_id uuid not null references public.businesses(id),environment text not null,
 organization_id text not null,expires_at bigint not null,consumed boolean not null default false,resolved boolean not null default false
);
create unique index standard_one_oauth_pending on private_t19_standard.oauth_states(environment,business_id) where not resolved;
alter table private_t19_standard.connections enable row level security;
alter table private_t19_standard.oauth_states enable row level security;
revoke all on all tables in schema private_t19_standard from public,anon,authenticated,service_role;
-- No runtime grant here: determine the actual restricted backend LOGIN and its
-- environment scope before preparing that separately reviewable deployment delta.
commit;
