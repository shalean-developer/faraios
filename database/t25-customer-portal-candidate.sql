-- T25 candidate only: no route, identity link or existing record is seeded.
begin;
create schema private_t25;
revoke all on schema private_t25 from public,anon,authenticated,service_role;
create table private_t25.routes(
 slug text primary key check(slug ~ '^[a-z][a-z0-9-]{0,62}$'),
 business_id uuid not null unique references public.businesses(id),
 active boolean not null default false
);
create table private_t25.relationships(
 business_id uuid not null, customer_id uuid not null, user_id uuid not null references auth.users(id),
 active boolean not null default true, self_created boolean not null default false,
 primary key(business_id,customer_id,user_id),
 foreign key(business_id,customer_id) references public.business_customers(business_id,id)
);
create unique index t25_one_self_relationship on private_t25.relationships(business_id,user_id) where self_created;
create table private_t25.events(
 id bigint generated always as identity primary key, business_id uuid not null references public.businesses(id),
 actor uuid not null references auth.users(id), action text not null, request_id uuid not null,
 payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
 unique(business_id,actor,action,request_id)
);
alter table private_t25.routes enable row level security;
alter table private_t25.relationships enable row level security;
alter table private_t25.events enable row level security;
revoke all on all tables in schema private_t25 from public,anon,authenticated,service_role;

-- A customer-safe scheduling context allows the unchanged pricing/booking triggers
-- to run inside the guarded writer. Office context retains its original checks.
create function private_t25.context(business uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business and m.user_id=auth.uid() and m.role in ('owner','manager') and m.status='active' and b.status='active') then
  return audit.booking_context(business);
 end if;
 if not private_t20.live_session() or not exists(select 1 from auth.users u where u.id=auth.uid() and not coalesce(u.is_anonymous,false)) or not exists(select 1 from private_t25.relationships r join public.business_customers c on c.business_id=r.business_id and c.id=r.customer_id join public.businesses b on b.id=r.business_id where r.business_id=business and r.user_id=auth.uid() and r.active and c.is_active and b.status='active') then raise exception 'Booking access denied' using errcode='42501';end if;
 select jsonb_build_object('time_zone',s.time_zone,'working_days',s.working_days,'opens_at',s.opens_at,'closes_at',s.closes_at,'staff','[]'::jsonb) into result from public.business_settings s where s.business_id=business;
 if result is null then raise exception 'Booking unavailable';end if;return result;
end;$$;
revoke all on function private_t25.context(uuid) from public,anon,authenticated,service_role;
grant usage on schema private_t25 to authenticated;
grant execute on function private_t25.context(uuid) to authenticated;
create or replace function public.booking_context(p_business_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private_t25.context(p_business_id);$$;

create function private_t25.portal(route text,action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare biz uuid;uid uuid:=auth.uid();cid uuid;aid uuid;bid uuid;req uuid;result jsonb;prior private_t25.events;item public.business_catalogue;j public.one_off_bookings;is_office boolean;page integer;v jsonb;allowed text[];
begin
 if route is null or action is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>65536 then raise exception 'Invalid portal request' using errcode='22023';end if;
 select r.business_id into biz from private_t25.routes r join public.businesses b on b.id=r.business_id where r.slug=route and r.active and b.status='active' for share of r,b;
 if biz is null then raise exception 'Business page unavailable' using errcode='42501';end if;
 if action='public' then
  select jsonb_build_object('id',b.id,'name',s.display_name,'timeZone',s.time_zone,'workingDays',s.working_days,'opensAt',s.opens_at,'closesAt',s.closes_at,'serviceAreas',s.service_areas,
   'catalogue',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'name',c.name,'description',c.description,'price_cents',c.price_cents,'currency',c.currency,'pricing_model',c.pricing_model,'unit_label',c.unit_label,'version',c.version,'is_active',true,'cleaning_profile',c.cleaning_profile,'cleaning_config',c.cleaning_config) order by c.kind desc,c.name,c.id) from public.business_catalogue c where c.business_id=b.id and c.is_active),'[]'::jsonb)) into result
  from public.businesses b join public.business_settings s on s.business_id=b.id where b.id=biz;
  if result is null then raise exception 'Business page unavailable';end if;
  -- Cleaning config contains pricing rules used by the public form. Explicitly
  -- remove depot/private assessment details; staff/configuration tables stay private.
  result:=jsonb_set(result,'{catalogue}',coalesce((select jsonb_agg(jsonb_set(x,'{cleaning_config}',case when x->'cleaning_config'='null' then 'null'::jsonb else jsonb_build_object('rules',(select jsonb_object_agg(k,(select jsonb_object_agg(opt,jsonb_build_object('cents',val->'cents','minutes',val->'minutes','assessment',val->'assessment')) from jsonb_each(opts) as z(opt,val))) from jsonb_each(x->'cleaning_config'->'rules') as y(k,opts)),'base_minutes',x->'cleaning_config'->'base_minutes','service_fee_cents',x->'cleaning_config'->'service_fee_cents','extras',x->'cleaning_config'->'extras','extra_minutes',x->'cleaning_config'->'extra_minutes','minimum_minutes',x->'cleaning_config'->'minimum_minutes','duration_step_minutes',x->'cleaning_config'->'duration_step_minutes','manual_duration',x->'cleaning_config'->'manual_duration','require_assessment',x->'cleaning_config'->'require_assessment','linen_change_enabled',x->'cleaning_config'->'linen_change_enabled','equipment',jsonb_build_object('policy',x->'cleaning_config'->'equipment'->>'policy')) end)) from jsonb_array_elements(result->'catalogue') x),'[]'::jsonb));
  return result;
 end if;
 if not private_t20.live_session() or not exists(select 1 from auth.users u where u.id=uid and not coalesce(u.is_anonymous,false)) then raise exception 'Customer access denied' using errcode='42501';end if;
 is_office:=exists(select 1 from public.business_memberships m where m.business_id=biz and m.user_id=uid and m.role in ('owner','manager') and m.status='active');
 if action in ('account','history') then
  if action='account' then
   select jsonb_build_object('userId',uid,'canEnrol',not exists(select 1 from private_t25.relationships existing where existing.business_id=biz and existing.user_id=uid),'customers',coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'email',c.email,'phone',c.phone,'addresses',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'label',a.label,'address_line',a.address_line,'suburb',a.suburb,'city',a.city,'postal_code',a.postal_code) order by a.id) from public.customer_addresses a where a.business_id=biz and a.customer_id=c.id and a.is_active),'[]'::jsonb)) order by c.id),'[]'::jsonb)) into result
   from private_t25.relationships r join public.business_customers c on c.business_id=r.business_id and c.id=r.customer_id where r.business_id=biz and r.user_id=uid and r.active and c.is_active;
   return result;
  end if;
  page:=coalesce((payload->>'page')::integer,0);if page<0 or page>1000000 then raise exception 'Invalid page';end if;
  select jsonb_build_object('userId',uid,'rows',coalesce(jsonb_agg(x.data order by x.starts_at desc,x.id),'[]'::jsonb)) into result from (
   select b.id,b.starts_at,jsonb_build_object('id',b.id,'status',b.status,'localStart',b.local_start,'timeZone',b.time_zone,'durationMinutes',b.duration_minutes,'totalCents',b.total_cents,'currency',b.currency,'priceLines',b.price_lines,
   'address',jsonb_build_object('address_line',b.address_snapshot->>'address_line','suburb',b.address_snapshot->>'suburb','city',b.address_snapshot->>'city','postal_code',b.address_snapshot->>'postal_code')) data
   from public.one_off_bookings b where b.business_id=biz and exists(select 1 from private_t25.relationships r join public.business_customers c on c.business_id=r.business_id and c.id=r.customer_id where r.business_id=biz and r.customer_id=b.customer_id and r.user_id=uid and r.active and c.is_active)
   and (not payload ? 'booking' or b.id=(payload->>'booking')::uuid)
   order by b.starts_at desc,b.id limit 51 offset page*50) x;
  return result;
 end if;
 if action not in ('enrol','address','book','link','revoke') then raise exception 'Invalid portal action' using errcode='22023';end if;
 req:=(payload->>'requestId')::uuid;if req is null then raise exception 'Request key required';end if;
 -- Serialize same-customer requests before checking durable idempotency receipts.
 perform pg_advisory_xact_lock(hashtextextended('t25:'||biz::text||uid::text,0));
 if action in ('link','revoke') then
  perform 1 from public.business_memberships m where m.business_id=biz and m.user_id=uid and m.role in ('owner','manager') and m.status='active' for share;
  if not found then raise exception 'Customer access denied' using errcode='42501';end if;
 end if;
 if action in ('address','book') then
  cid:=(payload->>'customer')::uuid;
  perform 1 from private_t25.relationships r join public.business_customers c on c.business_id=r.business_id and c.id=r.customer_id where r.business_id=biz and r.customer_id=cid and r.user_id=uid and r.active and c.is_active for share of r,c;
  if not found then raise exception 'Customer access denied' using errcode='42501';end if;
 end if;
 select * into prior from private_t25.events e where e.business_id=biz and e.actor=uid and e.action=portal.action and e.request_id=req;
 if found then
  if prior.payload<>payload then raise exception 'Request key already used with different details' using errcode='23505';end if;
  return prior.result;
 end if;
 if action='enrol' then
  if exists(select 1 from private_t25.relationships r where r.business_id=biz and r.user_id=uid) then raise exception 'Customer relationship already exists; use your account';end if;
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 160 or length(trim(coalesce(payload->>'phone',''))) not between 1 and 40 then raise exception 'Enter a name and contact phone';end if;
  insert into public.business_customers(business_id,name,phone) values(biz,trim(payload->>'name'),trim(payload->>'phone')) returning id into cid;
  -- Email is deliberately neither copied nor used as identity evidence.
  insert into private_t25.relationships values(biz,cid,uid,true,true);
  result:=jsonb_build_object('customer',cid);
 elsif action in ('link','revoke') then
  cid:=(payload->>'customer')::uuid;
  if length(trim(coalesce(payload->>'evidence',''))) not between 1 and 2000 then raise exception 'Independent verification evidence required';end if;
  perform 1 from public.business_customers c where c.business_id=biz and c.id=cid and c.is_active for share;
  if not found then raise exception 'Customer unavailable';end if;
  if action='link' then
   insert into private_t25.relationships(business_id,customer_id,user_id) values(biz,cid,(payload->>'user')::uuid)
   on conflict(business_id,customer_id,user_id) do update set active=true;
  else
   update private_t25.relationships r set active=false where r.business_id=biz and r.customer_id=cid and r.user_id=(payload->>'user')::uuid;
   if not found then raise exception 'Relationship unavailable';end if;
  end if;
  result:=jsonb_build_object('customer',cid,'active',action='link');
 elsif action='address' then
  insert into public.customer_addresses(business_id,customer_id,label,address_line,suburb,city,postal_code)
   values(biz,cid,trim(payload->>'label'),trim(payload->>'address_line'),trim(coalesce(payload->>'suburb','')),trim(coalesce(payload->>'city','')),trim(coalesce(payload->>'postal_code',''))) returning id into aid;
  result:=jsonb_build_object('address',aid);
 else
  allowed:=array['requestId','customer','address','localStart','selection','scope','catalogueVersions'];
  if exists(select 1 from jsonb_object_keys(payload) k where not k=any(allowed)) then raise exception 'Unexpected booking field';end if;
  aid:=(payload->>'address')::uuid;
  perform 1 from public.customer_addresses a where a.id=aid and a.business_id=biz and a.customer_id=cid and a.is_active for share;
  if not found then raise exception 'Address unavailable';end if;
  -- Lock all selected current catalogue versions; pricing triggers remain authoritative.
  if jsonb_typeof(payload->'selection') is distinct from 'array' or jsonb_array_length(payload->'selection') not between 1 and 51 then raise exception 'Select a service';end if;
  perform 1 from public.business_catalogue c where c.business_id=biz and c.id in(select (x->>'catalogue_id')::uuid from jsonb_array_elements(payload->'selection') x) order by c.id for share;
  if jsonb_typeof(payload->'catalogueVersions') is distinct from 'object' or exists(select 1 from jsonb_array_elements(payload->'selection') x left join public.business_catalogue c on c.business_id=biz and c.id=(x->>'catalogue_id')::uuid where c.id is null or (payload->'catalogueVersions'->>c.id::text) is distinct from c.version::text) then raise exception 'Catalogue changed; reopen the business page' using errcode='40001';end if;
  select * into item from public.business_catalogue c where c.business_id=biz and c.id=(payload->'selection'->0->>'catalogue_id')::uuid and c.kind='service' and c.is_active;
  if not found or item.cleaning_profile is null or item.cleaning_config is null then raise exception 'Service needs office assessment';end if;
  if coalesce((item.cleaning_config->>'manual_duration')::boolean,false) or coalesce((item.cleaning_config->>'require_assessment')::boolean,false) or (item.cleaning_config->'equipment'->>'policy'='assessed' and payload->'scope'->>'equipment_arrangement' is distinct from 'Customer supplies equipment') or payload->'scope' ? 'assessment' or payload->'scope' ? 'distance_reason' or payload->'scope' ? 'distance_km' or (item.cleaning_config->'equipment'->>'policy'='distance' and payload->'scope'->>'equipment' is distinct from 'No') then raise exception 'Service needs office assessment';end if;
  if payload->>'localStart' is null or (payload->>'localStart') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' or (payload->>'localStart')::timestamp at time zone (select s.time_zone from public.business_settings s where s.business_id=biz)<=now() then raise exception 'Choose a future requested time';end if;
  insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,cleaning_scope,hours_override_reason)
   values(biz,req,cid,aid,(payload->>'localStart')::timestamp,15,payload->'selection',payload->'scope','') returning * into j;
  result:=jsonb_build_object('booking',j.id,'status',j.status,'totalCents',j.total_cents,'durationMinutes',j.duration_minutes);
 end if;
 insert into private_t25.events(business_id,actor,action,request_id,payload,result) values(biz,uid,action,req,payload,result);
 return result;
end;$$;
revoke all on function private_t25.portal(text,text,jsonb) from public,anon,authenticated,service_role;
grant usage on schema private_t25 to anon;
grant execute on function private_t25.portal(text,text,jsonb) to anon,authenticated;
create function public.t25_customer_portal(route text,action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_t25.portal(route,action,payload);$$;
revoke all on function public.t25_customer_portal(text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.t25_customer_portal(text,text,jsonb) to anon,authenticated;
-- Separate office facade resolves the configured route from a verified business.
create function private_t25.access(business uuid,action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare slug text;result jsonb;
begin
 if not private_t20.live_session() or not exists(select 1 from auth.users u where u.id=auth.uid() and not coalesce(u.is_anonymous,false)) or action is null or action not in ('links','link','revoke') or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business and m.user_id=auth.uid() and m.role in ('owner','manager') and m.status='active' and b.status='active') then raise exception 'Customer access denied' using errcode='42501';end if;
 select r.slug into slug from private_t25.routes r where r.business_id=business and r.active;
 if slug is null then raise exception 'Business page not configured';end if;
 if action<>'links' then return private_t25.portal(slug,action,payload);end if;
 if not exists(select 1 from public.business_customers c where c.business_id=business and c.id=(payload->>'customer')::uuid) then raise exception 'Customer unavailable';end if;
 select jsonb_build_object('route',slug,'links',coalesce(jsonb_agg(jsonb_build_object('userId',r.user_id,'active',r.active) order by r.user_id),'[]'::jsonb)) into result from private_t25.relationships r where r.business_id=business and r.customer_id=(payload->>'customer')::uuid;
 return result;
end;$$;
revoke all on function private_t25.access(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private_t25.access(uuid,text,jsonb) to authenticated;
create function public.t25_customer_access(business uuid,action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_t25.access(business,action,payload);$$;
revoke all on function public.t25_customer_access(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.t25_customer_access(uuid,text,jsonb) to authenticated;
commit;
