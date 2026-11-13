-- Connected fresh-project SQL editor only. Fixtures roll back; no live writes.
begin;
set local lock_timeout='3s';
set local statement_timeout='15s';
select set_config('faraios.dashboard_bid',(select business_id::text from public.business_invoices where environment='preview' order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.dashboard_bid')::uuid),true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
do $$declare b uuid=current_setting('faraios.dashboard_bid')::uuid; d jsonb; expected bigint; z text; today date; month date; m jsonb; n uuid=gen_random_uuid(); before_count bigint; denied boolean=false;
begin
 d=public.business_dashboard(b,'preview');z=d->>'zone';today=(now() at time zone z)::date;month=date_trunc('month',today)::date;
 select count(*) into expected from public.business_bookings where business_id=b and environment='preview' and status<>'Cancelled' and starts_at<((today+1)::timestamp at time zone z) and starts_at+duration_minutes*interval '1 minute'>(today::timestamp at time zone z);
 if expected<>(d->>'bookings_count')::bigint then raise exception 'FAIL booking count';end if;
 select count(*) into expected from public.business_quotes where business_id=b and environment='preview' and status='Sent' and expires_on>=today;
 if expected<>(d->>'awaiting_quotes')::bigint then raise exception 'FAIL quote count';end if;
 for m in select value from jsonb_array_elements(d->'money') loop
 select coalesce(sum(balance),0) into expected from public.business_invoice_list where business_id=b and environment='preview' and state='Issued' and balance>0 and document->>'currency'=m->>'currency';
 if expected<>(m->>'outstanding')::bigint then raise exception 'FAIL outstanding';end if;
 select coalesce(sum(case when p.reversal_of is null then p.amount else -p.amount end),0) into expected from public.business_invoice_payments p join public.business_invoices i on i.id=p.invoice_id where p.business_id=b and p.environment='preview' and p.paid_on>=month and p.paid_on<(month+interval '1 month')::date and i.document->>'currency'=m->>'currency';
 if expected<>(m->>'net')::bigint then raise exception 'FAIL net payments';end if;
 end loop;
 before_count=(d->>'new_enquiries')::bigint;
 perform public.business_enquiry_create(b,'preview',n,'PREVIEW ROLLBACK Dashboard Test','dashboard@example.test','','Fictional rollback-only phone enquiry');
 perform public.business_enquiry_create(b,'preview',n,'PREVIEW ROLLBACK Dashboard Test','dashboard@example.test','','Fictional rollback-only phone enquiry');
 d=public.business_dashboard(b,'preview');if (d->>'new_enquiries')::bigint<>before_count+1 then raise exception 'FAIL enquiry idempotency';end if;
 begin perform public.business_enquiry_create(b,'invalid',gen_random_uuid(),'PROHIBITED ENV TEST','dashboard@example.test','','This must never create a record');exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL invalid environment gate';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ffffffff-ffff-ffff-ffff-ffffffffffff',true);
set local role authenticated;
do $$declare denied boolean=false;begin
 begin perform public.business_dashboard(current_setting('faraios.dashboard_bid')::uuid,'preview');exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL foreign business';end if;
end$$;
reset role;
set local role anon;
do $$declare denied boolean=false;begin
 begin perform public.business_dashboard(current_setting('faraios.dashboard_bid')::uuid,'preview');exception when insufficient_privilege then denied=true;end;
 if not denied then raise exception 'FAIL anonymous';end if;
end$$;
reset role;
rollback;
select 'PASS: hosted dashboard snapshot, financial reconciliation, private preview intake/idempotency, environment gate and owner/anonymous isolation; all fixtures rolled back' as result;
