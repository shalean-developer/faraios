-- T04 QA remediation follow-up: only transition events participate in typed refund-state lookup.
create or replace function audit.append_cancellation_review(p_business_id uuid,p_booking_id uuid,p_case_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.cancellation_review_cases; e public.cancellation_review_events; b public.one_off_bookings; r text; uid uuid:=auth.uid();
 inp jsonb; k text; ceiling bigint; available bigint; reserved bigint; refund_status text; reserve_row public.cancellation_review_events;
 js_whitespace text := U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]';
 timestamp_pattern text := '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{3})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$';
 stage_name text; last_stage_time timestamptz:='-infinity'; stage_time timestamptz; pay_total bigint; expense_total bigint;
begin
 select m.role into r from public.business_memberships m join public.businesses biz on biz.id=m.business_id where m.business_id=p_business_id and m.user_id=uid and m.status='active' and biz.status='active';
 if uid is null or r is null or r not in ('owner','manager') then raise exception 'Cancellation access denied' using errcode='42501';end if;
 if p_type<>'prepare' and r<>'owner' then raise exception 'Owner approval required' using errcode='42501';end if;
 if p_type is null or p_key is null or p_key::text!~'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or p_version is null or p_version<0 or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>24000 then raise exception 'Invalid cancellation event';end if;
 -- Canonicalize refund identity before replay comparison and persistence as well
 -- as state lookup, so reconstructed journals use the same UUID spelling.
 if p_type in ('submit_refund','complete_refund','release_refund') then
  if p_payload->>'refundId' is null then raise exception 'Refund reservation required';end if;
  p_payload:=jsonb_set(p_payload,'{refundId}',to_jsonb((p_payload->>'refundId')::uuid::text));
 end if;
 if p_type in ('approve','acknowledge','submit_refund','complete_refund','release_refund') then
  k:=case when p_type='approve' then 'reason' else 'reference' end;
  if jsonb_typeof(p_payload->k) is distinct from 'string' or octet_length(p_payload->>k)>2000 then raise exception 'Invalid event evidence type';end if;
 end if;
 if p_type='reserve_refund' then
  if jsonb_typeof(p_payload->'amountCents') is distinct from 'number' then raise exception 'Invalid refund amount type';end if;
  foreach k in array array['receiptReference','route','originalRoute'] loop
   if jsonb_typeof(p_payload->k) is distinct from 'string' or octet_length(p_payload->>k)>2000 then raise exception 'Invalid refund evidence type';end if;
  end loop;
  if p_payload->>'route' is distinct from p_payload->>'originalRoute' and (jsonb_typeof(p_payload->'exceptionReason') is distinct from 'string' or octet_length(p_payload->>'exceptionReason')>2000) then raise exception 'Invalid route exception evidence';end if;
 end if;
 if p_case_id is null then
  if jsonb_typeof(p_payload->'stageTimes') is distinct from 'object' or jsonb_typeof(p_payload->'mandatoryRightsReviewed') is distinct from 'boolean' or jsonb_typeof(p_payload->'feeMustBeWaived') is distinct from 'boolean' then raise exception 'Invalid cancellation evidence types';end if;
  foreach k in array array['originalStart','requestedAt'] loop
   if coalesce(p_payload->>k,'')!~timestamp_pattern then raise exception 'Invalid zoned timestamp';end if;
  end loop;
  if p_type<>'prepare' or p_version<>0 then raise exception 'Prepare a new case first';end if;
  if not exists(select 1 from public.business_cancellation_review_policies where business_id=p_business_id and policy_version=p_payload->>'policyVersion') then raise exception 'Business policy approval is not configured';end if;
  select * into b from public.one_off_bookings where id=p_booking_id and business_id=p_business_id for update;
  if not found then raise exception 'Booking unavailable';end if;
  if b.recurring_schedule_id is not null then raise exception 'Existing recurring terms need separate review';end if;
  if p_payload->>'agreementKind' is distinct from 'new_accepted' or p_payload->>'policyVersion' is distinct from 'shalean-cancel-20261021-v1' or (p_payload->>'originalStart')::timestamptz is distinct from b.starts_at then raise exception 'Original agreement scope mismatch';end if;
  -- Never infer that a booking has accepted cancellation terms from its status.
  if jsonb_typeof(p_payload->'acceptanceEvidence') is distinct from 'string' or octet_length(p_payload->>'acceptanceEvidence')>2000 or length(regexp_replace(coalesce(p_payload->>'acceptanceEvidence',''),js_whitespace,'','g'))=0 then raise exception 'Record accepted prospective terms';end if;
  if coalesce(p_payload->>'cause','') not in ('customer','business') or coalesce(p_payload->>'action','') not in ('cancel','reschedule') or coalesce(p_payload->>'stage','') not in ('accepted','travelling','arrived','started') or p_payload->>'mandatoryRightsReviewed' is distinct from 'true' or coalesce(p_payload->>'feeMustBeWaived','') not in ('true','false') then raise exception 'Review cancellation facts and stronger rights';end if;
  foreach k in array array['eligibleLabourCents','reasonableLossCents','verifiedReceiptsCents','performedServiceCents','completedRefundsCents','pendingRefundsCents','reviewedCustomerFeeCents','collectedPoolCents'] loop
   if jsonb_typeof(p_payload->k) is distinct from 'number' or coalesce(p_payload->>k,'')!~'^(0|[1-9][0-9]{0,9})$' or (p_payload->>k)::bigint>2147483647 then raise exception 'Missing or invalid financial input';end if;
  end loop;
  if coalesce(p_payload->>'requestedAt','')!~timestamp_pattern or (p_payload->>'requestedAt')::timestamptz>clock_timestamp() then raise exception 'Request requires a nonfuture zoned timestamp';end if;
  foreach stage_name in array array['accepted','travelling','arrived','started'] loop
   if coalesce(p_payload->'stageTimes'->>stage_name,'')!~timestamp_pattern then raise exception 'Dispatch timestamp missing';end if;
   stage_time:=(p_payload->'stageTimes'->>stage_name)::timestamptz;
   if stage_time<last_stage_time or stage_time>(p_payload->>'requestedAt')::timestamptz then raise exception 'Dispatch timestamps out of order';end if;
   last_stage_time:=stage_time;
   exit when stage_name=p_payload->>'stage';
  end loop;
  if p_payload->>'stage'<>'accepted' and (coalesce(p_payload->>'accessConfirmedAt','')!~timestamp_pattern or (p_payload->>'accessConfirmedAt')::timestamptz>(p_payload->'stageTimes'->>'travelling')::timestamptz) then raise exception 'Confirm access before dispatch';end if;
  if jsonb_typeof(p_payload->'holidays') is distinct from 'array' then raise exception 'Reviewed holiday calendar required';end if;
  if exists(select 1 from jsonb_array_elements_text(p_payload->'holidays') h where h is null or h!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or h::date::text<>h) then raise exception 'Invalid holiday date';end if;
  ceiling:=case when p_payload->>'cause'='customer' and p_payload->>'feeMustBeWaived'='false' and b.starts_at-(p_payload->>'requestedAt')::timestamptz<interval '24 hours' then least((p_payload->>'eligibleLabourCents')::bigint/2,30000,(p_payload->>'reasonableLossCents')::bigint) else 0 end;
  if (p_payload->>'reviewedCustomerFeeCents')::bigint>ceiling or (p_payload->>'collectedPoolCents')::bigint>least((p_payload->>'reviewedCustomerFeeCents')::bigint,greatest(0,(p_payload->>'verifiedReceiptsCents')::bigint-(p_payload->>'performedServiceCents')::bigint-(p_payload->>'completedRefundsCents')::bigint-(p_payload->>'pendingRefundsCents')::bigint)) then raise exception 'Cancellation fee or collected pool exceeds ceiling';end if;
  if (p_payload->>'completedRefundsCents')::bigint+(p_payload->>'pendingRefundsCents')::bigint>(p_payload->>'verifiedReceiptsCents')::bigint then raise exception 'Previous refunds exceed verified receipts';end if;
  if p_payload->>'action'='reschedule' and (p_payload->'newDateAccepted' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'newAgreedTotalCents') is distinct from 'number' or coalesce(p_payload->>'newAgreedTotalCents','')!~'^(0|[1-9][0-9]{0,9})$' or (p_payload->>'newAgreedTotalCents')::bigint>2147483647 or coalesce(p_payload->>'newStart','')!~timestamp_pattern or (p_payload->>'newStart')::timestamptz<=(p_payload->>'requestedAt')::timestamptz or jsonb_typeof(p_payload->'newAgreementEvidence') is distinct from 'string' or octet_length(p_payload->>'newAgreementEvidence')>2000 or length(regexp_replace(coalesce(p_payload->>'newAgreementEvidence',''),js_whitespace,'','g'))=0) then raise exception 'Accepted replacement date and price required';end if;
  if jsonb_typeof(p_payload->'workers') is distinct from 'array' or jsonb_array_length(p_payload->'workers')>100 or jsonb_array_length(p_payload->'workers')<>cardinality(b.assigned_staff) or cardinality(b.assigned_staff)=0 then raise exception 'Accepted assigned team required';end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'workers') w where coalesce(w->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or jsonb_typeof(w->'agreedCents') is distinct from 'number' or jsonb_typeof(w->'expenseCents') is distinct from 'number' or (w->>'id')::uuid<>all(b.assigned_staff) or coalesce(w->>'agreedCents','')!~'^(0|[1-9][0-9]{0,9})$' or coalesce(w->>'expenseCents','')!~'^(0|[1-9][0-9]{0,9})$') or (select count(distinct (w->>'id')::uuid) from jsonb_array_elements(p_payload->'workers') w)<>cardinality(b.assigned_staff) then raise exception 'Worker agreement scope mismatch';end if;
  select sum((w->>'agreedCents')::bigint),sum((w->>'expenseCents')::bigint) into pay_total,expense_total from jsonb_array_elements(p_payload->'workers') w;
  if pay_total>2147483647 or expense_total>2147483647 or ((p_payload->>'collectedPoolCents')::bigint>0 and pay_total=0) then raise exception 'Invalid accepted team amounts';end if;
  insert into public.cancellation_review_cases(business_id,booking_id,original_start,policy_version) values(p_business_id,p_booking_id,b.starts_at,p_payload->>'policyVersion')
   on conflict(business_id,booking_id,original_start) do nothing returning * into c;
  if c.id is null then select * into c from public.cancellation_review_cases where business_id=p_business_id and booking_id=p_booking_id and original_start=b.starts_at for update;end if;
 else
  select * into c from public.cancellation_review_cases where id=p_case_id and business_id=p_business_id for update;
  if not found then raise exception 'Case unavailable';end if;
 end if;
 select * into e from public.cancellation_review_events where case_id=c.id and event_key=p_key;
 if found then
  if e.event_type<>p_type or e.payload<>p_payload or e.actor_id<>uid then raise exception 'Event reference reused with different details';end if;
  return c.id;
 end if;
 if c.version<>p_version then raise exception 'Case changed; reopen before saving' using errcode='40001';end if;
 if p_type='prepare' and c.version<>0 then raise exception 'Original slot already assessed';end if;
 select payload into inp from public.cancellation_review_events where case_id=c.id and event_type='prepare';
 if p_type='approve' then
  if inp is null or exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='approve') or length(regexp_replace(coalesce(p_payload->>'reason',''),js_whitespace,'','g'))=0 then raise exception 'Case cannot be approved';end if;
 elsif p_type='acknowledge' then
  if inp is null or exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='acknowledge') or length(regexp_replace(coalesce(p_payload->>'reference',''),js_whitespace,'','g'))=0 then raise exception 'Record acknowledgement evidence once';end if;
 elsif p_type='reserve_refund' then
  if not exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='approve') then raise exception 'Approved assessment required';end if;
  if coalesce(p_payload->>'amountCents','')!~'^[1-9][0-9]{0,9}$' or (p_payload->>'amountCents')::bigint>2147483647 or length(regexp_replace(coalesce(p_payload->>'receiptReference',''),js_whitespace,'','g'))=0 or length(regexp_replace(coalesce(p_payload->>'route',''),js_whitespace,'','g'))=0 or length(regexp_replace(coalesce(p_payload->>'originalRoute',''),js_whitespace,'','g'))=0 then raise exception 'Refund amount and original receipt evidence required';end if;
  if p_payload->>'route' is distinct from p_payload->>'originalRoute' and length(regexp_replace(coalesce(p_payload->>'exceptionReason',''),js_whitespace,'','g'))=0 then raise exception 'Review route exception';end if;
  available:=greatest(0,(inp->>'verifiedReceiptsCents')::bigint-(inp->>'performedServiceCents')::bigint-(inp->>'reviewedCustomerFeeCents')::bigint-(inp->>'completedRefundsCents')::bigint-(inp->>'pendingRefundsCents')::bigint);
  if inp->>'action'='reschedule' then available:=greatest(0,available-(inp->>'newAgreedTotalCents')::bigint);end if;
  select coalesce(sum((ev.payload->>'amountCents')::bigint),0) into reserved from public.cancellation_review_events ev where ev.case_id=c.id and ev.event_type='reserve_refund' and not exists(select 1 from public.cancellation_review_events released where released.case_id=c.id and released.event_type='release_refund' and case when released.event_type='release_refund' then (released.payload->>'refundId')::uuid end=ev.event_key);
  if (p_payload->>'amountCents')::bigint>available-reserved then raise exception 'Refund exceeds unreserved receipts';end if;
 elsif p_type in ('submit_refund','complete_refund','release_refund') then
  select * into reserve_row from public.cancellation_review_events where case_id=c.id and event_key=(p_payload->>'refundId')::uuid and event_type='reserve_refund';
  if not found or length(regexp_replace(coalesce(p_payload->>'reference',''),js_whitespace,'','g'))=0 then raise exception 'Refund reservation and evidence required';end if;
  select event_type into refund_status from public.cancellation_review_events where case_id=c.id and case when event_type in ('submit_refund','complete_refund','release_refund') then (payload->>'refundId')::uuid end=reserve_row.event_key order by version desc limit 1;
  if p_type in ('submit_refund','release_refund') and refund_status is not null then raise exception 'Submitted or uncertain money remains reserved';end if;
  if p_type='complete_refund' and refund_status is distinct from 'submit_refund' then raise exception 'Confirm submission before completion';end if;
 end if;
 insert into public.cancellation_review_events values(c.id,p_business_id,c.version+1,p_key,p_type,p_payload,uid,r,clock_timestamp());
 update public.cancellation_review_cases set version=version+1 where id=c.id;
 return c.id;
end $$;
