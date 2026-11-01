-- T21 additive STAGING candidate. Requires accepted T20 store and HTTPS facade.
-- No hosted execution. Collision refusal is deliberate; never replace an existing schema.
begin;
create schema private_t21;
revoke all on schema private_t21 from public,anon,authenticated,service_role;
create table private_t21.receipts(
 id uuid primary key,business_id uuid not null references public.businesses(id),
 bank_reference text not null check(length(bank_reference) between 1 and 120),
 evidence_reference text not null check(length(evidence_reference) between 1 and 240),
 amount_cents integer not null check(amount_cents>0),received_on date not null,
 recorded_by uuid not null references auth.users(id),recorded_at timestamptz not null default clock_timestamp(),
 verified_by uuid references auth.users(id),verified_at timestamptz,
 unique(business_id,id),unique(business_id,bank_reference),
 check((verified_by is null)=(verified_at is null))
);
create table private_t21.allocations(
 receipt_id uuid primary key,business_id uuid not null,invoice_id uuid not null,
 actor uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 foreign key(business_id,receipt_id) references private_t21.receipts(business_id,id),
 foreign key(business_id,invoice_id) references public.business_invoices(business_id,id)
);
-- A real row update forces stale REPEATABLE READ writers to abort rather than
-- accepting two allocations using an old balance snapshot after a lock wait.
create table private_t21.invoice_fences(
 business_id uuid not null,invoice_id uuid not null,revision bigint not null default 1,
 primary key(business_id,invoice_id),foreign key(business_id,invoice_id) references public.business_invoices(business_id,id)
);
alter table private_t21.invoice_fences enable row level security;
alter table private_t21.receipts enable row level security;
alter table private_t21.allocations enable row level security;
revoke all on all tables in schema private_t21 from public,anon,authenticated,service_role;

-- All writers serialize on the existing invoice row (also locked by T20).
-- Refuse a new online intent when manual cash has already been allocated.
create function private_t21.online_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.business_invoices where business_id=new.business_id and id=new.invoice_id for update;
 insert into private_t21.invoice_fences(business_id,invoice_id) values(new.business_id,new.invoice_id)
 on conflict(business_id,invoice_id) do update set revision=private_t21.invoice_fences.revision+1;
 if exists(select 1 from private_t21.allocations where business_id=new.business_id and invoice_id=new.invoice_id) then raise exception 'eft_allocation_exists';end if;
 return new;
end;$$;
create trigger t21_online_guard before insert on private_t20.intents for each row execute function private_t21.online_guard();

create function private_t21.office_rpc(action text,input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid;r private_t21.receipts;i public.business_invoices;keys text[];paid bigint;v jsonb;target uuid;
begin
 if not private_t20.live_session() or jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>4096 then raise exception 'eft_denied' using errcode='42501';end if;
 b:=(input->>'businessId')::uuid;
 if not coalesce(private_t20.authorized(b,false),false) then raise exception 'eft_denied' using errcode='42501';end if;
 select array_agg(k order by k) into keys from jsonb_object_keys(input) k;
 if action='record' and keys=array['amountCents','bankReference','businessId','evidenceReference','receivedOn','requestId'] then
  if jsonb_typeof(input->'amountCents') is distinct from 'number' or input->>'amountCents' !~ '^[1-9][0-9]{0,9}$'
  or length(btrim(input->>'bankReference')) not between 1 and 120 or length(btrim(input->>'evidenceReference')) not between 1 and 240
  or coalesce(input->>'receivedOn','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (input->>'receivedOn')::date>current_date
  or input->>'bankReference' is null or input->>'evidenceReference' is null or input->>'requestId' is null then raise exception 'eft_invalid';end if;
  insert into private_t21.receipts(id,business_id,bank_reference,evidence_reference,amount_cents,received_on,recorded_by)
  values((input->>'requestId')::uuid,b,upper(btrim(input->>'bankReference')),btrim(input->>'evidenceReference'),(input->>'amountCents')::integer,(input->>'receivedOn')::date,auth.uid()) on conflict(id) do nothing;
  select * into r from private_t21.receipts where id=(input->>'requestId')::uuid;
  if r.business_id is distinct from b or r.bank_reference is distinct from upper(btrim(input->>'bankReference')) or r.evidence_reference is distinct from btrim(input->>'evidenceReference') or r.amount_cents is distinct from (input->>'amountCents')::integer or r.received_on is distinct from (input->>'receivedOn')::date then raise exception 'eft_request_reused';end if;
  return jsonb_build_object('id',r.id);
 elsif action='verify' and keys=array['businessId','receiptId'] then
  update private_t21.receipts set verified_by=auth.uid(),verified_at=clock_timestamp() where business_id=b and id=(input->>'receiptId')::uuid and verified_at is null returning * into r;
  if not found and not exists(select 1 from private_t21.receipts where business_id=b and id=(input->>'receiptId')::uuid) then raise exception 'eft_denied' using errcode='42501';end if;
  return '{}'::jsonb;
 elsif action='allocate' and keys=array['businessId','invoiceId','receiptId'] then
  select * into i from public.business_invoices where business_id=b and id=(input->>'invoiceId')::uuid for update;
  if not found or i.currency<>'ZAR' or i.total_cents<=0 then raise exception 'eft_invoice_denied';end if;
  insert into private_t21.invoice_fences(business_id,invoice_id) values(b,i.id)
  on conflict(business_id,invoice_id) do update set revision=private_t21.invoice_fences.revision+1;
  if exists(select 1 from public.one_off_bookings where business_id=b and id=i.booking_id and status='cancelled') then raise exception 'eft_booking_cancelled';end if;
  select * into r from private_t21.receipts where business_id=b and id=(input->>'receiptId')::uuid for update;
  if not found or r.verified_at is null then raise exception 'eft_not_verified';end if;
  select invoice_id into target from private_t21.allocations where receipt_id=r.id;
  if found then
   if target<>i.id then raise exception 'eft_already_allocated';end if;
   return '{}'::jsonb;
  end if;
  -- Even failed online attempts can succeed late. Preserve them for review;
  -- never consume the same invoice balance through two independent writers.
  if exists(select 1 from private_t20.intents where business_id=b and invoice_id=i.id) then raise exception 'eft_online_attempt_needs_review';end if;
  select coalesce(sum(x.amount_cents),0) into paid from private_t21.allocations a join private_t21.receipts x on x.id=a.receipt_id where a.business_id=b and a.invoice_id=i.id;
  if paid+r.amount_cents>i.total_cents then raise exception 'eft_exceeds_balance';end if;
  insert into private_t21.allocations(receipt_id,business_id,invoice_id,actor) values(r.id,b,i.id,auth.uid());
  return '{}'::jsonb;
 elsif action='list' and (keys=array['businessId'] or keys=array['businessId','page']) then
  if input ? 'page' and (jsonb_typeof(input->'page') is distinct from 'number' or input->>'page' !~ '^(0|[1-9][0-9]{0,6})$') then raise exception 'eft_invalid_page';end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.recorded_at desc,x.id),'[]'::jsonb) into v from (
   select receipt.*,a.invoice_id from private_t21.receipts receipt left join private_t21.allocations a on a.receipt_id=receipt.id where receipt.business_id=b order by receipt.recorded_at desc,receipt.id limit 200 offset coalesce((input->>'page')::integer,0)*200
  ) x;return v;
 elsif action='status' and keys=array['businessId','invoiceId'] then
  select * into i from public.business_invoices where business_id=b and id=(input->>'invoiceId')::uuid;
  if not found then raise exception 'eft_denied' using errcode='42501';end if;
  select coalesce(sum(receipt.amount_cents),0) into paid from private_t21.allocations a join private_t21.receipts receipt on receipt.id=a.receipt_id where a.business_id=b and a.invoice_id=i.id;
  paid:=paid+coalesce((select amount_cents from private_t20.credits where business_id=b and invoice_id=i.id),0);
  return jsonb_build_object('invoiceId',i.id,'bookingId',i.booking_id,'businessId',b,'totalCents',i.total_cents,'verifiedCents',paid,'balanceCents',i.total_cents-paid,'status',case when paid=0 then 'unpaid' when paid<i.total_cents then 'part_paid' when paid=i.total_cents then 'paid' else 'review_required' end);
 end if;
 raise exception 'eft_denied' using errcode='42501';
end;$$;
create function public.t21_eft(action text,input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private_t21.office_rpc(action,input);$$;
revoke all on all functions in schema private_t21 from public,anon,authenticated,service_role;
revoke all on function public.t21_eft(text,jsonb) from public,anon,authenticated,service_role;
grant usage on schema private_t21 to authenticated;
grant execute on function private_t21.office_rpc(text,jsonb),public.t21_eft(text,jsonb) to authenticated;
commit;
