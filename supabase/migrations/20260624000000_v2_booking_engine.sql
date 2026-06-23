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
