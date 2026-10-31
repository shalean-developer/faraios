-- Preserve the original installed migration; move its guarded approval implementation
-- behind a SECURITY INVOKER API facade, matching the standard connection RPC pattern.
begin;
alter function public.t19_standard_approve_invoice(uuid,uuid,text) set schema private_t19_standard;
revoke all on function private_t19_standard.t19_standard_approve_invoice(uuid,uuid,text) from public,anon,service_role;
grant execute on function private_t19_standard.t19_standard_approve_invoice(uuid,uuid,text) to authenticated;
create function public.t19_standard_approve_invoice(business uuid,invoice uuid,customer text) returns uuid
language sql security invoker set search_path='' as $$select private_t19_standard.t19_standard_approve_invoice(business,invoice,customer)$$;
revoke all on function public.t19_standard_approve_invoice(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.t19_standard_approve_invoice(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
