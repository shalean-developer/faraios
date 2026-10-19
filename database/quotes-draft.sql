-- T18 isolated candidate. No business values are seeded; staging only.
begin;

create function audit.build_cleaning_snapshot(p_booking public.one_off_bookings) returns public.one_off_bookings language plpgsql security invoker set search_path='' as $builder$
declare new public.one_off_bookings:=p_booking;service public.business_catalogue;defs jsonb:=audit.cleaning_definitions();cfg jsonb;s jsonb;k text;v text;opt text;r jsonb;qty int;minutes bigint;amount numeric:=0;fee numeric:=0;lines jsonb:='[]';line jsonb;allowed text[];item public.business_catalogue;requires_assessment boolean:=false;assessment jsonb;configured_minutes bigint;
begin
 perform public.booking_context(new.business_id);
 select * into service from public.business_catalogue where id=(new.selection->0->>'catalogue_id')::uuid and business_id=new.business_id and kind='service' and is_active;
 new.cleaning_snapshot:=null;
 if service.cleaning_profile is null then
  if new.cleaning_scope is not null then raise exception 'Scope requires a configured cleaning service';end if;return new;
 end if;
 cfg:=service.cleaning_config;s:=new.cleaning_scope;
 if cfg is null then raise exception 'Owner must configure service pricing, duration and equipment';end if;
 if jsonb_typeof(s) is distinct from 'object' then raise exception 'Enter service scope';end if;
 requires_assessment:=coalesce((cfg->>'manual_duration')::boolean,false);
 allowed:=array(select jsonb_array_elements_text(defs->'profileFields'->service.cleaning_profile));
 if service.cleaning_profile='airbnb' then allowed:=allowed||array['access_instructions'];end if;
 if service.cleaning_profile='airbnb' and cfg->>'linen_change_enabled'='true' then allowed:=allowed||array['linen_change'];end if;
 if cfg->'equipment'->>'policy'='distance' then allowed:=allowed||array['equipment','distance_km','distance_reason'];end if;
 allowed:=allowed||array['assessment'];
 if cfg->'equipment'->>'policy'='assessed' then allowed:=allowed||array['equipment_arrangement'];end if;
 if exists(select 1 from jsonb_object_keys(s) key where not key=any(allowed)) then raise exception 'Unexpected service scope field';end if;
 if not exists(select 1 from public.business_customers where id=new.customer_id and business_id=new.business_id and length(trim(phone))>0) then raise exception 'Save a contact phone on the selected customer before booking cleaning';end if;
 minutes:=(cfg->>'base_minutes')::int;
 amount:=(cfg->>'service_fee_cents')::numeric;
 lines:=jsonb_build_array(jsonb_build_object('name','Service fee','kind','fee','pricing_model','fixed','unit_label','visit','rate_cents',amount,'quantity',1,'total_cents',amount));
 for k in select jsonb_array_elements_text((defs->'profileFields'->service.cleaning_profile)||case when service.cleaning_profile='airbnb' and cfg->>'linen_change_enabled'='true' then '["linen_change"]'::jsonb else '[]'::jsonb end) loop
  v:=s->>k;
  if defs->'definitions'->k->>'count'='true' then
   if jsonb_typeof(s->k) is distinct from 'number' or coalesce(v,'')!~'^[0-9]{1,3}$' or v::int>100 or (k in ('bathrooms','carpet_rooms') and v::int<1) then raise exception 'Enter valid whole room counts (0–100; bathrooms and carpet rooms at least 1)';end if;qty:=v::int;opt:='unit';
  else
   if jsonb_typeof(s->k) is distinct from 'string' or not (case when k='pets' then cfg->'rules'->k else defs->'definitions'->k->'options' end ? v) then raise exception 'Select every required service option';end if;qty:=1;opt:=v;
  end if;
  r:=cfg->'rules'->k->opt;if r is null then raise exception 'Service rules need configuration before booking';end if;
  if coalesce((r->>'assessment')::boolean,false) and qty>0 then requires_assessment:=true;end if;
  minutes:=minutes+(r->>'minutes')::int*qty;amount:=amount+(r->>'cents')::numeric*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('name',defs->'definitions'->k->>'label'||': '||v,'kind','scope','pricing_model','per_unit','unit_label',case when opt='unit' then 'each' else 'option' end,'rate_cents',(r->>'cents')::numeric,'quantity',qty,'total_cents',(r->>'cents')::numeric*qty));
 end loop;
 if service.cleaning_profile='airbnb' and s->>'linen'='No linen change' and s->>'linen_change'='Yes' then raise exception 'Fresh linen must be available for a linen change';end if;
 if service.cleaning_profile='airbnb' and (s ? 'access_instructions') and (jsonb_typeof(s->'access_instructions') is distinct from 'string' or length(s->>'access_instructions')>2000) then raise exception 'Check access instructions';end if;
 if cfg->'equipment'->>'policy'='distance' then
  if coalesce(s->>'equipment','') not in ('Yes','No') then raise exception 'Select equipment Yes or No';end if;
  if s->>'equipment'='Yes' then
   if jsonb_typeof(s->'distance_km') is distinct from 'number' or coalesce(s->>'distance_km','')!~'^[0-9]{1,4}(\.[0-9]{1,2})?$' or (s->>'distance_km')::numeric>1000 or jsonb_typeof(s->'distance_reason') is distinct from 'string' or length(trim(coalesce(s->>'distance_reason',''))) not between 1 and 500 then raise exception 'Record equipment distance and its source';end if;
   fee:=greatest((cfg->'equipment'->>'minimum_cents')::numeric,ceil((cfg->'equipment'->>'base_cents')::numeric+(s->>'distance_km')::numeric*(cfg->'equipment'->>'per_km_cents')::numeric));
   minutes:=minutes+(cfg->'equipment'->>'minutes')::int;amount:=amount+fee;
   lines:=lines||jsonb_build_array(jsonb_build_object('name','Equipment delivery / collection','kind','equipment','pricing_model','fixed','unit_label','quote','rate_cents',fee,'quantity',1,'total_cents',fee));
  elsif s ? 'distance_km' or s ? 'distance_reason' then raise exception 'Remove equipment distance when equipment is No';end if;
 end if;
 if cfg->'equipment'->>'policy'='assessed' then
  if coalesce(s->>'equipment_arrangement','') not in ('Customer supplies equipment','Business supplies equipment') then raise exception 'Choose the equipment arrangement';end if;
  if s->>'equipment_arrangement'='Business supplies equipment' then requires_assessment:=true;end if;
 end if;
 for line in select value from jsonb_array_elements(new.selection) with ordinality t(value,n) where n>1 loop
  if not (cfg->'extras' ? (line->>'catalogue_id')) then raise exception 'Extra not allowed for this service';end if;
  -- Base validator checks active item, tenant, type and quantity as well.
  select * into item from public.business_catalogue where id=(line->>'catalogue_id')::uuid and business_id=new.business_id and kind='extra' and is_active;
  if not found then raise exception 'Select active business extras';end if;
  if coalesce(line->>'quantity','')!~'^[1-9][0-9]{0,5}$' then raise exception 'Use positive whole-number quantities';end if;
  minutes:=minutes+(cfg->'extra_minutes'->>(line->>'catalogue_id'))::int*(line->>'quantity')::int;
 end loop;
 configured_minutes:=minutes;
 assessment:=s->'assessment';
 if requires_assessment and assessment is null then raise exception 'Office assessment, charge, duration and reason required before saving';end if;
 if assessment is not null then
  if jsonb_typeof(assessment) is distinct from 'object' then raise exception 'Invalid office assessment';end if;
  if exists(select 1 from jsonb_object_keys(assessment) key where key not in ('additional_cents','duration_minutes','reason')) then raise exception 'Unexpected assessment fields';end if;
  if jsonb_typeof(assessment->'additional_cents') is distinct from 'number' or coalesce(assessment->>'additional_cents','')!~'^[0-9]{1,10}$' or (assessment->>'additional_cents')::numeric>2147483647 or jsonb_typeof(assessment->'duration_minutes') is distinct from 'number' or coalesce(assessment->>'duration_minutes','')!~'^[0-9]{1,4}$' or (assessment->>'duration_minutes')::int not between 15 and 1440 or jsonb_typeof(assessment->'reason') is distinct from 'string' or length(trim(coalesce(assessment->>'reason',''))) not between 1 and 2000 then raise exception 'Enter explicit assessment charge, duration and reason';end if;
  if not coalesce((cfg->>'manual_duration')::boolean,false) and (assessment->>'duration_minutes')::int<minutes then raise exception 'Assessed duration cannot be shorter than the configured estimate';end if;
  minutes:=(assessment->>'duration_minutes')::int;amount:=amount+(assessment->>'additional_cents')::numeric;
  lines:=lines||jsonb_build_array(jsonb_build_object('name','Office-assessed additional work / equipment','kind','assessment','pricing_model','fixed','unit_label','assessment','rate_cents',(assessment->>'additional_cents')::numeric,'quantity',1,'total_cents',(assessment->>'additional_cents')::numeric));
 end if;
 if minutes not between 15 and 1440 or amount>2147483647 then raise exception 'Configured quote exceeds supported price or duration bounds';end if;
 new.duration_minutes:=minutes;
 new.cleaning_snapshot:=jsonb_build_object('profile',service.cleaning_profile,'version',service.version,'configuration',cfg,'duration_minutes',minutes,'adjustment_cents',amount,'lines',lines,'equipment_policy',cfg->'equipment'->>'policy','equipment_fee_cents',fee,'configured_duration_minutes',case when coalesce((cfg->>'manual_duration')::boolean,false) then null else configured_minutes end,'assessed_duration_minutes',case when assessment is not null then minutes else null end,'assessment_required',requires_assessment,'assessed_by',case when assessment is not null then auth.uid() else null end,'assessed_at',case when assessment is not null then now() else null end);
 return new;
end;
$builder$;
revoke all on function audit.build_cleaning_snapshot(public.one_off_bookings) from public,anon,authenticated;
grant execute on function audit.build_cleaning_snapshot(public.one_off_bookings) to authenticated;

create function audit.build_booking_snapshot(p_booking public.one_off_bookings) returns public.one_off_bookings language plpgsql security invoker set search_path='' as $builder$
declare new public.one_off_bookings:=p_booking;ctx jsonb;c public.business_customers;a public.customer_addresses;item public.business_catalogue;line jsonb;lines jsonb:='[]';qty integer;total bigint:=0;line_no integer:=0;seen uuid[]:='{}';uid uuid;local_end timestamp;
begin
 ctx:=public.booking_context(new.business_id);
  select * into c from public.business_customers where id=new.customer_id and business_id=new.business_id and is_active for share;
  if not found then raise exception 'Select an active customer in this business';end if;
  select * into a from public.customer_addresses where id=new.address_id and customer_id=c.id and business_id=new.business_id and is_active for share;
  if not found then raise exception 'Select an active address for this customer';end if;
  if jsonb_typeof(new.selection)<>'array' or jsonb_array_length(new.selection) not between 1 and 51 then raise exception 'Select one service and up to 50 extras';end if;
  for line in select value from jsonb_array_elements(new.selection) loop
   line_no:=line_no+1;
   if jsonb_typeof(line)<>'object' or coalesce(line->>'quantity','')!~'^[1-9][0-9]{0,5}$' then raise exception 'Use positive whole-number quantities';end if;
   qty:=(line->>'quantity')::integer;
   select * into item from public.business_catalogue where id=(line->>'catalogue_id')::uuid and business_id=new.business_id and is_active;
   if not found or (line_no=1 and item.kind<>'service') or (line_no>1 and item.kind<>'extra') then raise exception 'Select an active business service and valid extras';end if;
   if item.id=any(seen) then raise exception 'Duplicate catalogue item';end if;seen:=array_append(seen,item.id);
   if item.pricing_model='fixed' and qty<>1 then raise exception 'Fixed prices require quantity one';end if;
   if line_no=1 then new.required_team_size:=item.team_size;end if;
   total:=total+item.price_cents::bigint*qty;
   if total>2147483647 then raise exception 'Booking amount exceeds supported limit';end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('catalogue_id',item.id,'version',item.version,'name',item.name,'kind',item.kind,'pricing_model',item.pricing_model,'unit_label',item.unit_label,'rate_cents',item.price_cents,'quantity',qty,'total_cents',item.price_cents::bigint*qty));
  end loop;
  new.price_lines:=lines;new.total_cents:=total;new.currency:='ZAR';
  -- Exclude private office notes from the immutable job contact snapshot.
  new.customer_snapshot:=jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone);
  new.address_snapshot:=jsonb_build_object('label',a.label,'address_line',a.address_line,'suburb',a.suburb,'city',a.city,'postal_code',a.postal_code,'access_notes',a.access_notes);
  new.time_zone:=ctx->>'time_zone';new.status:='draft';new.assigned_staff:='{}';new.version:=1;new.created_at:=now();
  new.request_payload:=jsonb_build_object('customer_id',new.customer_id,'address_id',new.address_id,'local_start',new.local_start,'duration_minutes',new.duration_minutes,'selection',new.selection,'hours_override_reason',new.hours_override_reason);
 return new;
end;
$builder$;
revoke all on function audit.build_booking_snapshot(public.one_off_bookings) from public,anon,authenticated;
grant execute on function audit.build_booking_snapshot(public.one_off_bookings) to authenticated;

create function audit.complete_cleaning_snapshot(p_booking public.one_off_bookings) returns public.one_off_bookings language plpgsql security invoker set search_path='' as $builder$
declare new public.one_off_bookings:=p_booking;total numeric;
begin
 perform public.booking_context(new.business_id);
 if new.cleaning_snapshot is not null then
  total:=new.total_cents::numeric+(new.cleaning_snapshot->>'adjustment_cents')::numeric;
  if total>2147483647 then raise exception 'Booking amount exceeds supported limit';end if;
  new.total_cents:=total;new.price_lines:=new.price_lines||(new.cleaning_snapshot->'lines');
  new.request_payload:=new.request_payload||jsonb_build_object('cleaning_scope',new.cleaning_scope);
 end if;
 return new;
end;
$builder$;
revoke all on function audit.complete_cleaning_snapshot(public.one_off_bookings) from public,anon,authenticated;
grant execute on function audit.complete_cleaning_snapshot(public.one_off_bookings) to authenticated;

create or replace function audit.prepare_cleaning_booking() returns trigger language plpgsql security invoker set search_path='' as $scope$
begin
 if tg_op='UPDATE' then
  if new.cleaning_scope is distinct from old.cleaning_scope or new.cleaning_snapshot is distinct from old.cleaning_snapshot then raise exception 'Cleaning scope and snapshots are immutable';end if;
  return new;
 end if;
 new:=audit.build_cleaning_snapshot(new);return new;
end;$scope$;
create or replace function audit.validate_booking() returns trigger language plpgsql security invoker set search_path='' as $booking$
declare ctx jsonb;c public.business_customers;a public.customer_addresses;item public.business_catalogue;line jsonb;lines jsonb:='[]';qty integer;total bigint:=0;line_no integer:=0;seen uuid[]:='{}';uid uuid;local_end timestamp;
begin
 ctx:=public.booking_context(new.business_id);
 if tg_op='INSERT' then
  new:=audit.build_booking_snapshot(new);
 else
  if new.id<>old.id or new.business_id<>old.business_id or new.request_key<>old.request_key or new.customer_id<>old.customer_id or new.address_id<>old.address_id or new.selection<>old.selection or new.price_lines<>old.price_lines or new.total_cents<>old.total_cents or new.currency<>old.currency or new.customer_snapshot<>old.customer_snapshot or new.address_snapshot<>old.address_snapshot or new.required_team_size<>old.required_team_size or new.time_zone<>old.time_zone or new.created_at<>old.created_at or new.request_payload<>old.request_payload then raise exception 'Booking identity and snapshots are immutable';end if;
  if old.status in ('completed','cancelled') then raise exception 'Completed and cancelled bookings cannot be changed';end if;
  if new.status<>old.status and not (
   (old.status='draft' and new.status in ('confirmed','cancelled')) or
   (old.status='confirmed' and new.status in ('assigned','cancelled')) or
   (old.status='assigned' and new.status in ('en_route','cancelled')) or
   (old.status='en_route' and new.status in ('arrived','cancelled')) or
   (old.status='arrived' and new.status in ('in_progress','cancelled')) or
   (old.status='in_progress' and new.status='completed')) then raise exception 'Invalid booking transition';end if;
  if (new.local_start<>old.local_start or new.duration_minutes<>old.duration_minutes) and (old.status not in ('draft','confirmed','assigned','en_route','arrived') or new.status<>old.status or length(trim(new.change_reason))=0) then raise exception 'Rescheduling requires a pre-start booking and reason';end if;
  if new.assigned_staff<>old.assigned_staff and (old.status not in ('confirmed','assigned') or length(trim(new.change_reason))=0) then raise exception 'Assignment changes require a confirmed or assigned booking and reason';end if;
  if new.status='cancelled' and length(trim(new.change_reason))=0 then raise exception 'Cancellation reason required';end if;
  new.version:=old.version+1;
 end if;
 if new.assigned_staff is null or cardinality(new.assigned_staff)>100 or array_position(new.assigned_staff,null) is not null or cardinality(new.assigned_staff)<>(select count(distinct x) from unnest(new.assigned_staff) x) then raise exception 'Invalid staff assignment';end if;
 -- Check assignee membership at assignment and each operational transition.
 if tg_op='INSERT' or new.assigned_staff<>old.assigned_staff or (new.status<>old.status and new.status<>'cancelled') then
  foreach uid in array new.assigned_staff loop
   if not exists(select 1 from jsonb_array_elements(ctx->'staff') x where x.value->>'user_id'=uid::text) then raise exception 'Assignee must be active staff in this business';end if;
  end loop;
 end if;
 if new.status in ('assigned','en_route','arrived','in_progress','completed') and cardinality(new.assigned_staff)<new.required_team_size then raise exception 'Assign the required service team before proceeding';end if;
 if new.status in ('draft','confirmed') and cardinality(new.assigned_staff)>0 then raise exception 'Set Assigned status when assigning the team';end if;
 new.starts_at:=new.local_start at time zone new.time_zone;
 new.ends_at:=new.starts_at+make_interval(mins=>new.duration_minutes);
 if not isfinite(new.local_start) then raise exception 'Enter a finite booking date';end if;
 local_end:=new.local_start+make_interval(mins=>new.duration_minutes);
 if tg_op='INSERT' or new.local_start<>old.local_start or new.duration_minutes<>old.duration_minutes or new.hours_override_reason<>old.hours_override_reason then
  if (not (ctx->'working_days' @> to_jsonb(array[extract(dow from new.local_start)::integer])) or new.local_start::time<(ctx->>'opens_at')::time or local_end::date<>new.local_start::date or local_end::time>(ctx->>'closes_at')::time) and length(trim(new.hours_override_reason))=0 then raise exception 'Outside business working hours: enter an override reason';end if;
 end if;
 new.updated_at:=now();return new;
end;
$booking$;
create or replace function audit.finish_cleaning_booking() returns trigger language plpgsql security invoker set search_path='' as $finish$
begin new:=audit.complete_cleaning_snapshot(new);return new;end;
$finish$;

alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams','recurring_schedules','business_quotes','quote_invoice_handoffs'));

create table public.business_quotes(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_key uuid not null,
 customer_id uuid not null,
 address_id uuid not null,
 agreement jsonb not null check(jsonb_typeof(agreement)='object'),
 request_payload jsonb not null,
 status text not null default 'draft' check(status in ('draft','issued','accepted','declined','cancelled','converted')),
 acceptance_reference text not null default '' check(length(acceptance_reference)<=2000),
 accepted_by uuid,
 accepted_at timestamptz,
 change_reason text not null default '' check(length(change_reason)<=2000),
 converted_booking_id uuid,
 conversion_payload jsonb,
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,id),unique(business_id,request_key),
 foreign key(business_id,customer_id) references public.business_customers(business_id,id) on delete restrict,
 foreign key(business_id,customer_id,address_id) references public.customer_addresses(business_id,customer_id,id) on delete restrict,
 check((status='converted')=(converted_booking_id is not null) and (converted_booking_id is null)=(conversion_payload is null)),
 check((accepted_by is null)=(accepted_at is null) and (accepted_by is null)=(acceptance_reference='')),
 check(status not in ('accepted','converted') or accepted_by is not null)
);
create index quotes_business_created on public.business_quotes(business_id,created_at desc,id);
create index quotes_customer_address on public.business_quotes(business_id,customer_id,address_id);
alter table public.business_quotes enable row level security;
revoke all on public.business_quotes from public,anon,authenticated;
grant select on public.business_quotes to authenticated;
create policy office_quotes_read on public.business_quotes for select to authenticated using(
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_quotes.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'));

alter table public.one_off_bookings
 add column source_quote_id uuid,
 add constraint booking_source_quote_fk foreign key(business_id,source_quote_id) references public.business_quotes(business_id,id) on delete restrict,
 add constraint booking_quote_unique unique(source_quote_id),
 add constraint booking_business_id_unique unique(business_id,id),
 add constraint booking_quote_link_unique unique(business_id,source_quote_id,id),
 add constraint booking_source_exclusive check(source_quote_id is null or recurring_schedule_id is null);
alter table public.business_quotes add constraint quote_converted_booking_fk foreign key(business_id,id,converted_booking_id) references public.one_off_bookings(business_id,source_quote_id,id) on delete restrict;
create index quotes_booking_link on public.business_quotes(business_id,id,converted_booking_id);

-- A handoff is an immutable readiness record, not an invoice identity or payment.
create table public.quote_invoice_handoffs(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 quote_id uuid not null,
 booking_id uuid not null,
 created_at timestamptz not null default now(),
 unique(business_id,quote_id),unique(booking_id),
 foreign key(business_id,quote_id) references public.business_quotes(business_id,id) on delete restrict,
 foreign key(business_id,quote_id,booking_id) references public.one_off_bookings(business_id,source_quote_id,id) on delete restrict
);
create index handoffs_booking_link on public.quote_invoice_handoffs(business_id,quote_id,booking_id);
alter table public.quote_invoice_handoffs enable row level security;
revoke all on public.quote_invoice_handoffs from public,anon,authenticated;
grant select on public.quote_invoice_handoffs to authenticated;
create policy office_handoffs_read on public.quote_invoice_handoffs for select to authenticated using(
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=quote_invoice_handoffs.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'));

create function audit.quote_access(p_business uuid) returns void language plpgsql stable security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business and m.user_id=auth.uid() and m.role in ('owner','manager') and m.status='active' and b.status='active') then raise exception 'Quote access denied' using errcode='42501';end if;
end;$fn$;
revoke all on function audit.quote_access(uuid) from public,anon,authenticated;

create function audit.validate_quote() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 perform audit.quote_access(new.business_id);
 if tg_op='INSERT' then
  new.status:='draft';new.acceptance_reference:='';new.accepted_by:=null;new.accepted_at:=null;new.converted_booking_id:=null;new.conversion_payload:=null;new.change_reason:='';new.version:=1;new.created_at:=now();
 else
  if (to_jsonb(new)-array['status','acceptance_reference','accepted_by','accepted_at','change_reason','converted_booking_id','conversion_payload','version','updated_at']) is distinct from (to_jsonb(old)-array['status','acceptance_reference','accepted_by','accepted_at','change_reason','converted_booking_id','conversion_payload','version','updated_at']) then raise exception 'Quote identity and agreement are immutable';end if;
  if not ((old.status='draft' and new.status in ('issued','cancelled')) or (old.status='issued' and new.status in ('accepted','declined','cancelled')) or (old.status='accepted' and new.status in ('converted','cancelled'))) then raise exception 'Invalid quote transition';end if;
  if new.status in ('declined','cancelled') and length(trim(new.change_reason))=0 then raise exception 'Enter a reason';end if;
  if new.status='accepted' then
   if length(trim(new.acceptance_reference))=0 then raise exception 'Record customer acceptance evidence';end if;
   new.acceptance_reference:=trim(new.acceptance_reference);new.accepted_by:=auth.uid();new.accepted_at:=now();
  elsif new.acceptance_reference is distinct from old.acceptance_reference or new.accepted_by is distinct from old.accepted_by or new.accepted_at is distinct from old.accepted_at then raise exception 'Acceptance evidence is immutable';end if;
  if new.status='converted' then
   if not exists(select 1 from public.quote_invoice_handoffs h where h.business_id=new.business_id and h.quote_id=new.id and h.booking_id=new.converted_booking_id) then raise exception 'Conversion requires a booking and invoice handoff';end if;
  elsif new.converted_booking_id is distinct from old.converted_booking_id or new.conversion_payload is distinct from old.conversion_payload then raise exception 'Conversion identity is immutable';end if;
  new.version:=old.version+1;
 end if;
 new.updated_at:=now();return new;
end;$fn$;
revoke all on function audit.validate_quote() from public,anon,authenticated;
create trigger validate_quote before insert or update on public.business_quotes for each row execute function audit.validate_quote();

create function audit.capture_quote_change() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_table_schema<>'public' or tg_table_name not in ('business_quotes','quote_invoice_handoffs') then raise exception 'Unsupported audit source';end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),tg_table_name,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end;$fn$;
revoke all on function audit.capture_quote_change() from public,anon,authenticated;
create trigger audit_quotes after insert or update on public.business_quotes for each row execute function audit.capture_quote_change();
create trigger audit_quote_handoffs after insert on public.quote_invoice_handoffs for each row execute function audit.capture_quote_change();

create function audit.prepare_quote_booking() returns trigger language plpgsql security definer set search_path='' as $fn$
declare q public.business_quotes;a jsonb;ctx jsonb;local_end timestamp;
begin
 if tg_op='UPDATE' then
  if new.source_quote_id is distinct from old.source_quote_id then raise exception 'Source quote identity is immutable';end if;return new;
 end if;
 if new.source_quote_id is null then return new;end if;
 perform audit.quote_access(new.business_id);
 if new.recurring_schedule_id is not null then raise exception 'A booking cannot combine quote and recurring sources';end if;
 select * into q from public.business_quotes where id=new.source_quote_id and business_id=new.business_id for update;
 if not found then raise exception 'Quote unavailable' using errcode='42501';end if;
 perform audit.quote_access(new.business_id);
 if q.status<>'accepted' then raise exception 'Only an accepted, unconverted quote can create a booking' using errcode='40001';end if;
 a:=q.agreement;
 new.customer_id:=q.customer_id;new.address_id:=q.address_id;
 perform 1 from public.business_customers where id=q.customer_id and business_id=q.business_id and is_active for share;
 if not found then raise exception 'Quote customer must still be active';end if;
 perform 1 from public.customer_addresses where id=q.address_id and customer_id=q.customer_id and business_id=q.business_id and is_active for share;
 if not found then raise exception 'Quote address must still be active';end if;
 if new.local_start is null or not isfinite(new.local_start) then raise exception 'Enter a finite booking date';end if;
 new.request_key:=gen_random_uuid();new.time_zone:=a->>'time_zone';new.duration_minutes:=(a->>'duration_minutes')::int;
 new.customer_snapshot:=a->'customer_snapshot';new.address_snapshot:=a->'address_snapshot';new.selection:=a->'selection';new.price_lines:=a->'price_lines';new.total_cents:=(a->>'total_cents')::int;new.currency:=a->>'currency';new.required_team_size:=(a->>'required_team_size')::int;
 new.cleaning_scope:=nullif(a->'cleaning_scope','null'::jsonb);new.cleaning_snapshot:=nullif(a->'cleaning_snapshot','null'::jsonb);
 new.hours_override_reason:=trim(coalesce(new.hours_override_reason,''));new.assigned_staff:='{}';new.status:='draft';new.version:=1;new.created_at:=now();new.updated_at:=now();new.change_reason:='Created from accepted quote';
 new.starts_at:=new.local_start at time zone new.time_zone;new.ends_at:=new.starts_at+make_interval(mins=>new.duration_minutes);
 new.request_payload:=jsonb_build_object('source_quote_id',q.id,'local_start',new.local_start,'hours_override_reason',new.hours_override_reason);
 ctx:=public.booking_context(new.business_id);local_end:=new.local_start+make_interval(mins=>new.duration_minutes);
 if (not (ctx->'working_days' @> to_jsonb(array[extract(dow from new.local_start)::integer])) or new.local_start::time<(ctx->>'opens_at')::time or local_end::date<>new.local_start::date or local_end::time>(ctx->>'closes_at')::time) and length(new.hours_override_reason)=0 then raise exception 'Outside business working hours: enter an override reason';end if;
 return new;
end;$fn$;
revoke all on function audit.prepare_quote_booking() from public,anon,authenticated;
create trigger a_quote_booking before insert or update on public.one_off_bookings for each row execute function audit.prepare_quote_booking();

-- Quote and recurring sources are separate. Existing update/lifecycle triggers stay.
drop trigger validate_booking on public.one_off_bookings;
create trigger validate_booking before insert on public.one_off_bookings for each row when(new.recurring_schedule_id is null and new.source_quote_id is null) execute function audit.validate_booking();
drop trigger prepare_cleaning_booking on public.one_off_bookings;
create trigger prepare_cleaning_booking before insert on public.one_off_bookings for each row when(new.recurring_schedule_id is null and new.source_quote_id is null) execute function audit.prepare_cleaning_booking();
drop trigger zz_finish_cleaning_booking on public.one_off_bookings;
create trigger zz_finish_cleaning_booking before insert on public.one_off_bookings for each row when(new.recurring_schedule_id is null and new.source_quote_id is null) execute function audit.finish_cleaning_booking();

-- This also completes supported direct Data API inserts. No spoofable client flag.
create function audit.finish_quote_booking() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.source_quote_id is null then return new;end if;
 perform audit.quote_access(new.business_id);
 insert into public.quote_invoice_handoffs(business_id,quote_id,booking_id) values(new.business_id,new.source_quote_id,new.id);
 update public.business_quotes set status='converted',converted_booking_id=new.id,conversion_payload=jsonb_build_object('local_start',new.local_start,'hours_override_reason',new.hours_override_reason),change_reason='Converted to draft booking'
 where id=new.source_quote_id and business_id=new.business_id and status='accepted';
 if not found then raise exception 'Quote changed during conversion' using errcode='40001';end if;
 return new;
end;$fn$;
revoke all on function audit.finish_quote_booking() from public,anon,authenticated;
create trigger finish_quote_booking after insert on public.one_off_bookings for each row execute function audit.finish_quote_booking();

create function audit.create_quote(p_business_id uuid,p_request_key uuid,p_customer_id uuid,p_address_id uuid,p_selection jsonb,p_cleaning_scope jsonb,p_duration_minutes int) returns uuid language plpgsql security definer set search_path='' as $fn$
declare q public.business_quotes;b public.one_off_bookings;payload jsonb;agreement jsonb;
begin
 perform audit.quote_access(p_business_id);
 if p_request_key is null or p_customer_id is null or p_address_id is null or p_duration_minutes is null or p_duration_minutes not between 15 and 1440 or jsonb_typeof(p_selection) is distinct from 'array' or jsonb_array_length(p_selection) not between 1 and 51 then raise exception 'Select a customer, address, service and valid duration';end if;
 payload:=jsonb_build_object('customer_id',p_customer_id,'address_id',p_address_id,'selection',p_selection,'cleaning_scope',p_cleaning_scope,'duration_minutes',p_duration_minutes);
 perform pg_advisory_xact_lock(hashtextextended(p_business_id::text||':'||p_request_key::text,0));
 perform audit.quote_access(p_business_id);
 select * into q from public.business_quotes where business_id=p_business_id and request_key=p_request_key;
 if found then
  if q.request_payload is distinct from payload then raise exception 'Quote request reused with different details' using errcode='40001';end if;return q.id;
 end if;
 -- Keep contact/address and catalogue versions stable across calculation stages.
 perform 1 from public.business_customers where id=p_customer_id and business_id=p_business_id and is_active for share;
 if not found then raise exception 'Select an active customer in this business';end if;
 perform 1 from public.customer_addresses where id=p_address_id and customer_id=p_customer_id and business_id=p_business_id and is_active for share;
 if not found then raise exception 'Select an active address for this customer';end if;
 perform 1 from public.business_catalogue where business_id=p_business_id and id in(select (value->>'catalogue_id')::uuid from jsonb_array_elements(p_selection)) order by id for share;
 b.business_id:=p_business_id;b.customer_id:=p_customer_id;b.address_id:=p_address_id;b.selection:=p_selection;b.cleaning_scope:=p_cleaning_scope;b.duration_minutes:=p_duration_minutes;b.hours_override_reason:='';
 b:=audit.build_cleaning_snapshot(b);b:=audit.build_booking_snapshot(b);b:=audit.complete_cleaning_snapshot(b);
 agreement:=jsonb_build_object('customer_id',b.customer_id,'address_id',b.address_id,'customer_snapshot',b.customer_snapshot,'address_snapshot',b.address_snapshot,'selection',b.selection,'price_lines',b.price_lines,'total_cents',b.total_cents,'currency',b.currency,'duration_minutes',b.duration_minutes,'required_team_size',b.required_team_size,'time_zone',b.time_zone,'cleaning_scope',b.cleaning_scope,'cleaning_snapshot',b.cleaning_snapshot);
 insert into public.business_quotes(business_id,request_key,customer_id,address_id,agreement,request_payload) values(p_business_id,p_request_key,p_customer_id,p_address_id,agreement,payload) returning id into q.id;
 return q.id;
end;$fn$;
revoke all on function audit.create_quote(uuid,uuid,uuid,uuid,jsonb,jsonb,int) from public,anon,authenticated;
grant execute on function audit.create_quote(uuid,uuid,uuid,uuid,jsonb,jsonb,int) to authenticated;
create function public.create_quote(p_business_id uuid,p_request_key uuid,p_customer_id uuid,p_address_id uuid,p_selection jsonb,p_cleaning_scope jsonb,p_duration_minutes int) returns uuid language sql security invoker set search_path='' as $fn$select audit.create_quote(p_business_id,p_request_key,p_customer_id,p_address_id,p_selection,p_cleaning_scope,p_duration_minutes)$fn$;
revoke all on function public.create_quote(uuid,uuid,uuid,uuid,jsonb,jsonb,int) from public,anon,authenticated;
grant execute on function public.create_quote(uuid,uuid,uuid,uuid,jsonb,jsonb,int) to authenticated;

create function audit.change_quote(p_business_id uuid,p_quote_id uuid,p_version int,p_status text,p_reference text) returns uuid language plpgsql security definer set search_path='' as $fn$
declare q public.business_quotes;
begin
 perform audit.quote_access(p_business_id);
 select * into q from public.business_quotes where id=p_quote_id and business_id=p_business_id for update;
 if not found then raise exception 'Quote unavailable' using errcode='42501';end if;
 perform audit.quote_access(p_business_id);
 if p_version is null or p_version<>q.version then raise exception 'Quote changed. Reopen it before saving' using errcode='40001';end if;
 if p_status is null or p_status not in ('issued','accepted','declined','cancelled') or p_reference is null or length(p_reference)>2000 then raise exception 'Choose a quote action and check its evidence/reason';end if;
 update public.business_quotes set status=p_status,acceptance_reference=case when p_status='accepted' then trim(p_reference) else acceptance_reference end,change_reason=trim(p_reference) where id=q.id;
 return q.id;
end;$fn$;
revoke all on function audit.change_quote(uuid,uuid,int,text,text) from public,anon,authenticated;
grant execute on function audit.change_quote(uuid,uuid,int,text,text) to authenticated;
create function public.change_quote(p_business_id uuid,p_quote_id uuid,p_version int,p_status text,p_reference text) returns uuid language sql security invoker set search_path='' as $fn$select audit.change_quote(p_business_id,p_quote_id,p_version,p_status,p_reference)$fn$;
revoke all on function public.change_quote(uuid,uuid,int,text,text) from public,anon,authenticated;
grant execute on function public.change_quote(uuid,uuid,int,text,text) to authenticated;

create function audit.convert_quote(p_business_id uuid,p_quote_id uuid,p_version int,p_local_start timestamp,p_hours_override_reason text) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare q public.business_quotes;booking uuid;handoff uuid;payload jsonb;
begin
 perform audit.quote_access(p_business_id);
 select * into q from public.business_quotes where id=p_quote_id and business_id=p_business_id for update;
 if not found then raise exception 'Quote unavailable' using errcode='42501';end if;
 perform audit.quote_access(p_business_id);
 if p_local_start is null or not isfinite(p_local_start) or length(coalesce(p_hours_override_reason,''))>2000 then raise exception 'Enter a valid booking date and override reason';end if;
 payload:=jsonb_build_object('local_start',p_local_start,'hours_override_reason',trim(coalesce(p_hours_override_reason,'')));
 if q.status='converted' then
  if q.conversion_payload is distinct from payload then raise exception 'Quote was already converted with different details' using errcode='40001';end if;
  booking:=q.converted_booking_id;
 else
  if q.status<>'accepted' then raise exception 'Only an accepted quote can be converted';end if;
  if p_version is null or p_version<>q.version then raise exception 'Quote changed. Reopen it before converting' using errcode='40001';end if;
  insert into public.one_off_bookings(business_id,source_quote_id,local_start,hours_override_reason) values(p_business_id,q.id,p_local_start,trim(coalesce(p_hours_override_reason,''))) returning id into booking;
 end if;
 select h.id into handoff from public.quote_invoice_handoffs h where h.business_id=p_business_id and h.quote_id=q.id and h.booking_id=booking;
 if handoff is null then raise exception 'Conversion is incomplete';end if;
 return jsonb_build_object('booking_id',booking,'handoff_id',handoff);
end;$fn$;
revoke all on function audit.convert_quote(uuid,uuid,int,timestamp,text) from public,anon,authenticated;
grant execute on function audit.convert_quote(uuid,uuid,int,timestamp,text) to authenticated;
create function public.convert_quote(p_business_id uuid,p_quote_id uuid,p_version int,p_local_start timestamp,p_hours_override_reason text) returns jsonb language sql security invoker set search_path='' as $fn$select audit.convert_quote(p_business_id,p_quote_id,p_version,p_local_start,p_hours_override_reason)$fn$;
revoke all on function public.convert_quote(uuid,uuid,int,timestamp,text) from public,anon,authenticated;
grant execute on function public.convert_quote(uuid,uuid,int,timestamp,text) to authenticated;

commit;
