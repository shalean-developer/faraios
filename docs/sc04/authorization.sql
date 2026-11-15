-- Disposable SC-04 candidate. Outside automatic migrations; no hosted execution.
begin;
create schema authorization_private;
revoke all on schema authorization_private from public,anon,authenticated,service_role;
create table public.business_memberships (
 business_id uuid not null references public.businesses on delete restrict,
 environment text not null check(environment in ('preview','live')),
 user_id uuid not null references auth.users on delete restrict,
 role text not null check(role in ('owner','manager','receptionist','worker')),
 active boolean not null default true,
 primary key(business_id,environment,user_id)
);
create table authorization_private.invitations (
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete restrict,
 environment text not null check(environment in ('preview','live')),
 recipient uuid not null references auth.users on delete restrict,
 role text not null check(role in ('manager','receptionist','worker')),
 token_hash bytea not null unique,expires_at timestamptz not null,
 created_by uuid not null references auth.users on delete restrict,
 accepted_at timestamptz,revoked_at timestamptz,
 check(not(accepted_at is not null and revoked_at is not null))
);
create table authorization_private.events (
 id bigint generated always as identity primary key,business_id uuid not null references public.businesses on delete restrict,
 environment text not null,actor uuid,action text not null,subject uuid,recorded_at timestamptz not null default clock_timestamp()
);
alter table public.business_memberships enable row level security;
alter table authorization_private.invitations enable row level security;
alter table authorization_private.events enable row level security;
revoke all on public.business_memberships,authorization_private.invitations,authorization_private.events from public,anon,authenticated,service_role;
create function authorization_private.immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Authorization history is immutable';end$$;
create trigger immutable before update or delete on authorization_private.events for each row execute function authorization_private.immutable();
-- A selector is untrusted input, never an authority. Verified identity plus membership decides.
create function authorization_private.allowed(b uuid,e text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
 and e in ('preview','live') and b::text=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-business')
 and e=(nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment')
 and exists(select 1 from public.business_memberships m join public.businesses x on x.id=m.business_id
 where m.business_id=b and m.environment=e and m.user_id=auth.uid() and m.active and m.role='owner' and x.owner_id=m.user_id),false)
$$;
create function authorization_private.require_owner(b uuid,e text) returns void language plpgsql security definer set search_path='' as $$begin
 if not authorization_private.allowed(b,e) then raise exception 'Business context denied' using errcode='42501';end if;
end$$;
-- Preserve the accountable owner mapping exactly. No delegation/transfer is enabled.
create function authorization_private.owner_backfill() returns void language plpgsql security definer set search_path='' as $$begin
 lock table public.businesses in share row exclusive mode;
 if exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.user_id=b.owner_id and (m.role<>'owner' or not m.active)) then raise exception 'Conflicting owner membership';end if;
 insert into public.business_memberships(business_id,environment,user_id,role)
 select b.id,e,b.owner_id,'owner' from public.businesses b cross join unnest(array['preview','live']) e on conflict do nothing;
end$$;
select authorization_private.owner_backfill();
create function authorization_private.new_owner() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.business_memberships(business_id,environment,user_id,role) values(new.id,'preview',new.owner_id,'owner'),(new.id,'live',new.owner_id,'owner');return new;end$$;
create trigger new_owner after insert on public.businesses for each row execute function authorization_private.new_owner();
create function authorization_private.protect_owner() returns trigger language plpgsql security definer set search_path='' as $$begin
 -- Serialize all membership changes for the business, including concurrent removals.
 perform 1 from public.businesses where id=old.business_id for update;
 if old.role='owner' and old.active then raise exception 'Accountable owner cannot be removed or changed';end if;
 if tg_op='DELETE' then return old;end if;return new;end$$;
create trigger protect_owner before update or delete on public.business_memberships for each row execute function authorization_private.protect_owner();
-- Account creation does not rely on INSERT RETURNING through a context SELECT policy.
create function public.business_context_create(p_name text,p_type text,p_country text,p_zone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare b uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) or p_country is null or p_zone is null then raise exception 'Owner identity required' using errcode='42501';end if;
 insert into public.businesses(owner_id,name,business_type,country,time_zone) values(auth.uid(),p_name,p_type,p_country,p_zone) returning id into b;
 return jsonb_build_object('business_id',b);
end$$;
revoke all on function public.business_context_create(text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.business_context_create(text,text,text,text) to authenticated;
-- Metadata discovery cannot expose operational rows or choose an arbitrary first business.
create function public.business_contexts(p_discovery boolean default true) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('business_id',b.id,'environment',m.environment,'role',m.role) order by b.id,m.environment),'[]')
 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.user_id=auth.uid() and b.owner_id=auth.uid() and m.active and m.role='owner' and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
$$;
create function public.business_invite_create(p_business uuid,p_environment text,p_recipient uuid,p_role text,p_hours integer default 24) returns jsonb language plpgsql security definer set search_path='' as $$
declare secret text;i uuid;
begin
 perform authorization_private.require_owner(p_business,p_environment);
 if p_environment<>'preview' or p_recipient is null or p_recipient=auth.uid() or p_role is null or p_role not in ('manager','receptionist','worker') or p_hours is null or p_hours not between 1 and 168 then raise exception 'Invalid invitation';end if;
 perform 1 from public.businesses where id=p_business for update;
 if (select count(*) from authorization_private.invitations where business_id=p_business and environment=p_environment and accepted_at is null and revoked_at is null and expires_at>clock_timestamp())>=20 then raise exception 'Invitation limit';end if;
 if exists(select 1 from public.business_memberships where business_id=p_business and environment=p_environment and user_id=p_recipient) then raise exception 'Membership exists';end if;
 if exists(select 1 from authorization_private.invitations where business_id=p_business and environment=p_environment and recipient=p_recipient and accepted_at is null and revoked_at is null and expires_at>clock_timestamp()) then raise exception 'Invitation exists';end if;
 secret:=encode(extensions.gen_random_bytes(32),'hex');
 insert into authorization_private.invitations(business_id,environment,recipient,role,token_hash,expires_at,created_by) values(p_business,p_environment,p_recipient,p_role,extensions.digest(secret,'sha256'),clock_timestamp()+make_interval(hours=>p_hours),auth.uid()) returning id into i;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'invite.created',i);
 return jsonb_build_object('id',i,'token',secret);
end$$;
create function public.business_invite_accept(p_business uuid,p_environment text,p_token text) returns void language plpgsql security definer set search_path='' as $$
declare i authorization_private.invitations;
begin
 if p_environment is distinct from 'preview' or p_business is null or p_token is null or p_token !~ '^[0-9a-f]{64}$' or auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'Invitation denied';end if;
 perform 1 from public.businesses where id=p_business for update;
 select * into i from authorization_private.invitations where token_hash=extensions.digest(p_token,'sha256') and business_id=p_business and environment=p_environment for update;
 if not found or i.recipient<>auth.uid() or i.accepted_at is not null or i.revoked_at is not null or i.expires_at<=clock_timestamp() then raise exception 'Invitation denied';end if;
 insert into public.business_memberships values(i.business_id,i.environment,auth.uid(),i.role,true);
 update authorization_private.invitations set accepted_at=clock_timestamp() where id=i.id;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'invite.accepted',i.id);
 -- Role recorded, but authorization remains hard-coded owner-only until full gate.
end$$;
create function public.business_invite_revoke(p_business uuid,p_environment text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform authorization_private.require_owner(p_business,p_environment);
 perform 1 from public.businesses where id=p_business for update;
 update authorization_private.invitations set revoked_at=clock_timestamp() where id=p_id and business_id=p_business and environment=p_environment and accepted_at is null and revoked_at is null;
 if not found then raise exception 'Invitation unavailable';end if;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'invite.revoked',p_id);
end$$;
create function public.business_membership_revoke(p_business uuid,p_environment text,p_user uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform authorization_private.require_owner(p_business,p_environment);
 perform 1 from public.businesses where id=p_business for update;
 update public.business_memberships set active=false where business_id=p_business and environment=p_environment and user_id=p_user and active;
 if not found then raise exception 'Membership unavailable';end if;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'membership.revoked',p_user);
end$$;
revoke all on all functions in schema authorization_private from public,anon,authenticated,service_role;
grant usage on schema authorization_private to authenticated;
grant execute on function authorization_private.allowed(uuid,text),authorization_private.require_owner(uuid,text) to authenticated;
revoke all on function public.business_contexts(boolean),public.business_invite_create(uuid,text,uuid,text,integer),public.business_invite_accept(uuid,text,text),public.business_invite_revoke(uuid,text,uuid),public.business_membership_revoke(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.business_contexts(boolean),public.business_invite_create(uuid,text,uuid,text,integer),public.business_invite_accept(uuid,text,text),public.business_invite_revoke(uuid,text,uuid),public.business_membership_revoke(uuid,text,uuid) to authenticated;
commit;
