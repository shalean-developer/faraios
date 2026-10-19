-- Incremental staging hardening; baseline already contains this arrangement.
begin;
do $move$begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='booking_context' and p.prosecdef) then
  alter function public.booking_context(uuid) set schema audit;
 end if;
end;$move$;
revoke all on function audit.booking_context(uuid) from public,anon,authenticated;
grant execute on function audit.booking_context(uuid) to authenticated;
create or replace function public.booking_context(p_business_id uuid) returns jsonb language sql stable security invoker set search_path='' as $wrapper$select audit.booking_context(p_business_id)$wrapper$;
revoke all on function public.booking_context(uuid) from public,anon,authenticated;
grant execute on function public.booking_context(uuid) to authenticated;
commit;
