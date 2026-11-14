begin;
create function request_private.options_valid(a jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare o jsonb; ids text[]='{}'; k text;
begin
 if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a)>19 then return false;end if;
 for o in select value from jsonb_array_elements(a) loop
 if jsonb_typeof(o) is distinct from 'object' or (select count(*) from jsonb_object_keys(o))<>8 or not o ?& array['id','name','kind','minimum','maximum','included','price','minutes'] then return false;end if;
 if jsonb_typeof(o->'id') is distinct from 'string' or o->>'id' !~ '^[a-f0-9]{32}$' or o->>'id'=any(ids) or jsonb_typeof(o->'name') is distinct from 'string' or char_length(btrim(o->>'name')) not between 2 and 100 or o->>'name' ~ '[[:cntrl:]]' or jsonb_typeof(o->'kind') is distinct from 'string' or o->>'kind' not in ('bedrooms','bathrooms','room','extra','toggle') then return false;end if;
 ids=array_append(ids,o->>'id');
 foreach k in array array['minimum','maximum','included','price','minutes'] loop
 if jsonb_typeof(o->k) is distinct from 'number' or o->>k !~ '^[0-9]+$' then return false;end if;
 end loop;
 if (o->>'minimum')::bigint>(o->>'maximum')::bigint or (o->>'maximum')::bigint>9999 or (o->>'included')::bigint>(o->>'maximum')::bigint or (o->>'price')::bigint>999999999 or (o->>'minutes')::bigint>10080 or (o->>'kind'='toggle' and (o->>'maximum')::int<>1) then return false;end if;
 end loop;
 if (select count(*) from jsonb_array_elements(a) as entries(option) where entries.option->>'kind'='bedrooms')>1 or (select count(*) from jsonb_array_elements(a) as entries(option) where entries.option->>'kind'='bathrooms')>1 then return false;end if;
 return true;
exception when others then return false;end$$;
create function request_private.calculate(s jsonb,c text,a jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare o jsonb;v jsonb;q bigint;charge bigint;t bigint=coalesce((s->>'amount')::bigint,0);m bigint=(s->>'duration')::bigint; rows jsonb='[]';canonical jsonb='[]';items jsonb; ids text[]='{}';
begin
 if not request_private.options_valid(coalesce(s->'options','[]')) or jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a)>19 then raise exception 'Check room and extra selections.';end if;
 for v in select value from jsonb_array_elements(a) loop
 if jsonb_typeof(v) is distinct from 'object' or (select count(*) from jsonb_object_keys(v))<>2 or not v ?& array['id','quantity'] or jsonb_typeof(v->'id') is distinct from 'string' or v->>'id'=any(ids) or jsonb_typeof(v->'quantity') is distinct from 'number' or v->>'quantity' !~ '^[0-9]+$' or not exists(select 1 from jsonb_array_elements(coalesce(s->'options','[]')) x where x->>'id'=v->>'id') then raise exception 'Check room and extra selections.';end if;
 ids=array_append(ids,v->>'id');
 end loop;
 items=jsonb_build_array(jsonb_build_object('name',s->>'name','quantity',1,'price',coalesce((s->>'amount')::bigint,0)));
 for o in select value from jsonb_array_elements(coalesce(s->'options','[]')) loop
 select (x->>'quantity')::bigint into q from jsonb_array_elements(a) x where x->>'id'=o->>'id';
 if q is null or q<(o->>'minimum')::bigint or q>(o->>'maximum')::bigint then raise exception 'Check room and extra quantities.';end if;
 canonical=canonical||jsonb_build_array(jsonb_build_object('id',o->>'id','quantity',q));
 charge=greatest(0,q-(o->>'included')::bigint);
 if c in ('JPY','UGX','RWF') and (o->>'price')::bigint%100<>0 then raise exception 'Use whole currency amounts.';end if;
 t=t+charge*(o->>'price')::bigint;m=m+charge*(o->>'minutes')::bigint;
 rows=rows||jsonb_build_array(o||jsonb_build_object('quantity',q,'chargeable',charge));
 if charge>0 then items=items||jsonb_build_array(jsonb_build_object('name',o->>'name','quantity',charge,'price',(o->>'price')::bigint));end if;
 end loop;
 if t>999999999 or m not between 1 and 10080 then raise exception 'Selected scope exceeds supported price or duration.';end if;
 return jsonb_build_object('schema',1,'service',s,'currency',c,'selections',canonical,'rows',rows,'items',items,'total',case when s->>'mode'='quote' then null else t end,'minutes',m);
end$$;
create function request_private.scope_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 return coalesce(d=request_private.calculate(d->'service',d->>'currency',d->'selections'),false);
exception when others then return false;end$$;
revoke all on function request_private.options_valid(jsonb),request_private.calculate(jsonb,text,jsonb),request_private.scope_valid(jsonb) from public,anon,authenticated;
grant execute on function request_private.options_valid(jsonb),request_private.calculate(jsonb,text,jsonb),request_private.scope_valid(jsonb) to authenticated;
create or replace function public.business_services_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb; k text; ids text[]='{}';
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>2 or not d ?& array['currency','items'] or jsonb_typeof(d->'currency') is distinct from 'string' or d->>'currency' not in ('ZAR','USD','GBP','EUR','AUD','CAD','NZD','BWP','NAD','ZMW','KES','NGN','GHS','MUR','SZL','LSL','MZN','UGX','TZS','RWF','JPY','INR','AED','CHF') or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items')>100 then return false;end if;
 for s in select value from jsonb_array_elements(d->'items') loop
  if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s)) not in (8,9) or not s ?& array['id','name','description','duration','mode','amount','visible','archived'] then return false;end if;
  foreach k in array array['id','name','description','mode'] loop
   if jsonb_typeof(s->k) is distinct from 'string' or s->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
  end loop;
  if s->>'id' !~ '^[a-f0-9]{32}$' or s->>'id'=any(ids) or char_length(btrim(s->>'name')) not between 2 and 120 or char_length(s->>'description')>2000 or s->>'mode' not in ('fixed','from','quote') or jsonb_typeof(s->'duration') is distinct from 'number' or s->>'duration' !~ '^[0-9]+$' or (s->>'duration')::integer not between 1 and 10080 or jsonb_typeof(s->'visible') is distinct from 'boolean' or jsonb_typeof(s->'archived') is distinct from 'boolean' then return false;end if;
  if s ? 'options' and not request_private.options_valid(s->'options') then return false;end if;
  if (select count(*) from jsonb_object_keys(s))=9 and not s ? 'options' then return false;end if;
  if d->>'currency' in ('JPY','UGX','RWF') and exists(select 1 from jsonb_array_elements(coalesce(s->'options','[]')) o where (o->>'price')::bigint%100<>0) then return false;end if;
  ids=array_append(ids,s->>'id');
  if s->>'mode'='quote' then if s->'amount'<>'null'::jsonb then return false;end if;
  elsif jsonb_typeof(s->'amount') is distinct from 'number' or s->>'amount' !~ '^[0-9]+$' or (s->>'amount')::bigint not between 0 and 999999999 then return false;end if;
  if d->>'currency' in ('JPY','UGX','RWF') and s->>'mode'<>'quote' and (s->>'amount')::bigint%100<>0 then return false;end if;
 end loop;return true;
exception when others then return false;
end $$;
create or replace function quote_private.valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;k text;t bigint=0;
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d)) not in (6,7) or not d ?& array['name','email','phone','notes','currency','items'] then return false;end if;
 if (select count(*) from jsonb_object_keys(d))=7 and (not d ? 'scope' or not request_private.scope_valid(d->'scope') or d->'scope'->>'currency' is distinct from d->>'currency') then return false;end if;
 foreach k in array array['name','email','phone','notes','currency'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or d->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;end loop;
 if char_length(btrim(d->>'name')) not between 2 and 120 or char_length(d->>'email')>254 or char_length(d->>'phone')>40 or char_length(d->>'notes')>2000 or (d->>'email'='' and d->>'phone'='') or (d->>'email'<>'' and d->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (d->>'phone'<>'' and (d->>'phone' !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(d->>'phone','[^0-9]','','g'))<5)) or d->>'currency' not in ('ZAR','USD','GBP','EUR','AUD','CAD','NZD','BWP','NAD','ZMW','KES','NGN','GHS','MUR','SZL','LSL','MZN','UGX','TZS','RWF','JPY','INR','AED','CHF') or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items') not between 1 and 20 then return false;end if;
 for s in select value from jsonb_array_elements(d->'items') loop
 if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>3 or not s ?& array['name','quantity','price'] or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 2 and 120 or s->>'name' ~ '[[:cntrl:]]' or jsonb_typeof(s->'quantity') is distinct from 'number' or s->>'quantity' !~ '^[0-9]+$' or (s->>'quantity')::bigint not between 1 and 9999 or jsonb_typeof(s->'price') is distinct from 'number' or s->>'price' !~ '^[0-9]+$' or (s->>'price')::bigint not between 0 and 999999999 then return false;end if;
 if d->>'currency' in ('JPY','UGX','RWF') and (s->>'price')::bigint%100<>0 then return false;end if;
 t=t+(s->>'quantity')::bigint*(s->>'price')::bigint;
 end loop;return t<=999999999;
exception when others then return false;
end$$;
alter table public.business_booking_requests add column scope jsonb check(scope is null or request_private.scope_valid(scope));
create function request_private.submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid,p_address text,p_local timestamp,p_zone text,p_currency text,p_service_snapshot jsonb,p_selections jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare page public.business_public_pages;s jsonb;e public.business_enquiries;r public.business_booking_requests;t timestamptz;scope jsonb;
begin
 if not exists(select 1 from request_private.ingress where environment=p_environment and enabled) then raise exception 'Booking requests unavailable.';end if;
 select * into page from public.business_public_pages where environment=p_environment and slug=p_slug for share;
 if not found then raise exception 'Page unavailable.';end if;
 select value into s from jsonb_array_elements(page.services->'items') where value->>'id'=p_service and value->>'visible'='true' and value->>'archived'='false';
 if s is null or s is distinct from p_service_snapshot or page.time_zone is distinct from p_zone or page.services->>'currency' is distinct from p_currency then raise exception 'Service, price or time zone changed. Reload before submitting.';end if;
 if p_address is null or char_length(btrim(p_address)) not between 5 and 1000 or p_address ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' or p_local is null or p_local>=timestamp '2100-01-01' or p_requirements is null or char_length(p_requirements)>2000 then raise exception 'Check address, schedule and requirements.';end if;
 scope=case when jsonb_array_length(coalesce(s->'options','[]'))>0 then request_private.calculate(s,p_currency,p_selections) else null end;
 if scope is null and p_selections<>'[]'::jsonb then raise exception 'Service has no room or extra options.';end if;
 t=booking_private.instant(p_local,p_zone);
 -- Shared intake provides contact validation, publication lock, database spam caps and request idempotency.
 perform enquiry_private.submit(p_environment,p_slug,p_service,p_name,p_email,p_phone,p_requirements,p_request);
 select * into e from public.business_enquiries where request_id=p_request;
 select * into r from public.business_booking_requests where id=e.id for update;
 if found then
 if r.address=btrim(p_address) and r.preferred_at=t and r.time_zone=p_zone and r.currency=p_currency and r.service=s and r.scope is not distinct from scope then return '{}'::jsonb;end if;
 raise exception 'Request already used.';
 end if;
 if t<=now() then raise exception 'Choose a preferred date and time in the future.';end if;
 insert into public.business_booking_requests(id,business_id,environment,service,currency,time_zone,address,preferred_at,scope) values(e.id,e.business_id,p_environment,s,p_currency,p_zone,btrim(p_address),t,scope);
 return '{}'::jsonb;
end$$;
create or replace function request_private.submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid,p_address text,p_local timestamp,p_zone text,p_currency text,p_service_snapshot jsonb) returns jsonb language sql security invoker set search_path='' as $$select request_private.submit(p_environment,p_slug,p_service,p_name,p_email,p_phone,p_requirements,p_request,p_address,p_local,p_zone,p_currency,p_service_snapshot,'[]'::jsonb)$$;
create function public.business_booking_request_submit(p_environment text,p_slug text,p_service text,p_name text,p_email text,p_phone text,p_requirements text,p_request uuid,p_address text,p_local timestamp,p_zone text,p_currency text,p_service_snapshot jsonb,p_selections jsonb) returns jsonb language sql security invoker set search_path='' as $$select request_private.submit(p_environment,p_slug,p_service,p_name,p_email,p_phone,p_requirements,p_request,p_address,p_local,p_zone,p_currency,p_service_snapshot,p_selections)$$;
revoke all on function request_private.submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb,jsonb),public.business_booking_request_submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function request_private.submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb,jsonb),public.business_booking_request_submit(text,text,text,text,text,text,text,uuid,text,timestamp,text,text,jsonb,jsonb) to anon,authenticated;
create or replace function request_private.action(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if r.scope is not null then d=jsonb_set(d,'{items}',r.scope->'items')||jsonb_build_object('scope',r.scope);end if;
 bid=gen_random_uuid();
 perform quote_private.owner_write(p_business,p_environment,bid,0,'save',d,(now() at time zone b.time_zone)::date+14,r.id);
 else if r.scope is not null and q.document->'scope' is distinct from r.scope then raise exception 'Existing quote does not preserve requested rooms and extras. Review separately.';end if;bid=q.id;end if;
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
 if r.scope is not null and r.quote_id is null then d=jsonb_set(d,'{items}',r.scope->'items')||jsonb_build_object('scope',r.scope);end if;
 if not quote_private.valid(d) then raise exception 'Invalid booking agreement.';end if;
 if bid is null then
 bid=gen_random_uuid();
 insert into public.business_bookings(id,business_id,environment,quote_id,document,address,starts_at,time_zone,duration_minutes,customer_id) values(bid,p_business,p_environment,r.quote_id,d,r.address,r.preferred_at,r.time_zone,coalesce((r.scope->>'minutes')::integer,(r.service->>'duration')::integer),coalesce(q.customer_id,e.customer_id));
 end if;
 update public.business_booking_requests set status='Booked',booking_id=bid,version=version+1,updated_at=now() where id=r.id;
 return jsonb_build_object('booking_id',bid);
 end if;
 return '{}'::jsonb;
end$$;
create or replace function quote_private.owner_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb,p_expiry date,p_enquiry uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.business_quotes;b public.businesses;c text;z text;s jsonb;scope jsonb;
begin
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from quote_private.ingress where environment=p_environment and enabled) then raise exception 'Quotes unavailable';end if;
 if p_action not in ('save','send') or p_action is null or p_id is null or p_version is null then raise exception 'Check quote details';end if;
 select * into q from public.business_quotes where id=p_id for update;
 if found then
 if q.business_id<>p_business or q.environment<>p_environment or q.version<>p_version or q.status<>'Draft' then raise exception 'Quote changed or unavailable. Reload before saving.';end if;
 else
 if p_version<>0 or p_action<>'save' then raise exception 'Quote changed or unavailable. Reload before saving.';end if;
 end if;
 if p_action='save' then
 if q.id is not null then scope=q.document->'scope';elsif p_enquiry is not null then select r.scope into scope from public.business_booking_requests r where r.id=p_enquiry and r.business_id=p_business and r.environment=p_environment;end if;
 if scope is not null then p_document=(p_document-'scope')||jsonb_build_object('scope',scope);elsif p_document ? 'scope' then raise exception 'Scope must originate from a booking request.';end if;
 if not quote_private.valid(p_document) or p_expiry is null or p_expiry < (now() at time zone b.time_zone)::date or p_expiry > (now() at time zone b.time_zone)::date+366 then raise exception 'Check quote details and expiry';end if;
 select draft->>'currency' into c from public.business_service_catalogues where business_id=p_business and environment=p_environment;
 if p_document->>'currency'<>coalesce(c,'ZAR') then raise exception 'Business currency changed. Reload before saving.';end if;
 if p_enquiry is not null and not exists(select 1 from public.business_enquiries where id=p_enquiry and business_id=p_business and environment=p_environment) then raise exception 'Enquiry unavailable';end if;
 if q.id is null then insert into public.business_quotes(id,business_id,environment,enquiry_id,document,expires_on) values(p_id,p_business,p_environment,p_enquiry,p_document,p_expiry);
 else update public.business_quotes set document=p_document,expires_on=p_expiry,version=version+1 where id=p_id;end if;
 else
 if q.expires_on < (now() at time zone b.time_zone)::date then raise exception 'Update the expiry before sending.';end if;
 -- Capture explicit public business details only; no account metadata.
 select draft into s from public.business_profiles where business_id=p_business and environment=p_environment;
 s=jsonb_build_object('name',coalesce(nullif(s->>'name',''),b.name),'email',coalesce(s->>'email',''),'phone',coalesce(s->>'phone',''),'time_zone',b.time_zone);
 update public.business_quotes set status='Sent',sender=s,share_token=encode(extensions.gen_random_bytes(32),'hex'),sent_at=now(),version=version+1 where id=p_id;
 end if;
 return jsonb_build_object('id',p_id);
end$$;
create or replace function booking_private.owner_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_quote uuid,p_document jsonb,p_address text,p_local timestamp,p_zone text,p_duration integer,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if r.id is not null and r.document ? 'scope' then d=r.document;elsif r.id is null and p_quote is null and d ? 'scope' then raise exception 'Scope must originate from a booking request.';end if;
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
create or replace function invoice_private.write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb default null,p_due date default null,p_booking uuid default null,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.businesses;i public.business_invoices;r public.business_bookings;d jsonb;c text;s jsonb;n bigint;existing uuid;
begin
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from invoice_private.ingress where environment=p_environment and enabled) then raise exception 'Invoices unavailable';end if;
 if p_id is null or p_version is null or p_action is null or p_action not in ('save','issue','void') then raise exception 'Check invoice details';end if;
 if p_reason is null or char_length(p_reason)>500 or p_reason ~ '[[:cntrl:]]' then raise exception 'Check correction reason';end if;
 -- Serializes numbering, creation and payment-affecting transitions within this tenant.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':invoice:'||p_environment,0));
 select * into i from public.business_invoices where id=p_id for update;
 if found then
 if i.business_id<>p_business or i.environment<>p_environment then raise exception 'Invoice unavailable';end if;
 if i.version<>p_version then raise exception 'Invoice changed. Reload before saving.';end if;
 elsif p_action<>'save' or p_version<>0 then raise exception 'Invoice changed or unavailable';end if;
 if p_action='save' then
 if i.id is not null and i.state<>'Draft' then raise exception 'Issued invoices cannot be edited';end if;
 if p_due is null or p_due<date '2000-01-01' or p_due>date '2099-12-31' then raise exception 'Choose a valid due date';end if;
 if i.id is not null then p_booking=i.booking_id;end if;
 d=p_document;
 if p_booking is null and d ? 'scope' then raise exception 'Scope requires a linked booking.';end if;
 if p_booking is not null then
 select * into r from public.business_bookings where id=p_booking and business_id=p_business and environment=p_environment for share;
 if not found or (i.id is null and r.status='Cancelled') then raise exception 'Booking unavailable or cancelled';end if;
 if i.id is null then
 select id into existing from public.business_invoices where booking_id=p_booking and business_id=p_business and environment=p_environment;
 if found then return jsonb_build_object('id',existing);end if;
 end if;
 -- First creation snapshots the saved agreement. Later draft edits cannot change it.
 d=case when i.id is null then r.document else i.document end;
 elsif i.id is null then
 select draft->>'currency' into c from public.business_service_catalogues where business_id=p_business and environment=p_environment;
 if d->>'currency' is distinct from coalesce(c,'ZAR') then raise exception 'Business currency changed. Reload.';end if;
 elsif d->>'currency' is distinct from i.document->>'currency' then raise exception 'Invoice currency cannot be changed';end if;
 if not quote_private.valid(d) or invoice_private.total(d)<1 then raise exception 'Add valid items with a positive total';end if;
 if i.id is null then insert into public.business_invoices(id,business_id,environment,booking_id,document,due_on) values(p_id,p_business,p_environment,p_booking,d,p_due);
 else update public.business_invoices set document=d,due_on=p_due,version=version+1 where id=p_id;end if;
 elsif p_action='issue' then
 if i.state<>'Draft' then raise exception 'Invoice already issued or void';end if;
 if i.due_on < (now() at time zone b.time_zone)::date then raise exception 'Update the due date before issuing';end if;
 insert into invoice_private.counters values(p_business,p_environment,1) on conflict(business_id,environment) do update set value=invoice_private.counters.value+1 returning value into n;
 select draft into s from public.business_profiles where business_id=p_business and environment=p_environment;
 s=jsonb_build_object('name',coalesce(nullif(s->>'name',''),b.name),'email',coalesce(s->>'email',''),'phone',coalesce(s->>'phone',''),'time_zone',b.time_zone);
 update public.business_invoices set state='Issued',number='INV-'||lpad(n::text,greatest(6,length(n::text)),'0'),sender=s,share_token=encode(extensions.gen_random_bytes(32),'hex'),issued_at=now(),version=version+1 where id=p_id;
 else
 if i.state<>'Issued' then raise exception 'Only issued invoices can be voided';end if;
 if exists(select 1 from public.business_invoice_payments where invoice_id=p_id group by invoice_id having sum(case when reversal_of is null then amount else -amount end)<>0) then raise exception 'Reverse recorded payments before voiding. A reversal does not refund money.';end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 5 and 500 or p_reason ~ '[[:cntrl:]]' then raise exception 'Enter a correction reason from 5 to 500 characters';end if;
 update public.business_invoices set state='Void',void_reason=btrim(p_reason),voided_at=now(),version=version+1 where id=p_id;
 end if;
 insert into public.business_invoice_events(invoice_id,business_id,environment,action,actor,detail) values(p_id,p_business,p_environment,p_action,auth.uid(),jsonb_build_object('reason',p_reason,'version',p_version));
 return jsonb_build_object('id',p_id);
end$$;
commit;
