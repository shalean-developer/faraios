-- Booking MVP + billing lifecycle fields.

alter table public.bookings
  add column if not exists booking_date timestamptz;

update public.bookings
set booking_date = date
where booking_date is null
  and date is not null;

alter table public.companies
  add column if not exists subscription_status text not null default 'inactive';

alter table public.companies
  add column if not exists next_billing_date timestamptz;

drop policy if exists "bookings_insert_member" on public.bookings;
create policy "bookings_insert_member" on public.bookings
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.memberships m
      where m.company_id = bookings.company_id
        and m.user_id = (select auth.uid())
    )
  );

grant insert on table public.bookings to authenticated;
