-- Schedule domain DNS verification via Supabase Edge Function (pg_cron + pg_net).
-- Replaces the Vercel /api/cron/verify-domains route.
--
-- Prerequisites (one-time, in Supabase Dashboard → Project Settings → Vault):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
--
-- Deploy the edge function:
--   supabase functions deploy verify-domains

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Remove prior schedule if this migration is re-applied.
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'faraios-verify-domains' limit 1;
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end $$;

create or replace function public.invoke_verify_domains_edge_function()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url text;
  service_key text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if project_url is null or service_key is null then
    raise notice 'faraios-verify-domains: skipped — configure vault secrets project_url and service_role_key';
    return;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/verify-domains',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) into request_id;
end;
$$;

revoke all on function public.invoke_verify_domains_edge_function() from public;
grant execute on function public.invoke_verify_domains_edge_function() to postgres;

select cron.schedule(
  'faraios-verify-domains',
  '*/15 * * * *',
  $$ select public.invoke_verify_domains_edge_function(); $$
);
