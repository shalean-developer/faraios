-- FaraiOS: run this ONCE on a fresh Supabase database.
-- Applies all migrations in timestamp order.



-- =============================================================================
-- 20260415120000_init_faraios.sql
-- =============================================================================

-- FaraiOS core schema

-- INDUSTRIES
create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text
);

-- COMPANIES (TENANTS)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  industry_id uuid references public.industries (id) on delete set null,
  created_at timestamptz default now()
);

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

-- MEMBERSHIPS
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  role text default 'owner',
  created_at timestamptz default now()
);

-- BOOKINGS
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  customer_name text,
  service text,
  date timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Repair pre-existing bookings tables created without FaraiOS columns.
alter table public.bookings
  add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.bookings
  add column if not exists customer_name text;
alter table public.bookings
  add column if not exists service text;
alter table public.bookings
  add column if not exists date timestamptz;
alter table public.bookings
  add column if not exists status text default 'pending';
alter table public.bookings
  add column if not exists created_at timestamptz default now();

-- Seed industries
insert into public.industries (name, slug, description) values
  ('Cleaning Services', 'cleaning', 'Cleaning businesses'),
  ('Construction & Painting', 'construction', 'Construction and painting'),
  ('Beauty & Wellness', 'beauty', 'Spa and wellness'),
  ('Tourism & Travel', 'tourism', 'Tours and travel'),
  ('Electrical Services', 'electrical', 'Electrical services')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- RLS (allow anon read/insert for industries & companies â€” tighten for production)
-- ---------------------------------------------------------------------------
alter table public.industries enable row level security;
alter table public.companies enable row level security;

drop policy if exists "industries_select_public" on public.industries;
create policy "industries_select_public" on public.industries
  for select using (true);

drop policy if exists "companies_select_public" on public.companies;
create policy "companies_select_public" on public.companies
  for select using (true);

drop policy if exists "companies_insert_public" on public.companies;
create policy "companies_insert_public" on public.companies
  for insert with check (true);

-- =============================================================================
-- 20260415120001_grant_api_roles_public.sql
-- =============================================================================

-- PostgREST uses the `anon` / `authenticated` roles. Tables created in migrations
-- must grant schema usage and table privileges or queries fail with
-- "permission denied for schema public".

grant usage on schema public to anon, authenticated;

grant select on table public.industries to anon, authenticated;
grant select, insert on table public.companies to anon, authenticated;

-- =============================================================================
-- 20260415120002_bookings_schema_repair.sql
-- =============================================================================

-- Run this in Supabase SQL editor if migrations fail with "bookings.company_id does not exist".
-- Safe to re-run. Ensures the bookings table matches FaraiOS expectations.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  industry_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  customer_name text,
  service text,
  date timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.bookings
  add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.bookings
  add column if not exists customer_name text;
alter table public.bookings
  add column if not exists service text;
alter table public.bookings
  add column if not exists date timestamptz;
alter table public.bookings
  add column if not exists status text default 'pending';
alter table public.bookings
  add column if not exists created_at timestamptz default now();
alter table public.bookings
  add column if not exists booking_date timestamptz;
alter table public.bookings
  add column if not exists customer_email text;
alter table public.bookings
  add column if not exists customer_phone text;
alter table public.bookings
  add column if not exists source text not null default 'internal';

-- =============================================================================
-- 20260415130000_dashboard_memberships_auth.sql
-- =============================================================================

-- Client dashboard: tie memberships to Supabase Auth, company lifecycle fields, RLS.

-- Company flags (active site = published)
alter table public.companies
  add column if not exists is_published boolean not null default false;

alter table public.companies
  add column if not exists build_status text not null default 'pending';

do $$
begin
  alter table public.companies
    add constraint companies_build_status_check
    check (build_status in ('pending', 'in-progress', 'review', 'completed'));
exception
  when duplicate_object then null;
end $$;

-- Memberships reference logged-in users (auth.users), not public.users
alter table public.memberships
  drop constraint if exists memberships_user_id_fkey;

alter table public.memberships
  add constraint memberships_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade;

alter table public.memberships enable row level security;

drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "memberships_insert_own" on public.memberships;
create policy "memberships_insert_own" on public.memberships
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "memberships_delete_own" on public.memberships;
create policy "memberships_delete_own" on public.memberships
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on table public.memberships to authenticated;

-- Bookings: readable by company members (payments/analytics hooks later)
alter table public.bookings enable row level security;

drop policy if exists "bookings_select_member" on public.bookings;
create policy "bookings_select_member" on public.bookings
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = bookings.company_id
        and m.user_id = (select auth.uid())
    )
  );

grant select on table public.bookings to authenticated;

-- =============================================================================
-- 20260415140000_admin_platform.sql
-- =============================================================================

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

-- =============================================================================
-- 20260415150000_projects_tracking.sql
-- =============================================================================

-- Client project tracking (per company)

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'review', 'completed')),
  progress integer not null default 0
    check (progress >= 0 and progress <= 100),
  current_stage text,
  created_at timestamptz default now(),
  constraint projects_one_per_company unique (company_id)
);

create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  stage text not null
    check (stage in ('pending', 'in_progress', 'review', 'completed')),
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists project_activities_project_stage_idx
  on public.project_activities (project_id, stage);

alter table public.projects enable row level security;
alter table public.project_activities enable row level security;

-- Members of the company can read project + activities
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member" on public.projects
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = projects.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_activities_select_member" on public.project_activities;
create policy "project_activities_select_member" on public.project_activities
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      join public.memberships m on m.company_id = p.company_id
      where p.id = project_activities.project_id
        and m.user_id = (select auth.uid())
    )
  );

-- Platform admins may update pipeline (optional; aligns with companies admin)
grant update on table public.projects to authenticated;

drop policy if exists "projects_update_platform_admin" on public.projects;
create policy "projects_update_platform_admin" on public.projects
  for update to authenticated
  using (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.platform_admins pa
      where pa.user_id = (select auth.uid())
    )
  );

grant select on table public.projects to authenticated;
grant select on table public.project_activities to authenticated;

-- =============================================================================
-- 20260415160000_onboarding_plan_project_insert_rls.sql
-- =============================================================================

-- Onboarding: company plan + allow members to create project + activities

alter table public.companies
  add column if not exists plan text;

alter table public.projects
  alter column progress set default 10;

alter table public.projects
  alter column current_stage set default 'pending';

-- Ensure existing rows respect defaults on new inserts only; optional backfill skipped

grant insert on table public.projects to authenticated;
grant insert on table public.project_activities to authenticated;

drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member" on public.projects
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = projects.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_activities_insert_member" on public.project_activities;
create policy "project_activities_insert_member" on public.project_activities
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      join public.memberships m on m.company_id = p.company_id
      where p.id = project_activities.project_id
        and m.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 20260415170000_auth_public_users_sync.sql
-- =============================================================================

-- Mirror auth signups into public.users (id matches auth.users.id).

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.email), ''),
      new.id::text || '@users.local'
    ),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_public_users on auth.users;
create trigger on_auth_user_created_sync_public_users
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated
  using (id = (select auth.uid()));

grant select on table public.users to authenticated;

-- =============================================================================
-- 20260415180000_companies_project_fields.sql
-- =============================================================================

alter table public.companies
  add column if not exists production_url text;

alter table public.companies
  add column if not exists project_status text not null default 'draft';

alter table public.companies
  add column if not exists onboarding_data jsonb;

-- =============================================================================
-- 20260415190000_bookings_mvp_and_billing.sql
-- =============================================================================

-- Booking MVP + billing lifecycle fields.

alter table public.bookings
  add column if not exists booking_date timestamptz;

update public.bookings
set booking_date = date
where booking_date is null
  and date is not null;

alter table public.companies
  add column if not exists subscription_status text not null default 'inactive';

alter table public.companies
  add column if not exists next_billing_date timestamptz;

drop policy if exists "bookings_insert_member" on public.bookings;
create policy "bookings_insert_member" on public.bookings
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = bookings.company_id
        and m.user_id = (select auth.uid())
    )
  );

grant insert on table public.bookings to authenticated;

-- =============================================================================
-- 20260415200000_websites_multitenant_domains.sql
-- =============================================================================

-- Multi-tenant websites + content + domain support.

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  template text not null,
  domain text,
  subdomain text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.websites
    add constraint websites_status_check
    check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists websites_domain_unique_idx
  on public.websites (lower(domain))
  where domain is not null;

create unique index if not exists websites_subdomain_unique_idx
  on public.websites (lower(subdomain));

create index if not exists websites_client_id_idx on public.websites (client_id);

create table if not exists public.website_content (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  section text not null,
  content jsonb not null default '{}'::jsonb
);

create index if not exists website_content_website_id_idx
  on public.website_content (website_id);

alter table public.websites enable row level security;
alter table public.website_content enable row level security;

drop policy if exists "websites_select_public" on public.websites;
create policy "websites_select_public" on public.websites
  for select
  using (true);

drop policy if exists "websites_manage_member" on public.websites;
create policy "websites_manage_member" on public.websites
  for all to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = websites.client_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = websites.client_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "website_content_select_public_published" on public.website_content;
create policy "website_content_select_public_published" on public.website_content
  for select
  using (
    exists (
      select 1
      from public.websites w
      where w.id = website_content.website_id
        and w.status = 'published'
    )
  );

drop policy if exists "website_content_manage_member" on public.website_content;
create policy "website_content_manage_member" on public.website_content
  for all to authenticated
  using (
    exists (
      select 1
      from public.websites w
      join public.memberships m
        on m.company_id = w.client_id
      where w.id = website_content.website_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.memberships m
        on m.company_id = w.client_id
      where w.id = website_content.website_id
        and m.user_id = (select auth.uid())
    )
  );

grant select on public.websites to anon, authenticated;
grant insert, update, delete on public.websites to authenticated;
grant select on public.website_content to anon, authenticated;
grant insert, update, delete on public.website_content to authenticated;

-- =============================================================================
-- 20260415203000_websites_industry_column.sql
-- =============================================================================

alter table public.websites
  add column if not exists industry text not null default 'general';

-- =============================================================================
-- 20260415204000_websites_seo_fields.sql
-- =============================================================================

alter table public.websites
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text,
  add column if not exists og_image text;

-- =============================================================================
-- 20260415205000_website_content_unique_section.sql
-- =============================================================================

create unique index if not exists website_content_website_section_unique_idx
  on public.website_content (website_id, section);

-- =============================================================================
-- 20260622200000_tighten_rls_and_admin_policies.sql
-- =============================================================================

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

-- =============================================================================
-- 20260622210000_fix_rls_auth_email.sql
-- =============================================================================

-- Fix RLS policies that queried auth.users directly (permission denied for
-- authenticated role). Use JWT email via a small helper instead.

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
$$;

grant execute on function public.current_auth_email() to authenticated, anon;

drop policy if exists "companies_select_scoped" on public.companies;
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
      and public.current_auth_email() is not null
      and lower(primary_contact_email) = public.current_auth_email()
    )
  );

drop policy if exists "memberships_insert_first_owner" on public.memberships;
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
        and public.current_auth_email() is not null
        and lower(c.primary_contact_email) = public.current_auth_email()
    )
  );

-- Platform admins need to look up users by email in the admin UI.
drop policy if exists "users_select_platform_admin" on public.users;
create policy "users_select_platform_admin" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 20260622220000_hosting_system.sql
-- =============================================================================

-- Hosting subscriptions and payment records for FaraiOS hosting product.

create table if not exists public.hosting_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plan_slug text not null,
  status text not null default 'pending',
  subdomain text,
  custom_domain text,
  domain_status text not null default 'none',
  ssl_status text not null default 'pending',
  bandwidth_limit_gb int not null default 5,
  sites_limit int not null default 1,
  next_billing_date timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_subscriptions
    add constraint hosting_subscriptions_status_check
    check (status in ('pending', 'active', 'suspended', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hosting_subscriptions
    add constraint hosting_subscriptions_domain_status_check
    check (domain_status in ('none', 'pending', 'verified'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hosting_subscriptions
    add constraint hosting_subscriptions_ssl_status_check
    check (ssl_status in ('pending', 'active', 'failed'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists hosting_subscriptions_subdomain_unique_idx
  on public.hosting_subscriptions (lower(subdomain))
  where subdomain is not null;

create unique index if not exists hosting_subscriptions_custom_domain_unique_idx
  on public.hosting_subscriptions (lower(custom_domain))
  where custom_domain is not null;

create index if not exists hosting_subscriptions_company_id_idx
  on public.hosting_subscriptions (company_id);

create table if not exists public.hosting_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.hosting_subscriptions (id) on delete set null,
  company_id uuid not null references public.companies (id) on delete cascade,
  plan_slug text not null,
  amount_cents int not null,
  currency text not null default 'ZAR',
  paystack_reference text,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_payments
    add constraint hosting_payments_status_check
    check (status in ('pending', 'success', 'failed'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists hosting_payments_reference_unique_idx
  on public.hosting_payments (paystack_reference)
  where paystack_reference is not null;

create index if not exists hosting_payments_company_id_idx
  on public.hosting_payments (company_id);

alter table public.hosting_subscriptions enable row level security;
alter table public.hosting_payments enable row level security;

drop policy if exists "hosting_subscriptions_select_member" on public.hosting_subscriptions;
create policy "hosting_subscriptions_select_member" on public.hosting_subscriptions
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = hosting_subscriptions.company_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "hosting_subscriptions_manage_member" on public.hosting_subscriptions;
create policy "hosting_subscriptions_manage_member" on public.hosting_subscriptions
  for update to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = hosting_subscriptions.company_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = hosting_subscriptions.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "hosting_payments_select_member" on public.hosting_payments;
create policy "hosting_payments_select_member" on public.hosting_payments
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = hosting_payments.company_id
        and m.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

grant select, update on public.hosting_subscriptions to authenticated;
grant select on public.hosting_payments to authenticated;

-- =============================================================================
-- 20260623120000_promote_shalean_admin_and_grants.sql
-- =============================================================================

-- Restore API access for service_role (required for admin server actions and scripts).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

-- Promote admin@shalean.com (auth user id from Supabase Auth).
insert into public.platform_admins (user_id)
values ('81469321-eaff-4471-aa93-b655c6ff3806')
on conflict (user_id) do nothing;

-- =============================================================================
-- 20260623130000_admin_read_policies.sql
-- =============================================================================

-- Allow platform admins to read projects, activities, and all memberships for admin UI.

drop policy if exists "projects_select_platform_admin" on public.projects;
create policy "projects_select_platform_admin" on public.projects
  for select to authenticated
  using (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_activities_select_platform_admin" on public.project_activities;
create policy "project_activities_select_platform_admin" on public.project_activities
  for select to authenticated
  using (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "memberships_select_platform_admin" on public.memberships;
create policy "memberships_select_platform_admin" on public.memberships
  for select to authenticated
  using (
    exists (
      select 1
      from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 20260623140000_admin_workspace_features.sql
-- =============================================================================


-- =============================================================================
-- 20260623150000_platform_admins_select_all.sql
-- =============================================================================

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

-- =============================================================================
-- 20260623160000_fix_platform_admins_rls_recursion.sql
-- =============================================================================

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

-- =============================================================================
-- 20260623170000_use_is_platform_admin_in_policies.sql
-- =============================================================================

-- Replace platform_admins subqueries in admin read policies with is_platform_admin()
-- so policy checks do not re-enter platform_admins RLS.

drop policy if exists "projects_select_platform_admin" on public.projects;
create policy "projects_select_platform_admin" on public.projects
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "project_activities_select_platform_admin" on public.project_activities;
create policy "project_activities_select_platform_admin" on public.project_activities
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "memberships_select_platform_admin" on public.memberships;
create policy "memberships_select_platform_admin" on public.memberships
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "companies_select_scoped" on public.companies;
create policy "companies_select_scoped" on public.companies
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = companies.id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
    or (
      primary_contact_email is not null
      and public.current_auth_email() is not null
      and lower(primary_contact_email) = public.current_auth_email()
    )
  );

drop policy if exists "users_select_platform_admin" on public.users;
create policy "users_select_platform_admin" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "companies_update_platform_admin" on public.companies;
create policy "companies_update_platform_admin" on public.companies
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- =============================================================================
-- 20260623180000_platform_settings_rls.sql
-- =============================================================================

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

-- =============================================================================
-- 20260623190000_websites_platform_admin_policies.sql
-- =============================================================================

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

-- =============================================================================
-- 20260623200000_marketplace_listings.sql
-- =============================================================================

-- Marketplace: public business directory + consumer bookings.

alter table public.companies
  add column if not exists listed_in_marketplace boolean not null default false;

alter table public.companies
  add column if not exists marketplace_summary text;

alter table public.companies
  add column if not exists marketplace_location text;

alter table public.companies
  add column if not exists marketplace_featured boolean not null default false;

alter table public.bookings
  add column if not exists customer_email text;

alter table public.bookings
  add column if not exists customer_phone text;

alter table public.bookings
  add column if not exists source text not null default 'internal';

create index if not exists companies_marketplace_listed_idx
  on public.companies (listed_in_marketplace, marketplace_featured)
  where listed_in_marketplace = true;

-- Public read for marketplace-listed companies with a published website.
drop policy if exists "companies_select_marketplace" on public.companies;
create policy "companies_select_marketplace" on public.companies
  for select
  using (
    listed_in_marketplace = true
    and exists (
      select 1
      from public.websites w
      where w.client_id = companies.id
        and w.status = 'published'
    )
  );

-- Consumers may book marketplace-listed businesses (anon + authenticated).
drop policy if exists "bookings_insert_marketplace" on public.bookings;
create policy "bookings_insert_marketplace" on public.bookings
  for insert to anon, authenticated
  with check (
    source = 'marketplace'
    and exists (
      select 1
      from public.companies c
      where c.id = bookings.company_id
        and c.listed_in_marketplace = true
        and exists (
          select 1
          from public.websites w
          where w.client_id = c.id
            and w.status = 'published'
        )
    )
  );

grant insert on table public.bookings to anon;

-- Admins manage marketplace flags via existing companies_update_platform_admin policy.

-- =============================================================================
-- 20260623210000_website_assets_storage.sql
-- =============================================================================

-- Public bucket for website hero, service, and section images uploaded from the admin editor.
-- Includes is_platform_admin() so this migration can run standalone in the SQL editor.

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)values (
  'website-assets',
  'website-assets',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "website_assets_public_read" on storage.objects;
create policy "website_assets_public_read" on storage.objects
  for select
  to public
  using (bucket_id = 'website-assets');

drop policy if exists "website_assets_member_insert" on storage.objects;
create policy "website_assets_member_insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'website-assets'
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        join public.memberships m on m.company_id = w.client_id
        where m.user_id = (select auth.uid())
          and (storage.foldername(name))[1] = w.id::text
      )
    )
  );

drop policy if exists "website_assets_member_update" on storage.objects;
create policy "website_assets_member_update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'website-assets'
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        join public.memberships m on m.company_id = w.client_id
        where m.user_id = (select auth.uid())
          and (storage.foldername(name))[1] = w.id::text
      )
    )
  )
  with check (bucket_id = 'website-assets');

drop policy if exists "website_assets_member_delete" on storage.objects;
create policy "website_assets_member_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'website-assets'
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        join public.memberships m on m.company_id = w.client_id
        where m.user_id = (select auth.uid())
          and (storage.foldername(name))[1] = w.id::text
      )
    )
  );
-- Workspace subscription enforcement: lifecycle fields, payment ledger, status migration.

alter table public.companies
  add column if not exists subscription_started_at timestamptz;

alter table public.companies
  add column if not exists subscription_expires_at timestamptz;

alter table public.companies
  add column if not exists paystack_customer_code text;

alter table public.companies
  add column if not exists paystack_subscription_code text;

-- Normalize legacy statuses to the canonical subscription lifecycle.
update public.companies
set subscription_status = 'pending_payment'
where subscription_status in ('inactive', '');

update public.companies
set subscription_status = 'trialing'
where subscription_status = 'trial';

update public.companies
set subscription_status = 'expired'
where subscription_status = 'suspended';

-- Backfill expiry from existing next_billing_date.
update public.companies
set subscription_expires_at = next_billing_date
where subscription_expires_at is null
  and next_billing_date is not null;

update public.companies
set subscription_started_at = created_at
where subscription_started_at is null
  and subscription_status in ('active', 'trialing')
  and created_at is not null;

alter table public.companies
  alter column subscription_status set default 'pending_payment';

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plan_slug text not null,
  amount_cents integer not null,
  currency text not null default 'ZAR',
  paystack_reference text unique,
  status text not null default 'success',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists subscription_payments_company_id_idx
  on public.subscription_payments (company_id, paid_at desc);

alter table public.subscription_payments enable row level security;

drop policy if exists "subscription_payments_select_member" on public.subscription_payments;
create policy "subscription_payments_select_member" on public.subscription_payments
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = subscription_payments.company_id
        and m.user_id = (select auth.uid())
    )
  );

grant select on table public.subscription_payments to authenticated;
