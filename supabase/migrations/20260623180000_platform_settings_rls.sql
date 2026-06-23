-- platform_settings and admin_company_notes policies: use is_platform_admin().

drop policy if exists "platform_settings_select_admin" on public.platform_settings;
create policy "platform_settings_select_admin" on public.platform_settings
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_settings_update_admin" on public.platform_settings;
create policy "platform_settings_update_admin" on public.platform_settings
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "admin_company_notes_select_admin" on public.admin_company_notes;
create policy "admin_company_notes_select_admin" on public.admin_company_notes
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "admin_company_notes_insert_admin" on public.admin_company_notes;
create policy "admin_company_notes_insert_admin" on public.admin_company_notes
  for insert to authenticated
  with check (public.is_platform_admin());

grant insert on table public.platform_settings to authenticated;

drop policy if exists "platform_settings_insert_admin" on public.platform_settings;
create policy "platform_settings_insert_admin" on public.platform_settings
  for insert to authenticated
  with check (public.is_platform_admin());
