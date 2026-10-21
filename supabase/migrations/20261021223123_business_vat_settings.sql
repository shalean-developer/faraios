-- Business-specific, owner-controlled South African VAT. No registration is enabled.
-- Apply after invoices, earnings and T04 duration migrations. No historical backfill.
begin;
create table public.business_vat_settings (
 business_id uuid primary key references public.businesses(id),
 enabled boolean not null default false,
 vat_number text,
 registration_date date,
 version integer not null check(version>0),
 change_reason text not null check(length(trim(change_reason)) between 1 and 500),
 updated_at timestamptz not null default now(),
 check((not enabled and vat_number is null and registration_date is null) or
       (enabled and vat_number ~ '^4[0-9]{9}$' and vat_number is not null and registration_date is not null and isfinite(registration_date)))
);
alter table public.business_vat_settings enable row level security;
revoke all on public.business_vat_settings from public,anon,authenticated;
grant select on public.business_vat_settings to authenticated;
create policy owner_vat_read on public.business_vat_settings for select to authenticated using(
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_vat_settings.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams','recurring_schedules','business_quotes','quote_invoice_handoffs','business_invoices','business_accounting_connections','business_earnings_rules','business_vat_settings'));

create function audit.configure_business_vat(p_business_id uuid,p_version integer,p_enabled boolean,p_vat_number text,p_registration_date date,p_reason text,p_confirmed boolean) returns integer language plpgsql security definer set search_path='' as $fn$
declare v integer;
begin
 -- Serialize against snapshots, including the first change when no policy row exists.
 perform pg_advisory_xact_lock(hashtextextended('vat:'||p_business_id::text,0));
 if auth.uid() is null or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.role='owner' and m.status='active' and b.status='active') then raise exception 'Settings access denied' using errcode='42501';end if;
 select version into v from public.business_vat_settings where business_id=p_business_id;
 if p_version is null or p_version<>coalesce(v,0) then raise exception 'VAT settings changed. Reopen the page.' using errcode='40001';end if;
 if p_enabled is null or p_confirmed is distinct from true or p_reason is null or length(trim(p_reason)) not between 1 and 500 then raise exception 'Confirm current registration and record a reason';end if;
 if p_enabled and (p_vat_number is null or p_vat_number !~ '^4[0-9]{9}$' or p_registration_date is null or not isfinite(p_registration_date) or p_registration_date>(now() at time zone 'Africa/Johannesburg')::date) then raise exception 'Enter a valid VAT number and an effective registration date that has already started';end if;
 insert into public.business_vat_settings(business_id,enabled,vat_number,registration_date,version,change_reason)
 values(p_business_id,p_enabled,case when p_enabled then p_vat_number end,case when p_enabled then p_registration_date end,coalesce(v,0)+1,trim(p_reason))
 on conflict(business_id) do update set enabled=excluded.enabled,vat_number=excluded.vat_number,registration_date=excluded.registration_date,version=excluded.version,change_reason=excluded.change_reason,updated_at=now();
 return coalesce(v,0)+1;
end;$fn$;
revoke all on function audit.configure_business_vat(uuid,integer,boolean,text,date,text,boolean) from public,anon,authenticated;
grant execute on function audit.configure_business_vat(uuid,integer,boolean,text,date,text,boolean) to authenticated;
create function public.configure_business_vat(p_business_id uuid,p_version integer,p_enabled boolean,p_vat_number text,p_registration_date date,p_reason text,p_confirmed boolean) returns integer language sql security invoker set search_path='' as $fn$
 select audit.configure_business_vat(p_business_id,p_version,p_enabled,p_vat_number,p_registration_date,p_reason,p_confirmed)
$fn$;
revoke all on function public.configure_business_vat(uuid,integer,boolean,text,date,text,boolean) from public,anon,authenticated;
grant execute on function public.configure_business_vat(uuid,integer,boolean,text,date,text,boolean) to authenticated;

create function audit.capture_vat_change() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),'business_vat_settings',tg_op,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new));return new;
end;$fn$;
revoke all on function audit.capture_vat_change() from public,anon,authenticated;
create trigger audit_vat after insert or update on public.business_vat_settings for each row execute function audit.capture_vat_change();

create function audit.business_tax_snapshot(p_business uuid,p_total integer) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare p public.business_vat_settings;vat integer:=0;
begin
 perform audit.quote_access(p_business);
 perform pg_advisory_xact_lock_shared(hashtextextended('vat:'||p_business::text,0));
 select * into p from public.business_vat_settings where business_id=p_business;
 if p.enabled then vat:=round(p_total::numeric*1500/11500)::integer;end if;
 return jsonb_build_object('enabled',coalesce(p.enabled,false),'policy_version',coalesce(p.version,0),'price_basis','customer_total','rate_bps',case when p.enabled then 1500 else 0 end,'vat_number',p.vat_number,'registration_date',p.registration_date,'net_cents',p_total-vat,'vat_cents',vat,'total_cents',p_total);
end;$fn$;
revoke all on function audit.business_tax_snapshot(uuid,integer) from public,anon,authenticated;

alter table public.one_off_bookings add column tax_snapshot jsonb;
create function audit.freeze_booking_vat() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_op='UPDATE' then
  if new.tax_snapshot is distinct from old.tax_snapshot then raise exception 'Saved VAT details are immutable';end if;return new;
 end if;
 perform audit.quote_access(new.business_id);
 if new.source_quote_id is not null then
  select agreement->'tax_snapshot' into new.tax_snapshot from public.business_quotes where id=new.source_quote_id and business_id=new.business_id;
 elsif new.recurring_schedule_id is not null then
  select agreement->'tax_snapshot' into new.tax_snapshot from public.recurring_schedules where id=new.recurring_schedule_id and business_id=new.business_id;
 else new.tax_snapshot:=audit.business_tax_snapshot(new.business_id,new.total_cents);end if;
 new.tax_snapshot:=nullif(new.tax_snapshot,'null'::jsonb);return new;
end;$fn$;
revoke all on function audit.freeze_booking_vat() from public,anon,authenticated;
-- Runs after all price builders, quote/recurring source copying and workload guards.
create trigger zzzz_booking_vat before insert or update on public.one_off_bookings for each row execute function audit.freeze_booking_vat();

create function audit.freeze_document_vat() returns trigger language plpgsql security definer set search_path='' as $fn$
declare tax jsonb;v integer;
begin
 if tg_table_name='business_quotes' then
  if tg_op='INSERT' then new.agreement:=new.agreement||jsonb_build_object('tax_snapshot',audit.business_tax_snapshot(new.business_id,(new.agreement->>'total_cents')::integer));
  elsif new.status='issued' then
   perform pg_advisory_xact_lock_shared(hashtextextended('vat:'||new.business_id::text,0));
   select version into v from public.business_vat_settings where business_id=new.business_id;
   if new.agreement->'tax_snapshot' is null or (new.agreement->'tax_snapshot'->>'policy_version')::int is distinct from coalesce(v,0) then raise exception 'VAT settings changed or were not captured. Create a new quote before issuing.';end if;
  end if;
 elsif tg_table_name='recurring_schedules' then
  select tax_snapshot into tax from public.one_off_bookings where business_id=new.business_id and id=new.source_booking_id;
  new.agreement:=new.agreement||jsonb_build_object('tax_snapshot',tax);
 elsif tg_table_name='business_invoices' then
  if tg_op='INSERT' then
   select tax_snapshot into tax from public.one_off_bookings where business_id=new.business_id and id=new.booking_id;
   new.snapshot:=new.snapshot||jsonb_build_object('tax_snapshot',tax);
  elsif new.sync_status='syncing' and coalesce((new.snapshot->'tax_snapshot'->>'enabled')::boolean,false) then raise exception 'VAT accounting sync requires separate verified tax mapping. The invoice remains an internal draft.';end if;
 end if;
 return new;
end;$fn$;
revoke all on function audit.freeze_document_vat() from public,anon,authenticated;
create trigger zzzz_quote_vat before insert or update on public.business_quotes for each row execute function audit.freeze_document_vat();
create trigger zzzz_recurring_vat before insert on public.recurring_schedules for each row execute function audit.freeze_document_vat();
create trigger zzzz_invoice_vat before insert or update on public.business_invoices for each row execute function audit.freeze_document_vat();
commit;
