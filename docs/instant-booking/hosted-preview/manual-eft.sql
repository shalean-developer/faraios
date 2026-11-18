-- Isolated BOOK-05 preview only; preserve existing provider attempts.
alter table instant_private.holds add column payment_method text default 'paystack'
  check (payment_method in ('eft','paystack'));
alter table instant_private.holds alter column payment_method drop default;

create table instant_private.eft_reports (
  reference uuid primary key references instant_private.holds,
  reported_at timestamptz not null default clock_timestamp()
);
create table instant_private.eft_payments (
  reference uuid primary key references instant_private.eft_reports,
  business_id uuid not null references public.businesses,
  amount_cents int not null check (amount_cents > 0),
  bank_reference text not null,
  verified_by uuid not null,
  verified_at timestamptz not null default clock_timestamp(),
  unique (business_id,bank_reference)
);
revoke all on instant_private.eft_reports,instant_private.eft_payments from public,anon,authenticated,faraios_preview_checkout;

create function instant_private.select_method(p_ref uuid,p_slug text,p_method text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h instant_private.holds;
begin
  select * into strict h from instant_private.holds where reference=p_ref and slug=p_slug for update;
  if p_method is null or p_method not in ('eft','paystack') or
     (h.payment_method is not null and h.payment_method<>p_method) then
    raise exception 'Payment method unavailable.';
  end if;
  if h.payment_method is null then
    if h.state<>'held' or h.expires_at<=clock_timestamp() then raise exception 'Hold expired.'; end if;
    update instant_private.holds set payment_method=p_method where reference=p_ref;
  end if;
  if p_method='eft' then
    insert into instant_private.eft_reports(reference) values(p_ref) on conflict do nothing;
  end if;
  return jsonb_build_object('method',p_method);
end $$;

create or replace function instant_private.receipt(p_ref uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('state',state,'booking',booking_id,'slug',slug,'method',payment_method)
  from instant_private.holds where reference=p_ref
$$;

create or replace function instant_private.settle_verified(p_ref uuid,p_total int,p_tx bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; bid uuid;
begin
  if p_tx is null or p_tx<=0 then raise exception 'Invalid payment identifier'; end if;
  select business_id into strict bid from instant_private.holds where reference=p_ref;
  perform authorization_private.scheduling_lock_scope(bid,'preview');
  update instant_private.holds set payment_method='paystack' where reference=p_ref
    and (payment_method is null or payment_method='paystack')
    and (provider_transaction_id is null or provider_transaction_id=p_tx);
  if not found then raise exception 'Payment identifier or method mismatch'; end if;
  result := instant_private.settle(p_ref,p_total);
  update instant_private.holds set provider_transaction_id=p_tx where reference=p_ref;
  return result;
end $$;

create function public.book05_verify_eft(p_business uuid,p_ref uuid,p_amount int,p_bank_ref text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  h instant_private.holds;
  receipt instant_private.eft_payments;
  bank_ref text := upper(btrim(p_bank_ref));
begin
  perform authorization_private.scheduling_owner(p_business,'preview');
  perform authorization_private.scheduling_lock_scope(p_business,'preview');
  select * into h from instant_private.holds where reference=p_ref and business_id=p_business
    and payment_method='eft' for update;
  if not found or not exists(select from instant_private.eft_reports where reference=p_ref) then
    raise exception 'Reported transfer unavailable.';
  end if;
  if bank_ref is null or bank_ref !~ '^[A-Z0-9][A-Z0-9 /-]{2,63}$' or
     p_amount is distinct from (h.scope->>'total')::int then raise exception 'Receipt details do not match.'; end if;
  select * into receipt from instant_private.eft_payments where reference=p_ref;
  if found then
    if receipt.bank_reference<>bank_ref then raise exception 'Receipt already recorded with another reference.'; end if;
    return jsonb_build_object('state',h.state,'booking',h.booking_id);
  end if;
  insert into instant_private.eft_payments(reference,business_id,amount_cents,bank_reference,verified_by)
    values(p_ref,p_business,p_amount,bank_ref,auth.uid());
  -- The quote excludes unassigned jobs because their worker capacity is unknown.
  if exists(select from public.business_bookings b
    join authorization_private.scheduling_policies k using (business_id,environment)
    where b.business_id=p_business and b.environment='preview' and b.status in ('Scheduled','In Progress')
      and not exists(select from public.business_booking_staff a where a.booking_id=b.id)
      and tstzrange(b.starts_at-k.before_minutes*interval '1 minute',
        b.starts_at+(b.duration_minutes+k.after_minutes)*interval '1 minute','[)') && h.occupied) then
    update instant_private.holds set state='review' where reference=p_ref;
  end if;
  return instant_private.settle(p_ref,p_amount);
end $$;
revoke all on function instant_private.select_method(uuid,text,text),public.book05_verify_eft(uuid,uuid,int,text) from public,anon,authenticated;
grant execute on function instant_private.select_method(uuid,text,text) to faraios_preview_checkout;
grant execute on function public.book05_verify_eft(uuid,uuid,int,text) to authenticated;
-- Provider reconciliation uses provider IDs; manual receipts have their own ledger.
create or replace function instant_private.review_payments(p_search text, p_offset integer)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(item) order by item.expires_at desc,item.reference),'[]'::jsonb)
  from (
    select reference, slug, provider_transaction_id::text as transaction_id,
           (scope->>'total')::integer as amount, starts_at, expires_at, refund_requested_at
    from instant_private.holds
    where payment_method='paystack' and state='review' and booking_id is null
      and (p_search='' or p_search=provider_transaction_id::text or p_search=reference::text or p_search='fi-'||reference::text)
    order by expires_at desc,reference
    limit 11 offset greatest(p_offset,0)
  ) item
$$;


revoke execute on function instant_private.settle(uuid,int) from faraios_preview_checkout;
