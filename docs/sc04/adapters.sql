-- Apply AFTER migrations, reviewed manual activation profile and SC-03, inside disposable DB only.
-- Catalogue-driven coverage fails closed for unknown signatures; report definitions in evidence.
begin;
create table authorization_private.legacy_functions(identity text primary key,definition text not null);
alter table authorization_private.legacy_functions enable row level security;
revoke all on authorization_private.legacy_functions from public,anon,authenticated,service_role;
create trigger immutable before update or delete on authorization_private.legacy_functions for each row execute function authorization_private.immutable();
do $adapter$
declare r record; body text;guard text;expr text;
begin
 for r in select p.*,n.nspname,l.lanname,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where n.nspname in ('public','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private')
 and p.proargnames @> array['p_business','p_environment'] and p.proname not like 'business_invite_%' and p.proname<>'business_membership_revoke'
 loop
  insert into authorization_private.legacy_functions values(r.oid::regprocedure::text,r.definition);
  guard:='perform authorization_private.require_owner(p_business,p_environment);';
  if r.lanname='plpgsql' then
   body:=regexp_replace(r.prosrc,'\mbegin\M','begin '||guard,'i');
   if body=r.prosrc then raise exception 'Missing adapter BEGIN: %',r.oid::regprocedure;end if;
  elsif r.lanname='sql' and not r.proretset and r.prorettype='jsonb'::regtype then
   expr:=regexp_replace(btrim(r.prosrc),';\s*$','');
   body:='begin '||guard||' return ('||expr||');end';
  else raise exception 'Unsupported adapter: %',r.oid::regprocedure;
  end if;
  execute format('create or replace function %I.%I(%s) returns %s language plpgsql %s %s set search_path='''' as %L',r.nspname,r.proname,pg_get_function_arguments(r.oid),pg_get_function_result(r.oid),case when r.prosecdef then 'security definer' else 'security invoker' end,case r.provolatile when 's' then 'stable' when 'i' then 'immutable' else 'volatile' end,body);
 end loop;
 -- Restrictive policies compose with every original permissive policy. Public
 -- published projection stays public; its owner write paths still require context.
 for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='business_id' and not a.attisdropped) and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='environment' and not a.attisdropped)
 loop
  if r.relname='business_public_pages' then
   execute format('create policy sc04_insert on public.%I as restrictive for insert to authenticated with check(authorization_private.allowed(business_id,environment))',r.relname);
   execute format('create policy sc04_update on public.%I as restrictive for update to authenticated using(authorization_private.allowed(business_id,environment)) with check(authorization_private.allowed(business_id,environment))',r.relname);
   execute format('create policy sc04_delete on public.%I as restrictive for delete to authenticated using(authorization_private.allowed(business_id,environment))',r.relname);
  else
   execute format('create policy sc04_context on public.%I as restrictive for all to authenticated using(authorization_private.allowed(business_id,environment)) with check(authorization_private.allowed(business_id,environment))',r.relname);
  end if;
 end loop;
end $adapter$;
create policy sc04_business_read on public.businesses as restrictive for select to authenticated using(authorization_private.allowed(id,nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment'));
create policy sc04_business_update on public.businesses as restrictive for update to authenticated using(authorization_private.allowed(id,nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment')) with check(authorization_private.allowed(id,nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment'));
create policy sc04_activity on public.business_enquiry_activity as restrictive for select to authenticated using(exists(select 1 from public.business_enquiries e where e.id=enquiry_id and authorization_private.allowed(e.business_id,e.environment)));
revoke insert on public.businesses from authenticated;
revoke insert(owner_id,name,business_type,country,time_zone) on public.businesses from authenticated;
-- All three legacy views remain security_invoker; policies below them enforce context.
commit;
