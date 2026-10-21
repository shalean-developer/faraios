-- T04 earnings setup and previews. Additive draft; no booking/ledger/payout writes.
-- Apply after the existing catalogue/audit foundations (after invoices on staging).
begin;
create table public.business_earnings_rules (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 service_id uuid not null references public.business_catalogue(id) on delete restrict,
 version integer not null default 1 check(version>0),
 model text not null check(model in ('fixed_per_worker','percentage_pool')),
 rate_cents integer check(rate_cents>=0),
 basis_points integer check(basis_points between 0 and 10000),
 cap_cents integer check(cap_cents>=0),
 max_minutes integer check(max_minutes between 15 and 1440),
 basis_definition text not null default '' check(length(basis_definition)<=1000),
 allocation text check(allocation='equal'),
 rounding text check(rounding in ('half_up','floor')),
 last_actor uuid not null references auth.users(id),
 updated_at timestamptz not null default clock_timestamp(),
 unique(business_id,service_id),
 check((model='fixed_per_worker' and basis_points is null and cap_cents is null and basis_definition='' and allocation is null and rounding is null)
   or (model='percentage_pool' and rate_cents is null))
);
alter table public.business_earnings_rules enable row level security;
revoke all on public.business_earnings_rules from public,anon,authenticated;
grant select,insert,update on public.business_earnings_rules to authenticated;
create policy earnings_rules_read on public.business_earnings_rules for select to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_earnings_rules.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager') and m.status='active' and b.status='active'));
create policy earnings_rules_insert on public.business_earnings_rules for insert to authenticated with check(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_earnings_rules.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy earnings_rules_update on public.business_earnings_rules for update to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_earnings_rules.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_earnings_rules.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create function audit.validate_earnings_rule() returns trigger language plpgsql security invoker set search_path='' as $rule$
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.business_id<>old.business_id or new.service_id<>old.service_id then raise exception 'Earnings rule identity is immutable'; end if;
  new.version:=old.version+1;
 else new.version:=1;
 end if;
 if not exists(select 1 from public.business_catalogue c where c.id=new.service_id and c.business_id=new.business_id and c.kind='service') then raise exception 'Earnings service scope mismatch'; end if;
 new.last_actor:=auth.uid();new.updated_at:=clock_timestamp();return new;
end;
$rule$;
revoke all on function audit.validate_earnings_rule() from public,anon,authenticated;
create trigger earnings_rule_validate before insert or update on public.business_earnings_rules for each row execute function audit.validate_earnings_rule();
alter table audit.events drop constraint events_entity_table_check;
alter table audit.events add constraint events_entity_table_check check(entity_table in ('businesses','business_memberships','business_settings','business_catalogue','business_customers','customer_addresses','one_off_bookings','staff_profiles','staff_teams','recurring_schedules','business_quotes','quote_invoice_handoffs','business_invoices','business_accounting_connections','business_earnings_rules'));
-- Narrow audit-only bridge. No direct source mutation or client-callable definer API.
create function audit.capture_earnings_rule() returns trigger language plpgsql security definer set search_path='' as $audit$
begin
 if tg_table_schema<>'public' or tg_table_name<>'business_earnings_rules' or tg_op not in ('INSERT','UPDATE') then raise exception 'Unsupported audit source'; end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record)
 values(new.business_id,auth.uid(),coalesce(nullif(current_setting('role',true),'none'),session_user),tg_table_name,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end;
$audit$;
revoke all on function audit.capture_earnings_rule() from public,anon,authenticated;
create trigger earnings_rule_audit after insert or update on public.business_earnings_rules for each row execute function audit.capture_earnings_rule();
commit;
