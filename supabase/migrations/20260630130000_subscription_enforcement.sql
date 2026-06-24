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
