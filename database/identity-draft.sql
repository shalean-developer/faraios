-- Local-tested schema draft. NOT a generated/applied Supabase migration.
-- Promotion requires Supabase CLI migration generation, advisors and staging verification.
begin;
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  industry text not null check (industry = 'cleaning'),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','staff')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);
create index business_memberships_user_business on public.business_memberships(user_id,business_id) where status='active';
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
revoke all on public.businesses, public.business_memberships from public, anon, authenticated;
grant select on public.businesses, public.business_memberships to authenticated;
create policy read_own_active_memberships on public.business_memberships for select to authenticated
  using (user_id=(select auth.uid()) and status='active');
create policy read_member_businesses on public.businesses for select to authenticated
  using (status='active' and exists (
    select 1 from public.business_memberships m
    where m.business_id=businesses.id and m.user_id=(select auth.uid()) and m.status='active'
  ));
-- No client write policies or write grants. Provisioning/invitations need a separate
-- owner-authorised audited server workflow; users cannot self-assign businesses/roles.
commit;
