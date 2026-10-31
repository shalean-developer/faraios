-- INACTIVE CANDIDATE: staging approved draft invoices only. No activation/enrollment.
-- Uses existing invoice agreements/receipt publication; never enables legacy connections.
begin;
create table private_t19_standard.invoice_jobs(
 id uuid primary key default gen_random_uuid(),environment text not null check(environment='staging'),
 business_id uuid not null references public.businesses(id),invoice_id uuid not null unique references public.business_invoices(id),
 connection_id uuid not null,generation integer not null,organization_id text not null,api_domain text not null,
 actor uuid not null references auth.users(id),customer_id text not null check(customer_id ~ '^[0-9]{1,30}$'),
 state text not null default 'pending' check(state in ('pending','running','retry','completed','review_required')),
 attempts integer not null default 0,attempt_id uuid,mode text check(mode in ('create','reconcile')),
 dispatched boolean not null default false,available_at timestamptz not null default clock_timestamp(),error_code text not null default '',
 approved_at timestamptz not null default clock_timestamp()
);
alter table private_t19_standard.invoice_jobs enable row level security;
revoke all on private_t19_standard.invoice_jobs from public,anon,authenticated,service_role,t19_standard_backend;
-- Narrow owner approval boundary: identity comes from the live Auth session, never input.
create function public.t19_standard_approve_invoice(business uuid,invoice uuid,customer text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub';
 c private_t19_standard.connections;i public.business_invoices;j private_t19_standard.invoice_jobs;
begin
 if actor is null or not exists(select 1 from auth.sessions s where s.user_id=actor and s.id::text=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id') and(s.not_after is null or s.not_after>clock_timestamp()))
 or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business and m.user_id=actor and m.status='active' and m.role='owner' and b.status='active')
 or customer is null or customer !~ '^[0-9]{1,30}$' then raise exception 'accounting_approval_denied' using errcode='42501';end if;
 select * into c from private_t19_standard.connections where business_id=business and environment='staging' for share;
 if not found or c.status<>'connected' or not exists(select 1 from private_t19_standard.backend_businesses m where m.business_id=business and m.environment='staging' and m.enabled and m.organization_id=c.organization_id and m.api_domain=c.api_domain) then raise exception 'accounting_approval_denied' using errcode='42501';end if;
 select i0.* into i from public.business_invoices i0 join public.one_off_bookings b on b.id=i0.booking_id and b.business_id=i0.business_id where i0.id=invoice and i0.business_id=business and b.status<>'cancelled' for share of i0;
 if not found then raise exception 'accounting_approval_denied' using errcode='42501';end if;
 insert into private_t19_standard.invoice_jobs(environment,business_id,invoice_id,connection_id,generation,organization_id,api_domain,actor,customer_id)
 values('staging',business,invoice,c.connection_id,c.generation,c.organization_id,c.api_domain,actor,customer) on conflict(invoice_id) do nothing;
 select * into j from private_t19_standard.invoice_jobs where invoice_id=invoice;
 if j.business_id<>business or j.actor<>actor or j.customer_id<>customer or j.connection_id<>c.connection_id or j.generation<>c.generation or j.organization_id<>c.organization_id or j.api_domain<>c.api_domain then raise exception 'accounting_approval_denied' using errcode='42501';end if;
 return j.id;
end$$;
revoke all on function public.t19_standard_approve_invoice(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.t19_standard_approve_invoice(uuid,uuid,text) to authenticated;

-- Postgres-owned facade is deliberately narrow: no token reads, arbitrary SQL or supplied snapshots.
-- Existing standard guard enforces live dedicated backend + enrollment + held lease on EVERY action.
create function private_t19_standard.invoice_jobs_store(action text,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare business uuid:=(p->>'businessId')::uuid;c private_t19_standard.connections;
 j private_t19_standard.invoice_jobs;i public.business_invoices;b public.one_off_bookings;binding jsonb;r jsonb;result text;code text;next_mode text;
begin
 perform private_t19_standard.https_store('guard',p);
 select * into c from private_t19_standard.connections where business_id=business and environment=p->>'environment' for share;
 if not found or c.status<>'connected' or c.connection_id is distinct from (p->>'connectionId')::uuid or c.generation is distinct from (p->>'generation')::integer or not exists(select 1 from private_t19_standard.backend_businesses m where m.user_id=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid and m.business_id=business and m.environment=c.environment and m.enabled and m.organization_id=c.organization_id and m.api_domain=c.api_domain) then raise exception 'accounting_job_fenced' using errcode='42501';end if;
 if action='pending' then
  update private_t19_standard.invoice_jobs j0 set state='review_required',error_code=case when j0.attempts>=5 then 'retry_exhausted' when j0.connection_id<>c.connection_id or j0.generation<>c.generation then 'connection_changed' when not exists(select 1 from public.business_memberships m where m.user_id=j0.actor and m.business_id=business and m.status='active' and m.role='owner') then 'owner_access_revoked' else 'booking_cancelled' end where j0.business_id=business and j0.state in ('pending','retry','running') and(j0.attempts>=5 or j0.connection_id<>c.connection_id or j0.generation<>c.generation or not exists(select 1 from public.business_memberships m where m.user_id=j0.actor and m.business_id=business and m.status='active' and m.role='owner') or exists(select 1 from public.business_invoices i0 join public.one_off_bookings b0 on b0.id=i0.booking_id and b0.business_id=i0.business_id where i0.id=j0.invoice_id and b0.status='cancelled'));
  return coalesce((select jsonb_agg(id) from (select id from private_t19_standard.invoice_jobs where business_id=business and environment=c.environment and state in ('pending','retry','running') and available_at<=clock_timestamp() order by available_at,id limit 20) q),'[]'::jsonb);
 end if;
 select * into j from private_t19_standard.invoice_jobs where id=(p->>'jobId')::uuid and business_id=business for update;
 if not found or j.environment<>c.environment or j.connection_id<>c.connection_id or j.generation<>c.generation or j.organization_id<>c.organization_id or j.api_domain<>c.api_domain then raise exception 'accounting_job_fenced' using errcode='42501';end if;
 if not exists(select 1 from public.business_memberships where user_id=j.actor and business_id=business and status='active' and role='owner') then raise exception 'accounting_job_fenced' using errcode='42501';end if;
 select * into i from public.business_invoices where id=j.invoice_id and business_id=business for update;
 select * into b from public.one_off_bookings where id=i.booking_id and business_id=business for share;
 if i.id is null or b.id is null or b.status='cancelled' then raise exception 'accounting_job_fenced' using errcode='42501';end if;
 if action='claim' then
  if j.state not in ('pending','retry','running') or j.available_at>clock_timestamp() or j.attempts>=5 then raise exception 'accounting_job_unavailable';end if;
  binding:=jsonb_build_object('provider','zoho','organization_id',c.organization_id,'api_domain',c.api_domain,'environment',c.environment);
  if i.provider_binding is not null and(i.provider_binding<>binding or i.external_customer_id<>j.customer_id) then raise exception 'accounting_job_fenced' using errcode='42501';end if;
  next_mode:=case when j.dispatched or i.external_invoice_id is not null or i.sync_status in ('syncing','matched','review_required') then 'reconcile' else 'create' end;
  update public.business_invoices set provider_binding=binding,external_customer_id=j.customer_id,sync_status='syncing',attempt_id=gen_random_uuid(),attempt_mode=next_mode,attempt_started_at=clock_timestamp(),error_code='',last_actor=j.actor,version=version+1,updated_at=clock_timestamp() where id=i.id returning * into i;
  update private_t19_standard.invoice_jobs set state='running',attempts=attempts+1,attempt_id=i.attempt_id,mode=next_mode where id=j.id;
  return jsonb_build_object('invoice',to_jsonb(i),'connection',jsonb_build_object('business_id',business,'organization_id',c.organization_id,'api_domain',c.api_domain,'environment',c.environment,'enabled',true),'mode',next_mode);
 end if;
 if j.state<>'running' or j.attempt_id is distinct from (p->>'attemptId')::uuid or i.attempt_id is distinct from j.attempt_id or i.sync_status<>'syncing' then raise exception 'accounting_job_fenced' using errcode='42501';end if;
 if action='guard' then return '{}'::jsonb;
 elsif action='dispatch' then
  if j.dispatched or j.mode<>'create' then raise exception 'accounting_job_fenced' using errcode='42501';end if;
  update private_t19_standard.invoice_jobs set dispatched=true where id=j.id;return '{}'::jsonb;
 elsif action='finish' then
  r:=p->'result';result:=r->>'outcome';code:=r->>'error_code';
  if result is null or result not in ('matched','failed','review_required') or code is null or code not in ('','credentials','organization','customer','provider_unavailable','rate_limited','mismatch','duplicates','unknown_outcome','tax_evidence_required','vat_not_supported') then raise exception 'accounting_result_denied';end if;
  if (j.dispatched or j.mode='reconcile') and result='failed' then raise exception 'accounting_result_denied';end if;
  if result='matched' and(r->'receipt'->'tax_snapshot' is distinct from i.snapshot->'tax_snapshot' or r->'receipt'->'provider_tax_cents' is distinct from '0'::jsonb or r->'receipt'->'provider_net_cents' is distinct from to_jsonb(i.total_cents)) then raise exception 'accounting_result_denied';end if;
  perform audit.finish_invoice_sync(business,i.id,i.attempt_id,j.actor,result,code,nullif(r->'receipt','null'));
  update private_t19_standard.invoice_jobs set state=case when result='matched' then 'completed' when result='failed' and not dispatched and code in ('provider_unavailable','rate_limited') and attempts<5 then 'retry' else 'review_required' end,
   available_at=clock_timestamp()+least(3600,30*power(2,least(attempts,6)))*interval '1 second',error_code=code where id=j.id;
  return jsonb_build_object('status',result);
 end if;
 raise exception 'accounting_action_denied' using errcode='42501';
end$$;
revoke all on function private_t19_standard.invoice_jobs_store(text,jsonb) from public,anon,service_role;
grant execute on function private_t19_standard.invoice_jobs_store(text,jsonb) to authenticated;
create function public.t19_standard_jobs(action text,input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private_t19_standard.invoice_jobs_store(action,input)$$;
revoke all on function public.t19_standard_jobs(text,jsonb) from public,anon,service_role;
grant execute on function public.t19_standard_jobs(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
