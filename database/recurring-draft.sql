-- T17. Staging candidate; existing bookings are not rewritten or relinked.
begin;
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams','recurring_schedules'));
create table public.recurring_schedules (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_key uuid not null,
 source_booking_id uuid not null unique references public.one_off_bookings(id) on delete restrict,
 agreement jsonb not null,
 frequency text not null check(frequency in ('weekly','fortnightly','monthly')),
 weekdays smallint[] not null,
 start_date date not null check(isfinite(start_date)),
 local_time time not null,
 end_date date check(isfinite(end_date) and end_date>=start_date),
 short_month text not null default 'last_day' check(short_month in ('last_day','skip')),
 status text not null default 'active' check(status in ('active','paused','cancelled')),
 generated_through date not null check(isfinite(generated_through)),
 version integer not null default 1,
 change_reason text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,id),unique(business_id,request_key)
);
alter table public.recurring_schedules enable row level security;
revoke all on public.recurring_schedules from public,anon,authenticated;
grant select on public.recurring_schedules to authenticated;
create policy office_recurring_read on public.recurring_schedules for select to authenticated using(
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=recurring_schedules.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'));
alter table public.one_off_bookings
 add column recurring_schedule_id uuid,
 add column recurring_occurrence_date date,
 add column recurring_revision integer,
 add constraint recurring_business_fk foreign key(business_id,recurring_schedule_id) references public.recurring_schedules(business_id,id) on delete restrict,
 add constraint recurring_identity_complete check((recurring_schedule_id is null and recurring_occurrence_date is null and recurring_revision is null) or (recurring_schedule_id is not null and recurring_occurrence_date is not null and recurring_revision is not null and recurring_revision>0)),
 add constraint recurring_visit_unique unique(recurring_schedule_id,recurring_occurrence_date);

create function audit.recurring_access(p_business uuid) returns void language plpgsql stable security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','manager') and b.status='active') then raise exception 'Booking access denied' using errcode='42501';end if;
end;$fn$;
revoke all on function audit.recurring_access(uuid) from public,anon,authenticated;

create function audit.recurring_due(p_schedule public.recurring_schedules,p_date date) returns boolean language sql immutable security invoker set search_path='' as $fn$
 select p_date>=p_schedule.start_date and (p_schedule.end_date is null or p_date<=p_schedule.end_date) and case
 when p_schedule.frequency='monthly' then
  extract(day from p_date)=case when p_schedule.short_month='last_day' then least(extract(day from p_schedule.start_date),extract(day from (date_trunc('month',p_date)+interval '1 month - 1 day'))) else extract(day from p_schedule.start_date) end
 else extract(dow from p_date)::smallint=any(p_schedule.weekdays) and (p_schedule.frequency='weekly' or mod((date_trunc('week',p_date)::date-date_trunc('week',p_schedule.start_date)::date)/7,2)=0) end
$fn$;
revoke all on function audit.recurring_due(public.recurring_schedules,date) from public,anon,authenticated;

create function audit.recurring_validate() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 perform audit.recurring_access(new.business_id);
 if new.weekdays is null or cardinality(new.weekdays)>7 or array_position(new.weekdays,null) is not null or exists(select 1 from unnest(new.weekdays) d where d not between 0 and 6) or cardinality(new.weekdays)<>(select count(distinct d) from unnest(new.weekdays) d) or (new.frequency<>'monthly' and cardinality(new.weekdays)=0) then raise exception 'Choose distinct weekdays for this schedule';end if;
 if new.local_time='24:00'::time or length(trim(new.change_reason)) not between 1 and 2000 then raise exception 'Enter a valid time and change reason';end if;
 if tg_op='UPDATE' and (new.id<>old.id or new.business_id<>old.business_id or new.request_key<>old.request_key or new.source_booking_id<>old.source_booking_id or new.agreement<>old.agreement or new.start_date<>old.start_date or new.created_at<>old.created_at or new.generated_through<old.generated_through) then raise exception 'Recurring identity, agreement and history are immutable';end if;
 if tg_op='UPDATE' and old.status='cancelled' then raise exception 'Cancelled schedules cannot be changed';end if;
 if new.generated_through<new.start_date then raise exception 'Invalid recurring history boundary';end if;
 if tg_op='UPDATE' then new.version:=old.version+1;end if;
 new.updated_at:=now();return new;
end;$fn$;
revoke all on function audit.recurring_validate() from public,anon,authenticated;
create trigger validate_recurring before insert or update on public.recurring_schedules for each row execute function audit.recurring_validate();
create function audit.capture_recurring_change() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),'recurring_schedules',tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end;$fn$;
revoke all on function audit.capture_recurring_change() from public,anon,authenticated;
create trigger audit_recurring after insert or update on public.recurring_schedules for each row execute function audit.capture_recurring_change();

-- Frozen agreement path, without a client-controlled flag or trigger disabling.
-- The schedule lock serialises direct Data API inserts with generation and edits.
create function audit.prepare_recurring_booking() returns trigger language plpgsql security definer set search_path='' as $fn$
declare s public.recurring_schedules;a jsonb;ctx jsonb;local_end timestamp;
begin
 if tg_op='UPDATE' then
  if new.recurring_schedule_id is distinct from old.recurring_schedule_id or new.recurring_occurrence_date is distinct from old.recurring_occurrence_date or new.recurring_revision is distinct from old.recurring_revision then raise exception 'Recurring visit identity is immutable';end if;return new;
 end if;
 if new.recurring_schedule_id is null then return new;end if;
 perform audit.recurring_access(new.business_id);
 select * into s from public.recurring_schedules where id=new.recurring_schedule_id and business_id=new.business_id for update;
 if not found then raise exception 'Schedule unavailable' using errcode='42501';end if;
 a:=s.agreement;
 if s.status<>'active' or new.recurring_revision is distinct from s.version or new.recurring_occurrence_date is null or not isfinite(new.recurring_occurrence_date) or new.recurring_occurrence_date<=s.generated_through or new.recurring_occurrence_date>(now() at time zone (a->>'time_zone'))::date+90 or not audit.recurring_due(s,new.recurring_occurrence_date) then raise exception 'Visit is outside the active schedule';end if;
 new.local_start:=new.recurring_occurrence_date+s.local_time;
 new.time_zone:=a->>'time_zone';new.starts_at:=new.local_start at time zone new.time_zone;
 if new.starts_at<=now() then raise exception 'Only future visits can be generated';end if;
 new.customer_id:=(a->>'customer_id')::uuid;new.address_id:=(a->>'address_id')::uuid;
 if not exists(select 1 from public.business_customers c where c.id=new.customer_id and c.business_id=new.business_id and c.is_active) or not exists(select 1 from public.customer_addresses ad where ad.id=new.address_id and ad.business_id=new.business_id and ad.customer_id=new.customer_id and ad.is_active) then raise exception 'Recurring customer and address must be active';end if;
 new.duration_minutes:=(a->>'duration_minutes')::int;new.ends_at:=new.starts_at+make_interval(mins=>new.duration_minutes);
 new.customer_snapshot:=a->'customer_snapshot';new.address_snapshot:=a->'address_snapshot';new.selection:=a->'selection';new.price_lines:=a->'price_lines';new.total_cents:=(a->>'total_cents')::int;new.currency:=a->>'currency';new.required_team_size:=(a->>'required_team_size')::int;
 new.cleaning_scope:=nullif(a->'cleaning_scope','null'::jsonb);new.cleaning_snapshot:=nullif(a->'cleaning_snapshot','null'::jsonb);
 new.hours_override_reason:=a->>'hours_override_reason';new.assigned_staff:='{}';new.status:='draft';new.version:=1;new.created_at:=now();new.updated_at:=now();new.change_reason:='Created from recurring schedule';
 new.request_payload:=jsonb_build_object('recurring_schedule_id',s.id,'occurrence_date',new.recurring_occurrence_date,'revision',s.version);
 ctx:=public.booking_context(new.business_id);local_end:=new.local_start+make_interval(mins=>new.duration_minutes);
 if (not (ctx->'working_days' @> to_jsonb(array[extract(dow from new.local_start)::integer])) or new.local_start::time<(ctx->>'opens_at')::time or local_end::date<>new.local_start::date or local_end::time>(ctx->>'closes_at')::time) and length(trim(new.hours_override_reason))=0 then raise exception 'Outside business working hours: update the schedule or agreed override';end if;
 return new;
end;$fn$;
revoke all on function audit.prepare_recurring_booking() from public,anon,authenticated;
create trigger a_recurring_booking before insert or update on public.one_off_bookings for each row execute function audit.prepare_recurring_booking();
-- One-off creation keeps the exact existing validators. All updates use them too.
drop trigger validate_booking on public.one_off_bookings;
create trigger validate_booking before insert on public.one_off_bookings for each row when(new.recurring_schedule_id is null) execute function audit.validate_booking();
create trigger validate_booking_update before update on public.one_off_bookings for each row execute function audit.validate_booking();
drop trigger prepare_cleaning_booking on public.one_off_bookings;
create trigger prepare_cleaning_booking before insert on public.one_off_bookings for each row when(new.recurring_schedule_id is null) execute function audit.prepare_cleaning_booking();
create trigger prepare_cleaning_booking_update before update on public.one_off_bookings for each row execute function audit.prepare_cleaning_booking();
drop trigger zz_finish_cleaning_booking on public.one_off_bookings;
create trigger zz_finish_cleaning_booking before insert on public.one_off_bookings for each row when(new.recurring_schedule_id is null) execute function audit.finish_cleaning_booking();

create function audit.create_recurring(p_business_id uuid,p_source_id uuid,p_request_key uuid,p_frequency text,p_weekdays smallint[],p_end_date date,p_short_month text) returns uuid language plpgsql security definer set search_path='' as $fn$
declare b public.one_off_bookings;s public.recurring_schedules;agreement jsonb;
begin
 perform audit.recurring_access(p_business_id);
 select * into b from public.one_off_bookings where id=p_source_id and business_id=p_business_id for update;
 if not found or b.status='cancelled' or b.recurring_schedule_id is not null then raise exception 'Choose an original booking in this business';end if;
 select * into s from public.recurring_schedules where business_id=p_business_id and request_key=p_request_key;
 if found then
  if s.source_booking_id=p_source_id and s.frequency=p_frequency and s.weekdays=p_weekdays and s.end_date is not distinct from p_end_date and s.short_month=p_short_month then return s.id;end if;
  raise exception 'Request already used with different details' using errcode='40001';
 end if;
 agreement:=jsonb_build_object('customer_id',b.customer_id,'address_id',b.address_id,'duration_minutes',b.duration_minutes,'time_zone',b.time_zone,'selection',b.selection,'customer_snapshot',b.customer_snapshot,'address_snapshot',b.address_snapshot,'price_lines',b.price_lines,'total_cents',b.total_cents,'currency',b.currency,'required_team_size',b.required_team_size,'cleaning_scope',b.cleaning_scope,'cleaning_snapshot',b.cleaning_snapshot,'hours_override_reason',b.hours_override_reason);
 insert into public.recurring_schedules(business_id,request_key,source_booking_id,agreement,frequency,weekdays,start_date,local_time,end_date,short_month,generated_through,change_reason)
 values(p_business_id,p_request_key,p_source_id,agreement,p_frequency,p_weekdays,b.local_start::date,b.local_start::time,p_end_date,p_short_month,b.local_start::date,'Created from agreed booking') returning * into s;
 if not audit.recurring_due(s,s.start_date) then raise exception 'Include the source booking weekday';end if;
 return s.id;
end;$fn$;
revoke all on function audit.create_recurring(uuid,uuid,uuid,text,smallint[],date,text) from public,anon,authenticated;
grant execute on function audit.create_recurring(uuid,uuid,uuid,text,smallint[],date,text) to authenticated;
create function public.create_recurring(p_business_id uuid,p_source_id uuid,p_request_key uuid,p_frequency text,p_weekdays smallint[],p_end_date date,p_short_month text) returns uuid language sql security invoker set search_path='' as $fn$select audit.create_recurring(p_business_id,p_source_id,p_request_key,p_frequency,p_weekdays,p_end_date,p_short_month)$fn$;
revoke all on function public.create_recurring(uuid,uuid,uuid,text,smallint[],date,text) from public,anon,authenticated;
grant execute on function public.create_recurring(uuid,uuid,uuid,text,smallint[],date,text) to authenticated;

create function audit.change_recurring(p_business_id uuid,p_schedule_id uuid,p_version int,p_frequency text,p_weekdays smallint[],p_local_time time,p_end_date date,p_short_month text,p_status text,p_reason text) returns uuid language plpgsql security definer set search_path='' as $fn$
declare s public.recurring_schedules;
begin
 perform audit.recurring_access(p_business_id);
 select * into s from public.recurring_schedules where id=p_schedule_id and business_id=p_business_id for update;
 if not found then raise exception 'Schedule unavailable' using errcode='42501';end if;
 if p_version is distinct from s.version then raise exception 'Schedule changed. Reopen before saving.' using errcode='40001';end if;
 if p_end_date is not null and p_end_date<s.generated_through then raise exception 'End date must preserve the generated history boundary';end if;
 update public.recurring_schedules set frequency=p_frequency,weekdays=p_weekdays,local_time=p_local_time,end_date=p_end_date,short_month=p_short_month,status=p_status,change_reason=p_reason where id=s.id;
 return s.id;
end;$fn$;
revoke all on function audit.change_recurring(uuid,uuid,int,text,smallint[],time,date,text,text,text) from public,anon,authenticated;
grant execute on function audit.change_recurring(uuid,uuid,int,text,smallint[],time,date,text,text,text) to authenticated;
create function public.change_recurring(p_business_id uuid,p_schedule_id uuid,p_version int,p_frequency text,p_weekdays smallint[],p_local_time time,p_end_date date,p_short_month text,p_status text,p_reason text) returns uuid language sql security invoker set search_path='' as $fn$select audit.change_recurring(p_business_id,p_schedule_id,p_version,p_frequency,p_weekdays,p_local_time,p_end_date,p_short_month,p_status,p_reason)$fn$;
revoke all on function public.change_recurring(uuid,uuid,int,text,smallint[],time,date,text,text,text) from public,anon,authenticated;
grant execute on function public.change_recurring(uuid,uuid,int,text,smallint[],time,date,text,text,text) to authenticated;

create function audit.generate_recurring(p_business_id uuid,p_schedule_id uuid,p_version int,p_through date) returns integer language plpgsql security definer set search_path='' as $fn$
declare s public.recurring_schedules;d date;today date;n int:=0;existing uuid;
begin
 perform audit.recurring_access(p_business_id);
 select * into s from public.recurring_schedules where id=p_schedule_id and business_id=p_business_id for update;
 if not found then raise exception 'Schedule unavailable' using errcode='42501';end if;
 if s.status<>'active' then raise exception 'Schedule is not active';end if;
 today:=(now() at time zone (s.agreement->>'time_zone'))::date;
 if p_through is null or not isfinite(p_through) or p_through<today or p_through>today+90 then raise exception 'Choose a generation date within the next 90 days';end if;
 -- A completed retry is a no-op even after version advances.
 if p_through<=s.generated_through then return 0;end if;
 if p_version is distinct from s.version then raise exception 'Schedule changed. Reopen before generating.' using errcode='40001';end if;
 d:=greatest(s.generated_through+1,today);
 while d<=p_through loop
  if audit.recurring_due(s,d) and ((d+s.local_time) at time zone (s.agreement->>'time_zone'))>now() then
   select id into existing from public.one_off_bookings where recurring_schedule_id=s.id and recurring_occurrence_date=d;
   if not found then
    insert into public.one_off_bookings(business_id,request_key,recurring_schedule_id,recurring_occurrence_date,recurring_revision) values(s.business_id,gen_random_uuid(),s.id,d,s.version);
    n:=n+1;
   end if;
  end if;
  d:=d+1;
 end loop;
 update public.recurring_schedules set generated_through=p_through,change_reason='Generated future draft visits' where id=s.id;
 return n;
end;$fn$;
revoke all on function audit.generate_recurring(uuid,uuid,int,date) from public,anon,authenticated;
grant execute on function audit.generate_recurring(uuid,uuid,int,date) to authenticated;
create function public.generate_recurring(p_business_id uuid,p_schedule_id uuid,p_version int,p_through date) returns integer language sql security invoker set search_path='' as $fn$select audit.generate_recurring(p_business_id,p_schedule_id,p_version,p_through)$fn$;
revoke all on function public.generate_recurring(uuid,uuid,int,date) from public,anon,authenticated;
grant execute on function public.generate_recurring(uuid,uuid,int,date) to authenticated;
commit;
