-- Fresh FaraiOS only. One business per owner in this first release.
begin;
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete restrict,
 name text not null check (name=btrim(name) and char_length(name) between 2 and 120),
 business_type text not null check (business_type in ('cleaning','beauty-wellness','home-maintenance-trades','other')),
 created_at timestamptz not null default now()
);
alter table public.businesses enable row level security;
revoke all on public.businesses from public, anon, authenticated;
grant select on public.businesses to authenticated;
grant insert (owner_id,name,business_type) on public.businesses to authenticated;
create policy owner_read on public.businesses for select to authenticated
 using ((select auth.uid())=owner_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,true));
create policy owner_create on public.businesses for insert to authenticated
 with check ((select auth.uid())=owner_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,true));
-- No update/delete grants. Ownership cannot be reassigned by a customer.
commit;
