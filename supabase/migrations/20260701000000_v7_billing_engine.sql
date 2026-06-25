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
