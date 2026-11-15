-- Prepared additive upgrade for the shared SC04 installation. Never auto-applied.
begin;
set local lock_timeout='5s';
create table authorization_private.live_businesses (
 business_id uuid primary key references public.businesses on delete restrict,
 enabled boolean not null default false
);
alter table authorization_private.live_businesses enable row level security;
revoke all on authorization_private.live_businesses from public,anon,authenticated,service_role;
create function authorization_private.delegation_scope(b uuid,e text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from authorization_private.delegation_gate where enabled)
 and case e when 'preview' then exists(select 1 from authorization_private.preview_businesses where business_id=b)
 when 'live' then exists(select 1 from authorization_private.live_businesses where business_id=b and enabled)
 else false end
$$;
revoke all on function authorization_private.delegation_scope(uuid,text) from public,anon,authenticated,service_role;
create or replace function authorization_private.member_role(b uuid,e text) returns text
language sql stable security definer set search_path='' as $$
 select m.role from public.business_memberships m join public.businesses x on x.id=m.business_id
 where m.business_id=b and m.environment=e and m.user_id=auth.uid() and m.active
 and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
 and b::text=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-business')
 and e=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment')
 and ((m.role='owner' and x.owner_id=m.user_id) or (m.role<>'owner' and authorization_private.delegation_scope(b,e)))
$$;
create or replace function public.business_contexts(p_discovery boolean default true) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('business_id',b.id,'environment',m.environment,'role',m.role,'name',b.name,'business_type',b.business_type,'country',b.country,'time_zone',b.time_zone) order by b.id,m.environment),'[]')
 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.user_id=auth.uid() and m.active and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
 and ((m.role='owner' and b.owner_id=m.user_id) or (m.role<>'owner' and authorization_private.delegation_scope(b.id,m.environment)))
$$;
-- Preserve the bounded, recipient-bound invitation implementation. Abort on drift.
do $upgrade$
declare body text;
begin
 body=pg_get_functiondef('public.business_invite_create(uuid,text,uuid,text,integer)'::regprocedure);
 if strpos(body,$old$p_environment<>'preview'$old$)=0 or strpos(body,'and user_id=p_recipient)')=0 then raise exception 'Invitation source drift';end if;
 body=replace(body,$old$p_environment<>'preview'$old$,$new$(p_environment not in ('preview','live') or (p_environment='live' and not authorization_private.delegation_scope(p_business,p_environment)))$new$);
 body=replace(body,'and user_id=p_recipient)','and user_id=p_recipient and active)');
 execute body;
 body=pg_get_functiondef('public.business_invite_accept(uuid,text,text)'::regprocedure);
 if strpos(body,$old$p_environment is distinct from 'preview'$old$)=0 or strpos(body,'insert into public.business_memberships values(i.business_id,i.environment,auth.uid(),i.role,true);')=0 then raise exception 'Acceptance source drift';end if;
 body=replace(body,$old$p_environment is distinct from 'preview'$old$,$new$(p_environment is null or p_environment not in ('preview','live') or (p_environment='live' and not authorization_private.delegation_scope(p_business,p_environment)))$new$);
 body=replace(body,'insert into public.business_memberships values(i.business_id,i.environment,auth.uid(),i.role,true);',
 $new$insert into public.business_memberships values(i.business_id,i.environment,auth.uid(),i.role,true)
 on conflict(business_id,environment,user_id) do update set role=excluded.role,active=true
 where not public.business_memberships.active and public.business_memberships.role<>'owner';
 if not found then raise exception 'Membership already active';end if;$new$);
 execute body;
end $upgrade$;
create function public.business_access_list(p_business uuid,p_environment text) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 perform authorization_private.require_owner(p_business,p_environment);
 return jsonb_build_object('members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'role',role,'active',active) order by role,user_id),'[]') from public.business_memberships where business_id=p_business and environment=p_environment),
 'invitations',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'recipient',recipient,'role',role,'expires_at',expires_at,'accepted',accepted_at is not null,'revoked',revoked_at is not null) order by expires_at desc),'[]') from authorization_private.invitations where business_id=p_business and environment=p_environment));
end$$;
revoke all on function public.business_access_list(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.business_access_list(uuid,text) to authenticated;
-- No operator enablement is part of installation. Preview state is also preserved.
do $$begin
 if exists(select 1 from authorization_private.live_businesses) then raise exception 'Live allowlist must start empty';end if;
end$$;
commit;
