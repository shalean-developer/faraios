-- Apply after V1-005 strict scheduling, on a review/preview installation.
begin;
create schema instant_private;
revoke all on schema instant_private from public;
create role faraios_preview_checkout nologin;
grant usage on schema instant_private to faraios_preview_checkout;

create table instant_private.offers (
 business_id uuid references public.businesses primary key,
 service_id text not null, workers uuid[] not null, areas text[] not null
);
create table instant_private.holds (
 reference uuid primary key, business_id uuid not null references public.businesses,
 slug text not null, staff_id uuid not null references public.business_staff,
 starts_at timestamptz not null, occupied tstzrange not null, expires_at timestamptz not null,
 scope jsonb not null, customer jsonb not null, address text not null, area text not null,
 state text not null check(state in ('held','confirmed','review')), booking_id uuid unique references public.business_bookings
);
create index active_checkout_staff on instant_private.holds(staff_id,expires_at) where state='held';
create function public.preview_instant_offer(p_business uuid,p_save boolean default false,p_service text default '',p_workers uuid[] default '{}',p_areas text[] default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; page public.business_public_pages;
begin
 perform authorization_private.scheduling_owner(p_business,'preview');
 if p_save then
  perform authorization_private.scheduling_lock_scope(p_business,'preview');
  if p_service='' then delete from instant_private.offers where business_id=p_business;
  else
   select * into strict page from public.business_public_pages where business_id=p_business and environment='preview';
   if not exists(select 1 from jsonb_array_elements(page.services->'items') s where s->>'id'=p_service
     and s->>'mode'='fixed' and lower(trim(s->>'name'))='regular cleaning' and s->>'visible'='true' and s->>'archived'='false')
     or page.services->>'currency'<>'ZAR' or page.time_zone<>'Africa/Johannesburg'
     or coalesce(cardinality(p_workers),0) not between 1 and 50 or coalesce(cardinality(p_areas),0) not between 1 and 100
     or exists(select 1 from unnest(p_workers) worker where not exists(select 1 from public.business_staff
       where id=worker and active and business_id=p_business and environment='preview'))
     or exists(select 1 from unnest(p_areas) area where not exists(select 1 from regexp_split_to_table(page.document->>'areas','[\r\n·•]+') a where trim(a)=area))
    then raise exception 'Choose a published fixed-price Regular Cleaning service, eligible staff and covered areas.'; end if;
   insert into instant_private.offers values(p_business,p_service,p_workers,p_areas) on conflict(business_id) do update
    set service_id=excluded.service_id,workers=excluded.workers,areas=excluded.areas;
  end if;
 end if;
 select to_jsonb(o) into result from instant_private.offers o where business_id=p_business;
 return coalesce(result,'{}'::jsonb);
end $$;
revoke all on function public.preview_instant_offer(uuid,boolean,text,uuid[],text[]) from public,anon;
grant execute on function public.preview_instant_offer(uuid,boolean,text,uuid[],text[]) to authenticated;

create function instant_private.config(p_slug text) returns table(bid uuid,service jsonb,workers uuid[],areas text[],before_min int,after_min int)
language sql stable security definer set search_path='' as $$
 select p.business_id,s,o.workers,array(select trim(a) from regexp_split_to_table(p.document->>'areas','[\r\n·•]+') a where trim(a)=any(o.areas)),k.before_minutes,k.after_minutes
 from public.business_public_pages p join instant_private.offers o using(business_id)
 join authorization_private.scheduling_policies k using(business_id,environment)
 cross join lateral jsonb_array_elements(p.services->'items') s
 where p.slug=p_slug and p.environment='preview' and k.enabled and k.rollout_allowed and k.zone=p.time_zone
 and p.time_zone='Africa/Johannesburg' and p.services->>'currency'='ZAR' and s->>'id'=o.service_id
 and lower(trim(s->>'name'))='regular cleaning' and s->>'mode'='fixed' and s->>'visible'='true' and s->>'archived'='false'
 and (public.business_booking_available('preview',p_slug)->>'available')::boolean
$$;

create function instant_private.worker(p_slug text,p_at timestamptz,p_minutes int,p_ignore uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c record; worker uuid; occupied_range tstzrange;
begin
 select * into c from instant_private.config(p_slug);
 if not found or p_at is null or not isfinite(p_at) or p_minutes is null or p_minutes not between 1 and 1440 or p_at<=clock_timestamp() or p_at>clock_timestamp()+interval '31 days' or
    date_trunc('minute',p_at)<>p_at or extract(minute from p_at)::int%30<>0 then return null; end if;
 occupied_range=tstzrange(p_at-c.before_min*interval '1 minute',p_at+(p_minutes+c.after_min)*interval '1 minute','[)');
 -- An unassigned job has no known worker capacity. Do not sell that interval.
 if p_ignore is null and exists(select 1 from public.business_bookings b where b.business_id=c.bid and b.environment='preview'
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
end $$;

create function instant_private.slots(p_slug text,p_service text,p_area text,p_options jsonb,p_day date) returns jsonb
language plpgsql security definer set search_path='' as $$
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
 return jsonb_build_object('times',slots,'total',scope->'total','minutes',scope->'minutes');
end $$;

create function instant_private.reserve(p_ref uuid,p_slug text,p_service text,p_area text,p_options jsonb,p_at timestamptz,
 p_total int,p_minutes int,p_customer jsonb,p_address text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c record; scope jsonb; worker uuid; deadline timestamptz; doc jsonb; prior instant_private.holds;
begin
 select * into strict c from instant_private.config(p_slug);
 perform authorization_private.scheduling_lock_scope(c.bid,'preview');
 select * into strict c from instant_private.config(p_slug);
 if p_service is distinct from c.service->>'id' or not coalesce(p_area=any(c.areas),false) then raise exception 'Selection unavailable.';end if;
 scope=request_private.calculate(c.service,'ZAR',p_options);
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
end $$;

-- Called only by the private PHP gateway after verifying the test provider receipt.
create function instant_private.settle(p_ref uuid,p_total int) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h instant_private.holds; worker uuid; id uuid; c record;
begin
 select * into strict h from instant_private.holds where reference=p_ref;
 perform authorization_private.scheduling_lock_scope(h.business_id,'preview');
 select * into strict h from instant_private.holds where reference=p_ref for update;
 if p_total is distinct from (h.scope->>'total')::int then raise exception 'Receipt amount mismatch.'; end if;
 if h.state='held' then
  select * into c from instant_private.config(h.slug);
  if found and c.bid=h.business_id and c.service=h.scope->'service' and h.area=any(c.areas) and h.expires_at>clock_timestamp() then
   worker=instant_private.worker(h.slug,h.starts_at,(h.scope->>'minutes')::int,p_ref);
  end if;
  if worker is null then update instant_private.holds set state='review' where reference=p_ref;
  else
   id=gen_random_uuid();
   update instant_private.holds set state='confirmed' where reference=p_ref;
   insert into public.business_bookings(id,business_id,environment,document,address,starts_at,time_zone,duration_minutes,status)
    values(id,h.business_id,'preview',h.customer,h.address,h.starts_at,'Africa/Johannesburg',(h.scope->>'minutes')::int,'Scheduled');
   insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) values(id,worker,h.business_id,'preview');
   update instant_private.holds set booking_id=id,state='confirmed' where reference=p_ref;
  end if;
 end if;
 return (select jsonb_build_object('state',state,'booking',booking_id) from instant_private.holds where reference=p_ref);
end $$;
-- The ordinary owner scheduler uses the same scope lock. Protect a held worker
-- against new assignments and moves while allowing unrelated workers to operate.
create function instant_private.check_held_worker(bid uuid,worker uuid,at_time timestamptz,minutes int)
returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from instant_private.holds h join authorization_private.scheduling_policies p
    on p.business_id=h.business_id and p.environment='preview'
    where h.business_id=bid and h.staff_id=worker and h.state='held' and h.expires_at>clock_timestamp()
    and h.occupied && tstzrange(at_time-p.before_minutes*interval '1 minute',
       at_time+(minutes+p.after_minutes)*interval '1 minute','[)')) then
  raise exception 'This cleaner is reserved for checkout. Choose another worker or time.';
 end if;
end $$;
create function instant_private.assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare job public.business_bookings;
begin
 select * into job from public.business_bookings where id=new.booking_id and business_id=new.business_id and environment='preview';
 if job.status in ('Scheduled','In Progress') then
  perform instant_private.check_held_worker(new.business_id,new.staff_id,job.starts_at,job.duration_minutes);
 end if;
 return new;
end $$;
create trigger zz_instant_assignment before insert or update on public.business_booking_staff for each row
 when (new.environment='preview') execute function instant_private.assignment_guard();
create function instant_private.move_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare worker uuid;
begin
 for worker in select staff_id from public.business_booking_staff where booking_id=new.id loop
  perform instant_private.check_held_worker(new.business_id,worker,new.starts_at,new.duration_minutes);
 end loop;
 return new;
end $$;
create trigger zz_instant_move before update on public.business_bookings for each row
 when (new.environment='preview' and new.status in ('Scheduled','In Progress') and
  (new.starts_at,new.duration_minutes,new.status) is distinct from (old.starts_at,old.duration_minutes,old.status))
 execute function instant_private.move_guard();

-- A returning customer can see the result even when the webhook arrived first.
create function instant_private.receipt(p_ref uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('state',state,'booking',booking_id) from instant_private.holds where reference=p_ref
$$;
revoke all on all functions in schema instant_private from public,anon,authenticated;
grant execute on function instant_private.config(text),instant_private.slots(text,text,text,jsonb,date),
 instant_private.reserve(uuid,text,text,text,jsonb,timestamptz,int,int,jsonb,text),instant_private.settle(uuid,int),instant_private.receipt(uuid) to faraios_preview_checkout;
commit;
