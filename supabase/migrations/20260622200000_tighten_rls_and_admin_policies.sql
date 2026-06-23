-- Tighten RLS: companies, memberships, websites, platform_admins.

-- ---------------------------------------------------------------------------
-- Companies: no anonymous access; members and platform admins can read.
-- Onboarding creators can read rows they own via primary_contact_email until
-- membership is created.
-- ---------------------------------------------------------------------------
revoke insert on table public.companies from anon;

drop policy if exists "companies_select_public" on public.companies;
drop policy if exists "companies_insert_public" on public.companies;

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
      and lower(primary_contact_email) = lower(
        coalesce((select email from auth.users where id = auth.uid()), '')
      )
    )
  );

create policy "companies_insert_authenticated" on public.companies
  for insert to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Memberships: first owner only, tied to company primary contact email.
-- ---------------------------------------------------------------------------
drop policy if exists "memberships_insert_own" on public.memberships;

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
        and lower(c.primary_contact_email) = lower(
          coalesce((select email from auth.users where id = auth.uid()), '')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Websites: public read for published sites only; members read their drafts.
-- ---------------------------------------------------------------------------
drop policy if exists "websites_select_public" on public.websites;

create policy "websites_select_published" on public.websites
  for select
  using (status = 'published');

create policy "websites_select_member" on public.websites
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = websites.client_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Platform admins: existing admins can add/remove others.
-- Seed the first admin via SQL / service role.
-- ---------------------------------------------------------------------------
grant insert, delete on table public.platform_admins to authenticated;

drop policy if exists "platform_admins_insert_admin" on public.platform_admins;
create policy "platform_admins_insert_admin" on public.platform_admins
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "platform_admins_delete_admin" on public.platform_admins;
create policy "platform_admins_delete_admin" on public.platform_admins
  for delete to authenticated
  using (
    user_id <> (select auth.uid())
    and exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );
