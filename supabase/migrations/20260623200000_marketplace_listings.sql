-- Marketplace: public business directory + consumer bookings.

alter table public.companies
  add column if not exists listed_in_marketplace boolean not null default false;

alter table public.companies
  add column if not exists marketplace_summary text;

alter table public.companies
  add column if not exists marketplace_location text;

alter table public.companies
  add column if not exists marketplace_featured boolean not null default false;

alter table public.bookings
  add column if not exists customer_email text;

alter table public.bookings
  add column if not exists customer_phone text;

alter table public.bookings
  add column if not exists source text not null default 'internal';

create index if not exists companies_marketplace_listed_idx
  on public.companies (listed_in_marketplace, marketplace_featured)
  where listed_in_marketplace = true;

-- Public read for marketplace-listed companies with a published website.
drop policy if exists "companies_select_marketplace" on public.companies;
create policy "companies_select_marketplace" on public.companies
  for select
  using (
    listed_in_marketplace = true
    and exists (
      select 1
      from public.websites w
      where w.client_id = companies.id
        and w.status = 'published'
    )
  );

-- Consumers may book marketplace-listed businesses (anon + authenticated).
drop policy if exists "bookings_insert_marketplace" on public.bookings;
create policy "bookings_insert_marketplace" on public.bookings
  for insert to anon, authenticated
  with check (
    source = 'marketplace'
    and exists (
      select 1
      from public.companies c
      where c.id = bookings.company_id
        and c.listed_in_marketplace = true
        and exists (
          select 1
          from public.websites w
          where w.client_id = c.id
            and w.status = 'published'
        )
    )
  );

grant insert on table public.bookings to anon;

-- Admins manage marketplace flags via existing companies_update_platform_admin policy.
