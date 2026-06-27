-- Platform admin workspace sessions for scoped business access.

create table if not exists public.platform_workspace_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  company_slug text not null,
  reason text not null,
  permissions_granted text[] not null default '{}'::text[],
  ip_address text,
  user_agent text,
  support_ticket_id uuid references public.platform_support_tickets (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_activity_at timestamptz not null default now(),
  actions_count integer not null default 0 check (actions_count >= 0)
);

create index if not exists platform_workspace_sessions_user_active_idx
  on public.platform_workspace_sessions (platform_user_id)
  where ended_at is null;

create index if not exists platform_workspace_sessions_company_idx
  on public.platform_workspace_sessions (company_id, started_at desc);

create index if not exists platform_workspace_sessions_started_idx
  on public.platform_workspace_sessions (started_at desc);

alter table public.platform_audit_logs
  add column if not exists company_id uuid references public.companies (id) on delete set null,
  add column if not exists session_id uuid references public.platform_workspace_sessions (id) on delete set null,
  add column if not exists ip_address text;

alter table public.platform_workspace_sessions enable row level security;

drop policy if exists "platform_workspace_sessions_select_admin" on public.platform_workspace_sessions;
create policy "platform_workspace_sessions_select_admin" on public.platform_workspace_sessions
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_workspace_sessions_insert_admin" on public.platform_workspace_sessions;
create policy "platform_workspace_sessions_insert_admin" on public.platform_workspace_sessions
  for insert to authenticated
  with check (
    public.is_platform_admin()
    and platform_user_id = (select auth.uid())
  );

drop policy if exists "platform_workspace_sessions_update_admin" on public.platform_workspace_sessions;
create policy "platform_workspace_sessions_update_admin" on public.platform_workspace_sessions
  for update to authenticated
  using (
    public.is_platform_admin()
    and platform_user_id = (select auth.uid())
  )
  with check (
    public.is_platform_admin()
    and platform_user_id = (select auth.uid())
  );

grant select, insert, update on table public.platform_workspace_sessions to authenticated;
