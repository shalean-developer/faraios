-- Restore API access for service_role (required for admin server actions and scripts).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

-- Promote admin@shalean.com (auth user id from Supabase Auth).
insert into public.platform_admins (user_id)
values ('81469321-eaff-4471-aa93-b655c6ff3806')
on conflict (user_id) do nothing;
