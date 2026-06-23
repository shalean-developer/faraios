-- Fix platform_admins insert/delete policies that still subquery platform_admins.
-- Safe to re-run after 20260623150000 (idempotent).

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

drop policy if exists "platform_admins_insert_admin" on public.platform_admins;
create policy "platform_admins_insert_admin" on public.platform_admins
  for insert to authenticated
  with check (public.is_platform_admin());

drop policy if exists "platform_admins_delete_admin" on public.platform_admins;
create policy "platform_admins_delete_admin" on public.platform_admins
  for delete to authenticated
  using (
    user_id <> (select auth.uid())
    and public.is_platform_admin()
  );
