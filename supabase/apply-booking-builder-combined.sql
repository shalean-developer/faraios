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
