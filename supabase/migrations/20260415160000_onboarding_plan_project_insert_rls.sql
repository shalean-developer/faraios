-- Onboarding: company plan + allow members to create project + activities

alter table public.companies
  add column if not exists plan text;

alter table public.projects
  alter column progress set default 10;

alter table public.projects
  alter column current_stage set default 'pending';

-- Ensure existing rows respect defaults on new inserts only; optional backfill skipped

grant insert on table public.projects to authenticated;
grant insert on table public.project_activities to authenticated;

drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member" on public.projects
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = projects.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_activities_insert_member" on public.project_activities;
create policy "project_activities_insert_member" on public.project_activities
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      join public.memberships m on m.company_id = p.company_id
      where p.id = project_activities.project_id
        and m.user_id = (select auth.uid())
    )
  );
