-- Source candidate: explicit owner correction of missing tax on fictitious staging drafts.
-- Original snapshot retained; no trigger disablement, booking rewrite or provider operation.
begin;
create table private_t19_standard.test_tax_corrections(
 invoice_id uuid primary key references public.business_invoices(id),business_id uuid not null references public.businesses(id),
 actor uuid not null references auth.users(id),original_version integer not null,original_snapshot jsonb not null,
 corrected_snapshot jsonb not null,reason text not null,created_at timestamptz not null default clock_timestamp(),
 transaction_id bigint not null default txid_current()
);
alter table private_t19_standard.test_tax_corrections enable row level security;
revoke all on private_t19_standard.test_tax_corrections from public,anon,authenticated,service_role,t19_standard_backend;

create function private_t19_standard.correct_test_nonvat(business uuid,invoice uuid,expected_version integer,expected_total integer,reason text,confirmed_fictitious boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare actor uuid;i public.business_invoices;tax jsonb;corrected jsonb;policy public.business_vat_settings;
begin
 actor:=private_t19_standard.invoice_owner(business);
 if confirmed_fictitious is distinct from true or length(trim(reason)) not between 10 and 500 or reason is null then raise exception 'accounting_test_correction_denied' using errcode='42501';end if;
 -- Enrollment is staging-only and must exist before the correction is accepted.
 if not exists(select 1 from private_t19_standard.backend_businesses where business_id=business and environment='staging' and enabled) then raise exception 'accounting_test_correction_denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('vat:'||business::text,0));
 select * into policy from public.business_vat_settings where business_id=business;
 if not found or policy.enabled or policy.vat_number is not null or policy.registration_date is not null then raise exception 'accounting_test_correction_denied' using errcode='42501';end if;
 select * into i from public.business_invoices where id=invoice and business_id=business for update;
 if not found or i.version is distinct from expected_version or i.total_cents is distinct from expected_total or i.document_status<>'draft' or i.sync_status<>'not_synced' or i.provider_binding is not null or i.external_customer_id is not null or i.external_invoice_id is not null or i.attempt_id is not null or nullif(i.snapshot->'tax_snapshot','null'::jsonb) is not null or exists(select 1 from private_t19_standard.invoice_jobs where invoice_id=i.id) then raise exception 'accounting_test_correction_stale' using errcode='42501';end if;
 tax:=jsonb_build_object('enabled',false,'policy_version',policy.version,'price_basis','customer_total','rate_bps',0,'vat_number',null,'registration_date',null,'net_cents',i.total_cents,'vat_cents',0,'total_cents',i.total_cents);
 corrected:=i.snapshot||jsonb_build_object('tax_snapshot',tax);
 insert into private_t19_standard.test_tax_corrections(invoice_id,business_id,actor,original_version,original_snapshot,corrected_snapshot,reason)
 values(i.id,business,actor,i.version,i.snapshot,corrected,trim(reason));
 update public.business_invoices set snapshot=corrected,version=version+1,last_actor=actor,updated_at=clock_timestamp() where id=i.id;
 return i.version+1;
end$$;
revoke all on function private_t19_standard.correct_test_nonvat(uuid,uuid,integer,integer,text,boolean) from public,anon,service_role;
grant execute on function private_t19_standard.correct_test_nonvat(uuid,uuid,integer,integer,text,boolean) to authenticated;
create function public.t19_standard_correct_test_nonvat(business uuid,invoice uuid,expected_version integer,expected_total integer,reason text,confirmed_fictitious boolean) returns integer language sql security invoker set search_path='' as $$select private_t19_standard.correct_test_nonvat(business,invoice,expected_version,expected_total,reason,confirmed_fictitious)$$;
revoke all on function public.t19_standard_correct_test_nonvat(uuid,uuid,integer,integer,text,boolean) from public,anon,service_role;
grant execute on function public.t19_standard_correct_test_nonvat(uuid,uuid,integer,integer,text,boolean) to authenticated;

create or replace function audit.capture_invoice_change() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_table_schema<>'public' or tg_table_name not in ('business_invoices','business_accounting_connections') then raise exception 'Unsupported audit source';end if;
 if tg_op='UPDATE' and to_jsonb(old)=to_jsonb(new) then return new;end if;
 if tg_op='UPDATE' and (old.business_id<>new.business_id or old.created_at<>new.created_at) then raise exception 'Accounting identity is immutable';end if;
 if tg_table_name='business_invoices' and tg_op='UPDATE' and (to_jsonb(old)-array['sync_status','provider_binding','external_customer_id','external_invoice_id','external_invoice_number','provider_total_cents','provider_status','attempt_id','attempt_mode','attempt_started_at','checked_at','error_code','version','last_actor','updated_at']) is distinct from (to_jsonb(new)-array['sync_status','provider_binding','external_customer_id','external_invoice_id','external_invoice_number','provider_total_cents','provider_status','attempt_id','attempt_mode','attempt_started_at','checked_at','error_code','version','last_actor','updated_at']) then
  if not exists(select 1 from private_t19_standard.test_tax_corrections c where c.invoice_id=old.id and c.business_id=old.business_id and c.actor=new.last_actor and c.original_version=old.version and c.transaction_id=txid_current() and c.original_snapshot=old.snapshot and c.corrected_snapshot=new.snapshot)
  or new.version<>old.version+1 or (new.snapshot-'tax_snapshot') is distinct from (old.snapshot-'tax_snapshot')
  or (to_jsonb(old)-array['snapshot','version','last_actor','updated_at']) is distinct from (to_jsonb(new)-array['snapshot','version','last_actor','updated_at']) then raise exception 'Invoice agreement is immutable';end if;
 end if;
 insert into audit.events(business_id,actor_user_id,database_role,entity_table,operation,old_record,new_record) values(new.business_id,new.last_actor,coalesce(nullif(current_setting('role',true),'none'),session_user),tg_table_name,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;
end;$fn$;

notify pgrst,'reload schema';
commit;
