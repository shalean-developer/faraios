-- Allow platform admins to read projects, activities, and all memberships for admin UI.

drop policy if exists "projects_select_platform_admin" on public.projects;
create policy "projects_select_platform_admin" on public.projects
  for select to authenticated
  using (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_activities_select_platform_admin" on public.project_activities;
create policy "project_activities_select_platform_admin" on public.project_activities
  for select to authenticated
  using (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "memberships_select_platform_admin" on public.memberships;
create policy "memberships_select_platform_admin" on public.memberships
  for select to authenticated
  using (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );
