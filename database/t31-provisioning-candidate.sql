-- T31 SOURCE-ONLY migration candidate: NOT applied to staging/production.
-- Requires isolated PG review, permission tests, migration generation and owner authorisation.
-- Depends on identity-draft.sql + audit-draft.sql and their deployed equivalents.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='t31_bootstrap') then
    create role t31_bootstrap nologin noinherit;
  end if;
end $$;
grant usage on schema public, audit, private to t31_bootstrap;
grant select,insert on public.businesses, public.business_memberships to t31_bootstrap;
grant insert on audit.events to t31_bootstrap;
create table private.t31_provision_requests (
  actor_user_id uuid not null references auth.users(id),
  request_id uuid not null,
  business_name text not null,
  business_id uuid,
  created_at timestamptz not null default now(),
  primary key(actor_user_id,request_id),
  unique(business_id)
);
alter table private.t31_provision_requests enable row level security;
revoke all on private.t31_provision_requests from public, anon, authenticated;
grant select,insert,update on private.t31_provision_requests to t31_bootstrap;
-- A non-BYPASSRLS execution role can insert only, never change existing tenant identity.
create policy t31_insert_business on public.businesses for insert to t31_bootstrap
  with check(industry='cleaning' and status='active');
create policy t31_read_new_business on public.businesses for select to t31_bootstrap
  using(exists(select 1 from public.business_memberships m where m.business_id=businesses.id and m.user_id=auth.uid() and m.role='owner' and m.status='active'));
create policy t31_insert_owner on public.business_memberships for insert to t31_bootstrap
  with check(user_id=auth.uid() and role='owner' and status='active');
create policy t31_read_membership on public.business_memberships for select to t31_bootstrap
  using(user_id=auth.uid());
create policy t31_requests_all on private.t31_provision_requests for all to t31_bootstrap
  using(actor_user_id=auth.uid()) with check(actor_user_id=auth.uid());
create function private.t31_provision_business(p_name text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid; v_name text; v_business uuid; v_saved private.t31_provision_requests%rowtype;
begin
  v_actor:=auth.uid();
  if v_actor is null or (coalesce(auth.jwt()->>'is_anonymous','false'))='true' then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  v_name:=btrim(p_name);
  if p_name is null or p_name<>v_name or length(v_name) not between 1 and 160
    or v_name ~ '[[:cntrl:]]' or p_request_id is null then
    raise exception 'Invalid business registration' using errcode='22023';
  end if;
  -- The unique key serializes competing requests. ON CONFLICT waits for the winning transaction.
  insert into private.t31_provision_requests(actor_user_id,request_id,business_name)
  values(v_actor,p_request_id,v_name) on conflict(actor_user_id,request_id) do nothing;
  select * into strict v_saved from private.t31_provision_requests
   where actor_user_id=v_actor and request_id=p_request_id for update;
  if v_saved.business_name<>v_name then raise exception 'Request identifier reused with different business details' using errcode='23505'; end if;
  if v_saved.business_id is not null then return v_saved.business_id; end if;
  insert into public.businesses(name,industry,status) values(v_name,'cleaning','active') returning id into v_business;
  insert into public.business_memberships(business_id,user_id,role,status) values(v_business,v_actor,'owner','active');
  update private.t31_provision_requests set business_id=v_business
   where actor_user_id=v_actor and request_id=p_request_id;
  return v_business;
end $$;
alter function private.t31_provision_business(text,uuid) owner to t31_bootstrap;
revoke all on function private.t31_provision_business(text,uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.t31_provision_business(text,uuid) to authenticated;
-- Exposed API wrapper remains SECURITY INVOKER; privileges are narrow and per-request.
create function public.t31_provision_business(p_name text,p_request_id uuid)
returns uuid language sql security invoker set search_path=''
as $$ select private.t31_provision_business(p_name,p_request_id) $$;
revoke all on function public.t31_provision_business(text,uuid) from public,anon,authenticated;
grant execute on function public.t31_provision_business(text,uuid) to authenticated;
commit;
