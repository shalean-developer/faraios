-- REVIEW SOURCE ONLY. Separate from the immutable Issue140 inactive proposal.
-- Requires that proposal and invoices-draft.sql. No deployment tooling imports it.
-- Exact SQL, effective grants, Vault and runtime identities require separate approval.
begin;
do $$ begin
 if current_setting('faraios.t19_runtime_review',true) is distinct from 'approved-source-test'
 then raise exception 'T19 runtime SQL requires an explicit review execution context'; end if;
end $$;
-- OP-04: fail closed on missing inactive prerequisites or partial installation.
-- This is a source-level collision guard, NOT project identity or authorisation.
do $t19_preflight$ begin
 if to_regclass('private_t19_custody.connections') is null
    or to_regclass('private_t19_custody.operations') is null
    or to_regclass('private_t19_custody.prepared_references') is null
    or not exists (select 1 from pg_roles where rolname='t19_hosted_custody')
    or exists (select 1 from pg_roles where rolname='t19_runtime_owner')
    or to_regclass('private_t19_custody.machines') is not null
    or to_regclass('private_t19_custody.jobs') is not null
    or to_regprocedure('private_t19_custody.runtime(text,jsonb)') is not null
 then raise exception 'T19 runtime prerequisite/collision: stop and audit' using errcode='55000'; end if;
end $t19_preflight$;
create role t19_runtime_owner nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- Do not try to grant a provider-owned function without grant authority.
-- The parsed invoker helper still requires effective EXECUTE on auth.uid().
do $op05$ begin
 if not has_function_privilege('t19_runtime_owner','auth.uid()','EXECUTE')
 then raise exception 'OP-05 Auth identity execution unavailable' using errcode='42501'; end if;
end $op05$;
create table private_t19_custody.machines(
 id uuid primary key, fingerprint256 text not null unique check(fingerprint256 ~ '^[0-9a-f]{64}$'),
 active boolean not null default false
);
create table private_t19_custody.machine_businesses(
 machine_id uuid references private_t19_custody.machines(id),business_id uuid references public.businesses(id),
 active boolean not null default false,primary key(machine_id,business_id)
);
alter table private_t19_custody.connections add column api_domain text;
alter table private_t19_custody.connections add column status text not null default 'disconnected'
 check(status in ('connected','disconnected','reauthorisation_required','recovery_required'));
create unique index custody_business_connection on private_t19_custody.connections(business_id,environment,provider);
create unique index custody_organization_connection on private_t19_custody.connections(environment,provider,organization_id);
create table private_t19_custody.jobs(
 id uuid primary key default gen_random_uuid(),connection_id uuid not null references private_t19_custody.connections(connection_id),
 business_id uuid not null references public.businesses(id),generation bigint not null,
 machine_id uuid not null references private_t19_custody.machines(id),actor uuid not null,
 kind text not null check(kind in ('refresh','invoice')),invoice_id uuid references public.business_invoices(id),
 customer_id text, state text not null default 'pending' check(state in ('pending','running','completed','retry','recovery_required','cancelled')),
 attempt_id uuid,lease_until timestamptz,dispatched boolean not null default false,
 attempts integer not null default 0,available_at timestamptz not null default clock_timestamp(),
 error_code text not null default '',created_at timestamptz not null default clock_timestamp(),
 check((kind='invoice' and invoice_id is not null and customer_id ~ '^[0-9]{1,30}$') or (kind='refresh' and invoice_id is null))
);
-- Reconnect cannot create a second write identity for an already dispatched invoice.
create unique index custody_invoice_job on private_t19_custody.jobs(invoice_id) where kind='invoice';
create unique index custody_refresh_job on private_t19_custody.jobs(connection_id,generation) where kind='refresh' and state in ('pending','running','retry','recovery_required');
create table private_t19_custody.events(
 id bigint generated always as identity primary key,business_id uuid not null,connection_id uuid not null,
 operation_id uuid,kind text not null,actor uuid,previous_actor uuid,at timestamptz not null default clock_timestamp()
);
create table private_t19_custody.revocations(
 connection_id uuid not null references private_t19_custody.connections(connection_id),generation bigint not null,
 credential_version bigint not null,reference uuid not null,phase text not null default 'pending'
 check(phase in ('pending','dispatched','revoked','uncertain')),primary key(connection_id,generation)
);
-- No provider response, auth code, token or raw exception belongs in events.
-- OP-05: bind the existing Auth identity at definition time. Managed postgres
-- can use auth but cannot delegate its schema USAGE. The parsed SQL body keeps
-- the auth.uid() dependency without granting Auth schema access or escalating
-- this helper: it is SECURITY INVOKER and accepts no identity argument.
create function private_t19_custody.actor() returns uuid
language sql stable security invoker set search_path=pg_catalog
begin atomic
 select auth.uid();
end;
create function private_t19_custody.binding(c private_t19_custody.connections) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select jsonb_build_object('business_id',c.business_id,'environment',c.environment,'provider',c.provider,
 'connection_id',c.connection_id,'generation',c.generation,'organization_id',c.organization_id,'credential_version',c.credential_version)
$$;
create function private_t19_custody.allowed(b uuid,u uuid,owner_only boolean default false) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from public.business_memberships m join public.businesses b0 on b0.id=m.business_id
 where m.business_id=b and m.user_id=u and m.status='active' and b0.status='active'
 and (m.role='owner' or (not owner_only and m.role='manager')))
$$;
-- Only explicit saved non-VAT evidence is supported until provider mappings pass.
create function private_t19_custody.non_vat_snapshot(t jsonb,total integer) returns boolean
language sql immutable set search_path=pg_catalog as $$
 select coalesce(t @> jsonb_build_object('enabled',false,'price_basis','customer_total','rate_bps',0,
 'vat_cents',0,'vat_number',null,'registration_date',null,'net_cents',total,'total_cents',total)
 and jsonb_typeof(t->'policy_version')='number' and (t->>'policy_version') ~ '^(0|[1-9][0-9]*)$'
 and (t->>'policy_version')::numeric<=9007199254740991 and total>=0,false)
$$;
create function private_t19_custody.runtime(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare c private_t19_custody.connections; j private_t19_custody.jobs; o private_t19_custody.operations; previous private_t19_custody.jobs;
 r uuid; v jsonb; b jsonb; result jsonb; claim jsonb; target uuid;
begin
 if session_user <> 't19_hosted_custody' then raise exception 'custody_denied' using errcode='42501';end if;
 if action='machine' then
  select to_jsonb(m) into result from private_t19_custody.machines m where m.fingerprint256=p->>'fingerprint' and m.active;
  return result;
 end if;
 if action='pending' then
  select coalesce(jsonb_agg(id),'[]'::jsonb) into result from (
   select j0.id from private_t19_custody.jobs j0 join private_t19_custody.machines m on m.id=j0.machine_id
   join private_t19_custody.machine_businesses mb on mb.machine_id=m.id and mb.business_id=j0.business_id
   where m.id=(p->>'machineId')::uuid and m.active and mb.active and j0.available_at<=clock_timestamp()
   and private_t19_custody.allowed(j0.business_id,j0.actor)
   and exists(select 1 from private_t19_custody.connections c0 where c0.connection_id=j0.connection_id
    and c0.enabled and c0.status='connected' and c0.generation=j0.generation)
   and (j0.state in ('pending','retry') or (j0.state='running' and j0.lease_until<clock_timestamp()))
   order by j0.available_at limit 20
  ) q;return result;
 end if;
 -- All transitions take the connection lock first, including disconnect and publication.
 select connection_id into target from private_t19_custody.jobs where id=(p->>'operationId')::uuid;
 select * into c from private_t19_custody.connections where connection_id=target for update;
 if not found then raise exception 'custody_denied' using errcode='42501';end if;
 select * into j from private_t19_custody.jobs where id=(p->>'operationId')::uuid for update;
 if j.machine_id is distinct from (p->>'machineId')::uuid or j.business_id<>c.business_id
 or not exists(select 1 from private_t19_custody.machines m join private_t19_custody.machine_businesses mb on mb.machine_id=m.id
 where m.id=j.machine_id and m.active and mb.business_id=j.business_id and mb.active)
 then raise exception 'custody_denied' using errcode='42501';end if;
 b:=private_t19_custody.binding(c);
 -- Failure recording is monotonic even when membership or generation is revoked.
 if action='fail' then
  select * into o from private_t19_custody.operations where operation_id=j.id for update;
  if o.lease_id is distinct from (p->>'leaseId')::uuid then return 'false'::jsonb;end if;
  if o.phase='dispatched' and p->>'state'='reauthorisation_required' then
   update private_t19_custody.operations set phase='fenced' where operation_id=j.id;
   update private_t19_custody.jobs set state='cancelled',error_code='invalid_grant' where id=j.id;
   if c.generation=o.generation then
    update private_t19_custody.connections set enabled=false,status='reauthorisation_required' where connection_id=c.connection_id;
   end if;
  elsif o.phase in ('dispatched','prepared') then
   update private_t19_custody.operations set phase='recovery_required' where operation_id=j.id;
   update private_t19_custody.jobs set state='recovery_required',error_code='refresh_uncertain' where id=j.id;
   if c.generation=o.generation then
    update private_t19_custody.connections set enabled=false,status=case when p->>'state'='reauthorisation_required' then 'reauthorisation_required' else 'recovery_required' end where connection_id=c.connection_id;
   end if;
  elsif o.phase='claimed' then
   update private_t19_custody.operations set phase='fenced' where operation_id=j.id;
   update private_t19_custody.jobs set state='cancelled',error_code='refresh_unavailable' where id=j.id;
  end if;return 'true'::jsonb;
 end if;
 if action='invoice_finish' and (not c.enabled or c.generation<>j.generation
  or not private_t19_custody.allowed(j.business_id,j.actor)) then
  if j.attempt_id is not distinct from (p->>'attemptId')::uuid and j.state='running' then
   update private_t19_custody.jobs set state=case when dispatched then 'recovery_required' else 'cancelled' end,error_code='authority_changed' where id=j.id;
  end if;return jsonb_build_object('status','recovery_required');
 end if;
 if action='resolve' and (not c.enabled or c.status<>'connected' or c.generation<>j.generation
 or not private_t19_custody.allowed(j.business_id,j.actor)) then
  -- Refresh dispatch is recorded in operations, not the invoice dispatch flag.
  if j.kind='refresh' then
   select * into o from private_t19_custody.operations where operation_id=j.id for update;
   update private_t19_custody.operations set phase=case when phase='claimed' then 'fenced' else 'recovery_required' end
    where operation_id=j.id and phase in ('claimed','dispatched','prepared');
   if o.phase in ('dispatched','prepared','recovery_required') and c.generation=j.generation then
    update private_t19_custody.connections set enabled=false,status='recovery_required' where connection_id=c.connection_id;
   end if;
  end if;
  update private_t19_custody.jobs set state=case when dispatched or (j.kind='refresh' and o.phase in ('dispatched','prepared','recovery_required')) then 'recovery_required' else 'cancelled' end,
   error_code='authority_changed' where id=j.id and state in ('pending','running','retry');
  return jsonb_build_object('authorized',false);
 end if;
 if not c.enabled or c.status<>'connected' or c.generation<>j.generation
 or not private_t19_custody.allowed(j.business_id,j.actor)
 then raise exception 'custody_denied' using errcode='42501';end if;
 if action='resolve' then
  if j.state not in ('pending','running','retry') then return null;end if;
  return jsonb_build_object('id',j.id,'machine_id',j.machine_id,'kind',j.kind,'authorized',true,'binding',b);
 end if;
 if action='ensure_refresh' and j.kind='invoice' then
  select * into previous from private_t19_custody.jobs where connection_id=c.connection_id and generation=c.generation
   and kind='refresh' and state in ('pending','running','retry','recovery_required') for update;
  r:=previous.id;
  if r is not null and (not private_t19_custody.allowed(previous.business_id,previous.actor)
   or not exists(select 1 from private_t19_custody.machines m join private_t19_custody.machine_businesses mb on mb.machine_id=m.id
    where m.id=previous.machine_id and m.active and mb.business_id=previous.business_id and mb.active)) then
   select * into o from private_t19_custody.operations where operation_id=r for update;
   if o.phase in ('dispatched','prepared','recovery_required') or previous.state='recovery_required' then
    update private_t19_custody.operations set phase='recovery_required' where operation_id=r and phase in ('dispatched','prepared');
    update private_t19_custody.jobs set state='recovery_required',error_code='refresh_uncertain' where id=r;
    update private_t19_custody.connections set enabled=false,status='recovery_required' where connection_id=c.connection_id;
    -- Commit the hold; returning null makes the adapter refuse without rolling it back.
    return null;
   end if;
   if o.phase='claimed' then update private_t19_custody.operations set phase='fenced' where operation_id=r;end if;
   update private_t19_custody.jobs set state='cancelled',error_code='authority_changed' where id=r;
   insert into private_t19_custody.events(business_id,connection_id,operation_id,kind) values(c.business_id,c.connection_id,r,'refresh_authority_retired');
   r:=null;
  end if;
  if r is null then
   insert into private_t19_custody.jobs(connection_id,business_id,generation,machine_id,actor,kind)
   values(c.connection_id,c.business_id,c.generation,j.machine_id,j.actor,'refresh') returning id into r;
  end if;return to_jsonb(r);
 end if;
 if action in ('current','read','claim','dispatch','publish') and p->'binding' is distinct from b then
  raise exception 'stale' using errcode='40001';end if;
 if action='current' then return jsonb_build_object('reference',c.sealed_reference);end if;
 if action='read' then
  if (p->>'reference')::uuid is distinct from c.sealed_reference then raise exception 'custody_denied';end if;
  select decrypted_secret::jsonb into result from vault.decrypted_secrets where id=c.sealed_reference;
  if result->'binding' is distinct from b then raise exception 'custody_denied';end if;return result;
 end if;
 if action='claim' then
  if j.kind<>'refresh' then raise exception 'stale';end if;
  select * into o from private_t19_custody.operations where operation_id=j.id for update;
  if j.state='running' and o.phase='claimed' and o.lease_expires_at<=clock_timestamp() then
   update private_t19_custody.operations set phase='fenced' where operation_id=j.id;
  elsif j.state<>'pending' then raise exception 'stale';end if;
  -- Expired undispatched claims can be fenced. Dispatched/prepared leases require review.
  update private_t19_custody.operations set phase='fenced' where connection_id=c.connection_id and phase='claimed' and lease_expires_at<=clock_timestamp();
  insert into private_t19_custody.operations(operation_id,connection_id,generation,credential_version,lease_id,lease_expires_at,phase)
  values(j.id,c.connection_id,c.generation,c.credential_version,(p->>'leaseId')::uuid,clock_timestamp()+interval '2 minutes','claimed')
  on conflict(operation_id) do update set lease_id=excluded.lease_id,lease_expires_at=excluded.lease_expires_at,phase='claimed'
   where private_t19_custody.operations.phase='fenced';
  if not found then raise exception 'stale';end if;
  update private_t19_custody.jobs set state='running',lease_until=clock_timestamp()+interval '2 minutes' where id=j.id;
  return jsonb_build_object('id',p->>'leaseId','operationId',j.id);
 end if;
 if action in ('dispatch','seal','publish') then
  select * into o from private_t19_custody.operations where operation_id=j.id for update;
  if not found or o.lease_id is distinct from (p->>'leaseId')::uuid or o.generation<>c.generation
  or o.credential_version<>c.credential_version or o.lease_expires_at<=clock_timestamp() then raise exception 'stale';end if;
  if action='dispatch' then
   if o.phase<>'claimed' then raise exception 'stale';end if;
   update private_t19_custody.operations set phase='dispatched' where operation_id=j.id;return 'true'::jsonb;
  elsif action='seal' then
   v:=jsonb_set(b,'{credential_version}',to_jsonb(c.credential_version+1));
   if o.phase<>'dispatched' or p->'binding' is distinct from v or p->'material'->'binding' is distinct from v
   or jsonb_typeof(p->'material'->'refresh_token') is distinct from 'string' or length(p->'material'->>'refresh_token') not between 1 and 4096 then raise exception 'custody_denied';end if;
   r:=vault.create_secret((p->'material')::text);
   insert into private_t19_custody.prepared_references(reference,operation_id,lease_id,connection_id,business_id,generation,credential_version)
   values(r,j.id,o.lease_id,c.connection_id,c.business_id,c.generation,c.credential_version+1);
   update private_t19_custody.operations set phase='prepared' where operation_id=j.id;return to_jsonb(r);
  else
   if o.phase<>'prepared' then raise exception 'stale';end if;
   update private_t19_custody.prepared_references set consumed=true where reference=(p->>'reference')::uuid and operation_id=j.id
   and lease_id=o.lease_id and connection_id=c.connection_id and business_id=c.business_id and generation=c.generation
   and credential_version=c.credential_version+1 and not consumed returning reference into r;
   if not found then raise exception 'stale';end if;
   update private_t19_custody.connections set sealed_reference=r,credential_version=credential_version+1 where connection_id=c.connection_id;
   update private_t19_custody.operations set phase='published' where operation_id=j.id;
   update private_t19_custody.jobs set state='completed' where id=j.id;
   insert into private_t19_custody.events(business_id,connection_id,operation_id,kind) values(c.business_id,c.connection_id,j.id,'refresh_published');
   return 'true'::jsonb;
  end if;
 end if;
 if j.kind<>'invoice' then raise exception 'custody_denied';end if;
 if action='invoice_claim' then
  if not exists(select 1 from public.business_invoices i where i.id=j.invoice_id and i.business_id=j.business_id
   and private_t19_custody.non_vat_snapshot(i.snapshot->'tax_snapshot',i.total_cents)) then raise exception 'tax_evidence_required';end if;
  if j.available_at>clock_timestamp() or j.state not in ('pending','retry','running')
   or (j.state='running' and j.lease_until>clock_timestamp()) then raise exception 'stale';end if;
  claim:=audit.claim_invoice_sync(j.business_id,j.invoice_id,j.actor,j.customer_id);
  -- A previous dispatched attempt is read/reconcile only, regardless of legacy status.
  if j.dispatched then claim:=jsonb_set(claim,'{mode}','"reconcile"');
  else
   -- Runtime jobs carry durable dispatch evidence. An expired claim without any
   -- egress can safely retry; legacy uncertainty was captured when enqueued.
   update public.business_invoices set attempt_mode='create' where id=j.invoice_id and attempt_id=(claim->'invoice'->>'attempt_id')::uuid;
   claim:=jsonb_set(claim,'{mode}','"create"');
  end if;
  update private_t19_custody.jobs set state='running',attempt_id=(claim->'invoice'->>'attempt_id')::uuid,
  lease_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1 where id=j.id;
  return claim||jsonb_build_object('binding',b,'operationId',j.id);
 end if;
 if action in ('invoice_guard','invoice_dispatch','invoice_finish') then
  if j.state<>'running' or j.attempt_id is distinct from (p->>'attemptId')::uuid or j.lease_until<=clock_timestamp() then raise exception 'stale';end if;
  if not exists(select 1 from public.business_accounting_connections ac where ac.business_id=c.business_id and ac.enabled
   and ac.organization_id=c.organization_id and ac.environment=c.environment and ac.api_domain=c.api_domain)
   or not exists(select 1 from public.business_invoices i join public.one_off_bookings bk on bk.id=i.booking_id and bk.business_id=i.business_id
   where i.id=j.invoice_id and i.business_id=j.business_id and i.attempt_id=j.attempt_id and bk.status<>'cancelled') then raise exception 'stale';end if;
  if action='invoice_guard' then return b;end if;
  if action='invoice_dispatch' then
   if j.dispatched then raise exception 'reconciliation_required';end if;
   update private_t19_custody.jobs set dispatched=true where id=j.id;return 'true'::jsonb;
  end if;
  result:=p->'result';
  if result->>'outcome'='matched' and not exists(select 1 from public.business_invoices i where i.id=j.invoice_id and i.business_id=j.business_id
   and private_t19_custody.non_vat_snapshot(i.snapshot->'tax_snapshot',i.total_cents)
   and result->'receipt'->'tax_snapshot'=i.snapshot->'tax_snapshot'
   and result->'receipt'->'provider_tax_cents'='0'::jsonb
   and result->'receipt'->'provider_net_cents'=to_jsonb(i.total_cents)) then raise exception 'tax_receipt_mismatch';end if;
  if result->>'outcome' not in ('matched','failed','review_required') or result->>'error_code' is null then raise exception 'custody_denied';end if;
  perform audit.finish_invoice_sync(j.business_id,j.invoice_id,j.attempt_id,j.actor,result->>'outcome',result->>'error_code',nullif(result->'receipt','null'));
  update private_t19_custody.jobs set dispatched=dispatched or result->>'outcome' in ('matched','review_required'),state=case when result->>'outcome'='matched' then 'completed'
   when not dispatched and result->>'error_code' in ('provider_unavailable','rate_limited') and attempts<5 then 'retry' else 'recovery_required' end,
   available_at=clock_timestamp()+least(3600,30*power(2,least(attempts,6))) * interval '1 second',error_code=result->>'error_code' where id=j.id;
  insert into private_t19_custody.events(business_id,connection_id,operation_id,kind) values(c.business_id,c.connection_id,j.id,result->>'outcome');
  return jsonb_build_object('status',result->>'outcome');
 end if;
 raise exception 'custody_denied';
end $$;

-- Authenticated owner/manager requests derive the actor from private_t19_custody.actor(), never JSON.
create function private_t19_custody.enqueue(business uuid,connection uuid,invoice uuid,customer text) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare c private_t19_custody.connections; m uuid; result uuid;
begin
 if not private_t19_custody.allowed(business,private_t19_custody.actor(),invoice is null) then raise exception 'custody_denied' using errcode='42501';end if;
 select * into c from private_t19_custody.connections where connection_id=connection and business_id=business and enabled and status='connected' for update;
 if not found then raise exception 'custody_denied';end if;
 select mb.machine_id into m from private_t19_custody.machine_businesses mb join private_t19_custody.machines x on x.id=mb.machine_id
 where mb.business_id=business and mb.active and x.active order by mb.machine_id limit 1;
 if m is null then raise exception 'custody_denied';end if;
 if invoice is not null and not exists(select 1 from public.business_invoices i where i.id=invoice and i.business_id=business) then raise exception 'custody_denied';end if;
 if invoice is not null then
  if not exists(select 1 from public.business_invoices i where i.id=invoice and i.business_id=business
   and private_t19_custody.non_vat_snapshot(i.snapshot->'tax_snapshot',i.total_cents)) then raise exception 'tax_evidence_required';end if;
  select id into result from private_t19_custody.jobs where invoice_id=invoice and business_id=business;
  if found then
   update private_t19_custody.jobs set state='retry',available_at=clock_timestamp() where id=result and state='completed';
   return result;
  end if;
 end if;
 insert into private_t19_custody.jobs(connection_id,business_id,generation,machine_id,actor,kind,invoice_id,customer_id,dispatched)
 values(connection,business,c.generation,m,private_t19_custody.actor(),case when invoice is null then 'refresh' else 'invoice' end,invoice,customer,
 exists(select 1 from public.business_invoices i where i.id=invoice and (i.external_invoice_id is not null or i.sync_status in ('syncing','matched','review_required')))) returning id into result;
 return result;
end $$;
create function private_t19_custody.disconnect(business uuid,connection uuid,expected_generation bigint) returns boolean
language plpgsql security definer set search_path=pg_catalog as $$
declare c private_t19_custody.connections;
begin
 if not private_t19_custody.allowed(business,private_t19_custody.actor(),true) then raise exception 'custody_denied' using errcode='42501';end if;
 select * into c from private_t19_custody.connections where connection_id=connection and business_id=business for update;
 if not found or c.generation is distinct from expected_generation or c.status='disconnected' then raise exception 'stale';end if;
 update private_t19_custody.operations set phase=case when phase in ('dispatched','prepared') then 'recovery_required' else 'fenced' end
 where connection_id=connection and phase in ('claimed','dispatched','prepared');
 update private_t19_custody.jobs set state=case when dispatched then 'recovery_required' else 'cancelled' end
 where connection_id=connection and state in ('pending','running','retry');
 if c.sealed_reference is not null then
  insert into private_t19_custody.revocations(connection_id,generation,credential_version,reference)
  values(c.connection_id,c.generation,c.credential_version,c.sealed_reference);
 end if;
 update private_t19_custody.connections set enabled=false,status='disconnected',generation=generation+1 where connection_id=connection;
 update public.business_accounting_connections set enabled=false,version=version+1,last_actor=private_t19_custody.actor(),updated_at=clock_timestamp() where business_id=business;
 insert into private_t19_custody.events(business_id,connection_id,kind) values(business,connection,'owner_disconnected');
 return true;
end $$;

-- Minimal function owner. No role membership is granted to callers. Provisioning
-- must prove SET ROLE/owner bypass containment separately on the actual host.
grant usage on schema private_t19_custody,public,audit,vault to t19_runtime_owner;
grant select on public.businesses,public.business_memberships,public.business_invoices to t19_runtime_owner;
grant update(attempt_mode) on public.business_invoices to t19_runtime_owner;
create policy t19_runtime_invoice_attempt on public.business_invoices for update to t19_runtime_owner using(true) with check(true);
grant select on public.business_accounting_connections,public.one_off_bookings to t19_runtime_owner;
grant update(enabled,version,last_actor,updated_at) on public.business_accounting_connections to t19_runtime_owner;
create policy t19_runtime_accounting_update on public.business_accounting_connections for update to t19_runtime_owner using(true) with check(true);
create policy t19_runtime_accounting_read on public.business_accounting_connections for select to t19_runtime_owner using(true);
create policy t19_runtime_booking_read on public.one_off_bookings for select to t19_runtime_owner using(true);
create policy t19_runtime_business_read on public.businesses for select to t19_runtime_owner using(true);
create policy t19_runtime_membership_read on public.business_memberships for select to t19_runtime_owner using(true);
create policy t19_runtime_invoice_read on public.business_invoices for select to t19_runtime_owner using(true);
grant select,insert,update on all tables in schema private_t19_custody to t19_runtime_owner;
revoke update on private_t19_custody.events from t19_runtime_owner;
do $$ declare t text;begin
 foreach t in array array['connections','operations','prepared_references','machines','machine_businesses','jobs','events','revocations'] loop
  execute format('alter table private_t19_custody.%I enable row level security',t);
  execute format('create policy custody_function_owner on private_t19_custody.%I to t19_runtime_owner using(true) with check(true)',t);
 end loop;
end $$;
grant usage on all sequences in schema private_t19_custody to t19_runtime_owner;
-- Review this database-wide Vault boundary against an inventory of all consumers
-- before approval. No ordinary REST/worker identity may decrypt or replace secrets.
-- OP-03: keep existing provider-managed Vault grants untouched.
-- service_role and supabase_admin currently have managed Vault capabilities;
-- consumer and indirect-execution assessment remains an operational gate.
-- Grant only the two exact operations needed by the private runtime owner.
grant select on vault.decrypted_secrets to t19_runtime_owner;
-- The installed signature includes a defaulted fourth argument; GRANT requires
-- the full identity even when callers pass only one or three arguments.
grant execute on function vault.create_secret(text,text,text,uuid) to t19_runtime_owner;
grant execute on function audit.claim_invoice_sync(uuid,uuid,uuid,text),audit.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb) to t19_runtime_owner;
-- OP-06: harden function ACLs while the executor still owns the functions.
revoke all on all functions in schema private_t19_custody from public,anon,authenticated,service_role,t19_hosted_custody;
grant execute on function private_t19_custody.runtime(text,jsonb) to t19_hosted_custody;
grant execute on function private_t19_custody.enqueue(uuid,uuid,uuid,text),private_t19_custody.disconnect(uuid,uuid,bigint) to authenticated;
-- OP-02: temporary transfer authority, confined to this transaction.
-- The creator's automatic membership is NOINHERIT/NOSET; ALTER FUNCTION OWNER
-- requires SET privilege on the target role and CREATE for the new owner.
grant t19_runtime_owner to current_user with set true, inherit false;
grant create on schema private_t19_custody to t19_runtime_owner;
do $op02$ begin
 if not pg_has_role(current_user,'t19_runtime_owner','SET')
    or not has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE')
 then raise exception 'OP-02 temporary ownership authority missing' using errcode='42501'; end if;
end $op02$;
alter function private_t19_custody.actor() owner to t19_runtime_owner;
alter function private_t19_custody.binding(private_t19_custody.connections) owner to t19_runtime_owner;
alter function private_t19_custody.non_vat_snapshot(jsonb,integer) owner to t19_runtime_owner;
alter function private_t19_custody.allowed(uuid,uuid,boolean) owner to t19_runtime_owner;
alter function private_t19_custody.runtime(text,jsonb) owner to t19_runtime_owner;
alter function private_t19_custody.enqueue(uuid,uuid,uuid,text) owner to t19_runtime_owner;
alter function private_t19_custody.disconnect(uuid,uuid,bigint) owner to t19_runtime_owner;
-- Restore the creator's existing ADMIN/NOINHERIT/NOSET membership and remove
-- schema CREATE; rollback of this transaction also rolls back both grants.
revoke create on schema private_t19_custody from t19_runtime_owner;
grant t19_runtime_owner to current_user with set false, inherit false;
do $op02$ begin
 if not (select rolsuper from pg_roles where rolname=current_user)
    and (pg_has_role(current_user,'t19_runtime_owner','SET')
         or has_schema_privilege('t19_runtime_owner','private_t19_custody','CREATE'))
 then raise exception 'OP-02 temporary ownership authority leaked' using errcode='42501'; end if;
end $op02$;
revoke all on all tables in schema private_t19_custody from public,anon,authenticated,service_role,t19_hosted_custody;
grant usage on schema private_t19_custody to authenticated,t19_hosted_custody;
-- Remove the legacy unrestricted publisher path when this separately reviewed SQL is applied.
revoke execute on function public.claim_invoice_sync(uuid,uuid,uuid,text),audit.claim_invoice_sync(uuid,uuid,uuid,text),
 public.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb),audit.finish_invoice_sync(uuid,uuid,uuid,uuid,text,text,jsonb) from service_role;
commit;
