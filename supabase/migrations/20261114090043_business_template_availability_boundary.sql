begin;
-- Match the existing booking API boundary: private privileged lookup, public invoker wrapper.
create function request_private.available(p_environment text,p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('available',exists(
  select 1 from request_private.ingress g join public.business_public_pages p on p.environment=g.environment
  where g.environment=p_environment and g.enabled and p.slug=p_slug
  and exists(select 1 from jsonb_array_elements(p.services->'items') s where s->>'visible'='true' and s->>'archived'='false')
  ));
$$;
revoke all on function request_private.available(text,text) from public;
grant execute on function request_private.available(text,text) to anon,authenticated;
create or replace function public.business_booking_available(p_environment text,p_slug text) returns jsonb
language sql stable security invoker set search_path='' as $$select request_private.available(p_environment,p_slug)$$;
commit;
