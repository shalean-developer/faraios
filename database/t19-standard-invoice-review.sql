-- Staging owner review/status and exact reviewed approval; no invoice is approved here.
begin;
create function private_t19_standard.invoice_owner(business uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
begin
 if actor is null or not exists(select 1 from auth.sessions s where s.user_id=actor and s.id::text=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id') and(s.not_after is null or s.not_after>clock_timestamp()))
 or not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business and m.user_id=actor and m.status='active' and m.role='owner' and b.status='active') then raise exception 'accounting_owner_denied' using errcode='42501';end if;
 return actor;
end$$;
revoke all on function private_t19_standard.invoice_owner(uuid) from public,anon,authenticated,service_role;
create function private_t19_standard.invoice_tax_ready(t jsonb,total integer) returns boolean
language sql immutable set search_path=pg_catalog as $$
 select coalesce(t @> jsonb_build_object('enabled',false,'price_basis','customer_total','rate_bps',0,'vat_cents',0,'vat_number',null,'registration_date',null,'net_cents',total,'total_cents',total)
 and jsonb_typeof(t->'policy_version')='number' and (t->>'policy_version') ~ '^(0|[1-9][0-9]*)$' and (t->>'policy_version')::numeric<=9007199254740991 and total>=0,false)
$$;
revoke all on function private_t19_standard.invoice_tax_ready(jsonb,integer) from public,anon,authenticated,service_role;
create function private_t19_standard.invoice_review(business uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private_t19_standard.connections;rows jsonb;
begin
 perform private_t19_standard.invoice_owner(business);
 select * into c from private_t19_standard.connections where business_id=business and environment='staging';
 select coalesce(jsonb_agg(q.row order by q.created_at desc),'[]'::jsonb) into rows from(
  select i.created_at,jsonb_build_object('id',i.id,'documentStatus',i.document_status,'version',i.version,'customerName',i.snapshot->'customer_snapshot'->>'name','totalCents',i.total_cents,'currency',i.currency,'date',i.snapshot->>'local_start','lines',i.snapshot->'price_lines',
   'taxReady',private_t19_standard.invoice_tax_ready(i.snapshot->'tax_snapshot',i.total_cents),'bookingStatus',b.status,'syncStatus',i.sync_status,'externalCustomerId',i.external_customer_id,'externalInvoiceId',i.external_invoice_id,'externalInvoiceNumber',i.external_invoice_number,
   'job',case when j.id is null then null else jsonb_build_object('id',j.id,'state',j.state,'attempts',j.attempts,'dispatched',j.dispatched,'error',j.error_code,'approvedAt',j.approved_at,'availableAt',j.available_at,'generation',j.generation) end) as row
  from public.business_invoices i join public.one_off_bookings b on b.id=i.booking_id and b.business_id=i.business_id left join private_t19_standard.invoice_jobs j on j.invoice_id=i.id and j.business_id=i.business_id
  where i.business_id=business order by i.created_at desc,i.id limit 100
 ) q;
 return jsonb_build_object('environment','staging','connection',case when c.connection_id is null then null else jsonb_build_object('id',c.connection_id,'generation',c.generation,'organizationId',c.organization_id,'apiDomain',c.api_domain,'status',c.status,'organizationName',c.organization->>'name') end,'invoices',rows,'invoiceCount',(select count(*) from public.business_invoices where business_id=business));
end$$;
revoke all on function private_t19_standard.invoice_review(uuid) from public,anon,service_role;
grant execute on function private_t19_standard.invoice_review(uuid) to authenticated;
create function public.t19_standard_invoice_review(business uuid) returns jsonb language sql security invoker set search_path='' as $$select private_t19_standard.invoice_review(business)$$;
revoke all on function public.t19_standard_invoice_review(uuid) from public,anon,service_role;
grant execute on function public.t19_standard_invoice_review(uuid) to authenticated;

create function private_t19_standard.approve_reviewed_invoice(business uuid,input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare c private_t19_standard.connections;i public.business_invoices;
begin
 perform private_t19_standard.invoice_owner(business);
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>4096 or input->'confirm' is distinct from 'true'::jsonb or (select count(*) from jsonb_object_keys(input))<>9
 or input->>'customerId' is null or input->>'customerId' !~ '^[0-9]{1,30}$' then raise exception 'accounting_review_rejected' using errcode='42501';end if;
 select * into c from private_t19_standard.connections where business_id=business and environment='staging' for share;
 if not found or c.status<>'connected' or c.connection_id is distinct from (input->>'connectionId')::uuid or c.generation is distinct from (input->>'generation')::integer or c.organization_id is distinct from input->>'organizationId' or c.api_domain is distinct from input->>'apiDomain' then raise exception 'accounting_review_stale' using errcode='42501';end if;
 select * into i from public.business_invoices where business_id=business and id=(input->>'invoiceId')::uuid for share;
 if not found or i.document_status<>'draft' or i.currency<>'ZAR' or i.version is distinct from (input->>'invoiceVersion')::integer or i.total_cents is distinct from (input->>'totalCents')::integer or not private_t19_standard.invoice_tax_ready(i.snapshot->'tax_snapshot',i.total_cents) then raise exception 'accounting_review_stale' using errcode='42501';end if;
 return private_t19_standard.t19_standard_approve_invoice(business,i.id,input->>'customerId');
end$$;
revoke all on function private_t19_standard.approve_reviewed_invoice(uuid,jsonb) from public,anon,service_role;
grant execute on function private_t19_standard.approve_reviewed_invoice(uuid,jsonb) to authenticated;
create function public.t19_standard_approve_reviewed_invoice(business uuid,input jsonb) returns uuid language sql security invoker set search_path='' as $$select private_t19_standard.approve_reviewed_invoice(business,input)$$;
revoke all on function public.t19_standard_approve_reviewed_invoice(uuid,jsonb) from public,anon,service_role;
grant execute on function public.t19_standard_approve_reviewed_invoice(uuid,jsonb) to authenticated;
-- Retire the unreviewed API path; preserve its implementation/history for the checked facade.
revoke all on function public.t19_standard_approve_invoice(uuid,uuid,text) from authenticated;
revoke all on function private_t19_standard.t19_standard_approve_invoice(uuid,uuid,text) from authenticated;
create function private_t19_standard.reconcile_invoice(business uuid,job uuid,connection uuid,generation integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid;c private_t19_standard.connections;j private_t19_standard.invoice_jobs;
begin
 actor:=private_t19_standard.invoice_owner(business);
 select * into c from private_t19_standard.connections where business_id=business and environment='staging' for share;
 if not found or c.status<>'connected' or c.connection_id is distinct from connection or c.generation is distinct from generation then raise exception 'accounting_review_stale' using errcode='42501';end if;
 select * into j from private_t19_standard.invoice_jobs where id=job and business_id=business for update;
 if not found or j.actor<>actor or not j.dispatched or j.state<>'review_required' or j.attempts>=5 or j.connection_id<>c.connection_id or j.generation<>c.generation or j.organization_id<>c.organization_id or j.api_domain<>c.api_domain then raise exception 'accounting_reconciliation_denied' using errcode='42501';end if;
 update private_t19_standard.invoice_jobs set state='retry',available_at=clock_timestamp(),error_code='' where id=job;
 return job;
end$$;
revoke all on function private_t19_standard.reconcile_invoice(uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function private_t19_standard.reconcile_invoice(uuid,uuid,uuid,integer) to authenticated;
create function public.t19_standard_reconcile_invoice(business uuid,job uuid,connection uuid,generation integer) returns uuid language sql security invoker set search_path='' as $$select private_t19_standard.reconcile_invoice(business,job,connection,generation)$$;
revoke all on function public.t19_standard_reconcile_invoice(uuid,uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.t19_standard_reconcile_invoice(uuid,uuid,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
