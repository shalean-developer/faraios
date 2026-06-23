-- Replace platform_admins subqueries in admin read policies with is_platform_admin()
-- so policy checks do not re-enter platform_admins RLS.

drop policy if exists "projects_select_platform_admin" on public.projects;
create policy "projects_select_platform_admin" on public.projects
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "project_activities_select_platform_admin" on public.project_activities;
create policy "project_activities_select_platform_admin" on public.project_activities
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "memberships_select_platform_admin" on public.memberships;
create policy "memberships_select_platform_admin" on public.memberships
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "companies_select_scoped" on public.companies;
create policy "companies_select_scoped" on public.companies
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = companies.id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
    or (
      primary_contact_email is not null
      and public.current_auth_email() is not null
      and lower(primary_contact_email) = public.current_auth_email()
    )
  );

drop policy if exists "users_select_platform_admin" on public.users;
create policy "users_select_platform_admin" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "companies_update_platform_admin" on public.companies;
create policy "companies_update_platform_admin" on public.companies
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
