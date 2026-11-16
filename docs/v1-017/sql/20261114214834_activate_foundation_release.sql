-- MANUAL RELEASE STEP ONLY. Not applied by preview deployment.
-- Requires explicit production authorization. Retains all rows, counters and history.
begin;
do $preflight$ begin
 if md5(pg_get_functiondef('quote_private.guard_free()'::regprocedure)::text) is null then raise exception 'Missing release prerequisite';end if;
 if (select md5(prosrc) from pg_proc where oid='quote_private.guard_free()'::regprocedure) not in ('01a4701c9b9ba20a9d0d020711cd2aaa','7aa04db6ead17f282e37c5285eb53ad6') then raise exception 'Release prerequisite changed: quote_private.guard_free';end if;
 if md5(pg_get_functiondef('quote_private.send(uuid,text,uuid,integer,boolean)'::regprocedure)::text) is null then raise exception 'Missing release prerequisite';end if;
 if (select md5(prosrc) from pg_proc where oid='quote_private.send(uuid,text,uuid,integer,boolean)'::regprocedure) not in ('1a42c729c916eb5d52a0043bfd320113','b40235fa50752360b78ce1ac4d06985a') then raise exception 'Release prerequisite changed: quote_private.send';end if;
 if md5(pg_get_functiondef('invoice_private.write(uuid,text,uuid,integer,text,jsonb,date,uuid,text)'::regprocedure)::text) is null then raise exception 'Missing release prerequisite';end if;
 if (select md5(prosrc) from pg_proc where oid='invoice_private.write(uuid,text,uuid,integer,text,jsonb,date,uuid,text)'::regprocedure) not in ('50b9936fe6d2d2fac062c3c0673216cb','51d4739e85a3e2b35de0072907a155f5') then raise exception 'Release prerequisite changed: invoice_private.write';end if;
end $preflight$;
create or replace function quote_private.guard_free() returns trigger language plpgsql set search_path='' as $$
begin
 if new.document is distinct from old.document then new.free_confirmed_at=null;end if;
 if new.environment in ('preview','live') and old.status='Draft' and new.status='Sent' and invoice_private.total(new.document)=0 and new.free_confirmed_at is null then
 raise exception 'Confirm this is deliberately a free quote before sending';end if;
 return new;
end$$;

create or replace function quote_private.send(p_business uuid,p_environment text,p_id uuid,p_version integer,p_free_confirmed boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q public.business_quotes;
begin
 if p_environment not in ('preview','live') or p_environment is null or not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) or not exists(select 1 from quote_private.ingress where environment=p_environment and enabled) then raise exception 'Quotes unavailable';end if;
 select * into q from public.business_quotes where id=p_id and business_id=p_business and environment=p_environment for update;
 if not found or q.version is distinct from p_version or q.status<>'Draft' then raise exception 'Quote changed or unavailable. Reload before saving.';end if;
 if invoice_private.total(q.document)=0 then
 if p_free_confirmed is distinct from true then raise exception 'Confirm this is deliberately a free quote before sending';end if;
 update public.business_quotes set free_confirmed_at=clock_timestamp() where id=q.id;
 end if;
 return quote_private.owner_write(p_business,p_environment,p_id,p_version,'send',q.document,q.expires_on,q.enquiry_id);
end$$;

create or replace function invoice_private.write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb default null,p_due date default null,p_booking uuid default null,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.businesses;i public.business_invoices;r public.business_bookings;d jsonb;c text;s jsonb;n bigint;existing uuid;
begin
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from invoice_private.ingress where environment=p_environment and enabled) then raise exception 'Invoices unavailable';end if;
 if p_id is null or p_version is null or p_action is null or p_action not in ('save','issue','void','replace') then raise exception 'Check invoice details';end if;
 if p_reason is null or char_length(p_reason)>500 or p_reason ~ '[[:cntrl:]]' then raise exception 'Check correction reason';end if;
 -- Serializes numbering, creation and payment-affecting transitions within this tenant.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':invoice:'||p_environment,0));
 select * into i from public.business_invoices where id=p_id for update;
 if found then
 if i.business_id<>p_business or i.environment<>p_environment then raise exception 'Invoice unavailable';end if;
 if i.version<>p_version then raise exception 'Invoice changed. Reload before saving.';end if;
 elsif p_action<>'save' or p_version<>0 then raise exception 'Invoice changed or unavailable';end if;
 if p_action='replace' then
 if p_environment not in ('preview','live') or p_environment is null then raise exception 'Invoice environment unavailable';end if;
 if i.state is distinct from 'Void' then raise exception 'Void the original invoice before replacing it';end if;
 if char_length(btrim(p_reason)) not between 5 and 500 then raise exception 'Enter a correction reason from 5 to 500 characters';end if;
 select id into existing from public.business_invoices where replaces_id=i.id;
 if found then return jsonb_build_object('id',existing);end if;
 if i.booking_id is not null and exists(select 1 from public.business_invoices where booking_id=i.booking_id and state<>'Void') then raise exception 'Open the active invoice for this booking';end if;
 existing=extensions.gen_random_uuid();
 insert into public.business_invoices(id,business_id,environment,booking_id,document,due_on,replaces_id)
 values(existing,p_business,p_environment,i.booking_id,i.document,i.due_on,i.id);
 insert into public.business_invoice_events(invoice_id,business_id,environment,action,actor,detail)
 values(i.id,p_business,p_environment,'replacement',auth.uid(),jsonb_build_object('replacement',existing,'reason',btrim(p_reason))),
 (existing,p_business,p_environment,'created_replacement',auth.uid(),jsonb_build_object('predecessor',i.id,'reason',btrim(p_reason)));
 return jsonb_build_object('id',existing);
 end if;
 if p_action='save' then
 if i.id is not null and i.state<>'Draft' then raise exception 'Issued invoices cannot be edited';end if;
 if p_due is null or p_due<date '2000-01-01' or p_due>date '2099-12-31' then raise exception 'Choose a valid due date';end if;
 if i.id is not null then p_booking=i.booking_id;end if;
 d=p_document;
 if p_booking is not null then
 select * into r from public.business_bookings where id=p_booking and business_id=p_business and environment=p_environment for share;
 if not found or (i.id is null and r.status='Cancelled') then raise exception 'Booking unavailable or cancelled';end if;
 if i.id is null then
 select id into existing from public.business_invoices where booking_id=p_booking and business_id=p_business and environment=p_environment order by (state<>'Void') desc,created_at desc,id desc limit 1;
 if found then return jsonb_build_object('id',existing);end if;
 end if;
 -- First creation snapshots the saved agreement. Later draft edits cannot change it.
 d=case when i.id is null then r.document when i.replaces_id is not null then p_document else i.document end;
 if i.id is not null and d->>'currency' is distinct from i.document->>'currency' then raise exception 'Invoice currency cannot be changed';end if;
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
notify pgrst,'reload schema';
commit;

