begin;
-- Read-only, one MVCC snapshot. Caller RLS remains in force; no service credentials.
create function public.business_dashboard(p_business uuid,p_environment text,p_month date default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare z text; today date; first_day date; next_day date; result jsonb;
begin
 select time_zone into z from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or p_environment is null or p_environment not in ('live','preview') then raise exception 'Dashboard unavailable';end if;
 today=(now() at time zone z)::date;
 first_day=date_trunc('month',coalesce(p_month,today))::date;
 if first_day<date '2000-01-01' or first_day>date '2099-12-01' then raise exception 'Choose a valid month';end if;
 next_day=(first_day+interval '1 month')::date;
 with bookings as materialized (
 select s.id,s.starts_at,s.duration_minutes,s.status,s.document->>'name' as name,s.assigned_staff
 from public.business_booking_schedule s where s.business_id=p_business and s.environment=p_environment and s.status<>'Cancelled'
 and s.starts_at < ((today+1)::timestamp at time zone z)
 and s.starts_at + s.duration_minutes*interval '1 minute' > (today::timestamp at time zone z)
 ), invoices as materialized (
 select i.id,i.number,i.document->>'name' as name,i.document->>'currency' as currency,i.status,i.due_on,i.balance
 from public.business_invoice_list i where i.business_id=p_business and i.environment=p_environment and i.state='Issued' and i.balance>0
 ), money as (
 select currency,0::bigint receipts,0::bigint reversals,0::bigint outstanding,0::bigint overdue
 from (select coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=p_business and environment=p_environment),'ZAR') currency) c
 union all select currency,0,0,balance,case when due_on<today then balance else 0 end from invoices
 union all
 select i.document->>'currency',case when p.reversal_of is null then p.amount else 0 end,case when p.reversal_of is not null then p.amount else 0 end,0,0
 from public.business_invoice_payments p join public.business_invoices i on i.id=p.invoice_id and i.business_id=p.business_id and i.environment=p.environment
 where p.business_id=p_business and p.environment=p_environment and p.paid_on>=first_day and p.paid_on<next_day
 ), totals as (select currency,sum(receipts) receipts,sum(reversals) reversals,sum(receipts)-sum(reversals) net,sum(outstanding) outstanding,sum(overdue) overdue from money group by currency)
 select jsonb_build_object(
 'as_of',now(),'today',today,'zone',z,'month',first_day,'month_end',next_day-1,
 'bookings_count',(select count(*) from bookings),
 'bookings',coalesce((select jsonb_agg(to_jsonb(t) order by starts_at,id) from (select * from bookings order by starts_at,id limit 8) t),'[]'::jsonb),
 'new_enquiries',(select count(*) from public.business_enquiries where business_id=p_business and environment=p_environment and status='New'),
 'awaiting_quotes',(select count(*) from public.business_quotes where business_id=p_business and environment=p_environment and status='Sent' and expires_on>=today),
 'unpaid',(select count(*) from invoices where status='Unpaid'),
 'part_paid',(select count(*) from invoices where status='Part Paid'),
 'overdue_count',(select count(*) from invoices where due_on<today),
 'invoices',coalesce((select jsonb_agg(to_jsonb(t) order by due_on,id) from (select * from invoices order by due_on,id limit 5) t),'[]'::jsonb),
 'money',(select jsonb_agg(to_jsonb(t) order by currency) from totals t)
 ) into result;
 return result;
end$$;
revoke all on function public.business_dashboard(uuid,text,date) from public,anon;
grant execute on function public.business_dashboard(uuid,text,date) to authenticated;
-- Manual private intake: no publication, outbound call or customer notification.
create function enquiry_private.manual_create(p_business uuid,p_environment text,p_id uuid,p_name text,p_email text,p_phone text,p_requirements text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_environment is distinct from 'preview' then raise exception 'Manual enquiries are preview only';end if;
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) then raise exception 'Enquiry unavailable';end if;
 if p_id is null or p_name is null or p_email is null or p_phone is null or p_requirements is null or char_length(btrim(p_name)) not between 2 and 120 or char_length(p_email)>254 or char_length(p_phone)>40 or char_length(btrim(p_requirements)) not between 10 and 4000 or (p_email='' and p_phone='') or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (p_phone<>'' and (p_phone !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(p_phone,'[^0-9]','','g'))<5)) or p_name||p_email||p_phone ~ '[[:cntrl:]]' or p_requirements ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then raise exception 'Check enquiry details';end if;
 insert into public.business_enquiries(id,business_id,environment,request_id,page_slug,customer_name,email,phone,requirements)
 values(p_id,p_business,p_environment,p_id,'',btrim(p_name),p_email,p_phone,btrim(p_requirements)) on conflict(id) do nothing;
 if not exists(select 1 from public.business_enquiries where id=p_id and business_id=p_business and environment=p_environment and customer_name=btrim(p_name) and email=p_email and phone=p_phone and requirements=btrim(p_requirements)) then raise exception 'Enquiry submission changed';end if;
 return jsonb_build_object('id',p_id);
end$$;
revoke all on function enquiry_private.manual_create(uuid,text,uuid,text,text,text,text) from public,anon;
grant usage on schema enquiry_private to authenticated;
grant execute on function enquiry_private.manual_create(uuid,text,uuid,text,text,text,text) to authenticated;
create function public.business_enquiry_create(p_business uuid,p_environment text,p_id uuid,p_name text,p_email text,p_phone text,p_requirements text) returns jsonb
language sql security invoker set search_path='' as $$select enquiry_private.manual_create(p_business,p_environment,p_id,p_name,p_email,p_phone,p_requirements)$$;
revoke all on function public.business_enquiry_create(uuid,text,uuid,text,text,text,text) from public,anon;
grant execute on function public.business_enquiry_create(uuid,text,uuid,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
