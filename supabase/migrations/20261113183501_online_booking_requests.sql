begin;
create schema request_private;
revoke all on schema request_private from public;
create table request_private.ingress(environment text primary key check(environment in ('preview','live')),enabled boolean not null);
insert into request_private.ingress values('preview',true),('live',false);
alter table request_private.ingress enable row level security;
revoke all on request_private.ingress from public,anon,authenticated;
create table public.business_booking_requests(
 id uuid primary key references public.business_enquiries(id) on delete restrict,
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 service jsonb not null,currency text not null,time_zone text not null,
 address text not null,preferred_at timestamptz not null,
 status text not null default 'Pending' check(status in ('Pending','Accepted','Declined','Booked')),
 quote_id uuid unique references public.business_quotes(id) on delete restrict,
 booking_id uuid unique references public.business_bookings(id) on delete restrict,
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.business_booking_requests enable row level security;
revoke all on public.business_booking_requests from public,anon,authenticated;
grant select on public.business_booking_requests to authenticated;
create policy requests_owner on public.business_booking_requests for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and not coalesce((select auth.jwt())->>'is_anonymous','true')::boolean));
create index requests_list on public.business_booking_requests(business_id,environment,created_at desc,id);
create function request_private.submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid,p_address text,p_local timestamp,p_zone text,p_currency text,p_service_snapshot jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare page public.business_public_pages;s jsonb;e public.business_enquiries;r public.business_booking_requests;t timestamptz;
begin
 if not exists(select 1 from request_private.ingress where environment=p_environment and enabled) then raise exception 'Booking requests unavailable.';end if;
 select * into page from public.business_public_pages where environment=p_environment and slug=p_slug for share;
 if not found then raise exception 'Page unavailable.';end if;
 select value into s from jsonb_array_elements(page.services->'items') where value->>'id'=p_service and value->>'visible'='true' and value->>'archived'='false';
 if s is null or s is distinct from p_service_snapshot or page.time_zone is distinct from p_zone or page.services->>'currency' is distinct from p_currency then raise exception 'Service, price or time zone changed. Reload before submitting.';end if;
 if p_address is null or char_length(btrim(p_address)) not between 5 and 1000 or p_address ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' or p_local is null or p_local>=timestamp '2100-01-01' or p_requirements is null or char_length(p_requirements)>2000 then raise exception 'Check address, schedule and requirements.';end if;
 t=booking_private.instant(p_local,p_zone);
 -- Shared intake provides contact validation, publication lock, database spam caps and request idempotency.
 perform enquiry_private.submit(p_environment,p_slug,p_service,p_name,p_email,p_phone,p_requirements,p_request);
 select * into e from public.business_enquiries where request_id=p_request;
 select * into r from public.business_booking_requests where id=e.id for update;
 if found then
 if r.address=btrim(p_address) and r.preferred_at=t and r.time_zone=p_zone and r.currency=p_currency and r.service=s then return '{}'::jsonb;end if;
 raise exception 'Request already used.';
 end if;
 if t<=now() then raise exception 'Choose a preferred date and time in the future.';end if;
 insert into public.business_booking_requests(id,business_id,environment,service,currency,time_zone,address,preferred_at) values(e.id,e.business_id,p_environment,s,p_currency,p_zone,btrim(p_address),t);
 return '{}'::jsonb;
end$$;
create function request_private.action(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.business_booking_requests;e public.business_enquiries;b public.businesses;q public.business_quotes;d jsonb;bid uuid;
begin
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
 bid=gen_random_uuid();
 perform quote_private.owner_write(p_business,p_environment,bid,0,'save',d,(now() at time zone b.time_zone)::date+14,r.id);
 else bid=q.id;end if;
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
 if not quote_private.valid(d) then raise exception 'Invalid booking agreement.';end if;
 if bid is null then
 bid=gen_random_uuid();
 insert into public.business_bookings(id,business_id,environment,quote_id,document,address,starts_at,time_zone,duration_minutes,customer_id) values(bid,p_business,p_environment,r.quote_id,d,r.address,r.preferred_at,r.time_zone,(r.service->>'duration')::integer,coalesce(q.customer_id,e.customer_id));
 end if;
 update public.business_booking_requests set status='Booked',booking_id=bid,version=version+1,updated_at=now() where id=r.id;
 return jsonb_build_object('booking_id',bid);
 end if;
 return '{}'::jsonb;
end$$;
revoke all on all functions in schema request_private from public,anon,authenticated;
grant usage on schema request_private to anon,authenticated;
grant execute on function request_private.submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb) to anon,authenticated;
grant execute on function request_private.action(uuid,text,uuid,integer,text) to authenticated;
create function public.business_booking_request_submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid,p_address text,p_local timestamp,p_zone text,p_currency text,p_service_snapshot jsonb) returns jsonb language sql security invoker set search_path='' as $$select request_private.submit(p_environment,p_slug,p_service,p_name,p_email,p_phone,p_requirements,p_request,p_address,p_local,p_zone,p_currency,p_service_snapshot)$$;
create function public.business_booking_request_action(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text) returns jsonb language sql security invoker set search_path='' as $$select request_private.action(p_business,p_environment,p_id,p_version,p_action)$$;
revoke all on function public.business_booking_request_submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb),public.business_booking_request_action(uuid,text,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.business_booking_request_submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb) to anon,authenticated;
grant execute on function public.business_booking_request_action(uuid,text,uuid,integer,text) to authenticated;
commit;
