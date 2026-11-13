begin;
create schema staff_private;
revoke all on schema staff_private from public;
create table staff_private.ingress(environment text primary key check(environment in ('preview','live')),enabled boolean not null);
insert into staff_private.ingress values('preview',true),('live',false);
alter table staff_private.ingress enable row level security;
revoke all on staff_private.ingress from public,anon,authenticated;
create function staff_private.owner(p_business uuid,p_environment text) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) or not exists(select 1 from staff_private.ingress where environment=p_environment and enabled) then raise exception 'Staff unavailable.';end if;
end$$;
create table public.business_staff(
 id uuid primary key,business_id uuid not null references public.businesses(id) on delete restrict,environment text not null check(environment in ('preview','live')),
 name text not null check(char_length(btrim(name)) between 2 and 120 and name !~ '[\u0001-\u001f\u007f]'),
 email text not null check(char_length(email)<=254 and (email='' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 phone text not null check(phone='' or (phone ~ '^[+0-9 ()-]{5,40}$' and char_length(regexp_replace(phone,'[^0-9]','','g'))>=5)),
 active boolean not null default true,version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,business_id,environment)
);
alter table public.business_bookings add unique(id,business_id,environment);
create table public.business_booking_staff(
 booking_id uuid not null,staff_id uuid not null,business_id uuid not null,environment text not null,
 primary key(booking_id,staff_id),
 foreign key(booking_id,business_id,environment) references public.business_bookings(id,business_id,environment) on delete restrict,
 foreign key(staff_id,business_id,environment) references public.business_staff(id,business_id,environment) on delete restrict
);
create index booking_staff_member on public.business_booking_staff(staff_id,booking_id);
alter table public.business_bookings add column assignment_version integer not null default 0;
alter table public.business_staff enable row level security;
alter table public.business_booking_staff enable row level security;
revoke all on public.business_staff,public.business_booking_staff from public,anon,authenticated;
grant select on public.business_staff,public.business_booking_staff to authenticated;
create policy staff_owner on public.business_staff for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)));
create policy assignment_owner on public.business_booking_staff for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)));
create function staff_private.write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_name text,p_email text,p_phone text,p_active boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.business_staff;
begin
 perform staff_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,91));
 if p_id is null or p_version is null or p_version<0 or p_name is null or char_length(btrim(p_name)) not between 2 and 120 or p_name ~ '[\u0001-\u001f\u007f]' or p_email is null or char_length(p_email)>254 or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or p_phone is null or (p_phone<>'' and (p_phone !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(p_phone,'[^0-9]','','g'))<5)) or p_active is null then raise exception 'Check staff details.';end if;
 select * into s from public.business_staff where id=p_id for update;
 if (s.id is not null and (s.business_id<>p_business or s.environment<>p_environment or s.version<>p_version)) or (s.id is null and p_version<>0) then raise exception 'Staff changed or unavailable. Reload before saving.';end if;
 if s.id is null then insert into public.business_staff(id,business_id,environment,name,email,phone,active) values(p_id,p_business,p_environment,btrim(p_name),btrim(p_email),btrim(p_phone),p_active);
 else update public.business_staff set name=btrim(p_name),email=btrim(p_email),phone=btrim(p_phone),active=p_active,version=version+1,updated_at=now() where id=p_id;end if;
 return jsonb_build_object('id',p_id);
end$$;
-- Independent optimistic version: assignment saves never update booking snapshots or schedule.
create function staff_private.assign(p_business uuid,p_environment text,p_booking uuid,p_version integer,p_staff jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.business_bookings;ids uuid[];
begin
 perform staff_private.owner(p_business,p_environment);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,91));
 select * into b from public.business_bookings where id=p_booking and business_id=p_business and environment=p_environment for update;
 if not found or p_version is distinct from b.assignment_version then raise exception 'Assignments changed or unavailable. Reload before saving.';end if;
 if jsonb_typeof(p_staff) is distinct from 'array' or jsonb_array_length(p_staff)>100 then raise exception 'Choose up to 100 staff members.';end if;
 if exists(select 1 from jsonb_array_elements(p_staff) x where jsonb_typeof(x)<>'string' or x#>>'{}' !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then raise exception 'Choose valid staff members.';end if;
 select coalesce(array_agg(distinct x::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(p_staff) x;
 if exists(select 1 from unnest(ids) i where not exists(select 1 from public.business_staff s where s.id=i and s.business_id=p_business and s.environment=p_environment and (s.active or exists(select 1 from public.business_booking_staff a where a.booking_id=p_booking and a.staff_id=s.id)))) then raise exception 'Choose active staff from this business. Existing inactive assignments may be retained.';end if;
 delete from public.business_booking_staff where booking_id=p_booking and not(staff_id=any(ids));
 insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) select p_booking,i,p_business,p_environment from unnest(ids)i on conflict do nothing;
 update public.business_bookings set assignment_version=assignment_version+1 where id=p_booking;
 return jsonb_build_object('id',p_booking);
end$$;
create view public.business_booking_schedule with(security_invoker=true) as
 select b.*,
 coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'active',s.active) order by lower(s.name),s.id) from public.business_booking_staff a join public.business_staff s on s.id=a.staff_id where a.booking_id=b.id),'[]'::jsonb) as assigned_staff,
 coalesce((select array_agg(a.staff_id) from public.business_booking_staff a where a.booking_id=b.id),'{}'::uuid[]) as staff_ids,
 coalesce((select jsonb_agg(distinct jsonb_build_object('booking_id',o.id,'staff_id',s.id,'name',s.name,'starts_at',o.starts_at,'duration_minutes',o.duration_minutes))
 from public.business_booking_staff a join public.business_booking_staff a2 on a2.staff_id=a.staff_id join public.business_bookings o on o.id=a2.booking_id join public.business_staff s on s.id=a.staff_id
 where a.booking_id=b.id and o.id<>b.id and o.business_id=b.business_id and o.environment=b.environment and b.status in ('Scheduled','In Progress') and o.status in ('Scheduled','In Progress')
 and b.starts_at<o.starts_at+o.duration_minutes*interval '1 minute' and o.starts_at<b.starts_at+b.duration_minutes*interval '1 minute'),'[]'::jsonb) as conflicts
 from public.business_bookings b;
revoke all on public.business_booking_schedule from public,anon,authenticated;
grant select on public.business_booking_schedule to authenticated;
revoke all on all functions in schema staff_private from public,anon,authenticated;
grant usage on schema staff_private to authenticated;
grant execute on function staff_private.write(uuid,text,uuid,integer,text,text,text,boolean),staff_private.assign(uuid,text,uuid,integer,jsonb) to authenticated;
create function public.business_staff_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_name text,p_email text,p_phone text,p_active boolean) returns jsonb language sql security invoker set search_path='' as $$select staff_private.write(p_business,p_environment,p_id,p_version,p_name,p_email,p_phone,p_active)$$;
create function public.business_staff_assign(p_business uuid,p_environment text,p_booking uuid,p_version integer,p_staff jsonb) returns jsonb language sql security invoker set search_path='' as $$select staff_private.assign(p_business,p_environment,p_booking,p_version,p_staff)$$;
revoke all on function public.business_staff_write(uuid,text,uuid,integer,text,text,text,boolean),public.business_staff_assign(uuid,text,uuid,integer,jsonb) from public,anon;
grant execute on function public.business_staff_write(uuid,text,uuid,integer,text,text,text,boolean),public.business_staff_assign(uuid,text,uuid,integer,jsonb) to authenticated;
commit;
