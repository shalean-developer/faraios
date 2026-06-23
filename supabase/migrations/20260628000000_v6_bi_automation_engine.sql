-- FaraiOS V6 — Business Intelligence, Automation & Customer Experience Engine
-- Permissions, workflows, tasks, notifications, staff profiles, retention, audit logs.

-- ---------------------------------------------------------------------------
-- Extend membership roles
-- ---------------------------------------------------------------------------
alter table public.memberships drop constraint if exists memberships_role_check;

alter table public.memberships
  add constraint memberships_role_check
  check (role in ('owner', 'admin', 'manager', 'staff', 'finance', 'marketing'));

-- ---------------------------------------------------------------------------
-- Permissions (system-wide definitions)
-- ---------------------------------------------------------------------------
create table if not exists public.permissions (
  key text primary key,
  label text not null,
  category text not null default 'general'
);

insert into public.permissions (key, label, category) values
  ('view_bookings', 'Can View Bookings', 'operations'),
  ('edit_bookings', 'Can Edit Bookings', 'operations'),
  ('view_revenue', 'Can View Revenue', 'finance'),
  ('create_invoices', 'Can Create Invoices', 'finance'),
  ('manage_staff', 'Can Manage Staff', 'team'),
  ('manage_marketing', 'Can Manage Marketing', 'growth'),
  ('manage_settings', 'Can Manage Settings', 'settings'),
  ('view_customers', 'Can View Customers', 'operations'),
  ('edit_customers', 'Can Edit Customers', 'operations'),
  ('view_reports', 'Can View Reports', 'finance'),
  ('manage_automations', 'Can Manage Automations', 'automation'),
  ('view_tasks', 'Can View Tasks', 'operations'),
  ('manage_tasks', 'Can Manage Tasks', 'operations'),
  ('view_ai_insights', 'Can View AI Insights', 'intelligence')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Role permissions (per company, per role)
-- ---------------------------------------------------------------------------
create table if not exists public.role_permissions (
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (company_id, role, permission_key)
);

create index if not exists role_permissions_company_role_idx
  on public.role_permissions (company_id, role);

-- ---------------------------------------------------------------------------
-- Custom company roles
-- ---------------------------------------------------------------------------
create table if not exists public.company_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  role_key text not null,
  label text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, role_key)
);

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  skills text[] not null default '{}',
  availability jsonb not null default '{}'::jsonb,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists staff_profiles_company_idx
  on public.staff_profiles (company_id);

-- ---------------------------------------------------------------------------
-- Workflows
-- ---------------------------------------------------------------------------
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.workflows
    add constraint workflows_trigger_type_check
    check (trigger_type in (
      'booking_created', 'booking_confirmed', 'booking_completed',
      'booking_cancelled', 'quote_accepted', 'invoice_paid',
      'customer_created', 'review_submitted', 'lead_created'
    ));
exception
  when duplicate_object then null;
end $$;

create index if not exists workflows_company_enabled_idx
  on public.workflows (company_id, enabled);

-- ---------------------------------------------------------------------------
-- Workflow runs
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  trigger_entity_type text,
  trigger_entity_id uuid,
  status text not null default 'pending',
  current_step_index int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text
);

do $$
begin
  alter table public.workflow_runs
    add constraint workflow_runs_status_check
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists workflow_runs_company_idx
  on public.workflow_runs (company_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Automation jobs (delayed steps)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs (id) on delete cascade,
  step_index int not null,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  executed_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.automation_jobs
    add constraint automation_jobs_status_check
    check (status in ('pending', 'completed', 'failed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists automation_jobs_pending_idx
  on public.automation_jobs (status, scheduled_for)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Internal tasks
-- ---------------------------------------------------------------------------
create table if not exists public.company_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users (id) on delete set null,
  status text not null default 'open',
  priority text not null default 'medium',
  due_date date,
  source_type text,
  source_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.company_tasks
    add constraint company_tasks_status_check
    check (status in ('open', 'in_progress', 'done', 'cancelled'));
  alter table public.company_tasks
    add constraint company_tasks_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent'));
exception
  when duplicate_object then null;
end $$;

create index if not exists company_tasks_company_status_idx
  on public.company_tasks (company_id, status);

-- ---------------------------------------------------------------------------
-- Customer tags (extend customers)
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists tags text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Customer segments
-- ---------------------------------------------------------------------------
create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  segment_type text not null,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.customer_segments
    add constraint customer_segments_type_check
    check (segment_type in (
      'high_value', 'repeat', 'inactive', 'new', 'custom'
    ));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Retention campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.retention_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  campaign_type text not null,
  segment_id uuid references public.customer_segments (id) on delete set null,
  message_template text,
  enabled boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.retention_campaigns
    add constraint retention_campaigns_type_check
    check (campaign_type in ('win_back', 'service_reminder', 'seasonal', 'loyalty'));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Unified notifications
-- ---------------------------------------------------------------------------
create table if not exists public.company_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists company_notifications_user_idx
  on public.company_notifications (company_id, user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- Company activity logs (unified audit)
-- ---------------------------------------------------------------------------
create table if not exists public.company_activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists company_activity_logs_company_idx
  on public.company_activity_logs (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Portal booking requests (reschedule/cancel)
-- ---------------------------------------------------------------------------
create table if not exists public.portal_booking_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  request_type text not null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.portal_booking_requests
    add constraint portal_booking_requests_type_check
    check (request_type in ('reschedule', 'cancel'));
  alter table public.portal_booking_requests
    add constraint portal_booking_requests_status_check
    check (status in ('pending', 'approved', 'declined'));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.company_roles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.company_tasks enable row level security;
alter table public.customer_segments enable row level security;
alter table public.retention_campaigns enable row level security;
alter table public.company_notifications enable row level security;
alter table public.company_activity_logs enable row level security;
alter table public.portal_booking_requests enable row level security;

-- Permissions: readable by all authenticated
drop policy if exists "permissions_select_all" on public.permissions;
create policy "permissions_select_all" on public.permissions
  for select to authenticated using (true);

-- Role permissions: company members
drop policy if exists "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select" on public.role_permissions
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "role_permissions_manage" on public.role_permissions;
create policy "role_permissions_manage" on public.role_permissions
  for all to authenticated
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- Company roles
drop policy if exists "company_roles_select" on public.company_roles;
create policy "company_roles_select" on public.company_roles
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "company_roles_manage" on public.company_roles;
create policy "company_roles_manage" on public.company_roles
  for all to authenticated
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- Staff profiles
drop policy if exists "staff_profiles_select" on public.staff_profiles;
create policy "staff_profiles_select" on public.staff_profiles
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "staff_profiles_manage" on public.staff_profiles;
create policy "staff_profiles_manage" on public.staff_profiles
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Workflows
drop policy if exists "workflows_select" on public.workflows;
create policy "workflows_select" on public.workflows
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "workflows_manage" on public.workflows;
create policy "workflows_manage" on public.workflows
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Workflow runs
drop policy if exists "workflow_runs_select" on public.workflow_runs;
create policy "workflow_runs_select" on public.workflow_runs
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "workflow_runs_insert" on public.workflow_runs;
create policy "workflow_runs_insert" on public.workflow_runs
  for insert to authenticated
  with check (public.is_company_member(company_id));

-- Automation jobs
drop policy if exists "automation_jobs_select" on public.automation_jobs;
create policy "automation_jobs_select" on public.automation_jobs
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

-- Tasks
drop policy if exists "company_tasks_select" on public.company_tasks;
create policy "company_tasks_select" on public.company_tasks
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "company_tasks_manage" on public.company_tasks;
create policy "company_tasks_manage" on public.company_tasks
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Customer segments
drop policy if exists "customer_segments_select" on public.customer_segments;
create policy "customer_segments_select" on public.customer_segments
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "customer_segments_manage" on public.customer_segments;
create policy "customer_segments_manage" on public.customer_segments
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Retention campaigns
drop policy if exists "retention_campaigns_select" on public.retention_campaigns;
create policy "retention_campaigns_select" on public.retention_campaigns
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "retention_campaigns_manage" on public.retention_campaigns;
create policy "retention_campaigns_manage" on public.retention_campaigns
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Notifications
drop policy if exists "company_notifications_select" on public.company_notifications;
create policy "company_notifications_select" on public.company_notifications
  for select to authenticated
  using (
    public.is_company_member(company_id)
    and (user_id is null or user_id = (select auth.uid()))
  );

drop policy if exists "company_notifications_update" on public.company_notifications;
create policy "company_notifications_update" on public.company_notifications
  for update to authenticated
  using (
    public.is_company_member(company_id)
    and (user_id is null or user_id = (select auth.uid()))
  );

-- Activity logs
drop policy if exists "company_activity_logs_select" on public.company_activity_logs;
create policy "company_activity_logs_select" on public.company_activity_logs
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "company_activity_logs_insert" on public.company_activity_logs;
create policy "company_activity_logs_insert" on public.company_activity_logs
  for insert to authenticated
  with check (public.is_company_member(company_id));

-- Portal booking requests (service role only for insert from portal API)
drop policy if exists "portal_booking_requests_select" on public.portal_booking_requests;
create policy "portal_booking_requests_select" on public.portal_booking_requests
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed default role permissions function
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_role_permissions(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owner: all permissions
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'owner', key from public.permissions
  on conflict do nothing;

  -- Admin: all except manage_settings
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'admin', key from public.permissions
  where key <> 'manage_settings'
  on conflict do nothing;

  -- Manager: operations + team view
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'manager', unnest(array[
    'view_bookings', 'edit_bookings', 'view_customers', 'edit_customers',
    'view_tasks', 'manage_tasks', 'view_reports', 'view_ai_insights'
  ])
  on conflict do nothing;

  -- Staff: basic operations
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'staff', unnest(array[
    'view_bookings', 'edit_bookings', 'view_customers', 'view_tasks'
  ])
  on conflict do nothing;

  -- Finance
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'finance', unnest(array[
    'view_revenue', 'create_invoices', 'view_reports', 'view_customers'
  ])
  on conflict do nothing;

  -- Marketing
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'marketing', unnest(array[
    'manage_marketing', 'view_customers', 'view_reports', 'view_ai_insights'
  ])
  on conflict do nothing;
end;
$$;

grant execute on function public.seed_default_role_permissions(uuid) to authenticated;

-- Allow new roles in team management policies
drop policy if exists "memberships_insert_team" on public.memberships;
create policy "memberships_insert_team" on public.memberships
  for insert to authenticated
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'manager', 'staff', 'finance', 'marketing')
    and not public.membership_exists(company_id, user_id)
  );

drop policy if exists "memberships_update_owner" on public.memberships;
create policy "memberships_update_owner" on public.memberships
  for update to authenticated
  using (public.is_company_owner(company_id))
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'manager', 'staff', 'finance', 'marketing')
    and user_id <> (select auth.uid())
  );
do $$
declare
  r record;
begin
  for r in select id from public.companies loop
    perform public.seed_default_role_permissions(r.id);
  end loop;
end $$;
