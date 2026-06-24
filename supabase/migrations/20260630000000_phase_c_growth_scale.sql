-- Phase C: Search Console integration tables

create table if not exists public.google_search_console_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  site_url text not null,
  property_url text,
  refresh_token text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (company_id)
);

create table if not exists public.seo_search_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  metric_date date not null,
  clicks int not null default 0,
  impressions int not null default 0,
  ctr numeric(6, 4) not null default 0,
  position numeric(6, 2) not null default 0,
  top_queries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, metric_date)
);

create index if not exists seo_search_metrics_company_date_idx
  on public.seo_search_metrics (company_id, metric_date desc);

alter table public.google_search_console_connections enable row level security;
alter table public.seo_search_metrics enable row level security;

drop policy if exists "gsc_connections_select" on public.google_search_console_connections;
create policy "gsc_connections_select" on public.google_search_console_connections
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

drop policy if exists "gsc_connections_manage" on public.google_search_console_connections;
create policy "gsc_connections_manage" on public.google_search_console_connections
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "seo_search_metrics_select" on public.seo_search_metrics;
create policy "seo_search_metrics_select" on public.seo_search_metrics
  for select to authenticated
  using (public.is_company_member(company_id) or public.is_platform_admin());

grant select, insert, update, delete on table public.google_search_console_connections to authenticated;
grant select, insert, update, delete on table public.seo_search_metrics to authenticated;
