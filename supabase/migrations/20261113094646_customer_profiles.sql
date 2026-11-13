begin;
create schema customer_private;
revoke all on schema customer_private from public;
create table customer_private.ingress(environment text primary key check(environment in ('preview','live')),enabled boolean not null);
insert into customer_private.ingress values('preview',true),('live',false);
alter table customer_private.ingress enable row level security;
revoke all on customer_private.ingress from public,anon,authenticated;
create function customer_private.valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>5 or not d ?& array['name','email','phone','address','notes'] then return false;end if;
 foreach k in array array['name','email','phone','address','notes'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or d->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;end loop;
 return char_length(btrim(d->>'name')) between 2 and 120 and char_length(d->>'email')<=254 and char_length(d->>'phone')<=40 and char_length(d->>'address')<=1000 and char_length(d->>'notes')<=2000
 and (d->>'email'<>'' or d->>'phone'<>'') and (d->>'email'='' or d->>'email' ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') and (d->>'phone'='' or (d->>'phone' ~ '^[+0-9 ()-]{5,40}$' and char_length(regexp_replace(d->>'phone','[^0-9]','','g'))>=5));
exception when others then return false;
end$$;
create table public.business_customers(
 id uuid primary key,business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),details jsonb not null check(customer_private.valid(details)),
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,business_id,environment)
);
alter table public.business_customers enable row level security;
revoke all on public.business_customers from public,anon,authenticated;
grant select on public.business_customers to authenticated;
create policy customers_owner on public.business_customers for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create index customers_owner_list on public.business_customers(business_id,environment,lower(details->>'name'),id);
alter table public.business_enquiries add column customer_id uuid;
alter table public.business_enquiries add foreign key(customer_id,business_id,environment) references public.business_customers(id,business_id,environment) on delete restrict;
create index enquiries_customer on public.business_enquiries(business_id,environment,customer_id);
alter table public.business_quotes add column customer_id uuid;
alter table public.business_quotes add foreign key(customer_id,business_id,environment) references public.business_customers(id,business_id,environment) on delete restrict;
create index quotes_customer on public.business_quotes(business_id,environment,customer_id);
alter table public.business_bookings add column customer_id uuid;
alter table public.business_bookings add foreign key(customer_id,business_id,environment) references public.business_customers(id,business_id,environment) on delete restrict;
create index bookings_customer on public.business_bookings(business_id,environment,customer_id);

create function customer_private.owner(p_business uuid,p_environment text) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) or not exists(select 1 from customer_private.ingress where environment=p_environment and enabled) then raise exception 'Customers unavailable.';end if;
end$$;
create function customer_private.search(p_business uuid,p_environment text,p_search text,p_page integer) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform customer_private.owner(p_business,p_environment);
 if p_search is null or char_length(p_search)>120 or p_page is null or p_page not between 1 and 100000 then raise exception 'Check customer search.';end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from (select * from public.business_customers c where business_id=p_business and environment=p_environment and (p_search='' or strpos(lower(c.details->>'name'),lower(p_search))>0 or strpos(lower(c.details->>'email'),lower(p_search))>0 or (char_length(regexp_replace(p_search,'[^0-9]','','g'))>=3 and strpos(regexp_replace(c.details->>'phone','[^0-9]','','g'),regexp_replace(p_search,'[^0-9]','','g'))>0)) order by lower(details->>'name'),id limit 21 offset (p_page-1)*20)t),'[]'::jsonb);
end$$;
create function customer_private.write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_details jsonb,p_confirm boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.business_customers;matches jsonb;
begin
 perform customer_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,73));
 if p_id is null or p_version is null or p_version<0 or not customer_private.valid(p_details) then raise exception 'Check customer details.';end if;
 select * into r from public.business_customers where id=p_id for update;
 if (r.id is not null and (r.business_id<>p_business or r.environment<>p_environment or r.version<>p_version)) or (r.id is null and p_version<>0) then raise exception 'Customer changed or unavailable. Reload before saving.';end if;
 select jsonb_agg(jsonb_build_object('id',id,'name',details->>'name','email',details->>'email','phone',details->>'phone')) into matches from
 (select * from public.business_customers where business_id=p_business and environment=p_environment and id<>p_id and
 (lower(btrim(details->>'name'))=lower(btrim(p_details->>'name')) or (p_details->>'email'<>'' and lower(btrim(details->>'email'))=lower(btrim(p_details->>'email'))) or (p_details->>'phone'<>'' and regexp_replace(details->>'phone','[^0-9]','','g')=regexp_replace(p_details->>'phone','[^0-9]','','g'))) order by id limit 21)c;
 if matches is not null and not coalesce(p_confirm,false) then return jsonb_build_object('duplicates',matches);end if;
 if r.id is null then insert into public.business_customers(id,business_id,environment,details) values(p_id,p_business,p_environment,p_details);
 else update public.business_customers set details=p_details,version=version+1,updated_at=now() where id=p_id;end if;
 return jsonb_build_object('id',p_id);
end$$;
-- Explicit association only. Never writes customer snapshots, agreements, addresses or statuses.
create function customer_private.link(p_business uuid,p_environment text,p_customer uuid,p_kind text,p_record uuid,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare tbl text;changed uuid;
begin
 perform customer_private.owner(p_business,p_environment);
 if not exists(select 1 from public.business_customers where id=p_customer and business_id=p_business and environment=p_environment) then raise exception 'Customer unavailable.';end if;
 tbl=case p_kind when 'enquiry' then 'business_enquiries' when 'quote' then 'business_quotes' when 'booking' then 'business_bookings' else null end;
 if tbl is null then raise exception 'Record unavailable or already linked.';end if;
 execute format('update public.%I set customer_id=$1,version=version+1 where id=$2 and business_id=$3 and environment=$4 and version=$5 and customer_id is null returning id',tbl) into changed using p_customer,p_record,p_business,p_environment,p_version;
 if changed is null then raise exception 'Record unavailable or already linked.';end if;
 return jsonb_build_object('id',p_customer);
end$$;
-- Separate creation entrypoints keep the previous APIs and saved snapshots unchanged.
create function customer_private.quote_create(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb,p_expiry date,p_enquiry uuid,p_customer uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;cid uuid;
begin
 perform customer_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,73));
 if p_version is distinct from 0 or p_action is distinct from 'save' or exists(select 1 from public.business_quotes where id=p_id) then raise exception 'Quote changed or unavailable. Reload before saving.';end if;
 cid=p_customer;
 if p_enquiry is not null then select coalesce(cid,customer_id) into cid from public.business_enquiries where id=p_enquiry and business_id=p_business and environment=p_environment;end if;
 if cid is not null and not exists(select 1 from public.business_customers where id=cid and business_id=p_business and environment=p_environment) then raise exception 'Customer unavailable.';end if;
 result=quote_private.owner_write(p_business,p_environment,p_id,p_version,p_action,p_document,p_expiry,p_enquiry);
 update public.business_quotes set customer_id=cid where id=p_id;
 return result;
end$$;
create function customer_private.booking_create(p_business uuid,p_environment text,p_id uuid,p_version integer,p_quote uuid,p_document jsonb,p_address text,p_local timestamp,p_zone text,p_duration integer,p_status text,p_customer uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;cid uuid;
begin
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
end$$;
revoke all on all functions in schema customer_private from public,anon,authenticated;
grant usage on schema customer_private to authenticated;
grant execute on function customer_private.search(uuid,text,text,integer) to authenticated;
create function public.business_customer_search(p_business uuid,p_environment text,p_search text,p_page integer) returns jsonb language sql security invoker set search_path='' as $$select customer_private.search(p_business,p_environment,p_search,p_page)$$;
revoke all on function public.business_customer_search(uuid,text,text,integer) from public,anon;
grant execute on function public.business_customer_search(uuid,text,text,integer) to authenticated;
grant execute on function customer_private.write(uuid,text,uuid,integer,jsonb,boolean) to authenticated;
create function public.business_customer_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_details jsonb,p_confirm boolean) returns jsonb language sql security invoker set search_path='' as $$select customer_private.write(p_business,p_environment,p_id,p_version,p_details,p_confirm)$$;
revoke all on function public.business_customer_write(uuid,text,uuid,integer,jsonb,boolean) from public,anon;
grant execute on function public.business_customer_write(uuid,text,uuid,integer,jsonb,boolean) to authenticated;
grant execute on function customer_private.link(uuid,text,uuid,text,uuid,integer) to authenticated;
create function public.business_customer_link(p_business uuid,p_environment text,p_customer uuid,p_kind text,p_record uuid,p_version integer) returns jsonb language sql security invoker set search_path='' as $$select customer_private.link(p_business,p_environment,p_customer,p_kind,p_record,p_version)$$;
revoke all on function public.business_customer_link(uuid,text,uuid,text,uuid,integer) from public,anon;
grant execute on function public.business_customer_link(uuid,text,uuid,text,uuid,integer) to authenticated;
grant execute on function customer_private.quote_create(uuid,text,uuid,integer,text,jsonb,date,uuid,uuid) to authenticated;
create function public.business_customer_quote_create(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb,p_expiry date,p_enquiry uuid,p_customer uuid) returns jsonb language sql security invoker set search_path='' as $$select customer_private.quote_create(p_business,p_environment,p_id,p_version,p_action,p_document,p_expiry,p_enquiry,p_customer)$$;
revoke all on function public.business_customer_quote_create(uuid,text,uuid,integer,text,jsonb,date,uuid,uuid) from public,anon;
grant execute on function public.business_customer_quote_create(uuid,text,uuid,integer,text,jsonb,date,uuid,uuid) to authenticated;
grant execute on function customer_private.booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text,uuid) to authenticated;
create function public.business_customer_booking_create(p_business uuid,p_environment text,p_id uuid,p_version integer,p_quote uuid,p_document jsonb,p_address text,p_local timestamp,p_zone text,p_duration integer,p_status text,p_customer uuid) returns jsonb language sql security invoker set search_path='' as $$select customer_private.booking_create(p_business,p_environment,p_id,p_version,p_quote,p_document,p_address,p_local,p_zone,p_duration,p_status,p_customer)$$;
revoke all on function public.business_customer_booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text,uuid) from public,anon;
grant execute on function public.business_customer_booking_create(uuid,text,uuid,integer,uuid,jsonb,text,timestamp,text,integer,text,uuid) to authenticated;
commit;
