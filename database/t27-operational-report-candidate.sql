-- T27 source candidate only. Unapplied. No notification dispatch or financial writes.
-- Period attribution: booking local_start; payment verification/credit timestamp; payout latest reconciliation event.
begin;
create schema if not exists private_t27;
revoke all on schema private_t27 from public,anon,authenticated,service_role;
grant usage on schema private_t27 to authenticated;
create function private_t27.report(p_business uuid,p_from date,p_through date)
returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare output jsonb;
begin
 if auth.uid() is null or not private_t20.live_session() or p_business is null
  or p_from is null or p_through is null or p_from>p_through or p_through-p_from>366
 then raise exception 'report_denied' using errcode='42501'; end if;
 perform 1 from public.businesses b join public.business_memberships m on m.business_id=b.id
  where b.id=p_business and b.status='active' and m.user_id=auth.uid()
   and m.status='active' and m.role in ('owner','manager') for share of b,m;
 if not found then raise exception 'report_denied' using errcode='42501'; end if;
 select jsonb_build_object(
  'businessId',p_business,'from',p_from,'through',p_through,'timeZone','Africa/Johannesburg',
  'bookingsInPeriod',count(*) filter(where j.local_start::date between p_from and p_through),
  'bookingValueCents',coalesce(sum(j.total_cents::bigint) filter(where
    j.local_start::date between p_from and p_through and
    j.status in ('confirmed','assigned','en_route','arrived','in_progress','completed')),0),
  'unassignedWork',count(*) filter(where j.status='confirmed' and cardinality(j.assigned_staff)=0)
 ) into output from public.one_off_bookings j where j.business_id=p_business;
 return output || jsonb_build_object(
  'awaitingAssessment',(select count(*) from private_t25.assessment_requests a
    where a.business_id=p_business and a.state='awaiting_assessment'),
  'failedNotificationJobs',(select count(*) from private_t26.jobs n
    where n.business_id=p_business and n.state='failed'),
  'verifiedOnlineCreditsCents',(select coalesce(sum(c.amount_cents::bigint),0) from private_t20.credits c
    where c.business_id=p_business and (c.recorded_at at time zone 'Africa/Johannesburg')::date between p_from and p_through),
  'verifiedEftReceiptsCents',(select coalesce(sum(r.amount_cents::bigint),0) from private_t21.receipts r
    where r.business_id=p_business and r.verified_at is not null and
    (r.verified_at at time zone 'Africa/Johannesburg')::date between p_from and p_through),
  'allocatedVerifiedEftCents',(select coalesce(sum(r.amount_cents::bigint),0)
    from private_t21.receipts r join private_t21.allocations a
      on a.receipt_id=r.id and a.business_id=r.business_id
    where r.business_id=p_business and r.verified_at is not null and
    (r.verified_at at time zone 'Africa/Johannesburg')::date between p_from and p_through),
  'internalDraftInvoicesCents',(select coalesce(sum(i.total_cents::bigint),0)
    from public.business_invoices i where i.business_id=p_business and i.document_status='draft'
      and (i.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_through),
  'issuedInvoicesCents',null,
  'issuedOutstandingCents',null,
  'approvedReimbursementsCents',(select coalesce(sum(a.delta_cents::bigint),0)
    from public.adjustment_review_items a join public.adjustment_review_sources src
      on src.id=a.source_id and src.business_id=a.business_id
    where a.business_id=p_business and a.kind='reimbursement' and a.status='approved'
      and a.simulated=false and (src.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_through),
  'accruedEarningsCents',(select coalesce(sum((w->>'amountCents')::bigint),0)
    from private_t22.accruals a join private_t22.agreements g
      on g.id=a.agreement_id and g.business_id=a.business_id
    cross join lateral jsonb_array_elements(g.workers) w
    where a.business_id=p_business and
    (a.created_at at time zone 'Africa/Johannesburg')::date between p_from and p_through),
  'clearedPayoutsCents',(select coalesce(sum((t->>'clearedCents')::bigint),0)
    from public.settlement_review_statements s
    cross join lateral jsonb_array_elements(s.state->'transfers') t
    cross join lateral (select max(e.created_at) as reconciled_at
      from public.settlement_review_events e
      where e.statement_id=s.id and e.business_id=s.business_id
        and e.event_type='reconcile' and e.payload->>'transferId'=t->>'id') ev
    where s.business_id=p_business and t->>'uncertain'='false'
      and t->>'outcome' in ('cleared','partial') and ev.reconciled_at is not null
      and (ev.reconciled_at at time zone 'Africa/Johannesburg')::date between p_from and p_through)
 );
end;$fn$;
revoke all on function private_t27.report(uuid,date,date) from public,anon,authenticated,service_role;
grant execute on function private_t27.report(uuid,date,date) to authenticated;
create function public.t27_operational_report(p_business uuid,p_from date,p_through date)
returns jsonb language sql volatile security invoker set search_path='' as $fn$
 select private_t27.report(p_business,p_from,p_through);
$fn$;
revoke all on function public.t27_operational_report(uuid,date,date) from public,anon,authenticated,service_role;
grant execute on function public.t27_operational_report(uuid,date,date) to authenticated;
commit;
