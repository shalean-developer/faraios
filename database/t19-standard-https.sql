-- HTTPS storage candidate. Apply only after the base private token/state schema.
-- No backend principal is enrolled here; an empty allowlist denies every caller.
begin;
create table private_t19_standard.backend_businesses(
 user_id uuid not null references auth.users(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 environment text not null check(environment='staging'),enabled boolean not null default false,
 primary key(user_id,business_id,environment)
);
create table private_t19_standard.operation_leases(
 environment text not null check(environment='staging'),business_id uuid not null references public.businesses(id),
 holder uuid not null,principal uuid not null references auth.users(id),expires_at timestamptz not null,
 released boolean not null default false,primary key(environment,business_id)
);
alter table private_t19_standard.backend_businesses enable row level security;
alter table private_t19_standard.operation_leases enable row level security;
revoke all on private_t19_standard.backend_businesses,private_t19_standard.operation_leases from public,anon,authenticated,service_role;
grant select on private_t19_standard.backend_businesses to t19_standard_backend;
grant select,insert,update on private_t19_standard.operation_leases to t19_standard_backend;
create policy standard_backend_staging on private_t19_standard.backend_businesses to t19_standard_backend using(environment='staging');
create policy standard_backend_staging on private_t19_standard.operation_leases to t19_standard_backend using(environment='staging') with check(environment='staging');
grant usage on schema auth,public to t19_standard_backend;
grant execute on function auth.uid(),auth.jwt() to t19_standard_backend;
-- Boolean session checker avoids granting the runtime managed-auth table reads.
create function private_t19_standard.live_backend_session() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id' and(s.not_after is null or s.not_after>clock_timestamp()))
 and not exists(select 1 from public.business_memberships m where m.user_id=auth.uid() and m.status='active')
$$;
revoke all on function private_t19_standard.live_backend_session() from public,anon,authenticated,service_role;
grant execute on function private_t19_standard.live_backend_session() to t19_standard_backend;
grant select(id,status) on public.businesses to t19_standard_backend;
grant select(business_id,user_id,role,status) on public.business_memberships to t19_standard_backend;
-- Narrow owner checks need visibility for this backend-only function role.
create policy standard_active_business_check on public.businesses for select to t19_standard_backend using(status='active');
create policy standard_owner_membership_check on public.business_memberships for select to t19_standard_backend using(status='active' and role='owner');
create function private_t19_standard.https_store(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare principal uuid:=auth.uid();business uuid;env text;state_row private_t19_standard.oauth_states;
 c private_t19_standard.connections;v jsonb;lease_row private_t19_standard.operation_leases;n integer;ms bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 if principal is null or jsonb_typeof(p)<>'object' or pg_catalog.octet_length(p::text)>131072
  or not private_t19_standard.live_backend_session()
 then raise exception 'accounting_store_denied' using errcode='42501';end if;
 if action='health' then
  return jsonb_build_object('ready',exists(select 1 from private_t19_standard.backend_businesses m join public.businesses b on b.id=m.business_id where m.user_id=principal and m.enabled and m.environment='staging' and b.status='active'));
 end if;
 if action in ('state','consume','resolve') then
  select * into state_row from private_t19_standard.oauth_states where digest=p->>'digest';
  if not found then
   -- Even missing-state reads require a registered backend; humans cannot use it as an oracle.
   if action='state' and exists(select 1 from private_t19_standard.backend_businesses where user_id=principal and enabled) then return null;end if;
   raise exception 'accounting_store_denied' using errcode='42501';
  end if;
  business:=state_row.business_id;env:=state_row.environment;
 else business:=(p->>'businessId')::uuid;env:=p->>'environment';end if;
 if env is distinct from 'staging' or not exists(select 1 from private_t19_standard.backend_businesses m join public.businesses b on b.id=m.business_id where m.user_id=principal and m.business_id=business and m.environment=env and m.enabled and b.status='active')
 then raise exception 'accounting_store_denied' using errcode='42501';end if;
 if action in ('begin','consume') and not exists(select 1 from public.business_memberships where business_id=business and user_id=(p->>'actor')::uuid and status='active' and role='owner')
 then raise exception 'accounting_store_denied' using errcode='42501';end if;
 if action='begin' then
  perform pg_advisory_xact_lock(hashtextextended(env||':'||business::text,31));
  if p->>'organizationId' !~ '^[0-9]{1,30}$' or p->>'digest' !~ '^[0-9a-f]{64}$' or p->>'sessionDigest' !~ '^[0-9a-f]{64}$'
   or exists(select 1 from private_t19_standard.connections where environment=env and business_id=business and status<>'disconnected') then raise exception 'accounting_store_denied' using errcode='42501';end if;
  update private_t19_standard.oauth_states set resolved=true where environment=env and business_id=business and not consumed and expires_at<=ms;
  insert into private_t19_standard.oauth_states(digest,session_digest,actor,business_id,environment,organization_id,expires_at)
   values(p->>'digest',p->>'sessionDigest',(p->>'actor')::uuid,business,env,p->>'organizationId',ms+300000);return '{}'::jsonb;
 elsif action='state' then
  if state_row.consumed or state_row.resolved or state_row.expires_at<=ms then return null;end if;
  return jsonb_build_object('sessionDigest',state_row.session_digest,'actor',state_row.actor,'businessId',business,'environment',env,'organizationId',state_row.organization_id,'expiresAt',state_row.expires_at);
 elsif action='consume' then
  update private_t19_standard.oauth_states set consumed=true where digest=state_row.digest and actor=(p->>'actor')::uuid and session_digest=p->>'sessionDigest' and expires_at>ms and not consumed and not resolved;
  get diagnostics n=row_count;if n<>1 then raise exception 'accounting_store_denied' using errcode='42501';end if;return '{}'::jsonb;
 elsif action='acquire' then
  insert into private_t19_standard.operation_leases(environment,business_id,holder,principal,expires_at,released)
   values(env,business,(p->>'lease')::uuid,principal,clock_timestamp()+interval '120 seconds',false)
   on conflict(environment,business_id) do update set holder=excluded.holder,principal=excluded.principal,expires_at=excluded.expires_at,released=false
   where private_t19_standard.operation_leases.released;
  get diagnostics n=row_count;if n<>1 then raise exception 'accounting_operation_busy' using errcode='55000';end if;
  return '{}'::jsonb;
 elsif action='connection' then
  select * into c from private_t19_standard.connections where environment=env and business_id=business;
  if not found then return null;end if;
  return jsonb_build_object('environment',c.environment,'businessId',c.business_id,'connectionId',c.connection_id,'generation',c.generation,'organizationId',c.organization_id,'apiDomain',c.api_domain,'clientId',c.client_id,'status',c.status,'envelope',c.envelope,'organization',c.organization);
 end if;
 -- Every mutation beyond state consumption is fenced by a durable, scoped lease.
 select * into lease_row from private_t19_standard.operation_leases where environment=env and business_id=business for update;
 if not found or lease_row.holder is distinct from (p->>'lease')::uuid or lease_row.principal<>principal or lease_row.released or lease_row.expires_at<=clock_timestamp()
 then raise exception 'accounting_lease_denied' using errcode='42501';end if;
 if action='guard' then return '{}'::jsonb;
 elsif action='release' then
  update private_t19_standard.operation_leases set released=true where environment=env and business_id=business;return '{}'::jsonb;
 elsif action='resolve' then
  if not state_row.consumed or state_row.resolved then raise exception 'accounting_store_denied' using errcode='42501';end if;
  update private_t19_standard.oauth_states set resolved=true where digest=state_row.digest;return '{}'::jsonb;
 end if;
 v:=p->'connection';
 if jsonb_typeof(v)<>'object' or v->>'environment' is distinct from env or (v->>'businessId')::uuid is distinct from business then raise exception 'accounting_store_denied' using errcode='42501';end if;
 if action='save' then
  if v->>'status'<>'revocation_pending' or v->>'organizationId' !~ '^[0-9]{1,30}$' or v->>'apiDomain'<>'https://www.zohoapis.com' or jsonb_typeof(v->'envelope')<>'object'
   or (v->>'generation')::integer is distinct from (p->>'previous')::integer+1 then raise exception 'accounting_store_denied' using errcode='42501';end if;
  insert into private_t19_standard.connections(environment,business_id,connection_id,generation,organization_id,api_domain,client_id,status,envelope)
   values(env,business,(v->>'connectionId')::uuid,(v->>'generation')::integer,v->>'organizationId',v->>'apiDomain',v->>'clientId','revocation_pending',v->'envelope')
   on conflict(environment,business_id) do update set generation=excluded.generation,organization_id=excluded.organization_id,api_domain=excluded.api_domain,client_id=excluded.client_id,status=excluded.status,envelope=excluded.envelope,organization=null
   where private_t19_standard.connections.generation=(p->>'previous')::integer and private_t19_standard.connections.status='disconnected' and private_t19_standard.connections.connection_id=excluded.connection_id;
 else
  select * into c from private_t19_standard.connections where environment=env and business_id=business for update;
  if not found or c.connection_id is distinct from (v->>'connectionId')::uuid or c.generation<>(v->>'generation')::integer or c.organization_id is distinct from v->>'organizationId'
   or c.api_domain is distinct from v->>'apiDomain' or c.client_id is distinct from v->>'clientId' then raise exception 'accounting_store_denied' using errcode='42501';end if;
  if action='publish' then
   if p->'organization'->>'id' is distinct from c.organization_id or p->'organization'->>'currency' is distinct from 'ZAR' or jsonb_typeof(p->'organization'->'name')<>'string' then raise exception 'accounting_store_denied' using errcode='42501';end if;
   update private_t19_standard.connections set status='connected',organization=p->'organization' where environment=env and business_id=business and status='revocation_pending';
  elsif action='refresh' then
   if jsonb_typeof(p->'envelope')<>'object' then raise exception 'accounting_store_denied' using errcode='42501';end if;
   update private_t19_standard.connections set envelope=p->'envelope' where environment=env and business_id=business and status='connected';
  elsif action='disable' then update private_t19_standard.connections set status='revocation_pending' where environment=env and business_id=business and envelope is not null;
  elsif action='revoked' then update private_t19_standard.connections set status='disconnected',envelope=null where environment=env and business_id=business and status='revocation_pending';
  else raise exception 'accounting_store_denied' using errcode='42501';end if;
 end if;
 get diagnostics n=row_count;if n<>1 then raise exception 'accounting_store_denied' using errcode='42501';end if;return '{}'::jsonb;
end$$;
-- SECURITY INVOKER wrapper delegates only to the guarded private function.
create function public.t19_standard_store(action text,input jsonb) returns jsonb language sql security invoker set search_path=''
 as $$select private_t19_standard.https_store(action,input)$$;
revoke all on function private_t19_standard.https_store(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private_t19_standard.https_store(text,jsonb) to authenticated;
grant create on schema private_t19_standard to t19_standard_backend;
grant t19_standard_backend to current_user with set true,inherit false;
alter function private_t19_standard.https_store(text,jsonb) owner to t19_standard_backend;
revoke create on schema private_t19_standard from t19_standard_backend;
grant t19_standard_backend to current_user with set false,inherit false;
revoke all on function public.t19_standard_store(text,jsonb) from public,anon,authenticated,service_role;
grant usage on schema private_t19_standard to authenticated;
grant execute on function public.t19_standard_store(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
