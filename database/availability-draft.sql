-- T16: atomic, cross-business cleaner reservations. FaraiOS staging only.
begin;
-- Close the backfill/trigger-install race against the currently running app.
-- Readers may continue; booking writes wait until this transaction commits.
lock table public.one_off_bookings in share row exclusive mode;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path=public,extensions,pg_catalog;
-- Private implementation table. Never expose source businesses or customer data.
create table audit.cleaner_reservations (
 booking_id uuid not null references public.one_off_bookings(id) on delete restrict,
 staff_id uuid not null references auth.users(id) on delete restrict,
 business_id uuid not null references public.businesses(id) on delete restrict,
 occupied tstzrange not null check(not isempty(occupied) and not lower_inf(occupied) and not upper_inf(occupied)),
 primary key(booking_id,staff_id),
 exclude using gist(staff_id with =,occupied with &&)
);
alter table audit.cleaner_reservations enable row level security;
revoke all on audit.cleaner_reservations from public,anon,authenticated;
-- Backfill is all-or-nothing. Existing conflicts abort rather than silently drop jobs.
insert into audit.cleaner_reservations(booking_id,staff_id,business_id,occupied)
 select b.id,s,b.business_id,tstzrange(b.starts_at,b.ends_at,'[)')
 from public.one_off_bookings b cross join lateral unnest(b.assigned_staff) s
 where b.status in ('assigned','en_route','arrived','in_progress','completed');
create function audit.reserve_booking_staff() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_table_schema<>'public' or tg_table_name<>'one_off_bookings' then raise exception 'Unsupported reservation source';end if;
 if tg_op='UPDATE' and new.assigned_staff=old.assigned_staff and new.starts_at=old.starts_at and new.ends_at=old.ends_at and (new.status='cancelled')=(old.status='cancelled') then return new;end if;
 delete from audit.cleaner_reservations where booking_id=new.id;
 if new.status in ('assigned','en_route','arrived','in_progress','completed') then
  insert into audit.cleaner_reservations(booking_id,staff_id,business_id,occupied)
   select new.id,s,new.business_id,tstzrange(new.starts_at,new.ends_at,'[)') from unnest(new.assigned_staff) s order by s;
 end if;
 return new;
exception when exclusion_violation then
 -- Never forward PostgreSQL's conflicting-key detail across a tenant boundary.
 raise exception 'One or more selected cleaners are busy. Choose another time or team.' using errcode='23P01';
end;$fn$;
revoke all on function audit.reserve_booking_staff() from public,anon,authenticated;
create trigger reserve_booking_staff after insert or update on public.one_off_bookings for each row execute function audit.reserve_booking_staff();

-- One bounded local-date window, with business-owned entries and foreign busy time.
create function audit.calendar_window(p_business_id uuid,p_day date,p_days integer) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare tz text;lo timestamptz;hi timestamptz;own_entries jsonb;busy_entries jsonb;
begin
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','manager') and b.status='active') then raise exception 'Booking access denied' using errcode='42501';end if;
 if p_day is null or not isfinite(p_day) or p_days is null or p_days not in (1,7) then raise exception 'Choose a day or seven-day calendar';end if;
 select time_zone into tz from public.business_settings where business_id=p_business_id;
 if tz is null then raise exception 'Configure business working hours before opening calendar';end if;
 lo:=p_day::timestamp at time zone tz;hi:=(p_day+p_days)::timestamp at time zone tz;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'starts_at',b.starts_at,'ends_at',b.ends_at,'status',b.status,'name',b.customer_snapshot->>'name','assigned_staff',b.assigned_staff,'required_team_size',b.required_team_size) order by b.starts_at,b.id),'[]'::jsonb) into own_entries from public.one_off_bookings b where b.business_id=p_business_id and b.starts_at<hi and b.ends_at>lo and b.status<>'cancelled';
 select coalesce(jsonb_agg(jsonb_build_object('staff_id',r.staff_id,'starts_at',greatest(lower(r.occupied),lo),'ends_at',least(upper(r.occupied),hi)) order by lower(r.occupied),r.staff_id),'[]'::jsonb) into busy_entries from audit.cleaner_reservations r where r.business_id<>p_business_id and r.occupied && tstzrange(lo,hi,'[)') and exists(select 1 from public.business_memberships m where m.business_id=p_business_id and m.user_id=r.staff_id and m.role='staff' and m.status='active');
 return jsonb_build_object('time_zone',tz,'starts_at',lo,'ends_at',hi,'bookings',own_entries,'busy',busy_entries);
end;$fn$;
revoke all on function audit.calendar_window(uuid,date,integer) from public,anon,authenticated;
grant execute on function audit.calendar_window(uuid,date,integer) to authenticated;
create function public.calendar_window(p_business_id uuid,p_day date,p_days integer) returns jsonb language sql stable security invoker set search_path='' as $fn$select audit.calendar_window(p_business_id,p_day,p_days)$fn$;
revoke all on function public.calendar_window(uuid,date,integer) from public,anon,authenticated;
grant execute on function public.calendar_window(uuid,date,integer) to authenticated;

create function audit.staff_availability(p_business_id uuid,p_local_start timestamp,p_minutes integer,p_booking_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare tz text;lo timestamptz;hi timestamptz;result jsonb;
begin
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','manager') and b.status='active') then raise exception 'Booking access denied' using errcode='42501';end if;
 if p_local_start is null or not isfinite(p_local_start) or p_minutes is null or p_minutes not between 15 and 1440 then raise exception 'Enter a valid start and duration';end if;
 if p_booking_id is not null and not exists(select 1 from public.one_off_bookings where id=p_booking_id and business_id=p_business_id) then raise exception 'Booking access denied' using errcode='42501';end if;
 select time_zone into tz from public.business_settings where business_id=p_business_id;
 if tz is null then raise exception 'Configure business working hours before checking availability';end if;
 lo:=p_local_start at time zone tz;hi:=lo+make_interval(mins=>p_minutes);
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'busy',exists(select 1 from audit.cleaner_reservations r where r.staff_id=m.user_id and r.occupied && tstzrange(lo,hi,'[)') and (p_booking_id is null or r.booking_id<>p_booking_id))) order by m.user_id),'[]'::jsonb) into result from public.business_memberships m where m.business_id=p_business_id and m.role='staff' and m.status='active';
 return jsonb_build_object('time_zone',tz,'starts_at',lo,'ends_at',hi,'staff',result);
end;$fn$;
revoke all on function audit.staff_availability(uuid,timestamp,integer,uuid) from public,anon,authenticated;
grant execute on function audit.staff_availability(uuid,timestamp,integer,uuid) to authenticated;
create function public.staff_availability(p_business_id uuid,p_local_start timestamp,p_minutes integer,p_booking_id uuid default null) returns jsonb language sql stable security invoker set search_path='' as $fn$select audit.staff_availability(p_business_id,p_local_start,p_minutes,p_booking_id)$fn$;
revoke all on function public.staff_availability(uuid,timestamp,integer,uuid) from public,anon,authenticated;
grant execute on function public.staff_availability(uuid,timestamp,integer,uuid) to authenticated;
commit;
