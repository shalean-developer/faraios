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
