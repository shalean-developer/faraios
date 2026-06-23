-- Admin CRM fields, notes, platform settings, and user notification preferences.

alter table public.companies
  add column if not exists contact_phone text,
  add column if not exists contact_location text,
  add column if not exists admin_client_note text,
  add column if not exists admin_client_note_updated_at timestamptz;

alter table public.users
  add column if not exists admin_preferences jsonb not null default '{}'::jsonb;

create table if not exists public.platform_settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'Farai Creative Studio',
  platform_name text not null default 'FaraiOS',
  updated_at timestamptz default now()
);

insert into public.platform_settings (id, company_name, platform_name)
values (1, 'Farai Creative Studio', 'FaraiOS')
on conflict (id) do nothing;

create table if not exists public.admin_company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists admin_company_notes_company_idx
  on public.admin_company_notes (company_id, created_at desc);

alter table public.platform_settings enable row level security;
alter table public.admin_company_notes enable row level security;

grant select, update on table public.platform_settings to authenticated;
grant select, insert on table public.admin_company_notes to authenticated;

drop policy if exists "platform_settings_select_admin" on public.platform_settings;
create policy "platform_settings_select_admin" on public.platform_settings
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "platform_settings_update_admin" on public.platform_settings;
create policy "platform_settings_update_admin" on public.platform_settings
  for update to authenticated
  using (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "admin_company_notes_select_admin" on public.admin_company_notes;
create policy "admin_company_notes_select_admin" on public.admin_company_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );

drop policy if exists "admin_company_notes_insert_admin" on public.admin_company_notes;
create policy "admin_company_notes_insert_admin" on public.admin_company_notes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.platform_admins p
      where p.user_id = (select auth.uid())
    )
  );
