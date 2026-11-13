-- Read-only production verification: no fixtures or business writes.
begin;
set local statement_timeout='15s';
select set_config('faraios.dashboard_bid',(select business_id::text from public.business_profiles where slug='shalean-cleaning' and environment='live' limit 1),true);
select set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.dashboard_bid')::uuid),true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
do $$declare b uuid=current_setting('faraios.dashboard_bid')::uuid;d jsonb; m jsonb; expected bigint;z text;t date;first_day date;
begin
 d=public.business_dashboard(b,'live'); z=d->>'zone';t=(now() at time zone z)::date;first_day=date_trunc('month',t)::date;
 select count(*) into expected from public.business_bookings where business_id=b and environment='live' and status<>'Cancelled' and starts_at<((t+1)::timestamp at time zone z) and starts_at+duration_minutes*interval '1 minute'>(t::timestamp at time zone z);
 if expected<>(d->>'bookings_count')::bigint then raise exception 'FAIL live bookings';end if;
 for m in select value from jsonb_array_elements(d->'money') loop
 select coalesce(sum(balance),0) into expected from public.business_invoice_list where business_id=b and environment='live' and state='Issued' and balance>0 and document->>'currency'=m->>'currency';
 if expected<>(m->>'outstanding')::bigint then raise exception 'FAIL live outstanding';end if;
 select coalesce(sum(case when p.reversal_of is null then p.amount else -p.amount end),0) into expected from public.business_invoice_payments p join public.business_invoices i on i.id=p.invoice_id where p.business_id=b and p.environment='live' and p.paid_on>=first_day and p.paid_on<(first_day+interval '1 month')::date and i.document->>'currency'=m->>'currency';
 if expected<>(m->>'net')::bigint then raise exception 'FAIL live net payments';end if;
 end loop;
end$$;
select public.business_dashboard(current_setting('faraios.dashboard_bid')::uuid,'live')::text as live_snapshot;
reset role;
rollback;
select 'PASS: production read-only dashboard reconciliation; no production fixtures' as result;
