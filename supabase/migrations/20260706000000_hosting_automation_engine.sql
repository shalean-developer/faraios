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
