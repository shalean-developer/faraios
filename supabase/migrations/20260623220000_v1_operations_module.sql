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
