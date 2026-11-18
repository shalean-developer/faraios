-- Optional, time-limited receipt verification for explicitly enrolled preview users.
create table instant_private.eft_verifiers (
  business_id uuid not null references public.businesses,
  user_id uuid not null references auth.users on delete cascade,
  valid_until timestamptz not null,
  primary key (business_id,user_id)
);
revoke all on instant_private.eft_verifiers from public,anon,authenticated,faraios_preview_checkout;

create or replace function book05_eft.book05_verify_eft(p_business uuid,p_ref uuid,p_amount int,p_bank_ref text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  h instant_private.holds;
  receipt instant_private.eft_payments;
  bank_ref text := upper(btrim(p_bank_ref));
begin
  if not exists (
    select from instant_private.eft_verifiers v where v.business_id=p_business
      and v.user_id=auth.uid() and v.valid_until>clock_timestamp()
      and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
      and nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-business'=p_business::text
      and nullif(current_setting('request.headers',true),'')::jsonb->>'x-faraios-environment'='preview'
    for share
  ) then
    perform authorization_private.scheduling_owner(p_business,'preview');
  end if;
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
