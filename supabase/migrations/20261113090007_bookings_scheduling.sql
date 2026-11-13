begin;
create schema booking_private;
revoke all on schema booking_private from public;
create table booking_private.ingress(environment text primary key check(environment in ('preview','live')),enabled boolean not null);
insert into booking_private.ingress values('preview',true),('live',false);
alter table booking_private.ingress enable row level security;
revoke all on booking_private.ingress from public,anon,authenticated;
-- Wall times must map to exactly one instant; reject DST gaps and repeated hours.
create function booking_private.instant(p_local timestamp,p_zone text) returns timestamptz language plpgsql stable set search_path='' as $$
declare t timestamptz;
begin
 if p_local is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception 'Choose a valid date and time.';end if;
 t=p_local at time zone p_zone;
 if t at time zone p_zone <> p_local or exists(select 1 from generate_series(-180,180) m where m<>0 and (t+m*interval '1 minute') at time zone p_zone=p_local) then raise exception 'This local time is skipped or repeated by daylight saving. Choose another time.';end if;
 return t;
end$$;
create table public.business_bookings(
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 quote_id uuid unique references public.business_quotes(id) on delete restrict,
 document jsonb not null check(quote_private.valid(document)),
 address text not null check(char_length(btrim(address)) between 5 and 1000 and address !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]'),
 starts_at timestamptz not null,
 time_zone text not null,
 duration_minutes integer not null check(duration_minutes between 1 and 10080),
 status text not null default 'Scheduled' check(status in ('Scheduled','In Progress','Completed','Cancelled')),
 version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.business_bookings enable row level security;
revoke all on public.business_bookings from public,anon,authenticated;
grant select on public.business_bookings to authenticated;
create policy bookings_owner on public.business_bookings for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create index bookings_owner_schedule on public.business_bookings(business_id,environment,starts_at,id);
create function booking_private.owner_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_quote uuid,p_document jsonb,p_address text,p_local timestamp,p_zone text,p_duration integer,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.businesses;r public.business_bookings;q public.business_quotes;c text;t timestamptz;d jsonb;
begin
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
end$$;
revoke all on all functions in schema booking_private from public;
grant usage on schema booking_private to authenticated;
grant execute on function booking_private.owner_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text) to authenticated;
create function public.business_booking_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_quote uuid,p_document jsonb,p_address text,p_local timestamp,p_zone text,p_duration integer,p_status text) returns jsonb language sql security invoker set search_path='' as $$select booking_private.owner_write(p_business,p_environment,p_id,p_version,p_quote,p_document,p_address,p_local,p_zone,p_duration,p_status)$$;
revoke all on function public.business_booking_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text) from public,anon;
grant execute on function public.business_booking_write(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text) to authenticated;
commit;
