begin;
CREATE OR REPLACE FUNCTION instant_private.slots(p_slug text, p_service text, p_area text, p_options jsonb, p_day date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c record; scope jsonb; slots jsonb;
begin
 select * into strict c from instant_private.config(p_slug);
 if p_service is distinct from c.service->>'id' or not coalesce(p_area=any(c.areas),false) or p_day is null
 or p_day not between (now() at time zone 'Africa/Johannesburg')::date and (now() at time zone 'Africa/Johannesburg')::date+30 then raise exception 'Selection unavailable.'; end if;
 scope=request_private.calculate(c.service,'ZAR',p_options);
 if (scope->>'total')::int<=0 then raise exception 'Selection unavailable.';end if;
 select coalesce(jsonb_agg(to_char(t,'HH24:MI') order by t),'[]') into slots
 from generate_series(p_day::timestamp,p_day::timestamp+interval '23 hours 30 minutes',interval '30 minutes') t
 where instant_private.worker(p_slug,t at time zone 'Africa/Johannesburg',(scope->>'minutes')::int,null) is not null;
 return jsonb_build_object('times',slots,'total',scope->'total','minutes',scope->'minutes','items',scope->'items','rows',scope->'rows','areas',to_jsonb(c.areas),'version',md5(scope::text),'business',c.bid);
end $function$
;
CREATE OR REPLACE FUNCTION instant_private.reserve(p_ref uuid, p_slug text, p_service text, p_area text, p_options jsonb, p_at timestamp with time zone, p_total integer, p_minutes integer, p_customer jsonb, p_address text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c record; scope jsonb; worker uuid; deadline timestamptz; doc jsonb; prior instant_private.holds;
begin
 select * into strict c from instant_private.config(p_slug);
 perform authorization_private.scheduling_lock_scope(c.bid,'preview');
 perform 1 from public.business_public_pages where business_id=c.bid and environment='preview' for share;
 select * into strict c from instant_private.config(p_slug);
 if p_service is distinct from c.service->>'id' or not coalesce(p_area=any(c.areas),false) then raise exception 'Selection unavailable.';end if;
 scope=request_private.calculate(c.service,'ZAR',p_options);
 if p_customer ? 'review_version' and (p_customer->>'review_version' is distinct from md5(scope::text) or p_customer->>'review_business' is distinct from c.bid::text) then return jsonb_build_object('changed',true); end if;
 p_customer=p_customer-'review_version'-'review_business';
 if p_total is null or p_total<=0 or (scope->>'total')::int is distinct from p_total or (scope->>'minutes')::int is distinct from p_minutes then raise exception 'Price or duration changed.';end if;
 doc=p_customer||jsonb_build_object('items',scope->'items','scope',scope,'currency','ZAR');
 if not coalesce(quote_private.valid(doc),false) or p_address is null or length(trim(p_address)) not between 5 and 1000 then raise exception 'Check the booking details.'; end if;
 select * into prior from instant_private.holds where reference=p_ref;
 if found then
  if prior.state='held' and prior.expires_at>clock_timestamp() and
    (prior.business_id,prior.slug,prior.area,prior.address,prior.scope,prior.starts_at,prior.customer)
    is not distinct from (c.bid,p_slug,p_area,p_address,scope,p_at,doc) then
   return jsonb_build_object('expires',prior.expires_at,'total',p_total);
  end if;
  raise exception 'Reservation reference has already been used.';
 end if;
 worker=instant_private.worker(p_slug,p_at,p_minutes,null);
 if worker is null then raise exception 'Slot unavailable.';end if;
 deadline=least(clock_timestamp()+interval '10 minutes',p_at);
 insert into instant_private.holds values(p_ref,c.bid,p_slug,worker,p_at,tstzrange(p_at-c.before_min*interval '1 minute',p_at+(p_minutes+c.after_min)*interval '1 minute','[)'),deadline,scope,doc,p_address,p_area,'held',null);
 return jsonb_build_object('expires',deadline,'total',p_total);
end $function$
;
CREATE OR REPLACE FUNCTION instant_private.select_method(p_ref uuid, p_slug text, p_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare h instant_private.holds; c record;
begin
  select * into strict h from instant_private.holds where reference=p_ref and slug=p_slug;
  perform authorization_private.scheduling_lock_scope(h.business_id,'preview');
  select * into strict h from instant_private.holds where reference=p_ref and slug=p_slug for update;
  if p_method is null or p_method not in ('eft','paystack') or
     (h.payment_method is not null and h.payment_method<>p_method) then
    raise exception 'Payment method unavailable.';
  end if;
  if h.payment_method is null then
    if h.state<>'held' or h.expires_at<=clock_timestamp() then raise exception 'Hold expired.'; end if;
    perform 1 from public.business_public_pages where business_id=h.business_id and environment='preview' for share;
    select * into c from instant_private.config(p_slug);
    if not found or c.bid<>h.business_id or c.service is distinct from h.scope->'service' or not(h.area=any(c.areas)) or instant_private.worker(p_slug,h.starts_at,(h.scope->>'minutes')::int,h.reference) is null then
      raise exception 'Review availability and price again before payment.';
    end if;
    update instant_private.holds set payment_method=p_method where reference=p_ref;
  end if;
  if p_method='eft' then
    insert into instant_private.eft_reports(reference) values(p_ref) on conflict do nothing;
  end if;
  return jsonb_build_object('method',p_method);
end $function$
;
create function instant_private.release_unpaid(p_ref uuid,p_slug text) returns jsonb language plpgsql security definer set search_path='' as $body$
declare h instant_private.holds;
begin
 select * into strict h from instant_private.holds where reference=p_ref and slug=p_slug;
 perform authorization_private.scheduling_lock_scope(h.business_id,'preview');
 select * into strict h from instant_private.holds where reference=p_ref and slug=p_slug for update;
 if h.state<>'held' or h.payment_method='eft' or (h.payment_method is not null and h.expires_at>clock_timestamp()) then return jsonb_build_object('released',false); end if;
 update instant_private.holds set expires_at=least(expires_at,clock_timestamp()) where reference=p_ref;
 return jsonb_build_object('released',true);
end $body$;
revoke all on function instant_private.release_unpaid(uuid,text) from public,anon,authenticated;
grant execute on function instant_private.release_unpaid(uuid,text) to faraios_preview_checkout;
CREATE OR REPLACE FUNCTION instant_private.receipt(p_ref uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object('state',state,'booking',booking_id,'slug',slug,'method',payment_method,'expires',expires_at,'rows',scope->'rows','minutes',scope->'minutes')
  from instant_private.holds where reference=p_ref
$function$
;
CREATE OR REPLACE FUNCTION instant_private.worker(p_slug text, p_at timestamp with time zone, p_minutes integer, p_ignore uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c record; worker uuid; occupied_range tstzrange;
begin
 select * into c from instant_private.config(p_slug);
 if not found or p_at is null or not isfinite(p_at) or p_minutes is null or p_minutes not between 1 and 1440 or p_at<=clock_timestamp() or p_at>clock_timestamp()+interval '31 days' or
    date_trunc('minute',p_at)<>p_at or extract(minute from p_at)::int%30<>0 then return null; end if;
 occupied_range=tstzrange(p_at-c.before_min*interval '1 minute',p_at+(p_minutes+c.after_min)*interval '1 minute','[)');
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

commit;
