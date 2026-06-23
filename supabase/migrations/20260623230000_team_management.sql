-- Team management: company members can list teammates; owners manage invites and roles.
-- Standalone-safe (includes is_platform_admin and helper functions).

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
$$;

grant execute on function public.current_auth_email() to authenticated, anon;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
  );
end;
$$;

grant execute on function public.is_company_member(uuid) to authenticated;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
      and coalesce(m.role, 'owner') = 'owner'
  );
end;
$$;

grant execute on function public.is_company_owner(uuid) to authenticated;

create or replace function public.company_has_members(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
  );
end;
$$;

grant execute on function public.company_has_members(uuid) to authenticated;

create or replace function public.membership_exists(
  p_company_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = p_user_id
  );
end;
$$;

grant execute on function public.membership_exists(uuid, uuid) to authenticated;

-- Normalize roles
update public.memberships
set role = 'owner'
where role is null;

do $$
begin
  alter table public.memberships
    add constraint memberships_role_check
    check (role in ('owner', 'admin', 'staff'));
exception
  when duplicate_object then null;
end $$;

-- Members can see teammates in the same company
drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_company" on public.memberships
  for select to authenticated
  using (
    public.is_company_member(company_id)
    or public.is_platform_admin()
  );

-- Owners invite existing FaraiOS users (admin or staff)
drop policy if exists "memberships_insert_first_owner" on public.memberships;
create policy "memberships_insert_first_owner" on public.memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce(role, 'owner') = 'owner'
    and not public.company_has_members(company_id)
    and exists (
      select 1
      from public.companies c
      where c.id = memberships.company_id
        and c.primary_contact_email is not null
        and public.current_auth_email() is not null
        and lower(c.primary_contact_email) = public.current_auth_email()
    )
  );

drop policy if exists "memberships_insert_team" on public.memberships;
create policy "memberships_insert_team" on public.memberships
  for insert to authenticated
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'staff')
    and not public.membership_exists(company_id, user_id)
  );

-- Owners update member roles (cannot promote to owner via app)
drop policy if exists "memberships_update_owner" on public.memberships;
create policy "memberships_update_owner" on public.memberships
  for update to authenticated
  using (public.is_company_owner(company_id))
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'staff')
    and user_id <> (select auth.uid())
  );

-- Owners remove members; members may leave (delete own row)
drop policy if exists "memberships_delete_own" on public.memberships;
drop policy if exists "memberships_delete_team" on public.memberships;
create policy "memberships_delete_team" on public.memberships
  for delete to authenticated
  using (
    (
      user_id = (select auth.uid())
      and coalesce(role, 'owner') <> 'owner'
    )
    or (
      public.is_company_owner(company_id)
      and user_id <> (select auth.uid())
      and coalesce(memberships.role, 'owner') <> 'owner'
    )
  );

grant update on table public.memberships to authenticated;
