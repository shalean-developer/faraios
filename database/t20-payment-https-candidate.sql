-- INACTIVE candidate after t20-payment-store-candidate.sql. No hosted execution.
begin;
create table private_t20.backend_accounts(
 principal uuid not null references auth.users(id),business_id uuid not null,account_id text not null,
 enabled boolean not null default false,primary key(principal,business_id),
 foreign key(business_id,account_id) references private_t20.accounts(business_id,account_id)
);
alter table private_t20.backend_accounts enable row level security;
revoke all on private_t20.backend_accounts from public,anon,authenticated,service_role,t20_payment_verifier;

create function private_t20.live_session() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
 where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id'
 and(s.not_after is null or s.not_after>clock_timestamp())
 and(u.banned_until is null or u.banned_until<=clock_timestamp()));
$$;
create function private_t20.owner_rpc(action text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid;v private_t20.intents;
begin
 if not private_t20.live_session() or jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>8192 then raise exception 'payment_owner_denied' using errcode='42501';end if;
 b:=(input->>'businessId')::uuid;
 if action='configure' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['accountId','businessId','enabled'] then
  if jsonb_typeof(input->'enabled') is distinct from 'boolean' then raise exception 'payment_owner_denied' using errcode='42501';end if;
  perform private_t20.configure_account(b,input->>'accountId',(input->>'enabled')::boolean);return '{}'::jsonb;
 elsif action='create' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['businessId','invoiceId','requestId'] then
  return private_t20.create_intent(b,(input->>'invoiceId')::uuid,(input->>'requestId')::uuid);
 elsif action='status' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['businessId','intentId'] then
  if not private_t20.authorized(b,false) then raise exception 'payment_owner_denied' using errcode='42501';end if;
  select * into v from private_t20.intents where business_id=b and id=(input->>'intentId')::uuid;
  if not found then raise exception 'payment_owner_denied' using errcode='42501';end if;
  return jsonb_build_object('intentId',v.id,'reference',v.reference,'status',v.status,'amountCents',v.amount_cents,'currency',v.currency);
 end if;
 raise exception 'payment_owner_denied' using errcode='42501';
end;$$;

create function private_t20.backend_rpc(action text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid;a text;v private_t20.intents;
begin
 if not private_t20.live_session() or jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>8192
 or exists(select 1 from public.business_memberships where user_id=auth.uid() and status='active')
 then raise exception 'payment_backend_denied' using errcode='42501';end if;
 b:=(input->>'businessId')::uuid;a:=input->>'accountId';
 if not exists(select 1 from private_t20.backend_accounts e join private_t20.accounts c on c.business_id=e.business_id and c.account_id=e.account_id
 join public.businesses x on x.id=e.business_id
 where e.principal=auth.uid() and e.business_id=b and e.account_id=a and e.enabled and c.enabled and x.status='active')
 then raise exception 'payment_backend_denied' using errcode='42501';end if;
 if action='health' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['accountId','businessId'] then return '{"ready":true}'::jsonb;
 elsif action='lookup' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['accountId','businessId','reference'] then
  select * into v from private_t20.intents where business_id=b and account_id=a and reference=input->>'reference';
  if not found then return null;end if;
  return jsonb_build_object('intentId',v.id,'businessId',v.business_id,'environment','staging','accountId',v.account_id,'reference',v.reference,'amountCents',v.amount_cents,'currency',v.currency,'status',v.status);
 elsif action='publish' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['accountId','amountCents','businessId','currency','intentId','status','transactionId'] then
  return private_t20.publish_verified(b,a,(input->>'intentId')::uuid,input->>'transactionId',input->>'status',(input->>'amountCents')::integer,input->>'currency');
 end if;
 raise exception 'payment_backend_denied' using errcode='42501';
end;$$;

create function public.t20_payment_owner(action text,input jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private_t20.owner_rpc(action,input);$$;
create function public.t20_payment_backend(action text,input jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private_t20.backend_rpc(action,input);$$;
revoke all on function private_t20.live_session(),private_t20.owner_rpc(text,jsonb),private_t20.backend_rpc(text,jsonb),public.t20_payment_owner(text,jsonb),public.t20_payment_backend(text,jsonb) from public,anon,authenticated,service_role,t20_payment_verifier;
revoke execute on function private_t20.configure_account(uuid,text,boolean),private_t20.create_intent(uuid,uuid,uuid) from authenticated;
grant execute on function private_t20.owner_rpc(text,jsonb),private_t20.backend_rpc(text,jsonb),public.t20_payment_owner(text,jsonb),public.t20_payment_backend(text,jsonb) to authenticated;
-- No principal, account enrollment, key, role membership or route is activated.
commit;
