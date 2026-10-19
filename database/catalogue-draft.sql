-- T12 catalogue. Depends on identity, audit and business-settings foundations.
begin;
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
commit;
