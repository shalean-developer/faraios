-- V2 completion: booking activity history.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- Match booking_activities.booking_id type to public.bookings.id (uuid or legacy text).
do $$
declare
  bookings_id_type text;
  booking_id_col text;
begin
  select c.data_type
  into bookings_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'bookings'
    and c.column_name = 'id';

  if bookings_id_type is null then
    raise exception 'public.bookings.id column not found';
  end if;

  if bookings_id_type = 'text' then
    begin
      alter table public.bookings
        alter column id type uuid using id::uuid;
      bookings_id_type := 'uuid';
    exception
      when others then
        raise notice 'Keeping bookings.id as text: %', SQLERRM;
    end;
  end if;

  drop table if exists public.booking_activities;

  if bookings_id_type = 'uuid' then
    booking_id_col := 'booking_id uuid not null references public.bookings(id) on delete cascade';
  else
    booking_id_col := 'booking_id text not null references public.bookings(id) on delete cascade';
  end if;

  execute format(
    'create table public.booking_activities (
      id uuid primary key default gen_random_uuid(),
      %s,
      company_id uuid not null references public.companies(id) on delete cascade,
      actor_user_id uuid references auth.users(id) on delete set null,
      event_type text not null
        check (event_type in (''created'', ''status_changed'', ''staff_assigned'', ''note_updated'')),
      message text not null,
      metadata jsonb not null default ''{}''::jsonb,
      created_at timestamptz not null default now()
    )',
    booking_id_col
  );
end $$;

create index if not exists booking_activities_booking_id_idx
  on public.booking_activities(booking_id, created_at desc);

create index if not exists booking_activities_company_id_idx
  on public.booking_activities(company_id, created_at desc);

alter table public.booking_activities enable row level security;

grant select, insert on table public.booking_activities to authenticated;

drop policy if exists "booking_activities_select_member" on public.booking_activities;
create policy "booking_activities_select_member" on public.booking_activities
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_activities.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );

drop policy if exists "booking_activities_insert_member" on public.booking_activities;
create policy "booking_activities_insert_member" on public.booking_activities
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.company_id = booking_activities.company_id
        and m.user_id = (select auth.uid())
    )
    or public.is_platform_admin()
  );
