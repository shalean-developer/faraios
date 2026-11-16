do $v1022_guard$ begin
if md5(pg_get_functiondef('quote_private.customer(text,text,text)'::regprocedure)) <> '0601619b4fc08ba4a049ea4f9ba6f17f'
or md5(pg_get_functiondef('invoice_private.customer(text,text)'::regprocedure)) <> '563367514e76b712853d4e246e32cf86' then raise exception 'V1-022 baseline drift'; end if;
end $v1022_guard$;
-- Prepared V1-022 patch only. Not a full installer. No row/history/grant changes.
-- Document notes are customer-facing agreement text; customer profile private notes are never joined.

create or replace function quote_private.customer(p_environment text,p_token text,p_response text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.business_quotes;st text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(select 1 from quote_private.ingress where environment=p_environment and enabled) then return '{}'::jsonb;end if;
 select * into q from public.business_quotes where share_token=p_token and environment=p_environment and status<>'Draft' for update;
 if not found then return '{}'::jsonb;end if;
 st=case when q.status='Sent' and q.expires_on < (now() at time zone (q.sender->>'time_zone'))::date then 'Expired' else q.status end;
 if p_response<>'' then
 if p_response is null or p_response not in ('Accepted','Declined') then raise exception 'Choose accept or decline';end if;
 if st='Sent' then update public.business_quotes set status=p_response,responded_at=now(),version=version+1 where id=q.id;st=p_response;
 elsif st<>p_response then raise exception 'Quote already answered or expired. Reload the page.';end if;
 end if;
 return jsonb_build_object('reference',upper(substr(q.id::text,1,8)),'document',(jsonb_build_object('name',q.document->'name','items',q.document->'items','notes',q.document->'notes','currency',q.document->'currency') || case when q.document ? 'scope' then jsonb_build_object('scope',q.document->'scope') else '{}'::jsonb end),'sender',jsonb_build_object('name',q.sender->'name','email',q.sender->'email','phone',q.sender->'phone','time_zone',q.sender->'time_zone'),'expires_on',q.expires_on,'status',st,'sent_at',q.sent_at);
end$$;

create or replace function invoice_private.customer(p_environment text,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.business_invoices;paid bigint;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists(select 1 from invoice_private.ingress where environment=p_environment and enabled) then return '{}'::jsonb;end if;
 select * into i from public.business_invoices where environment=p_environment and share_token=p_token and state<>'Draft';
 if not found then return '{}'::jsonb;end if;
 select coalesce(sum(case when reversal_of is null then amount else -amount end),0) into paid from public.business_invoice_payments where invoice_id=i.id;
 return jsonb_build_object('number',i.number,'document',(jsonb_build_object('name',i.document->'name','items',i.document->'items','notes',i.document->'notes','currency',i.document->'currency') || case when i.document ? 'scope' then jsonb_build_object('scope',i.document->'scope') else '{}'::jsonb end),'sender',jsonb_build_object('name',i.sender->'name','email',i.sender->'email','phone',i.sender->'phone','time_zone',i.sender->'time_zone'),'due_on',i.due_on,'issued_at',i.issued_at,'total',invoice_private.total(i.document),'paid',paid,'balance',invoice_private.total(i.document)-paid,'status',case when i.state='Void' then 'Void' when paid=invoice_private.total(i.document) then 'Paid' when paid>0 then 'Part Paid' else 'Unpaid' end);
end$$;

