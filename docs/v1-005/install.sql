begin;
set local lock_timeout='5s';set local statement_timeout='60s';
-- Additive strict scheduling. No scope is enabled by installation.
create table authorization_private.scheduling_policies(
 business_id uuid not null references public.businesses(id), environment text not null check(environment in ('preview','live')),
 version integer not null, enabled boolean not null, zone text not null, hours jsonb not null,
 before_minutes integer not null check(before_minutes between 0 and 240), after_minutes integer not null check(after_minutes between 0 and 240),
 rollout_allowed boolean not null default false,
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
 -- Operator-controlled rollout is separate from the owner's enabled setting.
 -- Installation exposes no new settings/actions to an existing live business.
 if not exists(select 1 from authorization_private.scheduling_policies where business_id=p_business and environment=p_environment and rollout_allowed) then raise exception 'Scheduling settings unavailable.' using errcode='42501';end if;
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
 insert into authorization_private.scheduling_policies(business_id,environment,version,enabled,zone,hours,before_minutes,after_minutes) values(p_business,p_environment,coalesce(old.version,0)+1,p_enabled,p_zone,p_hours,p_before,p_after)
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
do $guard$ begin if md5(pg_get_functiondef('authorization_private.copy_booking_private_owner_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text)'::regprocedure))<>'6b73e3d3da5bffc9acdb6a5e42f301b3' then raise exception 'V1-005 function baseline drift: authorization_private.copy_booking_private_owner_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text)';end if;end $guard$;
CREATE OR REPLACE FUNCTION authorization_private.copy_booking_private_owner_write(p_business uuid, p_environment text, p_id uuid, p_version integer, p_quote uuid, p_document jsonb, p_address text, p_local timestamp without time zone, p_zone text, p_duration integer, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.businesses;r public.business_bookings;q public.business_quotes;c text;t timestamptz;d jsonb;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment); if authorization_private.member_role(p_business,p_environment) is null then raise exception 'Business context denied' using errcode='42501';end if;
 select * into b from public.businesses where id=p_business and authorization_private.member_role(p_business,p_environment) is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Bookings unavailable.';end if;
 -- Serialize new requests per business, including retries from multiple browser tabs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,32));
 if p_id is null or p_version is null or p_version<0 then raise exception 'Check booking details.';end if;
 select * into r from public.business_bookings where id=p_id for update;
 if r.id is not null then
 if r.business_id<>p_business or r.environment<>p_environment or r.version<>p_version or r.quote_id is distinct from p_quote then raise exception 'Booking changed or unavailable. Reload before saving.';end if;
 if p_zone<>r.time_zone or p_zone is null then raise exception 'Booking time zone changed. Reload before saving.';end if;
 else
 if p_version<>0 then raise exception 'Booking changed or unavailable. Reload before saving.';end if;
 if p_zone is distinct from b.time_zone then raise exception 'Business time zone changed. Reload before saving.';end if;
 if p_status is distinct from 'Scheduled' then raise exception 'New bookings must be Scheduled.';end if;
 end if;
 d=p_document;
 if r.id is not null and r.document ? 'scope' then d=r.document;elsif r.id is null and p_quote is null and d ? 'scope' then raise exception 'Scope must originate from a booking request.';end if;
 if p_quote is not null then
 select * into q from public.business_quotes where id=p_quote and business_id=p_business and environment=p_environment and status='Accepted' for update;
 if not found then raise exception 'An accepted quote from this business is required.';end if;
 if r.id is null and exists(select 1 from public.business_bookings where quote_id=p_quote) then raise exception 'This quote already has a booking. Open it from the booking list.';end if;
 -- The accepted agreement is the source of truth; clients cannot change its price or customer.
 d=q.document;
 elsif r.id is null then
 select draft->>'currency' into c from public.business_service_catalogues where business_id=p_business and environment=p_environment;
 if d->>'currency' is distinct from coalesce(c,'ZAR') then raise exception 'Business currency changed. Reload before saving.';end if;
 elsif d->>'currency' is distinct from r.document->>'currency' then raise exception 'Booking currency cannot be changed.';
 end if;
 if not quote_private.valid(d) or p_address is null or char_length(btrim(p_address)) not between 5 and 1000 or p_address ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' or p_duration is null or p_duration not between 1 and 10080 or p_status is null or p_status not in ('Scheduled','In Progress','Completed','Cancelled') then raise exception 'Check booking details.';end if;
 t=booking_private.instant(p_local,p_zone);
 if p_local < timestamp '2000-01-01' or p_local >= timestamp '2100-01-01' then raise exception 'Choose a date between 2000 and 2099.';end if;
 if r.id is null then
 insert into public.business_bookings(id,business_id,environment,quote_id,document,address,starts_at,time_zone,duration_minutes) values(p_id,p_business,p_environment,p_quote,d,btrim(p_address),t,p_zone,p_duration);
 else
 update public.business_bookings set document=d,address=btrim(p_address),starts_at=t,duration_minutes=p_duration,status=p_status,version=version+1,updated_at=now() where id=p_id;
 end if;
 return jsonb_build_object('id',p_id);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('authorization_private.copy_staff_private_assign(uuid,text,uuid,integer,jsonb)'::regprocedure))<>'bc7c22868bddc73c7f465366044d5fe3' then raise exception 'V1-005 function baseline drift: authorization_private.copy_staff_private_assign(uuid,text,uuid,integer,jsonb)';end if;end $guard$;
CREATE OR REPLACE FUNCTION authorization_private.copy_staff_private_assign(p_business uuid, p_environment text, p_booking uuid, p_version integer, p_staff jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.business_bookings;ids uuid[];
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment); if authorization_private.member_role(p_business,p_environment) is null then raise exception 'Business context denied' using errcode='42501';end if;
 perform authorization_private.copy_staff_private_owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,91));
 select * into b from public.business_bookings where id=p_booking and business_id=p_business and environment=p_environment for update;
 if not found or p_version is distinct from b.assignment_version then raise exception 'Assignments changed or unavailable. Reload before saving.';end if;
 if jsonb_typeof(p_staff) is distinct from 'array' or jsonb_array_length(p_staff)>100 then raise exception 'Choose up to 100 staff members.';end if;
 if exists(select 1 from jsonb_array_elements(p_staff) x where jsonb_typeof(x)<>'string' or x#>>'{}' !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then raise exception 'Choose valid staff members.';end if;
 select coalesce(array_agg(distinct x::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(p_staff) x;
 if exists(select 1 from unnest(ids) i where not exists(select 1 from public.business_staff s where s.id=i and s.business_id=p_business and s.environment=p_environment and (s.active or exists(select 1 from public.business_booking_staff a where a.booking_id=p_booking and a.staff_id=s.id)))) then raise exception 'Choose active staff from this business. Existing inactive assignments may be retained.';end if;
 delete from public.business_booking_staff where booking_id=p_booking and not(staff_id=any(ids));
 insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) select p_booking,i,p_business,p_environment from unnest(ids)i on conflict do nothing;
 update public.business_bookings set assignment_version=assignment_version+1 where id=p_booking;
 return jsonb_build_object('id',p_booking);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('authorization_private.copy_staff_private_write(uuid,text,uuid,integer,text,text,text,boolean)'::regprocedure))<>'2d7e9e54c4764f9cda1eaa60d583beb8' then raise exception 'V1-005 function baseline drift: authorization_private.copy_staff_private_write(uuid,text,uuid,integer,text,text,text,boolean)';end if;end $guard$;
CREATE OR REPLACE FUNCTION authorization_private.copy_staff_private_write(p_business uuid, p_environment text, p_id uuid, p_version integer, p_name text, p_email text, p_phone text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.business_staff;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment); if authorization_private.member_role(p_business,p_environment) is null then raise exception 'Business context denied' using errcode='42501';end if;
 perform authorization_private.copy_staff_private_owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,91));
 if p_id is null or p_version is null or p_version<0 or p_name is null or char_length(btrim(p_name)) not between 2 and 120 or p_name ~ '[\u0001-\u001f\u007f]' or p_email is null or char_length(p_email)>254 or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or p_phone is null or (p_phone<>'' and (p_phone !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(p_phone,'[^0-9]','','g'))<5)) or p_active is null then raise exception 'Check staff details.';end if;
 select * into s from public.business_staff where id=p_id for update;
 if (s.id is not null and (s.business_id<>p_business or s.environment<>p_environment or s.version<>p_version)) or (s.id is null and p_version<>0) then raise exception 'Staff changed or unavailable. Reload before saving.';end if;
 if s.id is null then insert into public.business_staff(id,business_id,environment,name,email,phone,active) values(p_id,p_business,p_environment,btrim(p_name),btrim(p_email),btrim(p_phone),p_active);
 else update public.business_staff set name=btrim(p_name),email=btrim(p_email),phone=btrim(p_phone),active=p_active,version=version+1,updated_at=now() where id=p_id;end if;
 return jsonb_build_object('id',p_id);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('booking_private.owner_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text)'::regprocedure))<>'02f42ff8809bac9e00404a03b2fb3d6a' then raise exception 'V1-005 function baseline drift: booking_private.owner_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text)';end if;end $guard$;
CREATE OR REPLACE FUNCTION booking_private.owner_write(p_business uuid, p_environment text, p_id uuid, p_version integer, p_quote uuid, p_document jsonb, p_address text, p_local timestamp without time zone, p_zone text, p_duration integer, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.businesses;r public.business_bookings;q public.business_quotes;c text;t timestamptz;d jsonb;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Bookings unavailable.';end if;
 -- Serialize new requests per business, including retries from multiple browser tabs.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,32));
 if p_id is null or p_version is null or p_version<0 then raise exception 'Check booking details.';end if;
 select * into r from public.business_bookings where id=p_id for update;
 if r.id is not null then
 if r.business_id<>p_business or r.environment<>p_environment or r.version<>p_version or r.quote_id is distinct from p_quote then raise exception 'Booking changed or unavailable. Reload before saving.';end if;
 if p_zone<>r.time_zone or p_zone is null then raise exception 'Booking time zone changed. Reload before saving.';end if;
 else
 if p_version<>0 then raise exception 'Booking changed or unavailable. Reload before saving.';end if;
 if p_zone is distinct from b.time_zone then raise exception 'Business time zone changed. Reload before saving.';end if;
 if p_status is distinct from 'Scheduled' then raise exception 'New bookings must be Scheduled.';end if;
 end if;
 d=p_document;
 if r.id is not null and r.document ? 'scope' then d=r.document;elsif r.id is null and p_quote is null and d ? 'scope' then raise exception 'Scope must originate from a booking request.';end if;
 if p_quote is not null then
 select * into q from public.business_quotes where id=p_quote and business_id=p_business and environment=p_environment and status='Accepted' for update;
 if not found then raise exception 'An accepted quote from this business is required.';end if;
 if r.id is null and exists(select 1 from public.business_bookings where quote_id=p_quote) then raise exception 'This quote already has a booking. Open it from the booking list.';end if;
 -- The accepted agreement is the source of truth; clients cannot change its price or customer.
 d=q.document;
 elsif r.id is null then
 select draft->>'currency' into c from public.business_service_catalogues where business_id=p_business and environment=p_environment;
 if d->>'currency' is distinct from coalesce(c,'ZAR') then raise exception 'Business currency changed. Reload before saving.';end if;
 elsif d->>'currency' is distinct from r.document->>'currency' then raise exception 'Booking currency cannot be changed.';
 end if;
 if not quote_private.valid(d) or p_address is null or char_length(btrim(p_address)) not between 5 and 1000 or p_address ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' or p_duration is null or p_duration not between 1 and 10080 or p_status is null or p_status not in ('Scheduled','In Progress','Completed','Cancelled') then raise exception 'Check booking details.';end if;
 t=booking_private.instant(p_local,p_zone);
 if p_local < timestamp '2000-01-01' or p_local >= timestamp '2100-01-01' then raise exception 'Choose a date between 2000 and 2099.';end if;
 if r.id is null then
 insert into public.business_bookings(id,business_id,environment,quote_id,document,address,starts_at,time_zone,duration_minutes) values(p_id,p_business,p_environment,p_quote,d,btrim(p_address),t,p_zone,p_duration);
 else
 update public.business_bookings set document=d,address=btrim(p_address),starts_at=t,duration_minutes=p_duration,status=p_status,version=version+1,updated_at=now() where id=p_id;
 end if;
 return jsonb_build_object('id',p_id);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('business_delegate_command_preview_d0106(uuid,text,text,jsonb)'::regprocedure))<>'a5093a8c48a6792fdac435c4a0ca4ee9' then raise exception 'V1-005 function baseline drift: business_delegate_command_preview_d0106(uuid,text,text,jsonb)';end if;end $guard$;
CREATE OR REPLACE FUNCTION public.business_delegate_command_preview_d0106(p_business uuid, p_environment text, p_operation text, p_arguments jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare role text;action text;args jsonb;f record;arg text;parts text[]='{}';i integer;result jsonb;old public.business_bookings;inv public.business_invoices;doc jsonb;reason text;bid uuid;zone text;local_start timestamp;local_end timestamp;instant_start timestamptz;instant_end timestamptz;selected_quote public.business_quotes;
begin
 if p_operation in ('business_booking_write','business_customer_booking_create','business_booking_request_action','business_staff_assign','business_staff_write','visit.execute','terminal.correct','availability.request') then perform authorization_private.scheduling_lock_scope(p_business,p_environment);end if;
 if p_environment is distinct from 'preview' or p_business is null or p_business not in ('2f16e658-e031-4c4a-930a-2731ec1d1492'::uuid,'4627f805-8243-4890-bf18-a14fdf3fd21b'::uuid) then raise exception 'Preview scope denied' using errcode='42501';end if;
 role=authorization_private.require_member(p_business,p_environment);
 if role='owner' then raise exception 'Use owner actions' using errcode='42501';end if;
 if jsonb_typeof(p_arguments) is distinct from 'object' then raise exception 'Invalid arguments';end if;
 action=case p_operation
 when 'business_customer_search' then 'customers.manage' when 'business_customer_write' then 'customers.manage' when 'business_customer_link' then 'customers.manage'
 when 'business_enquiry_create' then 'enquiry.internal' when 'business_enquiry_status' then 'enquiry.internal' when 'business_enquiry_workflow_save' then 'enquiry.internal' when 'business_enquiry_workspace' then 'enquiry.internal'
 when 'business_quote_write' then 'quote.draft' when 'business_quote_send' then 'quote.draft' when 'business_customer_quote_create' then 'quote.draft'
 when 'business_booking_write' then 'booking.schedule' when 'business_customer_booking_create' then 'booking.schedule' when 'business_booking_request_action' then 'booking.schedule'
 when 'business_staff_assign' then 'assignment.manage' when 'business_staff_write' then 'staff.manage'
 when 'business_invoice_write' then 'invoice.issue' when 'business_invoice_payment' then 'payment.record'
 when 'business_dashboard' then 'finance.bulk'
 when 'visit.execute' then 'visit.execute' when 'terminal.correct' then 'terminal.correct' when 'availability.request' then 'assignment.manage' end;
 if action is null or (role='worker' and p_operation not in ('visit.execute','availability.request')) or (role='receptionist' and action not in ('customers.manage','enquiry.internal','quote.draft','booking.schedule','assignment.manage','invoice.issue')) then raise exception 'Action denied' using errcode='42501';end if;
 -- Optional UI selection versions supplement existing API contracts; old callers keep their signatures.
 if p_arguments ? 'selection_version' then
  if p_arguments->>'selection_version' is null or p_arguments->>'selection_version' !~ '^[1-9][0-9]{0,8}$' then raise exception 'The selected record changed or is unavailable. Reload and choose it again.';end if;
  if p_operation='business_booking_write' and p_arguments->>'p_version'='0' and p_arguments->>'p_quote' is not null then
   -- Match the existing booking command's advisory/row lock order.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,32));
   select * into selected_quote from public.business_quotes where id=(p_arguments->>'p_quote')::uuid and business_id=p_business and environment=p_environment and status='Accepted' for update;
   if not found or selected_quote.version<>(p_arguments->>'selection_version')::integer then raise exception 'The selected record changed or is unavailable. Reload and choose it again.';end if;
  elsif p_operation='business_invoice_write' and p_arguments->>'p_action'='save' and p_arguments->>'p_version'='0' and p_arguments->>'p_booking' is not null then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text||':invoice:'||p_environment,0));
   select * into old from public.business_bookings where id=(p_arguments->>'p_booking')::uuid and business_id=p_business and environment=p_environment and status<>'Cancelled' for share;
   if not found or old.version<>(p_arguments->>'selection_version')::integer then raise exception 'The selected record changed or is unavailable. Reload and choose it again.';end if;
  else raise exception 'Invalid record selection';end if;
 end if;
 -- Locks shared with existing assignment writes; recheck assignment after lock acquisition.
 if p_operation in ('visit.execute','terminal.correct') then
  if exists(select 1 from jsonb_object_keys(p_arguments) k where k not in ('id','version','status','reason')) then raise exception 'Invalid visit fields';end if;
  bid=(p_arguments->>'id')::uuid;
  select * into old from public.business_bookings where id=bid and business_id=p_business and environment=p_environment for update;
  if not found or old.version is distinct from (p_arguments->>'version')::integer then raise exception 'Booking changed or unavailable';end if;
  if role='worker' and not authorization_private.assigned(p_business,p_environment,bid) then raise exception 'Assignment denied' using errcode='42501';end if;
  if not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Bookings unavailable';end if;
  if p_operation='visit.execute' then
   if not ((old.status='Scheduled' and p_arguments->>'status'='In Progress') or (old.status='In Progress' and p_arguments->>'status'='Completed')) then raise exception 'Invalid visit transition';end if;
  else
   reason=btrim(p_arguments->>'reason');
   if role<>'manager' or old.status not in ('Completed','Cancelled') or p_arguments->>'status' is distinct from 'Scheduled' or coalesce(char_length(reason),0) not between 5 and 500 or reason ~ '[[:cntrl:]]' then raise exception 'Correction denied' using errcode='42501';end if;
  end if;
  update public.business_bookings set status=p_arguments->>'status',version=version+1,updated_at=now() where id=bid;
  insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),p_operation,bid,jsonb_build_object('reason',reason,'from',old.status,'to',p_arguments->>'status'));
  return jsonb_build_object('id',bid,'version',old.version+1);
 end if;
 if p_operation='availability.request' then
  if role<>'worker' or exists(select 1 from jsonb_object_keys(p_arguments) k where k not in ('id','starts_at','ends_at')) then raise exception 'Availability denied';end if;
  select time_zone into zone from public.businesses where id=p_business;
  if zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Choose a valid date and time.';end if;
  if coalesce(p_arguments->>'starts_at','') ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' and coalesce(p_arguments->>'ends_at','') ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' then
   local_start=(p_arguments->>'starts_at')::timestamp;local_end=(p_arguments->>'ends_at')::timestamp;
   instant_start=booking_private.instant(local_start,zone);instant_end=booking_private.instant(local_end,zone);
  elsif coalesce(p_arguments->>'starts_at','') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$' and coalesce(p_arguments->>'ends_at','') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$' then
   -- Existing explicit-instant API callers retain their unambiguous meaning.
   instant_start=(p_arguments->>'starts_at')::timestamptz;instant_end=(p_arguments->>'ends_at')::timestamptz;
   local_start=instant_start at time zone zone;local_end=instant_end at time zone zone;
  else raise exception 'Choose a valid date and time.';end if;
  if local_start<timestamp '2000-01-01' or local_end>=timestamp '2100-01-01' or instant_end<=instant_start then raise exception 'Choose an end time after the start, between 2000 and 2099.';end if;
  insert into authorization_private.availability_requests(id,business_id,environment,user_id,starts_at,ends_at) values((p_arguments->>'id')::uuid,p_business,p_environment,auth.uid(),instant_start,instant_end);
  return jsonb_build_object('id',p_arguments->>'id');
 end if;
 -- Request quotation must pass the quote-draft constraints, never bypass them via conversion.
 if p_operation='business_booking_request_action' and p_arguments->>'p_action'='quote' then raise exception 'Use the quotation action' using errcode='42501';end if;
 -- No delegated reversal, replacement or void, through any alias.
 if p_operation='business_invoice_payment' and p_arguments->>'p_reversal' is not null then raise exception 'Action denied' using errcode='42501';end if;
 if p_operation='business_invoice_write' then
  if p_arguments->>'p_action' is null or p_arguments->>'p_action' not in ('save','issue') then raise exception 'Action denied' using errcode='42501';end if;
  if role='receptionist' then
   select * into inv from public.business_invoices where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
   bid=coalesce(inv.booking_id,(p_arguments->>'p_booking')::uuid);
   select * into old from public.business_bookings where id=bid and business_id=p_business and environment=p_environment for share;
   if not found or old.status='Cancelled' or inv.replaces_id is not null or (inv.id is not null and inv.document is distinct from old.document) or (p_arguments->'p_document' is not null and p_arguments->'p_document'<>'null' and p_arguments->'p_document' is distinct from old.document) then raise exception 'Agreed invoice required' using errcode='42501';end if;
  end if;
 end if;
 if p_operation in ('business_quote_write','business_customer_quote_create','business_quote_send') then
  doc=p_arguments->'p_document';
  if p_operation='business_quote_send' or p_arguments->>'p_action'='send' then
   select document into doc from public.business_quotes where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
  end if;
  if role='receptionist' and authorization_private.catalogue_document(p_business,p_environment,doc) is distinct from true then raise exception 'Catalogue prices required' using errcode='42501';end if;
  if role='manager' and authorization_private.catalogue_document(p_business,p_environment,doc) is distinct from true then
   reason=btrim(p_arguments->>'authorization_reason');
   if coalesce(char_length(reason),0) not between 5 and 500 or reason ~ '[[:cntrl:]]' then raise exception 'Override reason required' using errcode='42501';end if;
   insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),'quote.override',(p_arguments->>'p_id')::uuid,jsonb_build_object('reason',reason));
  end if;
 end if;
 if p_operation in ('business_booking_write','business_customer_booking_create') then
  select * into old from public.business_bookings where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
  if old.id is not null then
   if old.status in ('Completed','Cancelled') then raise exception 'Use a reasoned terminal correction' using errcode='42501';end if;
   if p_arguments->>'p_status' is distinct from old.status and (role='receptionist' or p_arguments->>'p_status' not in ('Scheduled','Cancelled')) then raise exception 'Use visit execution' using errcode='42501';end if;
   if role='receptionist' and p_arguments->'p_document' is distinct from old.document then raise exception 'Agreement cannot change' using errcode='42501';end if;
  elsif role='receptionist' and p_arguments->>'p_quote' is null then raise exception 'Accepted agreement required' using errcode='42501';end if;
 end if;
 -- Fixed public operation names only; arguments are bound typed literals, never executable input.
 select p.*,d.copy_name into f from authorization_private.delegate_functions d join pg_proc p on d.copy_name='copy_public_'||p.proname join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
 where d.identity like p_operation||'(%';
 if not found then raise exception 'Unknown operation' using errcode='42501';end if;
 args=(p_arguments-'authorization_reason'-'selection_version')||jsonb_build_object('p_business',p_business,'p_environment',p_environment);
 if exists(select 1 from jsonb_object_keys(args) k where not(k=any(f.proargnames))) or p_arguments ?| array['p_business','p_environment'] then raise exception 'Unexpected argument';end if;
 for i in 1..f.pronargs loop
  arg=f.proargnames[i];
  if args ? arg then
   parts=array_append(parts,format('%I => %L::%s',arg,case when f.proargtypes[i-1]='jsonb'::regtype then (args->arg)::text else args->>arg end,format_type(f.proargtypes[i-1],null)));
  elsif i<=f.pronargs-f.pronargdefaults then raise exception 'Missing argument: %',arg;end if;
 end loop;
 execute format('select authorization_private.%I(%s)',f.copy_name,array_to_string(parts,',')) into result;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),action,coalesce((p_arguments->>'p_id')::uuid,(p_arguments->>'p_booking')::uuid));
 return authorization_private.redact(result);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('business_delegate_command(uuid,text,text,jsonb)'::regprocedure))<>'64f6006540d7f1eb67b97820dbb11928' then raise exception 'V1-005 function baseline drift: business_delegate_command(uuid,text,text,jsonb)';end if;end $guard$;
CREATE OR REPLACE FUNCTION public.business_delegate_command(p_business uuid, p_environment text, p_operation text, p_arguments jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare role text;action text;args jsonb;f record;arg text;parts text[]='{}';i integer;result jsonb;old public.business_bookings;inv public.business_invoices;doc jsonb;reason text;bid uuid;zone text;local_start timestamp;local_end timestamp;instant_start timestamptz;instant_end timestamptz;selected_quote public.business_quotes;
begin
 if p_operation in ('business_booking_write','business_customer_booking_create','business_booking_request_action','business_staff_assign','business_staff_write','visit.execute','terminal.correct','availability.request') then perform authorization_private.scheduling_lock_scope(p_business,p_environment);end if;
 role=authorization_private.require_member(p_business,p_environment);
 if role='owner' then raise exception 'Use owner actions' using errcode='42501';end if;
 if jsonb_typeof(p_arguments) is distinct from 'object' then raise exception 'Invalid arguments';end if;
 action=case p_operation
 when 'business_customer_search' then 'customers.manage' when 'business_customer_write' then 'customers.manage' when 'business_customer_link' then 'customers.manage'
 when 'business_enquiry_create' then 'enquiry.internal' when 'business_enquiry_status' then 'enquiry.internal' when 'business_enquiry_workflow_save' then 'enquiry.internal' when 'business_enquiry_workspace' then 'enquiry.internal'
 when 'business_quote_write' then 'quote.draft' when 'business_quote_send' then 'quote.draft' when 'business_customer_quote_create' then 'quote.draft'
 when 'business_booking_write' then 'booking.schedule' when 'business_customer_booking_create' then 'booking.schedule' when 'business_booking_request_action' then 'booking.schedule'
 when 'business_staff_assign' then 'assignment.manage' when 'business_staff_write' then 'staff.manage'
 when 'business_invoice_write' then 'invoice.issue' when 'business_invoice_payment' then 'payment.record'
 when 'business_dashboard' then 'finance.bulk'
 when 'visit.execute' then 'visit.execute' when 'terminal.correct' then 'terminal.correct' when 'availability.request' then 'assignment.manage' end;
 if action is null or (role='worker' and p_operation not in ('visit.execute','availability.request')) or (role='receptionist' and action not in ('customers.manage','enquiry.internal','quote.draft','booking.schedule','assignment.manage','invoice.issue')) then raise exception 'Action denied' using errcode='42501';end if;
 -- Optional UI selection versions supplement existing API contracts; old callers keep their signatures.
 if p_arguments ? 'selection_version' then
  if p_arguments->>'selection_version' is null or p_arguments->>'selection_version' !~ '^[1-9][0-9]{0,8}$' then raise exception 'The selected record changed or is unavailable. Reload and choose it again.';end if;
  if p_operation='business_booking_write' and p_arguments->>'p_version'='0' and p_arguments->>'p_quote' is not null then
   -- Match the existing booking command's advisory/row lock order.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,32));
   select * into selected_quote from public.business_quotes where id=(p_arguments->>'p_quote')::uuid and business_id=p_business and environment=p_environment and status='Accepted' for update;
   if not found or selected_quote.version<>(p_arguments->>'selection_version')::integer then raise exception 'The selected record changed or is unavailable. Reload and choose it again.';end if;
  elsif p_operation='business_invoice_write' and p_arguments->>'p_action'='save' and p_arguments->>'p_version'='0' and p_arguments->>'p_booking' is not null then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text||':invoice:'||p_environment,0));
   select * into old from public.business_bookings where id=(p_arguments->>'p_booking')::uuid and business_id=p_business and environment=p_environment and status<>'Cancelled' for share;
   if not found or old.version<>(p_arguments->>'selection_version')::integer then raise exception 'The selected record changed or is unavailable. Reload and choose it again.';end if;
  else raise exception 'Invalid record selection';end if;
 end if;
 -- Locks shared with existing assignment writes; recheck assignment after lock acquisition.
 if p_operation in ('visit.execute','terminal.correct') then
  if exists(select 1 from jsonb_object_keys(p_arguments) k where k not in ('id','version','status','reason')) then raise exception 'Invalid visit fields';end if;
  bid=(p_arguments->>'id')::uuid;
  select * into old from public.business_bookings where id=bid and business_id=p_business and environment=p_environment for update;
  if not found or old.version is distinct from (p_arguments->>'version')::integer then raise exception 'Booking changed or unavailable';end if;
  if role='worker' and not authorization_private.assigned(p_business,p_environment,bid) then raise exception 'Assignment denied' using errcode='42501';end if;
  if not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Bookings unavailable';end if;
  if p_operation='visit.execute' then
   if not ((old.status='Scheduled' and p_arguments->>'status'='In Progress') or (old.status='In Progress' and p_arguments->>'status'='Completed')) then raise exception 'Invalid visit transition';end if;
  else
   reason=btrim(p_arguments->>'reason');
   if role<>'manager' or old.status not in ('Completed','Cancelled') or p_arguments->>'status' is distinct from 'Scheduled' or coalesce(char_length(reason),0) not between 5 and 500 or reason ~ '[[:cntrl:]]' then raise exception 'Correction denied' using errcode='42501';end if;
  end if;
  update public.business_bookings set status=p_arguments->>'status',version=version+1,updated_at=now() where id=bid;
  insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),p_operation,bid,jsonb_build_object('reason',reason,'from',old.status,'to',p_arguments->>'status'));
  return jsonb_build_object('id',bid,'version',old.version+1);
 end if;
 if p_operation='availability.request' then
  if role<>'worker' or exists(select 1 from jsonb_object_keys(p_arguments) k where k not in ('id','starts_at','ends_at')) then raise exception 'Availability denied';end if;
  select time_zone into zone from public.businesses where id=p_business;
  if zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Choose a valid date and time.';end if;
  if coalesce(p_arguments->>'starts_at','') ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' and coalesce(p_arguments->>'ends_at','') ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' then
   local_start=(p_arguments->>'starts_at')::timestamp;local_end=(p_arguments->>'ends_at')::timestamp;
   instant_start=booking_private.instant(local_start,zone);instant_end=booking_private.instant(local_end,zone);
  elsif coalesce(p_arguments->>'starts_at','') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$' and coalesce(p_arguments->>'ends_at','') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$' then
   -- Existing explicit-instant API callers retain their unambiguous meaning.
   instant_start=(p_arguments->>'starts_at')::timestamptz;instant_end=(p_arguments->>'ends_at')::timestamptz;
   local_start=instant_start at time zone zone;local_end=instant_end at time zone zone;
  else raise exception 'Choose a valid date and time.';end if;
  if local_start<timestamp '2000-01-01' or local_end>=timestamp '2100-01-01' or instant_end<=instant_start then raise exception 'Choose an end time after the start, between 2000 and 2099.';end if;
  insert into authorization_private.availability_requests(id,business_id,environment,user_id,starts_at,ends_at) values((p_arguments->>'id')::uuid,p_business,p_environment,auth.uid(),instant_start,instant_end);
  return jsonb_build_object('id',p_arguments->>'id');
 end if;
 -- Request quotation must pass the quote-draft constraints, never bypass them via conversion.
 if p_operation='business_booking_request_action' and p_arguments->>'p_action'='quote' then raise exception 'Use the quotation action' using errcode='42501';end if;
 -- No delegated reversal, replacement or void, through any alias.
 if p_operation='business_invoice_payment' and p_arguments->>'p_reversal' is not null then raise exception 'Action denied' using errcode='42501';end if;
 if p_operation='business_invoice_write' then
  if p_arguments->>'p_action' is null or p_arguments->>'p_action' not in ('save','issue') then raise exception 'Action denied' using errcode='42501';end if;
  if role='receptionist' then
   select * into inv from public.business_invoices where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
   bid=coalesce(inv.booking_id,(p_arguments->>'p_booking')::uuid);
   select * into old from public.business_bookings where id=bid and business_id=p_business and environment=p_environment for share;
   if not found or old.status='Cancelled' or inv.replaces_id is not null or (inv.id is not null and inv.document is distinct from old.document) or (p_arguments->'p_document' is not null and p_arguments->'p_document'<>'null' and p_arguments->'p_document' is distinct from old.document) then raise exception 'Agreed invoice required' using errcode='42501';end if;
  end if;
 end if;
 if p_operation in ('business_quote_write','business_customer_quote_create','business_quote_send') then
  doc=p_arguments->'p_document';
  if p_operation='business_quote_send' or p_arguments->>'p_action'='send' then
   select document into doc from public.business_quotes where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
  end if;
  if role='receptionist' and authorization_private.catalogue_document(p_business,p_environment,doc) is distinct from true then raise exception 'Catalogue prices required' using errcode='42501';end if;
  if role='manager' and authorization_private.catalogue_document(p_business,p_environment,doc) is distinct from true then
   reason=btrim(p_arguments->>'authorization_reason');
   if coalesce(char_length(reason),0) not between 5 and 500 or reason ~ '[[:cntrl:]]' then raise exception 'Override reason required' using errcode='42501';end if;
   insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),'quote.override',(p_arguments->>'p_id')::uuid,jsonb_build_object('reason',reason));
  end if;
 end if;
 if p_operation in ('business_booking_write','business_customer_booking_create') then
  select * into old from public.business_bookings where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
  if old.id is not null then
   if old.status in ('Completed','Cancelled') then raise exception 'Use a reasoned terminal correction' using errcode='42501';end if;
   if p_arguments->>'p_status' is distinct from old.status and (role='receptionist' or p_arguments->>'p_status' not in ('Scheduled','Cancelled')) then raise exception 'Use visit execution' using errcode='42501';end if;
   if role='receptionist' and p_arguments->'p_document' is distinct from old.document then raise exception 'Agreement cannot change' using errcode='42501';end if;
  elsif role='receptionist' and p_arguments->>'p_quote' is null then raise exception 'Accepted agreement required' using errcode='42501';end if;
 end if;
 -- Fixed public operation names only; arguments are bound typed literals, never executable input.
 select p.*,d.copy_name into f from authorization_private.delegate_functions d join pg_proc p on d.copy_name='copy_public_'||p.proname join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
 where d.identity like p_operation||'(%';
 if not found then raise exception 'Unknown operation' using errcode='42501';end if;
 args=(p_arguments-'authorization_reason'-'selection_version')||jsonb_build_object('p_business',p_business,'p_environment',p_environment);
 if exists(select 1 from jsonb_object_keys(args) k where not(k=any(f.proargnames))) or p_arguments ?| array['p_business','p_environment'] then raise exception 'Unexpected argument';end if;
 for i in 1..f.pronargs loop
  arg=f.proargnames[i];
  if args ? arg then
   parts=array_append(parts,format('%I => %L::%s',arg,case when f.proargtypes[i-1]='jsonb'::regtype then (args->arg)::text else args->>arg end,format_type(f.proargtypes[i-1],null)));
  elsif i<=f.pronargs-f.pronargdefaults then raise exception 'Missing argument: %',arg;end if;
 end loop;
 execute format('select authorization_private.%I(%s)',f.copy_name,array_to_string(parts,',')) into result;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),action,coalesce((p_arguments->>'p_id')::uuid,(p_arguments->>'p_booking')::uuid));
 return authorization_private.redact(result);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('staff_private.assign(uuid,text,uuid,integer,jsonb)'::regprocedure))<>'6d756bc9caff72971e3efc0742ea8c21' then raise exception 'V1-005 function baseline drift: staff_private.assign(uuid,text,uuid,integer,jsonb)';end if;end $guard$;
CREATE OR REPLACE FUNCTION staff_private.assign(p_business uuid, p_environment text, p_booking uuid, p_version integer, p_staff jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.business_bookings;ids uuid[];
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 perform staff_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,91));
 select * into b from public.business_bookings where id=p_booking and business_id=p_business and environment=p_environment for update;
 if not found or p_version is distinct from b.assignment_version then raise exception 'Assignments changed or unavailable. Reload before saving.';end if;
 if jsonb_typeof(p_staff) is distinct from 'array' or jsonb_array_length(p_staff)>100 then raise exception 'Choose up to 100 staff members.';end if;
 if exists(select 1 from jsonb_array_elements(p_staff) x where jsonb_typeof(x)<>'string' or x#>>'{}' !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then raise exception 'Choose valid staff members.';end if;
 select coalesce(array_agg(distinct x::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(p_staff) x;
 if exists(select 1 from unnest(ids) i where not exists(select 1 from public.business_staff s where s.id=i and s.business_id=p_business and s.environment=p_environment and (s.active or exists(select 1 from public.business_booking_staff a where a.booking_id=p_booking and a.staff_id=s.id)))) then raise exception 'Choose active staff from this business. Existing inactive assignments may be retained.';end if;
 delete from public.business_booking_staff where booking_id=p_booking and not(staff_id=any(ids));
 insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) select p_booking,i,p_business,p_environment from unnest(ids)i on conflict do nothing;
 update public.business_bookings set assignment_version=assignment_version+1 where id=p_booking;
 return jsonb_build_object('id',p_booking);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('staff_private.write(uuid,text,uuid,integer,text,text,text,boolean)'::regprocedure))<>'d5d59dc918e4aa39d132dff96ebc1cb6' then raise exception 'V1-005 function baseline drift: staff_private.write(uuid,text,uuid,integer,text,text,text,boolean)';end if;end $guard$;
CREATE OR REPLACE FUNCTION staff_private.write(p_business uuid, p_environment text, p_id uuid, p_version integer, p_name text, p_email text, p_phone text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.business_staff;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 perform staff_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,91));
 if p_id is null or p_version is null or p_version<0 or p_name is null or char_length(btrim(p_name)) not between 2 and 120 or p_name ~ '[\u0001-\u001f\u007f]' or p_email is null or char_length(p_email)>254 or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or p_phone is null or (p_phone<>'' and (p_phone !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(p_phone,'[^0-9]','','g'))<5)) or p_active is null then raise exception 'Check staff details.';end if;
 select * into s from public.business_staff where id=p_id for update;
 if (s.id is not null and (s.business_id<>p_business or s.environment<>p_environment or s.version<>p_version)) or (s.id is null and p_version<>0) then raise exception 'Staff changed or unavailable. Reload before saving.';end if;
 if s.id is null then insert into public.business_staff(id,business_id,environment,name,email,phone,active) values(p_id,p_business,p_environment,btrim(p_name),btrim(p_email),btrim(p_phone),p_active);
 else update public.business_staff set name=btrim(p_name),email=btrim(p_email),phone=btrim(p_phone),active=p_active,version=version+1,updated_at=now() where id=p_id;end if;
 return jsonb_build_object('id',p_id);
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('authorization_private.copy_customer_private_booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text,uuid)'::regprocedure))<>'9d24eb1d9b5865c31f71fc715061e9ea' then raise exception 'V1-005 function baseline drift: authorization_private.copy_customer_private_booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text,uuid)';end if;end $guard$;
CREATE OR REPLACE FUNCTION authorization_private.copy_customer_private_booking_create(p_business uuid, p_environment text, p_id uuid, p_version integer, p_quote uuid, p_document jsonb, p_address text, p_local timestamp without time zone, p_zone text, p_duration integer, p_status text, p_customer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;cid uuid;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment); if authorization_private.member_role(p_business,p_environment) is null then raise exception 'Business context denied' using errcode='42501';end if;
 perform authorization_private.copy_customer_private_owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,73));
 if p_version is distinct from 0 or exists(select 1 from public.business_bookings where id=p_id) then raise exception 'Booking changed or unavailable. Reload before saving.';end if;
 cid=p_customer;
 if p_quote is not null then
 select customer_id into cid from public.business_quotes where id=p_quote and business_id=p_business and environment=p_environment;
 if p_customer is not null and p_customer is distinct from cid then raise exception 'Customer unavailable.';end if;
 end if;
 if cid is not null and not exists(select 1 from public.business_customers where id=cid and business_id=p_business and environment=p_environment) then raise exception 'Customer unavailable.';end if;
 result=authorization_private.copy_booking_private_owner_write(p_business,p_environment,p_id,p_version,p_quote,p_document,p_address,p_local,p_zone,p_duration,p_status);
 update public.business_bookings set customer_id=cid where id=p_id;
 return result;
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('authorization_private.copy_request_private_action(uuid,text,uuid,integer,text)'::regprocedure))<>'f468af87d35adfd05ae15325b36fd260' then raise exception 'V1-005 function baseline drift: authorization_private.copy_request_private_action(uuid,text,uuid,integer,text)';end if;end $guard$;
CREATE OR REPLACE FUNCTION authorization_private.copy_request_private_action(p_business uuid, p_environment text, p_id uuid, p_version integer, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.business_booking_requests;e public.business_enquiries;b public.businesses;q public.business_quotes;d jsonb;bid uuid;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment); if authorization_private.member_role(p_business,p_environment) is null then raise exception 'Business context denied' using errcode='42501';end if;
 select * into b from public.businesses where id=p_business and authorization_private.member_role(p_business,p_environment) is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from request_private.ingress where environment=p_environment and enabled) then raise exception 'Requests unavailable.';end if;
 -- Same serialization as ordinary quote conversion: no second booking even across both entry points.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text,32));
 select * into r from public.business_booking_requests where id=p_id and business_id=p_business and environment=p_environment for update;
 if not found or p_action is null or p_action not in ('quote','accept','decline','convert') then raise exception 'Request unavailable.';end if;
 if r.booking_id is not null and p_action='convert' then return jsonb_build_object('booking_id',r.booking_id);end if;
 if r.version is distinct from p_version then raise exception 'Request changed. Reload before updating.';end if;
 select * into e from public.business_enquiries where id=r.id;
 if p_action='quote' then
 if r.status<>'Pending' then raise exception 'Only pending requests can be quoted.';end if;
 if r.quote_id is not null then return jsonb_build_object('quote_id',r.quote_id);end if;
 if not exists(select 1 from quote_private.ingress where environment=p_environment and enabled) then raise exception 'Quotes unavailable.';end if;
 -- Reuse an existing quote from this enquiry if it was created through Enquiries.
 select * into q from public.business_quotes where enquiry_id=r.id and business_id=p_business and environment=p_environment order by created_at,id limit 1 for update;
 if not found then
 if r.currency is distinct from coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=p_business and environment=p_environment),'ZAR') then raise exception 'Catalogue currency changed. Review this request before quoting.';end if;
 d=jsonb_build_object('name',e.customer_name,'email',e.email,'phone',e.phone,'notes',e.requirements,'currency',r.currency,'items',jsonb_build_array(jsonb_build_object('name',r.service->>'name','quantity',1,'price',coalesce((r.service->>'amount')::integer,0))));
 if r.scope is not null then d=jsonb_set(d,'{items}',r.scope->'items')||jsonb_build_object('scope',r.scope);end if;
 bid=gen_random_uuid();
 perform authorization_private.copy_quote_private_owner_write(p_business,p_environment,bid,0,'save',d,(now() at time zone b.time_zone)::date+14,r.id);
 else if r.scope is not null and q.document->'scope' is distinct from r.scope then raise exception 'Existing quote does not preserve requested rooms and extras. Review separately.';end if;bid=q.id;end if;
 update public.business_booking_requests set quote_id=bid,version=version+1,updated_at=now() where id=r.id;
 return jsonb_build_object('quote_id',bid);
 elsif p_action='decline' then
 if r.status<>'Pending' then raise exception 'Only pending requests can be declined.';end if;
 update public.business_booking_requests set status='Declined',version=version+1,updated_at=now() where id=r.id;
 elsif p_action='accept' then
 if r.status<>'Pending' then raise exception 'Only pending requests can be accepted.';end if;
 if r.quote_id is not null then
 select * into q from public.business_quotes where id=r.quote_id and business_id=p_business and environment=p_environment for update;
 if q.status is distinct from 'Accepted' then raise exception 'The customer must accept the quote first.';end if;
 elsif r.service->>'mode' is distinct from 'fixed' then raise exception 'Create a quote and obtain customer acceptance first.';end if;
 update public.business_booking_requests set status='Accepted',version=version+1,updated_at=now() where id=r.id;
 else
 if r.status<>'Accepted' or not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Accept this request before creating a booking.';end if;
 if r.preferred_at<=now() then raise exception 'Preferred time has passed. Review with the customer before booking.';end if;
 if r.quote_id is not null then
 select * into q from public.business_quotes where id=r.quote_id and business_id=p_business and environment=p_environment and status='Accepted' for update;
 if not found then raise exception 'Accepted quote unavailable.';end if;
 select id into bid from public.business_bookings where quote_id=q.id;
 d=q.document;
 else
 d=jsonb_build_object('name',e.customer_name,'email',e.email,'phone',e.phone,'notes',e.requirements,'currency',r.currency,'items',jsonb_build_array(jsonb_build_object('name',r.service->>'name','quantity',1,'price',(r.service->>'amount')::integer)));
 end if;
 if r.scope is not null and r.quote_id is null then d=jsonb_set(d,'{items}',r.scope->'items')||jsonb_build_object('scope',r.scope);end if;
 if not quote_private.valid(d) then raise exception 'Invalid booking agreement.';end if;
 if bid is null then
 bid=gen_random_uuid();
 insert into public.business_bookings(id,business_id,environment,quote_id,document,address,starts_at,time_zone,duration_minutes,customer_id) values(bid,p_business,p_environment,r.quote_id,d,r.address,r.preferred_at,r.time_zone,coalesce((r.scope->>'minutes')::integer,(r.service->>'duration')::integer),coalesce(q.customer_id,e.customer_id));
 end if;
 update public.business_booking_requests set status='Booked',booking_id=bid,version=version+1,updated_at=now() where id=r.id;
 return jsonb_build_object('booking_id',bid);
 end if;
 return '{}'::jsonb;
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('customer_private.booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text,uuid)'::regprocedure))<>'ee6a1477b2e0885b239ec00090211c8e' then raise exception 'V1-005 function baseline drift: customer_private.booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp without time zone,text,integer,text,uuid)';end if;end $guard$;
CREATE OR REPLACE FUNCTION customer_private.booking_create(p_business uuid, p_environment text, p_id uuid, p_version integer, p_quote uuid, p_document jsonb, p_address text, p_local timestamp without time zone, p_zone text, p_duration integer, p_status text, p_customer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;cid uuid;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 perform customer_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,73));
 if p_version is distinct from 0 or exists(select 1 from public.business_bookings where id=p_id) then raise exception 'Booking changed or unavailable. Reload before saving.';end if;
 cid=p_customer;
 if p_quote is not null then
 select customer_id into cid from public.business_quotes where id=p_quote and business_id=p_business and environment=p_environment;
 if p_customer is not null and p_customer is distinct from cid then raise exception 'Customer unavailable.';end if;
 end if;
 if cid is not null and not exists(select 1 from public.business_customers where id=cid and business_id=p_business and environment=p_environment) then raise exception 'Customer unavailable.';end if;
 result=booking_private.owner_write(p_business,p_environment,p_id,p_version,p_quote,p_document,p_address,p_local,p_zone,p_duration,p_status);
 update public.business_bookings set customer_id=cid where id=p_id;
 return result;
end$function$
;
do $guard$ begin if md5(pg_get_functiondef('request_private.action(uuid,text,uuid,integer,text)'::regprocedure))<>'09eb0d9e634e427afb7efe5745af5a80' then raise exception 'V1-005 function baseline drift: request_private.action(uuid,text,uuid,integer,text)';end if;end $guard$;
CREATE OR REPLACE FUNCTION request_private.action(p_business uuid, p_environment text, p_id uuid, p_version integer, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.business_booking_requests;e public.business_enquiries;b public.businesses;q public.business_quotes;d jsonb;bid uuid;
begin
 perform authorization_private.scheduling_lock_scope(p_business,p_environment);
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from request_private.ingress where environment=p_environment and enabled) then raise exception 'Requests unavailable.';end if;
 -- Same serialization as ordinary quote conversion: no second booking even across both entry points.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text,32));
 select * into r from public.business_booking_requests where id=p_id and business_id=p_business and environment=p_environment for update;
 if not found or p_action is null or p_action not in ('quote','accept','decline','convert') then raise exception 'Request unavailable.';end if;
 if r.booking_id is not null and p_action='convert' then return jsonb_build_object('booking_id',r.booking_id);end if;
 if r.version is distinct from p_version then raise exception 'Request changed. Reload before updating.';end if;
 select * into e from public.business_enquiries where id=r.id;
 if p_action='quote' then
 if r.status<>'Pending' then raise exception 'Only pending requests can be quoted.';end if;
 if r.quote_id is not null then return jsonb_build_object('quote_id',r.quote_id);end if;
 if not exists(select 1 from quote_private.ingress where environment=p_environment and enabled) then raise exception 'Quotes unavailable.';end if;
 -- Reuse an existing quote from this enquiry if it was created through Enquiries.
 select * into q from public.business_quotes where enquiry_id=r.id and business_id=p_business and environment=p_environment order by created_at,id limit 1 for update;
 if not found then
 if r.currency is distinct from coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=p_business and environment=p_environment),'ZAR') then raise exception 'Catalogue currency changed. Review this request before quoting.';end if;
 d=jsonb_build_object('name',e.customer_name,'email',e.email,'phone',e.phone,'notes',e.requirements,'currency',r.currency,'items',jsonb_build_array(jsonb_build_object('name',r.service->>'name','quantity',1,'price',coalesce((r.service->>'amount')::integer,0))));
 if r.scope is not null then d=jsonb_set(d,'{items}',r.scope->'items')||jsonb_build_object('scope',r.scope);end if;
 bid=gen_random_uuid();
 perform quote_private.owner_write(p_business,p_environment,bid,0,'save',d,(now() at time zone b.time_zone)::date+14,r.id);
 else if r.scope is not null and q.document->'scope' is distinct from r.scope then raise exception 'Existing quote does not preserve requested rooms and extras. Review separately.';end if;bid=q.id;end if;
 update public.business_booking_requests set quote_id=bid,version=version+1,updated_at=now() where id=r.id;
 return jsonb_build_object('quote_id',bid);
 elsif p_action='decline' then
 if r.status<>'Pending' then raise exception 'Only pending requests can be declined.';end if;
 update public.business_booking_requests set status='Declined',version=version+1,updated_at=now() where id=r.id;
 elsif p_action='accept' then
 if r.status<>'Pending' then raise exception 'Only pending requests can be accepted.';end if;
 if r.quote_id is not null then
 select * into q from public.business_quotes where id=r.quote_id and business_id=p_business and environment=p_environment for update;
 if q.status is distinct from 'Accepted' then raise exception 'The customer must accept the quote first.';end if;
 elsif r.service->>'mode' is distinct from 'fixed' then raise exception 'Create a quote and obtain customer acceptance first.';end if;
 update public.business_booking_requests set status='Accepted',version=version+1,updated_at=now() where id=r.id;
 else
 if r.status<>'Accepted' or not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Accept this request before creating a booking.';end if;
 if r.preferred_at<=now() then raise exception 'Preferred time has passed. Review with the customer before booking.';end if;
 if r.quote_id is not null then
 select * into q from public.business_quotes where id=r.quote_id and business_id=p_business and environment=p_environment and status='Accepted' for update;
 if not found then raise exception 'Accepted quote unavailable.';end if;
 select id into bid from public.business_bookings where quote_id=q.id;
 d=q.document;
 else
 d=jsonb_build_object('name',e.customer_name,'email',e.email,'phone',e.phone,'notes',e.requirements,'currency',r.currency,'items',jsonb_build_array(jsonb_build_object('name',r.service->>'name','quantity',1,'price',(r.service->>'amount')::integer)));
 end if;
 if r.scope is not null and r.quote_id is null then d=jsonb_set(d,'{items}',r.scope->'items')||jsonb_build_object('scope',r.scope);end if;
 if not quote_private.valid(d) then raise exception 'Invalid booking agreement.';end if;
 if bid is null then
 bid=gen_random_uuid();
 insert into public.business_bookings(id,business_id,environment,quote_id,document,address,starts_at,time_zone,duration_minutes,customer_id) values(bid,p_business,p_environment,r.quote_id,d,r.address,r.preferred_at,r.time_zone,coalesce((r.scope->>'minutes')::integer,(r.service->>'duration')::integer),coalesce(q.customer_id,e.customer_id));
 end if;
 update public.business_booking_requests set status='Booked',booking_id=bid,version=version+1,updated_at=now() where id=r.id;
 return jsonb_build_object('booking_id',bid);
 end if;
 return '{}'::jsonb;
end$function$
;
commit;
