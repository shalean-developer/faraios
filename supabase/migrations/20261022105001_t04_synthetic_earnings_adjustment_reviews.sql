-- ADJ01 synthetic review journal only. No ledger, accrual, paid status or bank integration.
begin;
create table public.adjustment_review_sources(
 id uuid primary key,business_id uuid not null references public.businesses(id),
 booking_id uuid not null references public.one_off_bookings(id),worker_id uuid not null references auth.users(id),
 original_payload jsonb not null,version integer not null default 0,revision integer not null default 0,
 synthetic_only boolean not null default true check(synthetic_only),created_at timestamptz not null default clock_timestamp(),
 unique(business_id,booking_id,worker_id)
);
create table public.adjustment_review_items(
 id uuid primary key,source_id uuid not null references public.adjustment_review_sources(id),business_id uuid not null references public.businesses(id),
 payload jsonb not null,kind text not null,delta_cents integer not null,old_cents integer not null,new_cents integer not null,
 source_revision integer not null,status text not null default 'proposed' check(status in ('proposed','approved','rejected')),
 disputed boolean not null default false,frozen boolean not null default false,simulated boolean not null default false
);
create table public.adjustment_review_events(
 source_id uuid not null references public.adjustment_review_sources(id),business_id uuid not null references public.businesses(id),
 version integer not null,event_key uuid not null,event_type text not null,payload jsonb not null,
 actor_id uuid not null references auth.users(id),actor_role text not null,created_at timestamptz not null default clock_timestamp(),
 primary key(source_id,version),unique(source_id,event_key)
);
create index adjustment_sources_business on public.adjustment_review_sources(business_id);
create index adjustment_sources_booking on public.adjustment_review_sources(booking_id);
create index adjustment_sources_worker on public.adjustment_review_sources(worker_id);
create index adjustment_items_source on public.adjustment_review_items(source_id);
create index adjustment_items_business on public.adjustment_review_items(business_id);
create index adjustment_events_business on public.adjustment_review_events(business_id);
create index adjustment_events_actor on public.adjustment_review_events(actor_id);
alter table public.adjustment_review_sources enable row level security;
alter table public.adjustment_review_items enable row level security;
alter table public.adjustment_review_events enable row level security;
revoke all on public.adjustment_review_sources,public.adjustment_review_items,public.adjustment_review_events from public,anon,authenticated;
grant select on public.adjustment_review_sources,public.adjustment_review_items,public.adjustment_review_events to authenticated;
create policy adjustment_source_read on public.adjustment_review_sources for select to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=adjustment_review_sources.business_id and m.user_id=(select auth.uid()) and m.status='active' and b.status='active' and (m.role in ('owner','manager') or m.role='staff' and worker_id=m.user_id)));
create policy adjustment_item_read on public.adjustment_review_items for select to authenticated using(exists(select 1 from public.adjustment_review_sources s where s.id=source_id and s.business_id=adjustment_review_items.business_id));
create policy adjustment_event_read on public.adjustment_review_events for select to authenticated using(exists(select 1 from public.adjustment_review_sources s where s.id=source_id and s.business_id=adjustment_review_events.business_id));
create function audit.append_earnings_adjustment(p_business_id uuid,p_source_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r text;s public.adjustment_review_sources;a public.adjustment_review_items;previous public.adjustment_review_items;e public.adjustment_review_events;
 allowed text[];required text[];k text;v text;delta bigint;old_amount bigint;new_amount bigint;
 id_pattern text:='^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
 whitespace text:=U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]';
begin
 select m.role into r from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=uid and m.status='active' and b.status='active';
 if r is null or r not in ('owner','manager','staff') then raise exception 'Adjustment access denied' using errcode='42501';end if;
 if uid::text!~id_pattern or p_source_id is null or p_source_id::text!~id_pattern or p_key is null or p_key::text!~id_pattern or p_version is null or p_version<0 or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>24000 then raise exception 'Invalid adjustment event';end if;
 if r='staff' and p_type not in ('raise_dispute','request_review') then raise exception 'Staff own review only' using errcode='42501';end if;
 if p_type not in ('register_source','propose','raise_dispute','request_review') and r<>'owner' then raise exception 'Owner approval required' using errcode='42501';end if;
 case p_type
 when 'register_source' then allowed:=array['sourceId','bookingId','workerId','originalVersion','originalCents','originalPeriod','agreementEvidence','originalRecordEvidence'];required:=array['agreementEvidence','originalRecordEvidence'];
 when 'propose' then allowed:=array['sourceId','kind','deltaCents','reason','evidence','occurrenceReference','approvedRuleEvidence','supersedesId'];required:=array['reason','evidence','occurrenceReference'];
 when 'approve' then allowed:=array['adjustmentId','originalVerificationEvidence','entitlementReviewEvidence','reason','lawfulBasisEvidence','requiredAgreementEvidence','fairProcessEvidence','approvedRuleVerification'];required:=array['originalVerificationEvidence','entitlementReviewEvidence','reason'];
 when 'reject' then allowed:=array['adjustmentId','reason'];required:=array['reason'];
 when 'resolve_dispute' then allowed:=array['adjustmentId','reason','workerReviewEvidence'];required:=array['reason','workerReviewEvidence'];
 when 'raise_dispute','request_review' then allowed:=array['adjustmentId','reason','evidence'];required:=array['reason','evidence'];
 when 'freeze_review' then allowed:=array['adjustmentId','reference'];required:=array['reference'];
 when 'simulate_settlement' then allowed:=array['adjustmentId','reference','amountCents'];required:=array['reference'];
 else raise exception 'Unsupported adjustment action';
 end case;
 if exists(select 1 from jsonb_object_keys(p_payload) x where not x=any(allowed)) then raise exception 'Unsupported payload field';end if;
 for k,v in select * from jsonb_each_text(p_payload) loop
  if k in ('originalVersion','originalCents','deltaCents','amountCents') then
   if jsonb_typeof(p_payload->k) is distinct from 'number' or coalesce(v,'')!~'^-?(0|[1-9][0-9]{0,9})$' or abs(v::bigint)>2147483647 then raise exception 'Explicit integer cents/version required';end if;
  else
   if jsonb_typeof(p_payload->k) is distinct from 'string' or octet_length(v)>2000 then raise exception 'Invalid evidence type or length';end if;
   if k in ('sourceId','bookingId','workerId','adjustmentId','supersedesId') then
    if lower(v)!~id_pattern then raise exception 'Invalid reference';end if;
    p_payload:=jsonb_set(p_payload,array[k],to_jsonb(lower(v)));
   end if;
  end if;
 end loop;
 if p_type='propose' then
  if not p_payload?'occurrenceReference' then raise exception 'Occurrence required';end if;
  p_payload:=jsonb_set(p_payload,'{occurrenceReference}',to_jsonb(regexp_replace(p_payload->>'occurrenceReference','^'||whitespace||'+|'||whitespace||'+$','','g')));
 end if;
 foreach k in array required loop if length(regexp_replace(coalesce(p_payload->>k,''),whitespace,'','g'))=0 then raise exception 'Required evidence missing';end if;end loop;
 if p_type='register_source' then
  if p_payload->>'sourceId' is distinct from p_source_id::text or p_version<>0 or p_payload->>'bookingId' is null or p_payload->>'workerId' is null or p_payload->>'originalVersion' is null or (p_payload->>'originalVersion')::bigint<1 or p_payload->>'originalCents' is null or (p_payload->>'originalCents')::bigint<0 or coalesce(p_payload->>'originalPeriod','')!~'^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Original source required';end if;
  if not exists(select 1 from public.one_off_bookings b join public.business_memberships m on m.business_id=b.business_id and m.user_id=(p_payload->>'workerId')::uuid and m.status='active' where b.id=(p_payload->>'bookingId')::uuid and b.business_id=p_business_id and m.user_id=any(b.assigned_staff)) then raise exception 'Booking/worker scope mismatch';end if;
  insert into public.adjustment_review_sources(id,business_id,booking_id,worker_id,original_payload) values(p_source_id,p_business_id,(p_payload->>'bookingId')::uuid,(p_payload->>'workerId')::uuid,p_payload) on conflict(id) do nothing;
 end if;
 select * into s from public.adjustment_review_sources where id=p_source_id and business_id=p_business_id for update;
 if not found or r='staff' and s.worker_id<>uid then raise exception 'Source unavailable' using errcode='42501';end if;
 select * into e from public.adjustment_review_events where source_id=s.id and event_key=p_key;
 if found then
  if e.payload<>p_payload or e.event_type<>p_type or e.actor_id<>uid or e.actor_role<>r then raise exception 'Event reference reused';end if;
  return s.id;
 end if;
 if s.version<>p_version then raise exception 'History changed; reopen before saving' using errcode='40001';end if;
 if p_type='register_source' then
  if s.version<>0 or s.original_payload<>p_payload then raise exception 'Source snapshot is immutable';end if;
 elsif p_type='propose' then
  if p_payload->>'sourceId' is distinct from s.id::text or coalesce(p_payload->>'kind','') not in ('calculation_correction','reimbursement','additional_agreed_work') or p_payload->>'deltaCents' is null then raise exception 'Unsupported correction';end if;
  delta:=(p_payload->>'deltaCents')::bigint;
  if delta=0 or delta<0 and p_payload->>'kind'<>'calculation_correction' then raise exception 'Invalid reduction';end if;
  if p_payload->>'kind'='additional_agreed_work' and length(regexp_replace(coalesce(p_payload->>'approvedRuleEvidence',''),whitespace,'','g'))=0 then raise exception 'Approved rule evidence required';end if;
  select * into previous from public.adjustment_review_items where source_id=s.id and payload->>'occurrenceReference'=p_payload->>'occurrenceReference' order by (select version from public.adjustment_review_events where event_key=adjustment_review_items.id and source_id=s.id) desc limit 1;
  if previous.id is not null and (previous.status<>'rejected' or p_payload->>'supersedesId' is distinct from previous.id::text) or previous.id is null and p_payload?'supersedesId' then raise exception 'Linked rejected replacement required';end if;
  if p_payload->>'kind'='reimbursement' then old_amount:=0;else select (s.original_payload->>'originalCents')::bigint+coalesce(sum(delta_cents),0) into old_amount from public.adjustment_review_items where source_id=s.id and status='approved' and kind<>'reimbursement';end if;
  new_amount:=old_amount+delta;if new_amount<0 or new_amount>2147483647 then raise exception 'Invalid resulting amount';end if;
  insert into public.adjustment_review_items(id,source_id,business_id,payload,kind,delta_cents,old_cents,new_cents,source_revision) values(p_key,s.id,p_business_id,p_payload,p_payload->>'kind',delta,old_amount,new_amount,s.revision);
 else
  select * into a from public.adjustment_review_items where id=(p_payload->>'adjustmentId')::uuid and source_id=s.id and business_id=p_business_id;
  if not found then raise exception 'Adjustment unavailable';end if;
  case p_type
  when 'raise_dispute','request_review' then update public.adjustment_review_items set disputed=true,frozen=false where id=a.id;
  when 'resolve_dispute' then
   if not a.disputed then raise exception 'No open dispute';end if;
   update public.adjustment_review_items set disputed=false,frozen=false where id=a.id;
  when 'approve' then
   if a.status<>'proposed' or a.disputed or a.source_revision<>s.revision then raise exception 'Undisputed current proposal required';end if;
   if a.delta_cents<0 then foreach k in array array['lawfulBasisEvidence','requiredAgreementEvidence','fairProcessEvidence'] loop if length(regexp_replace(coalesce(p_payload->>k,''),whitespace,'','g'))=0 then raise exception 'Lawful reduction safeguards required';end if;end loop;end if;
   if a.kind='additional_agreed_work' and length(regexp_replace(coalesce(p_payload->>'approvedRuleVerification',''),whitespace,'','g'))=0 then raise exception 'Approved rule verification required';end if;
   update public.adjustment_review_items set status='approved' where id=a.id;
   update public.adjustment_review_sources set revision=revision+1 where id=s.id;
  when 'reject' then
   if a.status<>'proposed' then raise exception 'Approved history is immutable';end if;
   update public.adjustment_review_items set status='rejected' where id=a.id;
  when 'freeze_review' then
   if a.status<>'approved' or a.disputed or a.simulated then raise exception 'Undisputed approved review required';end if;
   update public.adjustment_review_items set frozen=true where id=a.id;
  when 'simulate_settlement' then
   if a.status<>'approved' or a.disputed or not a.frozen or a.simulated then raise exception 'Frozen undisputed unsimulated correction required';end if;
   if p_payload->>'amountCents' is null or (p_payload->>'amountCents')::bigint<>a.delta_cents then raise exception 'Correction only; never pay original again';end if;
   update public.adjustment_review_items set simulated=true where id=a.id;
  else raise exception 'Unsupported action';
  end case;
 end if;
 insert into public.adjustment_review_events(source_id,business_id,version,event_key,event_type,payload,actor_id,actor_role) values(s.id,p_business_id,s.version+1,p_key,p_type,p_payload,uid,r);
 update public.adjustment_review_sources set version=version+1 where id=s.id;
 return s.id;
end $$;
revoke all on function audit.append_earnings_adjustment(uuid,uuid,integer,uuid,text,jsonb) from public,anon;
grant usage on schema audit to authenticated;
grant execute on function audit.append_earnings_adjustment(uuid,uuid,integer,uuid,text,jsonb) to authenticated;
create function public.append_earnings_adjustment(p_business_id uuid,p_source_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb)
returns uuid language sql security invoker set search_path='' as $$select audit.append_earnings_adjustment(p_business_id,p_source_id,p_version,p_key,p_type,p_payload)$$;
revoke all on function public.append_earnings_adjustment(uuid,uuid,integer,uuid,text,jsonb) from public,anon;
grant execute on function public.append_earnings_adjustment(uuid,uuid,integer,uuid,text,jsonb) to authenticated;
commit;
