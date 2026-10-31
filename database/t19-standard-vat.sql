-- INACTIVE T19 VAT candidate. No hosted application or tax configuration is authorised by this file.
-- Preserve saved agreements, legacy VAT barrier and all existing roles/ACLs.
begin;
create or replace function private_t19_standard.invoice_tax_ready(t jsonb,total integer) returns boolean
language plpgsql immutable set search_path='' as $$
declare p numeric;v numeric;net numeric;d date;
begin
 if total is null or total<0 or jsonb_typeof(t) is distinct from 'object' or jsonb_typeof(t->'policy_version') is distinct from 'number' or (t->>'policy_version') !~ '^(0|[1-9][0-9]*)$' then return false;end if;
 p:=(t->>'policy_version')::numeric;if p>9007199254740991 then return false;end if;
 if t->'enabled'='false'::jsonb then
  return t @> jsonb_build_object('enabled',false,'price_basis','customer_total','rate_bps',0,'vat_cents',0,'vat_number',null,'registration_date',null,'net_cents',total,'total_cents',total);
 end if;
 if t->'enabled' is distinct from 'true'::jsonb or p<1 or jsonb_typeof(t->'vat_number') is distinct from 'string' or jsonb_typeof(t->'registration_date') is distinct from 'string' or t->>'vat_number' !~ '^4[0-9]{9}$' or t->>'registration_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false;end if;
 d:=to_date(t->>'registration_date','YYYY-MM-DD');if to_char(d,'YYYY-MM-DD')<>t->>'registration_date' then return false;end if;
 v:=round(total::numeric*1500/11500);net:=total-v;
 return coalesce(t @> jsonb_build_object('enabled',true,'price_basis','customer_total','rate_bps',1500,'vat_cents',v,'net_cents',net,'total_cents',total),false);
exception when others then return false;
end$$;
create function private_t19_standard.vat_attempt_allowed(i public.business_invoices) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(private_t19_standard.live_backend_session() and private_t19_standard.invoice_tax_ready(i.snapshot->'tax_snapshot',i.total_cents)
 and (i.snapshot->'tax_snapshot'->>'registration_date') <= left(i.snapshot->>'local_start',10)
 and exists(select 1 from private_t19_standard.invoice_jobs j
 join private_t19_standard.connections c on c.business_id=j.business_id and c.environment=j.environment and c.connection_id=j.connection_id and c.generation=j.generation and c.organization_id=j.organization_id and c.api_domain=j.api_domain and c.status='connected'
 join public.businesses biz on biz.id=c.business_id and biz.status='active'
 join private_t19_standard.backend_businesses m on m.business_id=c.business_id and m.environment=c.environment and m.organization_id=c.organization_id and m.api_domain=c.api_domain and m.enabled and m.user_id=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
 join private_t19_standard.operation_leases l on l.business_id=c.business_id and l.environment=c.environment and l.principal=m.user_id and not l.released and l.expires_at>clock_timestamp()
 join public.business_memberships o on o.business_id=j.business_id and o.user_id=j.actor and o.role='owner' and o.status='active'
 where j.invoice_id=i.id and j.business_id=i.business_id and j.environment='staging' and j.actor=i.last_actor and j.state in ('pending','retry','running')
 and i.provider_binding=jsonb_build_object('provider','zoho','organization_id',c.organization_id,'api_domain',c.api_domain,'environment',c.environment)),false)
$$;
revoke all on function private_t19_standard.vat_attempt_allowed(public.business_invoices) from public,anon,authenticated,service_role,t19_standard_backend;
create or replace function audit.freeze_document_vat() returns trigger language plpgsql security definer set search_path='' as $fn$
declare tax jsonb;v integer;
begin
 if tg_table_name='business_quotes' then
  if tg_op='INSERT' then new.agreement:=new.agreement||jsonb_build_object('tax_snapshot',audit.business_tax_snapshot(new.business_id,(new.agreement->>'total_cents')::integer));
  elsif new.status='issued' then
   perform pg_advisory_xact_lock_shared(hashtextextended('vat:'||new.business_id::text,0));
   select version into v from public.business_vat_settings where business_id=new.business_id;
   if new.agreement->'tax_snapshot' is null or (new.agreement->'tax_snapshot'->>'policy_version')::int is distinct from coalesce(v,0) then raise exception 'VAT settings changed or were not captured. Create a new quote before issuing.';end if;
  end if;
 elsif tg_table_name='recurring_schedules' then
  select tax_snapshot into tax from public.one_off_bookings where business_id=new.business_id and id=new.source_booking_id;
  new.agreement:=new.agreement||jsonb_build_object('tax_snapshot',tax);
 elsif tg_table_name='business_invoices' then
  if tg_op='INSERT' then
   select tax_snapshot into tax from public.one_off_bookings where business_id=new.business_id and id=new.booking_id;
   new.snapshot:=new.snapshot||jsonb_build_object('tax_snapshot',tax);
  elsif new.sync_status='syncing' and coalesce((new.snapshot->'tax_snapshot'->>'enabled')::boolean,false) and not private_t19_standard.vat_attempt_allowed(new) then raise exception 'VAT accounting sync requires separate verified tax mapping. The invoice remains an internal draft.';end if;
 end if;
 return new;
end;$fn$;
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
  if result is null or result not in ('matched','failed','review_required') or code is null or code not in ('','credentials','organization','customer','provider_unavailable','rate_limited','mismatch','duplicates','unknown_outcome','tax_evidence_required','vat_not_supported','item_mapping','tax_mapping','tax_rounding') then raise exception 'accounting_result_denied';end if;
  if (j.dispatched or j.mode='reconcile') and result='failed' then raise exception 'accounting_result_denied';end if;
  if result='matched' and(not private_t19_standard.invoice_tax_ready(i.snapshot->'tax_snapshot',i.total_cents) or r->'receipt'->'tax_snapshot' is distinct from i.snapshot->'tax_snapshot' or r->'receipt'->'provider_tax_cents' is distinct from i.snapshot->'tax_snapshot'->'vat_cents' or r->'receipt'->'provider_net_cents' is distinct from i.snapshot->'tax_snapshot'->'net_cents' or ((i.snapshot->'tax_snapshot'->>'enabled')::boolean and coalesce(r->'receipt'->>'provider_tax_id','') !~ '^[0-9]{1,30}$')) then raise exception 'accounting_result_denied';end if;
  perform audit.finish_invoice_sync(business,i.id,i.attempt_id,j.actor,result,case when code in ('item_mapping','tax_mapping','tax_rounding') then 'mismatch' else code end,nullif(r->'receipt','null'));
  update private_t19_standard.invoice_jobs set state=case when result='matched' then 'completed' when result='failed' and not dispatched and code in ('provider_unavailable','rate_limited') and attempts<5 then 'retry' else 'review_required' end,
   available_at=clock_timestamp()+least(3600,30*power(2,least(attempts,6)))*interval '1 second',error_code=code where id=j.id;
  return jsonb_build_object('status',result);
 end if;
 raise exception 'accounting_action_denied' using errcode='42501';
end$$;
create or replace function private_t19_standard.invoice_review(business uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private_t19_standard.connections;rows jsonb;
begin
 perform private_t19_standard.invoice_owner(business);
 select * into c from private_t19_standard.connections where business_id=business and environment='staging';
 select coalesce(jsonb_agg(q.row order by q.created_at desc),'[]'::jsonb) into rows from(
  select i.created_at,jsonb_build_object('id',i.id,'documentStatus',i.document_status,'version',i.version,'customerName',i.snapshot->'customer_snapshot'->>'name','totalCents',i.total_cents,'currency',i.currency,'date',i.snapshot->>'local_start','lines',i.snapshot->'price_lines',
   'tax',jsonb_build_object('enabled',i.snapshot->'tax_snapshot'->'enabled','netCents',i.snapshot->'tax_snapshot'->'net_cents','vatCents',i.snapshot->'tax_snapshot'->'vat_cents'),'taxReady',private_t19_standard.invoice_tax_ready(i.snapshot->'tax_snapshot',i.total_cents),'bookingStatus',b.status,'syncStatus',i.sync_status,'externalCustomerId',i.external_customer_id,'externalInvoiceId',i.external_invoice_id,'externalInvoiceNumber',i.external_invoice_number,
   'job',case when j.id is null then null else jsonb_build_object('id',j.id,'state',j.state,'attempts',j.attempts,'dispatched',j.dispatched,'error',j.error_code,'approvedAt',j.approved_at,'availableAt',j.available_at,'generation',j.generation) end) as row
  from public.business_invoices i join public.one_off_bookings b on b.id=i.booking_id and b.business_id=i.business_id left join private_t19_standard.invoice_jobs j on j.invoice_id=i.id and j.business_id=i.business_id
  where i.business_id=business order by i.created_at desc,i.id limit 100
 ) q;
 return jsonb_build_object('environment','staging','connection',case when c.connection_id is null then null else jsonb_build_object('id',c.connection_id,'generation',c.generation,'organizationId',c.organization_id,'apiDomain',c.api_domain,'status',c.status,'organizationName',c.organization->>'name') end,'invoices',rows,'invoiceCount',(select count(*) from public.business_invoices where business_id=business));
end$$;
notify pgrst,'reload schema';
commit;
