-- Fix website image uploads blocked by storage / media RLS for company members.
-- Use security-definer helpers instead of inline memberships joins.

create or replace function public.is_website_company_member(p_website_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.websites w
    where w.id = p_website_id
      and public.is_company_member(w.client_id)
  );
$$;

grant execute on function public.is_website_company_member(uuid) to authenticated;

create or replace function public.can_manage_website_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(array_length(storage.foldername(p_object_name), 1), 0) >= 1
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.websites w
        where w.id::text = (storage.foldername(p_object_name))[1]
          and public.is_company_member(w.client_id)
      )
    );
$$;

grant execute on function public.can_manage_website_asset(text) to authenticated;

drop policy if exists "website_assets_member_insert" on storage.objects;
create policy "website_assets_member_insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'website-assets'
    and public.can_manage_website_asset(name)
  );

drop policy if exists "website_assets_member_update" on storage.objects;
create policy "website_assets_member_update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'website-assets'
    and public.can_manage_website_asset(name)
  )
  with check (
    bucket_id = 'website-assets'
    and public.can_manage_website_asset(name)
  );

drop policy if exists "website_assets_member_delete" on storage.objects;
create policy "website_assets_member_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'website-assets'
    and public.can_manage_website_asset(name)
  );

drop policy if exists "website_media_member" on public.website_media;
create policy "website_media_member" on public.website_media
  for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "website_content_manage_member" on public.website_content;
create policy "website_content_manage_member" on public.website_content
  for all to authenticated
  using (public.is_website_company_member(website_id))
  with check (public.is_website_company_member(website_id));
