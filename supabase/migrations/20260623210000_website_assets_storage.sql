-- Public bucket for website hero, service, and section images uploaded from the admin editor.
-- Includes is_platform_admin() so this migration can run standalone in the SQL editor.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)values (
  'website-assets',
  'website-assets',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "website_assets_public_read" on storage.objects;
create policy "website_assets_public_read" on storage.objects
  for select
  to public
  using (bucket_id = 'website-assets');

drop policy if exists "website_assets_member_insert" on storage.objects;
create policy "website_assets_member_insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'website-assets'
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        join public.memberships m on m.company_id = w.client_id
        where m.user_id = (select auth.uid())
          and (storage.foldername(name))[1] = w.id::text
      )
    )
  );

drop policy if exists "website_assets_member_update" on storage.objects;
create policy "website_assets_member_update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'website-assets'
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        join public.memberships m on m.company_id = w.client_id
        where m.user_id = (select auth.uid())
          and (storage.foldername(name))[1] = w.id::text
      )
    )
  )
  with check (bucket_id = 'website-assets');

drop policy if exists "website_assets_member_delete" on storage.objects;
create policy "website_assets_member_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'website-assets'
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        join public.memberships m on m.company_id = w.client_id
        where m.user_id = (select auth.uid())
          and (storage.foldername(name))[1] = w.id::text
      )
    )
  );
