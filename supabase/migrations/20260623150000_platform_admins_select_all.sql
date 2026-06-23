-- Platform admins can list all admin rows for the team management UI.
-- Uses is_platform_admin() to avoid RLS recursion on self-referential policies.

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

drop policy if exists "platform_admins_select_all_admins" on public.platform_admins;
create policy "platform_admins_select_all_admins" on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin());
