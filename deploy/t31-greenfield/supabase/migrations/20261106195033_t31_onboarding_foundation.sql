-- Generated T31 onboarding installation. New synthetic project only.
-- Target: qcmnxjilmsibxftfverd. Never use on original staging or a legacy system.
-- No historical records, accounts, recipients or operational defaults are seeded.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public')
 or exists(select 1 from pg_namespace where nspname in ('audit','private_t31'))
 or exists(select 1 from pg_roles where rolname in ('t31_bootstrap','t31_invite_worker'))
 then raise exception 'T31 requires an empty application target'; end if;
end $$;

-- Source: database/identity-draft.sql SHA256 278d9a9c9ea37c7b9e6ce102a5c95c586a9e95cd9ff754e11d31c53b6a9eb3ff
-- Local-tested schema draft. NOT a generated/applied Supabase migration.
-- Promotion requires Supabase CLI migration generation, advisors and staging verification.

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  industry text not null check (industry = 'cleaning'),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','staff')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);
create index business_memberships_user_business on public.business_memberships(user_id,business_id) where status='active';
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
revoke all on public.businesses, public.business_memberships from public, anon, authenticated;
grant select on public.businesses, public.business_memberships to authenticated;
create policy read_own_active_memberships on public.business_memberships for select to authenticated
  using (user_id=(select auth.uid()) and status='active');
create policy read_member_businesses on public.businesses for select to authenticated
  using (status='active' and exists (
    select 1 from public.business_memberships m
    where m.business_id=businesses.id and m.user_id=(select auth.uid()) and m.status='active'
  ));
-- No client write policies or write grants. Provisioning/invitations need a separate
-- owner-authorised audited server workflow; users cannot self-assign businesses/roles.


-- Source: database/audit-draft.sql SHA256 57d569899c1ba5e26219bac2a900c24a7dd3d3247404d618f544f289fd56058e
-- T11 audit foundation. Apply only to isolated FaraiOS staging after local validation.

create schema audit;
revoke all on schema audit from public, anon, authenticated;
grant usage on schema audit to authenticated;
create table audit.events (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 occurred_at timestamptz not null default clock_timestamp(),
 actor_user_id uuid,
 database_role text not null,
 transaction_id bigint not null default txid_current(),
 entity_table text not null check (entity_table in ('businesses','business_memberships')),
 operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
 old_record jsonb,
 new_record jsonb
);
create index audit_events_business_time on audit.events(business_id,occurred_at desc,id);
alter table audit.events enable row level security;
revoke all on audit.events from public, anon, authenticated;
grant select on audit.events to authenticated;
create policy owner_reads_business_audit on audit.events for select to authenticated using (
 exists (select 1 from public.business_memberships m where m.business_id=events.business_id
 and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active')
);
-- Invoker rights intentionally: administrative writes must have audit INSERT rights.
-- A future client-write workflow needs its own reviewed audit integration.
create function audit.capture_identity_change() returns trigger
language plpgsql security invoker set search_path='' as $audit$
declare v_old jsonb; v_new jsonb; v_business uuid;
begin
 if tg_table_schema <> 'public' or tg_table_name not in ('businesses','business_memberships') then
  raise exception 'Unsupported audit source';
 end if;
 if tg_op <> 'INSERT' then v_old:=to_jsonb(old); end if;
 if tg_op <> 'DELETE' then v_new:=to_jsonb(new); end if;
 if tg_op='UPDATE' and v_old=v_new then return new; end if;
 v_business:=case when tg_table_name='businesses' then coalesce(v_new->>'id',v_old->>'id')::uuid
 else coalesce(v_new->>'business_id',v_old->>'business_id')::uuid end;
 if tg_op='UPDATE' and ((tg_table_name='businesses' and v_old->>'id'<>v_new->>'id')
 or (tg_table_name='business_memberships' and (v_old->>'business_id'<>v_new->>'business_id' or v_old->>'user_id'<>v_new->>'user_id'))) then
  raise exception 'Audited identity keys are immutable';
 end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(v_business,auth.uid(),current_user,tg_table_name,tg_op,v_old,v_new);
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$audit$;
revoke all on function audit.capture_identity_change() from public,anon,authenticated;
create trigger audit_business_change after insert or update or delete on public.businesses
 for each row execute function audit.capture_identity_change();
create trigger audit_membership_change after insert or update or delete on public.business_memberships
 for each row execute function audit.capture_identity_change();
-- Retain events after record deletion: no cascading foreign key to business/user.
-- No mutation privileges or write policies for application roles.


-- Source: database/business-settings-draft.sql SHA256 36955064a31c628996334b9de45a86ecb2f3730a37b588f2a7d7e8989ae4e429
-- T12 first increment. Requires identity and audit foundations. No production deployment.

create table public.business_settings (
 business_id uuid primary key references public.businesses(id) on delete restrict,
 display_name text not null check(length(trim(display_name)) between 1 and 160),
 contact_email text not null default '' check(length(contact_email)<=254),
 contact_phone text not null default '' check(length(contact_phone)<=40),
 service_areas text[] not null default '{}' check(cardinality(service_areas)<=50),
 working_days smallint[] not null check(cardinality(working_days) between 1 and 7 and working_days <@ array[0,1,2,3,4,5,6]::smallint[]),
 opens_at time not null,
 closes_at time not null check(closes_at>opens_at),
 time_zone text not null check(time_zone in ('Africa/Johannesburg','UTC'))
);
alter table public.business_settings enable row level security;
revoke all on public.business_settings from public,anon,authenticated;
grant select,insert,update on public.business_settings to authenticated;
create policy owner_business_settings on public.business_settings for all to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_settings.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_settings.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings'));
-- Dedicated audit-only definer trigger. It does not modify source records, accept
-- parameters or expose a callable write API. Users cannot INSERT directly into audit.
-- Owner authorization stays in source-table RLS; this narrowly privileged bridge
-- makes source mutation and audit insertion atomic without arbitrary log-write grants.
create function audit.capture_settings_change() returns trigger language plpgsql security definer set search_path='' as $settings$
declare v_old jsonb; v_new jsonb;
begin
 if tg_table_schema<>'public' or tg_table_name<>'business_settings' then raise exception 'Unsupported audit source'; end if;
 if tg_op<>'INSERT' then v_old:=to_jsonb(old); end if;
 if tg_op<>'DELETE' then v_new:=to_jsonb(new); end if;
 if tg_op='UPDATE' and old.business_id<>new.business_id then raise exception 'Business scope is immutable'; end if;
 if tg_op='UPDATE' and v_old=v_new then return new; end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(coalesce((v_new->>'business_id')::uuid,(v_old->>'business_id')::uuid),auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),'business_settings',tg_op,v_old,v_new);
 if tg_op='DELETE' then return old; end if; return new;
end;
$settings$;
revoke all on function audit.capture_settings_change() from public,anon,authenticated;
create trigger audit_settings_change after insert or update or delete on public.business_settings for each row execute function audit.capture_settings_change();


-- Source: database/catalogue-draft.sql SHA256 89b553aa4041c3f22ec62ece9bc28e7c30c7f1aeb822faff9a41ff02e77e25e7
-- T12 catalogue. Depends on identity, audit and business-settings foundations.

create table public.business_catalogue (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 kind text not null check(kind in ('service','extra')),
 name text not null check(length(trim(name)) between 1 and 120),
 description text not null default '' check(length(description)<=2000),
 pricing_model text not null check(pricing_model in ('fixed','hourly','per_unit')),
 unit_label text not null check(length(trim(unit_label)) between 1 and 40),
 price_cents integer not null check(price_cents>=0),
 currency text not null check(currency='ZAR'),
 team_size smallint,
 is_active boolean not null default false,
 version integer not null default 1 check(version>0),
 check((kind='service' and team_size between 1 and 100 and team_size is not null) or (kind='extra' and team_size is null))
);
create index catalogue_business_name on public.business_catalogue(business_id,name,id);
alter table public.business_catalogue enable row level security;
revoke all on public.business_catalogue from public,anon,authenticated;
grant select,insert,update on public.business_catalogue to authenticated;
create policy catalogue_read on public.business_catalogue for select to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_catalogue.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'));
create policy catalogue_insert on public.business_catalogue for insert to authenticated with check(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_catalogue.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner' and b.status='active'));
create policy catalogue_update on public.business_catalogue for update to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_catalogue.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_catalogue.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner' and b.status='active'));
create function audit.catalogue_version() returns trigger language plpgsql security invoker set search_path='' as $version$
begin
 if new.id<>old.id or new.business_id<>old.business_id or new.kind<>old.kind then raise exception 'Catalogue identity is immutable'; end if;
 new.version:=old.version+1;return new;
end;
$version$;
revoke all on function audit.catalogue_version() from public,anon,authenticated;
create trigger catalogue_version before update on public.business_catalogue for each row execute function audit.catalogue_version();
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue'));
-- Audit-only definer bridge; no client role can call it directly or forge log rows.
create function audit.capture_catalogue_change() returns trigger language plpgsql security definer set search_path='' as $catalogue$
declare v_old jsonb;v_new jsonb;
begin
 if tg_table_schema<>'public' or tg_table_name<>'business_catalogue' then raise exception 'Unsupported audit source'; end if;
 if tg_op<>'INSERT' then v_old:=to_jsonb(old);end if;
 if tg_op<>'DELETE' then v_new:=to_jsonb(new);end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(coalesce((v_new->>'business_id')::uuid,(v_old->>'business_id')::uuid),auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),'business_catalogue',tg_op,v_old,v_new);
 if tg_op='DELETE' then return old;end if;return new;
end;
$catalogue$;
revoke all on function audit.capture_catalogue_change() from public,anon,authenticated;
create trigger audit_catalogue_change after insert or update or delete on public.business_catalogue for each row execute function audit.capture_catalogue_change();


-- Source: database/customers-draft.sql SHA256 ce745f2672344cc902bf0908401b6c1999c11248319e7b8ceb08306bd7d971bb
-- T13 business-owned customer records and multiple addresses. Staging only.

create table public.business_customers(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 name text not null check(length(trim(name)) between 1 and 160),
 email text not null default '' check(length(email)<=254),
 phone text not null default '' check(length(phone)<=40),
 private_notes text not null default '' check(length(private_notes)<=4000),
 is_active boolean not null default true,
 version integer not null default 1 check(version>0),
 unique(business_id,id)
);
create table public.customer_addresses(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 customer_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 80),
 address_line text not null check(length(trim(address_line)) between 1 and 300),
 suburb text not null default '' check(length(suburb)<=120),
 city text not null default '' check(length(city)<=120),
 postal_code text not null default '' check(length(postal_code)<=20),
 access_notes text not null default '' check(length(access_notes)<=2000),
 is_active boolean not null default true,
 version integer not null default 1 check(version>0),
 foreign key(business_id,customer_id) references public.business_customers(business_id,id) on delete restrict
);
create index customers_business_name on public.business_customers(business_id,name,id);
create index addresses_business_customer on public.customer_addresses(business_id,customer_id,id);
alter table public.business_customers enable row level security;
alter table public.customer_addresses enable row level security;
revoke all on public.business_customers,public.customer_addresses from public,anon,authenticated;
grant select,insert,update on public.business_customers,public.customer_addresses to authenticated;
create policy customer_office_access on public.business_customers for all to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_customers.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_customers.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'));
create policy address_office_access on public.customer_addresses for all to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=customer_addresses.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=customer_addresses.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'));
create function audit.customer_version() returns trigger language plpgsql security invoker set search_path='' as $v$
begin
 if new.id<>old.id or new.business_id<>old.business_id then raise exception 'Customer identity is immutable'; end if;
 if tg_table_name='customer_addresses' and to_jsonb(new)->>'customer_id'<>to_jsonb(old)->>'customer_id' then raise exception 'Address customer is immutable'; end if;
 new.version:=old.version+1;return new;
end;$v$;
revoke all on function audit.customer_version() from public,anon,authenticated;
create trigger customer_version before update on public.business_customers for each row execute function audit.customer_version();
create trigger address_version before update on public.customer_addresses for each row execute function audit.customer_version();
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses'));
-- Internal audit-only bridge. Source writes still require office-role RLS.
create function audit.capture_customer_change() returns trigger language plpgsql security definer set search_path='' as $a$
declare v_old jsonb;v_new jsonb;
begin
 if tg_table_schema<>'public' or tg_table_name not in ('business_customers','customer_addresses') then raise exception 'Unsupported audit source';end if;
 if tg_op<>'INSERT' then v_old:=to_jsonb(old);end if;
 if tg_op<>'DELETE' then v_new:=to_jsonb(new);end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(coalesce((v_new->>'business_id')::uuid,(v_old->>'business_id')::uuid),auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),tg_table_name,tg_op,v_old,v_new);
 if tg_op='DELETE' then return old;end if;return new;
end;$a$;
revoke all on function audit.capture_customer_change() from public,anon,authenticated;
create trigger audit_customer_change after insert or update or delete on public.business_customers for each row execute function audit.capture_customer_change();
create trigger audit_address_change after insert or update or delete on public.customer_addresses for each row execute function audit.capture_customer_change();


-- Source: database/bookings-draft.sql SHA256 b5816f43c0d627c2f54fa4d6d43e6907ce28e4ed86979002f4d1517d688e6273
-- T14 approved office lifecycle, including En route and Arrived. Staging only.

alter table public.business_catalogue add constraint catalogue_business_id_unique unique(business_id,id);
alter table public.customer_addresses add constraint address_parent_id_unique unique(business_id,customer_id,id);
-- Narrow read bridge for office scheduling. It exposes no contact/settings secrets.
create function audit.booking_context(p_business_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $ctx$
declare result jsonb;
begin
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','manager') and b.status='active') then raise exception 'Booking access denied' using errcode='42501';end if;
 select jsonb_build_object('time_zone',s.time_zone,'working_days',s.working_days,'opens_at',s.opens_at,'closes_at',s.closes_at,'staff',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'label',coalesce(u.email,'Staff account')) order by m.user_id) from public.business_memberships m join auth.users u on u.id=m.user_id where m.business_id=p_business_id and m.role='staff' and m.status='active'),'[]'::jsonb)) into result from public.business_settings s where s.business_id=p_business_id;
 if result is null then raise exception 'Configure business working hours before booking';end if;return result;
end;$ctx$;
revoke all on function audit.booking_context(uuid) from public,anon,authenticated;
grant execute on function audit.booking_context(uuid) to authenticated;
create function public.booking_context(p_business_id uuid) returns jsonb language sql stable security invoker set search_path='' as $wrapper$select audit.booking_context(p_business_id)$wrapper$;
revoke all on function public.booking_context(uuid) from public,anon,authenticated;
grant execute on function public.booking_context(uuid) to authenticated;
create table public.one_off_bookings(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 request_key uuid not null,
 customer_id uuid not null,
 address_id uuid not null,
 local_start timestamp not null,
 duration_minutes integer not null check(duration_minutes between 15 and 1440),
 time_zone text not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 selection jsonb not null,
 customer_snapshot jsonb not null,
 address_snapshot jsonb not null,
 price_lines jsonb not null,
 total_cents integer not null check(total_cents>=0),
 currency text not null check(currency='ZAR'),
 required_team_size integer not null check(required_team_size between 1 and 100),
 assigned_staff uuid[] not null default '{}',
 status text not null default 'draft' check(status in ('draft','confirmed','assigned','en_route','arrived','in_progress','completed','cancelled')),
 change_reason text not null default '' check(length(change_reason)<=2000),
 hours_override_reason text not null default '' check(length(hours_override_reason)<=2000),
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 request_payload jsonb not null,
 unique(business_id,request_key),
 foreign key(business_id,customer_id) references public.business_customers(business_id,id) on delete restrict,
 foreign key(business_id,customer_id,address_id) references public.customer_addresses(business_id,customer_id,id) on delete restrict
);
create index bookings_business_start on public.one_off_bookings(business_id,starts_at,id);
alter table public.one_off_bookings enable row level security;
revoke all on public.one_off_bookings from public,anon,authenticated;
grant select,insert,update on public.one_off_bookings to authenticated;
create policy office_bookings on public.one_off_bookings for all to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=one_off_bookings.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=one_off_bookings.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'));
create function audit.validate_booking() returns trigger language plpgsql security invoker set search_path='' as $booking$
declare ctx jsonb;c public.business_customers;a public.customer_addresses;item public.business_catalogue;line jsonb;lines jsonb:='[]';qty integer;total bigint:=0;line_no integer:=0;seen uuid[]:='{}';uid uuid;local_end timestamp;
begin
 ctx:=public.booking_context(new.business_id);
 if tg_op='INSERT' then
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
end;$booking$;
revoke all on function audit.validate_booking() from public,anon,authenticated;
create trigger validate_booking before insert or update on public.one_off_bookings for each row execute function audit.validate_booking();
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings'));
create function audit.capture_booking_change() returns trigger language plpgsql security definer set search_path='' as $audit$
begin
 if tg_table_schema<>'public' or tg_table_name<>'one_off_bookings' then raise exception 'Unsupported audit source';end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),'one_off_bookings',tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end;$audit$;
revoke all on function audit.capture_booking_change() from public,anon,authenticated;
create trigger audit_booking_change after insert or update on public.one_off_bookings for each row execute function audit.capture_booking_change();


-- Source: database/cleaning-profiles-draft.sql SHA256 de2007500b2b456a022cefc47c140866b6a01c4a535072e2c5d850e3298f257a
-- Business-owned cleaning profiles. Existing records retain unknown scope and original snapshots.

alter table public.business_catalogue add column cleaning_profile text check(cleaning_profile in ('regular','deep','moving','airbnb','office','carpet')),
 add column cleaning_config jsonb,
 add check(cleaning_profile is null and cleaning_config is null or kind='service' and cleaning_profile is not null and pricing_model='fixed');
alter table public.one_off_bookings add column cleaning_scope jsonb,add column cleaning_snapshot jsonb;
create function audit.cleaning_definitions() returns jsonb language sql immutable security invoker set search_path='' as $defs$select '{"definitions": {"property_type": {"label": "Property type", "options": ["House", "Apartment", "Townhouse"]}, "bedrooms": {"label": "Bedrooms", "count": true}, "bathrooms": {"label": "Bathrooms", "count": true}, "extra_rooms": {"label": "Extra rooms", "count": true}, "pets": {"label": "Pets", "custom": true}, "last_cleaned": {"label": "Last professionally cleaned", "options": ["Never / unsure", "6+ months", "3–6 months", "1–3 months"]}, "move_type": {"label": "Moving service", "options": ["Move-in", "Move-out"]}, "furnishing": {"label": "Property furnishing", "options": ["Furnished", "Empty"]}, "linen": {"label": "Linen", "options": ["Fresh linen available", "No linen change"]}, "access_method": {"label": "Key / access method", "options": ["Lockbox", "Smart lock / code", "Meet in person", "Managed by agent"]}, "office_size": {"label": "Office size", "options": ["Small: 1–5 desks", "Medium: 6–20 desks", "Large: 21–50 desks", "Enterprise: 50+ desks"]}, "carpet_rooms": {"label": "Carpeted rooms", "count": true}, "rugs": {"label": "Rugs", "count": true}, "carpet_type": {"label": "Carpet type", "options": ["Standard pile", "Thick / shag pile", "Berber / loop", "Persian / delicate"]}, "stains": {"label": "Visible stains", "options": ["No", "Yes"]}}, "profileFields": {"regular": ["property_type", "bedrooms", "bathrooms", "extra_rooms", "pets"], "deep": ["property_type", "bedrooms", "bathrooms", "extra_rooms", "last_cleaned", "pets"], "moving": ["property_type", "bedrooms", "bathrooms", "extra_rooms", "move_type", "furnishing", "pets"], "airbnb": ["property_type", "bedrooms", "bathrooms", "extra_rooms", "linen", "access_method"], "office": ["office_size", "bathrooms"], "carpet": ["property_type", "carpet_rooms", "rugs", "carpet_type", "stains"]}}'::jsonb$defs$;
revoke all on function audit.cleaning_definitions() from public,anon;grant execute on function audit.cleaning_definitions() to authenticated;
create function audit.validate_cleaning_config() returns trigger language plpgsql security invoker set search_path='' as $config$
declare defs jsonb:=audit.cleaning_definitions();k text;opt text;r jsonb;e jsonb;x text;v text;
begin
 if new.cleaning_config is null then return new;end if;
 if new.cleaning_profile is null or jsonb_typeof(new.cleaning_config)<>'object' then raise exception 'Choose a cleaning profile';end if;
 if jsonb_typeof(new.cleaning_config->'base_minutes') is distinct from 'number' or coalesce(new.cleaning_config->>'base_minutes','')!~'^[0-9]{1,4}$' or (new.cleaning_config->>'base_minutes')::int>1440 then raise exception 'Configure base duration';end if;
 if jsonb_typeof(new.cleaning_config->'service_fee_cents') is distinct from 'number' or coalesce(new.cleaning_config->>'service_fee_cents','')!~'^[0-9]{1,10}$' or (new.cleaning_config->>'service_fee_cents')::numeric>2147483647 then raise exception 'Configure explicit service fee';end if;
 for k in select jsonb_array_elements_text(defs->'profileFields'->new.cleaning_profile) loop
  if k='pets' and (jsonb_typeof(new.cleaning_config->'rules'->k) is distinct from 'object' or (select count(*) from jsonb_object_keys(new.cleaning_config->'rules'->k)) not between 1 and 20) then raise exception 'Configure service-specific pet choices';end if;
  for opt in select jsonb_array_elements_text(case when k='pets' then (select jsonb_agg(key) from jsonb_object_keys(new.cleaning_config->'rules'->k) key) when defs->'definitions'->k->>'count'='true' then '["unit"]'::jsonb else defs->'definitions'->k->'options' end) loop
   if length(trim(opt)) not between 1 and 60 or opt<>trim(opt) then raise exception 'Pet/option labels must contain 1–60 characters';end if;
   r:=new.cleaning_config->'rules'->k->opt;
   if r is null or jsonb_typeof(r)<>'object' or jsonb_typeof(r->'cents') is distinct from 'number' or jsonb_typeof(r->'minutes') is distinct from 'number' or coalesce(r->>'cents','')!~'^[0-9]{1,10}$' or (r->>'cents')::numeric>2147483647 or coalesce(r->>'minutes','')!~'^[0-9]{1,4}$' or (r->>'minutes')::int>1440 then raise exception 'Configure price and duration for every service option';end if;
  end loop;
 end loop;
 e:=new.cleaning_config->'equipment';
 if e is null or coalesce(e->>'policy','') not in ('included','customer','distance') then raise exception 'Configure equipment policy';end if;
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
revoke all on function audit.validate_cleaning_config() from public,anon,authenticated;
create trigger validate_cleaning_config before insert or update on public.business_catalogue for each row execute function audit.validate_cleaning_config();
create function audit.prepare_cleaning_booking() returns trigger language plpgsql security invoker set search_path='' as $scope$
declare service public.business_catalogue;defs jsonb:=audit.cleaning_definitions();cfg jsonb;s jsonb;k text;v text;opt text;r jsonb;qty int;minutes bigint;amount numeric:=0;fee numeric:=0;lines jsonb:='[]';line jsonb;allowed text[];item public.business_catalogue;
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
 allowed:=array(select jsonb_array_elements_text(defs->'profileFields'->service.cleaning_profile));
 if service.cleaning_profile='airbnb' then allowed:=allowed||array['access_instructions'];end if;
 if cfg->'equipment'->>'policy'='distance' then allowed:=allowed||array['equipment','distance_km','distance_reason'];end if;
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
  r:=cfg->'rules'->k->opt;minutes:=minutes+(r->>'minutes')::int*qty;amount:=amount+(r->>'cents')::numeric*qty;
  lines:=lines||jsonb_build_array(jsonb_build_object('name',defs->'definitions'->k->>'label'||': '||v,'kind','scope','pricing_model','per_unit','unit_label',case when opt='unit' then 'each' else 'option' end,'rate_cents',(r->>'cents')::numeric,'quantity',qty,'total_cents',(r->>'cents')::numeric*qty));
 end loop;
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
 for line in select value from jsonb_array_elements(new.selection) with ordinality t(value,n) where n>1 loop
  if not (cfg->'extras' ? (line->>'catalogue_id')) then raise exception 'Extra not allowed for this service';end if;
  -- Base validator checks active item, tenant, type and quantity as well.
  select * into item from public.business_catalogue where id=(line->>'catalogue_id')::uuid and business_id=new.business_id and kind='extra' and is_active;
  if not found then raise exception 'Select active business extras';end if;
  if coalesce(line->>'quantity','')!~'^[1-9][0-9]{0,5}$' then raise exception 'Use positive whole-number quantities';end if;
  minutes:=minutes+(cfg->'extra_minutes'->>(line->>'catalogue_id'))::int*(line->>'quantity')::int;
 end loop;
 if minutes not between 15 and 1440 or amount>2147483647 then raise exception 'Configured quote exceeds supported price or duration bounds';end if;
 new.duration_minutes:=minutes;
 new.cleaning_snapshot:=jsonb_build_object('profile',service.cleaning_profile,'version',service.version,'configuration',cfg,'duration_minutes',minutes,'adjustment_cents',amount,'lines',lines,'equipment_policy',cfg->'equipment'->>'policy','equipment_fee_cents',fee);
 return new;
end;$scope$;
revoke all on function audit.prepare_cleaning_booking() from public,anon,authenticated;
-- Alphabetical order: prepare computes duration before the existing working-hours validator.
create trigger prepare_cleaning_booking before insert or update on public.one_off_bookings for each row execute function audit.prepare_cleaning_booking();
create function audit.finish_cleaning_booking() returns trigger language plpgsql security invoker set search_path='' as $finish$
declare total numeric;
begin
 if new.cleaning_snapshot is not null then
  total:=new.total_cents::numeric+(new.cleaning_snapshot->>'adjustment_cents')::numeric;
  if total>2147483647 then raise exception 'Booking amount exceeds supported limit';end if;
  new.total_cents:=total;new.price_lines:=new.price_lines||(new.cleaning_snapshot->'lines');
  new.request_payload:=new.request_payload||jsonb_build_object('cleaning_scope',new.cleaning_scope);
 end if;
 return new;
end;$finish$;
revoke all on function audit.finish_cleaning_booking() from public,anon,authenticated;
create trigger zz_finish_cleaning_booking before insert on public.one_off_bookings for each row execute function audit.finish_cleaning_booking();


-- Source: database/t31-onboarding-shape.sql SHA256 743f88fe315e4a67c234d7f4c58a0c284091ea5c6e13fd762bfaa3d04ee88c39
-- Generic settings field consumed by the current onboarding UI; no policy defaults.

alter table public.business_settings add column max_daily_minutes integer check(max_daily_minutes between 15 and 1440);


-- Source: database/staff-teams-draft.sql SHA256 63a4198abe4333cfec80f1cafb24f7e30568903c2ca8646d28bb1fcc2904dc9e
-- T15: business-owned profiles and reusable teams; no membership grants.

create table public.staff_profiles (
 id uuid primary key default gen_random_uuid(), business_id uuid not null,
 user_id uuid not null, display_name text not null check(length(trim(display_name)) between 1 and 160),
 phone text not null default '' check(length(phone)<=40), version integer not null default 1 check(version>0),
 unique(business_id,user_id), foreign key(business_id,user_id) references public.business_memberships(business_id,user_id) on delete restrict
);
create table public.staff_teams (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 name text not null check(length(trim(name)) between 1 and 120),
 members uuid[] not null check(cardinality(members) between 1 and 100),
 is_active boolean not null default true, version integer not null default 1 check(version>0)
);
create index staff_profiles_business on public.staff_profiles(business_id,id);
create index staff_teams_business on public.staff_teams(business_id,name,id);
alter table public.staff_profiles enable row level security;
alter table public.staff_teams enable row level security;
revoke all on public.staff_profiles,public.staff_teams from public,anon,authenticated;
grant select,insert,update on public.staff_profiles,public.staff_teams to authenticated;
do $policies$
declare t text;
begin
 foreach t in array array['staff_profiles','staff_teams'] loop
  execute format('create policy office_read on public.%I for select to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.status=''active'' and m.role in (''owner'',''manager'') and b.status=''active''))',t,t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.status=''active'' and m.role=''owner'' and b.status=''active''))',t,t);
  execute format('create policy owner_update on public.%I for update to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.status=''active'' and m.role=''owner'' and b.status=''active'')) with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=%I.business_id and m.user_id=(select auth.uid()) and m.status=''active'' and m.role=''owner'' and b.status=''active''))',t,t,t);
 end loop;
end $policies$;
-- Narrow private reader: memberships are otherwise visible only to their subject.
create function audit.staff_context(p_business_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $context$
begin
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','manager') and b.status='active') then raise exception 'Staff access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'label',coalesce(p.display_name,u.email,'Staff account')) order by m.user_id) from public.business_memberships m join auth.users u on u.id=m.user_id left join public.staff_profiles p on p.business_id=m.business_id and p.user_id=m.user_id where m.business_id=p_business_id and m.role='staff' and m.status='active'),'[]');
end $context$;
revoke all on function audit.staff_context(uuid) from public,anon,authenticated;
grant execute on function audit.staff_context(uuid) to authenticated;
create function public.staff_context(p_business_id uuid) returns jsonb language sql stable security invoker set search_path='' as $wrapper$ select audit.staff_context(p_business_id) $wrapper$;
revoke all on function public.staff_context(uuid) from public,anon,authenticated;
grant execute on function public.staff_context(uuid) to authenticated;
create function audit.validate_staff_record() returns trigger language plpgsql security invoker set search_path='' as $validate$
declare accounts jsonb; uid uuid;
begin
 accounts:=public.staff_context(new.business_id);
 if tg_op='UPDATE' then
  if new.id<>old.id or new.business_id<>old.business_id or (tg_table_name='staff_profiles' and to_jsonb(new)->>'user_id'<>to_jsonb(old)->>'user_id') then raise exception 'Staff record identity is immutable';end if;
  new.version:=old.version+1;
 else new.version:=1;end if;
 if tg_table_name='staff_profiles' then
  if not exists(select 1 from jsonb_array_elements(accounts) a where a->>'user_id'=new.user_id::text) then raise exception 'Profile requires active staff membership in this business';end if;
 else
  if array_position(new.members,null) is not null or cardinality(new.members)<>(select count(distinct x) from unnest(new.members) x) then raise exception 'Team members must be distinct';end if;
  if new.is_active or tg_op='INSERT' or new.members is distinct from old.members then
   foreach uid in array new.members loop
    if not exists(select 1 from jsonb_array_elements(accounts) a where a->>'user_id'=uid::text) then raise exception 'Team requires active staff memberships in this business';end if;
   end loop;
  end if;
 end if;
 return new;
end $validate$;
revoke all on function audit.validate_staff_record() from public,anon,authenticated;
create trigger validate_staff_profile before insert or update on public.staff_profiles for each row execute function audit.validate_staff_record();
create trigger validate_staff_team before insert or update on public.staff_teams for each row execute function audit.validate_staff_record();
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams'));
create function audit.capture_staff_change() returns trigger language plpgsql security definer set search_path='' as $audit$
begin
 if tg_table_schema<>'public' or tg_table_name not in ('staff_profiles','staff_teams') then raise exception 'Unsupported audit source';end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record) values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),tg_table_name,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end $audit$;
revoke all on function audit.capture_staff_change() from public,anon,authenticated;
create trigger audit_staff_profile after insert or update on public.staff_profiles for each row execute function audit.capture_staff_change();
create trigger audit_staff_team after insert or update on public.staff_teams for each row execute function audit.capture_staff_change();


-- Source: database/t31-provisioning-candidate.sql SHA256 b2e33b0493ce3f39475b1e1fa87ebab429b30e56e0ef0922e669a095b4d80f67
-- T31 SOURCE-ONLY migration candidate: NOT applied to staging/production.
-- Requires isolated PG review, permission tests, migration generation and owner authorisation.
-- Depends on identity-draft.sql + audit-draft.sql and their deployed equivalents.

create schema if not exists private_t31;
revoke all on schema private_t31 from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='t31_bootstrap') then
    create role t31_bootstrap nologin noinherit;
  end if;
end $$;
grant usage on schema public, audit, private_t31 to t31_bootstrap;
-- Managed Auth stays owned by Supabase. Only narrow current-caller bridges
-- execute as the installer; worker roles never receive Auth schema access.
create function private_t31.current_actor() returns uuid
language sql stable security definer set search_path='' as $$ select auth.uid() $$;
create function private_t31.current_claims() returns jsonb
language sql stable security definer set search_path='' as $$ select auth.jwt() $$;
create function private_t31.current_verified_email() returns text
language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null
$$;
revoke all on function private_t31.current_actor(),private_t31.current_claims(),private_t31.current_verified_email()
 from public,anon,authenticated;
grant execute on function private_t31.current_actor(),private_t31.current_claims(),private_t31.current_verified_email()
 to t31_bootstrap;
-- The invoker-rights identity audit trigger also needs the caller ID while
-- executing under the worker role. Its writes still obey worker grants/RLS.
grant usage on schema private_t31 to authenticated;
grant execute on function private_t31.current_actor() to authenticated;
create or replace function audit.capture_identity_change() returns trigger
language plpgsql security invoker set search_path='' as $audit$
declare v_old jsonb; v_new jsonb; v_business uuid;
begin
 if tg_table_schema <> 'public' or tg_table_name not in ('businesses','business_memberships') then
  raise exception 'Unsupported audit source';
 end if;
 if tg_op <> 'INSERT' then v_old:=to_jsonb(old); end if;
 if tg_op <> 'DELETE' then v_new:=to_jsonb(new); end if;
 if tg_op='UPDATE' and v_old=v_new then return new; end if;
 v_business:=case when tg_table_name='businesses' then coalesce(v_new->>'id',v_old->>'id')::uuid
 else coalesce(v_new->>'business_id',v_old->>'business_id')::uuid end;
 if tg_op='UPDATE' and ((tg_table_name='businesses' and v_old->>'id'<>v_new->>'id')
 or (tg_table_name='business_memberships' and (v_old->>'business_id'<>v_new->>'business_id' or v_old->>'user_id'<>v_new->>'user_id'))) then
  raise exception 'Audited identity keys are immutable';
 end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(v_business,private_t31.current_actor(),current_user,tg_table_name,tg_op,v_old,v_new);
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$audit$;
-- Required for ALTER FUNCTION OWNER, revoked after ownership transfer.
grant create on schema private_t31 to t31_bootstrap;
grant select,insert on public.businesses, public.business_memberships to t31_bootstrap;
grant insert on audit.events to t31_bootstrap;
-- Identity audit trigger runs as invoker; RLS must allow its narrowly scoped writes.
create policy t31_identity_audit on audit.events for insert to t31_bootstrap
 with check(entity_table in ('businesses','business_memberships') and operation='INSERT' and actor_user_id=private_t31.current_actor());
create table private_t31.t31_provision_requests (
  actor_user_id uuid not null references auth.users(id),
  request_id uuid not null,
  business_name text not null,
  business_id uuid,
  created_at timestamptz not null default now(),
  primary key(actor_user_id,request_id),
  unique(business_id)
);
alter table private_t31.t31_provision_requests enable row level security;
revoke all on private_t31.t31_provision_requests from public, anon, authenticated;
grant select,insert,update on private_t31.t31_provision_requests to t31_bootstrap;
-- A non-BYPASSRLS execution role can insert only, never change existing tenant identity.
create policy t31_insert_business on public.businesses for insert to t31_bootstrap
  with check(industry='cleaning' and status='active');
create policy t31_read_new_business on public.businesses for select to t31_bootstrap
  using(exists(select 1 from public.business_memberships m where m.business_id=businesses.id and m.user_id=private_t31.current_actor() and m.role='owner' and m.status='active'));
create policy t31_insert_owner on public.business_memberships for insert to t31_bootstrap
  with check(user_id=private_t31.current_actor() and role='owner' and status='active');
create policy t31_read_membership on public.business_memberships for select to t31_bootstrap
  using(user_id=private_t31.current_actor());
create policy t31_requests_all on private_t31.t31_provision_requests for all to t31_bootstrap
  using(actor_user_id=private_t31.current_actor()) with check(actor_user_id=private_t31.current_actor());
create function private_t31.t31_provision_business(p_name text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_name text; v_business uuid; v_saved private_t31.t31_provision_requests%rowtype;
begin
  v_actor:=private_t31.current_actor();
  if v_actor is null or (coalesce(private_t31.current_claims()->>'is_anonymous','false'))='true' then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  if private_t31.current_verified_email() is null then
    raise exception 'Verified email required' using errcode='42501';
  end if;
  v_name:=btrim(p_name);
  if p_name is null or p_name<>v_name or length(v_name) not between 1 and 160
    or v_name ~ '[[:cntrl:]]' or p_request_id is null then
    raise exception 'Invalid business registration' using errcode='22023';
  end if;
  -- The unique key serializes competing requests. ON CONFLICT waits for the winning transaction.
  insert into private_t31.t31_provision_requests(actor_user_id,request_id,business_name)
  values(v_actor,p_request_id,v_name) on conflict(actor_user_id,request_id) do nothing;
  select * into strict v_saved from private_t31.t31_provision_requests
   where actor_user_id=v_actor and request_id=p_request_id for update;
  if v_saved.business_name<>v_name then raise exception 'Request identifier reused with different business details' using errcode='23505'; end if;
  if v_saved.business_id is not null then return v_saved.business_id; end if;
  -- Explicit UUID avoids RETURNING, whose SELECT RLS cannot see the tenant until membership exists.
  v_business:=gen_random_uuid();
  insert into public.businesses(id,name,industry,status) values(v_business,v_name,'cleaning','active');
  insert into public.business_memberships(business_id,user_id,role,status) values(v_business,v_actor,'owner','active');
  update private_t31.t31_provision_requests set business_id=v_business
   where actor_user_id=v_actor and request_id=p_request_id;
  return v_business;
end $$;
revoke all on function private_t31.t31_provision_business(text,uuid) from public,anon,authenticated;
grant usage on schema private_t31 to authenticated;
grant execute on function private_t31.t31_provision_business(text,uuid) to authenticated;
-- Exposed API wrapper remains SECURITY INVOKER; privileges are narrow and per-request.
create function public.t31_provision_business(p_name text,p_request_id uuid)
returns uuid language sql security invoker set search_path=''
as $$ select private_t31.t31_provision_business(p_name,p_request_id) $$;
revoke all on function public.t31_provision_business(text,uuid) from public,anon,authenticated;
grant execute on function public.t31_provision_business(text,uuid) to authenticated;
grant t31_bootstrap to current_user with set true, inherit false;
alter function private_t31.t31_provision_business(text,uuid) owner to t31_bootstrap;
revoke t31_bootstrap from current_user;
revoke create on schema private_t31 from t31_bootstrap;


-- Source: database/t31-branding-candidate.sql SHA256 9b81addbd85a654f31728c0a294651684db1b6d1b15933dd38ead7ae080745ea
-- T31 branding candidate, unapplied. Owner-scoped settings and separate immutable audit.

create table public.t31_business_branding (
 business_id uuid primary key references public.businesses(id) on delete restrict,
 accent_color text not null default '#146C94' check(accent_color ~ '^#[0-9A-F]{6}$'),
 logo_url text not null default '' check(length(logo_url)<=500 and
 (logo_url='' or (logo_url ~ '^https://[a-zA-Z0-9.-]+(:[0-9]{2,5})?/[a-zA-Z0-9_./%~?=&-]+$' and position('..' in logo_url)=0))),
 version integer not null default 1 check(version>=1)
);
alter table public.t31_business_branding enable row level security;
revoke all on public.t31_business_branding from public,anon,authenticated;
grant select,insert,update on public.t31_business_branding to authenticated;
create policy t31_brand_owner_read on public.t31_business_branding for select to authenticated using (
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy t31_brand_owner_insert on public.t31_business_branding for insert to authenticated with check (
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy t31_brand_owner_update on public.t31_business_branding for update to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create table private_t31.brand_audit (
 id bigint generated always as identity primary key,
 business_id uuid not null, actor_user_id uuid not null,
 old_value jsonb, new_value jsonb, occurred_at timestamptz not null default now()
);
alter table private_t31.brand_audit enable row level security;
revoke all on private_t31.brand_audit from public,anon,authenticated;
create function private_t31.capture_brand() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema<>'public' or tg_table_name<>'t31_business_branding' then raise exception 'Unexpected audit source'; end if;
 if tg_op='UPDATE' and (old.business_id<>new.business_id or new.version<>old.version) then
  raise exception 'Branding identity/version is immutable';end if;
 insert into private_t31.brand_audit(business_id,actor_user_id,old_value,new_value)
 values(new.business_id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function private_t31.capture_brand() from public,anon,authenticated;
create trigger t31_brand_audit after insert or update on public.t31_business_branding
for each row execute function private_t31.capture_brand();


-- Source: database/t31-staff-invitations-candidate.sql SHA256 fe45d6a886295f9f2e195890073b69b9422e904a390b7d8c29c2e74354640632
-- T31 invitation candidate. Unapplied, no outbound email. Depends on identity, audit, T31 provisioning.

create role t31_invite_worker nologin noinherit;
grant usage on schema public, audit, private_t31 to t31_invite_worker;
grant select on public.businesses,public.business_memberships to t31_invite_worker;
grant insert on public.business_memberships,audit.events to t31_invite_worker;
grant update(status) on public.business_memberships to t31_invite_worker;
grant execute on function private_t31.current_actor(),private_t31.current_claims(),private_t31.current_verified_email() to t31_invite_worker;
create table private_t31.invitations(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 inviter_user_id uuid not null references auth.users(id),
 recipient_email text not null check(length(recipient_email) between 3 and 254),
 role text not null check(role in ('manager','staff')),
 token_hash text not null unique,
 state text not null default 'pending' check(state in ('pending','accepted','revoked')),
 expires_at timestamptz not null,
 accepted_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(business_id,recipient_email,role,id)
);
alter table private_t31.invitations enable row level security;
revoke all on private_t31.invitations from public,anon,authenticated;
grant select,insert,update on private_t31.invitations to t31_invite_worker;
create policy t31_invite_worker_records on private_t31.invitations for all to t31_invite_worker using(true) with check(true);
create policy t31_invite_worker_business_read on public.businesses for select to t31_invite_worker using(true);
create policy t31_invite_worker_membership_read on public.business_memberships for select to t31_invite_worker using(true);
create policy t31_invite_worker_membership_insert on public.business_memberships for insert to t31_invite_worker
 with check(user_id=private_t31.current_actor() and role in ('staff','manager') and status='active');
create policy t31_invite_worker_membership_suspend on public.business_memberships for update to t31_invite_worker
 using(role in ('manager','staff') and status='active')
 with check(role in ('manager','staff') and status='suspended');
create policy t31_invite_worker_audit on audit.events for insert to t31_invite_worker
 with check(entity_table='business_memberships' and operation in ('INSERT','UPDATE') and actor_user_id=private_t31.current_actor());
create table private_t31.invitation_audit (
 id uuid primary key default gen_random_uuid(), business_id uuid not null,
 actor_user_id uuid not null, invitation_id uuid not null,
 action text not null check(action in ('created','accepted','revoked')),
 occurred_at timestamptz not null default clock_timestamp()
);
revoke all on private_t31.invitation_audit from public,anon,authenticated;
grant insert on private_t31.invitation_audit to t31_invite_worker;
create policy t31_invite_worker_audit_insert on private_t31.invitation_audit for insert to t31_invite_worker
 with check(actor_user_id=private_t31.current_actor());
alter table private_t31.invitation_audit enable row level security;

create function private_t31.create_invitation(p_business uuid,p_email text,p_role text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; token uuid; inv_id uuid;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' then raise exception 'Authentication required' using errcode='28000';end if;
 if p_role not in ('staff','manager') or p_email is null or length(p_email) not between 3 and 254
 or p_email<>lower(btrim(p_email)) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
 raise exception 'Invalid invitation details' using errcode='22023';end if;
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 token:=gen_random_uuid();
 insert into private_t31.invitations(business_id,inviter_user_id,recipient_email,role,token_hash,expires_at)
 values(p_business,actor,p_email,p_role,md5(token::text),now()+interval '7 days') returning id into inv_id;
 insert into private_t31.invitation_audit(business_id,actor_user_id,invitation_id,action)
 values(p_business,actor,inv_id,'created');
 return token;
end $$;

create function private_t31.accept_invitation(p_token uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; v_email text; i private_t31.invitations%rowtype;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' then raise exception 'Authentication required' using errcode='28000';end if;
 v_email:=private_t31.current_verified_email();
 if v_email is null then raise exception 'Verified email required' using errcode='42501';end if;
 select * into i from private_t31.invitations where token_hash=md5(p_token::text) for update;
 if not found or i.recipient_email<>v_email or i.state='revoked' or i.expires_at<=now()
 then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if i.state='accepted' then
   if i.accepted_user_id<>actor or not exists(select 1 from public.business_memberships m
     where m.business_id=i.business_id and m.user_id=actor and m.role=i.role and m.status='active')
   then raise exception 'Invitation unavailable' using errcode='42501';end if;
   return i.business_id;
 end if;
 if not exists(select 1 from public.businesses where id=i.business_id and status='active')
 then raise exception 'Business unavailable' using errcode='42501';end if;
 if exists(select 1 from public.business_memberships where business_id=i.business_id and user_id=actor)
 then raise exception 'Membership already exists' using errcode='23505';end if;
 insert into public.business_memberships(business_id,user_id,role,status)
 values(i.business_id,actor,i.role,'active');
 update private_t31.invitations set state='accepted',accepted_user_id=actor where id=i.id;
 insert into private_t31.invitation_audit(business_id,actor_user_id,invitation_id,action)
 values(i.business_id,actor,i.id,'accepted');
 return i.business_id;
end $$;

create function private_t31.staff_members(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'status',m.status) order by m.user_id)
 from public.business_memberships m where m.business_id=p_business),'[]'::jsonb);
end $$;

create function private_t31.suspend_member(p_business uuid,p_target uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 if p_target=actor then raise exception 'Cannot suspend owner' using errcode='42501';end if;
 update public.business_memberships set status='suspended'
 where business_id=p_business and user_id=p_target and role in ('staff','manager') and status='active';
 if not found then raise exception 'Active staff membership unavailable' using errcode='42501';end if;
 return true;
end $$;

revoke all on function private_t31.create_invitation(uuid,text,text),private_t31.accept_invitation(uuid),private_t31.staff_members(uuid),private_t31.suspend_member(uuid,uuid) from public,anon,authenticated;
grant usage on schema private_t31 to authenticated;
grant execute on function private_t31.create_invitation(uuid,text,text),private_t31.accept_invitation(uuid),private_t31.staff_members(uuid),private_t31.suspend_member(uuid,uuid) to authenticated;
create function public.t31_invite_staff(p_business uuid,p_email text,p_role text)
 returns uuid language sql security invoker set search_path=''
 as $$ select private_t31.create_invitation(p_business,p_email,p_role) $$;
create function public.t31_accept_invite(p_token uuid)
 returns uuid language sql security invoker set search_path=''
 as $$ select private_t31.accept_invitation(p_token) $$;
revoke all on function public.t31_invite_staff(uuid,text,text),public.t31_accept_invite(uuid) from public,anon,authenticated;
grant execute on function public.t31_invite_staff(uuid,text,text),public.t31_accept_invite(uuid) to authenticated;
create function public.t31_staff_members(p_business uuid)
 returns jsonb language sql security invoker set search_path=''
 as $$ select private_t31.staff_members(p_business) $$;
create function public.t31_suspend_member(p_business uuid,p_user uuid)
 returns boolean language sql security invoker set search_path=''
 as $$ select private_t31.suspend_member(p_business,p_user) $$;
revoke all on function public.t31_staff_members(uuid),public.t31_suspend_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.t31_staff_members(uuid),public.t31_suspend_member(uuid,uuid) to authenticated;
grant create on schema private_t31 to t31_invite_worker;
grant t31_invite_worker to current_user with set true, inherit false;
alter function private_t31.create_invitation(uuid,text,text) owner to t31_invite_worker;
alter function private_t31.accept_invitation(uuid) owner to t31_invite_worker;
alter function private_t31.staff_members(uuid) owner to t31_invite_worker;
alter function private_t31.suspend_member(uuid,uuid) owner to t31_invite_worker;
revoke t31_invite_worker from current_user;
revoke create on schema private_t31 from t31_invite_worker;


-- Source: database/t31-registration-gate.sql SHA256 97835cdf608d65e6d7fe837ef2208b790788e27d0719e8a50ebf95b1b4d212ed
-- Staging-only Before User Created hook. No recipient is seeded in Git.

create table private_t31.registration_allowlist (
 email text primary key check(email=lower(btrim(email))),
 enabled boolean not null default false
);
alter table private_t31.registration_allowlist enable row level security;
revoke all on private_t31.registration_allowlist from public,anon,authenticated;
grant usage on schema private_t31 to supabase_auth_admin;
grant select on private_t31.registration_allowlist to supabase_auth_admin;
create policy auth_reads_registration_gate on private_t31.registration_allowlist
 for select to supabase_auth_admin using(true);
create function private_t31.before_user_created(event jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if event->'user'->>'email' is not null and exists(
 select 1 from private_t31.registration_allowlist
 where email=lower(event->'user'->>'email') and enabled)
 then return '{}'::jsonb; end if;
 return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Registration unavailable'));
end $$;
revoke all on function private_t31.before_user_created(jsonb) from public,anon,authenticated;
grant execute on function private_t31.before_user_created(jsonb) to supabase_auth_admin;


commit;
