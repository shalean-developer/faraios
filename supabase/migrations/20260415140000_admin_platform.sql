-- Platform admins + company fields for internal admin dashboard

alter table public.companies
  add column if not exists assigned_developer text;

alter table public.companies
  add column if not exists primary_contact_name text;

alter table public.companies
  add column if not exists primary_contact_email text;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "platform_admins_select_self" on public.platform_admins;
create policy "platform_admins_select_self" on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.platform_admins to authenticated;

-- Pipeline updates (status, assignee, contacts) by platform admins only
grant update on table public.companies to authenticated;

drop policy if exists "companies_update_platform_admin" on public.companies;
create policy "companies_update_platform_admin" on public.companies
  for update to authenticated
  using (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );
