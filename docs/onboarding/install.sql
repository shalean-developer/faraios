-- Additive candidate. Explicit installation only after SC04 live-readiness.
begin;
create table authorization_private.staff_onboarding_businesses (
 business_id uuid not null references public.businesses on delete restrict,
 environment text not null check(environment in ('preview','live')),enabled boolean not null default false,
 primary key(business_id,environment)
);
alter table authorization_private.staff_onboarding_businesses enable row level security;
revoke all on authorization_private.staff_onboarding_businesses from public,anon,authenticated,service_role;
create function authorization_private.staff_onboarding_scope(b uuid,e text) returns boolean language sql stable security definer set search_path='' as $$
 select authorization_private.delegation_scope(b,e) and exists(select 1 from authorization_private.staff_onboarding_businesses where business_id=b and environment=e and enabled)
$$;
revoke all on function authorization_private.staff_onboarding_scope(uuid,text) from public,anon,authenticated,service_role;
create table authorization_private.staff_invites (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses on delete restrict,
 environment text not null check(environment in ('preview','live')), staff_id uuid not null,
 email text not null, role text not null check(role in ('manager','receptionist','worker')),
 token_hash bytea not null unique, sealed_token text not null, created_by uuid not null references auth.users,
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
 accepted_at timestamptz, revoked_at timestamptz, user_id uuid references auth.users,
 delivery text not null default 'queued' check(delivery in ('queued','sending','provider_accepted','failed','cancelled')),
 attempts integer not null default 0, next_attempt timestamptz not null default clock_timestamp(), lease uuid, lease_until timestamptz, provider_id text,
 foreign key(staff_id,business_id,environment) references public.business_staff(id,business_id,environment) on delete restrict
);
alter table authorization_private.staff_invites enable row level security;
revoke all on authorization_private.staff_invites from public,anon,authenticated,service_role;
create function public.business_staff_invite(p_business uuid,p_environment text,p_staff uuid,p_role text,p_hash text,p_sealed text,p_replace uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.business_staff; i uuid;
begin
 perform authorization_private.require_owner(p_business,p_environment);
 if not authorization_private.staff_onboarding_scope(p_business,p_environment) then raise exception 'Invitation unavailable';end if;
 perform 1 from public.businesses where id=p_business for update;
 select * into s from public.business_staff where id=p_staff and business_id=p_business and environment=p_environment for update;
 if not found or not s.active or s.email='' or p_role not in ('manager','receptionist','worker') or p_role is null or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_sealed is null or length(p_sealed) not between 100 and 4096 then raise exception 'Check invitation details';end if;
 if exists(select 1 from authorization_private.worker_identities w join public.business_memberships m using(business_id,environment,user_id) where w.business_id=p_business and w.environment=p_environment and w.staff_id=p_staff and m.active) then raise exception 'Staff already linked';end if;
 if exists(select 1 from authorization_private.staff_invites where business_id=p_business and environment=p_environment and staff_id=p_staff and accepted_at is not null and user_id in (select user_id from public.business_memberships where business_id=p_business and environment=p_environment and active)) then raise exception 'Staff already has access';end if;
 if (select count(*) from authorization_private.staff_invites where business_id=p_business and environment=p_environment and created_at>clock_timestamp()-interval '1 hour')>=20 then raise exception 'Invitation rate limit';end if;
 if p_replace is not null then
  update authorization_private.staff_invites set revoked_at=clock_timestamp(),delivery=case when delivery='provider_accepted' then delivery else 'cancelled' end where id=p_replace and business_id=p_business and environment=p_environment and staff_id=p_staff and accepted_at is null and revoked_at is null and created_at<clock_timestamp()-interval '60 seconds';
  if not found then raise exception 'Invitation changed or resend too soon';end if;
 end if;
 if exists(select 1 from authorization_private.staff_invites where business_id=p_business and environment=p_environment and (staff_id=p_staff or email=lower(btrim(s.email))) and accepted_at is null and revoked_at is null and expires_at>clock_timestamp()) then raise exception 'Invitation already pending';end if;
 if exists(select 1 from authorization_private.invitations i join auth.users u on u.id=i.recipient where i.business_id=p_business and i.environment=p_environment and lower(u.email)=lower(btrim(s.email)) and i.accepted_at is null and i.revoked_at is null and i.expires_at>clock_timestamp()) then raise exception 'Manual invitation pending; revoke it first';end if;
 insert into authorization_private.staff_invites(business_id,environment,staff_id,email,role,token_hash,sealed_token,created_by) values(p_business,p_environment,p_staff,lower(btrim(s.email)),p_role,decode(p_hash,'hex'),p_sealed,auth.uid()) returning id into i;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'staff.invite.created',i);
 return jsonb_build_object('id',i);
end$$;
create function public.business_staff_invite_accept(p_id uuid,p_environment text,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i authorization_private.staff_invites; s public.business_staff; b uuid; e text; sid uuid; verified text;
begin
 select business_id,environment,staff_id into b,e,sid from authorization_private.staff_invites where id=p_id;
 perform 1 from public.businesses where id=b for update;
 select * into s from public.business_staff where id=sid and business_id=b and environment=e for update;
 select * into i from authorization_private.staff_invites where id=p_id for update;
 select lower(email) into verified from auth.users where id=auth.uid() and email_confirmed_at is not null for share;
 if p_environment is null or i.environment is distinct from p_environment or i.id is null or verified is null or verified<>i.email or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) or p_token is null or p_token!~'^[a-f0-9]{64}$' or i.token_hash<>extensions.digest(p_token,'sha256') or i.accepted_at is not null or i.revoked_at is not null or i.expires_at<=clock_timestamp() or not authorization_private.staff_onboarding_scope(b,e) then raise exception 'Invitation unavailable or wrong account';end if;
 if not s.active or lower(btrim(s.email))<>i.email then raise exception 'Staff details changed; request a new invitation';end if;
 insert into public.business_memberships values(b,e,auth.uid(),i.role,true) on conflict(business_id,environment,user_id) do update set active=true,role=excluded.role where not public.business_memberships.active and public.business_memberships.role<>'owner';
 if not found then raise exception 'Membership already active';end if;
 if i.role='worker' then
  if exists(select 1 from authorization_private.worker_identities where business_id=b and environment=e and (user_id=auth.uid() or staff_id=i.staff_id) and (user_id<>auth.uid() or staff_id<>i.staff_id)) then raise exception 'Worker link conflict';end if;
  insert into authorization_private.worker_identities values(b,e,auth.uid(),i.staff_id) on conflict(business_id,environment,user_id) do nothing;
 end if;
 update authorization_private.staff_invites set accepted_at=clock_timestamp(),user_id=auth.uid() where id=i.id;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(b,e,auth.uid(),'staff.invite.accepted',i.id);
 return jsonb_build_object('business_id',b,'environment',e,'role',i.role);
end$$;
create function public.business_staff_invite_list(p_business uuid,p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform authorization_private.require_owner(p_business,p_environment);
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'staff_id',staff_id,'email',email,'role',role,'user_id',user_id,'status',case when revoked_at is not null then 'Revoked' when accepted_at is not null then case when exists(select 1 from public.business_memberships m where m.business_id=staff_invites.business_id and m.environment=staff_invites.environment and m.user_id=staff_invites.user_id and m.active and m.role=staff_invites.role and not exists(select 1 from authorization_private.staff_invites later where later.business_id=staff_invites.business_id and later.environment=staff_invites.environment and later.user_id=staff_invites.user_id and later.accepted_at>staff_invites.accepted_at)) then 'Active' else 'Revoked' end when expires_at<=clock_timestamp() then 'Expired' else 'Pending' end,'delivery',delivery,'expires_at',expires_at) order by created_at desc) from authorization_private.staff_invites where business_id=p_business and environment=p_environment),'[]');
end$$;
create function public.business_staff_invite_revoke(p_business uuid,p_environment text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform authorization_private.require_owner(p_business,p_environment);if not authorization_private.staff_onboarding_scope(p_business,p_environment) then raise exception 'Staff onboarding unavailable';end if;perform 1 from public.businesses where id=p_business for update;
 update authorization_private.staff_invites set revoked_at=clock_timestamp(),delivery=case when delivery='provider_accepted' then delivery else 'cancelled' end where id=p_id and business_id=p_business and environment=p_environment and revoked_at is null and accepted_at is null;
 if not found then raise exception 'Invitation unavailable';end if;
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'staff.invite.revoked',p_id);
end$$;
-- Worker-only transport endpoints; leases bound completion and retries to one attempt.
create function public.business_staff_mail_claim(p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i authorization_private.staff_invites;
begin
 update authorization_private.staff_invites set delivery='failed',lease_until=null where environment=p_environment and delivery='sending' and attempts>=6 and lease_until<clock_timestamp();
 select q.* into i from authorization_private.staff_invites q where q.environment=p_environment and q.revoked_at is null and q.accepted_at is null and q.expires_at>clock_timestamp() and authorization_private.staff_onboarding_scope(q.business_id,q.environment) and q.attempts<6 and q.next_attempt<=clock_timestamp() and (q.delivery='queued' or (q.delivery='sending' and q.lease_until<clock_timestamp())) order by q.created_at for update skip locked limit 1;
 if not found then return '{}';end if;
 update authorization_private.staff_invites set delivery='sending',attempts=attempts+1,lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes' where id=i.id returning * into i;
 return jsonb_build_object('id',i.id,'lease',i.lease,'recipient',i.email,'role',i.role,'environment',i.environment,'sealed_token',i.sealed_token,'expires_at',i.expires_at,'business',(select name from public.businesses where id=i.business_id));
end$$;
create function public.business_staff_mail_finish(p_id uuid,p_lease uuid,p_provider text,p_retry boolean) returns void language plpgsql security definer set search_path='' as $$begin
 update authorization_private.staff_invites set delivery=case when p_provider<>'' then 'provider_accepted' when p_retry and attempts<6 then 'queued' else 'failed' end,provider_id=nullif(p_provider,''),next_attempt=clock_timestamp()+interval '1 minute'*power(2,attempts),lease_until=null where id=p_id and lease=p_lease and delivery='sending';
end$$;
revoke all on function public.business_staff_invite(uuid,text,uuid,text,text,text,uuid),public.business_staff_invite_accept(uuid,text,text),public.business_staff_invite_list(uuid,text),public.business_staff_invite_revoke(uuid,text,uuid),public.business_staff_mail_claim(text),public.business_staff_mail_finish(uuid,uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.business_staff_invite(uuid,text,uuid,text,text,text,uuid),public.business_staff_invite_accept(uuid,text,text),public.business_staff_invite_list(uuid,text),public.business_staff_invite_revoke(uuid,text,uuid) to authenticated;
grant execute on function public.business_staff_mail_claim(text),public.business_staff_mail_finish(uuid,uuid,text,boolean) to service_role;
create function public.business_staff_invite_preview(p_id uuid,p_environment text,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i authorization_private.staff_invites; verified text;
begin
 select lower(email) into verified from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into i from authorization_private.staff_invites where id=p_id;
 if p_environment is null or i.environment is distinct from p_environment or verified is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) or i.id is null or verified<>i.email or p_token is null or p_token!~'^[a-f0-9]{64}$' or i.token_hash<>extensions.digest(p_token,'sha256') or i.accepted_at is not null or i.revoked_at is not null or i.expires_at<=clock_timestamp() or not authorization_private.staff_onboarding_scope(i.business_id,i.environment) then raise exception 'Invitation unavailable';end if;
 return jsonb_build_object('business',(select name from public.businesses where id=i.business_id),'environment',i.environment,'role',i.role,'email',i.email);
end$$;
create function public.business_staff_offboard(p_business uuid,p_environment text,p_staff uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 perform authorization_private.require_owner(p_business,p_environment);if not authorization_private.staff_onboarding_scope(p_business,p_environment) then raise exception 'Staff onboarding unavailable';end if;perform 1 from public.businesses where id=p_business for update;
 perform 1 from public.business_staff where id=p_staff and business_id=p_business and environment=p_environment for update;
 if not found then raise exception 'Staff unavailable';end if;
 if exists(select 1 from public.business_memberships m where m.business_id=p_business and m.environment=p_environment and m.role='owner' and m.user_id in (select user_id from authorization_private.staff_invites where business_id=p_business and environment=p_environment and staff_id=p_staff union select user_id from authorization_private.worker_identities where business_id=p_business and environment=p_environment and staff_id=p_staff)) then raise exception 'Accountable owner protected';end if;
 update public.business_staff set active=false,version=version+1,updated_at=clock_timestamp() where id=p_staff;
 update authorization_private.staff_invites set revoked_at=clock_timestamp(),delivery=case when delivery='provider_accepted' then delivery else 'cancelled' end where business_id=p_business and environment=p_environment and staff_id=p_staff and accepted_at is null and revoked_at is null;
 update public.business_memberships set active=false where business_id=p_business and environment=p_environment and role<>'owner' and user_id in (select user_id from authorization_private.staff_invites where business_id=p_business and environment=p_environment and staff_id=p_staff and accepted_at is not null union select user_id from authorization_private.worker_identities where business_id=p_business and environment=p_environment and staff_id=p_staff);
 insert into authorization_private.events(business_id,environment,actor,action,subject) values(p_business,p_environment,auth.uid(),'staff.offboarded',p_staff);
end$$;
revoke all on function public.business_staff_invite_preview(uuid,text,text),public.business_staff_offboard(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.business_staff_invite_preview(uuid,text,text),public.business_staff_offboard(uuid,text,uuid) to authenticated;
create function authorization_private.staff_invite_profile_change() returns trigger language plpgsql security definer set search_path='' as $$
declare i uuid;
begin
 if lower(btrim(new.email)) is distinct from lower(btrim(old.email)) or not new.active then
  for i in update authorization_private.staff_invites set revoked_at=clock_timestamp(),delivery=case when delivery='provider_accepted' then delivery else 'cancelled' end where staff_id=new.id and business_id=new.business_id and environment=new.environment and accepted_at is null and revoked_at is null returning id loop
   insert into authorization_private.events(business_id,environment,actor,action,subject) values(new.business_id,new.environment,auth.uid(),'staff.invite.profile_changed',i);
  end loop;
 end if;
 return new;
end$$;
revoke all on function authorization_private.staff_invite_profile_change() from public,anon,authenticated,service_role;
create trigger staff_invitation_profile_change after update of email,active on public.business_staff for each row execute function authorization_private.staff_invite_profile_change();
commit;
