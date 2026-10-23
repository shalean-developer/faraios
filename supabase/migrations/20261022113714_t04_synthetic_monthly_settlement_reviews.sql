-- PAY03. Synthetic staging review only; no real transfers, earnings or paid-status writes.
begin;
alter table public.adjustment_review_items add column monthly_claimed boolean not null default false;
create table public.settlement_review_statements(
 id uuid primary key,business_id uuid not null references public.businesses(id),worker_id uuid not null references auth.users(id),
 period text not null check(period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),version integer not null default 0,
 state jsonb not null,synthetic_only boolean not null default true check(synthetic_only),
 unique(business_id,worker_id,period)
);
create table public.settlement_review_events(
 statement_id uuid not null references public.settlement_review_statements(id),business_id uuid not null references public.businesses(id),
 version integer not null,event_key uuid not null,event_type text not null,payload jsonb not null,
 actor_id uuid not null references auth.users(id),actor_role text not null,created_at timestamptz not null default clock_timestamp(),
 primary key(statement_id,version),unique(statement_id,event_key)
);
create table public.settlement_review_claims(
 statement_id uuid not null references public.settlement_review_statements(id),business_id uuid not null references public.businesses(id),
 worker_id uuid not null references auth.users(id),occurrence text not null,adjustment_id uuid unique references public.adjustment_review_items(id),
 primary key(business_id,worker_id,occurrence)
);
create index settlement_statements_business on public.settlement_review_statements(business_id);
create index settlement_statements_worker on public.settlement_review_statements(worker_id);
create index settlement_events_business on public.settlement_review_events(business_id);
create index settlement_events_actor on public.settlement_review_events(actor_id);
create index settlement_claims_statement on public.settlement_review_claims(statement_id);
create index settlement_claims_worker on public.settlement_review_claims(worker_id);
alter table public.settlement_review_statements enable row level security;
alter table public.settlement_review_events enable row level security;
alter table public.settlement_review_claims enable row level security;
revoke all on public.settlement_review_statements,public.settlement_review_events,public.settlement_review_claims from public,anon,authenticated;
grant select on public.settlement_review_statements,public.settlement_review_events,public.settlement_review_claims to authenticated;
create policy settlement_statement_read on public.settlement_review_statements for select to authenticated using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=settlement_review_statements.business_id and m.user_id=(select auth.uid()) and m.status='active' and b.status='active' and (m.role in ('owner','manager') or m.role='staff' and m.user_id=worker_id)));
create policy settlement_event_read on public.settlement_review_events for select to authenticated using(exists(select 1 from public.settlement_review_statements s where s.id=statement_id and s.business_id=settlement_review_events.business_id));
create policy settlement_claim_read on public.settlement_review_claims for select to authenticated using(exists(select 1 from public.settlement_review_statements s where s.id=statement_id and s.business_id=settlement_review_claims.business_id));
-- The same correction cannot be independently simulated in Stage 2 once claimed by a monthly review.
create function audit.guard_monthly_adjustment_simulation() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.simulated and not old.simulated and new.monthly_claimed then raise exception 'Correction linked to a monthly review';end if;return new;end$$;
revoke all on function audit.guard_monthly_adjustment_simulation() from public,anon,authenticated;
create trigger monthly_adjustment_claim_guard before update on public.adjustment_review_items for each row execute function audit.guard_monthly_adjustment_simulation();
create function audit.append_monthly_settlement(p_business_id uuid,p_statement_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r text;s public.settlement_review_statements;e public.settlement_review_events;
 st jsonb;linked_versions jsonb;lines jsonb;transfers jsonb;line jsonb;t jsonb;updated jsonb;allowed text[];required text[];k text;v text;
 a public.adjustment_review_items;src public.adjustment_review_sources;item_id uuid;worker uuid;delta bigint;prior bigint;total bigint;credited bigint;requested bigint;cleared bigint;found_item boolean:=false;
 period_end date;target date;due date;d date;today date:=(clock_timestamp() at time zone 'Africa/Johannesburg')::date;occ text;
 id_pattern text:='^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
 whitespace text:=U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]';
begin
 select m.role into r from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=p_business_id and m.user_id=uid and m.status='active' and b.status='active';
 if r is null or r not in ('owner','manager','staff') then raise exception 'Settlement access denied' using errcode='42501';end if;
 if p_statement_id is null or p_statement_id::text!~id_pattern or p_key is null or p_key::text!~id_pattern or p_version is null or p_version<0 or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>24000 then raise exception 'Invalid settlement event';end if;
 if r='staff' and p_type<>'dispute' then raise exception 'Own review only' using errcode='42501';end if;
 if r<>'owner' and p_type not in ('create','add_line','dispute') then raise exception 'Owner approval required' using errcode='42501';end if;
 case p_type
 when 'create' then allowed:=array['workerId','period','calendarEvidence','closedDates','earlierDeadline','deadlineEvidence'];required:=array['calendarEvidence'];
 when 'add_line' then allowed:=array['kind','amountCents','priorClearedCents','originalPeriod','sourceReference','evidence','collected','collectionEvidence','adjustmentId','bookingId'];required:=array['sourceReference','evidence'];
 when 'dispute' then allowed:=array['lineId','reason','evidence'];required:=array['reason','evidence'];
 when 'resolve' then allowed:=array['lineId','reason','workerReviewEvidence'];required:=array['reason','workerReviewEvidence'];
 when 'freeze' then allowed:=array['reference','fullPayReviewEvidence'];required:=array['reference','fullPayReviewEvidence'];
 when 'approve' then allowed:=array['paymentDetailsEvidence','reference'];required:=allowed;
 when 'submit' then allowed:=array['amountCents','reference'];required:=array['reference'];
 when 'reconcile' then allowed:=array['transferId','outcome','clearedCents','remainingFailed','clearingEvidence','allocationEvidence','reference'];required:=array['reference','clearingEvidence','allocationEvidence'];
 when 'provide_statement' then allowed:=array['reference'];required:=allowed;
 else raise exception 'Unsupported settlement action';end case;
 if exists(select 1 from jsonb_object_keys(p_payload) x where not x=any(allowed)) then raise exception 'Unsupported payload field';end if;
 for k,v in select * from jsonb_each_text(p_payload) loop
  if k in ('amountCents','priorClearedCents','clearedCents') then
   if jsonb_typeof(p_payload->k) is distinct from 'number' or coalesce(v,'')!~'^-?(0|[1-9][0-9]{0,9})$' or abs(v::bigint)>2147483647 then raise exception 'Explicit integer cents required';end if;
  elsif k in ('collected','remainingFailed') then
   if jsonb_typeof(p_payload->k) is distinct from 'boolean' then raise exception 'Explicit boolean required';end if;
  elsif k='closedDates' then
   if jsonb_typeof(p_payload->k) is distinct from 'array' or jsonb_array_length(p_payload->k)>100 then raise exception 'Bounded banking calendar required';end if;
   for t in select value from jsonb_array_elements(p_payload->k) loop
    if jsonb_typeof(t)<>'string' or trim(both '"' from t::text)!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid closed date';end if;
    d:=trim(both '"' from t::text)::date;
   end loop;
  else
   if jsonb_typeof(p_payload->k) is distinct from 'string' or octet_length(v)>2000 then raise exception 'Invalid evidence type or length';end if;
   if k in ('workerId','adjustmentId','bookingId','lineId','transferId') then
    if lower(v)!~id_pattern then raise exception 'Invalid reference';end if;p_payload:=jsonb_set(p_payload,array[k],to_jsonb(lower(v)));
   end if;
  end if;
 end loop;
 foreach k in array required loop if length(regexp_replace(coalesce(p_payload->>k,''),whitespace,'','g'))=0 then raise exception 'Required evidence missing';end if;end loop;
 if p_type='create' then
  if p_payload->>'workerId' is null or coalesce(p_payload->>'period','')!~'^[0-9]{4}-(0[1-9]|1[0-2])$' or not p_payload?'closedDates' or p_version<>0 then raise exception 'Worker, period and reviewed calendar required';end if;
  worker:=(p_payload->>'workerId')::uuid;
  if not exists(select 1 from public.business_memberships where business_id=p_business_id and user_id=worker and role='staff' and status='active') then raise exception 'Active business worker required';end if;
  period_end:=((p_payload->>'period')||'-01')::date+interval '1 month'-interval '1 day';
  if period_end>=today then raise exception 'Month must be closed before statement preparation';end if;
  target:=period_end+5;
  while extract(isodow from target) in (6,7) or (p_payload->'closedDates')?target::text loop target:=target-1;end loop;
  due:=target;
  if p_payload?'earlierDeadline' then
   if (p_payload->>'earlierDeadline')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or length(regexp_replace(coalesce(p_payload->>'deadlineEvidence',''),whitespace,'','g'))=0 then raise exception 'Earlier deadline evidence required';end if;
   due:=least(due,(p_payload->>'earlierDeadline')::date);
  elsif p_payload?'deadlineEvidence' then raise exception 'Deadline date required';end if;
  st:=jsonb_build_object('workerId',worker,'period',p_payload->>'period','targetDate',target,'dueDate',due,'calendar',p_payload,'lines','[]'::jsonb,'transfers','[]'::jsonb,'freeze',null,'approval',null,'statementEvidence',null,'execution','disabled');
  insert into public.settlement_review_statements(id,business_id,worker_id,period,state) values(p_statement_id,p_business_id,worker,p_payload->>'period',st) on conflict(id) do nothing;
 end if;
 select * into s from public.settlement_review_statements where id=p_statement_id and business_id=p_business_id for update;
 if not found or r='staff' and s.worker_id<>uid then raise exception 'Statement unavailable' using errcode='42501';end if;
 select * into e from public.settlement_review_events where statement_id=s.id and event_key=p_key;
 if found then if e.payload<>p_payload or e.event_type<>p_type or e.actor_id<>uid or e.actor_role<>r then raise exception 'Event reference reused';end if;return s.id;end if;
 if s.version<>p_version then raise exception 'History changed; reopen before saving' using errcode='40001';end if;
 st:=s.state;lines:=st->'lines';transfers:=st->'transfers';
 if p_type='create' then
  if s.version<>0 then raise exception 'Statement already exists';end if;
 elsif p_type='add_line' then
  if st->'freeze'<>'null'::jsonb or jsonb_array_length(transfers)>0 or jsonb_array_length(lines)>=200 then raise exception 'Prepare lines before freeze; later changes require a linked correction';end if;
  if coalesce(p_payload->>'kind','') not in ('visit','company_cancellation','customer_pool','reimbursement','correction') or coalesce(p_payload->>'originalPeriod','')!~'^[0-9]{4}-(0[1-9]|1[0-2])$' or p_payload->>'originalPeriod'>s.period then raise exception 'Valid original closed period required';end if;
  if p_payload->>'amountCents' is null or p_payload->>'priorClearedCents' is null then raise exception 'Unknown amounts remain blank; explicit amounts required to add';end if;
  delta:=(p_payload->>'amountCents')::bigint;prior:=(p_payload->>'priorClearedCents')::bigint;
  if prior<0 or delta=0 or delta<0 and p_payload->>'kind'<>'correction' or delta>=0 and prior>delta or delta<0 and prior<>0 then raise exception 'Invalid outstanding amount';end if;
  occ:=(p_payload->>'kind')||':'||regexp_replace(p_payload->>'sourceReference','^'||whitespace||'+|'||whitespace||'+$','','g');
  if p_payload->>'kind'='correction' then
   if p_payload->>'adjustmentId' is null or prior<>0 then raise exception 'Linked correction only; original excluded';end if;
   -- Row lock serializes against Stage 2 simulation, whose trigger checks this claim.
   select * into a from public.adjustment_review_items where id=(p_payload->>'adjustmentId')::uuid for update;
   select * into src from public.adjustment_review_sources where id=a.source_id;
   if a.business_id is distinct from p_business_id or src.worker_id is distinct from s.worker_id or a.status<>'approved' or a.disputed or not a.frozen or a.simulated or a.monthly_claimed or a.delta_cents<>delta or src.original_payload->>'originalPeriod' is distinct from p_payload->>'originalPeriod' then raise exception 'Approved frozen undisputed unsimulated correction required';end if;
   occ:='correction:'||a.id;
   update public.adjustment_review_items set monthly_claimed=true where id=a.id;
  else
   if p_payload?'adjustmentId' then raise exception 'Adjustment reference only for corrections';end if;
   if p_payload->>'kind' in ('visit','company_cancellation','customer_pool') then
    if p_payload->>'bookingId' is null or not exists(select 1 from public.one_off_bookings b where b.id=(p_payload->>'bookingId')::uuid and b.business_id=p_business_id and s.worker_id=any(b.assigned_staff) and ((p_payload->>'kind'='visit' and b.status='completed') or (p_payload->>'kind'<>'visit' and b.status='cancelled'))) then raise exception 'Completed visit or cancelled booking with assigned worker required';end if;
    occ:=(p_payload->>'kind')||':'||(p_payload->>'bookingId');
   end if;
  end if;
  if p_payload->>'kind'='customer_pool' then
   if not p_payload?'collected' or p_payload->>'collected'='true' and length(regexp_replace(coalesce(p_payload->>'collectionEvidence',''),whitespace,'','g'))=0 then raise exception 'Collection status and evidence required';end if;
  elsif p_payload?'collected' or p_payload?'collectionEvidence' then raise exception 'Collection fields only for customer pool';end if;
  insert into public.settlement_review_claims(statement_id,business_id,worker_id,occurrence,adjustment_id) values(s.id,p_business_id,s.worker_id,occ,case when p_payload->>'kind'='correction' then a.id else null end);
  lines:=lines||jsonb_build_array(p_payload||jsonb_build_object('id',p_key,'disputed',false,'outstandingCents',delta-prior));
  st:=jsonb_set(st,'{lines}',lines);st:=st||jsonb_build_object('approval',null,'statementEvidence',null);
 elsif p_type in ('dispute','resolve') then
  updated:='[]'::jsonb;
  for line in select value from jsonb_array_elements(lines) loop
   if line->>'id'=p_payload->>'lineId' then
    found_item:=true;if p_type='resolve' and line->>'disputed'<>'true' then raise exception 'No open dispute';end if;
    line:=line||jsonb_build_object('disputed',p_type='dispute','reviewEvidence',p_payload);
   end if;updated:=updated||jsonb_build_array(line);
  end loop;
  if not found_item then raise exception 'Line unavailable';end if;
  st:=st||jsonb_build_object('lines',updated,'freeze',null,'approval',null,'statementEvidence',null);
 elsif p_type in ('freeze','approve','submit') then
  total:=0;linked_versions:='{}'::jsonb;
  for line in select value from jsonb_array_elements(lines) loop
   if line->>'disputed'='false' and not(line->>'kind'='customer_pool' and line->>'collected'='false') then
    if line->>'kind'='correction' then
     select * into a from public.adjustment_review_items where id=(line->>'adjustmentId')::uuid for update;
     if a.status<>'approved' or a.disputed or not a.frozen or a.simulated or a.delta_cents<>(line->>'amountCents')::bigint then raise exception 'Linked adjustment changed; review dispute separately';end if;
     select * into src from public.adjustment_review_sources where id=a.source_id;
     linked_versions:=linked_versions||jsonb_build_object(a.id::text,src.version);
    end if;
    total:=total+(line->>'outstandingCents')::bigint;
   end if;
  end loop;
  if total<0 or total>2147483647 then raise exception 'Net amount requires review; negative transfer prohibited';end if;
  select coalesce(sum((x->>'clearedCents')::bigint),0) into credited from jsonb_array_elements(transfers) x;
  if total<credited then raise exception 'Cleared amount preserved; prepare a separate lawful correction';end if;
  if p_type='freeze' then
   if jsonb_array_length(lines)=0 then raise exception 'Reviewed lines required';end if;
   st:=st||jsonb_build_object('freeze',jsonb_build_object('totalCents',total,'linkedVersions',linked_versions,'reference',p_payload,'actor',uid),'approval',null,'statementEvidence',null);
  elsif p_type='approve' then
   if st->'freeze'='null'::jsonb or ((st->'freeze'->>'totalCents')::bigint<>total or st->'freeze'->'linkedVersions'<>linked_versions) then raise exception 'Current frozen statement required';end if;
   st:=st||jsonb_build_object('approval',jsonb_build_object('totalCents',total,'evidence',p_payload,'actor',uid));
  else
   if st->'freeze'='null'::jsonb or st->'approval'='null'::jsonb or ((st->'approval'->>'totalCents')::bigint<>total or st->'freeze'->'linkedVersions'<>linked_versions) then raise exception 'Current owner-approved frozen statement required';end if;
   if exists(select 1 from jsonb_array_elements(transfers) x where x->>'uncertain'='true') then raise exception 'Reconcile uncertain transfer before retry';end if;
   requested:=(p_payload->>'amountCents')::bigint;
   if requested is null or requested<=0 or requested<>total-credited then raise exception 'Only exact outstanding amount may be simulated';end if;
   if exists(select 1 from jsonb_array_elements(transfers) x where x->>'reference'=p_payload->>'reference') then raise exception 'Transfer reference reused';end if;
   transfers:=transfers||jsonb_build_array(jsonb_build_object('id',p_key,'reference',p_payload->>'reference','amountCents',requested,'clearedCents',0,'outcome','submitted','uncertain',true,'approvedTotalCents',total));
   st:=jsonb_set(st,'{transfers}',transfers);st:=jsonb_set(st,'{statementEvidence}','null'::jsonb);
  end if;
 elsif p_type='reconcile' then
  if coalesce(p_payload->>'outcome','') not in ('unknown','failed','partial','cleared') or p_payload->>'clearedCents' is null or not p_payload?'remainingFailed' then raise exception 'Explicit reconciliation outcome required';end if;
  cleared:=(p_payload->>'clearedCents')::bigint;updated:='[]'::jsonb;
  for t in select value from jsonb_array_elements(transfers) loop
   if t->>'id'=p_payload->>'transferId' then
    found_item:=true;requested:=(t->>'amountCents')::bigint;
    if t->>'uncertain'='false' then raise exception 'Resolved transfer immutable';end if;
    if cleared<(t->>'clearedCents')::bigint or cleared>requested or cleared<0 or p_payload->>'outcome' in ('unknown','failed') and cleared<>0 or p_payload->>'outcome'='partial' and (cleared<=0 or cleared>=requested) or p_payload->>'outcome'='cleared' and cleared<>requested then raise exception 'Clearing/allocation amount mismatch';end if;
    if p_payload->>'outcome' in ('unknown','cleared') and (p_payload->>'remainingFailed')::boolean or p_payload->>'outcome'='failed' and not(p_payload->>'remainingFailed')::boolean then raise exception 'Consistent remaining-transfer status required';end if;
    t:=t||jsonb_build_object('clearedCents',cleared,'outcome',p_payload->>'outcome','uncertain',p_payload->>'outcome'='unknown' or p_payload->>'outcome'='partial' and not(p_payload->>'remainingFailed')::boolean,'reconciliation',p_payload);
   end if;updated:=updated||jsonb_build_array(t);
  end loop;
  if not found_item then raise exception 'Transfer unavailable';end if;
  st:=st||jsonb_build_object('transfers',updated,'statementEvidence',null);
 elsif p_type='provide_statement' then
  if st->'approval'='null'::jsonb then raise exception 'Approved statement required';end if;
  st:=jsonb_set(st,'{statementEvidence}',p_payload);
 end if;
 insert into public.settlement_review_events(statement_id,business_id,version,event_key,event_type,payload,actor_id,actor_role) values(s.id,p_business_id,s.version+1,p_key,p_type,p_payload,uid,r);
 update public.settlement_review_statements set state=st,version=version+1 where id=s.id;
 return s.id;
end$$;
revoke all on function audit.append_monthly_settlement(uuid,uuid,integer,uuid,text,jsonb) from public,anon;
grant execute on function audit.append_monthly_settlement(uuid,uuid,integer,uuid,text,jsonb) to authenticated;
create function public.append_monthly_settlement(p_business_id uuid,p_statement_id uuid,p_version integer,p_key uuid,p_type text,p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$select audit.append_monthly_settlement(p_business_id,p_statement_id,p_version,p_key,p_type,p_payload)$$;
revoke all on function public.append_monthly_settlement(uuid,uuid,integer,uuid,text,jsonb) from public,anon;
grant execute on function public.append_monthly_settlement(uuid,uuid,integer,uuid,text,jsonb) to authenticated;
commit;
