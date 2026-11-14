begin;
-- Additive private owner workspace; retain all existing enquiries and agreements.
alter table public.business_enquiries
 add column private_notes text not null default '' check(char_length(private_notes)<=2000 and private_notes !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]'),
 add column follow_up_on date check(follow_up_on between date '2000-01-01' and date '2099-12-31');
grant update(private_notes,follow_up_on) on public.business_enquiries to authenticated;
create index enquiry_followups on public.business_enquiries(business_id,environment,follow_up_on) where status<>'Closed' and follow_up_on is not null;
create table public.business_enquiry_activity(
 id uuid primary key default gen_random_uuid(), enquiry_id uuid not null references public.business_enquiries(id) on delete restrict,
 created_at timestamptz not null default now(), actor_id uuid, event text not null,
 status text not null, private_notes text not null, follow_up_on date
);
alter table public.business_enquiry_activity enable row level security;
revoke all on public.business_enquiry_activity from public,anon,authenticated;
grant select on public.business_enquiry_activity to authenticated;
create policy enquiry_activity_read on public.business_enquiry_activity for select to authenticated
 using(exists(select 1 from public.business_enquiries e join public.businesses b on b.id=e.business_id where e.id=enquiry_id and b.owner_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)));
create index enquiry_activity_history on public.business_enquiry_activity(enquiry_id,created_at desc,id desc);
-- The trigger alone appends activity. No caller can forge, change or delete it.
create function enquiry_private.record_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if (new.status,new.private_notes,new.follow_up_on) is not distinct from (old.status,old.private_notes,old.follow_up_on) then return new;end if;
 end if;
 insert into public.business_enquiry_activity(enquiry_id,actor_id,event,status,private_notes,follow_up_on)
 values(new.id,auth.uid(),case when TG_OP='INSERT' then 'Created' else 'Updated' end,new.status,new.private_notes,new.follow_up_on);
 return new;
end$$;
revoke all on function enquiry_private.record_activity() from public,anon,authenticated;
create trigger enquiry_activity after insert or update on public.business_enquiries for each row execute function enquiry_private.record_activity();
create function public.business_enquiry_workflow_save(p_business uuid,p_environment text,p_id uuid,p_version integer,p_status text,p_notes text,p_follow_up date default null) returns jsonb
 language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) then raise exception 'Enquiry unavailable';end if;
 if p_status is null or p_status not in ('New','Contacted','Closed') or p_notes is null or char_length(p_notes)>2000 then raise exception 'Check enquiry details';end if;
 update public.business_enquiries set status=p_status,private_notes=p_notes,follow_up_on=p_follow_up
 where id=p_id and business_id=p_business and environment=p_environment and version=p_version;
 if not found then raise exception 'Enquiry changed or unavailable. Reload before updating.';end if;
 return '{}'::jsonb;
end$$;
revoke all on function public.business_enquiry_workflow_save(uuid,text,uuid,integer,text,text,date) from public,anon;
grant execute on function public.business_enquiry_workflow_save(uuid,text,uuid,integer,text,text,date) to authenticated;
create function public.business_enquiry_workspace(p_business uuid,p_environment text,p_id uuid,p_activity_page integer default 1) returns jsonb
 language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_activity_page is null or p_activity_page not between 1 and 100000 then raise exception 'Choose a valid activity page';end if;
 if not exists(select 1 from public.business_enquiries e join public.businesses b on b.id=e.business_id where e.id=p_id and e.business_id=p_business and e.environment=p_environment and b.owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) then raise exception 'Enquiry unavailable';end if;
 select jsonb_build_object(
 'quotes',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc,id desc) from (
 select q.id,q.created_at,q.effective_status as status,q.document->>'currency' as currency,
 (select sum((i->>'quantity')::bigint*(i->>'price')::bigint) from jsonb_array_elements(q.document->'items') i) as total,
 (select b.id from public.business_bookings b where b.quote_id=q.id and b.business_id=p_business and b.environment=p_environment) as booking_id
 from public.business_quote_list q where q.enquiry_id=p_id and q.business_id=p_business and q.environment=p_environment order by q.created_at desc,q.id desc limit 21) t),'[]'::jsonb),
 'activity',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc,id desc) from (
 select id,created_at,event,status,private_notes,follow_up_on from public.business_enquiry_activity where enquiry_id=p_id order by created_at desc,id desc limit 21 offset (p_activity_page-1)*20) t),'[]'::jsonb)
 ) into result;return result;
end$$;
revoke all on function public.business_enquiry_workspace(uuid,text,uuid,integer) from public,anon;
grant execute on function public.business_enquiry_workspace(uuid,text,uuid,integer) to authenticated;
create or replace function quote_private.valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;k text;t bigint=0;
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d)) not in (6,7) or not d ?& array['name','email','phone','notes','currency','items'] then return false;end if;
 if (select count(*) from jsonb_object_keys(d))=7 and (not d ? 'scope' or not request_private.scope_valid(d->'scope') or d->'scope'->>'currency' is distinct from d->>'currency') then return false;end if;
 foreach k in array array['name','email','phone','notes','currency'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or d->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;end loop;
 if char_length(btrim(d->>'name')) not between 2 and 120 or char_length(d->>'email')>254 or char_length(d->>'phone')>40 or char_length(d->>'notes')>4000 or (d->>'email'='' and d->>'phone'='') or (d->>'email'<>'' and d->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (d->>'phone'<>'' and (d->>'phone' !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(d->>'phone','[^0-9]','','g'))<5)) or d->>'currency' not in ('ZAR','USD','GBP','EUR','AUD','CAD','NZD','BWP','NAD','ZMW','KES','NGN','GHS','MUR','SZL','LSL','MZN','UGX','TZS','RWF','JPY','INR','AED','CHF') or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items') not between 1 and 20 then return false;end if;
 for s in select value from jsonb_array_elements(d->'items') loop
 if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>3 or not s ?& array['name','quantity','price'] or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 2 and 120 or s->>'name' ~ '[[:cntrl:]]' or jsonb_typeof(s->'quantity') is distinct from 'number' or s->>'quantity' !~ '^[0-9]+$' or (s->>'quantity')::bigint not between 1 and 9999 or jsonb_typeof(s->'price') is distinct from 'number' or s->>'price' !~ '^[0-9]+$' or (s->>'price')::bigint not between 0 and 999999999 then return false;end if;
 if d->>'currency' in ('JPY','UGX','RWF') and (s->>'price')::bigint%100<>0 then return false;end if;
 t=t+(s->>'quantity')::bigint*(s->>'price')::bigint;
 end loop;return t<=999999999;
exception when others then return false;
end$$;
create or replace function public.business_dashboard(p_business uuid,p_environment text,p_month date default null) returns jsonb
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
 'followups_due',(select count(*) from public.business_enquiries where business_id=p_business and environment=p_environment and status<>'Closed' and follow_up_on<=today),
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
notify pgrst,'reload schema';
commit;
