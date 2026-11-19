-- Server-only capacity checks for the live-hosted Shalean test checkout.
create function request_private.shalean_test_capacity(p_token text,p_service text,p_date date,p_minutes integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  tenant uuid;
  zone_name text;
  local_day date;
  start_at timestamptz;
  worker uuid;
  result jsonb := '{}'::jsonb;
  available_workers jsonb;
  before_m integer;
  after_m integer;
  minute_of_day integer;
begin
  if p_token is null or length(p_token)<>64 or encode(extensions.digest(p_token,'sha256'),'hex') <> '41a081fff09bdbc345dc37e2f46b53296cb33275a69e11eecb7dac809f40fe8f' then
    raise exception 'Unauthorized.' using errcode='42501';
  end if;
  if p_minutes is null or p_minutes not between 1 and 1440 or p_date is null then
    return jsonb_build_object('configured',false,'times',result);
  end if;
  select bp.business_id, policy.zone,policy.before_minutes,policy.after_minutes into tenant,zone_name,before_m,after_m
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
    for minute_of_day in 0..1439 by 30 loop
      start_at := (p_date::timestamp + minute_of_day*interval '1 minute') at time zone zone_name;
      continue when start_at<=now();
      available_workers := '[]'::jsonb;
      for worker in select id from public.business_staff where business_id=tenant and environment='live' and active loop
        begin
          perform authorization_private.scheduling_check_worker(tenant,'live','00000000-0000-0000-0000-000000000000'::uuid,worker,start_at,p_minutes);
        exception when raise_exception then continue;
        end;
        available_workers := available_workers || to_jsonb(encode(extensions.hmac(worker::text,p_token,'sha256'),'hex'));
      end loop;
      if jsonb_array_length(available_workers)>0 then
        result := result || jsonb_build_object(to_char(start_at at time zone zone_name,'HH24:MI'),available_workers);
      end if;
    end loop;
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
