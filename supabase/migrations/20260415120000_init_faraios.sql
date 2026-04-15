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
