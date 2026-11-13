begin;
create schema invoice_private;
revoke all on schema invoice_private from public;
create table invoice_private.ingress(environment text primary key check(environment in ('preview','live')), enabled boolean not null);
insert into invoice_private.ingress values('preview',true),('live',false);
create table invoice_private.counters(business_id uuid not null references public.businesses(id),environment text not null, value bigint not null,primary key(business_id,environment));
alter table invoice_private.ingress enable row level security;
alter table invoice_private.counters enable row level security;
revoke all on all tables in schema invoice_private from public,anon,authenticated;
create function invoice_private.total(d jsonb) returns bigint language sql immutable set search_path='' as $$select sum((v->>'quantity')::bigint*(v->>'price')::bigint) from jsonb_array_elements(d->'items') v$$;
create table public.business_invoices(
 id uuid primary key,business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 booking_id uuid references public.business_bookings(id) on delete restrict,
 document jsonb not null check(quote_private.valid(document)),due_on date not null,
 state text not null default 'Draft' check(state in ('Draft','Issued','Void')),
 version integer not null default 1,number text,share_token text unique,sender jsonb,
 created_at timestamptz not null default now(),issued_at timestamptz,voided_at timestamptz,void_reason text,
 unique(business_id,environment,number),unique(booking_id),unique(id,business_id,environment),
 check((state='Draft' and number is null and share_token is null and issued_at is null) or (state<>'Draft' and number is not null and share_token ~ '^[a-f0-9]{64}$' and issued_at is not null))
);
create table public.business_invoice_payments(
 id uuid primary key,invoice_id uuid not null,business_id uuid not null,environment text not null,
 amount bigint not null check(amount between 1 and 999999999),paid_on date not null,
 reference text not null,created_at timestamptz not null default now(),created_by uuid not null,
 reversal_of uuid unique references public.business_invoice_payments(id) on delete restrict,reason text not null default '',
 foreign key(invoice_id,business_id,environment) references public.business_invoices(id,business_id,environment) on delete restrict
);
create table public.business_invoice_events(
 id bigint generated always as identity primary key,invoice_id uuid not null,business_id uuid not null,environment text not null,
 action text not null,actor uuid not null,created_at timestamptz not null default now(),detail jsonb not null,
 foreign key(invoice_id,business_id,environment) references public.business_invoices(id,business_id,environment) on delete restrict
);
alter table public.business_invoices enable row level security;
revoke all on public.business_invoices from public,anon,authenticated;
grant select on public.business_invoices to authenticated;
create policy invoice_owner on public.business_invoices for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)));
alter table public.business_invoice_payments enable row level security;
revoke all on public.business_invoice_payments from public,anon,authenticated;
grant select on public.business_invoice_payments to authenticated;
create policy invoice_owner on public.business_invoice_payments for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)));
alter table public.business_invoice_events enable row level security;
revoke all on public.business_invoice_events from public,anon,authenticated;
grant select on public.business_invoice_events to authenticated;
create policy invoice_owner on public.business_invoice_events for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)));
create index invoices_list on public.business_invoices(business_id,environment,created_at desc,id);
create index invoice_payments_list on public.business_invoice_payments(invoice_id,created_at,id);
create index invoice_events_list on public.business_invoice_events(invoice_id,created_at,id);
create view public.business_invoice_list with(security_invoker=true) as
 select i.*,invoice_private.total(i.document) as total,coalesce(p.paid,0) as paid,
 invoice_private.total(i.document)-coalesce(p.paid,0) as balance,
 case when i.state='Draft' then 'Draft' when i.state='Void' then 'Void' when coalesce(p.paid,0)=invoice_private.total(i.document) then 'Paid' when coalesce(p.paid,0)>0 then 'Part Paid' else 'Unpaid' end as status
 from public.business_invoices i left join lateral(select sum(case when reversal_of is null then amount else -amount end) paid from public.business_invoice_payments where invoice_id=i.id) p on true;
revoke all on public.business_invoice_list from public,anon,authenticated;
grant select on public.business_invoice_list to authenticated;
create function invoice_private.write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb default null,p_due date default null,p_booking uuid default null,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.businesses;i public.business_invoices;r public.business_bookings;d jsonb;c text;s jsonb;n bigint;existing uuid;
begin
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from invoice_private.ingress where environment=p_environment and enabled) then raise exception 'Invoices unavailable';end if;
 if p_id is null or p_version is null or p_action is null or p_action not in ('save','issue','void') then raise exception 'Check invoice details';end if;
 if p_reason is null or char_length(p_reason)>500 or p_reason ~ '[[:cntrl:]]' then raise exception 'Check correction reason';end if;
 -- Serializes numbering, creation and payment-affecting transitions within this tenant.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':invoice:'||p_environment,0));
 select * into i from public.business_invoices where id=p_id for update;
 if found then
 if i.business_id<>p_business or i.environment<>p_environment then raise exception 'Invoice unavailable';end if;
 if i.version<>p_version then raise exception 'Invoice changed. Reload before saving.';end if;
 elsif p_action<>'save' or p_version<>0 then raise exception 'Invoice changed or unavailable';end if;
 if p_action='save' then
 if i.id is not null and i.state<>'Draft' then raise exception 'Issued invoices cannot be edited';end if;
 if p_due is null or p_due<date '2000-01-01' or p_due>date '2099-12-31' then raise exception 'Choose a valid due date';end if;
 if i.id is not null then p_booking=i.booking_id;end if;
 d=p_document;
 if p_booking is not null then
 select * into r from public.business_bookings where id=p_booking and business_id=p_business and environment=p_environment for share;
 if not found or (i.id is null and r.status='Cancelled') then raise exception 'Booking unavailable or cancelled';end if;
 if i.id is null then
 select id into existing from public.business_invoices where booking_id=p_booking and business_id=p_business and environment=p_environment;
 if found then return jsonb_build_object('id',existing);end if;
 end if;
 -- First creation snapshots the saved agreement. Later draft edits cannot change it.
 d=case when i.id is null then r.document else i.document end;
 elsif i.id is null then
 select draft->>'currency' into c from public.business_service_catalogues where business_id=p_business and environment=p_environment;
 if d->>'currency' is distinct from coalesce(c,'ZAR') then raise exception 'Business currency changed. Reload.';end if;
 elsif d->>'currency' is distinct from i.document->>'currency' then raise exception 'Invoice currency cannot be changed';end if;
 if not quote_private.valid(d) or invoice_private.total(d)<1 then raise exception 'Add valid items with a positive total';end if;
 if i.id is null then insert into public.business_invoices(id,business_id,environment,booking_id,document,due_on) values(p_id,p_business,p_environment,p_booking,d,p_due);
 else update public.business_invoices set document=d,due_on=p_due,version=version+1 where id=p_id;end if;
 elsif p_action='issue' then
 if i.state<>'Draft' then raise exception 'Invoice already issued or void';end if;
 if i.due_on < (now() at time zone b.time_zone)::date then raise exception 'Update the due date before issuing';end if;
 insert into invoice_private.counters values(p_business,p_environment,1) on conflict(business_id,environment) do update set value=invoice_private.counters.value+1 returning value into n;
 select draft into s from public.business_profiles where business_id=p_business and environment=p_environment;
 s=jsonb_build_object('name',coalesce(nullif(s->>'name',''),b.name),'email',coalesce(s->>'email',''),'phone',coalesce(s->>'phone',''),'time_zone',b.time_zone);
 update public.business_invoices set state='Issued',number='INV-'||lpad(n::text,greatest(6,length(n::text)),'0'),sender=s,share_token=encode(extensions.gen_random_bytes(32),'hex'),issued_at=now(),version=version+1 where id=p_id;
 else
 if i.state<>'Issued' then raise exception 'Only issued invoices can be voided';end if;
 if exists(select 1 from public.business_invoice_payments where invoice_id=p_id group by invoice_id having sum(case when reversal_of is null then amount else -amount end)<>0) then raise exception 'Reverse recorded payments before voiding. A reversal does not refund money.';end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 5 and 500 or p_reason ~ '[[:cntrl:]]' then raise exception 'Enter a correction reason from 5 to 500 characters';end if;
 update public.business_invoices set state='Void',void_reason=btrim(p_reason),voided_at=now(),version=version+1 where id=p_id;
 end if;
 insert into public.business_invoice_events(invoice_id,business_id,environment,action,actor,detail) values(p_id,p_business,p_environment,p_action,auth.uid(),jsonb_build_object('reason',p_reason,'version',p_version));
 return jsonb_build_object('id',p_id);
end$$;
create function invoice_private.payment(p_business uuid,p_environment text,p_invoice uuid,p_id uuid,p_amount bigint,p_paid_on date,p_reference text,p_reversal uuid default null,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.businesses;i public.business_invoices;p public.business_invoice_payments;old public.business_invoice_payments;paid bigint;
begin
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from invoice_private.ingress where environment=p_environment and enabled) then raise exception 'Payments unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':invoice:'||p_environment,0));
 select * into i from public.business_invoices where id=p_invoice and business_id=p_business and environment=p_environment for update;
 if not found then raise exception 'Invoice unavailable';end if;
 select * into old from public.business_invoice_payments where id=p_id;
 if found then
 if old.invoice_id=p_invoice and old.business_id=p_business and old.environment=p_environment and old.reversal_of is not distinct from p_reversal and old.amount=p_amount and old.paid_on=p_paid_on and old.reference=btrim(p_reference) and old.reason=btrim(p_reason) then return jsonb_build_object('id',p_id);end if;
 raise exception 'Payment submission changed. Reload before saving.';end if;
 if i.state<>'Issued' then raise exception 'Payments require an issued invoice';end if;
 if p_id is null or p_amount is null or p_amount not between 1 and 999999999 or p_paid_on is null or p_paid_on<date '2000-01-01' or p_paid_on>(now() at time zone b.time_zone)::date or p_reference is null or char_length(btrim(p_reference)) not between 2 and 120 or p_reference ~ '[[:cntrl:]]' then raise exception 'Check amount, payment date and reference';end if;
 if i.document->>'currency' in ('JPY','UGX','RWF') and p_amount%100<>0 then raise exception 'Use whole currency amounts';end if;
 if p_reversal is not null then
 select * into p from public.business_invoice_payments where id=p_reversal and invoice_id=p_invoice and business_id=p_business and environment=p_environment and reversal_of is null;
 if not found or exists(select 1 from public.business_invoice_payments where reversal_of=p_reversal) or p.amount<>p_amount or p.paid_on<>p_paid_on or p.reference<>btrim(p_reference) or p_reason is null or char_length(btrim(p_reason)) not between 5 and 500 or p_reason ~ '[[:cntrl:]]' then raise exception 'Payment already reversed or correction invalid';end if;
 else
 if p_reason is distinct from '' then raise exception 'Correction reason only applies to reversals';end if;
 -- Same invoice, reference, date and amount is a duplicate even with a new submission key.
 if exists(select 1 from public.business_invoice_payments x where x.invoice_id=p_invoice and x.reversal_of is null and x.amount=p_amount and x.paid_on=p_paid_on and lower(x.reference)=lower(btrim(p_reference)) and not exists(select 1 from public.business_invoice_payments y where y.reversal_of=x.id)) then raise exception 'This payment is already recorded';end if;
 select coalesce(sum(case when reversal_of is null then amount else -amount end),0) into paid from public.business_invoice_payments where invoice_id=p_invoice;
 if p_amount>invoice_private.total(i.document)-paid then raise exception 'Payment exceeds the outstanding balance';end if;
 end if;
 insert into public.business_invoice_payments(id,invoice_id,business_id,environment,amount,paid_on,reference,created_by,reversal_of,reason) values(p_id,p_invoice,p_business,p_environment,p_amount,p_paid_on,btrim(p_reference),auth.uid(),p_reversal,btrim(p_reason));
 update public.business_invoices set version=version+1 where id=p_invoice;
 insert into public.business_invoice_events(invoice_id,business_id,environment,action,actor,detail) values(p_invoice,p_business,p_environment,case when p_reversal is null then 'payment' else 'reversal' end,auth.uid(),jsonb_build_object('payment',p_id,'reversal_of',p_reversal,'reason',p_reason));
 return jsonb_build_object('id',p_id);
end$$;
create function invoice_private.customer(p_environment text,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.business_invoices;paid bigint;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(select 1 from invoice_private.ingress where environment=p_environment and enabled) then return '{}'::jsonb;end if;
 select * into i from public.business_invoices where environment=p_environment and share_token=p_token and state<>'Draft';
 if not found then return '{}'::jsonb;end if;
 select coalesce(sum(case when reversal_of is null then amount else -amount end),0) into paid from public.business_invoice_payments where invoice_id=i.id;
 return jsonb_build_object('number',i.number,'document',i.document-'email'-'phone','sender',i.sender,'due_on',i.due_on,'issued_at',i.issued_at,'total',invoice_private.total(i.document),'paid',paid,'balance',invoice_private.total(i.document)-paid,'status',case when i.state='Void' then 'Void' when paid=invoice_private.total(i.document) then 'Paid' when paid>0 then 'Part Paid' else 'Unpaid' end);
end$$;
revoke all on all functions in schema invoice_private from public,anon,authenticated;
grant usage on schema invoice_private to authenticated,anon;
grant execute on function invoice_private.total(jsonb) to authenticated;
grant execute on function invoice_private.write(uuid,text,uuid,integer,text,jsonb,date,uuid,text),invoice_private.payment(uuid,text,uuid,uuid,bigint,date,text,uuid,text) to authenticated;
grant execute on function invoice_private.customer(text,text) to anon,authenticated;
create function public.business_invoice_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb default null,p_due date default null,p_booking uuid default null,p_reason text default '') returns jsonb language sql security invoker set search_path='' as $$select invoice_private.write(p_business,p_environment,p_id,p_version,p_action,p_document,p_due,p_booking,p_reason)$$;
create function public.business_invoice_payment(p_business uuid,p_environment text,p_invoice uuid,p_id uuid,p_amount bigint,p_paid_on date,p_reference text,p_reversal uuid default null,p_reason text default '') returns jsonb language sql security invoker set search_path='' as $$select invoice_private.payment(p_business,p_environment,p_invoice,p_id,p_amount,p_paid_on,p_reference,p_reversal,p_reason)$$;
create function public.business_invoice_customer(p_environment text,p_token text) returns jsonb language sql security invoker set search_path='' as $$select invoice_private.customer(p_environment,p_token)$$;
revoke all on function public.business_invoice_write(uuid,text,uuid,integer,text,jsonb,date,uuid,text),public.business_invoice_payment(uuid,text,uuid,uuid,bigint,date,text,uuid,text),public.business_invoice_customer(text,text) from public,anon,authenticated;
grant execute on function public.business_invoice_write(uuid,text,uuid,integer,text,jsonb,date,uuid,text),public.business_invoice_payment(uuid,text,uuid,uuid,bigint,date,text,uuid,text) to authenticated;
grant execute on function public.business_invoice_customer(text,text) to anon,authenticated;
commit;
