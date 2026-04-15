-- PostgREST uses the `anon` / `authenticated` roles. Tables created in migrations
-- must grant schema usage and table privileges or queries fail with
-- "permission denied for schema public".

grant usage on schema public to anon, authenticated;

grant select on table public.industries to anon, authenticated;
grant select, insert on table public.companies to anon, authenticated;
