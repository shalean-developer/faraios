-- Staging-only Before User Created hook. No recipient is seeded in Git.
begin;
create table private_t31.registration_allowlist (
 email text primary key check(email=lower(btrim(email))),
 enabled boolean not null default false
);
alter table private_t31.registration_allowlist enable row level security;
revoke all on private_t31.registration_allowlist from public,anon,authenticated;
grant usage on schema private_t31 to supabase_auth_admin;
grant select on private_t31.registration_allowlist to supabase_auth_admin;
create policy auth_reads_registration_gate on private_t31.registration_allowlist
 for select to supabase_auth_admin using(true);
create function private_t31.before_user_created(event jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if event->'user'->>'email' is not null and exists(
 select 1 from private_t31.registration_allowlist
 where email=lower(event->'user'->>'email') and enabled)
 then return '{}'::jsonb; end if;
 return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Registration unavailable'));
end $$;
revoke all on function private_t31.before_user_created(jsonb) from public,anon,authenticated;
grant execute on function private_t31.before_user_created(jsonb) to supabase_auth_admin;
commit;
