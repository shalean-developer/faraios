-- T19: isolated staging candidate; no business bindings or credentials seeded.
begin;
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams','recurring_schedules','business_quotes','quote_invoice_handoffs','business_invoices','business_accounting_connections'));

create table public.business_accounting_connections(
 business_id uuid primary key references public.businesses(id) on delete restrict,
 provider text not null default 'zoho_books' check(provider='zoho_books'),
 organization_id text not null check(organization_id ~ '^[0-9]{1,30}$'),
 api_domain text not null check(api_domain in ('https://www.zohoapis.com','https://www.zohoapis.eu','https://www.zohoapis.in','https://www.zohoapis.com.au','https://www.zohoapis.jp','https://www.zohoapis.ca','https://www.zohoapis.com.cn','https://www.zohoapis.sa')),
 credential_key text not null check(credential_key ~ '^[A-Z][A-Z0-9_]{0,39}$'),
 environment text not null default 'staging' check(environment='staging'),
 enabled boolean not null default false,
 version integer not null default 1 check(version>0),
 last_actor uuid not null,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 unique(api_domain,organization_id),unique(credential_key)
);
create table public.business_invoices(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete restrict,
 booking_id uuid not null,customer_id uuid not null,source_quote_id uuid,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 total_cents integer not null check(total_cents>=0),currency text not null check(currency='ZAR'),
 document_status text not null default 'draft' check(document_status='draft'),
 sync_status text not null default 'not_synced' check(sync_status in ('not_synced','syncing','matched','failed','review_required')),
 provider_binding jsonb,external_customer_id text check(external_customer_id ~ '^[0-9]{1,30}$'),
 external_invoice_id text check(external_invoice_id ~ '^[0-9]{1,30}$'),external_invoice_number text check(length(external_invoice_number)<=100),
 provider_total_cents integer check(provider_total_cents>=0),provider_status text,
 attempt_id uuid,attempt_mode text check(attempt_mode in ('create','reconcile')),attempt_started_at timestamptz,checked_at timestamptz,
 error_code text not null default '' check(error_code in ('','not_configured','credentials','organization','customer','provider_unavailable','rate_limited','mismatch','duplicates','unknown_outcome','booking_cancelled','not_found')),
 version integer not null default 1 check(version>0),created_by uuid not null,last_actor uuid not null,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 unique(business_id,id),unique(business_id,booking_id),
 constraint invoice_booking_fk foreign key(business_id,booking_id) references public.one_off_bookings(business_id,id) on delete restrict,
 foreign key(business_id,customer_id) references public.business_customers(business_id,id) on delete restrict,
 foreign key(business_id,source_quote_id,booking_id) references public.one_off_bookings(business_id,source_quote_id,id) on delete restrict,
 check((provider_binding is null)=(external_customer_id is null)),
 check(sync_status<>'matched' or (external_invoice_id is not null and external_invoice_number is not null and provider_total_cents=total_cents and provider_status='draft' and checked_at is not null))
);
create unique index invoices_provider_identity on public.business_invoices((provider_binding->>'api_domain'),(provider_binding->>'organization_id'),external_invoice_id) where external_invoice_id is not null;
create index invoices_business_created on public.business_invoices(business_id,created_at desc,id);
create index invoices_customer on public.business_invoices(business_id,customer_id);
create index invoices_quote_booking on public.business_invoices(business_id,source_quote_id,booking_id);

create function audit.invoice_actor_access(p_business uuid,p_actor uuid,p_owner boolean default false) returns void language plpgsql stable security definer set search_path='' as $fn$
begin
 if p_actor is null or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business and m.user_id=p_actor and m.status='active' and b.status='active' and (m.role='owner' or (not p_owner and m.role='manager'))) then raise exception 'Invoice access denied' using errcode='42501';end if;
end;$fn$;
revoke all on function audit.invoice_actor_access(uuid,uuid,boolean) from public,anon,authenticated,service_role;

alter table public.business_invoices enable row level security;
alter table public.business_accounting_connections enable row level security;
revoke all on public.business_invoices,public.business_accounting_connections from public,anon,authenticated,service_role;
grant select on public.business_invoices,public.business_accounting_connections to authenticated;
create policy office_invoice_read on public.business_invoices for select to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_invoices.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'));
create policy office_accounting_read on public.business_accounting_connections for select to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_accounting_connections.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'));

create function audit.capture_invoice_change() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_table_schema<>'public' or tg_table_name not in ('business_invoices','business_accounting_connections') then raise exception 'Unsupported audit source';end if;
 if tg_op='UPDATE' and to_jsonb(old)=to_jsonb(new) then return new;end if;
 if tg_op='UPDATE' and (old.business_id<>new.business_id or old.created_at<>new.created_at) then raise exception 'Accounting identity is immutable';end if;
 if tg_table_name='business_invoices' and tg_op='UPDATE' and (to_jsonb(old)-array['sync_status','provider_binding','external_customer_id','external_invoice_id','external_invoice_number','provider_total_cents','provider_status','attempt_id','attempt_mode','attempt_started_at','checked_at','error_code','version','last_actor','updated_at']) is distinct from (to_jsonb(new)-array['sync_status','provider_binding','external_customer_id','external_invoice_id','external_invoice_number','provider_total_cents','provider_status','attempt_id','attempt_mode','attempt_started_at','checked_at','error_code','version','last_actor','updated_at']) then raise exception 'Invoice agreement is immutable';end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record) values(new.business_id,new.last_actor,coalesce(nullif(current_setting('role',true),'none'),session_user),tg_table_name,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end;$fn$;
revoke all on function audit.capture_invoice_change() from public,anon,authenticated,service_role;
create trigger invoices_audit after insert or update on public.business_invoices for each row execute function audit.capture_invoice_change();
create trigger accounting_connections_audit after insert or update on public.business_accounting_connections for each row execute function audit.capture_invoice_change();

create function audit.configure_accounting(p_business_id uuid,p_version integer,p_organization_id text,p_api_domain text,p_credential_key text,p_enabled boolean) returns integer language plpgsql security definer set search_path='' as $fn$
declare c public.business_accounting_connections;
begin
 perform audit.invoice_actor_access(p_business_id,auth.uid(),true);
 perform pg_advisory_xact_lock(hashtextextended(p_business_id::text||':accounting',0));
 select * into c from public.business_accounting_connections where business_id=p_business_id for update;
 if not found then
  if p_version is distinct from 0 then raise exception 'Connection changed; reopen it' using errcode='40001';end if;
  insert into public.business_accounting_connections(business_id,organization_id,api_domain,credential_key,enabled,last_actor) values(p_business_id,p_organization_id,p_api_domain,p_credential_key,p_enabled,auth.uid());return 1;
 end if;
 if c.version is distinct from p_version then raise exception 'Connection changed; reopen it' using errcode='40001';end if;
 if (c.organization_id<>p_organization_id or c.api_domain<>p_api_domain or c.credential_key<>p_credential_key) and exists(select 1 from public.business_invoices where business_id=p_business_id and provider_binding is not null) then raise exception 'Connection is pinned by accounting attempts; disable it and review before changing its identity';end if;
 update public.business_accounting_connections set organization_id=p_organization_id,api_domain=p_api_domain,credential_key=p_credential_key,enabled=p_enabled,version=version+1,last_actor=auth.uid(),updated_at=clock_timestamp() where business_id=p_business_id;return p_version+1;
end;$fn$;
revoke all on function audit.configure_accounting(uuid,integer,text,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function audit.configure_accounting(uuid,integer,text,text,text,boolean) to authenticated;
create function public.configure_accounting(p_business_id uuid,p_version integer,p_organization_id text,p_api_domain text,p_credential_key text,p_enabled boolean) returns integer language sql security invoker set search_path='' as $fn$ select audit.configure_accounting(p_business_id,p_version,p_organization_id,p_api_domain,p_credential_key,p_enabled) $fn$;
revoke all on function public.configure_accounting(uuid,integer,text,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.configure_accounting(uuid,integer,text,text,text,boolean) to authenticated;

create function audit.prepare_invoice(p_business_id uuid,p_booking_id uuid) returns uuid language plpgsql security definer set search_path='' as $fn$
declare b public.one_off_bookings;i uuid;
begin
 perform audit.invoice_actor_access(p_business_id,auth.uid());
 select * into b from public.one_off_bookings where business_id=p_business_id and id=p_booking_id for update;
 if not found then raise exception 'Booking unavailable' using errcode='42501';end if;
 select id into i from public.business_invoices where business_id=p_business_id and booking_id=b.id;
 if found then return i;end if;
 if b.status='cancelled' then raise exception 'Cancelled booking needs review; no invoice prepared';end if;
 if b.source_quote_id is not null and not exists(select 1 from public.quote_invoice_handoffs where business_id=p_business_id and quote_id=b.source_quote_id and booking_id=b.id) then raise exception 'Quote invoice handoff unavailable';end if;
 insert into public.business_invoices(business_id,booking_id,customer_id,source_quote_id,snapshot,total_cents,currency,created_by,last_actor)
 values(p_business_id,b.id,b.customer_id,b.source_quote_id,jsonb_build_object('customer_snapshot',b.customer_snapshot,'address_snapshot',b.address_snapshot,'price_lines',b.price_lines,'total_cents',b.total_cents,'currency',b.currency,'local_start',b.local_start,'time_zone',b.time_zone),b.total_cents,b.currency,auth.uid(),auth.uid()) returning id into i;return i;
end;$fn$;
revoke all on function audit.prepare_invoice(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function audit.prepare_invoice(uuid,uuid) to authenticated;
create function public.prepare_invoice(p_business_id uuid,p_booking_id uuid) returns uuid language sql security invoker set search_path='' as $fn$ select audit.prepare_invoice(p_business_id,p_booking_id) $fn$;
revoke all on function public.prepare_invoice(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.prepare_invoice(uuid,uuid) to authenticated;

-- Accounting results are server-attested. An office JWT cannot claim provider success.
grant usage on schema audit to service_role;
create function audit.claim_invoice_sync(p_business_id uuid,p_invoice_id uuid,p_actor uuid,p_external_customer_id text) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare c public.business_accounting_connections;i public.business_invoices;b public.one_off_bookings;mode text;binding jsonb;
begin
 perform audit.invoice_actor_access(p_business_id,p_actor);
 select * into c from public.business_accounting_connections where business_id=p_business_id for share;
 if not found or not c.enabled then raise exception 'Accounting connection is not configured or enabled';end if;
 select b0.* into b from public.one_off_bookings b0 join public.business_invoices i0 on i0.business_id=b0.business_id and i0.booking_id=b0.id where i0.business_id=p_business_id and i0.id=p_invoice_id for share of b0;
 if not found then raise exception 'Invoice unavailable' using errcode='42501';end if;
 select * into i from public.business_invoices where business_id=p_business_id and id=p_invoice_id for update;
 if b.status='cancelled' then raise exception 'Cancelled booking needs accounting review';end if;
 if i.sync_status='syncing' and i.attempt_started_at>clock_timestamp()-interval '2 minutes' then raise exception 'Accounting check already in progress' using errcode='40001';end if;
 if p_external_customer_id is null or p_external_customer_id !~ '^[0-9]{1,30}$' then raise exception 'Choose a valid Zoho customer';end if;
 binding:=jsonb_build_object('provider',c.provider,'organization_id',c.organization_id,'api_domain',c.api_domain,'environment',c.environment);
 if i.provider_binding is not null and (i.provider_binding<>binding or i.external_customer_id<>p_external_customer_id) then raise exception 'Accounting identity is pinned; review the existing attempt';end if;
 mode:=case when i.sync_status in ('matched','review_required','syncing') or i.external_invoice_id is not null then 'reconcile' else 'create' end;
 update public.business_invoices set provider_binding=binding,external_customer_id=p_external_customer_id,sync_status='syncing',attempt_id=gen_random_uuid(),attempt_mode=mode,attempt_started_at=clock_timestamp(),error_code='',last_actor=p_actor,version=version+1,updated_at=clock_timestamp() where id=i.id returning * into i;
 return jsonb_build_object('invoice',to_jsonb(i),'connection',to_jsonb(c),'mode',mode,'actor',p_actor);
end;$fn$;
revoke all on function audit.claim_invoice_sync(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function audit.claim_invoice_sync(uuid,uuid,uuid,text) to service_role;
create function public.claim_invoice_sync(p_business_id uuid,p_invoice_id uuid,p_actor uuid,p_external_customer_id text) returns jsonb language sql security invoker set search_path='' as $fn$ select audit.claim_invoice_sync(p_business_id,p_invoice_id,p_actor,p_external_customer_id) $fn$;
revoke all on function public.claim_invoice_sync(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_invoice_sync(uuid,uuid,uuid,text) to service_role;

create function audit.finish_invoice_sync(p_business_id uuid,p_invoice_id uuid,p_attempt_id uuid,p_actor uuid,p_outcome text,p_error_code text,p_receipt jsonb default null) returns void language plpgsql security definer set search_path='' as $fn$
declare i public.business_invoices;
begin
 perform audit.invoice_actor_access(p_business_id,p_actor);
 select * into i from public.business_invoices where business_id=p_business_id and id=p_invoice_id for update;
 if not found then raise exception 'Invoice unavailable' using errcode='42501';end if;
 if i.sync_status<>'syncing' or i.attempt_id is distinct from p_attempt_id or i.last_actor is distinct from p_actor then raise exception 'Accounting attempt changed; reopen it' using errcode='40001';end if;
 if p_outcome is null or p_outcome not in ('matched','failed','review_required') or p_error_code is null then raise exception 'Invalid accounting outcome';end if;
 if (i.attempt_mode='reconcile' or p_error_code in ('unknown_outcome','mismatch','duplicates')) and p_outcome='failed' then raise exception 'Uncertain accounting attempts require review';end if;
 if p_outcome='matched' then
  if p_receipt is null or p_error_code<>'' or p_receipt->>'organization_id' is distinct from i.provider_binding->>'organization_id' or p_receipt->>'api_domain' is distinct from i.provider_binding->>'api_domain' or p_receipt->>'reference_number' is distinct from 'FaraiOS:'||i.id::text or p_receipt->>'customer_id' is distinct from i.external_customer_id or p_receipt->>'currency_code' is distinct from i.currency or p_receipt->>'status' is distinct from 'draft' or (p_receipt->>'total_cents')::integer is distinct from i.total_cents or p_receipt->'price_lines' is distinct from i.snapshot->'price_lines' or coalesce(p_receipt->>'invoice_id','') !~ '^[0-9]{1,30}$' or length(trim(coalesce(p_receipt->>'invoice_number','')))=0 then raise exception 'Accounting receipt does not match the saved agreement';end if;
  if i.external_invoice_id is not null and i.external_invoice_id<>p_receipt->>'invoice_id' then raise exception 'Accounting identity changed';end if;
 elsif p_error_code='' then raise exception 'Accounting failure requires a visible reason';end if;
 update public.business_invoices set sync_status=p_outcome,error_code=p_error_code,external_invoice_id=case when p_outcome='matched' then p_receipt->>'invoice_id' else external_invoice_id end,external_invoice_number=case when p_outcome='matched' then p_receipt->>'invoice_number' else external_invoice_number end,provider_total_cents=case when p_outcome='matched' then (p_receipt->>'total_cents')::integer else provider_total_cents end,provider_status=case when p_outcome='matched' then 'draft' else provider_status end,checked_at=clock_timestamp(),last_actor=p_actor,version=version+1,updated_at=clock_timestamp() where id=i.id;
end;$fn$;
revoke all on function audit.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function audit.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb) to service_role;
create function public.finish_invoice_sync(p_business_id uuid,p_invoice_id uuid,p_attempt_id uuid,p_actor uuid,p_outcome text,p_error_code text,p_receipt jsonb default null) returns void language sql security invoker set search_path='' as $fn$ select audit.finish_invoice_sync(p_business_id,p_invoice_id,p_attempt_id,p_actor,p_outcome,p_error_code,p_receipt) $fn$;
revoke all on function public.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb) to service_role;

create function audit.invoice_totals(p_business_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare result jsonb;cutoff timestamptz:=clock_timestamp()-interval '2 minutes';
begin
 perform audit.invoice_actor_access(p_business_id,auth.uid());
 select jsonb_build_object('business_id',p_business_id,'count',count(*),'total_cents',coalesce(sum(i.total_cents),0),'matched_count',count(*) filter(where i.sync_status='matched' and b.status<>'cancelled'),'matched_cents',coalesce(sum(i.total_cents) filter(where i.sync_status='matched' and b.status<>'cancelled'),0),'review_count',count(*) filter(where i.sync_status in ('review_required','failed') or b.status='cancelled' or (i.sync_status='syncing' and i.attempt_started_at<=cutoff)),'pending_count',count(*) filter(where (i.sync_status='not_synced' or i.sync_status='syncing' and i.attempt_started_at>cutoff) and b.status<>'cancelled'),'checked_at',clock_timestamp()) into result from public.business_invoices i join public.one_off_bookings b on b.business_id=i.business_id and b.id=i.booking_id where i.business_id=p_business_id;return result;
end;$fn$;
revoke all on function audit.invoice_totals(uuid) from public,anon,authenticated,service_role;
grant execute on function audit.invoice_totals(uuid) to authenticated;
create function public.invoice_totals(p_business_id uuid) returns jsonb language sql stable security invoker set search_path='' as $fn$ select audit.invoice_totals(p_business_id) $fn$;
revoke all on function public.invoice_totals(uuid) from public,anon,authenticated,service_role;
grant execute on function public.invoice_totals(uuid) to authenticated;
commit;
