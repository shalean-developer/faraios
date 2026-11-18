begin;
create table instant_private.availability_rules (
 business_id uuid primary key references public.businesses(id),
 paused boolean not null default false, notice_minutes integer not null default 0 check(notice_minutes between 0 and 43200),
 horizon_days integer not null default 30 check(horizon_days between 0 and 30),
 holidays date[] not null default '{}', staff_blocks jsonb not null default '[]'
);
revoke all on instant_private.availability_rules from public,anon,authenticated;

create or replace function book05_eft.book03_settings(p_business uuid,p_changes jsonb default null,p_revision text default null)
returns jsonb language plpgsql security definer set search_path='' as $body$
declare policy jsonb; offer instant_private.offers; rules instant_private.availability_rules; staff jsonb; data jsonb;
 holidays date[]; staff_ids uuid[]; block jsonb; from_at timestamptz; until_at timestamptz; worker_id uuid;
begin
 perform authorization_private.scheduling_owner(p_business,'preview');
 perform authorization_private.scheduling_lock_scope(p_business,'preview');
 select * into strict offer from instant_private.offers where business_id=p_business;
 policy=public.business_schedule_policy_read(p_business,'preview');
 select * into rules from instant_private.availability_rules where business_id=p_business;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by id),'[]'::jsonb) into staff
 from public.business_staff where business_id=p_business and environment='preview' and active;
 data=jsonb_build_object('hours',policy->'hours','before',policy->'before_minutes','after',policy->'after_minutes',
  'zone',policy->'zone','staff',staff,'eligible',offer.workers,'paused',coalesce(rules.paused,false),
  'notice',coalesce(rules.notice_minutes,0),'horizon',coalesce(rules.horizon_days,30),'holidays',coalesce(rules.holidays,'{}'::date[]),
  'blocks',coalesce(rules.staff_blocks,'[]'::jsonb));
 if p_changes is null then return data||jsonb_build_object('revision',md5(data::text)); end if;
 if p_revision is distinct from md5(data::text) then raise exception 'Settings changed. Reload before saving.'; end if;
 if jsonb_typeof(p_changes) is distinct from 'object' or not(p_changes ?& array['hours','before','after','eligible','paused','notice','horizon','holidays','blocks'])
 or jsonb_typeof(p_changes->'paused')<>'boolean' or jsonb_typeof(p_changes->'holidays')<>'array' or jsonb_array_length(p_changes->'holidays')>366
 or jsonb_typeof(p_changes->'blocks')<>'array' or jsonb_array_length(p_changes->'blocks')>100
 or jsonb_typeof(p_changes->'eligible')<>'array' or jsonb_array_length(p_changes->'eligible') not between 1 and 50
 or (p_changes->>'notice')::int not between 0 and 43200 or (p_changes->>'horizon')::int not between 0 and 30 then raise exception 'Check availability limits and selections.';end if;
 select array(select distinct x::uuid from jsonb_array_elements_text(p_changes->'eligible') x order by x::uuid) into staff_ids;
 if exists(select from unnest(staff_ids) x where not exists(select from public.business_staff s where s.id=x and s.business_id=p_business and s.environment='preview' and s.active)) then raise exception 'Select staff from this business.';end if;
 if exists(select from jsonb_array_elements_text(p_changes->'holidays') x where x is null or x !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then raise exception 'Enter each closed date as YYYY-MM-DD.';end if;
 select array(select distinct x::date from jsonb_array_elements_text(p_changes->'holidays') x order by x::date) into holidays;
 for block in select value from jsonb_array_elements(p_changes->'blocks') loop
  if jsonb_typeof(block) is distinct from 'object' or coalesce(block->>'staff','')='' or coalesce(block->>'start','') !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d$' or coalesce(block->>'end','') !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d$' then raise exception 'Check time off dates and times.';end if;
  worker_id=(block->>'staff')::uuid;
  if not exists(select from public.business_staff s where s.id=worker_id and s.business_id=p_business and s.environment='preview') then raise exception 'Select staff from this business.';end if;
  from_at=(block->>'start')::timestamp at time zone 'Africa/Johannesburg';
  until_at=(block->>'end')::timestamp at time zone 'Africa/Johannesburg';
  if until_at<=from_at then raise exception 'Time off must end after it starts.';end if;
  if exists(select from public.business_booking_staff a join public.business_bookings b on b.id=a.booking_id
   where a.staff_id=worker_id and b.business_id=p_business and b.environment='preview' and b.status in ('Scheduled','In Progress')
   and tstzrange(from_at,until_at,'[)') && tstzrange(b.starts_at-(p_changes->>'before')::int*interval '1 minute',b.starts_at+(b.duration_minutes+(p_changes->>'after')::int)*interval '1 minute','[)')) then raise exception 'Time off overlaps an assigned visit.';end if;
 end loop;
 if p_changes->'hours' is distinct from policy->'hours' or (p_changes->>'before')::int<>(policy->>'before_minutes')::int or (p_changes->>'after')::int<>(policy->>'after_minutes')::int then
  perform public.business_schedule_policy_write(p_business,'preview',(policy->>'version')::int,(policy->>'enabled')::boolean,policy->>'zone',p_changes->'hours',(p_changes->>'before')::int,(p_changes->>'after')::int,false);
 end if;
 update instant_private.offers set workers=staff_ids where business_id=p_business;
 insert into instant_private.availability_rules values(p_business,(p_changes->>'paused')::boolean,(p_changes->>'notice')::int,(p_changes->>'horizon')::int,holidays,p_changes->'blocks')
 on conflict(business_id) do update set paused=excluded.paused,notice_minutes=excluded.notice_minutes,horizon_days=excluded.horizon_days,holidays=excluded.holidays,staff_blocks=excluded.staff_blocks;
 insert into authorization_private.scheduling_history(business_id,environment,actor,action,detail) values(p_business,'preview',auth.uid(),'booking_availability',jsonb_build_object('previous_revision',p_revision));
 return book05_eft.book03_settings(p_business);
end $body$;
revoke all on function book05_eft.book03_settings(uuid,jsonb,text) from public,anon;
grant execute on function book05_eft.book03_settings(uuid,jsonb,text) to authenticated;

CREATE OR REPLACE FUNCTION authorization_private.scheduling_check_worker(p_business uuid, p_environment text, p_booking uuid, p_staff uuid, p_start timestamp with time zone, p_duration integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p authorization_private.scheduling_policies;occupied tstzrange;windows tstzmultirange;d date;h jsonb;lo timestamptz;hi timestamptz;
begin
 select * into p from authorization_private.scheduling_policies where business_id=p_business and environment=p_environment and enabled;
 if not found then return;end if;
 if not exists(select 1 from public.business_staff where id=p_staff and business_id=p_business and environment=p_environment and active) then raise exception 'Choose active staff from this business.';end if;
 occupied=tstzrange(p_start-p.before_minutes*interval '1 minute',p_start+(p_duration+p.after_minutes)*interval '1 minute','[)');
 if p_environment='preview' and exists(
  select from instant_private.availability_rules r cross join lateral jsonb_array_elements(r.staff_blocks) bl
  where r.business_id=p_business and (bl->>'staff')::uuid=p_staff and occupied &&
   tstzrange((bl->>'start')::timestamp at time zone p.zone,(bl->>'end')::timestamp at time zone p.zone,'[)')) then
  raise exception 'Staff time off conflicts with this job. Choose another time or worker.';
 end if;
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
end$function$
;
CREATE OR REPLACE FUNCTION instant_private.worker(p_slug text, p_at timestamp with time zone, p_minutes integer, p_ignore uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c record; worker uuid; rules instant_private.availability_rules; zone constant text:='Africa/Johannesburg'; occupied_range tstzrange;
begin
 select * into c from instant_private.config(p_slug);
 if not found or p_at is null or not isfinite(p_at) or p_minutes is null or p_minutes not between 1 and 1440 or p_at<=clock_timestamp() or p_at>clock_timestamp()+interval '31 days' or
    date_trunc('minute',p_at)<>p_at or extract(minute from p_at)::int%30<>0 then return null; end if;
 occupied_range=tstzrange(p_at-c.before_min*interval '1 minute',p_at+(p_minutes+c.after_min)*interval '1 minute','[)');
 select * into rules from instant_private.availability_rules where business_id=c.bid;
 if found and (rules.paused or
    (p_ignore is null and p_at<clock_timestamp()+rules.notice_minutes*interval '1 minute') or
    (p_at at time zone zone)::date>(clock_timestamp() at time zone zone)::date+rules.horizon_days or
    exists(select from unnest(rules.holidays) h where h between
      (lower(occupied_range) at time zone zone)::date and ((upper(occupied_range)-interval '1 microsecond') at time zone zone)::date))
    then return null; end if;
 -- An unassigned job has no known worker capacity. Do not sell that interval.
 if exists(select 1 from public.business_bookings b where b.business_id=c.bid and b.environment='preview'
  and b.status in ('Scheduled','In Progress') and not exists(select 1 from public.business_booking_staff a where a.booking_id=b.id)
  and tstzrange(b.starts_at-c.before_min*interval '1 minute',b.starts_at+(b.duration_minutes+c.after_min)*interval '1 minute','[)') && occupied_range)
 then return null; end if;
 for worker in select id from public.business_staff where active and id=any(c.workers) and business_id=c.bid and environment='preview' order by id loop
  if exists(select 1 from instant_private.holds h where h.staff_id=worker and h.state='held' and h.expires_at>clock_timestamp()
    and h.reference is distinct from p_ignore and h.occupied && occupied_range) then continue; end if;
  begin
   perform authorization_private.scheduling_check_worker(c.bid,'preview','00000000-0000-0000-0000-000000000000',worker,p_at,p_minutes);
   return worker;
  exception when raise_exception then
   if sqlerrm not in ('Outside working hours, including travel buffers. Choose another time.','Staff time off conflicts with this job. Choose another time or worker.','Staff already assigned during this time, including travel buffers.','Choose active staff from this business.') then raise; end if;
  end;
 end loop;
 return null;
end $function$
;
notify pgrst, 'reload schema';
create or replace function book05_eft.book03_businesses() returns jsonb language sql stable security definer set search_path='' as $body$
select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.name),'[]'::jsonb)
from public.businesses b join instant_private.offers o on o.business_id=b.id join authorization_private.scheduling_policies p on p.business_id=b.id and p.environment='preview' and p.rollout_allowed join public.business_memberships m on m.business_id=b.id and m.environment='preview' and m.user_id=b.owner_id and m.role='owner' and m.active
where b.owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
$body$;
revoke all on function book05_eft.book03_businesses() from public,anon;
grant execute on function book05_eft.book03_businesses() to authenticated;
notify pgrst,'reload schema';
commit;
