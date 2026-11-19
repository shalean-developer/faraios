-- Server-only capacity checks for the live-hosted Shalean test checkout.
create or replace function request_private.shalean_test_capacity(p_token text,p_service text,p_date date,p_minutes integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  tenant uuid;
  zone_name text;
  local_day date;
  work_windows tstzmultirange;
  result jsonb := '{}'::jsonb;
  policy_hours jsonb;
  before_m integer;
  after_m integer;
begin
  if p_token is null or length(p_token)<>64 or encode(extensions.digest(p_token,'sha256'),'hex') <> '41a081fff09bdbc345dc37e2f46b53296cb33275a69e11eecb7dac809f40fe8f' then
    raise exception 'Unauthorized.' using errcode='42501';
  end if;
  if p_minutes is null or p_minutes not between 1 and 1440 or p_date is null then
    return jsonb_build_object('configured',false,'times',result);
  end if;
  select bp.business_id, policy.zone,policy.before_minutes,policy.after_minutes,policy.hours into tenant,zone_name,before_m,after_m,policy_hours
    from public.business_profiles bp
    join authorization_private.scheduling_policies policy using (business_id,environment)
    where bp.environment='live' and bp.published_slug='shalean-cleaning-services'
      and exists (
        select 1 from public.business_public_pages page,
          lateral jsonb_array_elements(page.services->'items') item
        where page.environment=bp.environment and page.slug=bp.published_slug
          and item->>'id'=p_service
          and (item->>'visible')::boolean and not coalesce((item->>'archived')::boolean,false)
      )
      and policy.enabled and policy.rollout_allowed and jsonb_array_length(policy.hours)>0
      and (request_private.available('live',bp.published_slug)->>'available')::boolean;
  if not found then return jsonb_build_object('configured',false,'times',result); end if;
  local_day := (now() at time zone zone_name)::date;
  if p_date between local_day and local_day+30 then
    -- Convert working hours once for all workers and starts on this date.
    -- Adjacent local days cover the longest accepted visit plus both buffers.
    select range_agg(tstzrange(
      booking_private.instant(d.day::timestamp+(h->>'start')::int*interval '1 minute',zone_name),
      booking_private.instant(d.day::timestamp+(h->>'end')::int*interval '1 minute',zone_name),'[)'))
      into work_windows
      from generate_series(-1,2) offsets(n)
      cross join lateral (select p_date+offsets.n as day) d
      cross join jsonb_array_elements(policy_hours) h
      where (h->>'day')::int=extract(isodow from d.day)::int;

    with starts as (
      select (p_date::timestamp + m*interval '1 minute') at time zone zone_name as start_at
      from generate_series(0,1439,30) m
    ), slots as (
      select start_at,tstzrange(start_at-before_m*interval '1 minute',
             start_at+(p_minutes+after_m)*interval '1 minute','[)') as occupied
      from starts where start_at>now()
    ), available as (
      select s.start_at,jsonb_agg(encode(extensions.hmac(w.id::text,p_token,'sha256'),'hex') order by w.id) as workers
      from slots s join public.business_staff w
        on w.business_id=tenant and w.environment='live' and w.active
      where s.occupied <@ work_windows
        and not exists (
          select 1 from authorization_private.availability_requests t
          join authorization_private.worker_identities i using(business_id,environment,user_id)
          where t.business_id=tenant and t.environment='live' and i.staff_id=w.id
            and not exists (select 1 from authorization_private.scheduling_time_off_resolutions r where r.request_id=t.id)
            and tstzrange(t.starts_at,t.ends_at,'[)') && s.occupied)
        and not exists (
          select 1 from public.business_booking_staff a join public.business_bookings b on b.id=a.booking_id
          where a.staff_id=w.id and a.business_id=tenant and a.environment='live'
            and b.status in ('Scheduled','In Progress')
            and tstzrange(b.starts_at-before_m*interval '1 minute',
                b.starts_at+(b.duration_minutes+after_m)*interval '1 minute','[)') && s.occupied)
      group by s.start_at
    )
    select coalesce(jsonb_object_agg(to_char(start_at at time zone zone_name,'HH24:MI'),workers),'{}'::jsonb)
      into result from available;
  end if;
  return jsonb_build_object('configured',true,'times',result,'before',before_m,'after',after_m);
end $$;
revoke all on function request_private.shalean_test_capacity(text,text,date,integer) from public;
grant execute on function request_private.shalean_test_capacity(text,text,date,integer) to anon,authenticated;
create function public.shalean_test_capacity(p_token text,p_service text,p_date date,p_minutes integer)
returns jsonb language sql stable security invoker set search_path='' as $$
 select request_private.shalean_test_capacity(p_token,p_service,p_date,p_minutes)
$$;
revoke all on function public.shalean_test_capacity(text,text,date,integer) from public;
grant execute on function public.shalean_test_capacity(text,text,date,integer) to anon,authenticated;
