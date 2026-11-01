-- T22 STAGING source candidate. Synthetic agreements/accrual only; no bank/provider writes.
-- Additive, collision-refusing. Requires accepted T04 journal and T20 live-session helper.
begin;
create schema private_t22;
revoke all on schema private_t22 from public,anon,authenticated,service_role;
create table private_t22.agreements(
 id uuid primary key,business_id uuid not null references public.businesses(id),
 booking_id uuid not null references public.one_off_bookings(id),
 request jsonb not null,booking_snapshot jsonb not null,rule_snapshot jsonb,
 workers jsonb not null,actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp(),revision integer not null default 1,
 synthetic_only boolean not null default true check(synthetic_only),
 unique(business_id,booking_id),unique(business_id,id)
);
create table private_t22.accruals(
 agreement_id uuid primary key,business_id uuid not null,request_id uuid not null unique,
 request jsonb not null,actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp(),
 synthetic_only boolean not null default true check(synthetic_only),
 foreign key(business_id,agreement_id) references private_t22.agreements(business_id,id)
);
alter table private_t22.agreements enable row level security;
alter table private_t22.accruals enable row level security;
revoke all on all tables in schema private_t22 from public,anon,authenticated,service_role;
create function private_t22.office_rpc(action text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare biz uuid;uid uuid:=auth.uid();membership text;job public.one_off_bookings;agreement private_t22.agreements;
 accrued private_t22.accruals;rule public.business_earnings_rules;keys text[];expected text[];
 workers jsonb:='[]'::jsonb;w jsonb;worker_ids uuid[];assigned uuid[];pool bigint;share bigint;worker_count integer;position integer:=0;
 whitespace text:=U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]';
 total bigint:=0;source_id uuid;original_version integer;page integer;result jsonb;
begin
 if not private_t20.live_session() or jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>24000 then raise exception 'earnings_denied' using errcode='42501';end if;
 biz:=(input->>'businessId')::uuid;
 -- Hold current business and actor membership against concurrent suspension.
 select m.role into membership from public.business_memberships m join public.businesses x on x.id=m.business_id
 where m.business_id=biz and m.user_id=uid and m.status='active' and x.status='active' for share of m,x;
 if membership is null or membership not in ('owner','manager') then raise exception 'earnings_denied' using errcode='42501';end if;
 select array_agg(k order by k) into keys from jsonb_object_keys(input) k;
 if action='list' and keys=array['businessId','page'] then
  if jsonb_typeof(input->'page') is distinct from 'number' or coalesce(input->>'page','')!~'^(0|[1-9][0-9]{0,6})$' then raise exception 'earnings_page_invalid';end if;
  page:=(input->>'page')::integer;
  select coalesce(jsonb_agg(v order by created_at desc,id),'[]'::jsonb) into result from (
   select a.created_at,a.id,jsonb_build_object('id',a.id,'bookingId',a.booking_id,'workers',a.workers,'kind',a.request->>'kind','originalPeriod',a.request->>'originalPeriod','accrued',c.agreement_id is not null,'createdAt',a.created_at) v
   from private_t22.agreements a left join private_t22.accruals c on c.agreement_id=a.id where a.business_id=biz order by a.created_at desc,a.id limit 100 offset page*100
  ) q;return result;
 end if;
 if action is null or action not in ('context','agree','accrue') then raise exception 'earnings_action_invalid';end if;
 if action='context' then
  if keys<>array['bookingId','businessId'] then raise exception 'earnings_fields_invalid';end if;
 else
  if membership<>'owner' then raise exception 'earnings_owner_required' using errcode='42501';end if;
 end if;
 -- All writes use booking -> agreement lock order. No customer-payment table is consulted.
 select * into job from public.one_off_bookings where business_id=biz and id=(input->>'bookingId')::uuid for update;
 if not found then raise exception 'earnings_booking_denied' using errcode='42501';end if;
 select * into agreement from private_t22.agreements where business_id=biz and booking_id=job.id for update;
 if action='context' then
  select * into accrued from private_t22.accruals where agreement_id=agreement.id;
  return jsonb_build_object('bookingId',job.id,'status',job.status,'assignedStaff',job.assigned_staff,'durationMinutes',job.duration_minutes,'recurring',job.recurring_schedule_id is not null,
   'savedRule',(select to_jsonb(r) from public.business_earnings_rules r where r.business_id=biz and r.service_id=(job.selection->0->>'catalogue_id')::uuid),
   'agreement',case when agreement.id is null then null else to_jsonb(agreement) end,'accrual',case when accrued.agreement_id is null then null else to_jsonb(accrued) end);
 end if;
 if action='agree' then
  if input->>'kind'='new' then expected:=array['agreementEvidence','agreementId','bookingId','businessId','eligibleCents','entitlementEvidence','kind','originalPeriod','ruleVersion','serviceId'];
  elsif input->>'kind' in ('existing','recurring') then expected:=array['agreementEvidence','agreementId','bookingId','businessId','entitlementEvidence','kind','originalPeriod','originalVersion','workers'];
  else raise exception 'earnings_agreement_kind_required';end if;
  if keys<>expected then raise exception 'earnings_fields_invalid';end if;
  if agreement.id is not null then
   if agreement.id=(input->>'agreementId')::uuid and agreement.request=input and agreement.actor_id=uid then return jsonb_build_object('id',agreement.id);end if;
   raise exception 'earnings_agreement_exists';
  end if;
  foreach result in array array[input->'agreementEvidence',input->'entitlementEvidence'] loop
   if jsonb_typeof(result) is distinct from 'string' or length(result#>>'{}')>2000 or length(regexp_replace(coalesce(result#>>'{}',''),whitespace,'','g'))=0 then raise exception 'earnings_evidence_required';end if;
  end loop;
  if jsonb_typeof(input->'originalPeriod') is distinct from 'string' or coalesce(input->>'originalPeriod','')!~'^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'earnings_period_required';end if;
  if job.status='cancelled' or job.currency<>'ZAR' or cardinality(job.assigned_staff) not between 1 and 100 then raise exception 'earnings_team_required';end if;
  select array_agg(x order by x) into assigned from unnest(job.assigned_staff) x;
  if (select count(distinct x) from unnest(assigned) x)<>cardinality(assigned) then raise exception 'earnings_duplicate_worker';end if;
  perform 1 from public.business_memberships m where m.business_id=biz and m.user_id=any(assigned) and m.status='active' for share;
  if (select count(*) from public.business_memberships m where m.business_id=biz and m.user_id=any(assigned) and m.status='active')<>cardinality(assigned) then raise exception 'earnings_worker_membership_required';end if;
  if job.recurring_schedule_id is not null and input->>'kind'<>'recurring' then raise exception 'earnings_recurring_agreement_protected';end if;
  if input->>'kind'='new' then
   if job.status not in ('draft','confirmed','assigned') then raise exception 'earnings_prospective_agreement_required';end if;
   if jsonb_typeof(input->'ruleVersion') is distinct from 'number' or coalesce(input->>'ruleVersion','')!~'^[1-9][0-9]{0,8}$'
    or jsonb_typeof(input->'eligibleCents') is distinct from 'number' or coalesce(input->>'eligibleCents','')!~'^(0|[1-9][0-9]{0,9})$' or (input->>'eligibleCents')::bigint>2147483647 then raise exception 'earnings_calculation_invalid';end if;
   if input->>'serviceId' is distinct from job.selection->0->>'catalogue_id' then raise exception 'earnings_service_scope';end if;
   select * into rule from public.business_earnings_rules r where r.business_id=biz and r.service_id=(input->>'serviceId')::uuid and r.version=(input->>'ruleVersion')::integer for share;
   if not found or rule.max_minutes is null or job.duration_minutes not between 15 and rule.max_minutes then raise exception 'earnings_saved_rule_required';end if;
   worker_count:=cardinality(assigned);
   if rule.model='percentage_pool' then
    if rule.basis_points is null or rule.cap_cents is null or rule.allocation is distinct from 'equal' or rule.rounding is null or length(btrim(rule.basis_definition))=0 then raise exception 'earnings_saved_rule_incomplete';end if;
    pool:=floor(((input->>'eligibleCents')::bigint*rule.basis_points+case when rule.rounding='half_up' then 5000 else 0 end)::numeric/10000);
   elsif rule.model='fixed_per_worker' then
    if rule.rate_cents is null or (input->>'eligibleCents')::bigint<>0 then raise exception 'earnings_saved_rule_incomplete';end if;
    pool:=rule.rate_cents::bigint*worker_count;
   else raise exception 'earnings_saved_rule_incomplete';end if;
   if pool>2147483647 then raise exception 'earnings_overflow';end if;
   foreach source_id in array assigned loop
    share:=case when rule.model='fixed_per_worker' then rule.rate_cents else least(rule.cap_cents,pool/worker_count+case when position<mod(pool,worker_count) then 1 else 0 end) end;
    workers:=workers||jsonb_build_array(jsonb_build_object('userId',source_id,'amountCents',share,'sourceId',gen_random_uuid()));position:=position+1;
   end loop;
  else
   if jsonb_typeof(input->'originalVersion') is distinct from 'number' or coalesce(input->>'originalVersion','')!~'^[1-9][0-9]{0,8}$' or jsonb_typeof(input->'workers') is distinct from 'array' then raise exception 'earnings_original_required';end if;
   if jsonb_array_length(input->'workers')<>cardinality(assigned) then raise exception 'earnings_agreed_team_mismatch';end if;
   for w in select value from jsonb_array_elements(input->'workers') order by value->>'userId' loop
    if jsonb_typeof(w) is distinct from 'object' or (select array_agg(k order by k) from jsonb_object_keys(w) k)<>array['amountCents','userId']
     or jsonb_typeof(w->'amountCents') is distinct from 'number' or coalesce(w->>'amountCents','')!~'^(0|[1-9][0-9]{0,9})$' or (w->>'amountCents')::bigint>2147483647 then raise exception 'earnings_original_amount_required';end if;
    worker_ids:=array_append(worker_ids,(w->>'userId')::uuid);total:=total+(w->>'amountCents')::bigint;
    workers:=workers||jsonb_build_array(jsonb_build_object('userId',(w->>'userId')::uuid,'amountCents',(w->>'amountCents')::integer,'sourceId',gen_random_uuid()));
   end loop;
   select array_agg(x order by x) into worker_ids from unnest(worker_ids) x;
   if worker_ids is distinct from assigned then raise exception 'earnings_agreed_team_mismatch';end if;
   if total>2147483647 then raise exception 'earnings_overflow';end if;
  end if;
  -- Existing T04 synthetic source for this worker/booking must never be overwritten/reclassified.
  if exists(select 1 from public.adjustment_review_sources s where s.business_id=biz and s.booking_id=job.id and s.worker_id=any(assigned)) then raise exception 'earnings_existing_review_requires_reconciliation';end if;
  insert into private_t22.agreements(id,business_id,booking_id,request,booking_snapshot,rule_snapshot,workers,actor_id)
  values((input->>'agreementId')::uuid,biz,job.id,input,jsonb_build_object('version',job.version,'durationMinutes',job.duration_minutes,'assignedStaff',assigned,'selection',job.selection,'recurringScheduleId',job.recurring_schedule_id),case when input->>'kind'='new' then to_jsonb(rule) else null end,workers,uid);
  return jsonb_build_object('id',(input->>'agreementId')::uuid);
 end if;
 if keys<>array['agreementId','bookingId','businessId','completionEvidence','entitlementEvidence','requestId'] then raise exception 'earnings_fields_invalid';end if;
 if agreement.id is null or agreement.id is distinct from (input->>'agreementId')::uuid then raise exception 'earnings_agreement_required';end if;
 select * into accrued from private_t22.accruals where agreement_id=agreement.id;
 if found then
  if accrued.request=input and accrued.actor_id=uid then return jsonb_build_object('id',agreement.id);end if;
  raise exception 'earnings_already_accrued';
 end if;
 if job.status<>'completed' then raise exception 'earnings_completion_required';end if;
 foreach result in array array[input->'completionEvidence',input->'entitlementEvidence'] loop
  if jsonb_typeof(result) is distinct from 'string' or length(result#>>'{}')>2000 or length(regexp_replace(coalesce(result#>>'{}',''),whitespace,'','g'))=0 then raise exception 'earnings_evidence_required';end if;
 end loop;
 select array_agg(x order by x) into assigned from unnest(job.assigned_staff) x;
 select array_agg((x->>'userId')::uuid order by (x->>'userId')::uuid) into worker_ids from jsonb_array_elements(agreement.workers) x;
 if assigned is distinct from worker_ids or job.duration_minutes is distinct from (agreement.booking_snapshot->>'durationMinutes')::integer then raise exception 'earnings_agreed_scope_changed';end if;
 -- A real row write also fences stale REPEATABLE READ snapshots.
 update private_t22.agreements set revision=revision+1 where id=agreement.id;
 insert into private_t22.accruals(agreement_id,business_id,request_id,request,actor_id) values(agreement.id,biz,(input->>'requestId')::uuid,input,uid);
 original_version:=case when agreement.request->>'kind'='new' then (agreement.request->>'ruleVersion')::integer else (agreement.request->>'originalVersion')::integer end;
 for w in select value from jsonb_array_elements(agreement.workers) loop
  -- The original immutable adjustment source is created once, in the same transaction.
  perform audit.append_earnings_adjustment(biz,(w->>'sourceId')::uuid,0,(w->>'sourceId')::uuid,'register_source',jsonb_build_object(
   'sourceId',w->>'sourceId','bookingId',job.id,'workerId',w->>'userId','originalVersion',original_version,'originalCents',(w->>'amountCents')::integer,
   'originalPeriod',agreement.request->>'originalPeriod','agreementEvidence',agreement.request->>'agreementEvidence',
   'originalRecordEvidence','T22 SYNTHETIC accrual '||agreement.id::text||'; completion: '||(input->>'completionEvidence')));
 end loop;
 return jsonb_build_object('id',agreement.id);
end;$$;
create function public.t22_earnings(action text,input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private_t22.office_rpc(action,input);$$;
revoke all on all functions in schema private_t22 from public,anon,authenticated,service_role;
revoke all on function public.t22_earnings(text,jsonb) from public,anon,authenticated,service_role;
grant usage on schema private_t22 to authenticated;
grant execute on function private_t22.office_rpc(text,jsonb),public.t22_earnings(text,jsonb) to authenticated;
commit;
