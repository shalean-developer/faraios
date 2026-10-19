-- T15: business-owned profiles and reusable teams; no membership grants.
begin;
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
commit;
