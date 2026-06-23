-- Onboarding membership: bypass RLS cycle (memberships INSERT → companies → memberships).
-- Use security-definer RPC; remove recursive INSERT policy.

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

grant execute on function public.is_company_member(uuid) to authenticated;

-- Break companies_select_scoped → memberships inline subquery cycle.
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

-- Onboarding: create first owner membership (bypasses memberships RLS).
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

-- Direct INSERT caused policy recursion; team invites use invite_company_member RPC.
drop policy if exists "memberships_insert_own" on public.memberships;
drop policy if exists "memberships_insert_first_owner" on public.memberships;
drop policy if exists "memberships_insert_team" on public.memberships;
