-- Platform monitoring: audit logs, cron runs, API logs, email logs.

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_idx
  on public.platform_audit_logs (created_at desc);

create table if not exists public.platform_cron_jobs (
  id text primary key,
  name text not null,
  schedule text not null,
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.platform_cron_jobs (id) on delete cascade,
  status text not null check (status in ('success', 'failed')),
  output jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  duration_ms integer not null default 0 check (duration_ms >= 0)
);

create index if not exists platform_cron_runs_job_idx
  on public.platform_cron_runs (job_id, started_at desc);

create table if not exists public.platform_api_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  method text not null,
  status_code integer not null,
  company_id uuid references public.companies (id) on delete set null,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  error_message text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists platform_api_logs_created_idx
  on public.platform_api_logs (created_at desc);
create index if not exists platform_api_logs_company_idx
  on public.platform_api_logs (company_id, created_at desc);

create table if not exists public.platform_email_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  template text,
  to_address text not null,
  subject text,
  status text not null check (status in ('sent', 'failed', 'queued')),
  company_id uuid references public.companies (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists platform_email_logs_created_idx
  on public.platform_email_logs (created_at desc);

insert into public.platform_cron_jobs (id, name, schedule, description)
values
  (
    'process-automations',
    'Process Automations',
    '*/5 * * * *',
    'Processes pending workflow automation jobs via /api/cron/process-automations'
  ),
  (
    'verify-domains',
    'Verify Domains',
    '*/15 * * * *',
    'Verifies custom domain DNS via Supabase Edge Function'
  )
on conflict (id) do update set
  name = excluded.name,
  schedule = excluded.schedule,
  description = excluded.description;

alter table public.platform_audit_logs enable row level security;
alter table public.platform_cron_jobs enable row level security;
alter table public.platform_cron_runs enable row level security;
alter table public.platform_api_logs enable row level security;
alter table public.platform_email_logs enable row level security;

drop policy if exists "platform_audit_logs_select_admin" on public.platform_audit_logs;
create policy "platform_audit_logs_select_admin" on public.platform_audit_logs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_cron_jobs_select_admin" on public.platform_cron_jobs;
create policy "platform_cron_jobs_select_admin" on public.platform_cron_jobs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_cron_runs_select_admin" on public.platform_cron_runs;
create policy "platform_cron_runs_select_admin" on public.platform_cron_runs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_api_logs_select_admin" on public.platform_api_logs;
create policy "platform_api_logs_select_admin" on public.platform_api_logs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_email_logs_select_admin" on public.platform_email_logs;
create policy "platform_email_logs_select_admin" on public.platform_email_logs
  for select to authenticated
  using (public.is_platform_admin());

grant select on table public.platform_audit_logs to authenticated;
grant select on table public.platform_cron_jobs to authenticated;
grant select on table public.platform_cron_runs to authenticated;
grant select on table public.platform_api_logs to authenticated;
grant select on table public.platform_email_logs to authenticated;
