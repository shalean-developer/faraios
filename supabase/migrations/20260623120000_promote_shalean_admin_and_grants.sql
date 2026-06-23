-- Restore API access for service_role (required for admin server actions and scripts).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

-- Ensure public.users rows exist for auth accounts (required by memberships and related FKs).
insert into public.users (id, email, full_name)
select
  u.id,
  coalesce(nullif(trim(u.email), ''), u.id::text || '@users.local'),
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name);

-- Optional: promote admin@shalean.com when that auth user exists in THIS project.
-- Does not fail when the email is absent (no hardcoded UUID).
insert into public.platform_admins (user_id)
select u.id
from auth.users u
where lower(trim(u.email)) = lower('admin@shalean.com')
on conflict (user_id) do nothing;
