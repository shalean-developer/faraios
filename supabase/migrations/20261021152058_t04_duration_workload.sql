-- T04: configurable booking-duration floors/blocks and cross-business daily work limits.
-- No tenant policy or existing booking is changed by this migration.
begin;
lock table public.one_off_bookings in share row exclusive mode;
alter table public.business_settings add column max_daily_minutes integer check(max_daily_minutes between 15 and 1440);
alter table public.one_off_bookings
 add column setup_minutes integer check(setup_minutes between 0 and 1440),
 add column travel_minutes integer check(travel_minutes between 0 and 1440),
 add column workload_limit_minutes integer check(workload_limit_minutes between 15 and 1440),
 add column workload_time_zone text check(workload_time_zone in ('Africa/Johannesburg','UTC')),
 add constraint booking_workload_policy_pair check((workload_limit_minutes is null)=(workload_time_zone is null));

create function audit.validate_duration_config() returns trigger language plpgsql security invoker set search_path='' as $fn$
declare cfg jsonb:=new.cleaning_config;k text;v text;step_size integer;option jsonb;
begin
 if cfg is null then return new;end if;
 foreach k in array array['minimum_minutes','duration_step_minutes'] loop
  if cfg ? k and (jsonb_typeof(cfg->k) is distinct from 'number' or coalesce(cfg->>k,'')!~'^[0-9]{1,4}$' or (cfg->>k)::integer not between (case when k='minimum_minutes' then 15 else 1 end) and 1440) then raise exception 'Configure positive minimum and time-block minutes';end if;
 end loop;
 if cfg ? 'require_assessment' and jsonb_typeof(cfg->'require_assessment') is distinct from 'boolean' then raise exception 'Invalid scope assessment setting';end if;
 step_size:=coalesce((cfg->>'duration_step_minutes')::integer,1);
 if coalesce((cfg->>'minimum_minutes')::integer,0)%step_size<>0 or (cfg->>'base_minutes')::integer%step_size<>0 then raise exception 'Base and minimum must use the configured time blocks';end if;
 for option in select rate.value from jsonb_each(cfg->'rules') field cross join lateral jsonb_each(field.value) rate loop
  if (option->>'minutes')::integer%step_size<>0 then raise exception 'Each item time must use the configured time blocks';end if;
 end loop;
 for v in select value from jsonb_each_text(cfg->'extra_minutes') loop
  if v::integer%step_size<>0 then raise exception 'Each extra time must use the configured time blocks';end if;
 end loop;
 if cfg->'equipment'->>'policy'='distance' and (cfg->'equipment'->>'minutes')::integer%step_size<>0 then raise exception 'Equipment time must use the configured time blocks';end if;
 return new;
end;$fn$;
revoke all on function audit.validate_duration_config() from public,anon,authenticated;
create trigger zz_validate_duration_config before insert or update on public.business_catalogue for each row execute function audit.validate_duration_config();

-- Extend the existing builder in place so cached callers retain the same function identity.
create or replace function audit.build_cleaning_snapshot(p_booking public.one_off_bookings) returns public.one_off_bookings language plpgsql security invoker set search_path='' as $builder$
declare new public.one_off_bookings:=p_booking;service public.business_catalogue;defs jsonb:=audit.cleaning_definitions();cfg jsonb;s jsonb;k text;v text;opt text;r jsonb;qty int;minutes bigint;amount numeric:=0;fee numeric:=0;lines jsonb:='[]';line jsonb;allowed text[];item public.business_catalogue;requires_assessment boolean:=false;assessment jsonb;configured_minutes bigint;minimum integer;step_size integer;
begin
 perform public.booking_context(new.business_id);
 select * into service from public.business_catalogue where id=(new.selection->0->>'catalogue_id')::uuid and business_id=new.business_id and kind='service' and is_active;
 new.cleaning_snapshot:=null;
 if service.cleaning_profile is null then
  if new.cleaning_scope is not null then raise exception 'Scope requires a configured cleaning service';end if;return new;
 end if;
 cfg:=service.cleaning_config;s:=new.cleaning_scope;
 if cfg is null then raise exception 'Owner must configure service pricing, duration and equipment';end if;
 if jsonb_typeof(s) is distinct from 'object' then raise exception 'Enter service scope';end if;
 requires_assessment:=coalesce((cfg->>'manual_duration')::boolean,false) or coalesce((cfg->>'require_assessment')::boolean,false);minimum:=coalesce((cfg->>'minimum_minutes')::integer,0);step_size:=coalesce((cfg->>'duration_step_minutes')::integer,1);
 allowed:=array(select jsonb_array_elements_text(defs->'profileFields'->service.cleaning_profile));
 if service.cleaning_profile='airbnb' then allowed:=allowed||array['access_instructions'];end if;
 if service.cleaning_profile='airbnb' and cfg->>'linen_change_enabled'='true' then allowed:=allowed||array['linen_change'];end if;
 if cfg->'equipment'->>'policy'='distance' then allowed:=allowed||array['equipment','distance_km','distance_reason'];end if;
 allowed:=allowed||array['assessment'];
 if cfg->'equipment'->>'policy'='assessed' then allowed:=allowed||array['equipment_arrangement'];end if;
 if exists(select 1 from jsonb_object_keys(s) key where not key=any(allowed)) then raise exception 'Unexpected service scope field';end if;
 if not exists(select 1 from public.business_customers where id=new.customer_id and business_id=new.business_id and length(trim(phone))>0) then raise exception 'Save a contact phone on the selected customer before booking cleaning';end if;
 minutes:=(cfg->>'base_minutes')::int;
 amount:=(cfg->>'service_fee_cents')::numeric;
 lines:=jsonb_build_array(jsonb_build_object('name','Service fee','kind','fee','pricing_model','fixed','unit_label','visit','rate_cents',amount,'quantity',1,'total_cents',amount));
 for k in select jsonb_array_elements_text((defs->'profileFields'->service.cleaning_profile)||case when service.cleaning_profile='airbnb' and cfg->>'linen_change_enabled'='true' then '["linen_change"]'::jsonb else '[]'::jsonb end) loop
  v:=s->>k;
  if defs->'definitions'->k->>'count'='true' then
   if jsonb_typeof(s->k) is distinct from 'number' or coalesce(v,'')!~'^[0-9]{1,3}$' or v::int>100 or (k in ('bathrooms','carpet_rooms') and v::int<1) then raise exception 'Enter valid whole room counts (0–100; bathrooms and carpet rooms at least 1)';end if;qty:=v::int;opt:='unit';
  else
   if jsonb_typeof(s->k) is distinct from 'string' or not (case when k='pets' then cfg->'rules'->k else defs->'definitions'->k->'options' end ? v) then raise exception 'Select every required service option';end if;qty:=1;opt:=v;
  end if;
  r:=cfg->'rules'->k->opt;if r is null then raise exception 'Service rules need configuration before booking';end if;
  if coalesce((r->>'assessment')::boolean,false) and qty>0 then requires_assessment:=true;end if;
  minutes:=minutes+(r->>'minutes')::int*qty;amount:=amount+(r->>'cents')::numeric*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('name',defs->'definitions'->k->>'label'||': '||v,'kind','scope','pricing_model','per_unit','unit_label',case when opt='unit' then 'each' else 'option' end,'rate_cents',(r->>'cents')::numeric,'quantity',qty,'total_cents',(r->>'cents')::numeric*qty));
 end loop;
 if service.cleaning_profile='airbnb' and s->>'linen'='No linen change' and s->>'linen_change'='Yes' then raise exception 'Fresh linen must be available for a linen change';end if;
 if service.cleaning_profile='airbnb' and (s ? 'access_instructions') and (jsonb_typeof(s->'access_instructions') is distinct from 'string' or length(s->>'access_instructions')>2000) then raise exception 'Check access instructions';end if;
 if cfg->'equipment'->>'policy'='distance' then
  if coalesce(s->>'equipment','') not in ('Yes','No') then raise exception 'Select equipment Yes or No';end if;
  if s->>'equipment'='Yes' then
   if jsonb_typeof(s->'distance_km') is distinct from 'number' or coalesce(s->>'distance_km','')!~'^[0-9]{1,4}(\.[0-9]{1,2})?$' or (s->>'distance_km')::numeric>1000 or jsonb_typeof(s->'distance_reason') is distinct from 'string' or length(trim(coalesce(s->>'distance_reason',''))) not between 1 and 500 then raise exception 'Record equipment distance and its source';end if;
   fee:=greatest((cfg->'equipment'->>'minimum_cents')::numeric,ceil((cfg->'equipment'->>'base_cents')::numeric+(s->>'distance_km')::numeric*(cfg->'equipment'->>'per_km_cents')::numeric));
   minutes:=minutes+(cfg->'equipment'->>'minutes')::int;amount:=amount+fee;
   lines:=lines||jsonb_build_array(jsonb_build_object('name','Equipment delivery / collection','kind','equipment','pricing_model','fixed','unit_label','quote','rate_cents',fee,'quantity',1,'total_cents',fee));
  elsif s ? 'distance_km' or s ? 'distance_reason' then raise exception 'Remove equipment distance when equipment is No';end if;
 end if;
 if cfg->'equipment'->>'policy'='assessed' then
  if coalesce(s->>'equipment_arrangement','') not in ('Customer supplies equipment','Business supplies equipment') then raise exception 'Choose the equipment arrangement';end if;
  if s->>'equipment_arrangement'='Business supplies equipment' then requires_assessment:=true;end if;
 end if;
 for line in select value from jsonb_array_elements(new.selection) with ordinality t(value,n) where n>1 loop
  if not (cfg->'extras' ? (line->>'catalogue_id')) then raise exception 'Extra not allowed for this service';end if;
  -- Base validator checks active item, tenant, type and quantity as well.
  select * into item from public.business_catalogue where id=(line->>'catalogue_id')::uuid and business_id=new.business_id and kind='extra' and is_active;
  if not found then raise exception 'Select active business extras';end if;
  if coalesce(line->>'quantity','')!~'^[1-9][0-9]{0,5}$' then raise exception 'Use positive whole-number quantities';end if;
  minutes:=minutes+(cfg->'extra_minutes'->>(line->>'catalogue_id'))::int*(line->>'quantity')::int;
 end loop;
 minutes:=greatest(minutes,minimum);configured_minutes:=minutes;
 assessment:=s->'assessment';
 if requires_assessment and assessment is null then raise exception 'Office assessment, charge, duration and reason required before saving';end if;
 if assessment is not null then
  if jsonb_typeof(assessment) is distinct from 'object' then raise exception 'Invalid office assessment';end if;
  if exists(select 1 from jsonb_object_keys(assessment) key where key not in ('additional_cents','duration_minutes','reason')) then raise exception 'Unexpected assessment fields';end if;
  if jsonb_typeof(assessment->'additional_cents') is distinct from 'number' or coalesce(assessment->>'additional_cents','')!~'^[0-9]{1,10}$' or (assessment->>'additional_cents')::numeric>2147483647 or jsonb_typeof(assessment->'duration_minutes') is distinct from 'number' or coalesce(assessment->>'duration_minutes','')!~'^[0-9]{1,4}$' or (assessment->>'duration_minutes')::int not between 15 and 1440 or jsonb_typeof(assessment->'reason') is distinct from 'string' or length(trim(coalesce(assessment->>'reason',''))) not between 1 and 2000 then raise exception 'Enter explicit assessment charge, duration and reason';end if;
  if not coalesce((cfg->>'manual_duration')::boolean,false) and (assessment->>'duration_minutes')::int<minutes then raise exception 'Assessed duration cannot be shorter than the configured estimate';end if;
  minutes:=(assessment->>'duration_minutes')::int;amount:=amount+(assessment->>'additional_cents')::numeric;
  lines:=lines||jsonb_build_array(jsonb_build_object('name','Office-assessed additional work / equipment','kind','assessment','pricing_model','fixed','unit_label','assessment','rate_cents',(assessment->>'additional_cents')::numeric,'quantity',1,'total_cents',(assessment->>'additional_cents')::numeric));
 end if;
 if minutes<minimum or minutes%step_size<>0 then raise exception 'Assessed or calculated duration must meet the minimum total booking duration and time blocks';end if;
 if minutes not between 15 and 1440 or amount>2147483647 then raise exception 'Configured quote exceeds supported price or duration bounds';end if;
 new.duration_minutes:=minutes;
 new.cleaning_snapshot:=jsonb_build_object('profile',service.cleaning_profile,'version',service.version,'configuration',cfg,'duration_minutes',minutes,'adjustment_cents',amount,'lines',lines,'equipment_policy',cfg->'equipment'->>'policy','equipment_fee_cents',fee,'configured_duration_minutes',case when coalesce((cfg->>'manual_duration')::boolean,false) then null else configured_minutes end,'assessed_duration_minutes',case when assessment is not null then minutes else null end,'assessment_required',requires_assessment,'assessed_by',case when assessment is not null then auth.uid() else null end,'assessed_at',case when assessment is not null then now() else null end);
 return new;
end;
$builder$;
revoke all on function audit.build_cleaning_snapshot(public.one_off_bookings) from public,anon,authenticated;
grant execute on function audit.build_cleaning_snapshot(public.one_off_bookings) to authenticated;

-- An actual row update, rather than only an advisory lock, makes a competing
-- repeatable-read transaction fail safely instead of using a stale workload sum.
create table audit.cleaner_workload_locks(staff_id uuid primary key references auth.users(id),revision bigint not null default 0);
alter table audit.cleaner_workload_locks enable row level security;
revoke all on audit.cleaner_workload_locks from public,anon,authenticated;

create function audit.booking_workload_metadata() returns trigger language plpgsql security definer set search_path='' as $fn$
declare changed boolean;cfg jsonb;cap integer;
begin
 if tg_table_schema<>'public' or tg_table_name<>'one_off_bookings' then raise exception 'Unsupported work plan source';end if;
 if tg_op='INSERT' then new.workload_limit_minutes:=null;new.workload_time_zone:=null;else
  if new.workload_limit_minutes is distinct from old.workload_limit_minutes or new.workload_time_zone is distinct from old.workload_time_zone then raise exception 'Workload policy snapshot is immutable';end if;
 end if;
 changed:=tg_op='INSERT';
 if tg_op='UPDATE' then
  changed:=new.assigned_staff is distinct from old.assigned_staff or new.local_start is distinct from old.local_start or new.duration_minutes is distinct from old.duration_minutes or new.setup_minutes is distinct from old.setup_minutes or new.travel_minutes is distinct from old.travel_minutes;
  if (new.setup_minutes is distinct from old.setup_minutes or new.travel_minutes is distinct from old.travel_minutes) and (old.status not in ('draft','confirmed','assigned') or length(trim(new.change_reason))=0) then raise exception 'Work plan changes require a pre-start booking and reason';end if;
  cfg:=new.cleaning_snapshot->'configuration';
  if new.duration_minutes<>old.duration_minutes and (new.duration_minutes<coalesce((cfg->>'minimum_minutes')::integer,15) or new.duration_minutes%coalesce((cfg->>'duration_step_minutes')::integer,1)<>0) then raise exception 'Rescheduled duration must meet the saved minimum and time blocks';end if;
 end if;
 if changed and new.status in ('assigned','en_route','arrived','in_progress','completed') then
  if new.workload_limit_minutes is null then
   select max_daily_minutes into cap from public.business_settings where business_id=new.business_id;
   if cap is not null then new.workload_limit_minutes:=cap;new.workload_time_zone:=new.time_zone;end if;
  end if;
  if new.workload_limit_minutes is not null and (new.setup_minutes is null or new.travel_minutes is null) then raise exception 'Review setup and required work travel before assigning this visit';end if;
 end if;
 return new;
end;$fn$;
revoke all on function audit.booking_workload_metadata() from public,anon,authenticated;
create trigger z_booking_workload_metadata before insert or update on public.one_off_bookings for each row execute function audit.booking_workload_metadata();

create function audit.workload_issue(p_staff uuid,p_exclude uuid,p_lo timestamptz,p_hi timestamptz,p_cap integer,p_zone text,p_plan boolean) returns text language plpgsql security definer set search_path='' as $fn$
declare policy record;day date;day_lo timestamptz;day_hi timestamptz;total_minutes numeric;applies boolean;
begin
 for policy in
  select p_cap as cap,p_zone as zone where p_cap is not null
  union
  select distinct b.workload_limit_minutes,b.workload_time_zone from audit.cleaner_reservations r join public.one_off_bookings b on b.id=r.booking_id
   where r.staff_id=p_staff and r.booking_id is distinct from p_exclude and b.workload_limit_minutes is not null and r.occupied && tstzrange(p_lo-interval '1 day',p_hi+interval '1 day','[)')
 loop
  for day in select generate_series((p_lo at time zone policy.zone)::date::timestamp,((p_hi-interval '1 microsecond') at time zone policy.zone)::date::timestamp,interval '1 day')::date loop
   day_lo:=day::timestamp at time zone policy.zone;day_hi:=(day+1)::timestamp at time zone policy.zone;
   applies:=(p_cap=policy.cap and p_zone=policy.zone) or exists(select 1 from audit.cleaner_reservations r join public.one_off_bookings b on b.id=r.booking_id where r.staff_id=p_staff and r.booking_id is distinct from p_exclude and b.workload_limit_minutes=policy.cap and b.workload_time_zone=policy.zone and r.occupied && tstzrange(day_lo,day_hi,'[)'));
   if coalesce(applies,false) then
    if not p_plan or exists(select 1 from audit.cleaner_reservations r join public.one_off_bookings b on b.id=r.booking_id where r.staff_id=p_staff and r.booking_id is distinct from p_exclude and r.occupied && tstzrange(day_lo,day_hi,'[)') and (b.setup_minutes is null or b.travel_minutes is null)) then return 'plan_required';end if;
    select coalesce(sum(extract(epoch from least(upper(r.occupied),day_hi)-greatest(lower(r.occupied),day_lo))/60),0) into total_minutes from audit.cleaner_reservations r where r.staff_id=p_staff and r.booking_id is distinct from p_exclude and r.occupied && tstzrange(day_lo,day_hi,'[)');
    total_minutes:=total_minutes+extract(epoch from least(p_hi,day_hi)-greatest(p_lo,day_lo))/60;
    if total_minutes>policy.cap then return 'over_limit';end if;
   end if;
  end loop;
 end loop;
 return null;
end;$fn$;
revoke all on function audit.workload_issue(uuid,uuid,timestamptz,timestamptz,integer,text,boolean) from public,anon,authenticated;

create or replace function audit.reserve_booking_staff() returns trigger language plpgsql security definer set search_path='' as $fn$
declare uid uuid;lo timestamptz;issue text;affected uuid[];
begin
 if tg_table_schema<>'public' or tg_table_name<>'one_off_bookings' then raise exception 'Unsupported reservation source';end if;
 if tg_op='UPDATE' and new.assigned_staff=old.assigned_staff and new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.setup_minutes is not distinct from old.setup_minutes and new.travel_minutes is not distinct from old.travel_minutes and (new.status='cancelled')=(old.status='cancelled') then return new;end if;
 affected:=new.assigned_staff;if tg_op='UPDATE' then affected:=affected||old.assigned_staff;end if;
 for uid in select distinct x from unnest(affected) x order by x loop
  insert into audit.cleaner_workload_locks(staff_id,revision) values(uid,1) on conflict(staff_id) do update set revision=audit.cleaner_workload_locks.revision+1;
 end loop;
 delete from audit.cleaner_reservations where booking_id=new.id;
 if new.status in ('assigned','en_route','arrived','in_progress','completed') then
  lo:=new.starts_at-make_interval(mins=>coalesce(new.setup_minutes,0)+coalesce(new.travel_minutes,0));
  foreach uid in array new.assigned_staff loop
   issue:=audit.workload_issue(uid,new.id,lo,new.ends_at,new.workload_limit_minutes,new.workload_time_zone,new.setup_minutes is not null and new.travel_minutes is not null);
   if issue='plan_required' then raise exception 'Review setup and required work travel for the cleaner''s assignments before proceeding' using errcode='23514';end if;
   if issue='over_limit' then raise exception 'Daily workload limit exceeded. Review the cleaner''s schedule' using errcode='23514';end if;
  end loop;
  insert into audit.cleaner_reservations(booking_id,staff_id,business_id,occupied) select new.id,s,new.business_id,tstzrange(lo,new.ends_at,'[)') from unnest(new.assigned_staff) s order by s;
 end if;
 return new;
exception when exclusion_violation then
 raise exception 'One or more selected cleaners are busy. Choose another time or team.' using errcode='23P01';
end;$fn$;

create or replace function audit.staff_availability(p_business_id uuid,p_local_start timestamp,p_minutes integer,p_booking_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare tz text;lo timestamptz;hi timestamptz;result jsonb;cap integer;setup integer;travel integer;booking public.one_off_bookings;
begin
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','manager') and b.status='active') then raise exception 'Booking access denied' using errcode='42501';end if;
 if p_local_start is null or not isfinite(p_local_start) or p_minutes is null or p_minutes not between 15 and 1440 then raise exception 'Enter a valid start and duration';end if;
 if p_booking_id is not null then select * into booking from public.one_off_bookings where id=p_booking_id and business_id=p_business_id;if not found then raise exception 'Booking access denied' using errcode='42501';end if;end if;
 select time_zone,max_daily_minutes into tz,cap from public.business_settings where business_id=p_business_id;
 if tz is null then raise exception 'Configure business working hours before checking availability';end if;
 cap:=coalesce(booking.workload_limit_minutes,cap);tz:=coalesce(booking.workload_time_zone,tz);setup:=booking.setup_minutes;travel:=booking.travel_minutes;
 lo:=(p_local_start at time zone tz)-make_interval(mins=>coalesce(setup,0)+coalesce(travel,0));hi:=(p_local_start at time zone tz)+make_interval(mins=>p_minutes);
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'busy',exists(select 1 from audit.cleaner_reservations r where r.staff_id=m.user_id and r.occupied && tstzrange(lo,hi,'[)') and r.booking_id is distinct from p_booking_id),'workload_issue',audit.workload_issue(m.user_id,p_booking_id,lo,hi,cap,tz,setup is not null and travel is not null)) order by m.user_id),'[]'::jsonb) into result from public.business_memberships m where m.business_id=p_business_id and m.role='staff' and m.status='active';
 return jsonb_build_object('time_zone',tz,'starts_at',lo,'ends_at',hi,'staff',result);
end;$fn$;
commit;
