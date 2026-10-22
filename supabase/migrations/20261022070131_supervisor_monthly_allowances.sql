-- T04 optional supervisor allowances: configuration/history and previews only.
-- Depends on business VAT, staff, earnings and audit foundations. No backfill,
-- earned ledger, payout instruction, external request or allowance activation.
begin;

create table public.supervisor_allowance_changes (
 business_id uuid not null,
 user_id uuid not null,
 version integer not null check(version>0),
 effective_month date not null check(isfinite(effective_month) and effective_month between date '2000-01-01' and date '9999-12-01' and extract(day from effective_month)=1),
 enabled boolean not null,
 amount_cents integer not null,
 change_reason text not null check(length(trim(change_reason)) between 1 and 500),
 actor_user_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 primary key(business_id,user_id,version),
 foreign key(business_id,user_id) references public.business_memberships(business_id,user_id) on delete restrict,
 check((enabled and amount_cents>0) or (not enabled and amount_cents=0))
);
create index supervisor_allowance_period on public.supervisor_allowance_changes(business_id,user_id,effective_month desc,version desc);
create index supervisor_allowance_actor on public.supervisor_allowance_changes(actor_user_id);
alter table public.supervisor_allowance_changes enable row level security;
revoke all on public.supervisor_allowance_changes from public,anon,authenticated;
grant select on public.supervisor_allowance_changes to authenticated;
create policy allowance_office_read on public.supervisor_allowance_changes for select to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=supervisor_allowance_changes.business_id and m.user_id=(select auth.uid())
 and m.role in ('owner','manager') and m.status='active' and b.status='active'));

alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams','recurring_schedules','business_quotes','quote_invoice_handoffs','business_invoices','business_accounting_connections','business_earnings_rules','business_vat_settings','supervisor_allowance_changes'));

create function audit.capture_supervisor_allowance() returns trigger language plpgsql security definer set search_path='' as $fn$
declare previous jsonb;
begin
 if tg_table_schema<>'public' or tg_table_name<>'supervisor_allowance_changes' or tg_op<>'INSERT' then raise exception 'Unsupported allowance audit source';end if;
 select to_jsonb(c) into previous from public.supervisor_allowance_changes c
 where c.business_id=new.business_id and c.user_id=new.user_id and c.version=new.version-1;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),'supervisor_allowance_changes','INSERT',previous,to_jsonb(new));
 return new;
end $fn$;
revoke all on function audit.capture_supervisor_allowance() from public,anon,authenticated;
create trigger allowance_audit after insert on public.supervisor_allowance_changes for each row execute function audit.capture_supervisor_allowance();

-- Narrow private bridges: public wrappers are invoker-only; no direct table writes.
create function audit.supervisor_allowance_context(p_business_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare zone text; month_start date;
begin
 if auth.uid() is null or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=auth.uid() and m.role in ('owner','manager') and m.status='active' and b.status='active') then raise exception 'Allowance access denied' using errcode='42501';end if;
 select time_zone into zone from public.business_settings where business_id=p_business_id;
 zone:=coalesce(zone,'UTC');
 month_start:=date_trunc('month',now() at time zone zone)::date;
 return jsonb_build_object('business_id',p_business_id,'time_zone',zone,'current_month',month_start,'next_month',(month_start+interval '1 month')::date);
end $fn$;
revoke all on function audit.supervisor_allowance_context(uuid) from public,anon,authenticated;
grant execute on function audit.supervisor_allowance_context(uuid) to authenticated;
create function public.supervisor_allowance_context(p_business_id uuid) returns jsonb language sql stable security invoker set search_path='' as $fn$
 select audit.supervisor_allowance_context(p_business_id)
$fn$;
revoke all on function public.supervisor_allowance_context(uuid) from public,anon,authenticated;
grant execute on function public.supervisor_allowance_context(uuid) to authenticated;

create function audit.configure_supervisor_allowance(p_business_id uuid,p_user_id uuid,p_version integer,p_enabled boolean,p_amount_cents integer,p_effective_month date,p_reason text) returns integer language plpgsql security definer set search_path='' as $fn$
declare v integer; zone text; next_month date;
begin
 -- Lock memberships through this statement so concurrent suspension cannot race a save.
 perform 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business_id and m.user_id=auth.uid() and m.role='owner' and m.status='active' and b.status='active' for share of m,b;
 if auth.uid() is null or not found then raise exception 'Allowance access denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('supervisor_allowance:'||p_business_id::text||':'||coalesce(p_user_id::text,''),0));
 perform 1 from public.business_memberships where business_id=p_business_id and user_id=p_user_id and role='staff' and status='active' for share;
 if not found then raise exception 'An active staff membership in this business is required';end if;
 select coalesce(max(version),0) into v from public.supervisor_allowance_changes where business_id=p_business_id and user_id=p_user_id;
 if p_version is null or p_version<>v then raise exception 'Allowance changed; reopen before saving' using errcode='40001';end if;
 if p_enabled is null or p_amount_cents is null or (p_enabled and p_amount_cents<=0) or (not p_enabled and p_amount_cents<>0) then raise exception 'Choose On with a positive amount or Off with zero';end if;
 if p_reason is null or length(trim(p_reason)) not between 1 and 500 then raise exception 'Record an allowance change reason';end if;
 select time_zone into zone from public.business_settings where business_id=p_business_id;
 next_month:=(date_trunc('month',now() at time zone coalesce(zone,'UTC'))+interval '1 month')::date;
 if p_effective_month is null or not isfinite(p_effective_month) or p_effective_month<next_month or p_effective_month>date '9999-12-01' or extract(day from p_effective_month)<>1 then raise exception 'Choose the first day of a future calendar month';end if;
 begin
  insert into public.supervisor_allowance_changes(business_id,user_id,version,effective_month,enabled,amount_cents,change_reason,actor_user_id)
  values(p_business_id,p_user_id,v+1,p_effective_month,p_enabled,p_amount_cents,trim(p_reason),auth.uid());
 exception when unique_violation then
  raise exception 'Allowance changed; reopen before saving' using errcode='40001';
 end;
 return v+1;
end $fn$;
revoke all on function audit.configure_supervisor_allowance(uuid,uuid,integer,boolean,integer,date,text) from public,anon,authenticated;
grant execute on function audit.configure_supervisor_allowance(uuid,uuid,integer,boolean,integer,date,text) to authenticated;
create function public.configure_supervisor_allowance(p_business_id uuid,p_user_id uuid,p_version integer,p_enabled boolean,p_amount_cents integer,p_effective_month date,p_reason text) returns integer language sql security invoker set search_path='' as $fn$
 select audit.configure_supervisor_allowance(p_business_id,p_user_id,p_version,p_enabled,p_amount_cents,p_effective_month,p_reason)
$fn$;
revoke all on function public.configure_supervisor_allowance(uuid,uuid,integer,boolean,integer,date,text) from public,anon,authenticated;
grant execute on function public.configure_supervisor_allowance(uuid,uuid,integer,boolean,integer,date,text) to authenticated;
commit;
