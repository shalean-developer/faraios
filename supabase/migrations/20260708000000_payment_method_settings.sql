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
