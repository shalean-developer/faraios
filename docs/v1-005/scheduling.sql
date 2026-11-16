-- Additive strict scheduling. No scope is enabled by installation.
begin;
create table authorization_private.scheduling_policies(
 business_id uuid not null references public.businesses(id), environment text not null check(environment in ('preview','live')),
 version integer not null, enabled boolean not null, zone text not null, hours jsonb not null,
 before_minutes integer not null check(before_minutes between 0 and 240), after_minutes integer not null check(after_minutes between 0 and 240),
 primary key(business_id,environment)
);
create table authorization_private.scheduling_legacy(
 booking_id uuid primary key references public.business_bookings(id), business_id uuid not null, environment text not null,
 starts_at timestamptz not null, duration_minutes integer not null, time_zone text not null, staff_ids uuid[] not null, valid boolean not null default true
);
create table authorization_private.scheduling_history(
 id bigint generated always as identity primary key,business_id uuid not null,environment text not null,
 actor uuid,at timestamptz not null default clock_timestamp(),action text not null,detail jsonb not null
);
create table authorization_private.scheduling_time_off_resolutions(
 request_id uuid primary key references authorization_private.availability_requests(id),
 actor uuid not null,reason text not null check(char_length(btrim(reason)) between 5 and 500),at timestamptz not null default clock_timestamp()
);
-- A changed scope row also forces stale REPEATABLE READ writers to fail with
-- serialization error; an advisory lock alone would retain their old snapshot.
create table authorization_private.scheduling_scope_versions(business_id uuid not null,environment text not null,generation bigint not null,primary key(business_id,environment));
alter table authorization_private.scheduling_scope_versions enable row level security;
alter table authorization_private.scheduling_policies enable row level security;
alter table authorization_private.scheduling_legacy enable row level security;
alter table authorization_private.scheduling_history enable row level security;
alter table authorization_private.scheduling_time_off_resolutions enable row level security;
create index scheduling_time_off_scope on authorization_private.availability_requests(business_id,environment,user_id,starts_at,ends_at);

create function authorization_private.scheduling_lock_scope(p_business uuid,p_environment text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_business is not null and p_environment in ('live','preview') then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text||':'||p_environment,1005));
  insert into authorization_private.scheduling_scope_versions values(p_business,p_environment,1) on conflict(business_id,environment) do update set generation=authorization_private.scheduling_scope_versions.generation+1;
 end if;
end$$;
create function authorization_private.scheduling_owner(p_business uuid,p_environment text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_environment is null or p_environment not in ('preview','live') or coalesce(authorization_private.member_role(p_business,p_environment),'')<>'owner' then
  raise exception 'Scheduling settings unavailable.' using errcode='42501';
 end if;
end$$;
create function authorization_private.scheduling_is_legacy(p_booking uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from authorization_private.scheduling_legacy l join public.business_bookings b on b.id=l.booking_id
 where l.booking_id=p_booking and l.valid and b.starts_at=l.starts_at and b.duration_minutes=l.duration_minutes and b.time_zone=l.time_zone
 and not exists(select 1 from public.business_booking_staff a where a.booking_id=b.id and not(a.staff_id=any(l.staff_ids))))
$$;
create function authorization_private.scheduling_check_worker(p_business uuid,p_environment text,p_booking uuid,p_staff uuid,p_start timestamptz,p_duration integer) returns void language plpgsql security definer set search_path='' as $$
declare p authorization_private.scheduling_policies;occupied tstzrange;windows tstzmultirange;d date;h jsonb;lo timestamptz;hi timestamptz;
begin
 select * into p from authorization_private.scheduling_policies where business_id=p_business and environment=p_environment and enabled;
 if not found then return;end if;
 if not exists(select 1 from public.business_staff where id=p_staff and business_id=p_business and environment=p_environment and active) then raise exception 'Choose active staff from this business.';end if;
 occupied=tstzrange(p_start-p.before_minutes*interval '1 minute',p_start+(p_duration+p.after_minutes)*interval '1 minute','[)');
 windows='{}'::tstzmultirange;
 -- Use absolute intervals derived from each local day, never a UTC day or a
 -- single start-day test. Ambiguous/skipped local boundaries reject safely.
 for d in select x::date from generate_series((lower(occupied) at time zone p.zone)::date::timestamp,(upper(occupied) at time zone p.zone)::date::timestamp,interval '1 day') x loop
  for h in select value from jsonb_array_elements(p.hours) where (value->>'day')::integer=extract(isodow from d)::integer loop
   lo=booking_private.instant(d::timestamp+(h->>'start')::integer*interval '1 minute',p.zone);
   hi=booking_private.instant(d::timestamp+(h->>'end')::integer*interval '1 minute',p.zone);
   windows=windows+tstzmultirange(tstzrange(lo,hi,'[)'));
  end loop;
 end loop;
 if not(occupied <@ windows) then raise exception 'Outside working hours, including travel buffers. Choose another time.';end if;
 if exists(select 1 from authorization_private.availability_requests t join authorization_private.worker_identities w using(business_id,environment,user_id)
 where t.business_id=p_business and t.environment=p_environment and w.staff_id=p_staff
 and not exists(select 1 from authorization_private.scheduling_time_off_resolutions r where r.request_id=t.id)
 and tstzrange(t.starts_at,t.ends_at,'[)') && occupied) then raise exception 'Staff time off conflicts with this job. Choose another time or worker.';end if;
 if exists(select 1 from public.business_booking_staff a join public.business_bookings b on b.id=a.booking_id
 where a.staff_id=p_staff and a.business_id=p_business and a.environment=p_environment and b.id<>p_booking and b.status in ('Scheduled','In Progress')
 and tstzrange(b.starts_at-p.before_minutes*interval '1 minute',b.starts_at+(b.duration_minutes+p.after_minutes)*interval '1 minute','[)') && occupied) then
  raise exception 'Staff already assigned during this time, including travel buffers.';
 end if;
end$$;
create function authorization_private.scheduling_assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.business_bookings;
begin
 perform authorization_private.scheduling_lock_scope(new.business_id,new.environment);
 -- INSERT ... ON CONFLICT still invokes BEFORE INSERT for retained links.
 -- Keeping an existing assignment is not a new reservation or legacy rewrite.
 if tg_op='INSERT' and exists(select 1 from public.business_booking_staff where booking_id=new.booking_id and staff_id=new.staff_id and business_id=new.business_id and environment=new.environment) then return new;end if;
 select * into b from public.business_bookings where id=new.booking_id and business_id=new.business_id and environment=new.environment;
 if b.status in ('Scheduled','In Progress') then perform authorization_private.scheduling_check_worker(new.business_id,new.environment,b.id,new.staff_id,b.starts_at,b.duration_minutes);end if;
 update authorization_private.scheduling_legacy set valid=false where booking_id=new.booking_id;
 return new;
end$$;
create function authorization_private.scheduling_booking_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare a record;
begin
 perform authorization_private.scheduling_lock_scope(new.business_id,new.environment);
 if tg_op='UPDATE' and (new.starts_at,new.duration_minutes,new.time_zone,new.status) is distinct from (old.starts_at,old.duration_minutes,old.time_zone,old.status) then
  if (new.starts_at,new.duration_minutes,new.time_zone) is distinct from (old.starts_at,old.duration_minutes,old.time_zone) or (new.status in ('Scheduled','In Progress') and old.status not in ('Scheduled','In Progress')) then
   update authorization_private.scheduling_legacy set valid=false where booking_id=new.id;
   if new.status in ('Scheduled','In Progress') then
    for a in select staff_id from public.business_booking_staff where booking_id=new.id order by staff_id loop
     perform authorization_private.scheduling_check_worker(new.business_id,new.environment,new.id,a.staff_id,new.starts_at,new.duration_minutes);
    end loop;
   end if;
  end if;
 end if;
 return new;
end$$;
create function authorization_private.scheduling_time_off_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare p authorization_private.scheduling_policies;
begin
 perform authorization_private.scheduling_lock_scope(new.business_id,new.environment);
 select * into p from authorization_private.scheduling_policies where business_id=new.business_id and environment=new.environment and enabled;
 if found and exists(select 1 from authorization_private.worker_identities w join public.business_booking_staff a on a.business_id=w.business_id and a.environment=w.environment and a.staff_id=w.staff_id
 join public.business_bookings b on b.id=a.booking_id where w.business_id=new.business_id and w.environment=new.environment and w.user_id=new.user_id and b.status in ('Scheduled','In Progress')
 and not authorization_private.scheduling_is_legacy(b.id) and tstzrange(new.starts_at,new.ends_at,'[)') && tstzrange(b.starts_at-p.before_minutes*interval '1 minute',b.starts_at+(b.duration_minutes+p.after_minutes)*interval '1 minute','[)')) then
  raise exception 'Time off overlaps assigned work. Ask the owner to resolve the schedule first.';
 end if;
 return new;
end$$;
create function authorization_private.scheduling_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare b uuid;e text;v jsonb;
begin
 if tg_op='DELETE' then v=to_jsonb(old);else v=to_jsonb(new);end if;
 b=(v->>'business_id')::uuid;e=v->>'environment';
 if exists(select 1 from authorization_private.scheduling_policies where business_id=b and environment=e and enabled) then
  -- Keep operational identities/timing only; never copy customer documents.
  insert into authorization_private.scheduling_history(business_id,environment,actor,action,detail) values(b,e,auth.uid(),tg_table_name||':'||tg_op,
   jsonb_build_object('before',case when tg_op<>'INSERT' then to_jsonb(old)-'document'-'address'-'email'-'phone'-'name' else null end,
                      'after',case when tg_op<>'DELETE' then to_jsonb(new)-'document'-'address'-'email'-'phone'-'name' else null end));
 end if;
 return null;
end$$;
create function authorization_private.scheduling_identity_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare job record;
begin
 perform authorization_private.scheduling_lock_scope(new.business_id,new.environment);
 if tg_when='AFTER' then
  for job in select b.id,b.starts_at,b.duration_minutes from public.business_booking_staff a join public.business_bookings b on b.id=a.booking_id
  where a.business_id=new.business_id and a.environment=new.environment and a.staff_id=new.staff_id and b.status in ('Scheduled','In Progress') and not authorization_private.scheduling_is_legacy(b.id) loop
   perform authorization_private.scheduling_check_worker(new.business_id,new.environment,job.id,new.staff_id,job.starts_at,job.duration_minutes);
  end loop;
 end if;
 return new;
end$$;
create trigger strict_assignment before insert or update on public.business_booking_staff for each row execute function authorization_private.scheduling_assignment_guard();
create trigger strict_booking before insert or update on public.business_bookings for each row execute function authorization_private.scheduling_booking_guard();
create trigger strict_time_off before insert or update on authorization_private.availability_requests for each row execute function authorization_private.scheduling_time_off_guard();
create trigger strict_booking_history after insert or update on public.business_bookings for each row execute function authorization_private.scheduling_audit();
create trigger strict_assignment_history after insert or update or delete on public.business_booking_staff for each row execute function authorization_private.scheduling_audit();
create trigger strict_time_off_history after insert on authorization_private.availability_requests for each row execute function authorization_private.scheduling_audit();
create trigger strict_identity_lock before insert or update on authorization_private.worker_identities for each row execute function authorization_private.scheduling_identity_guard();
create trigger strict_identity_check after insert or update on authorization_private.worker_identities for each row execute function authorization_private.scheduling_identity_guard();

create function public.business_schedule_policy_read(p_business uuid,p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform authorization_private.scheduling_owner(p_business,p_environment);
 select to_jsonb(p) into result from authorization_private.scheduling_policies p where business_id=p_business and environment=p_environment;
 return coalesce(result,jsonb_build_object('version',0,'enabled',false,'zone',(select time_zone from public.businesses where id=p_business),'hours','[]'::jsonb,'before_minutes',30,'after_minutes',30)) ||
 jsonb_build_object('legacy_active',(select count(*) from authorization_private.scheduling_legacy l join public.business_bookings b on b.id=l.booking_id where l.business_id=p_business and l.environment=p_environment and b.status in ('Scheduled','In Progress') and l.valid),
 'unallocated',(select count(*) from public.business_bookings b where b.business_id=p_business and b.environment=p_environment and b.status in ('Scheduled','In Progress') and not exists(select 1 from public.business_booking_staff a where a.booking_id=b.id)));
end$$;
create function public.business_schedule_policy_write(p_business uuid,p_environment text,p_version integer,p_enabled boolean,p_zone text,p_hours jsonb,p_before integer,p_after integer,p_ack_legacy boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare old authorization_private.scheduling_policies;h jsonb;candidate record;
begin
 perform authorization_private.scheduling_owner(p_business,p_environment);
 perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 select * into old from authorization_private.scheduling_policies where business_id=p_business and environment=p_environment;
 if p_version is distinct from coalesce(old.version,0) then raise exception 'Scheduling settings changed. Reload before saving.';end if;
 if p_enabled is null or p_zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) or p_before is null or p_after is null or p_before not between 0 and 240 or p_after not between 0 and 240 or jsonb_typeof(p_hours) is distinct from 'array' or jsonb_array_length(p_hours)>7 or (p_enabled and jsonb_array_length(p_hours)=0) then raise exception 'Check working hours, time zone and buffers.';end if;
 for h in select value from jsonb_array_elements(p_hours) loop
  if jsonb_typeof(h) is distinct from 'object' or h-'day'-'start'-'end'<>'{}'::jsonb or coalesce(h->>'day','')!~ '^[1-7]$' or coalesce(h->>'start','')!~ '^[0-9]{1,4}$' or coalesce(h->>'end','')!~ '^[0-9]{1,4}$' then raise exception 'Check working hours, time zone and buffers.';end if;
  if (h->>'start')::integer not between 0 and 1439 or (h->>'end')::integer not between 1 and 1440 or (h->>'end')::integer<=(h->>'start')::integer then raise exception 'Check working hours, time zone and buffers.';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_hours) x group by x->>'day' having count(*)>1) then raise exception 'Use one working interval per day. Split overnight hours across days.';end if;
 if exists(select 1 from jsonb_array_elements(p_hours) with ordinality x(h,n),jsonb_array_elements(p_hours) with ordinality y(h,n) where x.n<y.n and x.h->>'day'=y.h->>'day' and int4range((x.h->>'start')::integer,(x.h->>'end')::integer,'[)') && int4range((y.h->>'start')::integer,(y.h->>'end')::integer,'[)')) then raise exception 'Working-hour intervals overlap.';end if;
 if p_enabled and not coalesce(old.enabled,false) and exists(select 1 from public.business_bookings where business_id=p_business and environment=p_environment and status in ('Scheduled','In Progress')) and not coalesce(p_ack_legacy,false) then raise exception 'Review and acknowledge existing jobs before enabling strict scheduling.';end if;
 if not p_enabled and coalesce(old.enabled,false) and exists(select 1 from public.business_booking_staff a join public.business_bookings b on b.id=a.booking_id where b.business_id=p_business and b.environment=p_environment and b.status in ('Scheduled','In Progress') and not authorization_private.scheduling_is_legacy(b.id)) then raise exception 'Resolve strict assigned work before disabling scheduling safeguards.';end if;
 if p_enabled and not coalesce(old.enabled,false) then
  insert into authorization_private.scheduling_legacy(booking_id,business_id,environment,starts_at,duration_minutes,time_zone,staff_ids)
  select b.id,b.business_id,b.environment,b.starts_at,b.duration_minutes,b.time_zone,coalesce((select array_agg(staff_id) from public.business_booking_staff where booking_id=b.id),'{}'::uuid[])
  from public.business_bookings b where b.business_id=p_business and b.environment=p_environment and b.status in ('Scheduled','In Progress') on conflict(booking_id) do nothing;
 end if;
 insert into authorization_private.scheduling_policies values(p_business,p_environment,coalesce(old.version,0)+1,p_enabled,p_zone,p_hours,p_before,p_after)
 on conflict(business_id,environment) do update set version=excluded.version,enabled=excluded.enabled,zone=excluded.zone,hours=excluded.hours,before_minutes=excluded.before_minutes,after_minutes=excluded.after_minutes;
 if p_enabled then
  for candidate in select b.id,b.starts_at,b.duration_minutes,s.staff_id from public.business_bookings b join public.business_booking_staff s on s.booking_id=b.id where b.business_id=p_business and b.environment=p_environment and b.status in ('Scheduled','In Progress') and not authorization_private.scheduling_is_legacy(b.id) order by b.id,s.staff_id loop
   perform authorization_private.scheduling_check_worker(p_business,p_environment,candidate.id,candidate.staff_id,candidate.starts_at,candidate.duration_minutes);
  end loop;
 end if;
 insert into authorization_private.scheduling_history(business_id,environment,actor,action,detail) values(p_business,p_environment,auth.uid(),'policy',jsonb_build_object('before',to_jsonb(old),'after',public.business_schedule_policy_read(p_business,p_environment)));
 return public.business_schedule_policy_read(p_business,p_environment);
end$$;
do $acl$ declare f record;begin
 for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='authorization_private' and p.proname in ('scheduling_lock_scope','scheduling_owner','scheduling_is_legacy','scheduling_check_worker','scheduling_assignment_guard','scheduling_booking_guard','scheduling_time_off_guard','scheduling_audit','scheduling_identity_guard') loop
  execute 'revoke all on function '||f.identity||' from public,anon,authenticated,service_role';
 end loop;
end $acl$;
revoke all on authorization_private.scheduling_policies,authorization_private.scheduling_legacy,authorization_private.scheduling_history,authorization_private.scheduling_scope_versions,authorization_private.scheduling_time_off_resolutions from public,anon,authenticated,service_role;
revoke all on sequence authorization_private.scheduling_history_id_seq from public,anon,authenticated,service_role;
revoke all on function public.business_schedule_policy_read(uuid,text),public.business_schedule_policy_write(uuid,text,integer,boolean,text,jsonb,integer,integer,boolean) from public,anon,service_role;
grant execute on function public.business_schedule_policy_read(uuid,text),public.business_schedule_policy_write(uuid,text,integer,boolean,text,jsonb,integer,integer,boolean) to authenticated;
create function public.business_schedule_time_off_read(p_business uuid,p_environment text,p_page integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform authorization_private.scheduling_owner(p_business,p_environment);
 if p_page is null or p_page not between 1 and 100000 then raise exception 'Choose a valid record page.';end if;
 return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select r.id,r.starts_at,r.ends_at,s.name
 from authorization_private.availability_requests r join authorization_private.worker_identities w using(business_id,environment,user_id)
 join public.business_staff s on s.id=w.staff_id and s.business_id=w.business_id and s.environment=w.environment
 where r.business_id=p_business and r.environment=p_environment and not exists(select 1 from authorization_private.scheduling_time_off_resolutions x where x.request_id=r.id)
 order by r.starts_at,r.id limit 51 offset (p_page-1)*50) t);
end$$;
create function public.business_schedule_time_off_resolve(p_business uuid,p_environment text,p_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform authorization_private.scheduling_owner(p_business,p_environment);perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 if p_reason is null or char_length(btrim(p_reason)) not between 5 and 500 then raise exception 'Enter a resolution reason from 5 to 500 characters.';end if;
 if not exists(select 1 from authorization_private.availability_requests where id=p_id and business_id=p_business and environment=p_environment) then raise exception 'Time-off request unavailable.';end if;
 if exists(select 1 from authorization_private.scheduling_time_off_resolutions where request_id=p_id) then return jsonb_build_object('id',p_id);end if;
 insert into authorization_private.scheduling_time_off_resolutions(request_id,actor,reason) values(p_id,auth.uid(),btrim(p_reason));
 insert into authorization_private.scheduling_history(business_id,environment,actor,action,detail) values(p_business,p_environment,auth.uid(),'time_off_resolved',jsonb_build_object('id',p_id,'reason',btrim(p_reason)));
 return jsonb_build_object('id',p_id);
end$$;
revoke all on function public.business_schedule_time_off_read(uuid,text,integer),public.business_schedule_time_off_resolve(uuid,text,uuid,text) from public,anon,service_role;
grant execute on function public.business_schedule_time_off_read(uuid,text,integer),public.business_schedule_time_off_resolve(uuid,text,uuid,text) to authenticated;
commit;
