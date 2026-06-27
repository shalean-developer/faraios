-- Plesk XML API upgrade: server credentials, resource tables, service plan mapping.

-- Extend hosting_servers for XML API
alter table public.hosting_servers
  add column if not exists xml_api_endpoint text,
  add column if not exists api_username text,
  add column if not exists api_secret_encrypted text,
  add column if not exists api_type text not null default 'xml',
  add column if not exists last_connection_status text,
  add column if not exists last_connection_at timestamptz,
  add column if not exists last_connection_message text;

-- Extend hosting_plans with Plesk mapping fields
alter table public.hosting_plans
  add column if not exists plesk_plan_id text,
  add column if not exists subdomain_limit int not null default 10,
  add column if not exists ftp_account_limit int not null default 5;

-- Extend hosting_services with Plesk IDs
alter table public.hosting_services
  add column if not exists plesk_customer_id text,
  add column if not exists plesk_domain_id text;

-- Imported Plesk service plans cache
create table if not exists public.hosting_service_plans (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.hosting_servers (id) on delete cascade,
  plesk_plan_id text not null,
  name text not null,
  storage_limit_gb int,
  bandwidth_limit_gb int,
  domain_limit int,
  subdomain_limit int,
  mailbox_limit int,
  ftp_account_limit int,
  database_limit int,
  is_active boolean not null default true,
  raw_payload jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, plesk_plan_id)
);

-- DNS records
create table if not exists public.hosting_dns_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid references public.hosting_services (id) on delete cascade,
  domain_name text not null,
  record_type text not null,
  host text not null default '@',
  value text not null,
  priority int,
  ttl int not null default 3600,
  plesk_record_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.hosting_dns_records
    add constraint hosting_dns_records_type_check
    check (record_type in ('A', 'CNAME', 'MX', 'TXT', 'SPF', 'DKIM', 'DMARC', 'NS', 'AAAA'));
exception when duplicate_object then null;
end $$;

-- Mailboxes
create table if not exists public.hosting_mailboxes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  email_address text not null,
  mailbox_name text not null,
  plesk_mail_id text,
  quota_mb int not null default 1024,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosting_mailboxes_email_unique_idx
  on public.hosting_mailboxes (lower(email_address));

-- FTP accounts
create table if not exists public.hosting_ftp_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  username text not null,
  home_directory text,
  plesk_ftp_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosting_ftp_accounts_username_service_idx
  on public.hosting_ftp_accounts (service_id, lower(username));

-- Databases
create table if not exists public.hosting_databases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid not null references public.hosting_services (id) on delete cascade,
  db_name text not null,
  db_user text,
  db_type text not null default 'mysql',
  plesk_db_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosting_databases_name_service_idx
  on public.hosting_databases (service_id, lower(db_name));

-- RLS
alter table public.hosting_service_plans enable row level security;
alter table public.hosting_dns_records enable row level security;
alter table public.hosting_mailboxes enable row level security;
alter table public.hosting_ftp_accounts enable row level security;
alter table public.hosting_databases enable row level security;

drop policy if exists "hosting_service_plans_admin" on public.hosting_service_plans;
create policy "hosting_service_plans_admin" on public.hosting_service_plans
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_dns_select" on public.hosting_dns_records;
create policy "hosting_dns_select" on public.hosting_dns_records
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_dns_admin" on public.hosting_dns_records;
create policy "hosting_dns_admin" on public.hosting_dns_records
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_mailboxes_select" on public.hosting_mailboxes;
create policy "hosting_mailboxes_select" on public.hosting_mailboxes
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_mailboxes_insert" on public.hosting_mailboxes;
create policy "hosting_mailboxes_insert" on public.hosting_mailboxes
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_mailboxes_admin" on public.hosting_mailboxes;
create policy "hosting_mailboxes_admin" on public.hosting_mailboxes
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_ftp_select" on public.hosting_ftp_accounts;
create policy "hosting_ftp_select" on public.hosting_ftp_accounts
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_ftp_insert" on public.hosting_ftp_accounts;
create policy "hosting_ftp_insert" on public.hosting_ftp_accounts
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_ftp_admin" on public.hosting_ftp_accounts;
create policy "hosting_ftp_admin" on public.hosting_ftp_accounts
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "hosting_databases_select" on public.hosting_databases;
create policy "hosting_databases_select" on public.hosting_databases
  for select to authenticated
  using (public.hosting_company_access(company_id));

drop policy if exists "hosting_databases_insert" on public.hosting_databases;
create policy "hosting_databases_insert" on public.hosting_databases
  for insert to authenticated
  with check (public.hosting_company_access(company_id));

drop policy if exists "hosting_databases_admin" on public.hosting_databases;
create policy "hosting_databases_admin" on public.hosting_databases
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

grant select on public.hosting_dns_records to authenticated;
grant select on public.hosting_mailboxes to authenticated;
grant select, insert on public.hosting_ftp_accounts to authenticated;
grant select, insert on public.hosting_databases to authenticated;
grant all on public.hosting_service_plans to authenticated;
grant all on public.hosting_dns_records to authenticated;
grant all on public.hosting_mailboxes to authenticated;
grant all on public.hosting_ftp_accounts to authenticated;
grant all on public.hosting_databases to authenticated;
