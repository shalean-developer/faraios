-- Additive Stage 1 event journal. Does not write bookings, invoices or money.
-- Financial results are recomputed and validated from these input events on read.
begin;
create table public.business_cancellation_review_policies (
 business_id uuid not null references public.businesses(id),policy_version text not null,
 approval_reference text not null check(length(trim(approval_reference)) between 1 and 2000),
 approved_by uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now(),
 primary key(business_id,policy_version)
);
alter table public.business_cancellation_review_policies enable row level security;
revoke all on public.business_cancellation_review_policies from public,anon,authenticated;
grant select,insert on public.business_cancellation_review_policies to authenticated;
create policy cancellation_policy_read on public.business_cancellation_review_policies for select to authenticated using(exists(select 1 from public.business_memberships m where m.business_id=business_cancellation_review_policies.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager')));
create policy cancellation_policy_approve on public.business_cancellation_review_policies for insert to authenticated with check(approved_by=(select auth.uid()) and exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business_cancellation_review_policies.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner' and b.status='active'));
create table public.cancellation_review_cases (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 booking_id uuid not null references public.one_off_bookings(id),
 original_start timestamptz not null,
 policy_version text not null,
 version integer not null default 0,
 created_at timestamptz not null default now(),
 unique(business_id,booking_id,original_start)
);
create table public.cancellation_review_events (
 case_id uuid not null references public.cancellation_review_cases(id),
 business_id uuid not null references public.businesses(id),
 version integer not null check(version>0),
 event_key uuid not null,
 event_type text not null check(event_type in ('prepare','acknowledge','approve','reserve_refund','submit_refund','complete_refund','release_refund')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=24000),
 actor_id uuid not null references auth.users(id),
 actor_role text not null check(actor_role in ('owner','manager')),
 created_at timestamptz not null default now(),
 primary key(case_id,version),unique(case_id,event_key)
);
create index cancellation_review_policy_actor on public.business_cancellation_review_policies(approved_by);
create index cancellation_review_case_booking on public.cancellation_review_cases(booking_id);
create index cancellation_review_event_actor on public.cancellation_review_events(actor_id);
create index cancellation_review_cases_business on public.cancellation_review_cases(business_id,id);
create index cancellation_review_events_business on public.cancellation_review_events(business_id,case_id);
alter table public.cancellation_review_cases enable row level security;
alter table public.cancellation_review_events enable row level security;
revoke all on public.cancellation_review_cases,public.cancellation_review_events from public,anon,authenticated;
grant select on public.cancellation_review_cases,public.cancellation_review_events to authenticated;
create policy cancellation_cases_read on public.cancellation_review_cases for select to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=cancellation_review_cases.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'));
create policy cancellation_events_read on public.cancellation_review_events for select to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=cancellation_review_events.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','manager') and b.status='active'));
create schema if not exists audit;
-- Only this bounded private writer bypasses RLS: it checks fresh membership,
-- tenant/booking scope, original-slot uniqueness and exact expected version.
create function audit.append_cancellation_review(p_business_id uuid,p_booking_id uuid,p_case_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.cancellation_review_cases; e public.cancellation_review_events; b public.one_off_bookings; r text; uid uuid:=auth.uid();
 inp jsonb; k text; ceiling bigint; available bigint; reserved bigint; refund_status text; reserve_row public.cancellation_review_events;
 stage_name text; last_stage_time timestamptz:='-infinity'; stage_time timestamptz; pay_total bigint; expense_total bigint;
begin
 select m.role into r from public.business_memberships m join public.businesses biz on biz.id=m.business_id where m.business_id=p_business_id and m.user_id=uid and m.status='active' and biz.status='active';
 if uid is null or r is null or r not in ('owner','manager') then raise exception 'Cancellation access denied' using errcode='42501';end if;
 if p_type<>'prepare' and r<>'owner' then raise exception 'Owner approval required' using errcode='42501';end if;
 if p_type is null or p_key is null or p_version is null or p_version<0 or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>24000 then raise exception 'Invalid cancellation event';end if;
 if p_case_id is null then
  if p_type<>'prepare' or p_version<>0 then raise exception 'Prepare a new case first';end if;
  if not exists(select 1 from public.business_cancellation_review_policies where business_id=p_business_id and policy_version=p_payload->>'policyVersion') then raise exception 'Business policy approval is not configured';end if;
  select * into b from public.one_off_bookings where id=p_booking_id and business_id=p_business_id for update;
  if not found then raise exception 'Booking unavailable';end if;
  if b.recurring_schedule_id is not null then raise exception 'Existing recurring terms need separate review';end if;
  if p_payload->>'agreementKind' is distinct from 'new_accepted' or p_payload->>'policyVersion' is distinct from 'shalean-cancel-20261021-v1' or (p_payload->>'originalStart')::timestamptz is distinct from b.starts_at then raise exception 'Original agreement scope mismatch';end if;
  -- Never infer that a booking has accepted cancellation terms from its status.
  if length(trim(coalesce(p_payload->>'acceptanceEvidence','')))=0 then raise exception 'Record accepted prospective terms';end if;
  if coalesce(p_payload->>'cause','') not in ('customer','business') or coalesce(p_payload->>'action','') not in ('cancel','reschedule') or coalesce(p_payload->>'stage','') not in ('accepted','travelling','arrived','started') or p_payload->>'mandatoryRightsReviewed' is distinct from 'true' or coalesce(p_payload->>'feeMustBeWaived','') not in ('true','false') then raise exception 'Review cancellation facts and stronger rights';end if;
  foreach k in array array['eligibleLabourCents','reasonableLossCents','verifiedReceiptsCents','performedServiceCents','completedRefundsCents','pendingRefundsCents','reviewedCustomerFeeCents','collectedPoolCents'] loop
   if coalesce(p_payload->>k,'')!~'^(0|[1-9][0-9]{0,9})$' or (p_payload->>k)::bigint>2147483647 then raise exception 'Missing or invalid financial input';end if;
  end loop;
  if coalesce(p_payload->>'requestedAt','')!~'(Z|[+-][0-9]{2}:[0-9]{2})$' or (p_payload->>'requestedAt')::timestamptz>clock_timestamp() then raise exception 'Request requires a nonfuture zoned timestamp';end if;
  foreach stage_name in array array['accepted','travelling','arrived','started'] loop
   if coalesce(p_payload->'stageTimes'->>stage_name,'')!~'(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Dispatch timestamp missing';end if;
   stage_time:=(p_payload->'stageTimes'->>stage_name)::timestamptz;
   if stage_time<last_stage_time or stage_time>(p_payload->>'requestedAt')::timestamptz then raise exception 'Dispatch timestamps out of order';end if;
   last_stage_time:=stage_time;
   exit when stage_name=p_payload->>'stage';
  end loop;
  if p_payload->>'stage'<>'accepted' and (coalesce(p_payload->>'accessConfirmedAt','')!~'(Z|[+-][0-9]{2}:[0-9]{2})$' or (p_payload->>'accessConfirmedAt')::timestamptz>(p_payload->'stageTimes'->>'travelling')::timestamptz) then raise exception 'Confirm access before dispatch';end if;
  if jsonb_typeof(p_payload->'holidays') is distinct from 'array' then raise exception 'Reviewed holiday calendar required';end if;
  if exists(select 1 from jsonb_array_elements_text(p_payload->'holidays') h where h!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or h::date::text<>h) then raise exception 'Invalid holiday date';end if;
  ceiling:=case when p_payload->>'cause'='customer' and p_payload->>'feeMustBeWaived'='false' and b.starts_at-(p_payload->>'requestedAt')::timestamptz<interval '24 hours' then least((p_payload->>'eligibleLabourCents')::bigint/2,30000,(p_payload->>'reasonableLossCents')::bigint) else 0 end;
  if (p_payload->>'reviewedCustomerFeeCents')::bigint>ceiling or (p_payload->>'collectedPoolCents')::bigint>least((p_payload->>'reviewedCustomerFeeCents')::bigint,greatest(0,(p_payload->>'verifiedReceiptsCents')::bigint-(p_payload->>'performedServiceCents')::bigint-(p_payload->>'completedRefundsCents')::bigint-(p_payload->>'pendingRefundsCents')::bigint)) then raise exception 'Cancellation fee or collected pool exceeds ceiling';end if;
  if (p_payload->>'completedRefundsCents')::bigint+(p_payload->>'pendingRefundsCents')::bigint>(p_payload->>'verifiedReceiptsCents')::bigint then raise exception 'Previous refunds exceed verified receipts';end if;
  if p_payload->>'action'='reschedule' and (p_payload->>'newDateAccepted' is distinct from 'true' or coalesce(p_payload->>'newAgreedTotalCents','')!~'^(0|[1-9][0-9]{0,9})$' or (p_payload->>'newAgreedTotalCents')::bigint>2147483647 or (p_payload->>'newStart')::timestamptz<=(p_payload->>'requestedAt')::timestamptz or length(trim(coalesce(p_payload->>'newAgreementEvidence','')))=0) then raise exception 'Accepted replacement date and price required';end if;
  if jsonb_typeof(p_payload->'workers') is distinct from 'array' or jsonb_array_length(p_payload->'workers')<>cardinality(b.assigned_staff) or cardinality(b.assigned_staff)=0 then raise exception 'Accepted assigned team required';end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'workers') w where (w->>'id')::uuid<>all(b.assigned_staff) or coalesce(w->>'agreedCents','')!~'^(0|[1-9][0-9]{0,9})$' or coalesce(w->>'expenseCents','')!~'^(0|[1-9][0-9]{0,9})$') or (select count(distinct w->>'id') from jsonb_array_elements(p_payload->'workers') w)<>cardinality(b.assigned_staff) then raise exception 'Worker agreement scope mismatch';end if;
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
  if inp is null or exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='approve') or length(trim(coalesce(p_payload->>'reason','')))=0 then raise exception 'Case cannot be approved';end if;
 elsif p_type='acknowledge' then
  if inp is null or exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='acknowledge') or length(trim(coalesce(p_payload->>'reference','')))=0 then raise exception 'Record acknowledgement evidence once';end if;
 elsif p_type='reserve_refund' then
  if not exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='approve') then raise exception 'Approved assessment required';end if;
  if coalesce(p_payload->>'amountCents','')!~'^[1-9][0-9]{0,9}$' or (p_payload->>'amountCents')::bigint>2147483647 or length(trim(coalesce(p_payload->>'receiptReference','')))=0 or length(trim(coalesce(p_payload->>'route','')))=0 or length(trim(coalesce(p_payload->>'originalRoute','')))=0 then raise exception 'Refund amount and original receipt evidence required';end if;
  if p_payload->>'route' is distinct from p_payload->>'originalRoute' and length(trim(coalesce(p_payload->>'exceptionReason','')))=0 then raise exception 'Review route exception';end if;
  available:=greatest(0,(inp->>'verifiedReceiptsCents')::bigint-(inp->>'performedServiceCents')::bigint-(inp->>'reviewedCustomerFeeCents')::bigint-(inp->>'completedRefundsCents')::bigint-(inp->>'pendingRefundsCents')::bigint);
  if inp->>'action'='reschedule' then available:=greatest(0,available-(inp->>'newAgreedTotalCents')::bigint);end if;
  select coalesce(sum((ev.payload->>'amountCents')::bigint),0) into reserved from public.cancellation_review_events ev where ev.case_id=c.id and ev.event_type='reserve_refund' and not exists(select 1 from public.cancellation_review_events released where released.case_id=c.id and released.event_type='release_refund' and released.payload->>'refundId'=ev.event_key::text);
  if (p_payload->>'amountCents')::bigint>available-reserved then raise exception 'Refund exceeds unreserved receipts';end if;
 elsif p_type in ('submit_refund','complete_refund','release_refund') then
  select * into reserve_row from public.cancellation_review_events where case_id=c.id and event_key=(p_payload->>'refundId')::uuid and event_type='reserve_refund';
  if not found or length(trim(coalesce(p_payload->>'reference','')))=0 then raise exception 'Refund reservation and evidence required';end if;
  select event_type into refund_status from public.cancellation_review_events where case_id=c.id and payload->>'refundId'=reserve_row.event_key::text order by version desc limit 1;
  if p_type in ('submit_refund','release_refund') and refund_status is not null then raise exception 'Submitted or uncertain money remains reserved';end if;
  if p_type='complete_refund' and refund_status is distinct from 'submit_refund' then raise exception 'Confirm submission before completion';end if;
 end if;
 insert into public.cancellation_review_events values(c.id,p_business_id,c.version+1,p_key,p_type,p_payload,uid,r,clock_timestamp());
 update public.cancellation_review_cases set version=version+1 where id=c.id;
 return c.id;
end $$;
revoke all on function audit.append_cancellation_review(uuid,uuid,uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
grant usage on schema audit to authenticated;
grant execute on function audit.append_cancellation_review(uuid,uuid,uuid,integer,uuid,text,jsonb) to authenticated;
create function public.append_cancellation_review(p_business_id uuid,p_booking_id uuid,p_case_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb)
returns uuid language sql security invoker set search_path='' as $$select audit.append_cancellation_review(p_business_id,p_booking_id,p_case_id,p_version,p_key,p_type,p_payload)$$;
revoke all on function public.append_cancellation_review(uuid,uuid,uuid,integer,uuid,text,jsonb) from public,anon;
grant execute on function public.append_cancellation_review(uuid,uuid,uuid,integer,uuid,text,jsonb) to authenticated;
-- Preserve original contracts: only bookings with an explicit new-terms review
-- are gated. Work already started can stop only through an approved review.
create function audit.guard_cancellation_review() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.cancellation_review_cases; p jsonb;
begin
 if new.status is not distinct from old.status and new.local_start is not distinct from old.local_start and new.assigned_staff is not distinct from old.assigned_staff then return new;end if;
 if new.status<>'cancelled' and new.local_start is not distinct from old.local_start and new.assigned_staff is not distinct from old.assigned_staff then return new;end if;
 select * into c from public.cancellation_review_cases where business_id=old.business_id and booking_id=old.id and original_start=old.starts_at;
 if not found then
  if old.status='in_progress' and new.status='cancelled' then raise exception 'An approved partial-service cancellation review is required';end if;
  return new;
 end if;
 if new.assigned_staff is distinct from old.assigned_staff then raise exception 'Resolve the original-slot cancellation review before reassignment';end if;
 if not exists(select 1 from public.cancellation_review_events where case_id=c.id and event_type='approve') then raise exception 'Owner cancellation review approval required';end if;
 select payload into p from public.cancellation_review_events where case_id=c.id and event_type='prepare';
 if new.status='cancelled' and p->>'action' is distinct from 'cancel' then raise exception 'Review the cancelled original slot';end if;
 if new.local_start is distinct from old.local_start then
  if p->>'action' is distinct from 'reschedule' or (new.local_start at time zone old.time_zone) is distinct from (p->>'newStart')::timestamptz then raise exception 'Schedule must match the accepted replacement';end if;
  if (p->>'newAgreedTotalCents')::bigint<>old.total_cents then raise exception 'A changed price requires a separate accepted agreement';end if;
 end if;
 return new;
end $$;
revoke all on function audit.guard_cancellation_review() from public,anon,authenticated;
create trigger cancellation_review_guard before update on public.one_off_bookings for each row execute function audit.guard_cancellation_review();
do $patch$
declare definition text;old_clause text:='(old.status=''in_progress'' and new.status=''completed'')';new_clause text:='(old.status=''in_progress'' and new.status in (''completed'',''cancelled''))';
begin
 if to_regprocedure('audit.validate_booking()') is null then raise exception 'Booking validation baseline missing';end if;
 definition:=pg_get_functiondef('audit.validate_booking()'::regprocedure);
 if position(old_clause in definition)=0 then raise exception 'Unexpected booking lifecycle baseline';end if;
 execute replace(definition,old_clause,new_clause);
end $patch$;
commit;
