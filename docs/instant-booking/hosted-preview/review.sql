-- Isolated checkout preview only.
alter table instant_private.holds
  add column provider_transaction_id bigint unique check (provider_transaction_id > 0),
  add column refund_requested_at timestamptz;

create function instant_private.settle_verified(p_ref uuid, p_total int, p_tx bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if p_tx is null or p_tx <= 0 then raise exception 'Invalid payment identifier'; end if;
  result := instant_private.settle(p_ref, p_total);
  update instant_private.holds set provider_transaction_id=p_tx
    where reference=p_ref and (provider_transaction_id is null or provider_transaction_id=p_tx);
  if not found then raise exception 'Payment identifier mismatch'; end if;
  return result;
end $$;

create function instant_private.review_payments(p_search text, p_offset integer)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(item) order by item.expires_at desc,item.reference),'[]'::jsonb)
  from (
    select reference, slug, provider_transaction_id::text as transaction_id,
           (scope->>'total')::integer as amount, starts_at, expires_at, refund_requested_at
    from instant_private.holds
    where state='review' and booking_id is null
      and (p_search='' or p_search=provider_transaction_id::text or p_search=reference::text or p_search='fi-'||reference::text)
    order by expires_at desc,reference
    limit 11 offset greatest(p_offset,0)
  ) item
$$;

create function instant_private.claim_refund(p_ref uuid, p_tx bigint) returns jsonb
language sql volatile security definer set search_path='' as $$
  with claimed as (
    update instant_private.holds set refund_requested_at=clock_timestamp()
    where reference=p_ref and provider_transaction_id=p_tx and booking_id is null
      and state='review' and refund_requested_at is null returning 1
  ) select jsonb_build_object('claimed',exists(select from claimed))
$$;

revoke all on function instant_private.settle_verified(uuid,int,bigint),
  instant_private.review_payments(text,int), instant_private.claim_refund(uuid,bigint)
  from public,anon,authenticated;
grant execute on function instant_private.settle_verified(uuid,int,bigint),
  instant_private.review_payments(text,int), instant_private.claim_refund(uuid,bigint)
  to faraios_preview_checkout;
