-- Memberships RLS: policies must NOT read memberships (Postgres detects recursion
-- at plan time, even via security-definer helpers). Self-only SELECT; team ops via RPC.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
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

-- Internal read: bypasses RLS (used only inside other security-definer RPCs).
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
      and coalesce(m.role, 'owner') = 'owner'
  );
$$;

grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;

-- List teammates (RLS self-policy only returns the caller's row).
create or replace function public.list_company_members(p_company_id uuid)
returns table (
  id uuid,
  user_id uuid,
  company_id uuid,
  role text,
  created_at timestamptz,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_member(p_company_id) and not public.is_platform_admin() then
    return;
  end if;

  return query
  select
    m.id,
    m.user_id,
    m.company_id,
    m.role,
    m.created_at,
    u.email,
    u.full_name
  from public.memberships m
  left join public.users u on u.id = m.user_id
  where m.company_id = p_company_id
  order by m.created_at asc;
end;
$$;

grant execute on function public.list_company_members(uuid) to authenticated;

create or replace function public.invite_company_member(
  p_company_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_owner(p_company_id) and not public.is_platform_admin() then
    raise exception 'Only the workspace owner can invite team members.';
  end if;

  if p_role not in ('admin', 'staff') then
    raise exception 'Role must be admin or staff.';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'You are already a member of this workspace.';
  end if;

  if exists (
    select 1 from public.memberships m
    where m.company_id = p_company_id and m.user_id = p_user_id
  ) then
    raise exception 'This user is already on the team.';
  end if;

  insert into public.memberships (company_id, user_id, role)
  values (p_company_id, p_user_id, p_role);
end;
$$;

grant execute on function public.invite_company_member(uuid, uuid, text) to authenticated;

create or replace function public.update_company_member_role(
  p_company_id uuid,
  p_member_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_owner(p_company_id) and not public.is_platform_admin() then
    raise exception 'Only the workspace owner can change roles.';
  end if;

  if p_role not in ('admin', 'staff') then
    raise exception 'Role must be admin or staff.';
  end if;

  if p_member_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role here.';
  end if;

  update public.memberships
  set role = p_role
  where company_id = p_company_id
    and user_id = p_member_user_id
    and coalesce(role, 'owner') <> 'owner';
end;
$$;

grant execute on function public.update_company_member_role(uuid, uuid, text) to authenticated;

create or replace function public.remove_company_member(
  p_company_id uuid,
  p_member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_member_user_id = (select auth.uid()) then
    if exists (
      select 1 from public.memberships m
      where m.company_id = p_company_id
        and m.user_id = p_member_user_id
        and coalesce(m.role, 'owner') = 'owner'
    ) then
      raise exception 'The workspace owner cannot leave without transferring ownership.';
    end if;

    delete from public.memberships
    where company_id = p_company_id and user_id = p_member_user_id;
    return;
  end if;

  if not public.is_company_owner(p_company_id) and not public.is_platform_admin() then
    raise exception 'Only the workspace owner can remove team members.';
  end if;

  delete from public.memberships
  where company_id = p_company_id
    and user_id = p_member_user_id
    and coalesce(role, 'owner') <> 'owner';
end;
$$;

grant execute on function public.remove_company_member(uuid, uuid) to authenticated;

create or replace function public.create_owner_membership(p_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated.';
  end if;

  if exists (select 1 from public.memberships where user_id = uid) then
    raise exception 'You already have a workspace.';
  end if;

  if exists (select 1 from public.memberships where company_id = p_company_id) then
    raise exception 'This workspace already has members.';
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.primary_contact_email is not null
      and public.current_auth_email() is not null
      and lower(c.primary_contact_email) = public.current_auth_email()
  ) then
    raise exception 'You cannot claim this workspace.';
  end if;

  insert into public.memberships (company_id, user_id, role)
  values (p_company_id, uid, 'owner')
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_owner_membership(uuid) to authenticated;

drop policy if exists "companies_select_scoped" on public.companies;
create policy "companies_select_scoped" on public.companies
  for select to authenticated
  using (
    public.is_company_member(id)
    or public.is_platform_admin()
    or (
      primary_contact_email is not null
      and public.current_auth_email() is not null
      and lower(primary_contact_email) = public.current_auth_email()
    )
  );

-- ---------------------------------------------------------------------------
-- Non-recursive RLS (never subquery memberships from a memberships policy)
-- ---------------------------------------------------------------------------
drop policy if exists "memberships_select_own" on public.memberships;
drop policy if exists "memberships_select_company" on public.memberships;
drop policy if exists "memberships_select_platform_admin" on public.memberships;

create policy "memberships_select_self" on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "memberships_insert_own" on public.memberships;
drop policy if exists "memberships_insert_first_owner" on public.memberships;
drop policy if exists "memberships_insert_team" on public.memberships;

-- INSERT is via RPC only (create_owner_membership, invite_company_member).
-- See 20260624050000_fix_onboarding_membership.sql

drop policy if exists "memberships_update_owner" on public.memberships;
drop policy if exists "memberships_delete_own" on public.memberships;
drop policy if exists "memberships_delete_team" on public.memberships;

create policy "memberships_delete_self" on public.memberships
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and coalesce(role, 'owner') <> 'owner'
  );

-- One membership per user per company (safe without company_has_members check).
delete from public.memberships a
using public.memberships b
where a.company_id = b.company_id
  and a.user_id = b.user_id
  and a.ctid < b.ctid;

create unique index if not exists memberships_company_user_unique_idx
  on public.memberships (company_id, user_id);
