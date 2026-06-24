-- Expand team invite/update roles to support V6 role model (manager, finance, marketing).

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

  if p_role not in ('admin', 'manager', 'staff', 'finance', 'marketing') then
    raise exception 'Invalid role. Choose admin, manager, staff, finance, or marketing.';
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

  if p_role not in ('admin', 'manager', 'staff', 'finance', 'marketing') then
    raise exception 'Invalid role. Choose admin, manager, staff, finance, or marketing.';
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

insert into public.permissions (key, label, category)
values ('view_websites', 'View websites', 'website')
on conflict (key) do nothing;
