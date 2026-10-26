-- REVIEW SOURCE ONLY. No hosted execution or public schema exposure is implied.
begin;
do $$ begin if current_setting('faraios.t19_runtime_review',true) is distinct from 'approved-source-test' then raise exception 'review context required';end if;end $$;
create function private_t19_custody.status(business uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if not private_t19_custody.allowed(business,auth.uid()) then raise exception 'custody_denied' using errcode='42501';end if;
 return jsonb_build_object('business_id',business,'connections',coalesce((select jsonb_agg(jsonb_build_object('connection_id',connection_id,
 'organization_id',organization_id,'generation',generation,'status',status,
 'revocation',(select jsonb_build_object('generation',r.generation,'phase',r.phase) from private_t19_custody.revocations r where r.connection_id=c.connection_id order by r.generation desc limit 1))) from private_t19_custody.connections c where business_id=business),'[]'),
 'jobs',coalesce((select jsonb_agg(to_jsonb(q)) from (select id,invoice_id,state,error_code,attempts,available_at from private_t19_custody.jobs
 where business_id=business order by created_at desc limit 100) q),'[]'));
end $$;
create function private_t19_custody.reconcile(business uuid,operation uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog as $$
declare j private_t19_custody.jobs;c private_t19_custody.connections;
begin
 if not private_t19_custody.allowed(business,auth.uid()) then raise exception 'custody_denied' using errcode='42501';end if;
 select c0.* into c from private_t19_custody.connections c0 join private_t19_custody.jobs j0 on j0.connection_id=c0.connection_id
 where j0.id=operation and j0.business_id=business for update of c0;
 select * into j from private_t19_custody.jobs where id=operation and business_id=business for update;
 if not found or not c.enabled or c.generation<>j.generation or j.kind<>'invoice' or j.state<>'recovery_required' then raise exception 'stale';end if;
 -- The durable dispatch flag is NEVER cleared; claim forces read-only reconcile.
 -- A fresh authenticated request supplies current authority, not the retired actor.
 update private_t19_custody.jobs set actor=auth.uid(),state='retry',available_at=clock_timestamp() where id=j.id;
 insert into private_t19_custody.events(business_id,connection_id,operation_id,kind,actor,previous_actor)
 values(business,c.connection_id,j.id,'reconciliation_requested',auth.uid(),j.actor);
 return j.id;
end $$;
-- Owner transfer is transaction-scoped. PostgreSQL 17 requires new-owner CREATE
-- on this schema and executor SET ROLE authority, even for ALTER FUNCTION OWNER.
-- Restore the creator-admin membership to its original SET FALSE state below.
grant create on schema private_t19_custody to t19_runtime_owner;
grant t19_runtime_owner to postgres with set true, inherit false;
alter function private_t19_custody.status(uuid) owner to t19_runtime_owner;
alter function private_t19_custody.reconcile(uuid,uuid) owner to t19_runtime_owner;
-- Do not leave function-creation or SET ROLE rights after ownership transfer.
revoke create on schema private_t19_custody from t19_runtime_owner;
grant t19_runtime_owner to postgres with set false, inherit false;
revoke all on function private_t19_custody.status(uuid),private_t19_custody.reconcile(uuid,uuid) from public,anon,service_role;
grant execute on function private_t19_custody.status(uuid),private_t19_custody.reconcile(uuid,uuid) to authenticated;
create function public.t19_accounting_status(business uuid) returns jsonb language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.status(business)$$;
create function public.t19_enqueue_invoice(business uuid,connection uuid,invoice uuid,customer text) returns uuid language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.enqueue(business,connection,invoice,customer)$$;
create function public.t19_disconnect(business uuid,connection uuid,expected_generation bigint) returns boolean language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.disconnect(business,connection,expected_generation)$$;
create function public.t19_reconcile(business uuid,operation uuid) returns uuid language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.reconcile(business,operation)$$;
revoke all on function public.t19_accounting_status(uuid),public.t19_enqueue_invoice(uuid,uuid,uuid,text),public.t19_disconnect(uuid,uuid,bigint),public.t19_reconcile(uuid,uuid) from public,anon,service_role;
grant execute on function public.t19_accounting_status(uuid),public.t19_enqueue_invoice(uuid,uuid,uuid,text),public.t19_disconnect(uuid,uuid,bigint),public.t19_reconcile(uuid,uuid) to authenticated;
commit;
