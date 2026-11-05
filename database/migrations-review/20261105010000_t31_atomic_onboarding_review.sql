-- T31 PROPOSED ATOMIC MIGRATION. REVIEW ONLY, NOT AUTHORISED FOR STAGING.
-- Derived from the 3 source-only SQL candidates, with the individual transactions
-- removed. The entire change is applied or rolled back as a unit.
-- A failed SQL statement MUST NOT leave newly created roles, tables or policies.
-- Original staged identity, audit and T19 permissions must remain unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';
do $t31_gate$
begin
 if to_regnamespace('private_t31') is not null
 or to_regclass('public.t31_business_branding') is not null
 or exists(select 1 from pg_roles where rolname in ('t31_bootstrap','t31_invite_worker'))
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname like 't31_%')
 then raise exception 'T31 preexisting objects: stop for owner review' using errcode='55000'; end if;
 if to_regclass('public.businesses') is null or to_regclass('public.business_memberships') is null
 or to_regclass('audit.events') is null or to_regclass('auth.users') is null
 then raise exception 'T31 missing baseline dependency' using errcode='55000'; end if;
end
$t31_gate$;

-- BEGIN SOURCE: database/t31-provisioning-candidate.sql
-- T31 SOURCE-ONLY migration candidate: NOT applied to staging/production.
-- Requires isolated PG review, permission tests, migration generation and owner authorisation.
-- Depends on identity-draft.sql + audit-draft.sql and their deployed equivalents.
create schema if not exists private_t31;
revoke all on schema private_t31 from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='t31_bootstrap') then
    create role t31_bootstrap nologin noinherit;
  end if;
end $$;
grant usage on schema public, audit, private_t31, auth to t31_bootstrap;
-- Supabase Auth helper functions are invoked under this dedicated execution role.
grant execute on function auth.uid(), auth.jwt() to t31_bootstrap;
grant select(id,email_confirmed_at) on auth.users to t31_bootstrap;
-- Required for ALTER FUNCTION OWNER, revoked after ownership transfer.
grant create on schema private_t31 to t31_bootstrap;
grant select,insert on public.businesses, public.business_memberships to t31_bootstrap;
grant insert on audit.events to t31_bootstrap;
-- Identity audit trigger runs as invoker; RLS must allow its narrowly scoped writes.
create policy t31_identity_audit on audit.events for insert to t31_bootstrap
 with check(entity_table in ('businesses','business_memberships') and operation='INSERT' and actor_user_id=auth.uid());
create table private_t31.t31_provision_requests (
  actor_user_id uuid not null references auth.users(id),
  request_id uuid not null,
  business_name text not null,
  business_id uuid,
  created_at timestamptz not null default now(),
  primary key(actor_user_id,request_id),
  unique(business_id)
);
alter table private_t31.t31_provision_requests enable row level security;
revoke all on private_t31.t31_provision_requests from public, anon, authenticated;
grant select,insert,update on private_t31.t31_provision_requests to t31_bootstrap;
-- A non-BYPASSRLS execution role can insert only, never change existing tenant identity.
create policy t31_insert_business on public.businesses for insert to t31_bootstrap
  with check(industry='cleaning' and status='active');
create policy t31_read_new_business on public.businesses for select to t31_bootstrap
  using(exists(select 1 from public.business_memberships m where m.business_id=businesses.id and m.user_id=auth.uid() and m.role='owner' and m.status='active'));
create policy t31_insert_owner on public.business_memberships for insert to t31_bootstrap
  with check(user_id=auth.uid() and role='owner' and status='active');
create policy t31_read_membership on public.business_memberships for select to t31_bootstrap
  using(user_id=auth.uid());
create policy t31_requests_all on private_t31.t31_provision_requests for all to t31_bootstrap
  using(actor_user_id=auth.uid()) with check(actor_user_id=auth.uid());
create function private_t31.t31_provision_business(p_name text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_name text; v_business uuid; v_saved private_t31.t31_provision_requests%rowtype;
begin
  v_actor:=auth.uid();
  if v_actor is null or (coalesce(auth.jwt()->>'is_anonymous','false'))='true' then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  if not exists(select 1 from auth.users u where u.id=v_actor and u.email_confirmed_at is not null) then
    raise exception 'Verified email required' using errcode='42501';
  end if;
  v_name:=btrim(p_name);
  if p_name is null or p_name<>v_name or length(v_name) not between 1 and 160
    or v_name ~ '[[:cntrl:]]' or p_request_id is null then
    raise exception 'Invalid business registration' using errcode='22023';
  end if;
  -- The unique key serializes competing requests. ON CONFLICT waits for the winning transaction.
  insert into private_t31.t31_provision_requests(actor_user_id,request_id,business_name)
  values(v_actor,p_request_id,v_name) on conflict(actor_user_id,request_id) do nothing;
  select * into strict v_saved from private_t31.t31_provision_requests
   where actor_user_id=v_actor and request_id=p_request_id for update;
  if v_saved.business_name<>v_name then raise exception 'Request identifier reused with different business details' using errcode='23505'; end if;
  if v_saved.business_id is not null then return v_saved.business_id; end if;
  -- Explicit UUID avoids RETURNING, whose SELECT RLS cannot see the tenant until membership exists.
  v_business:=gen_random_uuid();
  insert into public.businesses(id,name,industry,status) values(v_business,v_name,'cleaning','active');
  insert into public.business_memberships(business_id,user_id,role,status) values(v_business,v_actor,'owner','active');
  update private_t31.t31_provision_requests set business_id=v_business
   where actor_user_id=v_actor and request_id=p_request_id;
  return v_business;
end $$;
alter function private_t31.t31_provision_business(text,uuid) owner to t31_bootstrap;
revoke create on schema private_t31 from t31_bootstrap;
revoke all on function private_t31.t31_provision_business(text,uuid) from public,anon,authenticated;
grant usage on schema private_t31 to authenticated;
grant execute on function private_t31.t31_provision_business(text,uuid) to authenticated;
-- Exposed API wrapper remains SECURITY INVOKER; privileges are narrow and per-request.
create function public.t31_provision_business(p_name text,p_request_id uuid)
returns uuid language sql security invoker set search_path=''
as $$ select private_t31.t31_provision_business(p_name,p_request_id) $$;
revoke all on function public.t31_provision_business(text,uuid) from public,anon,authenticated;
grant execute on function public.t31_provision_business(text,uuid) to authenticated;
-- END SOURCE: database/t31-provisioning-candidate.sql


-- BEGIN SOURCE: database/t31-branding-candidate.sql
-- T31 branding candidate, unapplied. Owner-scoped settings and separate immutable audit.
create table public.t31_business_branding (
 business_id uuid primary key references public.businesses(id) on delete restrict,
 accent_color text not null default '#146C94' check(accent_color ~ '^#[0-9A-F]{6}$'),
 logo_url text not null default '' check(length(logo_url)<=500 and
 (logo_url='' or (logo_url ~ '^https://[a-zA-Z0-9.-]+(:[0-9]{2,5})?/[a-zA-Z0-9_./%~?=&-]+$' and position('..' in logo_url)=0))),
 version integer not null default 1 check(version>=1)
);
alter table public.t31_business_branding enable row level security;
revoke all on public.t31_business_branding from public,anon,authenticated;
grant select,insert,update on public.t31_business_branding to authenticated;
create policy t31_brand_owner_read on public.t31_business_branding for select to authenticated using (
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy t31_brand_owner_insert on public.t31_business_branding for insert to authenticated with check (
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy t31_brand_owner_update on public.t31_business_branding for update to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create table private_t31.brand_audit (
 id bigint generated always as identity primary key,
 business_id uuid not null, actor_user_id uuid not null,
 old_value jsonb, new_value jsonb, occurred_at timestamptz not null default now()
);
alter table private_t31.brand_audit enable row level security;
revoke all on private_t31.brand_audit from public,anon,authenticated;
create function private_t31.capture_brand() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema<>'public' or tg_table_name<>'t31_business_branding' then raise exception 'Unexpected audit source'; end if;
 if tg_op='UPDATE' and (old.business_id<>new.business_id or new.version<>old.version) then
  raise exception 'Branding identity/version is immutable';end if;
 insert into private_t31.brand_audit(business_id,actor_user_id,old_value,new_value)
 values(new.business_id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function private_t31.capture_brand() from public,anon,authenticated;
create trigger t31_brand_audit after insert or update on public.t31_business_branding
for each row execute function private_t31.capture_brand();
-- END SOURCE: database/t31-branding-candidate.sql


-- BEGIN SOURCE: database/t31-staff-invitations-candidate.sql
-- T31 invitation candidate. Unapplied, no outbound email. Depends on identity, audit, T31 provisioning.
create role t31_invite_worker nologin noinherit;
grant usage on schema public, auth, audit, private_t31 to t31_invite_worker;
grant select on public.businesses,public.business_memberships to t31_invite_worker;
grant insert on public.business_memberships,audit.events to t31_invite_worker;
grant update(status) on public.business_memberships to t31_invite_worker;
grant select(id,email,email_confirmed_at) on auth.users to t31_invite_worker;
grant execute on function auth.uid(),auth.jwt() to t31_invite_worker;
create table private_t31.invitations(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 inviter_user_id uuid not null references auth.users(id),
 recipient_email text not null check(length(recipient_email) between 3 and 254),
 role text not null check(role in ('manager','staff')),
 token_hash text not null unique,
 state text not null default 'pending' check(state in ('pending','accepted','revoked')),
 expires_at timestamptz not null,
 accepted_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(business_id,recipient_email,role,id)
);
alter table private_t31.invitations enable row level security;
revoke all on private_t31.invitations from public,anon,authenticated;
grant select,insert,update on private_t31.invitations to t31_invite_worker;
create policy t31_invite_worker_records on private_t31.invitations for all to t31_invite_worker using(true) with check(true);
create policy t31_invite_worker_business_read on public.businesses for select to t31_invite_worker using(true);
create policy t31_invite_worker_membership_read on public.business_memberships for select to t31_invite_worker using(true);
create policy t31_invite_worker_membership_insert on public.business_memberships for insert to t31_invite_worker
 with check(user_id=auth.uid() and role in ('staff','manager') and status='active');
create policy t31_invite_worker_membership_suspend on public.business_memberships for update to t31_invite_worker
 using(role in ('manager','staff') and status='active')
 with check(role in ('manager','staff') and status='suspended');
create policy t31_invite_worker_audit on audit.events for insert to t31_invite_worker
 with check(entity_table='business_memberships' and operation in ('INSERT','UPDATE') and actor_user_id=auth.uid());
create table private_t31.invitation_audit (
 id uuid primary key default gen_random_uuid(), business_id uuid not null,
 actor_user_id uuid not null, invitation_id uuid not null,
 action text not null check(action in ('created','accepted','revoked')),
 occurred_at timestamptz not null default clock_timestamp()
);
revoke all on private_t31.invitation_audit from public,anon,authenticated;
grant insert on private_t31.invitation_audit to t31_invite_worker;
create policy t31_invite_worker_audit_insert on private_t31.invitation_audit for insert to t31_invite_worker
 with check(actor_user_id=auth.uid());
alter table private_t31.invitation_audit enable row level security;

create function private_t31.create_invitation(p_business uuid,p_email text,p_role text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; token uuid; inv_id uuid;
begin
 actor:=auth.uid();
 if actor is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Authentication required' using errcode='28000';end if;
 if p_role not in ('staff','manager') or p_email is null or length(p_email) not between 3 and 254
 or p_email<>lower(btrim(p_email)) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
 raise exception 'Invalid invitation details' using errcode='22023';end if;
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 token:=gen_random_uuid();
 insert into private_t31.invitations(business_id,inviter_user_id,recipient_email,role,token_hash,expires_at)
 values(p_business,actor,p_email,p_role,md5(token::text),now()+interval '7 days') returning id into inv_id;
 insert into private_t31.invitation_audit(business_id,actor_user_id,invitation_id,action)
 values(p_business,actor,inv_id,'created');
 return token;
end $$;

create function private_t31.accept_invitation(p_token uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; v_email text; i private_t31.invitations%rowtype;
begin
 actor:=auth.uid();
 if actor is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Authentication required' using errcode='28000';end if;
 select lower(email) into v_email from auth.users where id=actor and email_confirmed_at is not null;
 if v_email is null then raise exception 'Verified email required' using errcode='42501';end if;
 select * into i from private_t31.invitations where token_hash=md5(p_token::text) for update;
 if not found or i.recipient_email<>v_email or i.state='revoked' or i.expires_at<=now()
 then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if i.state='accepted' then
   if i.accepted_user_id<>actor or not exists(select 1 from public.business_memberships m
     where m.business_id=i.business_id and m.user_id=actor and m.role=i.role and m.status='active')
   then raise exception 'Invitation unavailable' using errcode='42501';end if;
   return i.business_id;
 end if;
 if not exists(select 1 from public.businesses where id=i.business_id and status='active')
 then raise exception 'Business unavailable' using errcode='42501';end if;
 if exists(select 1 from public.business_memberships where business_id=i.business_id and user_id=actor)
 then raise exception 'Membership already exists' using errcode='23505';end if;
 insert into public.business_memberships(business_id,user_id,role,status)
 values(i.business_id,actor,i.role,'active');
 update private_t31.invitations set state='accepted',accepted_user_id=actor where id=i.id;
 insert into private_t31.invitation_audit(business_id,actor_user_id,invitation_id,action)
 values(i.business_id,actor,i.id,'accepted');
 return i.business_id;
end $$;

create function private_t31.staff_members(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=auth.uid();
 if actor is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'status',m.status) order by m.user_id)
 from public.business_memberships m where m.business_id=p_business),'[]'::jsonb);
end $$;

create function private_t31.suspend_member(p_business uuid,p_target uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=auth.uid();
 if actor is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 if p_target=actor then raise exception 'Cannot suspend owner' using errcode='42501';end if;
 update public.business_memberships set status='suspended'
 where business_id=p_business and user_id=p_target and role in ('staff','manager') and status='active';
 if not found then raise exception 'Active staff membership unavailable' using errcode='42501';end if;
 return true;
end $$;

grant create on schema private_t31 to t31_invite_worker;
alter function private_t31.create_invitation(uuid,text,text) owner to t31_invite_worker;
alter function private_t31.accept_invitation(uuid) owner to t31_invite_worker;
alter function private_t31.staff_members(uuid) owner to t31_invite_worker;
alter function private_t31.suspend_member(uuid,uuid) owner to t31_invite_worker;
revoke create on schema private_t31 from t31_invite_worker;
revoke all on function private_t31.create_invitation(uuid,text,text),private_t31.accept_invitation(uuid),private_t31.staff_members(uuid),private_t31.suspend_member(uuid,uuid) from public,anon,authenticated;
grant usage on schema private_t31 to authenticated;
grant execute on function private_t31.create_invitation(uuid,text,text),private_t31.accept_invitation(uuid),private_t31.staff_members(uuid),private_t31.suspend_member(uuid,uuid) to authenticated;
create function public.t31_invite_staff(p_business uuid,p_email text,p_role text)
 returns uuid language sql security invoker set search_path=''
 as $$ select private_t31.create_invitation(p_business,p_email,p_role) $$;
create function public.t31_accept_invite(p_token uuid)
 returns uuid language sql security invoker set search_path=''
 as $$ select private_t31.accept_invitation(p_token) $$;
revoke all on function public.t31_invite_staff(uuid,text,text),public.t31_accept_invite(uuid) from public,anon,authenticated;
grant execute on function public.t31_invite_staff(uuid,text,text),public.t31_accept_invite(uuid) to authenticated;
create function public.t31_staff_members(p_business uuid)
 returns jsonb language sql security invoker set search_path=''
 as $$ select private_t31.staff_members(p_business) $$;
create function public.t31_suspend_member(p_business uuid,p_user uuid)
 returns boolean language sql security invoker set search_path=''
 as $$ select private_t31.suspend_member(p_business,p_user) $$;
revoke all on function public.t31_staff_members(uuid),public.t31_suspend_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.t31_staff_members(uuid),public.t31_suspend_member(uuid,uuid) to authenticated;
-- END SOURCE: database/t31-staff-invitations-candidate.sql

commit;
