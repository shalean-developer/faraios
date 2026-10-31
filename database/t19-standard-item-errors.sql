-- T19 additive private result-code contract only; no table/data or privilege changes.
begin;
create or replace function private_t19_standard.invoice_jobs_store(action text,p jsonb) returns jsonb
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
  if result is null or result not in ('matched','failed','review_required') or code is null or code not in ('','credentials','organization','customer','provider_unavailable','rate_limited','mismatch','duplicates','unknown_outcome','tax_evidence_required','vat_not_supported','item_mapping') then raise exception 'accounting_result_denied';end if;
  if (j.dispatched or j.mode='reconcile') and result='failed' then raise exception 'accounting_result_denied';end if;
  if result='matched' and(r->'receipt'->'tax_snapshot' is distinct from i.snapshot->'tax_snapshot' or r->'receipt'->'provider_tax_cents' is distinct from '0'::jsonb or r->'receipt'->'provider_net_cents' is distinct from to_jsonb(i.total_cents)) then raise exception 'accounting_result_denied';end if;
  perform audit.finish_invoice_sync(business,i.id,i.attempt_id,j.actor,result,case when code='item_mapping' then 'mismatch' else code end,nullif(r->'receipt','null'));
  update private_t19_standard.invoice_jobs set state=case when result='matched' then 'completed' when result='failed' and not dispatched and code in ('provider_unavailable','rate_limited') and attempts<5 then 'retry' else 'review_required' end,
   available_at=clock_timestamp()+least(3600,30*power(2,least(attempts,6)))*interval '1 second',error_code=code where id=j.id;
  return jsonb_build_object('status',result);
 end if;
 raise exception 'accounting_action_denied' using errcode='42501';
end$$;
notify pgrst,'reload schema';
commit;
