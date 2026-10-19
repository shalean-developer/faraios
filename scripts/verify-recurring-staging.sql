-- Rollback-only T17 acceptance. Run only on the verified FaraiOS staging project.
begin;
set local statement_timeout='20s';
do $qa$
declare owner_id uuid;manager_id uuid;manager_business uuid;staff_id uuid;r record;s uuid;s2 uuid;v int;n int;d date;digest_before text;digest_after text;history text;one_visit uuid;booking_count int;
begin
 select user_id into owner_id from public.business_memberships where role='owner' and status='active' group by user_id having count(*)=2 limit 1;
 select user_id,business_id into manager_id,manager_business from public.business_memberships where role='manager' and status='active' limit 1;
 select user_id into staff_id from public.business_memberships where role='staff' and status='active' limit 1;
 if owner_id is null or manager_id is null or staff_id is null then raise exception 'Missing verified acceptance roles';end if;
 select count(*),md5(string_agg((to_jsonb(b)-'recurring_schedule_id'-'recurring_occurrence_date'-'recurring_revision')::text,',' order by id)) into booking_count,digest_before from public.one_off_bookings b;
 if booking_count<>7 or digest_before<>'86e064e552ce7cb1e10664eba5f2bd44' or exists(select 1 from public.recurring_schedules) then raise exception 'Staging changed; rebaseline before testing';end if;
 for r in select * from public.one_off_bookings where status='completed' order by business_id loop
  execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',owner_id::text,true);
  s:=public.create_recurring(r.business_id,r.id,gen_random_uuid(),'weekly',array[extract(dow from r.local_start)::smallint],null,'last_day');
  d:=greatest((now() at time zone r.time_zone)::date+21,r.local_start::date+14);
  n:=public.generate_recurring(r.business_id,s,1,d);
  if n<1 then raise exception 'Expected future weekly visits';end if;
  if public.generate_recurring(r.business_id,s,1,d)<>0 then raise exception 'Generation retry duplicated visits';end if;
  if exists(select 1 from public.one_off_bookings b where b.recurring_schedule_id=s and (b.price_lines<>r.price_lines or b.total_cents<>r.total_cents or b.duration_minutes<>r.duration_minutes or b.cleaning_snapshot is distinct from r.cleaning_snapshot or b.cleaning_scope is distinct from r.cleaning_scope or b.status<>'draft' or cardinality(b.assigned_staff)<>0)) then raise exception 'Agreement or draft state changed';end if;
  select id into one_visit from public.one_off_bookings where recurring_schedule_id=s order by recurring_occurrence_date limit 1;
  update public.one_off_bookings set status='cancelled',change_reason='T17 rollback-only skipped visit' where id=one_visit;
  if public.generate_recurring(r.business_id,s,1,d)<>0 then raise exception 'Cancelled visit was recreated';end if;
  select md5(string_agg(to_jsonb(b)::text,',' order by id)) into history from public.one_off_bookings b;
  select version into v from public.recurring_schedules where id=s;
  perform public.change_recurring(r.business_id,s,v,'fortnightly',array[extract(dow from r.local_start)::smallint],r.local_start::time,null,'last_day','active','T17 future-only change');
  select md5(string_agg(to_jsonb(b)::text,',' order by id)) into digest_after from public.one_off_bookings b;
  if history<>digest_after then raise exception 'Schedule edit changed created history';end if;
  begin perform public.change_recurring(r.business_id,s,v,'weekly',array[1::smallint],r.local_start::time,null,'last_day','active','Stale test');raise exception 'Stale write allowed';exception when serialization_failure then null;end;
  if r.business_id=manager_business then
   perform set_config('request.jwt.claim.sub',manager_id::text,true);
   if (select count(*) from public.recurring_schedules)<>1 then raise exception 'Manager scope incorrect';end if;
   if public.generate_recurring(r.business_id,s,1,d)<>0 then raise exception 'Manager retry duplicated visits';end if;
  end if;
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  if exists(select 1 from public.recurring_schedules) then raise exception 'Staff schedule read allowed';end if;
  begin perform public.generate_recurring(r.business_id,s,1,d);raise exception 'Staff generation allowed';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub',manager_id::text,true);
  if r.business_id<>manager_business then begin perform public.generate_recurring(r.business_id,s,1,d);raise exception 'Foreign generation allowed';exception when insufficient_privilege then null;end;end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select version into v from public.recurring_schedules where id=s;
  perform public.change_recurring(r.business_id,s,v,'weekly',array[extract(dow from r.local_start)::smallint],r.local_start::time,null,'last_day','cancelled','T17 rollback-only stop');
  begin perform public.generate_recurring(r.business_id,s,v+1,d);raise exception 'Cancelled schedule generated';exception when raise_exception then if sqlerrm<>'Schedule is not active' then raise;end if;end;
  execute 'reset role';
 end loop;
 execute 'set local role anon';
 begin perform public.generate_recurring(manager_business,gen_random_uuid(),1,current_date);raise exception 'Anonymous generation allowed';exception when insufficient_privilege then null;end;
 execute 'reset role';
 select md5(string_agg((to_jsonb(b)-'recurring_schedule_id'-'recurring_occurrence_date'-'recurring_revision')::text,',' order by id)) into digest_after from public.one_off_bookings b where recurring_schedule_id is null;
 if digest_before<>digest_after then raise exception 'Original staging bookings changed';end if;
 if (select count(*) from audit.events where entity_table='recurring_schedules')<6 then raise exception 'Recurring audit missing';end if;
end;$qa$;
rollback;
select jsonb_build_object('bookings',(select count(*) from public.one_off_bookings),'digest',(select md5(string_agg((to_jsonb(b)-'recurring_schedule_id'-'recurring_occurrence_date'-'recurring_revision')::text,',' order by id)) from public.one_off_bookings b),'schedules',(select count(*) from public.recurring_schedules),'recurring_visits',(select count(*) from public.one_off_bookings where recurring_schedule_id is not null),'recurring_audit',(select count(*) from audit.events where entity_table='recurring_schedules')) cleanup;
