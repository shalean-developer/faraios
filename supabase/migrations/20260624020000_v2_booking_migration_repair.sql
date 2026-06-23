-- Safe to re-run in Supabase SQL editor after a failed V2 migration.
-- Fixes payment_status check violations and booking_activities FK type mismatch.

-- 1) payment_status backfill
update public.bookings
set payment_status = 'unpaid'
where payment_status is null
   or trim(payment_status) = '';

update public.bookings
set payment_status = 'unpaid'
where lower(trim(payment_status)) in (
  'confirmed', 'assigned', 'in_progress', 'completed',
  'cancelled', 'rescheduled', 'canceled', 'cancel', 'active', 'open', 'new', 'requested'
);

update public.bookings
set payment_status = 'paid'
where lower(trim(payment_status)) in (
  'paid', 'complete', 'success', 'successful', 'succeeded'
);

update public.bookings
set payment_status = 'pending'
where lower(trim(payment_status)) in (
  'processing', 'awaiting', 'awaiting_payment'
);

update public.bookings
set payment_status = 'refunded'
where lower(trim(payment_status)) in ('refunded', 'refund', 'reversed');

update public.bookings
set payment_status = 'unpaid'
where payment_status is not null
  and lower(trim(payment_status)) not in ('unpaid', 'pending', 'paid', 'refunded');

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'refunded'));

-- 2) booking_activities: drop broken table if present, then re-apply completion migration
--    or run: supabase/migrations/20260624010000_v2_booking_completion.sql
