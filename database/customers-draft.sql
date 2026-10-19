-- T13 business-owned customer records and multiple addresses. Staging only.
begin;
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
commit;
