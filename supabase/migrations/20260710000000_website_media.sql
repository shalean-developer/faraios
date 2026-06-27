-- V2 Website Builder: media library metadata (alt, tags, folders).
--
-- PREREQUISITE: public.companies and public.websites must already exist.

do $$
begin
  if to_regclass('public.companies') is null then
    raise exception
      'Missing public.companies. Apply base Supabase migrations first.';
  end if;

  if to_regclass('public.websites') is null then
    raise exception
      'Missing public.websites. Apply websites migrations before this file.';
  end if;
end $$;

create table if not exists public.website_media (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  storage_path text not null,
  url text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  alt_text text,
  tags text[] not null default '{}'::text[],
  folder text not null default 'General',
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists website_media_storage_path_idx
  on public.website_media (website_id, storage_path);

create index if not exists website_media_website_folder_idx
  on public.website_media (website_id, folder, updated_at desc);

create index if not exists website_media_company_id_idx
  on public.website_media (company_id);

alter table public.website_media enable row level security;

drop policy if exists "website_media_member" on public.website_media;
create policy "website_media_member" on public.website_media
  for all to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_media.company_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = website_media.company_id and m.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.website_media to authenticated;
