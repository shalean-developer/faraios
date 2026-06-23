-- FaraiOS V5 — SEO, Marketing & Growth Engine
-- Local SEO, service area pages, content posts, review requests,
-- email campaigns, leads, and attribution extensions.

-- ---------------------------------------------------------------------------
-- Local SEO settings (per company)
-- ---------------------------------------------------------------------------
create table if not exists public.local_seo_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  business_name text,
  industry text,
  main_service text,
  primary_location text,
  service_areas text[] not null default '{}',
  phone text,
  email text,
  address text,
  opening_hours jsonb not null default '{}'::jsonb,
  google_business_profile_url text,
  google_review_link text,
  business_categories text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  auto_review_request_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Service area landing pages
-- ---------------------------------------------------------------------------
create table if not exists public.service_area_pages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  website_id uuid references public.websites (id) on delete set null,
  slug text not null,
  service_name text not null,
  area_name text not null,
  seo_title text,
  meta_description text,
  h1 text,
  intro_content text,
  services_offered jsonb not null default '[]'::jsonb,
  nearby_areas jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  cta_text text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.service_area_pages
    add constraint service_area_pages_status_check
    check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists service_area_pages_company_slug_idx
  on public.service_area_pages (company_id, lower(slug));

create index if not exists service_area_pages_company_status_idx
  on public.service_area_pages (company_id, status);

-- ---------------------------------------------------------------------------
-- Content posts (blog, guides, articles, FAQs)
-- ---------------------------------------------------------------------------
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  slug text not null,
  meta_title text,
  meta_description text,
  featured_image text,
  category text not null default 'blog',
  author text,
  status text not null default 'draft',
  published_at timestamptz,
  content_body text,
  cta_text text,
  cta_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.content_posts
    add constraint content_posts_category_check
    check (category in ('blog', 'guide', 'service_article', 'faq'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.content_posts
    add constraint content_posts_status_check
    check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists content_posts_company_slug_idx
  on public.content_posts (company_id, lower(slug));

create index if not exists content_posts_company_status_idx
  on public.content_posts (company_id, status, published_at desc);

-- ---------------------------------------------------------------------------
-- Review requests
-- ---------------------------------------------------------------------------
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  customer_email text,
  customer_name text,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.review_requests
    add constraint review_requests_status_check
    check (status in ('sent', 'clicked', 'failed'));
exception
  when duplicate_object then null;
end $$;

create index if not exists review_requests_company_idx
  on public.review_requests (company_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Email campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  campaign_type text not null default 'promotion',
  subject text not null,
  body_html text not null,
  status text not null default 'draft',
  sent_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  bookings_generated integer not null default 0,
  revenue_generated_cents integer not null default 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.email_campaigns
    add constraint email_campaigns_type_check
    check (campaign_type in (
      'promotion', 'follow_up', 'reactivation', 'seasonal', 'reminder'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.email_campaigns
    add constraint email_campaigns_status_check
    check (status in ('draft', 'scheduled', 'sent'));
exception
  when duplicate_object then null;
end $$;

create index if not exists email_campaigns_company_idx
  on public.email_campaigns (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Email unsubscribes
-- ---------------------------------------------------------------------------
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  unsubscribed_at timestamptz not null default now()
);

create unique index if not exists email_unsubscribes_company_email_idx
  on public.email_unsubscribes (company_id, lower(email));

-- ---------------------------------------------------------------------------
-- Leads (contact forms, quote requests)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text,
  email text,
  phone text,
  message text,
  lead_type text not null default 'contact',
  source text,
  source_website text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  conversion_page text,
  status text not null default 'new',
  customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.leads
    add constraint leads_type_check
    check (lead_type in ('contact', 'quote_request', 'general'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.leads
    add constraint leads_status_check
    check (status in ('new', 'contacted', 'converted', 'archived'));
exception
  when duplicate_object then null;
end $$;

create index if not exists leads_company_idx
  on public.leads (company_id, created_at desc);

create index if not exists leads_company_utm_idx
  on public.leads (company_id, utm_source, created_at desc);

-- ---------------------------------------------------------------------------
-- Quote attribution (lead source tracking)
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists source text,
  add column if not exists source_website text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists landing_page text,
  add column if not exists conversion_page text;

-- Booking landing/conversion pages
alter table public.bookings
  add column if not exists landing_page text,
  add column if not exists conversion_page text;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.local_seo_settings enable row level security;
alter table public.service_area_pages enable row level security;
alter table public.content_posts enable row level security;
alter table public.review_requests enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_unsubscribes enable row level security;
alter table public.leads enable row level security;

-- Member policies (standard pattern)
drop policy if exists "local_seo_settings_select_member" on public.local_seo_settings;
create policy "local_seo_settings_select_member" on public.local_seo_settings
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = local_seo_settings.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "local_seo_settings_insert_member" on public.local_seo_settings;
create policy "local_seo_settings_insert_member" on public.local_seo_settings
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = local_seo_settings.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "local_seo_settings_update_member" on public.local_seo_settings;
create policy "local_seo_settings_update_member" on public.local_seo_settings
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = local_seo_settings.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- service_area_pages
drop policy if exists "service_area_pages_select_member" on public.service_area_pages;
create policy "service_area_pages_select_member" on public.service_area_pages
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "service_area_pages_insert_member" on public.service_area_pages;
create policy "service_area_pages_insert_member" on public.service_area_pages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "service_area_pages_update_member" on public.service_area_pages;
create policy "service_area_pages_update_member" on public.service_area_pages
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "service_area_pages_delete_member" on public.service_area_pages;
create policy "service_area_pages_delete_member" on public.service_area_pages
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = service_area_pages.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- Public read for published service area pages
drop policy if exists "service_area_pages_select_published" on public.service_area_pages;
create policy "service_area_pages_select_published" on public.service_area_pages
  for select to anon, authenticated
  using (status = 'published');

-- content_posts (member CRUD + public read published)
drop policy if exists "content_posts_select_member" on public.content_posts;
create policy "content_posts_select_member" on public.content_posts
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_insert_member" on public.content_posts;
create policy "content_posts_insert_member" on public.content_posts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_update_member" on public.content_posts;
create policy "content_posts_update_member" on public.content_posts
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_delete_member" on public.content_posts;
create policy "content_posts_delete_member" on public.content_posts
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = content_posts.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "content_posts_select_published" on public.content_posts;
create policy "content_posts_select_published" on public.content_posts
  for select to anon, authenticated
  using (status = 'published');

-- review_requests
drop policy if exists "review_requests_select_member" on public.review_requests;
create policy "review_requests_select_member" on public.review_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = review_requests.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "review_requests_insert_member" on public.review_requests;
create policy "review_requests_insert_member" on public.review_requests
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = review_requests.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- email_campaigns
drop policy if exists "email_campaigns_select_member" on public.email_campaigns;
create policy "email_campaigns_select_member" on public.email_campaigns
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "email_campaigns_insert_member" on public.email_campaigns;
create policy "email_campaigns_insert_member" on public.email_campaigns
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "email_campaigns_update_member" on public.email_campaigns;
create policy "email_campaigns_update_member" on public.email_campaigns
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "email_campaigns_delete_member" on public.email_campaigns;
create policy "email_campaigns_delete_member" on public.email_campaigns
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_campaigns.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- email_unsubscribes (member read; public insert via service role)
drop policy if exists "email_unsubscribes_select_member" on public.email_unsubscribes;
create policy "email_unsubscribes_select_member" on public.email_unsubscribes
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = email_unsubscribes.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

-- leads
drop policy if exists "leads_select_member" on public.leads;
create policy "leads_select_member" on public.leads
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = leads.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "leads_update_member" on public.leads;
create policy "leads_update_member" on public.leads
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = leads.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );
