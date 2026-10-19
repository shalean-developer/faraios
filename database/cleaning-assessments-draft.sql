-- Office assessments are immutable booking inputs. No business rates are seeded by this migration.
begin;
create or replace function audit.cleaning_definitions() returns jsonb language sql immutable security invoker set search_path='' as $defs$select '{"definitions":{"property_type":{"label":"Property type","options":["House","Apartment","Townhouse"]},"bedrooms":{"label":"Bedrooms","count":true},"bathrooms":{"label":"Bathrooms","count":true},"extra_rooms":{"label":"Extra rooms","count":true},"pets":{"label":"Pets","custom":true},"last_cleaned":{"label":"Last professionally cleaned","options":["Never / unsure","6+ months","3–6 months","1–3 months"]},"move_type":{"label":"Moving service","options":["Move-in","Move-out"]},"furnishing":{"label":"Property furnishing","options":["Furnished","Empty"]},"linen_change":{"label":"Change linen?","options":["No","Yes"]},"linen":{"label":"Linen","options":["Fresh linen available","No linen change"]},"access_method":{"label":"Key / access method","options":["Lockbox","Smart lock / code","Meet in person","Managed by agent"]},"office_size":{"label":"Office size","options":["Small: 1–5 desks","Medium: 6–20 desks","Large: 21–50 desks","Enterprise: 50+ desks"]},"carpet_rooms":{"label":"Carpeted rooms","count":true},"rugs":{"label":"Rugs","count":true},"carpet_type":{"label":"Carpet type","options":["Standard pile","Thick / shag pile","Berber / loop","Persian / delicate"]},"stains":{"label":"Visible stains","options":["No","Yes"]}},"profileFields":{"regular":["property_type","bedrooms","bathrooms","extra_rooms","pets"],"deep":["property_type","bedrooms","bathrooms","extra_rooms","last_cleaned","pets"],"moving":["property_type","bedrooms","bathrooms","extra_rooms","move_type","furnishing","pets"],"airbnb":["property_type","bedrooms","bathrooms","extra_rooms","linen","linen_change","access_method"],"office":["office_size","bathrooms"],"carpet":["property_type","carpet_rooms","rugs","carpet_type","stains"]}}'::jsonb$defs$;
create or replace function audit.validate_cleaning_config() returns trigger language plpgsql security invoker set search_path='' as $config$
declare defs jsonb:=audit.cleaning_definitions();k text;opt text;r jsonb;e jsonb;x text;v text;
begin
 if new.cleaning_config is null then return new;end if;
 if new.cleaning_profile is null or jsonb_typeof(new.cleaning_config)<>'object' then raise exception 'Choose a cleaning profile';end if;
 if jsonb_typeof(new.cleaning_config->'base_minutes') is distinct from 'number' or coalesce(new.cleaning_config->>'base_minutes','')!~'^[0-9]{1,4}$' or (new.cleaning_config->>'base_minutes')::int>1440 then raise exception 'Configure base duration';end if;
 if jsonb_typeof(new.cleaning_config->'service_fee_cents') is distinct from 'number' or coalesce(new.cleaning_config->>'service_fee_cents','')!~'^[0-9]{1,10}$' or (new.cleaning_config->>'service_fee_cents')::numeric>2147483647 then raise exception 'Configure explicit service fee';end if;
 if new.cleaning_config ? 'manual_duration' and jsonb_typeof(new.cleaning_config->'manual_duration') is distinct from 'boolean' then raise exception 'Invalid manual duration setting';end if;
 for k in select jsonb_array_elements_text(defs->'profileFields'->new.cleaning_profile) loop
  if k='pets' and (jsonb_typeof(new.cleaning_config->'rules'->k) is distinct from 'object' or (select count(*) from jsonb_object_keys(new.cleaning_config->'rules'->k)) not between 1 and 20) then raise exception 'Configure service-specific pet choices';end if;
  for opt in select jsonb_array_elements_text(case when k='pets' then (select jsonb_agg(key) from jsonb_object_keys(new.cleaning_config->'rules'->k) key) when defs->'definitions'->k->>'count'='true' then '["unit"]'::jsonb else defs->'definitions'->k->'options' end) loop
   if length(trim(opt)) not between 1 and 60 or opt<>trim(opt) then raise exception 'Pet/option labels must contain 1–60 characters';end if;
   r:=new.cleaning_config->'rules'->k->opt;
   if r is null or jsonb_typeof(r)<>'object' or jsonb_typeof(r->'cents') is distinct from 'number' or jsonb_typeof(r->'minutes') is distinct from 'number' or coalesce(r->>'cents','')!~'^[0-9]{1,10}$' or (r->>'cents')::numeric>2147483647 or coalesce(r->>'minutes','')!~'^[0-9]{1,4}$' or (r->>'minutes')::int>1440 then raise exception 'Configure price and duration for every service option';end if;
   if r ? 'assessment' and jsonb_typeof(r->'assessment') is distinct from 'boolean' then raise exception 'Invalid assessment setting';end if;
  end loop;
 end loop;
 e:=new.cleaning_config->'equipment';
 if e is null or coalesce(e->>'policy','') not in ('included','customer','distance','assessed') then raise exception 'Configure equipment policy';end if;
 if e->>'policy'='distance' then
  if length(trim(coalesce(e->>'base',''))) not between 1 and 500 then raise exception 'Equipment base required';end if;
  foreach k in array array['base_cents','per_km_cents','minimum_cents','minutes'] loop
   v:=e->>k;if jsonb_typeof(e->k) is distinct from 'number' or coalesce(v,'')!~'^[0-9]{1,10}$' or v::numeric>(case when k='minutes' then 1440 else 2147483647 end) then raise exception 'Configure equipment rates and duration';end if;
  end loop;
 end if;
 if jsonb_typeof(new.cleaning_config->'extras') is distinct from 'array' or jsonb_array_length(new.cleaning_config->'extras')>50 then raise exception 'Configure allowed extras';end if;
 if (select count(*)<>count(distinct value) from jsonb_array_elements_text(new.cleaning_config->'extras')) then raise exception 'Duplicate allowed extra';end if;
 for x in select jsonb_array_elements_text(new.cleaning_config->'extras') loop
  if not exists(select 1 from public.business_catalogue where id=x::uuid and business_id=new.business_id and kind='extra' and is_active) then raise exception 'Allowed extra must be active in this business';end if;
  v:=new.cleaning_config->'extra_minutes'->>x;
  if jsonb_typeof(new.cleaning_config->'extra_minutes'->x) is distinct from 'number' or coalesce(v,'')!~'^[0-9]{1,4}$' or v::int>1440 then raise exception 'Configure each extra duration';end if;
 end loop;
 return new;
end;$config$;
create or replace function audit.prepare_cleaning_booking() returns trigger language plpgsql security invoker set search_path='' as $scope$
declare service public.business_catalogue;defs jsonb:=audit.cleaning_definitions();cfg jsonb;s jsonb;k text;v text;opt text;r jsonb;qty int;minutes bigint;amount numeric:=0;fee numeric:=0;lines jsonb:='[]';line jsonb;allowed text[];item public.business_catalogue;requires_assessment boolean:=false;assessment jsonb;ak text;
begin
 if tg_op='UPDATE' then
  if new.cleaning_scope is distinct from old.cleaning_scope or new.cleaning_snapshot is distinct from old.cleaning_snapshot then raise exception 'Cleaning scope and snapshots are immutable';end if;
  return new;
 end if;
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
 if cfg->'equipment'->>'policy'='distance' then allowed:=allowed||array['equipment','distance_km','distance_reason'];end if;
 allowed:=allowed||array['assessment'];
 if cfg->'equipment'->>'policy'='assessed' then allowed:=allowed||array['equipment_arrangement'];end if;
 if exists(select 1 from jsonb_object_keys(s) key where not key=any(allowed)) then raise exception 'Unexpected service scope field';end if;
 if not exists(select 1 from public.business_customers where id=new.customer_id and business_id=new.business_id and length(trim(phone))>0) then raise exception 'Save a contact phone on the selected customer before booking cleaning';end if;
 minutes:=(cfg->>'base_minutes')::int;
 amount:=(cfg->>'service_fee_cents')::numeric;
 lines:=jsonb_build_array(jsonb_build_object('name','Service fee','kind','fee','pricing_model','fixed','unit_label','visit','rate_cents',amount,'quantity',1,'total_cents',amount));
 for k in select jsonb_array_elements_text(defs->'profileFields'->service.cleaning_profile) loop
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
 new.cleaning_snapshot:=jsonb_build_object('profile',service.cleaning_profile,'version',service.version,'configuration',cfg,'duration_minutes',minutes,'adjustment_cents',amount,'lines',lines,'equipment_policy',cfg->'equipment'->>'policy','equipment_fee_cents',fee,'assessment_required',requires_assessment,'assessed_by',case when assessment is not null then auth.uid() else null end,'assessed_at',case when assessment is not null then now() else null end);
 return new;
end;$scope$;
commit;
