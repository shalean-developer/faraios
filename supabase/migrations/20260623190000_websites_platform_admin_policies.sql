-- Platform admins can create and manage websites for any client company.

drop policy if exists "websites_select_member" on public.websites;
create policy "websites_select_member" on public.websites
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = websites.client_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "websites_manage_platform_admin" on public.websites;
create policy "websites_manage_platform_admin" on public.websites
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "website_content_manage_platform_admin" on public.website_content;
create policy "website_content_manage_platform_admin" on public.website_content
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
