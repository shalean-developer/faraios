-- Client project tracking (per company)

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'review', 'completed')),
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  current_stage text,
  created_at timestamptz default now(),
  constraint projects_one_per_company unique (company_id)
);

create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  stage text not null
    check (stage in ('pending', 'in_progress', 'review', 'completed')),
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists project_activities_project_stage_idx
  on public.project_activities (project_id, stage);

alter table public.projects enable row level security;
alter table public.project_activities enable row level security;

-- Members of the company can read project + activities
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member" on public.projects
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = projects.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_activities_select_member" on public.project_activities;
create policy "project_activities_select_member" on public.project_activities
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      join public.memberships m on m.company_id = p.company_id
      where p.id = project_activities.project_id
        and m.user_id = (select auth.uid())
    )
  );

-- Platform admins may update pipeline (optional; aligns with companies admin)
grant update on table public.projects to authenticated;

drop policy if exists "projects_update_platform_admin" on public.projects;
create policy "projects_update_platform_admin" on public.projects
  for update to authenticated
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = (select auth.uid())
    )
  );

grant select on table public.projects to authenticated;
grant select on table public.project_activities to authenticated;
