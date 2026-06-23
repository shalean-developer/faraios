-- FaraiOS V4 — Website Connection, Hosting & Domain Engine
-- Extends websites, connected_websites; adds domains, DNS records, deployments,
-- API key audit, tracking events, and lead-source fields on bookings.

-- ---------------------------------------------------------------------------
-- Extend connected_websites (external / hosted connection)
-- ---------------------------------------------------------------------------
alter table public.connected_websites
  add column if not exists name text,
  add column if not exists status text not null default 'draft',
  add column if not exists primary_domain text,
  add column if not exists preview_subdomain text,
  add column if not exists hosting_provider text,
  add column if not exists booking_enabled boolean not null default true,
  add column if not exists tracking_enabled boolean not null default true,
  add column if not exists seo_enabled boolean not null default false,
  add column if not exists api_key_status text not null default 'active',
  add column if not exists api_key_last_used_at timestamptz,
  add column if not exists website_id uuid references public.websites (id) on delete set null;

do $$
begin
  alter table public.connected_websites
    add constraint connected_websites_status_check
    check (status in (
      'draft', 'connected', 'verification_pending', 'verified', 'live', 'error', 'archived'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.connected_websites
    add constraint connected_websites_api_key_status_check
    check (api_key_status in ('active', 'revoked'));
exception
  when duplicate_object then null;
end $$;

create index if not exists connected_websites_status_idx
  on public.connected_websites (company_id, status);

-- ---------------------------------------------------------------------------
-- Extend websites (FaraiOS-hosted sites)
-- ---------------------------------------------------------------------------
alter table public.websites
  add column if not exists connection_status text not null default 'draft',
  add column if not exists hosting_provider text,
  add column if not exists booking_enabled boolean not null default true,
  add column if not exists tracking_enabled boolean not null default true,
  add column if not exists seo_connection_enabled boolean not null default false,
  add column if not exists preview_subdomain text;

do $$
begin
  alter table public.websites
    add constraint websites_connection_status_check
    check (connection_status in (
      'draft', 'connected', 'verification_pending', 'verified', 'live', 'error', 'archived'
    ));
exception
  when duplicate_object then null;
end $$;

-- Map legacy published status to live connection_status
update public.websites
set connection_status = 'live'
where status = 'published' and connection_status = 'draft';

-- ---------------------------------------------------------------------------
-- Extend hosting_subscriptions SSL status values
-- ---------------------------------------------------------------------------
alter table public.hosting_subscriptions
  drop constraint if exists hosting_subscriptions_ssl_status_check;

alter table public.hosting_subscriptions
  add constraint hosting_subscriptions_ssl_status_check
  check (ssl_status in ('not_started', 'pending', 'active', 'failed'));

-- ---------------------------------------------------------------------------
-- Domain records (primary, subdomain, preview)
-- ---------------------------------------------------------------------------
create table if not exists public.website_domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid references public.websites (id) on delete cascade,
  connected_website_id uuid references public.connected_websites (id) on delete cascade,
  domain text not null,
  domain_type text not null default 'primary',
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  verification_status text not null default 'pending',
  ssl_status text not null default 'not_started',
  hosting_provider text,
  provider_domain_id text,
  is_primary boolean not null default false,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_domains
    add constraint website_domains_domain_type_check
    check (domain_type in ('primary', 'subdomain', 'preview'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_domains
    add constraint website_domains_verification_status_check
    check (verification_status in ('pending', 'verified', 'failed'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_domains
    add constraint website_domains_ssl_status_check
    check (ssl_status in ('not_started', 'pending', 'active', 'failed'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists website_domains_domain_unique_idx
  on public.website_domains (lower(domain));

create index if not exists website_domains_company_idx
  on public.website_domains (company_id, verification_status);

-- ---------------------------------------------------------------------------
-- DNS instructions per domain
-- ---------------------------------------------------------------------------
create table if not exists public.website_dns_records (
  id uuid primary key default gen_random_uuid(),
  website_domain_id uuid not null references public.website_domains (id) on delete cascade,
  record_type text not null,
  host text not null,
  value text not null,
  status text not null default 'pending',
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_dns_records
    add constraint website_dns_records_type_check
    check (record_type in ('CNAME', 'A', 'TXT'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_dns_records
    add constraint website_dns_records_status_check
    check (status in ('pending', 'verified', 'failed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_dns_records_domain_idx
  on public.website_dns_records (website_domain_id);

-- ---------------------------------------------------------------------------
-- Deployments for FaraiOS-hosted websites
-- ---------------------------------------------------------------------------
create table if not exists public.website_deployments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid not null references public.websites (id) on delete cascade,
  environment text not null default 'production',
  status text not null default 'queued',
  hosting_provider text not null default 'vercel',
  provider_deployment_id text,
  build_error text,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_deployments
    add constraint website_deployments_environment_check
    check (environment in ('preview', 'production'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.website_deployments
    add constraint website_deployments_status_check
    check (status in ('queued', 'building', 'live', 'failed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_deployments_website_idx
  on public.website_deployments (website_id, created_at desc);

-- ---------------------------------------------------------------------------
-- API key audit log (rotation / usage)
-- ---------------------------------------------------------------------------
create table if not exists public.business_api_key_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  event_type text not null,
  key_prefix text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.business_api_key_events
    add constraint business_api_key_events_type_check
    check (event_type in ('generated', 'rotated', 'revoked', 'used'));
exception
  when duplicate_object then null;
end $$;

create index if not exists business_api_key_events_company_idx
  on public.business_api_key_events (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Website tracking events (connected external sites)
-- ---------------------------------------------------------------------------
create table if not exists public.website_tracking_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid references public.websites (id) on delete set null,
  connected_website_id uuid references public.connected_websites (id) on delete set null,
  event_type text not null,
  source_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_tracking_events
    add constraint website_tracking_events_type_check
    check (event_type in (
      'page_visit', 'booking_form_view', 'booking_submission',
      'quote_request', 'contact_submission'
    ));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_tracking_events_company_idx
  on public.website_tracking_events (company_id, created_at desc);

create index if not exists website_tracking_events_type_idx
  on public.website_tracking_events (company_id, event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Lead source fields on bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists website_id uuid references public.websites (id) on delete set null,
  add column if not exists device_type text;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.website_domains enable row level security;
alter table public.website_dns_records enable row level security;
alter table public.website_deployments enable row level security;
alter table public.business_api_key_events enable row level security;
alter table public.website_tracking_events enable row level security;

-- website_domains
drop policy if exists "website_domains_select_member" on public.website_domains;
create policy "website_domains_select_member" on public.website_domains
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_domains_insert_member" on public.website_domains;
create policy "website_domains_insert_member" on public.website_domains
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_domains_update_member" on public.website_domains;
create policy "website_domains_update_member" on public.website_domains
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_domains_delete_member" on public.website_domains;
create policy "website_domains_delete_member" on public.website_domains
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_domains.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- website_dns_records (via domain ownership)
drop policy if exists "website_dns_records_select_member" on public.website_dns_records;
create policy "website_dns_records_select_member" on public.website_dns_records
  for select to authenticated
  using (
    exists (
      select 1
      from public.website_domains wd
      join public.memberships m on m.company_id = wd.company_id
      where wd.id = website_dns_records.website_domain_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_dns_records_insert_member" on public.website_dns_records;
create policy "website_dns_records_insert_member" on public.website_dns_records
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.website_domains wd
      join public.memberships m on m.company_id = wd.company_id
      where wd.id = website_dns_records.website_domain_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_dns_records_update_member" on public.website_dns_records;
create policy "website_dns_records_update_member" on public.website_dns_records
  for update to authenticated
  using (
    exists (
      select 1
      from public.website_domains wd
      join public.memberships m on m.company_id = wd.company_id
      where wd.id = website_dns_records.website_domain_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- website_deployments
drop policy if exists "website_deployments_select_member" on public.website_deployments;
create policy "website_deployments_select_member" on public.website_deployments
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_deployments.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_deployments_insert_member" on public.website_deployments;
create policy "website_deployments_insert_member" on public.website_deployments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_deployments.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "website_deployments_update_member" on public.website_deployments;
create policy "website_deployments_update_member" on public.website_deployments
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_deployments.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- business_api_key_events
drop policy if exists "business_api_key_events_select_member" on public.business_api_key_events;
create policy "business_api_key_events_select_member" on public.business_api_key_events
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = business_api_key_events.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- website_tracking_events
drop policy if exists "website_tracking_events_select_member" on public.website_tracking_events;
create policy "website_tracking_events_select_member" on public.website_tracking_events
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_tracking_events.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );
