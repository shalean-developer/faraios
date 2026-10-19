-- T11 audit foundation. Apply only to isolated FaraiOS staging after local validation.
begin;
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
commit;
