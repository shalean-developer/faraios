-- FaraiOS full schema
-- Run ONCE on a FRESH Supabase project (SQL Editor → New query → Run).
-- Do NOT re-run if you already applied bootstrap or partial migrations.
-- If the DB already has tables, use: npm run db:apply-website-components
-- 70 migrations in timestamp order.

-- 20260415120000_init_faraios.sql
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
-- RLS (allow anon read/insert for industries & companies — tighten for production)
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

-- 20260415120001_grant_api_roles_public.sql
-- PostgREST uses the `anon` / `authenticated` roles. Tables created in migrations
-- must grant schema usage and table privileges or queries fail with
-- "permission denied for schema public".

grant usage on schema public to anon, authenticated;

grant select on table public.industries to anon, authenticated;
grant select, insert on table public.companies to anon, authenticated;

-- 20260415120002_bookings_schema_repair.sql
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

-- 20260415130000_dashboard_memberships_auth.sql
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

-- 20260415140000_admin_platform.sql
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

-- 20260415150000_projects_tracking.sql
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

-- 20260415160000_onboarding_plan_project_insert_rls.sql
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

-- 20260415170000_auth_public_users_sync.sql
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

-- Backfill accounts that existed before this trigger was installed.
insert into public.users (id, email, full_name)
select
  u.id,
  coalesce(nullif(trim(u.email), ''), u.id::text || '@users.local'),
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name);

-- 20260415180000_companies_project_fields.sql
alter table public.companies
  add column if not exists production_url text;

alter table public.companies
  add column if not exists project_status text not null default 'draft';

alter table public.companies
  add column if not exists onboarding_data jsonb;

-- 20260415190000_bookings_mvp_and_billing.sql
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

-- 20260415200000_websites_multitenant_domains.sql
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

-- 20260415203000_websites_industry_column.sql
alter table public.websites
  add column if not exists industry text not null default 'general';

-- 20260415204000_websites_seo_fields.sql
alter table public.websites
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text,
  add column if not exists og_image text;

-- 20260415205000_website_content_unique_section.sql
create unique index if not exists website_content_website_section_unique_idx
  on public.website_content (website_id, section);

-- 20260622200000_tighten_rls_and_admin_policies.sql
-- Tighten RLS: companies, memberships, websites, platform_admins.

-- ---------------------------------------------------------------------------
-- Companies: no anonymous access; members and platform admins can read.
-- Onboarding creators can read rows they own via primary_contact_email until
-- membership is created.
-- ---------------------------------------------------------------------------
revoke insert on table public.companies from anon;

drop policy if exists "companies_select_public" on public.companies;
drop policy if exists "companies_insert_public" on public.companies;
drop policy if exists "companies_select_scoped" on public.companies;
drop policy if exists "companies_insert_authenticated" on public.companies;

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
        and lower(c.primary_contact_email) = lower(
          coalesce((select email from auth.users where id = auth.uid()), '')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Websites: public read for published sites only; members read their drafts.
-- ---------------------------------------------------------------------------
drop policy if exists "websites_select_public" on public.websites;
drop policy if exists "websites_select_published" on public.websites;
drop policy if exists "websites_select_member" on public.websites;

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

-- 20260622210000_fix_rls_auth_email.sql
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

-- 20260622220000_hosting_system.sql
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

-- 20260623120000_promote_faraios_admin_and_grants.sql
-- Restore API access for service_role (required for admin server actions and scripts).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

-- Ensure public.users rows exist for auth accounts (required by memberships and related FKs).
insert into public.users (id, email, full_name)
select
  u.id,
  coalesce(nullif(trim(u.email), ''), u.id::text || '@users.local'),
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name);

-- Optional: promote admin@faraios.com when that auth user exists in THIS project.
-- Does not fail when the email is absent (no hardcoded UUID).
insert into public.platform_admins (user_id)
select u.id
from auth.users u
where lower(trim(u.email)) = lower('admin@faraios.com')
on conflict (user_id) do nothing;

-- 20260623130000_admin_read_policies.sql
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

-- 20260623140000_admin_workspace_features.sql
-- Admin CRM fields, notes, platform settings, and user notification preferences.

alter table public.companies
  add column if not exists contact_phone text,
  add column if not exists contact_location text,
  add column if not exists admin_client_note text,
  add column if not exists admin_client_note_updated_at timestamptz;

alter table public.users
  add column if not exists admin_preferences jsonb not null default '{}'::jsonb;

create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'Farai Creative Studio',
  platform_name text not null default 'FaraiOS',
  updated_at timestamptz default now()
);

insert into public.platform_settings (id, company_name, platform_name)
values (1, 'Farai Creative Studio', 'FaraiOS')
on conflict (id) do nothing;

create table if not exists public.admin_company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists admin_company_notes_company_idx
  on public.admin_company_notes (company_id, created_at desc);

alter table public.platform_settings enable row level security;
alter table public.admin_company_notes enable row level security;

grant select, update on table public.platform_settings to authenticated;
grant select, insert on table public.admin_company_notes to authenticated;

drop policy if exists "platform_settings_select_admin" on public.platform_settings;
create policy "platform_settings_select_admin" on public.platform_settings
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "platform_settings_update_admin" on public.platform_settings;
create policy "platform_settings_update_admin" on public.platform_settings
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

drop policy if exists "admin_company_notes_select_admin" on public.admin_company_notes;
create policy "admin_company_notes_select_admin" on public.admin_company_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "admin_company_notes_insert_admin" on public.admin_company_notes;
create policy "admin_company_notes_insert_admin" on public.admin_company_notes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

-- 20260623150000_platform_admins_select_all.sql
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

-- 20260623160000_fix_platform_admins_rls_recursion.sql
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

-- 20260623170000_use_is_platform_admin_in_policies.sql
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

-- 20260623180000_platform_settings_rls.sql
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

-- 20260623190000_websites_platform_admin_policies.sql
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

-- 20260623200000_marketplace_listings.sql
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

-- 20260623210000_website_assets_storage.sql
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

-- 20260623220000_v1_operations_module.sql
-- V1 operations module: customers, company_services, connected websites, booking updates.
-- Note: uses `company_services` (not `services`) to avoid clashing with any existing public.services table.
-- Includes is_platform_admin() so this migration can run standalone in the SQL editor.

-- ---------------------------------------------------------------------------
-- Helper: platform admin check (required by RLS policies below)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Repairs (safe to re-run)
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

alter table public.companies
  add column if not exists service_areas text,
  add column if not exists business_description text;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

alter table public.customers
  add column if not exists name text;

alter table public.customers
  add column if not exists email text;

alter table public.customers
  add column if not exists phone text;

alter table public.customers
  add column if not exists notes text;

alter table public.customers
  add column if not exists created_at timestamptz not null default now();

alter table public.customers
  add column if not exists updated_at timestamptz not null default now();

create index if not exists customers_company_idx
  on public.customers (company_id, created_at desc);

create index if not exists customers_company_email_idx
  on public.customers (company_id, lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- Services catalog (company_services — not `services`)
-- ---------------------------------------------------------------------------
create table if not exists public.company_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  category text,
  description text,
  base_price_cents integer not null default 0 check (base_price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_services_company_idx
  on public.company_services (company_id, active, name);

-- ---------------------------------------------------------------------------
-- Connected websites (external or hosted linkage)
-- ---------------------------------------------------------------------------
create table if not exists public.connected_websites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete cascade,
  type text not null default 'external' check (type in ('external', 'hosted')),
  production_url text,
  api_key text not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connected_websites
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

alter table public.connected_websites
  add column if not exists type text not null default 'external';

alter table public.connected_websites
  add column if not exists production_url text;

alter table public.connected_websites
  add column if not exists api_key text not null default encode(gen_random_bytes(24), 'hex');

alter table public.connected_websites
  add column if not exists created_at timestamptz not null default now();

alter table public.connected_websites
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Booking links to customers / company_services
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

alter table public.bookings
  add column if not exists service_id uuid references public.company_services (id) on delete set null;

alter table public.bookings
  add column if not exists price_cents integer check (price_cents is null or price_cents >= 0);

-- ---------------------------------------------------------------------------
-- RLS: customers
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;

grant select, insert, update, delete on table public.customers to authenticated;

drop policy if exists "customers_select_member" on public.customers;
create policy "customers_select_member" on public.customers
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = customers.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "customers_insert_member" on public.customers;
create policy "customers_insert_member" on public.customers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = customers.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "customers_update_member" on public.customers;
create policy "customers_update_member" on public.customers
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = customers.company_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = customers.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "customers_delete_member" on public.customers;
create policy "customers_delete_member" on public.customers
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = customers.company_id
        and m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: company_services
-- ---------------------------------------------------------------------------
alter table public.company_services enable row level security;

grant select, insert, update, delete on table public.company_services to authenticated;

drop policy if exists "company_services_select_member" on public.company_services;
create policy "company_services_select_member" on public.company_services
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = company_services.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "company_services_insert_member" on public.company_services;
create policy "company_services_insert_member" on public.company_services
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = company_services.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "company_services_update_member" on public.company_services;
create policy "company_services_update_member" on public.company_services
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = company_services.company_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = company_services.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "company_services_delete_member" on public.company_services;
create policy "company_services_delete_member" on public.company_services
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = company_services.company_id
        and m.user_id = (select auth.uid())
    )
  );

-- Drop legacy policy names if a previous partial run targeted public.services
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'services'
  ) then
    drop policy if exists "services_select_member" on public.services;
    drop policy if exists "services_insert_member" on public.services;
    drop policy if exists "services_update_member" on public.services;
    drop policy if exists "services_delete_member" on public.services;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: connected_websites
-- ---------------------------------------------------------------------------
alter table public.connected_websites enable row level security;

grant select, insert, update, delete on table public.connected_websites to authenticated;

drop policy if exists "connected_websites_select_member" on public.connected_websites;
create policy "connected_websites_select_member" on public.connected_websites
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = connected_websites.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "connected_websites_insert_member" on public.connected_websites;
create policy "connected_websites_insert_member" on public.connected_websites
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = connected_websites.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "connected_websites_update_member" on public.connected_websites;
create policy "connected_websites_update_member" on public.connected_websites
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = connected_websites.company_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = connected_websites.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "connected_websites_delete_member" on public.connected_websites;
create policy "connected_websites_delete_member" on public.connected_websites
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = connected_websites.company_id
        and m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: bookings update for members
-- ---------------------------------------------------------------------------
grant update on table public.bookings to authenticated;

drop policy if exists "bookings_update_member" on public.bookings;
create policy "bookings_update_member" on public.bookings
  for update to authenticated
  using (
    bookings.company_id is not null
    and exists (
      select 1 from public.memberships m
      where m.company_id = bookings.company_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    bookings.company_id is not null
    and exists (
      select 1 from public.memberships m
      where m.company_id = bookings.company_id
        and m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: companies update for members (business settings)
-- ---------------------------------------------------------------------------
grant update on table public.companies to authenticated;

drop policy if exists "companies_update_member" on public.companies;
create policy "companies_update_member" on public.companies
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = companies.id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = companies.id
        and m.user_id = (select auth.uid())
    )
  );

-- 20260623230000_team_management.sql
-- Team management: company members can list teammates; owners manage invites and roles.
-- Standalone-safe (includes is_platform_admin and helper functions).

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
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
  );
end;
$$;

grant execute on function public.is_company_member(uuid) to authenticated;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
      and coalesce(m.role, 'owner') = 'owner'
  );
end;
$$;

grant execute on function public.is_company_owner(uuid) to authenticated;

create or replace function public.company_has_members(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
  );
end;
$$;

grant execute on function public.company_has_members(uuid) to authenticated;

create or replace function public.membership_exists(
  p_company_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = p_user_id
  );
end;
$$;

grant execute on function public.membership_exists(uuid, uuid) to authenticated;

-- Normalize roles
update public.memberships
set role = 'owner'
where role is null;

do $$
begin
  alter table public.memberships
    add constraint memberships_role_check
    check (role in ('owner', 'admin', 'staff'));
exception
  when duplicate_object then null;
end $$;

-- Members can see teammates in the same company
drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_company" on public.memberships
  for select to authenticated
  using (
    public.is_company_member(company_id)
    or public.is_platform_admin()
  );

-- Owners invite existing FaraiOS users (admin or staff)
drop policy if exists "memberships_insert_first_owner" on public.memberships;
create policy "memberships_insert_first_owner" on public.memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce(role, 'owner') = 'owner'
    and not public.company_has_members(company_id)
    and exists (
      select 1
      from public.companies c
      where c.id = memberships.company_id
        and c.primary_contact_email is not null
        and public.current_auth_email() is not null
        and lower(c.primary_contact_email) = public.current_auth_email()
    )
  );

drop policy if exists "memberships_insert_team" on public.memberships;
create policy "memberships_insert_team" on public.memberships
  for insert to authenticated
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'staff')
    and not public.membership_exists(company_id, user_id)
  );

-- Owners update member roles (cannot promote to owner via app)
drop policy if exists "memberships_update_owner" on public.memberships;
create policy "memberships_update_owner" on public.memberships
  for update to authenticated
  using (public.is_company_owner(company_id))
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'staff')
    and user_id <> (select auth.uid())
  );

-- Owners remove members; members may leave (delete own row)
drop policy if exists "memberships_delete_own" on public.memberships;
drop policy if exists "memberships_delete_team" on public.memberships;
create policy "memberships_delete_team" on public.memberships
  for delete to authenticated
  using (
    (
      user_id = (select auth.uid())
      and coalesce(role, 'owner') <> 'owner'
    )
    or (
      public.is_company_owner(company_id)
      and user_id <> (select auth.uid())
      and coalesce(memberships.role, 'owner') <> 'owner'
    )
  );

grant update on table public.memberships to authenticated;

-- 20260623240000_p1_stabilization.sql
-- P1 stabilization: booking_date canonical, deprecate companies.is_published.

-- ---------------------------------------------------------------------------
-- Bookings: backfill booking_date, drop legacy date column
-- ---------------------------------------------------------------------------
update public.bookings
set booking_date = coalesce(booking_date, date)
where booking_date is null
  and date is not null;

alter table public.bookings
  drop column if exists date;

-- ---------------------------------------------------------------------------
-- Companies: sync is_published from websites.status (deprecated column)
-- Skipped when public.websites has not been created yet (run websites migration first).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'websites'
  ) then
    raise notice 'Skipping is_published sync: public.websites does not exist yet.';
    return;
  end if;

  update public.companies c
  set is_published = exists (
    select 1
    from public.websites w
    where w.client_id = c.id
      and w.status = 'published'
  );

  comment on column public.companies.is_published is
    'Deprecated: derive live site status from websites.status = published.';

  create or replace function public.sync_company_is_published_from_website()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $fn$
  begin
    update public.companies c
    set is_published = exists (
      select 1
      from public.websites w
      where w.client_id = c.id
        and w.status = 'published'
    )
    where c.id = coalesce(new.client_id, old.client_id);

    return coalesce(new, old);
  end;
  $fn$;

  drop trigger if exists websites_sync_company_is_published on public.websites;
  create trigger websites_sync_company_is_published
    after insert or update of status or delete on public.websites
    for each row
    execute function public.sync_company_is_published_from_website();
end $$;

-- 20260624000000_v2_booking_engine.sql
-- V2 Booking Engine: dynamic forms, extended booking lifecycle, availability.

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

-- ---------------------------------------------------------------------------
-- Booking form configuration (per business)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_forms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  industry_slug text,
  name text not null default 'Booking form',
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  fields jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create index if not exists booking_forms_company_id_idx on public.booking_forms(company_id);
create index if not exists booking_forms_status_idx on public.booking_forms(status);

-- ---------------------------------------------------------------------------
-- Extend bookings for V2 lifecycle and custom responses
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists assigned_staff_id uuid references auth.users(id) on delete set null,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists internal_notes text,
  add column if not exists duration_minutes integer,
  add column if not exists custom_responses jsonb not null default '{}'::jsonb,
  add column if not exists addons jsonb not null default '[]'::jsonb,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists source_website text,
  add column if not exists consent_given boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize legacy payment_status values before constraint
update public.bookings
set payment_status = 'unpaid'
where payment_status is null
   or trim(payment_status) = '';

-- Booking workflow values sometimes land in payment_status on legacy rows
update public.bookings
set payment_status = 'unpaid'
where lower(trim(payment_status)) in (
  'confirmed', 'assigned', 'in_progress', 'completed',
  'cancelled', 'rescheduled', 'canceled', 'cancel', 'active', 'open', 'new', 'requested'
);

update public.bookings
set payment_status = 'paid'
where lower(trim(payment_status)) in (
  'paid', 'complete', 'success', 'successful', 'succeeded'
);

update public.bookings
set payment_status = 'pending'
where lower(trim(payment_status)) in (
  'processing', 'awaiting', 'awaiting_payment'
);

update public.bookings
set payment_status = 'refunded'
where lower(trim(payment_status)) in ('refunded', 'refund', 'reversed');

update public.bookings
set payment_status = 'unpaid'
where payment_status is not null
  and lower(trim(payment_status)) not in ('unpaid', 'pending', 'paid', 'refunded');

-- Normalize legacy statuses then constrain (map unknown values to pending)
update public.bookings
set status = 'pending'
where status is null
   or trim(status) = '';

update public.bookings
set status = 'cancelled'
where lower(trim(status)) in ('canceled', 'cancel');

update public.bookings
set status = 'in_progress'
where lower(trim(status)) in ('in progress', 'in-progress', 'inprogress');

update public.bookings
set status = 'pending'
where lower(trim(status)) in ('active', 'open', 'new', 'requested');

update public.bookings
set status = 'pending'
where status is not null
  and lower(trim(status)) not in (
    'pending', 'confirmed', 'assigned', 'in_progress',
    'completed', 'cancelled', 'rescheduled'
  );

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in (
    'pending', 'confirmed', 'assigned', 'in_progress',
    'completed', 'cancelled', 'rescheduled'
  ));

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'refunded'));

-- ---------------------------------------------------------------------------
-- Extend services for duration and add-ons
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'company_services'
  ) then
    alter table public.company_services
      add column if not exists duration_minutes integer,
      add column if not exists addons jsonb not null default '[]'::jsonb;
  else
    raise notice 'Skipping company_services columns: table does not exist yet.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Business availability (simple V2)
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists booking_hours jsonb,
  add column if not exists blocked_booking_dates text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- RLS: booking_forms
-- ---------------------------------------------------------------------------
alter table public.booking_forms enable row level security;

grant select, insert, update, delete on table public.booking_forms to authenticated;

drop policy if exists "booking_forms_select_member" on public.booking_forms;
create policy "booking_forms_select_member" on public.booking_forms
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_forms.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "booking_forms_insert_member" on public.booking_forms;
create policy "booking_forms_insert_member" on public.booking_forms
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_forms.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "booking_forms_update_member" on public.booking_forms;
create policy "booking_forms_update_member" on public.booking_forms
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_forms.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "booking_forms_delete_member" on public.booking_forms;
create policy "booking_forms_delete_member" on public.booking_forms
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_forms.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- 20260624010000_v2_booking_completion.sql
-- V2 completion: booking activity history.

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

-- Match booking_activities.booking_id type to public.bookings.id (uuid or legacy text).
do $$
declare
  bookings_id_type text;
  booking_id_col text;
begin
  select c.data_type
  into bookings_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'bookings'
    and c.column_name = 'id';

  if bookings_id_type is null then
    raise exception 'public.bookings.id column not found';
  end if;

  if bookings_id_type = 'text' then
    begin
      alter table public.bookings
        alter column id type uuid using id::uuid;
      bookings_id_type := 'uuid';
    exception
      when others then
        raise notice 'Keeping bookings.id as text: %', SQLERRM;
    end;
  end if;

  drop table if exists public.booking_activities;

  if bookings_id_type = 'uuid' then
    booking_id_col := 'booking_id uuid not null references public.bookings(id) on delete cascade';
  else
    booking_id_col := 'booking_id text not null references public.bookings(id) on delete cascade';
  end if;

  execute format(
    'create table public.booking_activities (
      id uuid primary key default gen_random_uuid(),
      %s,
      company_id uuid not null references public.companies(id) on delete cascade,
      actor_user_id uuid references auth.users(id) on delete set null,
      event_type text not null
        check (event_type in (''created'', ''status_changed'', ''staff_assigned'', ''note_updated'')),
      message text not null,
      metadata jsonb not null default ''{}''::jsonb,
      created_at timestamptz not null default now()
    )',
    booking_id_col
  );
end $$;

create index if not exists booking_activities_booking_id_idx
  on public.booking_activities(booking_id, created_at desc);

create index if not exists booking_activities_company_id_idx
  on public.booking_activities(company_id, created_at desc);

alter table public.booking_activities enable row level security;

grant select, insert on table public.booking_activities to authenticated;

drop policy if exists "booking_activities_select_member" on public.booking_activities;
create policy "booking_activities_select_member" on public.booking_activities
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_activities.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "booking_activities_insert_member" on public.booking_activities;
create policy "booking_activities_insert_member" on public.booking_activities
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_activities.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- 20260624020000_v2_booking_migration_repair.sql
-- Safe to re-run in Supabase SQL editor after a failed V2 migration.
-- Fixes payment_status check violations and booking_activities FK type mismatch.

-- 1) payment_status backfill
update public.bookings
set payment_status = 'unpaid'
where payment_status is null
   or trim(payment_status) = '';

update public.bookings
set payment_status = 'unpaid'
where lower(trim(payment_status)) in (
  'confirmed', 'assigned', 'in_progress', 'completed',
  'cancelled', 'rescheduled', 'canceled', 'cancel', 'active', 'open', 'new', 'requested'
);

update public.bookings
set payment_status = 'paid'
where lower(trim(payment_status)) in (
  'paid', 'complete', 'success', 'successful', 'succeeded'
);

update public.bookings
set payment_status = 'pending'
where lower(trim(payment_status)) in (
  'processing', 'awaiting', 'awaiting_payment'
);

update public.bookings
set payment_status = 'refunded'
where lower(trim(payment_status)) in ('refunded', 'refund', 'reversed');

update public.bookings
set payment_status = 'unpaid'
where payment_status is not null
  and lower(trim(payment_status)) not in ('unpaid', 'pending', 'paid', 'refunded');

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'refunded'));

-- 2) booking_activities: drop broken table if present, then re-apply completion migration
--    or run: supabase/migrations/20260624010000_v2_booking_completion.sql

-- 3) company_services display order
alter table public.company_services
  add column if not exists sort_order integer not null default 0;

create index if not exists company_services_company_sort_idx
  on public.company_services (company_id, sort_order, name);

-- 20260624030000_fix_memberships_rls_recursion.sql
-- Superseded by 20260624040000_fix_memberships_rls_no_recursion.sql
-- Kept for migration history; no-op if 40000 already applied.

select 1;

-- 20260624040000_fix_memberships_rls_no_recursion.sql
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

-- 20260624050000_fix_onboarding_membership.sql
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

-- 20260625000000_v3_revenue_engine.sql
-- V3 Revenue Engine: quotes, invoices, payments, customer portal access, audit logs.

-- ---------------------------------------------------------------------------
-- Document numbering (per company)
-- ---------------------------------------------------------------------------
create table if not exists public.financial_document_sequences (
  company_id uuid not null references public.companies (id) on delete cascade,
  document_type text not null check (document_type in ('quote', 'invoice')),
  next_number integer not null default 1 check (next_number >= 1),
  primary key (company_id, document_type)
);

create or replace function public.allocate_document_number(
  p_company_id uuid,
  p_document_type text,
  p_prefix text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
begin
  insert into public.financial_document_sequences (company_id, document_type, next_number)
  values (p_company_id, p_document_type, 2)
  on conflict (company_id, document_type)
  do update set next_number = public.financial_document_sequences.next_number + 1
  returning next_number - 1 into v_num;

  return p_prefix || '-' || lpad(v_num::text, 6, '0');
end;
$$;

grant execute on function public.allocate_document_number(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  quote_number text not null,
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')
  ),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  notes text,
  valid_until date,
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  converted_booking_id uuid references public.bookings (id) on delete set null,
  converted_invoice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_number)
);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  service_id uuid references public.company_services (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quotes_company_idx on public.quotes (company_id, created_at desc);
create index if not exists quotes_customer_idx on public.quotes (customer_id, created_at desc);
create index if not exists quotes_status_idx on public.quotes (company_id, status);
create index if not exists quote_line_items_quote_idx on public.quote_line_items (quote_id, sort_order);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft' check (
    status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded')
  ),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  balance_due_cents integer not null default 0 check (balance_due_cents >= 0),
  deposit_type text not null default 'full' check (deposit_type in ('full', 'percentage', 'fixed')),
  deposit_value integer not null default 100 check (deposit_value >= 0),
  due_date date,
  notes text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

alter table public.quotes
  add constraint quotes_converted_invoice_fk
  foreign key (converted_invoice_id) references public.invoices (id) on delete set null;

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  service_id uuid references public.company_services (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists invoices_company_idx on public.invoices (company_id, created_at desc);
create index if not exists invoices_customer_idx on public.invoices (customer_id, created_at desc);
create index if not exists invoices_status_idx on public.invoices (company_id, status);
create index if not exists invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, sort_order);

-- ---------------------------------------------------------------------------
-- Customer payments (B2C — business → end customer)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR',
  provider text not null check (provider in ('paystack', 'eft', 'stripe', 'ozow', 'peach', 'yoco')),
  provider_reference text,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  payment_type text not null default 'full' check (
    payment_type in ('full', 'deposit', 'balance', 'partial')
  ),
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_payments_provider_ref_idx
  on public.customer_payments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists customer_payments_company_idx
  on public.customer_payments (company_id, created_at desc);
create index if not exists customer_payments_invoice_idx
  on public.customer_payments (invoice_id, created_at desc);
create index if not exists customer_payments_customer_idx
  on public.customer_payments (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Company payment settings (EFT bank details, default deposit)
-- ---------------------------------------------------------------------------
create table if not exists public.company_payment_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  default_deposit_type text not null default 'full' check (default_deposit_type in ('full', 'percentage', 'fixed')),
  default_deposit_value integer not null default 100 check (default_deposit_value >= 0),
  eft_bank_name text,
  eft_account_name text,
  eft_account_number text,
  eft_branch_code text,
  eft_reference_prefix text,
  paystack_enabled boolean not null default true,
  eft_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customer portal access tokens
-- ---------------------------------------------------------------------------
create table if not exists public.customer_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_portal_tokens_customer_idx
  on public.customer_portal_tokens (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Financial audit log
-- ---------------------------------------------------------------------------
create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type text not null check (entity_type in ('quote', 'invoice', 'payment')),
  entity_id uuid not null,
  action text not null,
  actor_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists financial_audit_logs_company_idx
  on public.financial_audit_logs (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS helper macro via policies
-- ---------------------------------------------------------------------------
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.customer_payments enable row level security;
alter table public.company_payment_settings enable row level security;
alter table public.financial_audit_logs enable row level security;

grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_line_items to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_line_items to authenticated;
grant select, insert, update on public.customer_payments to authenticated;
grant select, insert, update on public.company_payment_settings to authenticated;
grant select, insert on public.financial_audit_logs to authenticated;
grant select, insert, update on public.financial_document_sequences to authenticated;

-- quotes
drop policy if exists "quotes_select_member" on public.quotes;
create policy "quotes_select_member" on public.quotes for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "quotes_insert_member" on public.quotes;
create policy "quotes_insert_member" on public.quotes for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())));

drop policy if exists "quotes_update_member" on public.quotes;
create policy "quotes_update_member" on public.quotes for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())));

drop policy if exists "quotes_delete_member" on public.quotes;
create policy "quotes_delete_member" on public.quotes for delete to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())));

-- quote_line_items (via quote company)
drop policy if exists "quote_line_items_select_member" on public.quote_line_items;
create policy "quote_line_items_select_member" on public.quote_line_items for select to authenticated
  using (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "quote_line_items_insert_member" on public.quote_line_items;
create policy "quote_line_items_insert_member" on public.quote_line_items for insert to authenticated
  with check (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())));

drop policy if exists "quote_line_items_update_member" on public.quote_line_items;
create policy "quote_line_items_update_member" on public.quote_line_items for update to authenticated
  using (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())));

drop policy if exists "quote_line_items_delete_member" on public.quote_line_items;
create policy "quote_line_items_delete_member" on public.quote_line_items for delete to authenticated
  using (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())));

-- invoices
drop policy if exists "invoices_select_member" on public.invoices;
create policy "invoices_select_member" on public.invoices for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "invoices_insert_member" on public.invoices;
create policy "invoices_insert_member" on public.invoices for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())));

drop policy if exists "invoices_update_member" on public.invoices;
create policy "invoices_update_member" on public.invoices for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())));

drop policy if exists "invoices_delete_member" on public.invoices;
create policy "invoices_delete_member" on public.invoices for delete to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())));

-- invoice_line_items
drop policy if exists "invoice_line_items_select_member" on public.invoice_line_items;
create policy "invoice_line_items_select_member" on public.invoice_line_items for select to authenticated
  using (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "invoice_line_items_insert_member" on public.invoice_line_items;
create policy "invoice_line_items_insert_member" on public.invoice_line_items for insert to authenticated
  with check (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())));

drop policy if exists "invoice_line_items_update_member" on public.invoice_line_items;
create policy "invoice_line_items_update_member" on public.invoice_line_items for update to authenticated
  using (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())));

drop policy if exists "invoice_line_items_delete_member" on public.invoice_line_items;
create policy "invoice_line_items_delete_member" on public.invoice_line_items for delete to authenticated
  using (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())));

-- customer_payments
drop policy if exists "customer_payments_select_member" on public.customer_payments;
create policy "customer_payments_select_member" on public.customer_payments for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = customer_payments.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "customer_payments_insert_member" on public.customer_payments;
create policy "customer_payments_insert_member" on public.customer_payments for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = customer_payments.company_id and m.user_id = (select auth.uid())));

drop policy if exists "customer_payments_update_member" on public.customer_payments;
create policy "customer_payments_update_member" on public.customer_payments for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = customer_payments.company_id and m.user_id = (select auth.uid())));

-- company_payment_settings
drop policy if exists "company_payment_settings_select_member" on public.company_payment_settings;
create policy "company_payment_settings_select_member" on public.company_payment_settings for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = company_payment_settings.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "company_payment_settings_upsert_member" on public.company_payment_settings;
create policy "company_payment_settings_upsert_member" on public.company_payment_settings for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = company_payment_settings.company_id and m.user_id = (select auth.uid())));

drop policy if exists "company_payment_settings_update_member" on public.company_payment_settings;
create policy "company_payment_settings_update_member" on public.company_payment_settings for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = company_payment_settings.company_id and m.user_id = (select auth.uid())));

-- financial_audit_logs
drop policy if exists "financial_audit_logs_select_member" on public.financial_audit_logs;
create policy "financial_audit_logs_select_member" on public.financial_audit_logs for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = financial_audit_logs.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "financial_audit_logs_insert_member" on public.financial_audit_logs;
create policy "financial_audit_logs_insert_member" on public.financial_audit_logs for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = financial_audit_logs.company_id and m.user_id = (select auth.uid())));

-- Portal tokens: service role only (no authenticated RLS policies)
alter table public.customer_portal_tokens enable row level security;

-- 20260626000000_v4_website_domain_engine.sql
-- FaraiOS V4 — Website Connection, Hosting & Domain Engine
-- Extends websites, connected_websites; adds domains, DNS records, deployments,
-- API key audit, tracking events, and lead-source fields on bookings.

-- ---------------------------------------------------------------------------
-- Extend connected_websites (external / hosted connection)
-- ---------------------------------------------------------------------------
alter table public.connected_websites
  add column if not exists name text,
  add column if not exists status text not null default 'draft',
  add column if not exists primary_domain text,
  add column if not exists preview_subdomain text,
  add column if not exists hosting_provider text,
  add column if not exists booking_enabled boolean not null default true,
  add column if not exists tracking_enabled boolean not null default true,
  add column if not exists seo_enabled boolean not null default false,
  add column if not exists api_key_status text not null default 'active',
  add column if not exists api_key_last_used_at timestamptz,
  add column if not exists website_id uuid references public.websites (id) on delete set null;

do $$
begin
  alter table public.connected_websites
    add constraint connected_websites_status_check
    check (status in (
      'draft', 'connected', 'verification_pending', 'verified', 'live', 'error', 'archived'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.connected_websites
    add constraint connected_websites_api_key_status_check
    check (api_key_status in ('active', 'revoked'));
exception
  when duplicate_object then null;
end $$;

create index if not exists connected_websites_status_idx
  on public.connected_websites (company_id, status);

-- ---------------------------------------------------------------------------
-- Extend websites (FaraiOS-hosted sites)
-- ---------------------------------------------------------------------------
alter table public.websites
  add column if not exists connection_status text not null default 'draft',
  add column if not exists hosting_provider text,
  add column if not exists booking_enabled boolean not null default true,
  add column if not exists tracking_enabled boolean not null default true,
  add column if not exists seo_connection_enabled boolean not null default false,
  add column if not exists preview_subdomain text;

do $$
begin
  alter table public.websites
    add constraint websites_connection_status_check
    check (connection_status in (
      'draft', 'connected', 'verification_pending', 'verified', 'live', 'error', 'archived'
    ));
exception
  when duplicate_object then null;
end $$;

-- Map legacy published status to live connection_status
update public.websites
set connection_status = 'live'
where status = 'published' and connection_status = 'draft';

-- ---------------------------------------------------------------------------
-- Extend hosting_subscriptions SSL status values
-- ---------------------------------------------------------------------------
alter table public.hosting_subscriptions
  drop constraint if exists hosting_subscriptions_ssl_status_check;

alter table public.hosting_subscriptions
  add constraint hosting_subscriptions_ssl_status_check
  check (ssl_status in ('not_started', 'pending', 'active', 'failed'));

-- ---------------------------------------------------------------------------
-- Domain records (primary, subdomain, preview)
-- ---------------------------------------------------------------------------
create table if not exists public.website_domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid references public.websites (id) on delete cascade,
  connected_website_id uuid references public.connected_websites (id) on delete cascade,
  domain text not null,
  domain_type text not null default 'primary',
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  verification_status text not null default 'pending',
  ssl_status text not null default 'not_started',
  hosting_provider text,
  provider_domain_id text,
  is_primary boolean not null default false,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_domains
    add constraint website_domains_domain_type_check
    check (domain_type in ('primary', 'subdomain', 'preview'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_domains
    add constraint website_domains_verification_status_check
    check (verification_status in ('pending', 'verified', 'failed'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_domains
    add constraint website_domains_ssl_status_check
    check (ssl_status in ('not_started', 'pending', 'active', 'failed'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists website_domains_domain_unique_idx
  on public.website_domains (lower(domain));

create index if not exists website_domains_company_idx
  on public.website_domains (company_id, verification_status);

-- ---------------------------------------------------------------------------
-- DNS instructions per domain
-- ---------------------------------------------------------------------------
create table if not exists public.website_dns_records (
  id uuid primary key default gen_random_uuid(),
  website_domain_id uuid not null references public.website_domains (id) on delete cascade,
  record_type text not null,
  host text not null,
  value text not null,
  status text not null default 'pending',
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_dns_records
    add constraint website_dns_records_type_check
    check (record_type in ('CNAME', 'A', 'TXT'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_dns_records
    add constraint website_dns_records_status_check
    check (status in ('pending', 'verified', 'failed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_dns_records_domain_idx
  on public.website_dns_records (website_domain_id);

-- ---------------------------------------------------------------------------
-- Deployments for FaraiOS-hosted websites
-- ---------------------------------------------------------------------------
create table if not exists public.website_deployments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid not null references public.websites (id) on delete cascade,
  environment text not null default 'production',
  status text not null default 'queued',
  hosting_provider text not null default 'vercel',
  provider_deployment_id text,
  build_error text,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_deployments
    add constraint website_deployments_environment_check
    check (environment in ('preview', 'production'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_deployments
    add constraint website_deployments_status_check
    check (status in ('queued', 'building', 'live', 'failed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_deployments_website_idx
  on public.website_deployments (website_id, created_at desc);

-- ---------------------------------------------------------------------------
-- API key audit log (rotation / usage)
-- ---------------------------------------------------------------------------
create table if not exists public.business_api_key_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  event_type text not null,
  key_prefix text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.business_api_key_events
    add constraint business_api_key_events_type_check
    check (event_type in ('generated', 'rotated', 'revoked', 'used'));
exception
  when duplicate_object then null;
end $$;

create index if not exists business_api_key_events_company_idx
  on public.business_api_key_events (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Website tracking events (connected external sites)
-- ---------------------------------------------------------------------------
create table if not exists public.website_tracking_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid references public.websites (id) on delete set null,
  connected_website_id uuid references public.connected_websites (id) on delete set null,
  event_type text not null,
  source_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_tracking_events
    add constraint website_tracking_events_type_check
    check (event_type in (
      'page_visit', 'booking_form_view', 'booking_submission',
      'quote_request', 'contact_submission'
    ));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_tracking_events_company_idx
  on public.website_tracking_events (company_id, created_at desc);

create index if not exists website_tracking_events_type_idx
  on public.website_tracking_events (company_id, event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Lead source fields on bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists website_id uuid references public.websites (id) on delete set null,
  add column if not exists device_type text;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.website_domains enable row level security;
alter table public.website_dns_records enable row level security;
alter table public.website_deployments enable row level security;
alter table public.business_api_key_events enable row level security;
alter table public.website_tracking_events enable row level security;

-- website_domains
drop policy if exists "website_domains_select_member" on public.website_domains;
create policy "website_domains_select_member" on public.website_domains
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_domains_insert_member" on public.website_domains;
create policy "website_domains_insert_member" on public.website_domains
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_domains_update_member" on public.website_domains;
create policy "website_domains_update_member" on public.website_domains
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_domains_delete_member" on public.website_domains;
create policy "website_domains_delete_member" on public.website_domains
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- website_dns_records (via domain ownership)
drop policy if exists "website_dns_records_select_member" on public.website_dns_records;
create policy "website_dns_records_select_member" on public.website_dns_records
  for select to authenticated
  using (
    exists (
      select 1
      from public.website_domains wd
      join public.memberships m on m.company_id = wd.company_id
      where wd.id = website_dns_records.website_domain_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_dns_records_insert_member" on public.website_dns_records;
create policy "website_dns_records_insert_member" on public.website_dns_records
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.website_domains wd
      join public.memberships m on m.company_id = wd.company_id
      where wd.id = website_dns_records.website_domain_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_dns_records_update_member" on public.website_dns_records;
create policy "website_dns_records_update_member" on public.website_dns_records
  for update to authenticated
  using (
    exists (
      select 1
      from public.website_domains wd
      join public.memberships m on m.company_id = wd.company_id
      where wd.id = website_dns_records.website_domain_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- website_deployments
drop policy if exists "website_deployments_select_member" on public.website_deployments;
create policy "website_deployments_select_member" on public.website_deployments
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_deployments.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_deployments_insert_member" on public.website_deployments;
create policy "website_deployments_insert_member" on public.website_deployments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_deployments.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_deployments_update_member" on public.website_deployments;
create policy "website_deployments_update_member" on public.website_deployments
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_deployments.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- business_api_key_events
drop policy if exists "business_api_key_events_select_member" on public.business_api_key_events;
create policy "business_api_key_events_select_member" on public.business_api_key_events
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = business_api_key_events.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- website_tracking_events
drop policy if exists "website_tracking_events_select_member" on public.website_tracking_events;
create policy "website_tracking_events_select_member" on public.website_tracking_events
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_tracking_events.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

grant select, insert, update, delete on table public.website_domains to authenticated;
grant select, insert, update on table public.website_dns_records to authenticated;
grant select, insert, update on table public.website_deployments to authenticated;
grant select on table public.business_api_key_events to authenticated;
grant select on table public.website_tracking_events to authenticated;

-- 20260626010000_verify_domains_supabase_cron.sql
-- Schedule domain DNS verification via Supabase Edge Function (pg_cron + pg_net).
-- Replaces the Vercel /api/cron/verify-domains route.
--
-- Prerequisites (one-time, in Supabase Dashboard → Project Settings → Vault):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
--
-- Deploy the edge function:
--   supabase functions deploy verify-domains

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Remove prior schedule if this migration is re-applied.
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'faraios-verify-domains' limit 1;
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end $$;

create or replace function public.invoke_verify_domains_edge_function()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url text;
  service_key text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if project_url is null or service_key is null then
    raise notice 'faraios-verify-domains: skipped — configure vault secrets project_url and service_role_key';
    return;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/verify-domains',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) into request_id;
end;
$$;

revoke all on function public.invoke_verify_domains_edge_function() from public;
grant execute on function public.invoke_verify_domains_edge_function() to postgres;

select cron.schedule(
  'faraios-verify-domains',
  '*/15 * * * *',
  $$ select public.invoke_verify_domains_edge_function(); $$
);

-- 20260627000000_v5_growth_engine.sql
-- FaraiOS V5 — SEO, Marketing & Growth Engine
-- Local SEO, service area pages, content posts, review requests,
-- email campaigns, leads, and attribution extensions.

-- ---------------------------------------------------------------------------
-- Local SEO settings (per company)
-- ---------------------------------------------------------------------------
create table if not exists public.local_seo_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  business_name text,
  industry text,
  main_service text,
  primary_location text,
  service_areas text[] not null default '{}',
  phone text,
  email text,
  address text,
  opening_hours jsonb not null default '{}'::jsonb,
  google_business_profile_url text,
  google_review_link text,
  business_categories text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  auto_review_request_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Service area landing pages
-- ---------------------------------------------------------------------------
create table if not exists public.service_area_pages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid references public.websites (id) on delete set null,
  slug text not null,
  service_name text not null,
  area_name text not null,
  seo_title text,
  meta_description text,
  h1 text,
  intro_content text,
  services_offered jsonb not null default '[]'::jsonb,
  nearby_areas jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  cta_text text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.service_area_pages
    add constraint service_area_pages_status_check
    check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists service_area_pages_company_slug_idx
  on public.service_area_pages (company_id, lower(slug));

create index if not exists service_area_pages_company_status_idx
  on public.service_area_pages (company_id, status);

-- ---------------------------------------------------------------------------
-- Content posts (blog, guides, articles, FAQs)
-- ---------------------------------------------------------------------------
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  slug text not null,
  meta_title text,
  meta_description text,
  featured_image text,
  category text not null default 'blog',
  author text,
  status text not null default 'draft',
  published_at timestamptz,
  content_body text,
  cta_text text,
  cta_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.content_posts
    add constraint content_posts_category_check
    check (category in ('blog', 'guide', 'service_article', 'faq'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.content_posts
    add constraint content_posts_status_check
    check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists content_posts_company_slug_idx
  on public.content_posts (company_id, lower(slug));

create index if not exists content_posts_company_status_idx
  on public.content_posts (company_id, status, published_at desc);

-- ---------------------------------------------------------------------------
-- Review requests
-- ---------------------------------------------------------------------------
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  customer_email text,
  customer_name text,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.review_requests
    add constraint review_requests_status_check
    check (status in ('sent', 'clicked', 'failed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists review_requests_company_idx
  on public.review_requests (company_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Email campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  campaign_type text not null default 'promotion',
  subject text not null,
  body_html text not null,
  status text not null default 'draft',
  sent_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  bookings_generated integer not null default 0,
  revenue_generated_cents integer not null default 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.email_campaigns
    add constraint email_campaigns_type_check
    check (campaign_type in (
      'promotion', 'follow_up', 'reactivation', 'seasonal', 'reminder'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.email_campaigns
    add constraint email_campaigns_status_check
    check (status in ('draft', 'scheduled', 'sent'));
exception
  when duplicate_object then null;
end $$;

create index if not exists email_campaigns_company_idx
  on public.email_campaigns (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Email unsubscribes
-- ---------------------------------------------------------------------------
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  unsubscribed_at timestamptz not null default now()
);

create unique index if not exists email_unsubscribes_company_email_idx
  on public.email_unsubscribes (company_id, lower(email));

-- ---------------------------------------------------------------------------
-- Leads (contact forms, quote requests)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text,
  email text,
  phone text,
  message text,
  lead_type text not null default 'contact',
  source text,
  source_website text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  conversion_page text,
  status text not null default 'new',
  customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.leads
    add constraint leads_type_check
    check (lead_type in ('contact', 'quote_request', 'general'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leads
    add constraint leads_status_check
    check (status in ('new', 'contacted', 'converted', 'archived'));
exception
  when duplicate_object then null;
end $$;

create index if not exists leads_company_idx
  on public.leads (company_id, created_at desc);

create index if not exists leads_company_utm_idx
  on public.leads (company_id, utm_source, created_at desc);

-- ---------------------------------------------------------------------------
-- Quote attribution (lead source tracking)
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists source text,
  add column if not exists source_website text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists landing_page text,
  add column if not exists conversion_page text;

-- Booking landing/conversion pages
alter table public.bookings
  add column if not exists landing_page text,
  add column if not exists conversion_page text;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.local_seo_settings enable row level security;
alter table public.service_area_pages enable row level security;
alter table public.content_posts enable row level security;
alter table public.review_requests enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_unsubscribes enable row level security;
alter table public.leads enable row level security;

-- Member policies (standard pattern)
drop policy if exists "local_seo_settings_select_member" on public.local_seo_settings;
create policy "local_seo_settings_select_member" on public.local_seo_settings
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = local_seo_settings.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "local_seo_settings_insert_member" on public.local_seo_settings;
create policy "local_seo_settings_insert_member" on public.local_seo_settings
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = local_seo_settings.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "local_seo_settings_update_member" on public.local_seo_settings;
create policy "local_seo_settings_update_member" on public.local_seo_settings
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = local_seo_settings.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- service_area_pages
drop policy if exists "service_area_pages_select_member" on public.service_area_pages;
create policy "service_area_pages_select_member" on public.service_area_pages
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "service_area_pages_insert_member" on public.service_area_pages;
create policy "service_area_pages_insert_member" on public.service_area_pages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "service_area_pages_update_member" on public.service_area_pages;
create policy "service_area_pages_update_member" on public.service_area_pages
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "service_area_pages_delete_member" on public.service_area_pages;
create policy "service_area_pages_delete_member" on public.service_area_pages
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- Public read for published service area pages
drop policy if exists "service_area_pages_select_published" on public.service_area_pages;
create policy "service_area_pages_select_published" on public.service_area_pages
  for select to anon, authenticated
  using (status = 'published');

-- content_posts (member CRUD + public read published)
drop policy if exists "content_posts_select_member" on public.content_posts;
create policy "content_posts_select_member" on public.content_posts
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_insert_member" on public.content_posts;
create policy "content_posts_insert_member" on public.content_posts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_update_member" on public.content_posts;
create policy "content_posts_update_member" on public.content_posts
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_delete_member" on public.content_posts;
create policy "content_posts_delete_member" on public.content_posts
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_select_published" on public.content_posts;
create policy "content_posts_select_published" on public.content_posts
  for select to anon, authenticated
  using (status = 'published');

-- review_requests
drop policy if exists "review_requests_select_member" on public.review_requests;
create policy "review_requests_select_member" on public.review_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = review_requests.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "review_requests_insert_member" on public.review_requests;
create policy "review_requests_insert_member" on public.review_requests
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = review_requests.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- email_campaigns
drop policy if exists "email_campaigns_select_member" on public.email_campaigns;
create policy "email_campaigns_select_member" on public.email_campaigns
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "email_campaigns_insert_member" on public.email_campaigns;
create policy "email_campaigns_insert_member" on public.email_campaigns
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "email_campaigns_update_member" on public.email_campaigns;
create policy "email_campaigns_update_member" on public.email_campaigns
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "email_campaigns_delete_member" on public.email_campaigns;
create policy "email_campaigns_delete_member" on public.email_campaigns
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- email_unsubscribes (member read; public insert via service role)
drop policy if exists "email_unsubscribes_select_member" on public.email_unsubscribes;
create policy "email_unsubscribes_select_member" on public.email_unsubscribes
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_unsubscribes.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- leads
drop policy if exists "leads_select_member" on public.leads;
create policy "leads_select_member" on public.leads
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = leads.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "leads_update_member" on public.leads;
create policy "leads_update_member" on public.leads
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = leads.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

grant select, insert, update on table public.local_seo_settings to authenticated;
grant select, insert, update, delete on table public.service_area_pages to authenticated;
grant select, insert, update, delete on table public.content_posts to authenticated;
grant select, insert on table public.review_requests to authenticated;
grant select, insert, update, delete on table public.email_campaigns to authenticated;
grant select on table public.email_unsubscribes to authenticated;
grant select, update on table public.leads to authenticated;

-- 20260628000000_v6_bi_automation_engine.sql
-- FaraiOS V6 — Business Intelligence, Automation & Customer Experience Engine
-- Permissions, workflows, tasks, notifications, staff profiles, retention, audit logs.

-- ---------------------------------------------------------------------------
-- Extend membership roles
-- ---------------------------------------------------------------------------
alter table public.memberships drop constraint if exists memberships_role_check;

alter table public.memberships
  add constraint memberships_role_check
  check (role in ('owner', 'admin', 'manager', 'staff', 'finance', 'marketing'));

-- ---------------------------------------------------------------------------
-- Permissions (system-wide definitions)
-- ---------------------------------------------------------------------------
create table if not exists public.permissions (
  key text primary key,
  label text not null,
  category text not null default 'general'
);

insert into public.permissions (key, label, category) values
  ('view_bookings', 'Can View Bookings', 'operations'),
  ('edit_bookings', 'Can Edit Bookings', 'operations'),
  ('view_revenue', 'Can View Revenue', 'finance'),
  ('create_invoices', 'Can Create Invoices', 'finance'),
  ('manage_staff', 'Can Manage Staff', 'team'),
  ('manage_marketing', 'Can Manage Marketing', 'growth'),
  ('manage_settings', 'Can Manage Settings', 'settings'),
  ('view_customers', 'Can View Customers', 'operations'),
  ('edit_customers', 'Can Edit Customers', 'operations'),
  ('view_reports', 'Can View Reports', 'finance'),
  ('manage_automations', 'Can Manage Automations', 'automation'),
  ('view_tasks', 'Can View Tasks', 'operations'),
  ('manage_tasks', 'Can Manage Tasks', 'operations'),
  ('view_ai_insights', 'Can View AI Insights', 'intelligence')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Role permissions (per company, per role)
-- ---------------------------------------------------------------------------
create table if not exists public.role_permissions (
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (company_id, role, permission_key)
);

create index if not exists role_permissions_company_role_idx
  on public.role_permissions (company_id, role);

-- ---------------------------------------------------------------------------
-- Custom company roles
-- ---------------------------------------------------------------------------
create table if not exists public.company_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  role_key text not null,
  label text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, role_key)
);

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  skills text[] not null default '{}',
  availability jsonb not null default '{}'::jsonb,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists staff_profiles_company_idx
  on public.staff_profiles (company_id);

-- ---------------------------------------------------------------------------
-- Workflows
-- ---------------------------------------------------------------------------
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.workflows
    add constraint workflows_trigger_type_check
    check (trigger_type in (
      'booking_created', 'booking_confirmed', 'booking_completed',
      'booking_cancelled', 'quote_accepted', 'invoice_paid',
      'customer_created', 'review_submitted', 'lead_created'
    ));
exception
  when duplicate_object then null;
end $$;

create index if not exists workflows_company_enabled_idx
  on public.workflows (company_id, enabled);

-- ---------------------------------------------------------------------------
-- Workflow runs
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  trigger_entity_type text,
  trigger_entity_id uuid,
  status text not null default 'pending',
  current_step_index int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text
);

do $$
begin
  alter table public.workflow_runs
    add constraint workflow_runs_status_check
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists workflow_runs_company_idx
  on public.workflow_runs (company_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Automation jobs (delayed steps)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs (id) on delete cascade,
  step_index int not null,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  executed_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.automation_jobs
    add constraint automation_jobs_status_check
    check (status in ('pending', 'completed', 'failed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists automation_jobs_pending_idx
  on public.automation_jobs (status, scheduled_for)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Internal tasks
-- ---------------------------------------------------------------------------
create table if not exists public.company_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references auth.users (id) on delete set null,
  status text not null default 'open',
  priority text not null default 'medium',
  due_date date,
  source_type text,
  source_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.company_tasks
    add constraint company_tasks_status_check
    check (status in ('open', 'in_progress', 'done', 'cancelled'));
  alter table public.company_tasks
    add constraint company_tasks_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent'));
exception
  when duplicate_object then null;
end $$;

create index if not exists company_tasks_company_status_idx
  on public.company_tasks (company_id, status);

-- ---------------------------------------------------------------------------
-- Customer tags (extend customers)
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists tags text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Customer segments
-- ---------------------------------------------------------------------------
create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  segment_type text not null,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.customer_segments
    add constraint customer_segments_type_check
    check (segment_type in (
      'high_value', 'repeat', 'inactive', 'new', 'custom'
    ));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Retention campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.retention_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  campaign_type text not null,
  segment_id uuid references public.customer_segments (id) on delete set null,
  message_template text,
  enabled boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.retention_campaigns
    add constraint retention_campaigns_type_check
    check (campaign_type in ('win_back', 'service_reminder', 'seasonal', 'loyalty'));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Unified notifications
-- ---------------------------------------------------------------------------
create table if not exists public.company_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists company_notifications_user_idx
  on public.company_notifications (company_id, user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- Company activity logs (unified audit)
-- ---------------------------------------------------------------------------
create table if not exists public.company_activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists company_activity_logs_company_idx
  on public.company_activity_logs (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Portal booking requests (reschedule/cancel)
-- ---------------------------------------------------------------------------
create table if not exists public.portal_booking_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  request_type text not null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.portal_booking_requests
    add constraint portal_booking_requests_type_check
    check (request_type in ('reschedule', 'cancel'));
  alter table public.portal_booking_requests
    add constraint portal_booking_requests_status_check
    check (status in ('pending', 'approved', 'declined'));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.company_roles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.company_tasks enable row level security;
alter table public.customer_segments enable row level security;
alter table public.retention_campaigns enable row level security;
alter table public.company_notifications enable row level security;
alter table public.company_activity_logs enable row level security;
alter table public.portal_booking_requests enable row level security;

-- Permissions: readable by all authenticated
drop policy if exists "permissions_select_all" on public.permissions;
create policy "permissions_select_all" on public.permissions
  for select to authenticated using (true);

-- Role permissions: company members
drop policy if exists "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select" on public.role_permissions
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "role_permissions_manage" on public.role_permissions;
create policy "role_permissions_manage" on public.role_permissions
  for all to authenticated
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- Company roles
drop policy if exists "company_roles_select" on public.company_roles;
create policy "company_roles_select" on public.company_roles
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "company_roles_manage" on public.company_roles;
create policy "company_roles_manage" on public.company_roles
  for all to authenticated
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- Staff profiles
drop policy if exists "staff_profiles_select" on public.staff_profiles;
create policy "staff_profiles_select" on public.staff_profiles
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "staff_profiles_manage" on public.staff_profiles;
create policy "staff_profiles_manage" on public.staff_profiles
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Workflows
drop policy if exists "workflows_select" on public.workflows;
create policy "workflows_select" on public.workflows
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "workflows_manage" on public.workflows;
create policy "workflows_manage" on public.workflows
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Workflow runs
drop policy if exists "workflow_runs_select" on public.workflow_runs;
create policy "workflow_runs_select" on public.workflow_runs
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "workflow_runs_insert" on public.workflow_runs;
create policy "workflow_runs_insert" on public.workflow_runs
  for insert to authenticated
  with check (public.is_company_member(company_id));

-- Automation jobs
drop policy if exists "automation_jobs_select" on public.automation_jobs;
create policy "automation_jobs_select" on public.automation_jobs
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

-- Tasks
drop policy if exists "company_tasks_select" on public.company_tasks;
create policy "company_tasks_select" on public.company_tasks
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "company_tasks_manage" on public.company_tasks;
create policy "company_tasks_manage" on public.company_tasks
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Customer segments
drop policy if exists "customer_segments_select" on public.customer_segments;
create policy "customer_segments_select" on public.customer_segments
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "customer_segments_manage" on public.customer_segments;
create policy "customer_segments_manage" on public.customer_segments
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Retention campaigns
drop policy if exists "retention_campaigns_select" on public.retention_campaigns;
create policy "retention_campaigns_select" on public.retention_campaigns
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "retention_campaigns_manage" on public.retention_campaigns;
create policy "retention_campaigns_manage" on public.retention_campaigns
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Notifications
drop policy if exists "company_notifications_select" on public.company_notifications;
create policy "company_notifications_select" on public.company_notifications
  for select to authenticated
  using (
    public.is_company_member(company_id)
    and (user_id is null or user_id = (select auth.uid()))
  );

drop policy if exists "company_notifications_update" on public.company_notifications;
create policy "company_notifications_update" on public.company_notifications
  for update to authenticated
  using (
    public.is_company_member(company_id)
    and (user_id is null or user_id = (select auth.uid()))
  );

-- Activity logs
drop policy if exists "company_activity_logs_select" on public.company_activity_logs;
create policy "company_activity_logs_select" on public.company_activity_logs
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "company_activity_logs_insert" on public.company_activity_logs;
create policy "company_activity_logs_insert" on public.company_activity_logs
  for insert to authenticated
  with check (public.is_company_member(company_id));

-- Portal booking requests (service role only for insert from portal API)
drop policy if exists "portal_booking_requests_select" on public.portal_booking_requests;
create policy "portal_booking_requests_select" on public.portal_booking_requests
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed default role permissions function
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_role_permissions(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Owner: all permissions
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'owner', key from public.permissions
  on conflict do nothing;

  -- Admin: all except manage_settings
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'admin', key from public.permissions
  where key <> 'manage_settings'
  on conflict do nothing;

  -- Manager: operations + team view
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'manager', unnest(array[
    'view_bookings', 'edit_bookings', 'view_customers', 'edit_customers',
    'view_tasks', 'manage_tasks', 'view_reports', 'view_ai_insights'
  ])
  on conflict do nothing;

  -- Staff: basic operations
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'staff', unnest(array[
    'view_bookings', 'edit_bookings', 'view_customers', 'view_tasks'
  ])
  on conflict do nothing;

  -- Finance
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'finance', unnest(array[
    'view_revenue', 'create_invoices', 'view_reports', 'view_customers'
  ])
  on conflict do nothing;

  -- Marketing
  insert into public.role_permissions (company_id, role, permission_key)
  select p_company_id, 'marketing', unnest(array[
    'manage_marketing', 'view_customers', 'view_reports', 'view_ai_insights'
  ])
  on conflict do nothing;
end;
$$;

grant execute on function public.seed_default_role_permissions(uuid) to authenticated;

-- Allow new roles in team management policies
drop policy if exists "memberships_insert_team" on public.memberships;
create policy "memberships_insert_team" on public.memberships
  for insert to authenticated
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'manager', 'staff', 'finance', 'marketing')
    and not public.membership_exists(company_id, user_id)
  );

drop policy if exists "memberships_update_owner" on public.memberships;
create policy "memberships_update_owner" on public.memberships
  for update to authenticated
  using (public.is_company_owner(company_id))
  with check (
    public.is_company_owner(company_id)
    and role in ('admin', 'manager', 'staff', 'finance', 'marketing')
    and user_id <> (select auth.uid())
  );
do $$
declare
  r record;
begin
  for r in select id from public.companies loop
    perform public.seed_default_role_permissions(r.id);
  end loop;
end $$;

-- 20260628100000_company_services_sort_order.sql
alter table public.company_services
  add column if not exists sort_order integer not null default 0;

create index if not exists company_services_company_sort_idx
  on public.company_services (company_id, sort_order, name);

-- 20260628110000_customer_segments_grants.sql
-- Grants for V6 customer segments (RLS policies exist in v6 migration but grants were missing).

grant select, insert, update, delete on table public.customer_segments to authenticated;
grant select, insert, update, delete on table public.retention_campaigns to authenticated;

-- 20260628120000_company_tasks_grants.sql
-- Grants for V6 company tasks (RLS policies exist in v6 migration but grants were missing).

grant select, insert, update, delete on table public.company_tasks to authenticated;

-- 20260628130000_v6_automation_notifications_grants.sql
-- Grants for V6 workflows and notifications (RLS policies exist but grants were missing).

grant select, insert, update, delete on table public.workflows to authenticated;
grant select, insert on table public.workflow_runs to authenticated;
grant select on table public.automation_jobs to authenticated;
grant select, update on table public.company_notifications to authenticated;
grant select, insert on table public.company_activity_logs to authenticated;

-- 20260628140000_website_domain_engine_grants.sql
-- Grants for V4 website domain engine (RLS policies exist but grants were missing).

grant select, insert, update, delete on table public.website_domains to authenticated;
grant select, insert, update on table public.website_dns_records to authenticated;
grant select, insert, update on table public.website_deployments to authenticated;
grant select on table public.business_api_key_events to authenticated;
grant select on table public.website_tracking_events to authenticated;

-- 20260628150000_v5_growth_engine_grants.sql
-- Grants for V5 growth engine (RLS policies exist but grants were missing).

grant select, insert, update on table public.local_seo_settings to authenticated;
grant select, insert, update, delete on table public.service_area_pages to authenticated;
grant select, insert, update, delete on table public.content_posts to authenticated;
grant select, insert on table public.review_requests to authenticated;
grant select, insert, update, delete on table public.email_campaigns to authenticated;
grant select on table public.email_unsubscribes to authenticated;
grant select, update on table public.leads to authenticated;

-- 20260629000000_team_roles_expansion.sql
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

-- 20260629150000_platform_monitoring.sql
-- Platform monitoring: audit logs, cron runs, API logs, email logs.

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_idx
  on public.platform_audit_logs (created_at desc);

create table if not exists public.platform_cron_jobs (
  id text primary key,
  name text not null,
  schedule text not null,
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.platform_cron_jobs (id) on delete cascade,
  status text not null check (status in ('success', 'failed')),
  output jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  duration_ms integer not null default 0 check (duration_ms >= 0)
);

create index if not exists platform_cron_runs_job_idx
  on public.platform_cron_runs (job_id, started_at desc);

create table if not exists public.platform_api_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  method text not null,
  status_code integer not null,
  company_id uuid references public.companies (id) on delete set null,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  error_message text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists platform_api_logs_created_idx
  on public.platform_api_logs (created_at desc);
create index if not exists platform_api_logs_company_idx
  on public.platform_api_logs (company_id, created_at desc);

create table if not exists public.platform_email_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  template text,
  to_address text not null,
  subject text,
  status text not null check (status in ('sent', 'failed', 'queued')),
  company_id uuid references public.companies (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists platform_email_logs_created_idx
  on public.platform_email_logs (created_at desc);

insert into public.platform_cron_jobs (id, name, schedule, description)
values
  (
    'process-automations',
    'Process Automations',
    '*/5 * * * *',
    'Processes pending workflow automation jobs via /api/cron/process-automations'
  ),
  (
    'verify-domains',
    'Verify Domains',
    '*/15 * * * *',
    'Verifies custom domain DNS via Supabase Edge Function'
  )
on conflict (id) do update set
  name = excluded.name,
  schedule = excluded.schedule,
  description = excluded.description;

alter table public.platform_audit_logs enable row level security;
alter table public.platform_cron_jobs enable row level security;
alter table public.platform_cron_runs enable row level security;
alter table public.platform_api_logs enable row level security;
alter table public.platform_email_logs enable row level security;

drop policy if exists "platform_audit_logs_select_admin" on public.platform_audit_logs;
create policy "platform_audit_logs_select_admin" on public.platform_audit_logs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_cron_jobs_select_admin" on public.platform_cron_jobs;
create policy "platform_cron_jobs_select_admin" on public.platform_cron_jobs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_cron_runs_select_admin" on public.platform_cron_runs;
create policy "platform_cron_runs_select_admin" on public.platform_cron_runs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_api_logs_select_admin" on public.platform_api_logs;
create policy "platform_api_logs_select_admin" on public.platform_api_logs
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_email_logs_select_admin" on public.platform_email_logs;
create policy "platform_email_logs_select_admin" on public.platform_email_logs
  for select to authenticated
  using (public.is_platform_admin());

grant select on table public.platform_audit_logs to authenticated;
grant select on table public.platform_cron_jobs to authenticated;
grant select on table public.platform_cron_runs to authenticated;
grant select on table public.platform_api_logs to authenticated;
grant select on table public.platform_email_logs to authenticated;

-- 20260629160000_platform_operations.sql
-- Platform operations: support tickets and feature requests.

create sequence if not exists public.platform_support_ticket_number_seq;

create table if not exists public.platform_support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number integer not null default nextval('public.platform_support_ticket_number_seq'),
  company_id uuid references public.companies (id) on delete set null,
  subject text not null,
  description text not null default '',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  category text not null default 'general'
    check (category in ('general', 'billing', 'technical', 'account')),
  requester_name text,
  requester_email text,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists platform_support_tickets_number_idx
  on public.platform_support_tickets (ticket_number);
create index if not exists platform_support_tickets_status_idx
  on public.platform_support_tickets (status, updated_at desc);
create index if not exists platform_support_tickets_company_idx
  on public.platform_support_tickets (company_id, updated_at desc);

create table if not exists public.platform_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.platform_support_tickets (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_email text,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists platform_support_messages_ticket_idx
  on public.platform_support_messages (ticket_id, created_at asc);

create table if not exists public.platform_feature_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  category text,
  vote_count integer not null default 0 check (vote_count >= 0),
  submitted_by_user_id uuid references auth.users (id) on delete set null,
  submitted_by_name text,
  submitted_by_email text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_feature_requests_status_idx
  on public.platform_feature_requests (status, updated_at desc);
create index if not exists platform_feature_requests_company_idx
  on public.platform_feature_requests (company_id, created_at desc);

alter table public.platform_support_tickets enable row level security;
alter table public.platform_support_messages enable row level security;
alter table public.platform_feature_requests enable row level security;

drop policy if exists "platform_support_tickets_select_admin" on public.platform_support_tickets;
create policy "platform_support_tickets_select_admin" on public.platform_support_tickets
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_support_messages_select_admin" on public.platform_support_messages;
create policy "platform_support_messages_select_admin" on public.platform_support_messages
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_feature_requests_select_admin" on public.platform_feature_requests;
create policy "platform_feature_requests_select_admin" on public.platform_feature_requests
  for select to authenticated
  using (public.is_platform_admin());

grant select on table public.platform_support_tickets to authenticated;
grant select on table public.platform_support_messages to authenticated;
grant select on table public.platform_feature_requests to authenticated;

-- 20260629170000_platform_operations_business_rls.sql
-- Business access to platform support, feature requests, and voting.

create table if not exists public.platform_feature_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.platform_feature_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index if not exists platform_feature_votes_request_idx
  on public.platform_feature_votes (request_id);
create index if not exists platform_feature_votes_user_idx
  on public.platform_feature_votes (user_id);

create or replace function public.sync_feature_request_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.platform_feature_requests
    set vote_count = vote_count + 1, updated_at = now()
    where id = NEW.request_id;
  elsif TG_OP = 'DELETE' then
    update public.platform_feature_requests
    set vote_count = greatest(vote_count - 1, 0), updated_at = now()
    where id = OLD.request_id;
  end if;
  return null;
end;
$$;

drop trigger if exists platform_feature_votes_sync_count on public.platform_feature_votes;
create trigger platform_feature_votes_sync_count
  after insert or delete on public.platform_feature_votes
  for each row execute function public.sync_feature_request_vote_count();

alter table public.platform_feature_votes enable row level security;

drop policy if exists "platform_support_tickets_select_member" on public.platform_support_tickets;
create policy "platform_support_tickets_select_member" on public.platform_support_tickets
  for select to authenticated
  using (
    company_id is not null
    and public.is_company_member(company_id)
  );

drop policy if exists "platform_support_tickets_insert_member" on public.platform_support_tickets;
create policy "platform_support_tickets_insert_member" on public.platform_support_tickets
  for insert to authenticated
  with check (
    company_id is not null
    and public.is_company_member(company_id)
  );

drop policy if exists "platform_support_messages_select_member" on public.platform_support_messages;
create policy "platform_support_messages_select_member" on public.platform_support_messages
  for select to authenticated
  using (
    is_internal = false
    and exists (
      select 1
      from public.platform_support_tickets t
      where t.id = ticket_id
        and t.company_id is not null
        and public.is_company_member(t.company_id)
    )
  );

drop policy if exists "platform_support_messages_insert_member" on public.platform_support_messages;
create policy "platform_support_messages_insert_member" on public.platform_support_messages
  for insert to authenticated
  with check (
    is_internal = false
    and exists (
      select 1
      from public.platform_support_tickets t
      where t.id = ticket_id
        and t.company_id is not null
        and public.is_company_member(t.company_id)
    )
  );

drop policy if exists "platform_feature_requests_select_member" on public.platform_feature_requests;
create policy "platform_feature_requests_select_member" on public.platform_feature_requests
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "platform_feature_requests_insert_member" on public.platform_feature_requests;
create policy "platform_feature_requests_insert_member" on public.platform_feature_requests
  for insert to authenticated
  with check (
    company_id is not null
    and public.is_company_member(company_id)
    and submitted_by_user_id = auth.uid()
  );

drop policy if exists "platform_feature_votes_select_member" on public.platform_feature_votes;
create policy "platform_feature_votes_select_member" on public.platform_feature_votes
  for select to authenticated
  using (user_id = auth.uid() or public.is_company_member(company_id));

drop policy if exists "platform_feature_votes_insert_member" on public.platform_feature_votes;
create policy "platform_feature_votes_insert_member" on public.platform_feature_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_company_member(company_id)
    and exists (
      select 1
      from public.platform_feature_requests r
      where r.id = request_id
        and r.status not in ('shipped', 'declined')
    )
  );

drop policy if exists "platform_feature_votes_delete_member" on public.platform_feature_votes;
create policy "platform_feature_votes_delete_member" on public.platform_feature_votes
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert on table public.platform_support_tickets to authenticated;
grant select, insert on table public.platform_support_messages to authenticated;
grant select, insert on table public.platform_feature_requests to authenticated;
grant select, insert, delete on table public.platform_feature_votes to authenticated;

-- 20260629180000_industry_modules_expansion.sql
-- Expand industries table for multi-industry platform support.
-- Aligns database seeds with lib/industry-modules registry.

alter table public.industries
  add column if not exists is_active boolean default true,
  add column if not exists sort_order int default 0,
  add column if not exists icon text,
  add column if not exists module_version text default '1.0.0';

insert into public.industries (name, slug, description, sort_order, is_active) values
  ('Cleaning Services', 'cleaning', 'Residential and commercial cleaning', 1, true),
  ('Beauty & Spa', 'beauty', 'Salons, spas, and wellness studios', 2, true),
  ('Technology Services', 'technology', 'IT support, repairs, and technology projects', 3, true),
  ('Tourism & Travel', 'tourism', 'Tours, travel experiences, and hospitality', 4, true),
  ('Plumbing', 'plumbing', 'Plumbing repairs, installations, and maintenance', 5, true),
  ('Electrical Services', 'electrical', 'Electrical installation, repair, and inspection', 6, true),
  ('Security Services', 'security', 'Security systems, monitoring, and guarding', 7, true),
  ('Gardening & Landscaping', 'gardening', 'Garden maintenance, landscaping, and outdoor services', 8, true),
  ('Real Estate', 'real-estate', 'Property services, agencies, and management', 9, true),
  ('Fitness & Gyms', 'fitness', 'Gyms, studios, and personal training', 10, true),
  ('Consulting', 'consulting', 'Professional consulting and advisory services', 11, true),
  ('Construction & Painting', 'construction', 'Construction, painting, and renovation projects', 12, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- 20260629200000_phase_b_company_branding_overdue.sql
-- Phase B: company branding, notification preferences, overdue invoice reminders

alter table public.companies
  add column if not exists brand_logo_url text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_accent_color text,
  add column if not exists notification_preferences jsonb not null default '{
    "emailBookingAlerts": true,
    "emailInvoiceAlerts": true,
    "emailLeadAlerts": true,
    "emailMarketingDigest": false
  }'::jsonb;

alter table public.invoices
  add column if not exists overdue_reminder_sent_at timestamptz;

insert into public.platform_cron_jobs (id, name, schedule, description)
values
  (
    'process-overdue-invoices',
    'Process Overdue Invoices',
    '0 8 * * *',
    'Marks overdue invoices and sends customer payment reminders via /api/cron/process-overdue-invoices'
  )
on conflict (id) do update set
  name = excluded.name,
  schedule = excluded.schedule,
  description = excluded.description;

-- 20260630000000_phase_c_growth_scale.sql
-- Phase C: Search Console integration tables

create table if not exists public.google_search_console_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  site_url text not null,
  property_url text,
  refresh_token text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (company_id)
);

create table if not exists public.seo_search_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  metric_date date not null,
  clicks int not null default 0,
  impressions int not null default 0,
  ctr numeric(6, 4) not null default 0,
  position numeric(6, 2) not null default 0,
  top_queries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, metric_date)
);

create index if not exists seo_search_metrics_company_date_idx
  on public.seo_search_metrics (company_id, metric_date desc);

alter table public.google_search_console_connections enable row level security;
alter table public.seo_search_metrics enable row level security;

drop policy if exists "gsc_connections_select" on public.google_search_console_connections;
create policy "gsc_connections_select" on public.google_search_console_connections
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "gsc_connections_manage" on public.google_search_console_connections;
create policy "gsc_connections_manage" on public.google_search_console_connections
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "seo_search_metrics_select" on public.seo_search_metrics;
create policy "seo_search_metrics_select" on public.seo_search_metrics
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

grant select, insert, update, delete on table public.google_search_console_connections to authenticated;
grant select, insert, update, delete on table public.seo_search_metrics to authenticated;

-- 20260630120000_sync_search_console_cron.sql
-- Register nightly Google Search Console metrics sync cron job.

insert into public.platform_cron_jobs (id, name, schedule, description)
values
  (
    'sync-search-console',
    'Sync Search Console Metrics',
    '0 6 * * *',
    'Pulls Search Analytics into seo_search_metrics via /api/cron/sync-search-console'
  )
on conflict (id) do update set
  name = excluded.name,
  schedule = excluded.schedule,
  description = excluded.description;

-- 20260630130000_subscription_enforcement.sql
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

-- 20260630140000_company_roles_grants.sql
-- Grants for V6 team roles / permissions (RLS policies exist but table grants were missing).

grant select on table public.permissions to authenticated;

grant select, insert, update, delete on table public.role_permissions to authenticated;

grant select, insert, update, delete on table public.company_roles to authenticated;

grant select, insert, update, delete on table public.staff_profiles to authenticated;

-- 20260701000000_v7_billing_engine.sql
-- V7: Billing, Plans & Access Control
-- Adds canonical plan catalog, subscription records, feature access matrix, and payment history.

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id text primary key,
  slug text not null unique,
  name text not null,
  monthly_price_cents integer,
  currency text not null default 'ZAR',
  is_custom boolean not null default false,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (id, slug, name, monthly_price_cents, is_custom, description, sort_order)
values
  ('plan_starter', 'starter', 'Starter', 9900, false, 'Perfect for solo operators and small businesses.', 1),
  ('plan_business', 'business', 'Business', 19900, false, 'For growing businesses that need sales tools.', 2),
  ('plan_pro', 'pro', 'Pro', 39900, false, 'For established businesses scaling operations.', 3),
  ('plan_enterprise', 'enterprise', 'Enterprise', null, true, 'Custom pricing for multi-branch organisations.', 4)
on conflict (id) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  is_custom = excluded.is_custom,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Migrate legacy premium slug to pro in plan catalog
insert into public.plans (id, slug, name, monthly_price_cents, is_custom, description, sort_order)
values ('plan_premium_legacy', 'premium', 'Pro (legacy)', 39900, false, 'Legacy premium slug mapped to Pro.', 99)
on conflict (id) do nothing;

update public.companies set plan = 'pro' where plan = 'premium';

-- ---------------------------------------------------------------------------
-- feature_access
-- ---------------------------------------------------------------------------
create table if not exists public.feature_access (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans (id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

-- Starter
insert into public.feature_access (plan_id, feature_key, enabled)
select 'plan_starter', f.key, f.enabled
from (values
  ('overview', true),
  ('customers', true),
  ('services', true),
  ('bookings', true),
  ('calendar', true),
  ('team', true),
  ('quotes', false),
  ('invoices', false),
  ('payments', false),
  ('reports', false),
  ('leads', false),
  ('seo', false),
  ('campaigns', false),
  ('reviews', false),
  ('websites', false),
  ('tasks', false),
  ('automations', false),
  ('recurringBookings', false),
  ('aiInsights', false),
  ('businessHealth', false),
  ('customRoles', false),
  ('multiBranch', false),
  ('customIntegrations', false)
) as f(key, enabled)
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Business
insert into public.feature_access (plan_id, feature_key, enabled)
select 'plan_business', f.key, f.enabled
from (values
  ('overview', true),
  ('customers', true),
  ('services', true),
  ('bookings', true),
  ('calendar', true),
  ('team', true),
  ('quotes', true),
  ('invoices', true),
  ('payments', true),
  ('reports', true),
  ('tasks', true),
  ('leads', false),
  ('seo', false),
  ('campaigns', false),
  ('reviews', false),
  ('websites', false),
  ('automations', false),
  ('recurringBookings', false),
  ('aiInsights', false),
  ('businessHealth', false),
  ('customRoles', false),
  ('multiBranch', false),
  ('customIntegrations', false)
) as f(key, enabled)
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Pro
insert into public.feature_access (plan_id, feature_key, enabled)
select 'plan_pro', f.key, f.enabled
from (values
  ('overview', true),
  ('customers', true),
  ('services', true),
  ('bookings', true),
  ('calendar', true),
  ('team', true),
  ('quotes', true),
  ('invoices', true),
  ('payments', true),
  ('reports', true),
  ('tasks', true),
  ('leads', true),
  ('seo', true),
  ('campaigns', true),
  ('reviews', true),
  ('websites', true),
  ('automations', true),
  ('recurringBookings', true),
  ('aiInsights', true),
  ('businessHealth', true),
  ('customRoles', false),
  ('multiBranch', false),
  ('customIntegrations', false)
) as f(key, enabled)
on conflict (plan_id, feature_key) do update set enabled = excluded.enabled;

-- Enterprise
insert into public.feature_access (plan_id, feature_key, enabled)
select 'plan_enterprise', f.key, true
from (values
  ('overview'),
  ('customers'),
  ('services'),
  ('bookings'),
  ('calendar'),
  ('team'),
  ('quotes'),
  ('invoices'),
  ('payments'),
  ('reports'),
  ('tasks'),
  ('leads'),
  ('seo'),
  ('campaigns'),
  ('reviews'),
  ('websites'),
  ('automations'),
  ('recurringBookings'),
  ('aiInsights'),
  ('businessHealth'),
  ('customRoles'),
  ('multiBranch'),
  ('customIntegrations')
) as f(key)
on conflict (plan_id, feature_key) do update set enabled = true;

-- ---------------------------------------------------------------------------
-- subscriptions (company_id = business tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  plan_id text not null references public.plans (id),
  status text not null default 'pending_payment',
  paystack_customer_id text,
  paystack_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_company_id_idx
  on public.subscriptions (company_id, created_at desc);

create unique index if not exists subscriptions_active_company_idx
  on public.subscriptions (company_id)
  where status in ('active', 'trialing');

-- ---------------------------------------------------------------------------
-- payment_history
-- ---------------------------------------------------------------------------
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  plan_id text not null references public.plans (id),
  amount integer not null,
  currency text not null default 'ZAR',
  status text not null default 'success',
  paystack_reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payment_history_company_id_idx
  on public.payment_history (company_id, paid_at desc nulls last);

-- Backfill payment_history from subscription_payments when present
insert into public.payment_history (
  company_id,
  plan_id,
  amount,
  currency,
  status,
  paystack_reference,
  paid_at,
  created_at
)
select
  sp.company_id,
  coalesce(p.id, 'plan_starter'),
  sp.amount_cents,
  sp.currency,
  sp.status,
  sp.paystack_reference,
  sp.paid_at,
  sp.created_at
from public.subscription_payments sp
left join public.plans p on p.slug = sp.plan_slug
where sp.paystack_reference is not null
on conflict (paystack_reference) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.feature_access enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_history enable row level security;

drop policy if exists "plans_select_all" on public.plans;
create policy "plans_select_all" on public.plans
  for select to authenticated
  using (true);

drop policy if exists "feature_access_select_all" on public.feature_access;
create policy "feature_access_select_all" on public.feature_access
  for select to authenticated
  using (true);

drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member" on public.subscriptions
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = subscriptions.company_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "payment_history_select_member" on public.payment_history;
create policy "payment_history_select_member" on public.payment_history
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = payment_history.company_id
        and m.user_id = (select auth.uid())
    )
  );

grant select on table public.plans to authenticated;
grant select on table public.feature_access to authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.payment_history to authenticated;

-- 20260702000000_v8_industry_templates.sql
-- V8: Industry Templates — company template tracking, service metadata, template catalog.

alter table public.companies
  add column if not exists industry_template_applied boolean not null default false;

alter table public.companies
  add column if not exists industry_template_key text;

alter table public.companies
  add column if not exists template_applied_at timestamptz;

alter table public.company_services
  add column if not exists industry_key text;

alter table public.company_services
  add column if not exists is_template_service boolean not null default false;

create table if not exists public.industry_templates (
  id uuid primary key default gen_random_uuid(),
  industry_key text not null unique,
  industry_name text not null,
  description text,
  template_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- V8 industries (add missing; keep legacy industries active)
insert into public.industries (name, slug, description, is_active, sort_order, icon, module_version)
values
  ('Repairs', 'repairs', 'Appliance, furniture, and general repair services', true, 3, 'wrench', '2.0.0'),
  ('Freelancers', 'freelancers', 'Independent freelancers and solo professionals', true, 6, 'user', '2.0.0'),
  ('Agencies', 'agencies', 'Marketing, design, and digital agencies', true, 8, 'megaphone', '2.0.0')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  icon = excluded.icon,
  module_version = excluded.module_version;

update public.industries set sort_order = 1, is_active = true where slug = 'cleaning';
update public.industries set sort_order = 2, is_active = true where slug = 'beauty';
update public.industries set sort_order = 4, is_active = true where slug = 'plumbing';
update public.industries set sort_order = 5, is_active = true where slug = 'electrical';
update public.industries set sort_order = 7, is_active = true where slug = 'consulting';
update public.industries set sort_order = 9, is_active = true where slug = 'construction';

-- Alias consultants → consulting
insert into public.industries (name, slug, description, is_active, sort_order, icon, module_version)
select 'Consultants', 'consultants', description, is_active, sort_order, icon, module_version
from public.industries where slug = 'consulting'
on conflict (slug) do nothing;

alter table public.industry_templates enable row level security;

drop policy if exists "industry_templates_select_all" on public.industry_templates;
create policy "industry_templates_select_all" on public.industry_templates
  for select to authenticated
  using (true);

grant select on table public.industry_templates to authenticated;

-- 20260703000000_v9_website_builder.sql
-- V9: Website Builder — pages, service pages, enquiries, domain settings.

-- Allow draft / published / unpublished for builder publish workflow.
alter table public.websites drop constraint if exists websites_status_check;
alter table public.websites
  add constraint websites_status_check
  check (status in ('draft', 'published', 'unpublished'));

alter table public.websites
  add column if not exists slug text;

alter table public.websites
  add column if not exists title text;

alter table public.websites
  add column if not exists description text;

alter table public.websites
  add column if not exists theme_settings jsonb not null default '{}'::jsonb;

alter table public.websites
  add column if not exists builder_mode boolean not null default false;

alter table public.websites
  add column if not exists og_title text;

alter table public.websites
  add column if not exists og_description text;

alter table public.websites
  add column if not exists og_image_url text;

alter table public.websites
  add column if not exists published_at timestamptz;

alter table public.websites
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists websites_company_slug_idx
  on public.websites (client_id, slug)
  where slug is not null;

create table if not exists public.website_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  page_type text not null default 'custom',
  title text not null,
  slug text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, slug)
);

do $$
begin
  alter table public.website_pages
    add constraint website_pages_status_check
    check (status in ('draft', 'published', 'unpublished'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.website_service_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid references public.company_services (id) on delete set null,
  slug text not null,
  title text not null,
  description text,
  starting_price text,
  duration text,
  benefits jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  image_url text,
  status text not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, slug)
);

do $$
begin
  alter table public.website_service_pages
    add constraint website_service_pages_status_check
    check (status in ('draft', 'published', 'unpublished'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.website_enquiries (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  service_interest text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.domain_settings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  default_url text,
  requested_subdomain text,
  custom_domain text,
  custom_domain_status text not null default 'coming_soon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id)
);

create index if not exists website_pages_company_id_idx on public.website_pages (company_id);
create index if not exists website_service_pages_company_id_idx on public.website_service_pages (company_id);
create index if not exists website_enquiries_company_id_idx on public.website_enquiries (company_id, created_at desc);

alter table public.website_pages enable row level security;
alter table public.website_service_pages enable row level security;
alter table public.website_enquiries enable row level security;
alter table public.domain_settings enable row level security;

drop policy if exists "website_pages_member" on public.website_pages;
create policy "website_pages_member" on public.website_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_pages.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_pages.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "website_service_pages_member" on public.website_service_pages;
create policy "website_service_pages_member" on public.website_service_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_service_pages.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_service_pages.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "website_enquiries_member_select" on public.website_enquiries;
create policy "website_enquiries_member_select" on public.website_enquiries
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_enquiries.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "domain_settings_member" on public.domain_settings;
create policy "domain_settings_member" on public.domain_settings
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = domain_settings.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = domain_settings.company_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.website_pages to authenticated;
grant select, insert, update, delete on public.website_service_pages to authenticated;
grant select on public.website_enquiries to authenticated;
grant select, insert, update, delete on public.domain_settings to authenticated;

-- 20260704000000_v10_seo_platform.sql
-- FaraiOS V10 — Enterprise SEO Platform
-- Extends V5 Growth Engine with crawl, scoring, redirects, 404 monitor, and modular SEO tables.

-- ---------------------------------------------------------------------------
-- Extend local_seo_settings for V10 local SEO
-- ---------------------------------------------------------------------------
alter table public.local_seo_settings
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists google_maps_url text,
  add column if not exists logo_url text,
  add column if not exists whatsapp text,
  add column if not exists knowledge_graph_data jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- SEO Projects (one or more per company)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null default 'Main website',
  website_url text,
  domain text,
  language text not null default 'en',
  country text not null default 'ZA',
  business_type text,
  default_schema_type text not null default 'LocalBusiness',
  sitemap_url text,
  robots_txt_url text,
  gsc_connected boolean not null default false,
  ga_connected boolean not null default false,
  gbp_connected boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_projects_company_idx on public.seo_projects (company_id);

-- ---------------------------------------------------------------------------
-- SEO Pages (inventoried / crawled pages)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  url text not null,
  path text,
  page_type text not null default 'page',
  source_table text,
  source_id uuid,
  http_status int,
  is_indexable boolean not null default true,
  canonical_url text,
  meta_title text,
  meta_description text,
  h1 text,
  h2_count int not null default 0,
  h3_count int not null default 0,
  internal_links int not null default 0,
  external_links int not null default 0,
  broken_links int not null default 0,
  has_schema boolean not null default false,
  has_og_tags boolean not null default false,
  has_twitter_cards boolean not null default false,
  is_https boolean not null default true,
  robots_meta text,
  content_length int not null default 0,
  last_crawled_at timestamptz,
  seo_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_pages_project_url_idx
  on public.seo_pages (project_id, url);
create index if not exists seo_pages_company_idx on public.seo_pages (company_id);

-- ---------------------------------------------------------------------------
-- SEO Crawls
-- ---------------------------------------------------------------------------
create table if not exists public.seo_crawls (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'pending',
  pages_scanned int not null default 0,
  critical_issues int not null default 0,
  warnings int not null default 0,
  passed_checks int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

do $$
begin
  alter table public.seo_crawls
    add constraint seo_crawls_status_check
    check (status in ('pending', 'running', 'completed', 'failed'));
exception when duplicate_object then null;
end $$;

create index if not exists seo_crawls_project_idx on public.seo_crawls (project_id, started_at desc);

-- ---------------------------------------------------------------------------
-- SEO Analysis (per-page issue breakdown)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_analysis (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  crawl_id uuid references public.seo_crawls (id) on delete set null,
  company_id uuid not null references public.companies (id) on delete cascade,
  score int not null default 0,
  issues jsonb not null default '[]'::jsonb,
  critical_count int not null default 0,
  warning_count int not null default 0,
  passed_count int not null default 0,
  recommendation_count int not null default 0,
  analyzed_at timestamptz not null default now()
);

create index if not exists seo_analysis_page_idx on public.seo_analysis (page_id, analyzed_at desc);

-- ---------------------------------------------------------------------------
-- Focus Keywords
-- ---------------------------------------------------------------------------
create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  keyword text not null,
  is_primary boolean not null default false,
  in_title boolean not null default false,
  in_url boolean not null default false,
  in_meta_description boolean not null default false,
  in_first_paragraph boolean not null default false,
  in_headings boolean not null default false,
  in_image_alt boolean not null default false,
  in_conclusion boolean not null default false,
  density_percent numeric(5,2) not null default 0,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_keywords_page_idx on public.seo_keywords (page_id);
create unique index if not exists seo_keywords_page_keyword_idx
  on public.seo_keywords (page_id, lower(keyword));

-- ---------------------------------------------------------------------------
-- Keyword Rankings (placeholder)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_keyword_rankings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  keyword text not null,
  position numeric(6,2),
  url text,
  source text not null default 'manual',
  recorded_at timestamptz not null default now()
);

create index if not exists seo_keyword_rankings_company_idx
  on public.seo_keyword_rankings (company_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Extended Meta per page
-- ---------------------------------------------------------------------------
create table if not exists public.seo_meta (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  seo_title text,
  meta_description text,
  canonical_url text,
  robots_meta text,
  og_title text,
  og_description text,
  og_image text,
  twitter_title text,
  twitter_description text,
  twitter_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_meta_page_idx on public.seo_meta (page_id);

-- ---------------------------------------------------------------------------
-- Schema records
-- ---------------------------------------------------------------------------
create table if not exists public.seo_schema (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  page_id uuid references public.seo_pages (id) on delete set null,
  schema_type text not null,
  json_ld jsonb not null default '{}'::jsonb,
  is_valid boolean not null default false,
  validation_errors jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_schema_project_idx on public.seo_schema (project_id);

-- ---------------------------------------------------------------------------
-- Redirects
-- ---------------------------------------------------------------------------
create table if not exists public.seo_redirects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  source_url text not null,
  destination_url text,
  status_code int not null default 301,
  hits int not null default 0,
  last_visit_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.seo_redirects
    add constraint seo_redirects_status_code_check
    check (status_code in (301, 302, 307, 308, 410, 451));
exception when duplicate_object then null;
end $$;

create unique index if not exists seo_redirects_project_source_idx
  on public.seo_redirects (project_id, lower(source_url));

-- ---------------------------------------------------------------------------
-- 404 Logs (privacy-safe — no PII stored)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_404_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  missing_url text not null,
  referrer_host text,
  user_agent_family text,
  occurrences int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists seo_404_logs_project_idx
  on public.seo_404_logs (project_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Sitemaps
-- ---------------------------------------------------------------------------
create table if not exists public.seo_sitemaps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  include_pages boolean not null default true,
  include_posts boolean not null default true,
  include_products boolean not null default false,
  include_categories boolean not null default false,
  include_images boolean not null default true,
  include_videos boolean not null default false,
  include_news boolean not null default false,
  exclusions jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  last_generated_at timestamptz,
  url_count int not null default 0,
  sitemap_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.seo_sitemaps
    add constraint seo_sitemaps_status_check
    check (status in ('pending', 'generating', 'ok', 'error'));
exception when duplicate_object then null;
end $$;

create unique index if not exists seo_sitemaps_project_idx on public.seo_sitemaps (project_id);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists public.seo_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  report_type text not null default 'health',
  title text not null,
  data jsonb not null default '{}'::jsonb,
  seo_score int,
  health_score int,
  created_at timestamptz not null default now()
);

create index if not exists seo_reports_project_idx
  on public.seo_reports (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Integrations (OAuth-ready)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid references public.seo_projects (id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.seo_integrations
    add constraint seo_integrations_provider_check
    check (provider in ('google_search_console', 'google_analytics', 'google_business_profile', 'google_indexing_api'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.seo_integrations
    add constraint seo_integrations_status_check
    check (status in ('disconnected', 'connected', 'error'));
exception when duplicate_object then null;
end $$;

create unique index if not exists seo_integrations_company_provider_idx
  on public.seo_integrations (company_id, provider);

-- ---------------------------------------------------------------------------
-- Project settings (robots.txt, crawl config)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_settings (
  project_id uuid primary key references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  robots_txt_content text,
  robots_allow_rules text[] not null default '{}',
  robots_disallow_rules text[] not null default '{}',
  crawl_delay int,
  sitemap_reference text,
  auto_crawl_enabled boolean not null default false,
  crawl_frequency_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Health history (trends)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_health_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  seo_score int not null default 0,
  health_score int not null default 0,
  pages_scanned int not null default 0,
  critical_issues int not null default 0,
  warnings int not null default 0,
  passed_checks int not null default 0,
  recorded_at date not null default current_date
);

create unique index if not exists seo_health_history_project_date_idx
  on public.seo_health_history (project_id, recorded_at);

-- ---------------------------------------------------------------------------
-- Image SEO issues (denormalized for dashboard)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_image_issues (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  image_url text not null,
  issue_type text not null,
  recommendation text,
  file_size_kb int,
  created_at timestamptz not null default now()
);

create index if not exists seo_image_issues_company_idx on public.seo_image_issues (company_id);

-- ---------------------------------------------------------------------------
-- RLS helper macro pattern — member or platform admin
-- ---------------------------------------------------------------------------
alter table public.seo_projects enable row level security;
alter table public.seo_pages enable row level security;
alter table public.seo_crawls enable row level security;
alter table public.seo_analysis enable row level security;
alter table public.seo_keywords enable row level security;
alter table public.seo_keyword_rankings enable row level security;
alter table public.seo_meta enable row level security;
alter table public.seo_schema enable row level security;
alter table public.seo_redirects enable row level security;
alter table public.seo_404_logs enable row level security;
alter table public.seo_sitemaps enable row level security;
alter table public.seo_reports enable row level security;
alter table public.seo_integrations enable row level security;
alter table public.seo_settings enable row level security;
alter table public.seo_health_history enable row level security;
alter table public.seo_image_issues enable row level security;

-- seo_projects policies
drop policy if exists "seo_projects_select_member" on public.seo_projects;
create policy "seo_projects_select_member" on public.seo_projects
  for select to authenticated
  using (
    exists (select 1 from public.memberships m where m.company_id = seo_projects.company_id and m.user_id = (select auth.uid()))
    or public.is_platform_admin()
  );

drop policy if exists "seo_projects_insert_member" on public.seo_projects;
create policy "seo_projects_insert_member" on public.seo_projects
  for insert to authenticated
  with check (
    exists (select 1 from public.memberships m where m.company_id = seo_projects.company_id and m.user_id = (select auth.uid()))
    or public.is_platform_admin()
  );

drop policy if exists "seo_projects_update_member" on public.seo_projects;
create policy "seo_projects_update_member" on public.seo_projects
  for update to authenticated
  using (
    exists (select 1 from public.memberships m where m.company_id = seo_projects.company_id and m.user_id = (select auth.uid()))
    or public.is_platform_admin()
  );

-- Generic member policies for child tables (company_id based)
do $policy$
declare
  tbl text;
  tables text[] := array[
    'seo_pages', 'seo_crawls', 'seo_analysis', 'seo_keywords', 'seo_keyword_rankings',
    'seo_meta', 'seo_schema', 'seo_redirects', 'seo_404_logs', 'seo_sitemaps',
    'seo_reports', 'seo_integrations', 'seo_settings', 'seo_health_history', 'seo_image_issues'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists "%s_select_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_select_member" on public.%s for select to authenticated using (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
    execute format('drop policy if exists "%s_insert_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_insert_member" on public.%s for insert to authenticated with check (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
    execute format('drop policy if exists "%s_update_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_update_member" on public.%s for update to authenticated using (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
    execute format('drop policy if exists "%s_delete_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_delete_member" on public.%s for delete to authenticated using (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
  end loop;
end $policy$;

-- Allow anon insert on 404 logs via service role only (no anon policy)

-- 20260704010000_v10_seo_platform_grants.sql
-- Grants for V10 SEO platform tables

grant select, insert, update on table public.seo_projects to authenticated;
grant select, insert, update, delete on table public.seo_pages to authenticated;
grant select, insert, update on table public.seo_crawls to authenticated;
grant select, insert, update, delete on table public.seo_analysis to authenticated;
grant select, insert, update, delete on table public.seo_keywords to authenticated;
grant select, insert, update, delete on table public.seo_keyword_rankings to authenticated;
grant select, insert, update, delete on table public.seo_meta to authenticated;
grant select, insert, update, delete on table public.seo_schema to authenticated;
grant select, insert, update, delete on table public.seo_redirects to authenticated;
grant select, insert, update, delete on table public.seo_404_logs to authenticated;
grant select, insert, update on table public.seo_sitemaps to authenticated;
grant select, insert on table public.seo_reports to authenticated;
grant select, insert, update on table public.seo_integrations to authenticated;
grant select, insert, update on table public.seo_settings to authenticated;
grant select, insert, update on table public.seo_health_history to authenticated;
grant select, insert, delete on table public.seo_image_issues to authenticated;

-- 20260704100000_platform_integration_settings.sql
-- Platform-level OAuth credentials for customer integrations (admin-managed).

alter table public.platform_settings
  add column if not exists integration_settings jsonb not null default '{}'::jsonb;

-- 20260705000000_v11_booking_form_builder.sql
-- V11 Booking Form Builder: pricing rules, extras, service areas, price snapshots, notifications.

-- ---------------------------------------------------------------------------
-- Extend booking_forms with builder settings
-- ---------------------------------------------------------------------------
alter table public.booking_forms
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Pricing rules (per business, optionally per service)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_form_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  service_id uuid references public.company_services(id) on delete cascade,
  base_price_cents integer not null default 0,
  price_per_bedroom_cents integer not null default 0,
  price_per_bathroom_cents integer not null default 0,
  service_fee_cents integer not null default 0,
  minimum_price_cents integer not null default 0,
  maximum_price_cents integer,
  frequency_discounts jsonb not null default '{}'::jsonb,
  vat_rate_percent numeric(5,2) not null default 0,
  custom_quote_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_form_pricing_rules_company_idx
  on public.booking_form_pricing_rules(company_id);
create unique index if not exists booking_form_pricing_rules_company_service_uidx
  on public.booking_form_pricing_rules(company_id, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------------
-- Form extras (business-wide add-ons beyond service addons)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_form_extras (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_form_extras_company_idx
  on public.booking_form_extras(company_id);

-- ---------------------------------------------------------------------------
-- Service areas
-- ---------------------------------------------------------------------------
create table if not exists public.booking_form_service_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_form_service_areas_company_idx
  on public.booking_form_service_areas(company_id);

-- ---------------------------------------------------------------------------
-- Price snapshots (immutable pricing at booking time)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  breakdown jsonb not null default '[]'::jsonb,
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  service_fee_cents integer not null default 0,
  vat_cents integer not null default 0,
  total_cents integer not null default 0,
  pricing_rules_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_price_snapshots_booking_idx
  on public.booking_price_snapshots(booking_id);
create index if not exists booking_price_snapshots_company_idx
  on public.booking_price_snapshots(company_id);

alter table public.bookings
  add column if not exists pricing_snapshot_id uuid references public.booking_price_snapshots(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Booking notifications log
-- ---------------------------------------------------------------------------
create table if not exists public.booking_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  type text not null default 'created',
  channel text not null default 'email',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_notifications_company_idx
  on public.booking_notifications(company_id);
create index if not exists booking_notifications_booking_idx
  on public.booking_notifications(booking_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.booking_form_pricing_rules enable row level security;
alter table public.booking_form_extras enable row level security;
alter table public.booking_form_service_areas enable row level security;
alter table public.booking_price_snapshots enable row level security;
alter table public.booking_notifications enable row level security;

grant select, insert, update, delete on table public.booking_form_pricing_rules to authenticated;
grant select, insert, update, delete on table public.booking_form_extras to authenticated;
grant select, insert, update, delete on table public.booking_form_service_areas to authenticated;
grant select on table public.booking_price_snapshots to authenticated;
grant select on table public.booking_notifications to authenticated;

-- pricing_rules
drop policy if exists "booking_form_pricing_rules_member" on public.booking_form_pricing_rules;
create policy "booking_form_pricing_rules_member" on public.booking_form_pricing_rules
  for all to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin())
  with check (public.is_company_member(company_id) or public.is_platform_admin());

-- extras
drop policy if exists "booking_form_extras_member" on public.booking_form_extras;
create policy "booking_form_extras_member" on public.booking_form_extras
  for all to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin())
  with check (public.is_company_member(company_id) or public.is_platform_admin());

-- service areas
drop policy if exists "booking_form_service_areas_member" on public.booking_form_service_areas;
create policy "booking_form_service_areas_member" on public.booking_form_service_areas
  for all to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin())
  with check (public.is_company_member(company_id) or public.is_platform_admin());

-- price snapshots (members read own company)
drop policy if exists "booking_price_snapshots_member" on public.booking_price_snapshots;
create policy "booking_price_snapshots_member" on public.booking_price_snapshots
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

-- notifications
drop policy if exists "booking_notifications_member" on public.booking_notifications;
create policy "booking_notifications_member" on public.booking_notifications
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

-- 20260705120000_companies_updated_at.sql
-- companies.updated_at was referenced in app code but never added to schema.

alter table public.companies
  add column if not exists updated_at timestamptz default now();

update public.companies
set updated_at = coalesce(created_at, now())
where updated_at is null;

-- 20260706000000_hosting_automation_engine.sql
-- WHMCS-inspired hosting automation: plans, orders, invoices, services, Plesk provisioning.

-- ---------------------------------------------------------------------------
-- Hosting plans (admin-managed product catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  monthly_price_cents int not null default 0,
  yearly_price_cents int not null default 0,
  storage_limit_gb int not null default 5,
  bandwidth_limit_gb int not null default 5,
  email_account_limit int not null default 1,
  database_limit int not null default 1,
  domain_limit int not null default 1,
  ssl_included boolean not null default true,
  backup_option text not null default 'daily',
  plesk_service_plan text,
  is_active boolean not null default true,
  is_popular boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hosting servers (Plesk server inventory)
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hostname text not null,
  plesk_url text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  default_nameservers text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hosting orders
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plan_id uuid not null references public.hosting_plans (id),
  domain_name text not null,
  domain_type text not null default 'new',
  billing_cycle text not null default 'monthly',
  status text not null default 'pending',
  invoice_id uuid,
  payment_status text not null default 'unpaid',
  provisioning_status text not null default 'pending',
  server_id uuid references public.hosting_servers (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_orders
    add constraint hosting_orders_status_check
    check (status in ('pending', 'paid', 'provisioning', 'active', 'failed', 'cancelled'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hosting_orders
    add constraint hosting_orders_billing_cycle_check
    check (billing_cycle in ('monthly', 'yearly'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hosting_orders
    add constraint hosting_orders_domain_type_check
    check (domain_type in ('new', 'existing', 'transfer'));
exception when duplicate_object then null;
end $$;

create index if not exists hosting_orders_company_id_idx on public.hosting_orders (company_id);
create index if not exists hosting_orders_status_idx on public.hosting_orders (status);

-- ---------------------------------------------------------------------------
-- Hosting invoices
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid references public.hosting_orders (id) on delete set null,
  service_id uuid,
  amount_cents int not null,
  tax_cents int not null default 0,
  currency text not null default 'ZAR',
  status text not null default 'unpaid',
  due_date timestamptz not null,
  paid_at timestamptz,
  payment_provider text,
  paystack_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_invoices
    add constraint hosting_invoices_status_check
    check (status in ('draft', 'unpaid', 'paid', 'overdue', 'cancelled', 'refunded'));
exception when duplicate_object then null;
end $$;

create index if not exists hosting_invoices_company_id_idx on public.hosting_invoices (company_id);
create unique index if not exists hosting_invoices_paystack_ref_idx
  on public.hosting_invoices (paystack_reference) where paystack_reference is not null;

-- Add FK from orders to invoices after invoices table exists
do $$
begin
  alter table public.hosting_orders
    add constraint hosting_orders_invoice_id_fkey
    foreign key (invoice_id) references public.hosting_invoices (id) on delete set null;
exception when duplicate_object then null;
end $$;

-- Extend existing hosting_payments with order/invoice links
alter table public.hosting_payments
  add column if not exists order_id uuid references public.hosting_orders (id) on delete set null,
  add column if not exists invoice_id uuid references public.hosting_invoices (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Hosting services (provisioned accounts)
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  order_id uuid references public.hosting_orders (id) on delete set null,
  invoice_id uuid references public.hosting_invoices (id) on delete set null,
  plan_id uuid not null references public.hosting_plans (id),
  domain_name text not null,
  server_id uuid references public.hosting_servers (id) on delete set null,
  plesk_subscription_id text,
  username text,
  status text not null default 'pending',
  billing_cycle text not null default 'monthly',
  next_due_date timestamptz,
  suspended_at timestamptz,
  terminated_at timestamptz,
  control_panel_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_services
    add constraint hosting_services_status_check
    check (status in ('active', 'suspended', 'terminated', 'pending', 'failed'));
exception when duplicate_object then null;
end $$;

create index if not exists hosting_services_company_id_idx on public.hosting_services (company_id);
create index if not exists hosting_services_status_idx on public.hosting_services (status);

-- Add service FK on invoices
do $$
begin
  alter table public.hosting_invoices
    add constraint hosting_invoices_service_id_fkey
    foreign key (service_id) references public.hosting_services (id) on delete set null;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Provisioning logs
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_provisioning_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  order_id uuid references public.hosting_orders (id) on delete set null,
  service_id uuid references public.hosting_services (id) on delete set null,
  server_id uuid references public.hosting_servers (id) on delete set null,
  action text not null,
  status text not null default 'pending',
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists hosting_provisioning_logs_order_id_idx
  on public.hosting_provisioning_logs (order_id);

-- ---------------------------------------------------------------------------
-- Usage snapshots
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  disk_used_mb int not null default 0,
  bandwidth_used_mb int not null default 0,
  email_accounts_used int not null default 0,
  databases_used int not null default 0,
  synced_at timestamptz not null default now()
);

create index if not exists hosting_usage_snapshots_service_id_idx
  on public.hosting_usage_snapshots (service_id, synced_at desc);

-- ---------------------------------------------------------------------------
-- Hosting domains
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid references public.hosting_services (id) on delete set null,
  domain_name text not null,
  domain_type text not null default 'primary',
  nameservers text[] not null default '{}',
  dns_status text not null default 'pending',
  expiry_date timestamptz,
  renewal_status text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_domains
    add constraint hosting_domains_dns_status_check
    check (dns_status in ('pending', 'active', 'failed', 'unknown'));
exception when duplicate_object then null;
end $$;

create unique index if not exists hosting_domains_domain_unique_idx
  on public.hosting_domains (lower(domain_name));

-- ---------------------------------------------------------------------------
-- Support tickets (hosting-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_support_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid references public.hosting_services (id) on delete set null,
  subject text not null,
  department text not null default 'hosting',
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_support_tickets
    add constraint hosting_support_tickets_status_check
    check (status in ('open', 'answered', 'waiting_customer', 'closed'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hosting_support_tickets
    add constraint hosting_support_tickets_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'));
exception when duplicate_object then null;
end $$;

create table if not exists public.hosting_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.hosting_support_tickets (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  is_staff boolean not null default false,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hosting email logs
-- ---------------------------------------------------------------------------
create table if not exists public.hosting_email_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  order_id uuid references public.hosting_orders (id) on delete set null,
  service_id uuid references public.hosting_services (id) on delete set null,
  template_key text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seed default hosting plans from legacy catalog
-- ---------------------------------------------------------------------------
insert into public.hosting_plans (
  slug, name, description, monthly_price_cents, yearly_price_cents,
  storage_limit_gb, bandwidth_limit_gb, email_account_limit, database_limit,
  domain_limit, ssl_included, backup_option, plesk_service_plan, is_active, is_popular, sort_order
) values
  ('shared-basic', 'Shared Basic', 'Affordable hosting for a single site.', 4900, 49000, 5, 5, 1, 1, 1, true, 'daily', 'shared-basic', true, false, 1),
  ('shared-pro', 'Shared Pro', 'Best value for growing businesses.', 9900, 99000, 20, 20, 5, 5, 3, true, 'daily', 'shared-pro', true, true, 2),
  ('business-hosting', 'Business Hosting', 'Powerful hosting for agencies.', 19900, 199000, 50, 50, 25, 25, 10, true, 'daily', 'business', true, false, 3),
  ('enterprise-hosting', 'Enterprise', 'Enterprise-grade infrastructure.', 49900, 499000, 200, 200, 999, 999, 999, true, 'daily', 'enterprise', true, false, 4)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- RLS helper: company member or platform admin
-- ---------------------------------------------------------------------------
create or replace function public.hosting_company_access(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.company_id = p_company_id and m.user_id = auth.uid()
  )
  or public.is_platform_admin();
$$;

-- Enable RLS
alter table public.hosting_plans enable row level security;
alter table public.hosting_servers enable row level security;
alter table public.hosting_orders enable row level security;
alter table public.hosting_invoices enable row level security;
alter table public.hosting_services enable row level security;
alter table public.hosting_provisioning_logs enable row level security;
alter table public.hosting_usage_snapshots enable row level security;
alter table public.hosting_domains enable row level security;
alter table public.hosting_support_tickets enable row level security;
alter table public.hosting_support_messages enable row level security;
alter table public.hosting_email_logs enable row level security;

-- Plans: public read for active, admin write
drop policy if exists "hosting_plans_select" on public.hosting_plans;
create policy "hosting_plans_select" on public.hosting_plans
  for select to authenticated
  using (is_active = true or public.is_platform_admin());

drop policy if exists "hosting_plans_admin_all" on public.hosting_plans;
create policy "hosting_plans_admin_all" on public.hosting_plans
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Servers: admin only
drop policy if exists "hosting_servers_admin" on public.hosting_servers;
create policy "hosting_servers_admin" on public.hosting_servers
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Orders
drop policy if exists "hosting_orders_select" on public.hosting_orders;
create policy "hosting_orders_select" on public.hosting_orders
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_orders_insert" on public.hosting_orders;
create policy "hosting_orders_insert" on public.hosting_orders
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_orders_admin" on public.hosting_orders;
create policy "hosting_orders_admin" on public.hosting_orders
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Invoices
drop policy if exists "hosting_invoices_select" on public.hosting_invoices;
create policy "hosting_invoices_select" on public.hosting_invoices
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_invoices_admin" on public.hosting_invoices;
create policy "hosting_invoices_admin" on public.hosting_invoices
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Services
drop policy if exists "hosting_services_select" on public.hosting_services;
create policy "hosting_services_select" on public.hosting_services
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_services_admin" on public.hosting_services;
create policy "hosting_services_admin" on public.hosting_services
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Provisioning logs: admin only
drop policy if exists "hosting_provisioning_logs_admin" on public.hosting_provisioning_logs;
create policy "hosting_provisioning_logs_admin" on public.hosting_provisioning_logs
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Usage snapshots
drop policy if exists "hosting_usage_select" on public.hosting_usage_snapshots;
create policy "hosting_usage_select" on public.hosting_usage_snapshots
  for select to authenticated
  using (
    exists (
      select 1 from public.hosting_services s
      where s.id = hosting_usage_snapshots.service_id
        and public.hosting_company_access(s.company_id)
    )
  );

drop policy if exists "hosting_usage_admin" on public.hosting_usage_snapshots;
create policy "hosting_usage_admin" on public.hosting_usage_snapshots
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Domains
drop policy if exists "hosting_domains_select" on public.hosting_domains;
create policy "hosting_domains_select" on public.hosting_domains
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_domains_insert" on public.hosting_domains;
create policy "hosting_domains_insert" on public.hosting_domains
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_domains_admin" on public.hosting_domains;
create policy "hosting_domains_admin" on public.hosting_domains
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Support tickets
drop policy if exists "hosting_tickets_select" on public.hosting_support_tickets;
create policy "hosting_tickets_select" on public.hosting_support_tickets
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_tickets_insert" on public.hosting_support_tickets;
create policy "hosting_tickets_insert" on public.hosting_support_tickets
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_tickets_update" on public.hosting_support_tickets;
create policy "hosting_tickets_update" on public.hosting_support_tickets
  for update to authenticated
  using (public.hosting_company_access(company_id))
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_tickets_admin" on public.hosting_support_tickets;
create policy "hosting_tickets_admin" on public.hosting_support_tickets
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Support messages
drop policy if exists "hosting_messages_select" on public.hosting_support_messages;
create policy "hosting_messages_select" on public.hosting_support_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.hosting_support_tickets t
      where t.id = hosting_support_messages.ticket_id
        and public.hosting_company_access(t.company_id)
    )
  );

drop policy if exists "hosting_messages_insert" on public.hosting_support_messages;
create policy "hosting_messages_insert" on public.hosting_support_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.hosting_support_tickets t
      where t.id = hosting_support_messages.ticket_id
        and public.hosting_company_access(t.company_id)
    )
  );

drop policy if exists "hosting_messages_admin" on public.hosting_support_messages;
create policy "hosting_messages_admin" on public.hosting_support_messages
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Email logs: admin + company read own
drop policy if exists "hosting_email_logs_select" on public.hosting_email_logs;
create policy "hosting_email_logs_select" on public.hosting_email_logs
  for select to authenticated
  using (
    company_id is null
    or public.hosting_company_access(company_id)
  );

drop policy if exists "hosting_email_logs_admin" on public.hosting_email_logs;
create policy "hosting_email_logs_admin" on public.hosting_email_logs
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Grants
grant select on public.hosting_plans to authenticated;
grant select, insert on public.hosting_orders to authenticated;
grant select on public.hosting_invoices to authenticated;
grant select on public.hosting_services to authenticated;
grant select on public.hosting_usage_snapshots to authenticated;
grant select, insert on public.hosting_domains to authenticated;
grant select, insert, update on public.hosting_support_tickets to authenticated;
grant select, insert on public.hosting_support_messages to authenticated;
grant select on public.hosting_email_logs to authenticated;

grant all on public.hosting_plans to authenticated;
grant all on public.hosting_servers to authenticated;
grant all on public.hosting_orders to authenticated;
grant all on public.hosting_invoices to authenticated;
grant all on public.hosting_services to authenticated;
grant all on public.hosting_provisioning_logs to authenticated;
grant all on public.hosting_usage_snapshots to authenticated;
grant all on public.hosting_domains to authenticated;
grant all on public.hosting_support_tickets to authenticated;
grant all on public.hosting_support_messages to authenticated;
grant all on public.hosting_email_logs to authenticated;

-- 20260706100000_plesk_xml_api_upgrade.sql
-- Plesk XML API upgrade: server credentials, resource tables, service plan mapping.

-- Extend hosting_servers for XML API
alter table public.hosting_servers
  add column if not exists xml_api_endpoint text,
  add column if not exists api_username text,
  add column if not exists api_secret_encrypted text,
  add column if not exists api_type text not null default 'xml',
  add column if not exists last_connection_status text,
  add column if not exists last_connection_at timestamptz,
  add column if not exists last_connection_message text;

-- Extend hosting_plans with Plesk mapping fields
alter table public.hosting_plans
  add column if not exists plesk_plan_id text,
  add column if not exists subdomain_limit int not null default 10,
  add column if not exists ftp_account_limit int not null default 5;

-- Extend hosting_services with Plesk IDs
alter table public.hosting_services
  add column if not exists plesk_customer_id text,
  add column if not exists plesk_domain_id text;

-- Imported Plesk service plans cache
create table if not exists public.hosting_service_plans (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.hosting_servers (id) on delete cascade,
  plesk_plan_id text not null,
  name text not null,
  storage_limit_gb int,
  bandwidth_limit_gb int,
  domain_limit int,
  subdomain_limit int,
  mailbox_limit int,
  ftp_account_limit int,
  database_limit int,
  is_active boolean not null default true,
  raw_payload jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, plesk_plan_id)
);

-- DNS records
create table if not exists public.hosting_dns_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid references public.hosting_services (id) on delete cascade,
  domain_name text not null,
  record_type text not null,
  host text not null default '@',
  value text not null,
  priority int,
  ttl int not null default 3600,
  plesk_record_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_dns_records
    add constraint hosting_dns_records_type_check
    check (record_type in ('A', 'CNAME', 'MX', 'TXT', 'SPF', 'DKIM', 'DMARC', 'NS', 'AAAA'));
exception when duplicate_object then null;
end $$;

-- Mailboxes
create table if not exists public.hosting_mailboxes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  email_address text not null,
  mailbox_name text not null,
  plesk_mail_id text,
  quota_mb int not null default 1024,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosting_mailboxes_email_unique_idx
  on public.hosting_mailboxes (lower(email_address));

-- FTP accounts
create table if not exists public.hosting_ftp_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  username text not null,
  home_directory text,
  plesk_ftp_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosting_ftp_accounts_username_service_idx
  on public.hosting_ftp_accounts (service_id, lower(username));

-- Databases
create table if not exists public.hosting_databases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  db_name text not null,
  db_user text,
  db_type text not null default 'mysql',
  plesk_db_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosting_databases_name_service_idx
  on public.hosting_databases (service_id, lower(db_name));

-- RLS
alter table public.hosting_service_plans enable row level security;
alter table public.hosting_dns_records enable row level security;
alter table public.hosting_mailboxes enable row level security;
alter table public.hosting_ftp_accounts enable row level security;
alter table public.hosting_databases enable row level security;

drop policy if exists "hosting_service_plans_admin" on public.hosting_service_plans;
create policy "hosting_service_plans_admin" on public.hosting_service_plans
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_dns_select" on public.hosting_dns_records;
create policy "hosting_dns_select" on public.hosting_dns_records
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_dns_admin" on public.hosting_dns_records;
create policy "hosting_dns_admin" on public.hosting_dns_records
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_mailboxes_select" on public.hosting_mailboxes;
create policy "hosting_mailboxes_select" on public.hosting_mailboxes
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_mailboxes_insert" on public.hosting_mailboxes;
create policy "hosting_mailboxes_insert" on public.hosting_mailboxes
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_mailboxes_admin" on public.hosting_mailboxes;
create policy "hosting_mailboxes_admin" on public.hosting_mailboxes
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_ftp_select" on public.hosting_ftp_accounts;
create policy "hosting_ftp_select" on public.hosting_ftp_accounts
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_ftp_insert" on public.hosting_ftp_accounts;
create policy "hosting_ftp_insert" on public.hosting_ftp_accounts
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_ftp_admin" on public.hosting_ftp_accounts;
create policy "hosting_ftp_admin" on public.hosting_ftp_accounts
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_databases_select" on public.hosting_databases;
create policy "hosting_databases_select" on public.hosting_databases
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_databases_insert" on public.hosting_databases;
create policy "hosting_databases_insert" on public.hosting_databases
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_databases_admin" on public.hosting_databases;
create policy "hosting_databases_admin" on public.hosting_databases
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select on public.hosting_dns_records to authenticated;
grant select on public.hosting_mailboxes to authenticated;
grant select, insert on public.hosting_ftp_accounts to authenticated;
grant select, insert on public.hosting_databases to authenticated;
grant all on public.hosting_service_plans to authenticated;
grant all on public.hosting_dns_records to authenticated;
grant all on public.hosting_mailboxes to authenticated;
grant all on public.hosting_ftp_accounts to authenticated;
grant all on public.hosting_databases to authenticated;

-- 20260707000000_shared_basic_price_update.sql
-- Shared Basic hosting price: R49 → R69
update public.hosting_plans
set
  monthly_price_cents = 6900,
  yearly_price_cents = 69000
where slug = 'shared-basic';

-- 20260708000000_payment_method_settings.sql
-- Additional payment method toggles for company payment settings
alter table public.company_payment_settings
  add column if not exists payfast_enabled boolean not null default false,
  add column if not exists yoco_enabled boolean not null default false,
  add column if not exists ozow_enabled boolean not null default false,
  add column if not exists peach_enabled boolean not null default false,
  add column if not exists stripe_enabled boolean not null default false,
  add column if not exists cash_enabled boolean not null default false;

-- Extend supported customer payment providers
alter table public.customer_payments
  drop constraint if exists customer_payments_provider_check;

alter table public.customer_payments
  add constraint customer_payments_provider_check
  check (provider in ('paystack', 'eft', 'stripe', 'ozow', 'peach', 'yoco', 'payfast', 'cash'));

-- 20260709000000_website_components.sql
-- V2 Website Builder: reusable saved components (hero, footer, FAQ, CTA blocks).
--
-- PREREQUISITE: public.companies and public.websites must already exist.
-- On a fresh Supabase project, do NOT run this file alone. Instead:
--   npm run db:print-full-schema-sql   (paste in SQL Editor), or
--   npm run db:apply-all-migrations    (needs SUPABASE_DB_PASSWORD in .env.local)
--
-- If the base schema is already applied, run only this migration:
--   npm run db:print-website-components-sql

do $$
begin
  if to_regclass('public.companies') is null then
    raise exception
      'Missing public.companies. Apply base Supabase migrations first (20260415120000_init_faraios.sql).';
  end if;

  if to_regclass('public.websites') is null then
    raise exception
      'Missing public.websites. Apply 20260415200000_websites_multitenant_domains.sql (or run `supabase db push`) before this migration.';
  end if;
end $$;

create table if not exists public.website_components (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  component_type text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_components
    add constraint website_components_type_check
    check (component_type in ('hero', 'footer', 'faq', 'cta-banner', 'booking-cta'));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_components_website_id_idx
  on public.website_components (website_id, updated_at desc);

create index if not exists website_components_company_id_idx
  on public.website_components (company_id);

alter table public.website_components enable row level security;

drop policy if exists "website_components_member" on public.website_components;
create policy "website_components_member" on public.website_components
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_components.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_components.company_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.website_components to authenticated;

-- 20260711000000_content_blog_taxonomy.sql
-- V2 Website Builder: blog categories and tags (bridges Growth content_posts).

do $$
begin
  if to_regclass('public.content_posts') is null then
    raise exception
      'Missing public.content_posts. Apply V5 growth engine migrations first.';
  end if;
end $$;

create table if not exists public.content_blog_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_blog_categories_company_slug_idx
  on public.content_blog_categories (company_id, lower(slug));

create index if not exists content_blog_categories_company_sort_idx
  on public.content_blog_categories (company_id, sort_order, name);

create table if not exists public.content_blog_tags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists content_blog_tags_company_slug_idx
  on public.content_blog_tags (company_id, lower(slug));

create index if not exists content_blog_tags_company_name_idx
  on public.content_blog_tags (company_id, name);

alter table public.content_posts
  add column if not exists blog_category_id uuid references public.content_blog_categories (id) on delete set null;

create table if not exists public.content_post_blog_tags (
  post_id uuid not null references public.content_posts (id) on delete cascade,
  tag_id uuid not null references public.content_blog_tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists content_post_blog_tags_tag_idx
  on public.content_post_blog_tags (tag_id);

alter table public.content_blog_categories enable row level security;
alter table public.content_blog_tags enable row level security;
alter table public.content_post_blog_tags enable row level security;

drop policy if exists "content_blog_categories_member" on public.content_blog_categories;
create policy "content_blog_categories_member" on public.content_blog_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_categories.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_categories.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "content_blog_tags_member" on public.content_blog_tags;
create policy "content_blog_tags_member" on public.content_blog_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_tags.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_blog_tags.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "content_post_blog_tags_member" on public.content_post_blog_tags;
create policy "content_post_blog_tags_member" on public.content_post_blog_tags
  for all to authenticated
  using (
    exists (
      select 1
      from public.content_posts p
      join public.memberships m on m.company_id = p.company_id
      where p.id = content_post_blog_tags.post_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.content_posts p
      join public.memberships m on m.company_id = p.company_id
      where p.id = content_post_blog_tags.post_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.content_blog_categories to authenticated;
grant select, insert, update, delete on table public.content_blog_tags to authenticated;
grant select, insert, update, delete on table public.content_post_blog_tags to authenticated;
