-- V9: Website Builder — pages, service pages, enquiries, domain settings.

-- Allow draft / published / unpublished for builder publish workflow.
alter table public.websites drop constraint if exists websites_status_check;
alter table public.websites
  add constraint websites_status_check
  check (status in ('draft', 'published', 'unpublished'));

alter table public.websites
  add column if not exists slug text;

alter table public.websites
  add column if not exists title text;

alter table public.websites
  add column if not exists description text;

alter table public.websites
  add column if not exists theme_settings jsonb not null default '{}'::jsonb;

alter table public.websites
  add column if not exists builder_mode boolean not null default false;

alter table public.websites
  add column if not exists og_title text;

alter table public.websites
  add column if not exists og_description text;

alter table public.websites
  add column if not exists og_image_url text;

alter table public.websites
  add column if not exists published_at timestamptz;

alter table public.websites
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists websites_company_slug_idx
  on public.websites (client_id, slug)
  where slug is not null;

create table if not exists public.website_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  page_type text not null default 'custom',
  title text not null,
  slug text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, slug)
);

do $$
begin
  alter table public.website_pages
    add constraint website_pages_status_check
    check (status in ('draft', 'published', 'unpublished'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.website_service_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  service_id uuid references public.company_services (id) on delete set null,
  slug text not null,
  title text not null,
  description text,
  starting_price text,
  duration text,
  benefits jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  image_url text,
  status text not null default 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, slug)
);

do $$
begin
  alter table public.website_service_pages
    add constraint website_service_pages_status_check
    check (status in ('draft', 'published', 'unpublished'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.website_enquiries (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  service_interest text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.domain_settings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  default_url text,
  requested_subdomain text,
  custom_domain text,
  custom_domain_status text not null default 'coming_soon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id)
);

create index if not exists website_pages_company_id_idx on public.website_pages (company_id);
create index if not exists website_service_pages_company_id_idx on public.website_service_pages (company_id);
create index if not exists website_enquiries_company_id_idx on public.website_enquiries (company_id, created_at desc);

alter table public.website_pages enable row level security;
alter table public.website_service_pages enable row level security;
alter table public.website_enquiries enable row level security;
alter table public.domain_settings enable row level security;

drop policy if exists "website_pages_member" on public.website_pages;
create policy "website_pages_member" on public.website_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_pages.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_pages.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "website_service_pages_member" on public.website_service_pages;
create policy "website_service_pages_member" on public.website_service_pages
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_service_pages.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_service_pages.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "website_enquiries_member_select" on public.website_enquiries;
create policy "website_enquiries_member_select" on public.website_enquiries
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_enquiries.company_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "domain_settings_member" on public.domain_settings;
create policy "domain_settings_member" on public.domain_settings
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = domain_settings.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = domain_settings.company_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.website_pages to authenticated;
grant select, insert, update, delete on public.website_service_pages to authenticated;
grant select on public.website_enquiries to authenticated;
grant select, insert, update, delete on public.domain_settings to authenticated;
