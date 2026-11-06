-- T31 invitation candidate. Unapplied, no outbound email. Depends on identity, audit, T31 provisioning.
begin;
create role t31_invite_worker nologin noinherit;
grant usage on schema public, audit, private_t31 to t31_invite_worker;
grant select on public.businesses,public.business_memberships to t31_invite_worker;
grant insert on public.business_memberships,audit.events to t31_invite_worker;
grant update(status) on public.business_memberships to t31_invite_worker;
grant execute on function private_t31.current_actor(),private_t31.current_claims(),private_t31.current_verified_email() to t31_invite_worker;
create table private_t31.invitations(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 inviter_user_id uuid not null references auth.users(id),
 recipient_email text not null check(length(recipient_email) between 3 and 254),
 role text not null check(role in ('manager','staff')),
 token_hash text not null unique,
 state text not null default 'pending' check(state in ('pending','accepted','revoked')),
 expires_at timestamptz not null,
 accepted_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique(business_id,recipient_email,role,id)
);
alter table private_t31.invitations enable row level security;
revoke all on private_t31.invitations from public,anon,authenticated;
grant select,insert,update on private_t31.invitations to t31_invite_worker;
create policy t31_invite_worker_records on private_t31.invitations for all to t31_invite_worker using(true) with check(true);
create policy t31_invite_worker_business_read on public.businesses for select to t31_invite_worker using(true);
create policy t31_invite_worker_membership_read on public.business_memberships for select to t31_invite_worker using(true);
create policy t31_invite_worker_membership_insert on public.business_memberships for insert to t31_invite_worker
 with check(user_id=private_t31.current_actor() and role in ('staff','manager') and status='active');
create policy t31_invite_worker_membership_suspend on public.business_memberships for update to t31_invite_worker
 using(role in ('manager','staff') and status='active')
 with check(role in ('manager','staff') and status='suspended');
create policy t31_invite_worker_audit on audit.events for insert to t31_invite_worker
 with check(entity_table='business_memberships' and operation in ('INSERT','UPDATE') and actor_user_id=private_t31.current_actor());
create table private_t31.invitation_audit (
 id uuid primary key default gen_random_uuid(), business_id uuid not null,
 actor_user_id uuid not null, invitation_id uuid not null,
 action text not null check(action in ('created','accepted','revoked')),
 occurred_at timestamptz not null default clock_timestamp()
);
revoke all on private_t31.invitation_audit from public,anon,authenticated;
grant insert on private_t31.invitation_audit to t31_invite_worker;
create policy t31_invite_worker_audit_insert on private_t31.invitation_audit for insert to t31_invite_worker
 with check(actor_user_id=private_t31.current_actor());
alter table private_t31.invitation_audit enable row level security;

create function private_t31.create_invitation(p_business uuid,p_email text,p_role text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; token uuid; inv_id uuid;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' then raise exception 'Authentication required' using errcode='28000';end if;
 if p_role not in ('staff','manager') or p_email is null or length(p_email) not between 3 and 254
 or p_email<>lower(btrim(p_email)) or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
 raise exception 'Invalid invitation details' using errcode='22023';end if;
 if not exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 token:=gen_random_uuid();
 insert into private_t31.invitations(business_id,inviter_user_id,recipient_email,role,token_hash,expires_at)
 values(p_business,actor,p_email,p_role,md5(token::text),now()+interval '7 days') returning id into inv_id;
 insert into private_t31.invitation_audit(business_id,actor_user_id,invitation_id,action)
 values(p_business,actor,inv_id,'created');
 return token;
end $$;

create function private_t31.accept_invitation(p_token uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid; v_email text; i private_t31.invitations%rowtype;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' then raise exception 'Authentication required' using errcode='28000';end if;
 v_email:=private_t31.current_verified_email();
 if v_email is null then raise exception 'Verified email required' using errcode='42501';end if;
 select * into i from private_t31.invitations where token_hash=md5(p_token::text) for update;
 if not found or i.recipient_email<>v_email or i.state='revoked' or i.expires_at<=now()
 then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if i.state='accepted' then
   if i.accepted_user_id<>actor or not exists(select 1 from public.business_memberships m
     where m.business_id=i.business_id and m.user_id=actor and m.role=i.role and m.status='active')
   then raise exception 'Invitation unavailable' using errcode='42501';end if;
   return i.business_id;
 end if;
 if not exists(select 1 from public.businesses where id=i.business_id and status='active')
 then raise exception 'Business unavailable' using errcode='42501';end if;
 if exists(select 1 from public.business_memberships where business_id=i.business_id and user_id=actor)
 then raise exception 'Membership already exists' using errcode='23505';end if;
 insert into public.business_memberships(business_id,user_id,role,status)
 values(i.business_id,actor,i.role,'active');
 update private_t31.invitations set state='accepted',accepted_user_id=actor where id=i.id;
 insert into private_t31.invitation_audit(business_id,actor_user_id,invitation_id,action)
 values(i.business_id,actor,i.id,'accepted');
 return i.business_id;
end $$;

create function private_t31.staff_members(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'status',m.status) order by m.user_id)
 from public.business_memberships m where m.business_id=p_business),'[]'::jsonb);
end $$;

create function private_t31.suspend_member(p_business uuid,p_target uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=private_t31.current_actor();
 if actor is null or coalesce(private_t31.current_claims()->>'is_anonymous','false')='true' or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=p_business and m.user_id=actor and m.role='owner' and m.status='active' and b.status='active')
 then raise exception 'Owner access required' using errcode='42501';end if;
 if p_target=actor then raise exception 'Cannot suspend owner' using errcode='42501';end if;
 update public.business_memberships set status='suspended'
 where business_id=p_business and user_id=p_target and role in ('staff','manager') and status='active';
 if not found then raise exception 'Active staff membership unavailable' using errcode='42501';end if;
 return true;
end $$;

revoke all on function private_t31.create_invitation(uuid,text,text),private_t31.accept_invitation(uuid),private_t31.staff_members(uuid),private_t31.suspend_member(uuid,uuid) from public,anon,authenticated;
grant usage on schema private_t31 to authenticated;
grant execute on function private_t31.create_invitation(uuid,text,text),private_t31.accept_invitation(uuid),private_t31.staff_members(uuid),private_t31.suspend_member(uuid,uuid) to authenticated;
create function public.t31_invite_staff(p_business uuid,p_email text,p_role text)
 returns uuid language sql security invoker set search_path=''
 as $$ select private_t31.create_invitation(p_business,p_email,p_role) $$;
create function public.t31_accept_invite(p_token uuid)
 returns uuid language sql security invoker set search_path=''
 as $$ select private_t31.accept_invitation(p_token) $$;
revoke all on function public.t31_invite_staff(uuid,text,text),public.t31_accept_invite(uuid) from public,anon,authenticated;
grant execute on function public.t31_invite_staff(uuid,text,text),public.t31_accept_invite(uuid) to authenticated;
create function public.t31_staff_members(p_business uuid)
 returns jsonb language sql security invoker set search_path=''
 as $$ select private_t31.staff_members(p_business) $$;
create function public.t31_suspend_member(p_business uuid,p_user uuid)
 returns boolean language sql security invoker set search_path=''
 as $$ select private_t31.suspend_member(p_business,p_user) $$;
revoke all on function public.t31_staff_members(uuid),public.t31_suspend_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.t31_staff_members(uuid),public.t31_suspend_member(uuid,uuid) to authenticated;
grant create on schema private_t31 to t31_invite_worker;
grant t31_invite_worker to current_user with set true, inherit false;
alter function private_t31.create_invitation(uuid,text,text) owner to t31_invite_worker;
alter function private_t31.accept_invitation(uuid) owner to t31_invite_worker;
alter function private_t31.staff_members(uuid) owner to t31_invite_worker;
alter function private_t31.suspend_member(uuid,uuid) owner to t31_invite_worker;
revoke t31_invite_worker from current_user;
revoke create on schema private_t31 from t31_invite_worker;
commit;
