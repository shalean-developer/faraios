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
