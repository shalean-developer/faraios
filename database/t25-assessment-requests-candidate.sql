-- Additive T25 follow-up. No route seeds, catalogue edits or existing data changes.
begin;
create table private_t25.assessment_requests(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 customer_id uuid not null,address_id uuid not null,actor uuid not null references auth.users(id),
 payload jsonb not null,version integer not null default 1,
 state text not null default 'awaiting_assessment' check(state in ('awaiting_assessment','awaiting_agreement','agreed','booked')),
 quote_id uuid unique,quote_version integer,agreed_by uuid references auth.users(id),agreed_at timestamptz,booking_id uuid,
 created_at timestamptz not null default now(),
 foreign key(business_id,customer_id,address_id) references public.customer_addresses(business_id,customer_id,id),
 foreign key(business_id,quote_id) references public.business_quotes(business_id,id),
 foreign key(business_id,booking_id) references public.one_off_bookings(business_id,id),
 check((state='awaiting_assessment')=(quote_id is null)),
 check((state in ('agreed','booked'))=(agreed_by is not null)),
 check((agreed_by is null)=(agreed_at is null)),check((state='booked')=(booking_id is not null))
);
alter table private_t25.assessment_requests enable row level security;
revoke all on private_t25.assessment_requests from public,anon,authenticated,service_role;
create index t25_assessment_customer on private_t25.assessment_requests(business_id,customer_id,created_at desc,id);
-- These quote transitions also apply through existing office quote APIs. No
-- alternate office screen can attest acceptance of a T25 quote without consent.
create function private_t25.guard_assessed_quote() returns trigger language plpgsql security definer set search_path='' as $$
declare r private_t25.assessment_requests;
begin
 select * into r from private_t25.assessment_requests x where x.quote_id=old.id for update;
 if not found then return new;end if;
 if not private_t20.live_session() then raise exception 'Office session required' using errcode='42501';end if;
 if new.status in ('accepted','converted') and new.status<>old.status then
  if r.state<>'agreed' or r.agreed_by is null or r.quote_version is distinct from (case when old.status='issued' then old.version else old.version-1 end)

  then raise exception 'Current customer agreement required' using errcode='42501';end if;
  perform 1 from private_t25.relationships l join public.business_customers c on c.business_id=l.business_id and c.id=l.customer_id join public.customer_addresses a on a.business_id=c.business_id and a.customer_id=c.id and a.id=r.address_id where l.business_id=r.business_id and l.customer_id=r.customer_id and l.user_id=r.agreed_by and l.active and c.is_active and a.is_active for share of l,c,a;
  if not found then raise exception 'Current customer agreement required' using errcode='42501';end if;
 end if;
 return new;
end;$$;
revoke all on function private_t25.guard_assessed_quote() from public,anon,authenticated,service_role;
create trigger z_t25_assessed_quote before update on public.business_quotes for each row execute function private_t25.guard_assessed_quote();

-- Keep the portal receipt aligned when an authorised office uses the existing
-- quote conversion screen after genuine portal consent.
create function private_t25.finish_assessed_quote() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='converted' and old.status<>'converted' then
  update private_t25.assessment_requests set state='booked',booking_id=new.converted_booking_id,version=version+1 where quote_id=new.id;
 end if;
 return new;
end;$$;
revoke all on function private_t25.finish_assessed_quote() from public,anon,authenticated,service_role;
create trigger t25_finish_assessed_quote after update on public.business_quotes for each row execute function private_t25.finish_assessed_quote();

create function private_t25.assessment(route text,action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare biz uuid;uid uuid:=auth.uid();office boolean;req uuid;cid uuid;aid uuid;rid uuid;r private_t25.assessment_requests;q public.business_quotes;prior private_t25.events;result jsonb;service public.business_catalogue;item public.business_catalogue;defs jsonb:=audit.cleaning_definitions();cfg jsonb;s jsonb;k text;v text;opt text;allowed text[];line jsonb;page integer;start_at timestamp;settings public.business_settings;quote uuid;conversion jsonb;
begin
 if route is null or action is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>65536 then raise exception 'Invalid request';end if;
 if not private_t20.live_session() or not exists(select 1 from auth.users u where u.id=uid and not coalesce(u.is_anonymous,false)) then raise exception 'Customer access denied' using errcode='42501';end if;
 select rt.business_id into biz from private_t25.routes rt join public.businesses b on b.id=rt.business_id where rt.active and b.status='active' and (rt.slug=route or rt.business_id::text=route) for share of rt,b;
 if biz is null then raise exception 'Business unavailable' using errcode='42501';end if;
 select exists(select 1 from public.business_memberships m where m.business_id=biz and m.user_id=uid and m.role in ('owner','manager') and m.status='active') into office;
 if action in ('queue','assess','finalize') then
  perform 1 from public.business_memberships m where m.business_id=biz and m.user_id=uid and m.role in ('owner','manager') and m.status='active' for share;
  if not found then raise exception 'Office access denied' using errcode='42501';end if;
 end if;
 if action in ('queue','history') then
  page:=coalesce((payload->>'page')::integer,0);if page<0 or page>1000000 then raise exception 'Invalid page';end if;
  select jsonb_build_object('rows',coalesce(jsonb_agg(x.data order by x.created_at desc,x.id),'[]'::jsonb)) into result from (
   select ar.id,ar.created_at,jsonb_build_object('id',ar.id,'version',ar.version,'customer',ar.customer_id,'address',ar.address_id,'customerName',bc.name,'addressDetails',jsonb_build_object('label',ca.label,'address_line',ca.address_line,'suburb',ca.suburb,'city',ca.city,'postal_code',ca.postal_code),'serviceName',catalogue.name,'state',case when qt.status in ('cancelled','declined') then 'office_review_required' else ar.state end,'localStart',ar.payload->>'localStart','scope',ar.payload->'scope','selection',ar.payload->'selection','booking',coalesce(ar.booking_id,qt.converted_booking_id),
    'quote',case when qt.id is null then null else jsonb_build_object('id',qt.id,'version',qt.version,'totalCents',qt.agreement->'total_cents','durationMinutes',qt.agreement->'duration_minutes','priceLines',qt.agreement->'price_lines','assessmentReason',qt.agreement->'cleaning_scope'->'assessment'->>'reason') end) data
   from private_t25.assessment_requests ar join public.business_customers bc on bc.business_id=ar.business_id and bc.id=ar.customer_id join public.customer_addresses ca on ca.business_id=ar.business_id and ca.customer_id=ar.customer_id and ca.id=ar.address_id left join public.business_catalogue catalogue on catalogue.business_id=ar.business_id and catalogue.id=(ar.payload->'selection'->0->>'catalogue_id')::uuid left join public.business_quotes qt on qt.id=ar.quote_id
   where ar.business_id=biz and (action='queue' or exists(select 1 from private_t25.relationships l join public.business_customers c on c.business_id=l.business_id and c.id=l.customer_id where l.business_id=biz and l.customer_id=ar.customer_id and l.user_id=uid and l.active and c.is_active)) order by ar.created_at desc,ar.id limit 51 offset page*50) x;
  return result;
 end if;
 if action not in ('submit','agree','assess','finalize') then raise exception 'Invalid action';end if;
 req:=(payload->>'requestId')::uuid;if req is null then raise exception 'Request key required';end if;
 -- Quote row precedes request row in all writers, including existing quote APIs.
 if action<>'submit' then
  rid:=(payload->>'request')::uuid;
  select * into r from private_t25.assessment_requests ar where ar.id=rid and ar.business_id=biz;
  if not found then raise exception 'Request unavailable' using errcode='42501';end if;
  if r.quote_id is not null then select * into q from public.business_quotes qt where qt.id=r.quote_id for update;end if;
  select * into r from private_t25.assessment_requests ar where ar.id=rid and ar.business_id=biz for update;
  if r.quote_id is distinct from q.id and r.quote_id is not null then raise exception 'Request changed' using errcode='40001';end if;
  cid:=r.customer_id;aid:=r.address_id;
 else cid:=(payload->>'customer')::uuid;aid:=(payload->>'address')::uuid;end if;
 if action in ('submit','agree') then
  perform 1 from private_t25.relationships l join public.business_customers c on c.business_id=l.business_id and c.id=l.customer_id where l.business_id=biz and l.customer_id=cid and l.user_id=uid and l.active and c.is_active for share of l,c;
  if not found then raise exception 'Customer access denied' using errcode='42501';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('t25-assessment:'||biz::text||uid::text,0));
 select * into prior from private_t25.events e where e.business_id=biz and e.actor=uid and e.action='assessment_'||assessment.action and e.request_id=req;
 if found then if prior.payload<>payload then raise exception 'Request reused with different details' using errcode='40001';end if;return prior.result;end if;
 if action<>'submit' and (payload->>'version')::integer is distinct from r.version then raise exception 'Request changed' using errcode='40001';end if;
 if action='submit' then
  if exists(select 1 from jsonb_object_keys(payload) key where key not in ('requestId','customer','address','localStart','selection','scope','catalogueVersions')) then raise exception 'Unexpected request field';end if;
  perform 1 from public.customer_addresses a where a.business_id=biz and a.customer_id=cid and a.id=aid and a.is_active for share;
  if not found then raise exception 'Address unavailable';end if;
  if jsonb_typeof(payload->'selection') is distinct from 'array' or jsonb_array_length(payload->'selection') not between 1 and 51 then raise exception 'Select service';end if;
  perform 1 from public.business_catalogue c where c.business_id=biz and c.id in(select (x->>'catalogue_id')::uuid from jsonb_array_elements(payload->'selection') x) order by c.id for share;
  if jsonb_typeof(payload->'catalogueVersions') is distinct from 'object' or exists(select 1 from jsonb_array_elements(payload->'selection') x left join public.business_catalogue c on c.business_id=biz and c.id=(x->>'catalogue_id')::uuid where c.id is null or not c.is_active or (payload->'catalogueVersions'->>c.id::text) is distinct from c.version::text) then raise exception 'Catalogue changed' using errcode='40001';end if;
  if (select count(*)<>count(distinct x->>'catalogue_id') from jsonb_array_elements(payload->'selection') x) then raise exception 'Duplicate selection';end if;
  select * into service from public.business_catalogue c where c.business_id=biz and c.id=(payload->'selection'->0->>'catalogue_id')::uuid and c.kind='service' and c.is_active;
  if not found or service.cleaning_config is null or service.cleaning_profile is null or payload->'selection'->0->>'quantity' is distinct from '1' then raise exception 'Select configured service';end if;
  cfg:=service.cleaning_config;s:=payload->'scope';
  if jsonb_typeof(s) is distinct from 'object' then raise exception 'Enter scope';end if;
  allowed:=array(select jsonb_array_elements_text(defs->'profileFields'->service.cleaning_profile));
  if service.cleaning_profile='airbnb' then allowed:=allowed||array['access_instructions'];end if;
  if service.cleaning_profile='airbnb' and cfg->>'linen_change_enabled'='true' then allowed:=allowed||array['linen_change'];end if;
  if cfg->'equipment'->>'policy'='distance' then allowed:=allowed||array['equipment'];end if;
  if cfg->'equipment'->>'policy'='assessed' then allowed:=allowed||array['equipment_arrangement'];end if;
  if exists(select 1 from jsonb_object_keys(s) key where not key=any(allowed)) then raise exception 'Unexpected scope field';end if;
  for k in select unnest(allowed) loop
   if k in ('access_instructions','equipment','equipment_arrangement') then continue;end if;
   v:=s->>k;
   if defs->'definitions'->k->>'count'='true' then
    if jsonb_typeof(s->k) is distinct from 'number' or coalesce(v,'')!~'^[0-9]{1,3}$' or v::int>100 or (k in ('bathrooms','carpet_rooms') and v::int<1) then raise exception 'Invalid room count';end if;
   elsif jsonb_typeof(s->k) is distinct from 'string' or not coalesce((case when k='pets' then cfg->'rules'->k else defs->'definitions'->k->'options' end ? v),false) then raise exception 'Select required option';end if;
  end loop;
  if length(coalesce(s->>'access_instructions',''))>2000 or (s ? 'access_instructions' and jsonb_typeof(s->'access_instructions')<>'string') then raise exception 'Invalid access instructions';end if;
  if s->>'linen'='No linen change' and s->>'linen_change'='Yes' then raise exception 'Fresh linen required';end if;
  if cfg->'equipment'->>'policy'='assessed' and coalesce(s->>'equipment_arrangement','') not in ('Customer supplies equipment','Business supplies equipment') then raise exception 'Select equipment arrangement';end if;
  if cfg->'equipment'->>'policy'='distance' and s->>'equipment' is distinct from 'No' then raise exception 'Equipment delivery requires office distance review';end if;
  for line in select value from jsonb_array_elements(payload->'selection') with ordinality t(value,n) where n>1 loop
   select * into item from public.business_catalogue c where c.id=(line->>'catalogue_id')::uuid and c.business_id=biz and c.kind='extra' and c.is_active;
   if not found or not(cfg->'extras' ? (line->>'catalogue_id')) or coalesce(line->>'quantity','')!~'^[1-9][0-9]{0,5}$' or item.pricing_model='fixed' and line->>'quantity'<>'1' then raise exception 'Invalid extra';end if;
  end loop;
  if coalesce(payload->>'localStart','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then raise exception 'Choose requested time';end if;
  start_at:=(payload->>'localStart')::timestamp;select * into settings from public.business_settings bs where bs.business_id=biz for share;
  if start_at at time zone settings.time_zone<=now() or not(extract(dow from start_at)::smallint=any(settings.working_days)) or start_at::time<settings.opens_at or start_at::time>=settings.closes_at then raise exception 'Choose future time within working hours';end if;
  insert into private_t25.assessment_requests(business_id,customer_id,address_id,actor,payload) values(biz,cid,aid,uid,payload) returning * into r;
 elsif action='assess' then
  if r.state not in ('awaiting_assessment','awaiting_agreement') then raise exception 'Request already agreed';end if;
  if r.quote_id is not null then
   if q.status<>'issued' then raise exception 'Quote requires office review';end if;
   perform audit.change_quote(biz,q.id,q.version,'cancelled','Superseded by a new T25 assessment; new customer agreement required');
  end if;
  quote:=audit.create_quote(biz,req,cid,aid,r.payload->'selection',(r.payload->'scope')||jsonb_build_object('assessment',jsonb_build_object('additional_cents',(payload->>'additional_cents')::integer,'duration_minutes',(payload->>'duration_minutes')::integer,'reason',payload->>'reason')),(payload->>'duration_minutes')::integer);
  select * into q from public.business_quotes qt where qt.id=quote;
  perform audit.change_quote(biz,q.id,q.version,'issued','T25 assessed request '||r.id::text);
  select * into q from public.business_quotes qt where qt.id=quote;
  update private_t25.assessment_requests set quote_id=q.id,quote_version=q.version,state='awaiting_agreement',version=version+1 where id=r.id returning * into r;
 elsif action='agree' then
  if payload->'consent' is distinct from 'true'::jsonb or r.state<>'awaiting_agreement' or q.status<>'issued' or (payload->>'quoteVersion')::integer is distinct from q.version or r.quote_version is distinct from q.version then raise exception 'Review current quote and explicitly agree' using errcode='40001';end if;
  update private_t25.assessment_requests set agreed_by=uid,agreed_at=now(),state='agreed',version=version+1 where id=r.id returning * into r;
 else
  if r.state<>'agreed' or q.status not in ('issued','accepted') or q.version is distinct from (r.quote_version+(case when q.status='accepted' then 1 else 0 end)) then raise exception 'Current agreement required';end if;
  if (r.payload->>'localStart')::timestamp at time zone (q.agreement->>'time_zone')<=now() then raise exception 'Requested time passed; arrange a new request';end if;
  if q.status='issued' then perform audit.change_quote(biz,q.id,q.version,'accepted','Actual customer agreement: T25 request '||r.id::text||' actor '||r.agreed_by::text||' at '||r.agreed_at::text);end if;
  select * into q from public.business_quotes qt where qt.id=r.quote_id;
  conversion:=audit.convert_quote(biz,q.id,q.version,(r.payload->>'localStart')::timestamp,'');
  select * into r from private_t25.assessment_requests ar where ar.id=r.id;
 end if;
 result:=jsonb_build_object('request',r.id,'state',r.state,'version',r.version,'booking',r.booking_id);
 insert into private_t25.events(business_id,actor,action,request_id,payload,result) values(biz,uid,'assessment_'||action,req,payload,result);
 return result;
end;$$;
revoke all on function private_t25.assessment(text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private_t25.assessment(text,text,jsonb) to authenticated;
create function public.t25_customer_assessment(route text,action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_t25.assessment(route,action,payload);$$;
revoke all on function public.t25_customer_assessment(text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.t25_customer_assessment(text,text,jsonb) to authenticated;
commit;
