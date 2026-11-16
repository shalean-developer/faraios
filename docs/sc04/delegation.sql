-- Isolated additive candidate only. Apply after authorization.sql and adapters.sql.
-- No API, JWT claim, session setting or application flag can open the gate.
begin;
alter table authorization_private.events add column detail jsonb not null default '{}';
create table authorization_private.delegation_gate(singleton boolean primary key default true check(singleton), enabled boolean not null default false);
insert into authorization_private.delegation_gate values(true,false);
alter table authorization_private.delegation_gate enable row level security;
revoke all on authorization_private.delegation_gate from public,anon,authenticated,service_role;
create table authorization_private.worker_identities (
 business_id uuid not null,environment text not null,user_id uuid not null,staff_id uuid not null,
 primary key(business_id,environment,user_id),unique(business_id,environment,staff_id),
 foreign key(business_id,environment,user_id) references public.business_memberships on delete restrict,
 foreign key(staff_id,business_id,environment) references public.business_staff(id,business_id,environment) on delete restrict
);
alter table authorization_private.worker_identities enable row level security;
revoke all on authorization_private.worker_identities from public,anon,authenticated,service_role;
create table authorization_private.availability_requests (
 id uuid primary key,business_id uuid not null,environment text not null,user_id uuid not null,
 starts_at timestamptz not null,ends_at timestamptz not null,created_at timestamptz not null default clock_timestamp(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '31 days'),
 foreign key(business_id,environment,user_id) references public.business_memberships on delete restrict
);
alter table authorization_private.availability_requests enable row level security;
revoke all on authorization_private.availability_requests from public,anon,authenticated,service_role;
-- The selector is never trusted for identity or authority. Live remains gated separately.
create function authorization_private.member_role(b uuid,e text) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.business_memberships m join public.businesses x on x.id=m.business_id
 where m.business_id=b and m.environment=e and m.user_id=auth.uid() and m.active
 and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
 and b::text=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-business')
 and e=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment')
 and ((m.role='owner' and x.owner_id=m.user_id) or (m.role<>'owner' and e='preview' and exists(select 1 from authorization_private.delegation_gate where enabled)))
$$;
create function authorization_private.require_member(b uuid,e text) returns text language plpgsql security definer set search_path='' as $$
declare r text;
begin
 -- Membership lock makes a command linearizable with revocation. Never cache roles in JWT/session.
 perform 1 from public.business_memberships where business_id=b and environment=e and user_id=auth.uid() for share;
 r=authorization_private.member_role(b,e);
 if r is null then raise exception 'Business context denied' using errcode='42501';end if;
 return r;
end$$;
-- Internal copies preserve all original lifecycle/version/ingress and snapshot rules.
-- Only the guarded dispatcher can execute copies; original APIs/RLS/views stay owner-only.
create table authorization_private.delegate_functions(identity text primary key,copy_name text not null unique);
alter table authorization_private.delegate_functions enable row level security;
revoke all on authorization_private.delegate_functions from public,anon,authenticated,service_role;
do $copies$
declare r record;s record;body text;target text;
begin
 for r in select p.oid,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.oid::regprocedure::text in (select identity from authorization_private.legacy_functions)
 loop
  insert into authorization_private.delegate_functions values(r.oid::regprocedure::text,'copy_'||r.nspname||'_'||r.proname);
 end loop;
 for r in select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.oid::regprocedure::text in (select identity from authorization_private.delegate_functions)
 loop
  body=replace(r.prosrc,'perform authorization_private.require_owner(p_business,p_environment);','if authorization_private.member_role(p_business,p_environment) is null then raise exception ''Business context denied'' using errcode=''42501'';end if;');
  body=replace(body,'b.owner_id=auth.uid()','authorization_private.member_role(p_business,p_environment) is not null');
  body=replace(body,'owner_id=auth.uid()','authorization_private.member_role(p_business,p_environment) is not null');
  for s in select n.nspname||'.'||p.proname as source_name,d.copy_name from authorization_private.delegate_functions d join pg_proc p on p.oid=to_regprocedure(d.identity) join pg_namespace n on n.oid=p.pronamespace loop
   body=replace(body,s.source_name||'(', 'authorization_private.'||s.copy_name||'(');
  end loop;
  select copy_name into target from authorization_private.delegate_functions where identity=r.oid::regprocedure::text;
  execute format('create function authorization_private.%I(%s) returns %s language plpgsql security definer %s set search_path='''' as %L',target,pg_get_function_arguments(r.oid),pg_get_function_result(r.oid),case r.provolatile when 's' then 'stable' when 'i' then 'immutable' else 'volatile' end,body);
 end loop;
end $copies$;
-- Identity links require the accountable owner, not editable staff email/name matches.
create function public.business_worker_link(p_business uuid,p_environment text,p_user uuid,p_staff uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform authorization_private.require_owner(p_business,p_environment);
 perform 1 from public.businesses where id=p_business for update;
 if not exists(select 1 from public.business_memberships where business_id=p_business and environment=p_environment and user_id=p_user and active and role='worker') then raise exception 'Active worker required';end if;
 insert into authorization_private.worker_identities values(p_business,p_environment,p_user,p_staff)
 on conflict(business_id,environment,user_id) do update set staff_id=excluded.staff_id;
 insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),'worker.linked',p_user,jsonb_build_object('staff_id',p_staff));
end$$;
create function authorization_private.assigned(b uuid,e text,booking uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from authorization_private.worker_identities w join public.business_staff s on s.id=w.staff_id and s.business_id=w.business_id and s.environment=w.environment and s.active
 join public.business_booking_staff a on a.staff_id=w.staff_id and a.business_id=w.business_id and a.environment=w.environment
 where w.business_id=b and w.environment=e and w.user_id=auth.uid() and a.booking_id=booking)
$$;
-- Recursively remove secrets from operational results. Worker output uses a positive allowlist below.
create function authorization_private.redact(d jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;k text;v jsonb;
begin
 if jsonb_typeof(d)='object' then
  result='{}';for k,v in select * from jsonb_each(d) loop
   if k not in ('share_token','token','token_hash','owner_id') then result=result||jsonb_build_object(k,authorization_private.redact(v));end if;
  end loop;return result;
 elsif jsonb_typeof(d)='array' then return coalesce((select jsonb_agg(authorization_private.redact(value)) from jsonb_array_elements(d)),'[]');end if;
 return d;
end$$;
-- Catalogue prices must be built server-side, never validated by a client assertion.
create function authorization_private.catalogue_document(b uuid,e text,d jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare item jsonb;cat jsonb;
begin
 select published into cat from public.business_service_catalogues where business_id=b and environment=e;
 if cat is null or not quote_private.valid(d) or d->>'currency' is distinct from cat->>'currency' or d ? 'scope' then return false;end if;
 for item in select value from jsonb_array_elements(d->'items') loop
  if not exists(select 1 from jsonb_array_elements(cat->'items') s where s->>'name'=item->>'name' and s->>'mode'='fixed' and coalesce((s->>'visible')::boolean,false) and not coalesce((s->>'archived')::boolean,true) and (s->>'amount')::bigint=(item->>'price')::bigint) then return false;end if;
 end loop;return true;
end$$;
create function public.business_delegate_command(p_business uuid,p_environment text,p_operation text,p_arguments jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare role text;action text;args jsonb;f record;arg text;parts text[]='{}';i integer;result jsonb;old public.business_bookings;inv public.business_invoices;doc jsonb;reason text;bid uuid;zone text;local_start timestamp;local_end timestamp;instant_start timestamptz;instant_end timestamptz;
begin
 role=authorization_private.require_member(p_business,p_environment);
 if role='owner' then raise exception 'Use owner actions' using errcode='42501';end if;
 if jsonb_typeof(p_arguments) is distinct from 'object' then raise exception 'Invalid arguments';end if;
 action=case p_operation
 when 'business_customer_search' then 'customers.manage' when 'business_customer_write' then 'customers.manage' when 'business_customer_link' then 'customers.manage'
 when 'business_enquiry_create' then 'enquiry.internal' when 'business_enquiry_status' then 'enquiry.internal' when 'business_enquiry_workflow_save' then 'enquiry.internal' when 'business_enquiry_workspace' then 'enquiry.internal'
 when 'business_quote_write' then 'quote.draft' when 'business_quote_send' then 'quote.draft' when 'business_customer_quote_create' then 'quote.draft'
 when 'business_booking_write' then 'booking.schedule' when 'business_customer_booking_create' then 'booking.schedule' when 'business_booking_request_action' then 'booking.schedule'
 when 'business_staff_assign' then 'assignment.manage' when 'business_staff_write' then 'staff.manage'
 when 'business_invoice_write' then 'invoice.issue' when 'business_invoice_payment' then 'payment.record'
 when 'business_dashboard' then 'finance.bulk'
 when 'visit.execute' then 'visit.execute' when 'terminal.correct' then 'terminal.correct' when 'availability.request' then 'assignment.manage' end;
 if action is null or (role='worker' and p_operation not in ('visit.execute','availability.request')) or (role='receptionist' and action not in ('customers.manage','enquiry.internal','quote.draft','booking.schedule','assignment.manage','invoice.issue')) then raise exception 'Action denied' using errcode='42501';end if;
 -- Locks shared with existing assignment writes; recheck assignment after lock acquisition.
 if p_operation in ('visit.execute','terminal.correct') then
  if exists(select 1 from jsonb_object_keys(p_arguments) k where k not in ('id','version','status','reason')) then raise exception 'Invalid visit fields';end if;
  bid=(p_arguments->>'id')::uuid;
  select * into old from public.business_bookings where id=bid and business_id=p_business and environment=p_environment for update;
  if not found or old.version is distinct from (p_arguments->>'version')::integer then raise exception 'Booking changed or unavailable';end if;
  if role='worker' and not authorization_private.assigned(p_business,p_environment,bid) then raise exception 'Assignment denied' using errcode='42501';end if;
  if not exists(select 1 from booking_private.ingress where environment=p_environment and enabled) then raise exception 'Bookings unavailable';end if;
  if p_operation='visit.execute' then
   if not ((old.status='Scheduled' and p_arguments->>'status'='In Progress') or (old.status='In Progress' and p_arguments->>'status'='Completed')) then raise exception 'Invalid visit transition';end if;
  else
   reason=btrim(p_arguments->>'reason');
   if role<>'manager' or old.status not in ('Completed','Cancelled') or p_arguments->>'status' is distinct from 'Scheduled' or coalesce(char_length(reason),0) not between 5 and 500 or reason ~ '[[:cntrl:]]' then raise exception 'Correction denied' using errcode='42501';end if;
  end if;
  update public.business_bookings set status=p_arguments->>'status',version=version+1,updated_at=now() where id=bid;
  insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),p_operation,bid,jsonb_build_object('reason',reason,'from',old.status,'to',p_arguments->>'status'));
  return jsonb_build_object('id',bid,'version',old.version+1);
 end if;
 if p_operation='availability.request' then
  if role<>'worker' or exists(select 1 from jsonb_object_keys(p_arguments) k where k not in ('id','starts_at','ends_at')) then raise exception 'Availability denied';end if;
  select time_zone into zone from public.businesses where id=p_business;
  if zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Choose a valid date and time.';end if;
  if coalesce(p_arguments->>'starts_at','') ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' and coalesce(p_arguments->>'ends_at','') ~ '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$' then
   local_start=(p_arguments->>'starts_at')::timestamp;local_end=(p_arguments->>'ends_at')::timestamp;
   instant_start=booking_private.instant(local_start,zone);instant_end=booking_private.instant(local_end,zone);
  elsif coalesce(p_arguments->>'starts_at','') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$' and coalesce(p_arguments->>'ends_at','') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$' then
   -- Existing explicit-instant API callers retain their unambiguous meaning.
   instant_start=(p_arguments->>'starts_at')::timestamptz;instant_end=(p_arguments->>'ends_at')::timestamptz;
   local_start=instant_start at time zone zone;local_end=instant_end at time zone zone;
  else raise exception 'Choose a valid date and time.';end if;
  if local_start<timestamp '2000-01-01' or local_end>=timestamp '2100-01-01' or instant_end<=instant_start then raise exception 'Choose an end time after the start, between 2000 and 2099.';end if;
  insert into authorization_private.availability_requests(id,business_id,environment,user_id,starts_at,ends_at) values((p_arguments->>'id')::uuid,p_business,p_environment,auth.uid(),instant_start,instant_end);
  return jsonb_build_object('id',p_arguments->>'id');
 end if;
 -- Request quotation must pass the quote-draft constraints, never bypass them via conversion.
 if p_operation='business_booking_request_action' and p_arguments->>'p_action'='quote' then raise exception 'Use the quotation action' using errcode='42501';end if;
 -- No delegated reversal, replacement or void, through any alias.
 if p_operation='business_invoice_payment' and p_arguments->>'p_reversal' is not null then raise exception 'Action denied' using errcode='42501';end if;
 if p_operation='business_invoice_write' then
  if p_arguments->>'p_action' is null or p_arguments->>'p_action' not in ('save','issue') then raise exception 'Action denied' using errcode='42501';end if;
  if role='receptionist' then
   select * into inv from public.business_invoices where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
   bid=coalesce(inv.booking_id,(p_arguments->>'p_booking')::uuid);
   select * into old from public.business_bookings where id=bid and business_id=p_business and environment=p_environment for share;
   if not found or old.status='Cancelled' or inv.replaces_id is not null or (inv.id is not null and inv.document is distinct from old.document) or (p_arguments->'p_document' is not null and p_arguments->'p_document'<>'null' and p_arguments->'p_document' is distinct from old.document) then raise exception 'Agreed invoice required' using errcode='42501';end if;
  end if;
 end if;
 if p_operation in ('business_quote_write','business_customer_quote_create','business_quote_send') then
  doc=p_arguments->'p_document';
  if p_operation='business_quote_send' or p_arguments->>'p_action'='send' then
   select document into doc from public.business_quotes where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
  end if;
  if role='receptionist' and authorization_private.catalogue_document(p_business,p_environment,doc) is distinct from true then raise exception 'Catalogue prices required' using errcode='42501';end if;
  if role='manager' and authorization_private.catalogue_document(p_business,p_environment,doc) is distinct from true then
   reason=btrim(p_arguments->>'authorization_reason');
   if coalesce(char_length(reason),0) not between 5 and 500 or reason ~ '[[:cntrl:]]' then raise exception 'Override reason required' using errcode='42501';end if;
   insert into authorization_private.events(business_id,environment,actor,action,subject,detail) values(p_business,p_environment,auth.uid(),'quote.override',(p_arguments->>'p_id')::uuid,jsonb_build_object('reason',reason));
  end if;
 end if;
 if p_operation in ('business_booking_write','business_customer_booking_create') then
  select * into old from public.business_bookings where id=(p_arguments->>'p_id')::uuid and business_id=p_business and environment=p_environment for update;
  if old.id is not null then
   if old.status in ('Completed','Cancelled') then raise exception 'Use a reasoned terminal correction' using errcode='42501';end if;
   if p_arguments->>'p_status' is distinct from old.status and (role='receptionist' or p_arguments->>'p_status' not in ('Scheduled','Cancelled')) then raise exception 'Use visit execution' using errcode='42501';end if;
   if role='receptionist' and p_arguments->'p_document' is distinct from old.document then raise exception 'Agreement cannot change' using errcode='42501';end if;
  elsif role='receptionist' and p_arguments->>'p_quote' is null then raise exception 'Accepted agreement required' using errcode='42501';end if;
 end if;
 -- Fixed public operation names only; arguments are bound typed literals, never executable input.
 select p.*,d.copy_name into f from authorization_private.delegate_functions d join pg_proc p on d.copy_name='copy_public_'||p.proname join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
 where d.identity like p_operation||'(%';
 if not found then raise exception 'Unknown operation' using errcode='42501';end if;
 args=(p_arguments-'authorization_reason')||jsonb_build_object('p_business',p_business,'p_environment',p_environment);
 if exists(select 1 from jsonb_object_keys(args) k where not(k=any(f.proargnames))) or p_arguments ?| array['p_business','p_environment'] then raise exception 'Unexpected argument';end if;
 for i in 1..f.pronargs loop
  arg=f.proargnames[i];
  if args ? arg then
   parts=array_append(parts,format('%I => %L::%s',arg,case when f.proargtypes[i-1]='jsonb'::regtype then (args->arg)::text else args->>arg end,format_type(f.proargtypes[i-1],null)));
  elsif i<=f.pronargs-f.pronargdefaults then raise exception 'Missing argument: %',arg;end if;
 end loop;
 execute format('select authorization_private.%I(%s)',f.copy_name,array_to_string(parts,',')) into result;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),action,coalesce((p_arguments->>'p_id')::uuid,(p_arguments->>'p_booking')::uuid));
 return authorization_private.redact(result);
end$$;
create function public.business_delegate_read(p_business uuid,p_environment text,p_resource text,p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare role text;result jsonb;table_name text;
begin
 role=authorization_private.require_member(p_business,p_environment);
 if role='owner' then raise exception 'Use owner workspace';end if;
 if role='worker' then
  if p_resource<>'visits' then raise exception 'Read denied' using errcode='42501';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'version',b.version,'status',b.status,'address',b.address,'starts_at',b.starts_at,'time_zone',b.time_zone,'duration_minutes',b.duration_minutes,'customer_name',b.document->>'name','services',(select jsonb_agg(jsonb_build_object('name',i->>'name','quantity',i->'quantity')) from jsonb_array_elements(b.document->'items')i)) order by b.starts_at,b.id),'[]') into result
  from public.business_bookings b where b.business_id=p_business and b.environment=p_environment and (p_id is null or b.id=p_id) and b.status in ('Scheduled','In Progress') and authorization_private.assigned(p_business,p_environment,b.id);
  return result;
 end if;
 if p_resource='invoice' then
  if p_id is null then raise exception 'Exact invoice required' using errcode='42501';end if;
  select jsonb_build_object('id',i.id,'version',i.version,'state',i.state,'booking_id',i.booking_id,'document',i.document,'due_on',i.due_on,'number',i.number) into result
  from public.business_invoices i join public.business_bookings b on b.id=i.booking_id and b.business_id=i.business_id and b.environment=i.environment
  where i.id=p_id and i.business_id=p_business and i.environment=p_environment and (role='manager' or (i.replaces_id is null and i.document=b.document));
  if result is null then raise exception 'Invoice unavailable' using errcode='42501';end if;
  return result;
 end if;
 table_name=case p_resource when 'customers' then 'business_customers' when 'enquiries' then 'business_enquiries' when 'quotes' then 'business_quotes' when 'bookings' then 'business_booking_schedule' when 'staff' then 'business_staff' when 'invoices' then 'business_invoice_list' when 'payments' then 'business_invoice_payments' when 'catalogue' then 'business_service_catalogues' end;
 if table_name is null or (role='receptionist' and p_resource in ('invoices','payments')) then raise exception 'Read denied' using errcode='42501';end if;
 if role='receptionist' and p_resource='staff' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active)),'[]') into result from public.business_staff where business_id=p_business and environment=p_environment;return result;
 end if;
 if p_resource='catalogue' then
  select published into result from public.business_service_catalogues where business_id=p_business and environment=p_environment;return coalesce(result,'{}');
 end if;
 execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]'') from (select * from public.%I where business_id=$1 and environment=$2 and ($3 is null or id=$3) order by id limit 100) t',table_name) into result using p_business,p_environment,p_id;
 return authorization_private.redact(result);
end$$;
-- D01: bounded page API; same authorization and positive worker projection as legacy read.
create function public.business_delegate_page(p_business uuid,p_environment text,p_resource text,p_id uuid default null,p_page integer default 1,p_size integer default 50) returns jsonb language plpgsql security definer set search_path='' as $$
declare role text;result jsonb;table_name text;
begin
 role=authorization_private.require_member(p_business,p_environment);
 if p_page is null or p_page<1 or p_page>1000000 or p_size is null or p_size<1 or p_size>100 then raise exception 'Choose a valid record page.';end if;
 if role='owner' then raise exception 'Use owner workspace';end if;
 if role='worker' then
  if p_resource<>'visits' then raise exception 'Read denied' using errcode='42501';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'version',b.version,'status',b.status,'address',b.address,'starts_at',b.starts_at,'time_zone',b.time_zone,'duration_minutes',b.duration_minutes,'customer_name',b.document->>'name','services',(select jsonb_agg(jsonb_build_object('name',i->>'name','quantity',i->'quantity')) from jsonb_array_elements(b.document->'items')i)) order by b.starts_at,b.id),'[]') into result
  from (select b.* from public.business_bookings b where b.business_id=p_business and b.environment=p_environment and (p_id is null or b.id=p_id) and b.status in ('Scheduled','In Progress') and authorization_private.assigned(p_business,p_environment,b.id) order by b.starts_at,b.id limit p_size+1 offset (p_page-1)*p_size) b;
  return jsonb_build_object('items',result - p_size,'has_next',jsonb_array_length(result)>p_size,'page',p_page);
 end if;
 if p_resource='invoice' then
  if p_id is null then raise exception 'Exact invoice required' using errcode='42501';end if;
  select jsonb_build_object('id',i.id,'version',i.version,'state',i.state,'booking_id',i.booking_id,'document',i.document,'due_on',i.due_on,'number',i.number) into result
  from public.business_invoices i join public.business_bookings b on b.id=i.booking_id and b.business_id=i.business_id and b.environment=i.environment
  where i.id=p_id and i.business_id=p_business and i.environment=p_environment and (role='manager' or (i.replaces_id is null and i.document=b.document));
  if result is null then raise exception 'Invoice unavailable' using errcode='42501';end if;
  return result;
 end if;
 table_name=case p_resource when 'customers' then 'business_customers' when 'enquiries' then 'business_enquiries' when 'quotes' then 'business_quotes' when 'bookings' then 'business_booking_schedule' when 'staff' then 'business_staff' when 'invoices' then 'business_invoice_list' when 'payments' then 'business_invoice_payments' when 'catalogue' then 'business_service_catalogues' end;
 if table_name is null or (role='receptionist' and p_resource in ('invoices','payments')) then raise exception 'Read denied' using errcode='42501';end if;
 if role='receptionist' and p_resource='staff' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active) order by id),'[]') into result from (select id,name,active from public.business_staff where business_id=p_business and environment=p_environment and (p_id is null or id=p_id) order by id limit p_size+1 offset (p_page-1)*p_size) s;return jsonb_build_object('items',result - p_size,'has_next',jsonb_array_length(result)>p_size,'page',p_page);
 end if;
 if p_resource='catalogue' then
  select published into result from public.business_service_catalogues where business_id=p_business and environment=p_environment;return coalesce(result,'{}');
 end if;
 execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]'') from (select * from public.%I where business_id=$1 and environment=$2 and ($3 is null or id=$3) order by id limit $4+1 offset ($5-1)*$4) t',table_name) into result using p_business,p_environment,p_id,p_size,p_page;
 return jsonb_build_object('items',authorization_private.redact(result - p_size),'has_next',jsonb_array_length(result)>p_size,'page',p_page);
end$$;
revoke all on function public.business_delegate_page(uuid,text,text,uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.business_delegate_page(uuid,text,text,uuid,integer,integer) to authenticated;
-- Discovery lists only active scopes; selection still supplies explicit headers and revalidates.
create or replace function public.business_contexts(p_discovery boolean default true) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('business_id',b.id,'environment',m.environment,'role',m.role,'name',b.name,'business_type',b.business_type,'country',b.country,'time_zone',b.time_zone) order by b.id,m.environment),'[]') from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.user_id=auth.uid() and m.active and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
 and ((m.role='owner' and b.owner_id=m.user_id) or (m.role<>'owner' and m.environment='preview' and exists(select 1 from authorization_private.delegation_gate where enabled)))
$$;
revoke all on all functions in schema authorization_private from public,anon,authenticated,service_role;
grant execute on function authorization_private.allowed(uuid,text),authorization_private.require_owner(uuid,text) to authenticated;
revoke all on function public.business_delegate_command(uuid,text,text,jsonb),public.business_delegate_read(uuid,text,text,uuid),public.business_worker_link(uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.business_delegate_command(uuid,text,text,jsonb),public.business_delegate_read(uuid,text,text,uuid),public.business_worker_link(uuid,text,uuid,uuid) to authenticated;
commit;
