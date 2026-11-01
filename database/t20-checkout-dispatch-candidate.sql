-- Inactive additive candidate after the T20 store/HTTPS candidates.
begin;
create table private_t20.checkouts(
 intent_id uuid primary key references private_t20.intents(id),nonce uuid not null,
 state text not null check(state in ('claimed','ready','unknown')),
 authorization_url text,claimed_at timestamptz not null default clock_timestamp(),
 check((state='ready' and authorization_url is not null and authorization_url ~ '^https://checkout[.]paystack[.]com/[A-Za-z0-9_-]+$') or (state<>'ready' and authorization_url is null))
);
alter table private_t20.checkouts enable row level security;
revoke all on private_t20.checkouts from public,anon,authenticated,service_role,t20_payment_verifier;
create function private_t20.checkout_rpc(action text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid;a text;v private_t20.intents;c private_t20.checkouts;n integer;
begin
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>8192 then raise exception 'payment_checkout_denied' using errcode='42501';end if;
 b:=(input->>'businessId')::uuid;a:=input->>'accountId';
 if input->>'nonce' is null then raise exception 'payment_checkout_denied' using errcode='42501';end if;
 -- Reuse actual session, no-business-membership, exact enabled enrollment checks.
 perform private_t20.backend_rpc('health',jsonb_build_object('businessId',b,'accountId',a));
 perform 1 from private_t20.accounts where business_id=b and account_id=a and enabled for share;
 if not found then raise exception 'payment_checkout_denied' using errcode='42501';end if;
 -- Same invoice-before-intent lock order as payment publication.
 perform 1 from public.business_invoices i join private_t20.intents p on p.business_id=i.business_id and p.invoice_id=i.id
 where p.id=(input->>'intentId')::uuid and p.business_id=b and p.account_id=a for update of i;
 if not found then raise exception 'payment_checkout_denied' using errcode='42501';end if;
 select * into v from private_t20.intents where id=(input->>'intentId')::uuid and business_id=b and account_id=a for update;
 if action='claim' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['accountId','businessId','intentId','nonce'] then
  if v.status<>'pending' or exists(select 1 from private_t20.credits where business_id=b and invoice_id=v.invoice_id)
  then raise exception 'payment_checkout_denied' using errcode='42501';end if;
  insert into private_t20.checkouts(intent_id,nonce,state) values(v.id,(input->>'nonce')::uuid,'claimed') on conflict do nothing;
  get diagnostics n=row_count;
  select * into c from private_t20.checkouts where intent_id=v.id;
  return jsonb_build_object('dispatch',n=1,'state',c.state,'authorizationUrl',c.authorization_url);
 elsif action='finish' and (select array_agg(k order by k) from jsonb_object_keys(input) k)=array['accountId','authorizationUrl','businessId','intentId','nonce'] then
  if jsonb_typeof(input->'authorizationUrl') not in ('string','null') then raise exception 'payment_checkout_denied' using errcode='42501';end if;
  select * into c from private_t20.checkouts where intent_id=v.id for update;
  if not found or c.nonce<>(input->>'nonce')::uuid then raise exception 'payment_checkout_denied' using errcode='42501';end if;
  if c.state='claimed' then
   update private_t20.checkouts set state=case when input->>'authorizationUrl' is null then 'unknown' else 'ready' end,authorization_url=input->>'authorizationUrl' where intent_id=v.id returning * into c;
  elsif c.authorization_url is distinct from input->>'authorizationUrl' then raise exception 'payment_checkout_denied' using errcode='42501';end if;
  return jsonb_build_object('state',c.state,'authorizationUrl',c.authorization_url);
 end if;
 raise exception 'payment_checkout_denied' using errcode='42501';
end;$$;
create function public.t20_payment_checkout(action text,input jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private_t20.checkout_rpc(action,input);$$;
revoke all on function private_t20.checkout_rpc(text,jsonb),public.t20_payment_checkout(text,jsonb) from public,anon,authenticated,service_role,t20_payment_verifier;
grant execute on function private_t20.checkout_rpc(text,jsonb),public.t20_payment_checkout(text,jsonb) to authenticated;
-- A committed claim is never automatically reclaimed, even after a crash.
commit;
