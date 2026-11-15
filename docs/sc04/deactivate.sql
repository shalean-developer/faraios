-- Disposable rollback rehearsal ONLY. Restore the original application at the
-- same time; no API caller can run this operator script. Retain all new history.
begin;
do $rollback$
declare r record;
begin
 for r in select definition from authorization_private.legacy_functions order by identity loop execute r.definition;end loop;
 for r in select schemaname,tablename,policyname from pg_policies where policyname like 'sc04_%' loop
  execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
 end loop;
end $rollback$;
-- Exact original INSERT grants (not table-wide grants).
grant insert(owner_id,name,business_type,country,time_zone) on public.businesses to authenticated;
revoke all on function public.business_contexts(boolean),public.business_context_create(text,text,text,text),public.business_invite_create(uuid,text,uuid,text,integer),public.business_invite_accept(uuid,text,text),public.business_invite_revoke(uuid,text,uuid),public.business_membership_revoke(uuid,text,uuid) from public,anon,authenticated,service_role;
do $delegated$ begin
 if to_regclass('authorization_private.delegation_gate') is not null then
  update authorization_private.delegation_gate set enabled=false;
  revoke all on function public.business_delegate_command(uuid,text,text,jsonb),public.business_delegate_read(uuid,text,text,uuid),public.business_worker_link(uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
 end if;
end $delegated$;
-- New membership/invitation/history rows and protective triggers stay intact.
commit;
