-- Fix RLS policies that queried auth.users directly (permission denied for
-- authenticated role). Use JWT email via a small helper instead.

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
$$;

grant execute on function public.current_auth_email() to authenticated, anon;

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
    or exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
    or (
      primary_contact_email is not null
      and public.current_auth_email() is not null
      and lower(primary_contact_email) = public.current_auth_email()
    )
  );

drop policy if exists "memberships_insert_first_owner" on public.memberships;
create policy "memberships_insert_first_owner" on public.memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce(role, 'owner') = 'owner'
    and not exists (
      select 1
      from public.memberships m
      where m.company_id = memberships.company_id
    )
    and exists (
      select 1
      from public.companies c
      where c.id = memberships.company_id
        and c.primary_contact_email is not null
        and public.current_auth_email() is not null
        and lower(c.primary_contact_email) = public.current_auth_email()
    )
  );

-- Platform admins need to look up users by email in the admin UI.
drop policy if exists "users_select_platform_admin" on public.users;
create policy "users_select_platform_admin" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );
