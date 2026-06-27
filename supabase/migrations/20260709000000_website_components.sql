-- V2 Website Builder: reusable saved components (hero, footer, FAQ, CTA blocks).
--
-- PREREQUISITE: public.companies and public.websites must already exist.
-- On a fresh Supabase project, do NOT run this file alone. Instead:
--   npm run db:print-full-schema-sql   (paste in SQL Editor), or
--   npm run db:apply-all-migrations    (needs SUPABASE_DB_PASSWORD in .env.local)
--
-- If the base schema is already applied, run only this migration:
--   npm run db:print-website-components-sql

do $$
begin
  if to_regclass('public.companies') is null then
    raise exception
      'Missing public.companies. Apply base Supabase migrations first (20260415120000_init_faraios.sql).';
  end if;

  if to_regclass('public.websites') is null then
    raise exception
      'Missing public.websites. Apply 20260415200000_websites_multitenant_domains.sql (or run `supabase db push`) before this migration.';
  end if;
end $$;

create table if not exists public.website_components (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  component_type text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.website_components
    add constraint website_components_type_check
    check (component_type in ('hero', 'footer', 'faq', 'cta-banner', 'booking-cta'));
exception
  when duplicate_object then null;
end $$;

create index if not exists website_components_website_id_idx
  on public.website_components (website_id, updated_at desc);

create index if not exists website_components_company_id_idx
  on public.website_components (company_id);

alter table public.website_components enable row level security;

drop policy if exists "website_components_member" on public.website_components;
create policy "website_components_member" on public.website_components
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_components.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_components.company_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.website_components to authenticated;
