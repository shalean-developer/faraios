-- REVIEW SOURCE ONLY. No hosted execution or public schema exposure is implied.
begin;
do $$ begin if current_setting('faraios.t19_runtime_review',true) is distinct from 'approved-source-test' then raise exception 'review context required';end if;end $$;
-- OP-04: API activation is not approved; fail closed on absent prior source.
do $t19_preflight$ begin
 if not exists (select 1 from pg_roles where rolname='t19_runtime_owner')
    or to_regclass('private_t19_custody.oauth_states') is null
    or to_regprocedure('private_t19_custody.oauth(text,jsonb)') is null
    or to_regprocedure('private_t19_custody.status(uuid)') is not null
    or to_regprocedure('private_t19_custody.reconcile(uuid,uuid)') is not null
    or to_regprocedure('public.t19_accounting_status(uuid)') is not null
 then raise exception 'T19 API prerequisite/collision: stop and audit' using errcode='55000'; end if;
end $t19_preflight$;
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
alter function private_t19_custody.status(uuid) owner to t19_runtime_owner;
alter function private_t19_custody.reconcile(uuid,uuid) owner to t19_runtime_owner;
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
revoke all on function private_t19_custody.status(uuid),private_t19_custody.reconcile(uuid,uuid) from public,anon,service_role;
grant execute on function private_t19_custody.status(uuid),private_t19_custody.reconcile(uuid,uuid) to authenticated;
create function public.t19_accounting_status(business uuid) returns jsonb language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.status(business)$$;
create function public.t19_enqueue_invoice(business uuid,connection uuid,invoice uuid,customer text) returns uuid language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.enqueue(business,connection,invoice,customer)$$;
create function public.t19_disconnect(business uuid,connection uuid,expected_generation bigint) returns boolean language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.disconnect(business,connection,expected_generation)$$;
create function public.t19_reconcile(business uuid,operation uuid) returns uuid language sql security invoker set search_path=pg_catalog as $$select private_t19_custody.reconcile(business,operation)$$;
revoke all on function public.t19_accounting_status(uuid),public.t19_enqueue_invoice(uuid,uuid,uuid,text),public.t19_disconnect(uuid,uuid,bigint),public.t19_reconcile(uuid,uuid) from public,anon,service_role;
grant execute on function public.t19_accounting_status(uuid),public.t19_enqueue_invoice(uuid,uuid,uuid,text),public.t19_disconnect(uuid,uuid,bigint),public.t19_reconcile(uuid,uuid) to authenticated;
commit;
