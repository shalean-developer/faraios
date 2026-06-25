-- FaraiOS V10 — Enterprise SEO Platform
-- Extends V5 Growth Engine with crawl, scoring, redirects, 404 monitor, and modular SEO tables.

-- ---------------------------------------------------------------------------
-- Extend local_seo_settings for V10 local SEO
-- ---------------------------------------------------------------------------
alter table public.local_seo_settings
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists google_maps_url text,
  add column if not exists logo_url text,
  add column if not exists whatsapp text,
  add column if not exists knowledge_graph_data jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- SEO Projects (one or more per company)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null default 'Main website',
  website_url text,
  domain text,
  language text not null default 'en',
  country text not null default 'ZA',
  business_type text,
  default_schema_type text not null default 'LocalBusiness',
  sitemap_url text,
  robots_txt_url text,
  gsc_connected boolean not null default false,
  ga_connected boolean not null default false,
  gbp_connected boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_projects_company_idx on public.seo_projects (company_id);

-- ---------------------------------------------------------------------------
-- SEO Pages (inventoried / crawled pages)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  url text not null,
  path text,
  page_type text not null default 'page',
  source_table text,
  source_id uuid,
  http_status int,
  is_indexable boolean not null default true,
  canonical_url text,
  meta_title text,
  meta_description text,
  h1 text,
  h2_count int not null default 0,
  h3_count int not null default 0,
  internal_links int not null default 0,
  external_links int not null default 0,
  broken_links int not null default 0,
  has_schema boolean not null default false,
  has_og_tags boolean not null default false,
  has_twitter_cards boolean not null default false,
  is_https boolean not null default true,
  robots_meta text,
  content_length int not null default 0,
  last_crawled_at timestamptz,
  seo_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_pages_project_url_idx
  on public.seo_pages (project_id, url);
create index if not exists seo_pages_company_idx on public.seo_pages (company_id);

-- ---------------------------------------------------------------------------
-- SEO Crawls
-- ---------------------------------------------------------------------------
create table if not exists public.seo_crawls (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'pending',
  pages_scanned int not null default 0,
  critical_issues int not null default 0,
  warnings int not null default 0,
  passed_checks int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

do $$
begin
  alter table public.seo_crawls
    add constraint seo_crawls_status_check
    check (status in ('pending', 'running', 'completed', 'failed'));
exception when duplicate_object then null;
end $$;

create index if not exists seo_crawls_project_idx on public.seo_crawls (project_id, started_at desc);

-- ---------------------------------------------------------------------------
-- SEO Analysis (per-page issue breakdown)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_analysis (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  crawl_id uuid references public.seo_crawls (id) on delete set null,
  company_id uuid not null references public.companies (id) on delete cascade,
  score int not null default 0,
  issues jsonb not null default '[]'::jsonb,
  critical_count int not null default 0,
  warning_count int not null default 0,
  passed_count int not null default 0,
  recommendation_count int not null default 0,
  analyzed_at timestamptz not null default now()
);

create index if not exists seo_analysis_page_idx on public.seo_analysis (page_id, analyzed_at desc);

-- ---------------------------------------------------------------------------
-- Focus Keywords
-- ---------------------------------------------------------------------------
create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  keyword text not null,
  is_primary boolean not null default false,
  in_title boolean not null default false,
  in_url boolean not null default false,
  in_meta_description boolean not null default false,
  in_first_paragraph boolean not null default false,
  in_headings boolean not null default false,
  in_image_alt boolean not null default false,
  in_conclusion boolean not null default false,
  density_percent numeric(5,2) not null default 0,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_keywords_page_idx on public.seo_keywords (page_id);
create unique index if not exists seo_keywords_page_keyword_idx
  on public.seo_keywords (page_id, lower(keyword));

-- ---------------------------------------------------------------------------
-- Keyword Rankings (placeholder)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_keyword_rankings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  keyword text not null,
  position numeric(6,2),
  url text,
  source text not null default 'manual',
  recorded_at timestamptz not null default now()
);

create index if not exists seo_keyword_rankings_company_idx
  on public.seo_keyword_rankings (company_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Extended Meta per page
-- ---------------------------------------------------------------------------
create table if not exists public.seo_meta (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  seo_title text,
  meta_description text,
  canonical_url text,
  robots_meta text,
  og_title text,
  og_description text,
  og_image text,
  twitter_title text,
  twitter_description text,
  twitter_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_meta_page_idx on public.seo_meta (page_id);

-- ---------------------------------------------------------------------------
-- Schema records
-- ---------------------------------------------------------------------------
create table if not exists public.seo_schema (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  page_id uuid references public.seo_pages (id) on delete set null,
  schema_type text not null,
  json_ld jsonb not null default '{}'::jsonb,
  is_valid boolean not null default false,
  validation_errors jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_schema_project_idx on public.seo_schema (project_id);

-- ---------------------------------------------------------------------------
-- Redirects
-- ---------------------------------------------------------------------------
create table if not exists public.seo_redirects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  source_url text not null,
  destination_url text,
  status_code int not null default 301,
  hits int not null default 0,
  last_visit_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.seo_redirects
    add constraint seo_redirects_status_code_check
    check (status_code in (301, 302, 307, 308, 410, 451));
exception when duplicate_object then null;
end $$;

create unique index if not exists seo_redirects_project_source_idx
  on public.seo_redirects (project_id, lower(source_url));

-- ---------------------------------------------------------------------------
-- 404 Logs (privacy-safe — no PII stored)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_404_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  missing_url text not null,
  referrer_host text,
  user_agent_family text,
  occurrences int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists seo_404_logs_project_idx
  on public.seo_404_logs (project_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Sitemaps
-- ---------------------------------------------------------------------------
create table if not exists public.seo_sitemaps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  include_pages boolean not null default true,
  include_posts boolean not null default true,
  include_products boolean not null default false,
  include_categories boolean not null default false,
  include_images boolean not null default true,
  include_videos boolean not null default false,
  include_news boolean not null default false,
  exclusions jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  last_generated_at timestamptz,
  url_count int not null default 0,
  sitemap_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.seo_sitemaps
    add constraint seo_sitemaps_status_check
    check (status in ('pending', 'generating', 'ok', 'error'));
exception when duplicate_object then null;
end $$;

create unique index if not exists seo_sitemaps_project_idx on public.seo_sitemaps (project_id);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists public.seo_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  report_type text not null default 'health',
  title text not null,
  data jsonb not null default '{}'::jsonb,
  seo_score int,
  health_score int,
  created_at timestamptz not null default now()
);

create index if not exists seo_reports_project_idx
  on public.seo_reports (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Integrations (OAuth-ready)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid references public.seo_projects (id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.seo_integrations
    add constraint seo_integrations_provider_check
    check (provider in ('google_search_console', 'google_analytics', 'google_business_profile', 'google_indexing_api'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.seo_integrations
    add constraint seo_integrations_status_check
    check (status in ('disconnected', 'connected', 'error'));
exception when duplicate_object then null;
end $$;

create unique index if not exists seo_integrations_company_provider_idx
  on public.seo_integrations (company_id, provider);

-- ---------------------------------------------------------------------------
-- Project settings (robots.txt, crawl config)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_settings (
  project_id uuid primary key references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  robots_txt_content text,
  robots_allow_rules text[] not null default '{}',
  robots_disallow_rules text[] not null default '{}',
  crawl_delay int,
  sitemap_reference text,
  auto_crawl_enabled boolean not null default false,
  crawl_frequency_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Health history (trends)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_health_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.seo_projects (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  seo_score int not null default 0,
  health_score int not null default 0,
  pages_scanned int not null default 0,
  critical_issues int not null default 0,
  warnings int not null default 0,
  passed_checks int not null default 0,
  recorded_at date not null default current_date
);

create unique index if not exists seo_health_history_project_date_idx
  on public.seo_health_history (project_id, recorded_at);

-- ---------------------------------------------------------------------------
-- Image SEO issues (denormalized for dashboard)
-- ---------------------------------------------------------------------------
create table if not exists public.seo_image_issues (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  image_url text not null,
  issue_type text not null,
  recommendation text,
  file_size_kb int,
  created_at timestamptz not null default now()
);

create index if not exists seo_image_issues_company_idx on public.seo_image_issues (company_id);

-- ---------------------------------------------------------------------------
-- RLS helper macro pattern — member or platform admin
-- ---------------------------------------------------------------------------
alter table public.seo_projects enable row level security;
alter table public.seo_pages enable row level security;
alter table public.seo_crawls enable row level security;
alter table public.seo_analysis enable row level security;
alter table public.seo_keywords enable row level security;
alter table public.seo_keyword_rankings enable row level security;
alter table public.seo_meta enable row level security;
alter table public.seo_schema enable row level security;
alter table public.seo_redirects enable row level security;
alter table public.seo_404_logs enable row level security;
alter table public.seo_sitemaps enable row level security;
alter table public.seo_reports enable row level security;
alter table public.seo_integrations enable row level security;
alter table public.seo_settings enable row level security;
alter table public.seo_health_history enable row level security;
alter table public.seo_image_issues enable row level security;

-- seo_projects policies
drop policy if exists "seo_projects_select_member" on public.seo_projects;
create policy "seo_projects_select_member" on public.seo_projects
  for select to authenticated
  using (
    exists (select 1 from public.memberships m where m.company_id = seo_projects.company_id and m.user_id = (select auth.uid()))
    or public.is_platform_admin()
  );

drop policy if exists "seo_projects_insert_member" on public.seo_projects;
create policy "seo_projects_insert_member" on public.seo_projects
  for insert to authenticated
  with check (
    exists (select 1 from public.memberships m where m.company_id = seo_projects.company_id and m.user_id = (select auth.uid()))
    or public.is_platform_admin()
  );

drop policy if exists "seo_projects_update_member" on public.seo_projects;
create policy "seo_projects_update_member" on public.seo_projects
  for update to authenticated
  using (
    exists (select 1 from public.memberships m where m.company_id = seo_projects.company_id and m.user_id = (select auth.uid()))
    or public.is_platform_admin()
  );

-- Generic member policies for child tables (company_id based)
do $policy$
declare
  tbl text;
  tables text[] := array[
    'seo_pages', 'seo_crawls', 'seo_analysis', 'seo_keywords', 'seo_keyword_rankings',
    'seo_meta', 'seo_schema', 'seo_redirects', 'seo_404_logs', 'seo_sitemaps',
    'seo_reports', 'seo_integrations', 'seo_settings', 'seo_health_history', 'seo_image_issues'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists "%s_select_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_select_member" on public.%s for select to authenticated using (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
    execute format('drop policy if exists "%s_insert_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_insert_member" on public.%s for insert to authenticated with check (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
    execute format('drop policy if exists "%s_update_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_update_member" on public.%s for update to authenticated using (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
    execute format('drop policy if exists "%s_delete_member" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s_delete_member" on public.%s for delete to authenticated using (
        exists (select 1 from public.memberships m where m.company_id = %s.company_id and m.user_id = (select auth.uid()))
        or public.is_platform_admin()
      )', tbl, tbl, tbl
    );
  end loop;
end $policy$;

-- Allow anon insert on 404 logs via service role only (no anon policy)
