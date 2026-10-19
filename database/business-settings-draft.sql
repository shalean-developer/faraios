-- T12 first increment. Requires identity and audit foundations. No production deployment.
begin;
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
commit;
