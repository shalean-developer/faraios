begin;
create schema enquiry_private;
revoke all on schema enquiry_private from public;
create table enquiry_private.ingress (environment text primary key check(environment in ('preview','live')), enabled boolean not null);
insert into enquiry_private.ingress values ('preview',true),('live',false);
create table enquiry_private.rate_limits (key text primary key, window_start timestamptz not null, attempts integer not null);
alter table enquiry_private.ingress enable row level security;
alter table enquiry_private.rate_limits enable row level security;
revoke all on all tables in schema enquiry_private from public,anon,authenticated;
create table public.business_enquiries (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 request_id uuid not null unique,
 page_slug text not null,
 service_id text not null default '', service_name text not null default '',
 customer_name text not null check(char_length(customer_name) between 2 and 120),
 email text not null check(char_length(email)<=254), phone text not null check(char_length(phone)<=40),
 requirements text not null check(char_length(requirements) between 10 and 4000),
 status text not null default 'New' check(status in ('New','Contacted','Closed')),
 version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(email<>'' or phone<>'')
);
create index business_enquiries_owner_list on public.business_enquiries(business_id,environment,created_at desc,id);
alter table public.business_enquiries enable row level security;
revoke all on public.business_enquiries from public,anon,authenticated;
grant select on public.business_enquiries to authenticated;
grant update(status) on public.business_enquiries to authenticated;
create policy enquiry_read on public.business_enquiries for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create policy enquiry_update on public.business_enquiries for update to authenticated using(exists(select 1 from public.businesses b where b.id=business_id)) with check(exists(select 1 from public.businesses b where b.id=business_id));
create function enquiry_private.touch() returns trigger language plpgsql security invoker set search_path='' as $$begin new.version=old.version+1;new.updated_at=now();return new;end$$;
create trigger enquiry_updated before update on public.business_enquiries for each row execute function enquiry_private.touch();
-- Only this bounded anonymous intake bypasses RLS. It never returns private data or accepts a business ID.
create function enquiry_private.submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare page public.business_public_pages; previous public.business_enquiries; service text=''; k text; n integer;
begin
 if p_environment is null or p_slug is null or p_service is null or p_name is null or p_email is null or p_phone is null or p_requirements is null or p_request is null then raise exception 'Check enquiry details';end if;
 if not exists(select 1 from enquiry_private.ingress where environment=p_environment and enabled) then raise exception 'Enquiries unavailable';end if;
 if char_length(p_slug) not between 3 and 64 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_service)>32 or p_name<>btrim(p_name) or char_length(p_name) not between 2 and 120 or char_length(p_email)>254 or char_length(p_phone)>40 or char_length(p_requirements) not between 10 and 4000 or p_requirements<>btrim(p_requirements) or (p_email='' and p_phone='') or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (p_phone<>'' and (p_phone !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(p_phone,'[^0-9]','','g'))<5)) or p_name||p_email||p_phone ~ '[[:cntrl:]]' or p_requirements ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then raise exception 'Check enquiry details';end if;
 -- Lock publication until commit so unpublish cannot race validation and intake.
 select * into page from public.business_public_pages where environment=p_environment and slug=p_slug for share;
 if not found then raise exception 'Page unavailable';end if;
 if p_service<>'' then
  select s->>'name' into service from jsonb_array_elements(page.services->'items') s where s->>'id'=p_service and s->>'visible'='true' and s->>'archived'='false';
  if service is null then raise exception 'Service unavailable';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.business_enquiries where request_id=p_request;
 if found then
  if previous.business_id=page.business_id and previous.environment=p_environment and previous.service_id=p_service and previous.customer_name=p_name and previous.email=p_email and previous.phone=p_phone and previous.requirements=p_requirements then return '{}'::jsonb;end if;
  raise exception 'Request already used';
 end if;
 -- Database limits also protect callers bypassing the PHP form: 30/page/hour, 5/contact/hour.
 foreach k in array array['page:'||p_environment||':'||page.business_id::text,'contact:'||p_environment||':'||encode(extensions.digest(lower(coalesce(nullif(p_email,''),regexp_replace(p_phone,'[^0-9]','','g'))),'sha256'),'hex')] loop
  insert into enquiry_private.rate_limits as r values(k,date_trunc('hour',now()),1) on conflict(key) do update set window_start=excluded.window_start,attempts=case when r.window_start=excluded.window_start then r.attempts+1 else 1 end returning attempts into n;
  if n>(case when k like 'page:%' then 30 else 5 end) then raise exception 'Too many enquiries. Please try again later.';end if;
 end loop;
 delete from enquiry_private.rate_limits where window_start<now()-interval '2 hours';
 insert into public.business_enquiries(business_id,environment,request_id,page_slug,service_id,service_name,customer_name,email,phone,requirements) values(page.business_id,p_environment,p_request,p_slug,p_service,service,p_name,p_email,p_phone,p_requirements);
 return '{}'::jsonb;
end$$;
revoke all on function enquiry_private.submit(text,text,text,text,text,text,text,uuid),enquiry_private.touch() from public;
grant usage on schema enquiry_private to anon,authenticated;
grant execute on function enquiry_private.submit(text,text,text,text,text,text,text,uuid) to anon,authenticated;
create function public.business_enquiry_submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select enquiry_private.submit(p_environment,p_slug,p_service,p_name,p_email,p_phone,p_requirements,p_request)$$;
create function public.business_enquiry_status(p_business uuid,p_environment text,p_id uuid,p_status text,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 update public.business_enquiries set status=p_status where id=p_id and business_id=p_business and environment=p_environment and version=p_version;
 get diagnostics n=row_count;if n<>1 then raise exception 'Enquiry changed or unavailable. Reload before updating.';end if;
 return '{}'::jsonb;
end$$;
revoke all on function public.business_enquiry_submit(text,text,text,text,text,text,text,uuid),public.business_enquiry_status(uuid,text,uuid,text,integer) from public;
grant execute on function public.business_enquiry_submit(text,text,text,text,text,text,text,uuid) to anon,authenticated;
grant execute on function public.business_enquiry_status(uuid,text,uuid,text,integer) to authenticated;
commit;
