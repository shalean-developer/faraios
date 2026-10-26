-- REVIEW SOURCE ONLY, after t19-custody-runtime.sql. No credentials provisioned.
begin;
do $$ begin
 if current_setting('faraios.t19_runtime_review',true) is distinct from 'approved-source-test' then raise exception 'review context required';end if;
end $$;
create table private_t19_custody.oauth_clients(
 connection_id uuid primary key references private_t19_custody.connections(connection_id),
 client_reference uuid not null,redirect_uri text not null,identity_email text not null,user_id text not null,role_id text not null,
 currency text not null check(currency ~ '^[A-Z]{3}$'),permissions_review_reference text not null,
 approved boolean not null default false
);
create table private_t19_custody.oauth_states(
 digest text primary key check(digest ~ '^[0-9a-f]{64}$'),session_digest text not null,
 connection_id uuid not null references private_t19_custody.connections(connection_id),actor uuid not null,generation bigint not null,
 expires_at timestamptz not null,phase text not null check(phase in ('pending','exchanging','stored','connected','cleanup_required','cancelled')),
 reference uuid,evidence jsonb
);
create unique index custody_oauth_pending on private_t19_custody.oauth_states(connection_id) where phase in ('pending','exchanging','stored','cleanup_required');
create function private_t19_custody.oauth(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare c private_t19_custody.connections;cfg private_t19_custody.oauth_clients;s private_t19_custody.oauth_states;
 target uuid;secret jsonb;b jsonb;r uuid;owner_ok boolean;
begin
 if session_user<>'t19_hosted_custody' then raise exception 'custody_denied' using errcode='42501';end if;
 if action='begin' then target:=(p->>'connectionId')::uuid;
 else select connection_id into target from private_t19_custody.oauth_states where digest=p->>'digest';end if;
 select * into c from private_t19_custody.connections where connection_id=target for update;
 if not found then raise exception 'custody_denied';end if;
 owner_ok:=private_t19_custody.allowed(c.business_id,(p->>'actor')::uuid,true);
 if action<>'begin' then
  select * into s from private_t19_custody.oauth_states where digest=p->>'digest' for update;
  if s.actor is distinct from (p->>'actor')::uuid or s.session_digest is distinct from p->>'sessionDigest' then raise exception 'custody_denied';end if;
 end if;
 -- Preserve late/rejected grants for controlled cleanup even after owner revocation.
 if action='store' then
  if s.phase<>'exchanging' or jsonb_typeof(p->'material') is distinct from 'object' then raise exception 'stale';end if;
  b:=jsonb_set(jsonb_set(private_t19_custody.binding(c),'{generation}',to_jsonb(s.generation+1)),'{credential_version}','1');
  if p->'material'->'binding' is distinct from b then raise exception 'custody_denied';end if;
  r:=vault.create_secret((p->'material')::text);
  update private_t19_custody.oauth_states set reference=r,phase='stored' where digest=s.digest;
  return 'true';
 elsif action='reject' then
  update private_t19_custody.oauth_states set phase=case when phase='pending' then 'cancelled' else 'cleanup_required' end
   where digest=s.digest and phase in ('pending','exchanging','stored');return 'true';
 end if;
 if not owner_ok then raise exception 'custody_denied' using errcode='42501';end if;
 if action='check' then
  if s.phase<>'stored' or s.expires_at<=clock_timestamp() or s.generation<>c.generation or c.enabled then raise exception 'stale';end if;
  return 'true';
 end if;
 select * into cfg from private_t19_custody.oauth_clients where connection_id=c.connection_id and approved;
 if not found or length(cfg.permissions_review_reference)=0 then raise exception 'custody_denied';end if;
 if action='begin' then
  if c.enabled or c.status not in ('disconnected','reauthorisation_required') or c.business_id is distinct from (p->>'businessId')::uuid then raise exception 'stale';end if;
  if exists(select 1 from private_t19_custody.operations where connection_id=c.connection_id and phase='recovery_required') then raise exception 'recovery_review_required';end if;
  if exists(select 1 from private_t19_custody.revocations where connection_id=c.connection_id and phase<>'revoked') then raise exception 'revocation_required';end if;
  update private_t19_custody.oauth_states set phase='cancelled' where connection_id=c.connection_id and phase='pending' and expires_at<=clock_timestamp();
  insert into private_t19_custody.oauth_states(digest,session_digest,connection_id,actor,generation,expires_at,phase)
   values(p->>'digest',p->>'sessionDigest',c.connection_id,(p->>'actor')::uuid,c.generation,clock_timestamp()+interval '5 minutes','pending');
 elsif action='consume' then
  if s.phase<>'pending' or s.expires_at<=clock_timestamp() or s.generation<>c.generation then raise exception 'stale';end if;
  update private_t19_custody.oauth_states set phase='exchanging' where digest=s.digest;
 elsif action='publish' then
  if s.phase<>'stored' or s.reference is null or s.expires_at<=clock_timestamp() or s.generation<>c.generation
   or c.enabled or c.status not in ('disconnected','reauthorisation_required') then raise exception 'stale';end if;
  secret:=p->'evidence';
  if secret->>'organization_id' is distinct from c.organization_id or secret->>'user_id' is distinct from cfg.user_id
   or secret->>'role_id' is distinct from cfg.role_id or secret->>'identity_email' is distinct from cfg.identity_email
   or secret->>'currency' is distinct from cfg.currency then raise exception 'custody_denied';end if;
  update private_t19_custody.connections set generation=generation+1,credential_version=1,sealed_reference=s.reference,enabled=true,status='connected' where connection_id=c.connection_id;
  update public.business_accounting_connections set enabled=true,version=version+1,last_actor=s.actor,updated_at=clock_timestamp()
   where business_id=c.business_id and organization_id=c.organization_id and api_domain=c.api_domain and environment=c.environment;
  if not found then raise exception 'connection_binding_changed';end if;
  update private_t19_custody.oauth_states set phase='connected',evidence=secret where digest=s.digest;
  insert into private_t19_custody.events(business_id,connection_id,kind) values(c.business_id,c.connection_id,'owner_connected');
  return jsonb_build_object('status','connected','connectionId',c.connection_id,'generation',c.generation+1);
 else raise exception 'custody_denied';end if;
 select decrypted_secret::jsonb into secret from vault.decrypted_secrets where id=cfg.client_reference;
 if secret->>'business_id' is distinct from c.business_id::text or secret->>'organization_id' is distinct from c.organization_id
  or secret->>'environment' is distinct from c.environment then raise exception 'custody_denied';end if;
 b:=jsonb_set(jsonb_set(private_t19_custody.binding(c),'{generation}',to_jsonb(c.generation+1)),'{credential_version}','1');
 return jsonb_build_object('binding',b,'api_domain',c.api_domain,'client_id',secret->>'client_id',
  'client_secret',case when action='consume' then secret->>'client_secret' else null end,'redirect_uri',cfg.redirect_uri,
  'identity_email',cfg.identity_email,'user_id',cfg.user_id,'role_id',cfg.role_id,'currency',cfg.currency);
end $$;
grant select,insert,update on private_t19_custody.oauth_states to t19_runtime_owner;
grant select on private_t19_custody.oauth_clients to t19_runtime_owner;
alter table private_t19_custody.oauth_clients enable row level security;
alter table private_t19_custody.oauth_states enable row level security;
create policy custody_function_owner on private_t19_custody.oauth_clients to t19_runtime_owner using(true) with check(true);
create policy custody_function_owner on private_t19_custody.oauth_states to t19_runtime_owner using(true) with check(true);
-- OP-02: temporary transfer authority, confined to this transaction.
-- The creator's automatic membership is NOINHERIT/NOSET; ALTER FUNCTION OWNER
-- requires SET privilege on the target role and CREATE for the new owner.
grant t19_runtime_owner to current_user with set true, inherit false;
grant create on schema private_t19_custody to t19_runtime_owner;
do $ begin
 if not pg_has_role(current_user,'t19_runtime_owner','SET')
    or not has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE')
 then raise exception 'OP-02 temporary ownership authority missing' using errcode='42501'; end if;
end $;
alter function private_t19_custody.oauth(text,jsonb) owner to t19_runtime_owner;
revoke all on private_t19_custody.oauth_clients,private_t19_custody.oauth_states from public,anon,authenticated,service_role,t19_hosted_custody;
revoke all on function private_t19_custody.oauth(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private_t19_custody.oauth(text,jsonb) to t19_hosted_custody;
create function private_t19_custody.revoke_grant(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare c private_t19_custody.connections;r private_t19_custody.revocations;material jsonb;b jsonb;
begin
 if session_user<>'t19_hosted_custody' then raise exception 'custody_denied' using errcode='42501';end if;
 select * into c from private_t19_custody.connections where connection_id=(p->>'connectionId')::uuid for update;
 if not found or c.business_id is distinct from (p->>'businessId')::uuid or not private_t19_custody.allowed(c.business_id,(p->>'actor')::uuid,true) or c.enabled then raise exception 'custody_denied';end if;
 select * into r from private_t19_custody.revocations where connection_id=c.connection_id and generation=(p->>'generation')::bigint for update;
 if not found then raise exception 'custody_denied';end if;
 if action='claim' then
  if r.phase<>'pending' then raise exception 'stale';end if;
  select decrypted_secret::jsonb into material from vault.decrypted_secrets where id=r.reference;
  b:=jsonb_set(jsonb_set(private_t19_custody.binding(c),'{generation}',to_jsonb(r.generation)),'{credential_version}',to_jsonb(r.credential_version));
  if material->'binding' is distinct from b then raise exception 'custody_denied';end if;
  update private_t19_custody.revocations set phase='dispatched' where connection_id=r.connection_id and generation=r.generation;
  return jsonb_build_object('api_domain',material->>'api_domain','refresh_token',material->>'refresh_token');
 elsif action in ('complete','uncertain') then
  if r.phase<>'dispatched' then raise exception 'stale';end if;
  update private_t19_custody.revocations set phase=case when action='complete' then 'revoked' else 'uncertain' end
   where connection_id=r.connection_id and generation=r.generation;
  return 'true';
 end if;raise exception 'custody_denied';
end $$;
alter function private_t19_custody.revoke_grant(text,jsonb) owner to t19_runtime_owner;
-- Restore the creator's existing ADMIN/NOINHERIT/NOSET membership and remove
-- schema CREATE; rollback of this transaction also rolls back both grants.
revoke create on schema private_t19_custody from t19_runtime_owner;
grant t19_runtime_owner to current_user with set false, inherit false;
do $ begin
 if pg_has_role(current_user,'t19_runtime_owner','SET')
    or has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE')
 then raise exception 'OP-02 temporary ownership authority leaked' using errcode='42501'; end if;
end $;
revoke all on function private_t19_custody.revoke_grant(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private_t19_custody.revoke_grant(text,jsonb) to t19_hosted_custody;
commit;
