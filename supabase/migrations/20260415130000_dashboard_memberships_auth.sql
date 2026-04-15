-- Client dashboard: tie memberships to Supabase Auth, company lifecycle fields, RLS.

-- Company flags (active site = published)
alter table public.companies
  add column if not exists is_published boolean not null default false;

alter table public.companies
  add column if not exists build_status text not null default 'pending';

do $$
begin
  alter table public.companies
    add constraint companies_build_status_check
    check (build_status in ('pending', 'in-progress', 'review', 'completed'));
exception
  when duplicate_object then null;
end $$;

-- Memberships reference logged-in users (auth.users), not public.users
alter table public.memberships
  drop constraint if exists memberships_user_id_fkey;

alter table public.memberships
  add constraint memberships_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade;

alter table public.memberships enable row level security;

drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "memberships_insert_own" on public.memberships;
create policy "memberships_insert_own" on public.memberships
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "memberships_delete_own" on public.memberships;
create policy "memberships_delete_own" on public.memberships
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on table public.memberships to authenticated;

-- Bookings: readable by company members (payments/analytics hooks later)
alter table public.bookings enable row level security;

drop policy if exists "bookings_select_member" on public.bookings;
create policy "bookings_select_member" on public.bookings
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = bookings.company_id
        and m.user_id = (select auth.uid())
    )
  );

grant select on table public.bookings to authenticated;
