-- Multi-tenant websites + content + domain support.

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  template text not null,
  domain text,
  subdomain text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.websites
    add constraint websites_status_check
    check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists websites_domain_unique_idx
  on public.websites (lower(domain))
  where domain is not null;

create unique index if not exists websites_subdomain_unique_idx
  on public.websites (lower(subdomain));

create index if not exists websites_client_id_idx on public.websites (client_id);

create table if not exists public.website_content (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  section text not null,
  content jsonb not null default '{}'::jsonb
);

create index if not exists website_content_website_id_idx
  on public.website_content (website_id);

alter table public.websites enable row level security;
alter table public.website_content enable row level security;

drop policy if exists "websites_select_public" on public.websites;
create policy "websites_select_public" on public.websites
  for select
  using (true);

drop policy if exists "websites_manage_member" on public.websites;
create policy "websites_manage_member" on public.websites
  for all to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = websites.client_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = websites.client_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "website_content_select_public_published" on public.website_content;
create policy "website_content_select_public_published" on public.website_content
  for select
  using (
    exists (
      select 1
      from public.websites w
      where w.id = website_content.website_id
        and w.status = 'published'
    )
  );

drop policy if exists "website_content_manage_member" on public.website_content;
create policy "website_content_manage_member" on public.website_content
  for all to authenticated
  using (
    exists (
      select 1
      from public.websites w
      join public.memberships m
        on m.company_id = w.client_id
      where w.id = website_content.website_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.memberships m
        on m.company_id = w.client_id
      where w.id = website_content.website_id
        and m.user_id = (select auth.uid())
    )
  );

grant select on public.websites to anon, authenticated;
grant insert, update, delete on public.websites to authenticated;
grant select on public.website_content to anon, authenticated;
grant insert, update, delete on public.website_content to authenticated;
