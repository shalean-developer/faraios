begin;
create schema quote_private;
revoke all on schema quote_private from public;
create table quote_private.ingress(environment text primary key check(environment in ('preview','live')),enabled boolean not null);
insert into quote_private.ingress values('preview',true),('live',false);
alter table quote_private.ingress enable row level security;
revoke all on quote_private.ingress from public,anon,authenticated;
create function quote_private.valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;k text;t bigint=0;
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>6 or not d ?& array['name','email','phone','notes','currency','items'] then return false;end if;
 foreach k in array array['name','email','phone','notes','currency'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or d->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;end loop;
 if char_length(btrim(d->>'name')) not between 2 and 120 or char_length(d->>'email')>254 or char_length(d->>'phone')>40 or char_length(d->>'notes')>2000 or (d->>'email'='' and d->>'phone'='') or (d->>'email'<>'' and d->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (d->>'phone'<>'' and (d->>'phone' !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(d->>'phone','[^0-9]','','g'))<5)) or d->>'currency' not in ('ZAR','USD','GBP','EUR','AUD','CAD','NZD','BWP','NAD','ZMW','KES','NGN','GHS','MUR','SZL','LSL','MZN','UGX','TZS','RWF','JPY','INR','AED','CHF') or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items') not between 1 and 20 then return false;end if;
 for s in select value from jsonb_array_elements(d->'items') loop
 if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>3 or not s ?& array['name','quantity','price'] or jsonb_typeof(s->'name') is distinct from 'string' or char_length(btrim(s->>'name')) not between 2 and 120 or s->>'name' ~ '[[:cntrl:]]' or jsonb_typeof(s->'quantity') is distinct from 'number' or s->>'quantity' !~ '^[0-9]+$' or (s->>'quantity')::bigint not between 1 and 9999 or jsonb_typeof(s->'price') is distinct from 'number' or s->>'price' !~ '^[0-9]+$' or (s->>'price')::bigint not between 0 and 999999999 then return false;end if;
 if d->>'currency' in ('JPY','UGX','RWF') and (s->>'price')::bigint%100<>0 then return false;end if;
 t=t+(s->>'quantity')::bigint*(s->>'price')::bigint;
 end loop;return t<=999999999;
exception when others then return false;
end$$;
create table public.business_quotes(
 id uuid primary key,
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 enquiry_id uuid references public.business_enquiries(id) on delete restrict,
 document jsonb not null check(quote_private.valid(document)),
 expires_on date not null,
 status text not null default 'Draft' check(status in ('Draft','Sent','Accepted','Declined')),
 version integer not null default 1,
 share_token text unique check(share_token is null or share_token ~ '^[a-f0-9]{64}$'),
 sender jsonb,
 created_at timestamptz not null default now(),sent_at timestamptz,responded_at timestamptz,
 check((status='Draft' and share_token is null and sent_at is null) or (status<>'Draft' and share_token is not null and sent_at is not null))
);
alter table public.business_quotes enable row level security;
revoke all on public.business_quotes from public,anon,authenticated;
grant select on public.business_quotes to authenticated;
create policy quotes_owner on public.business_quotes for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create index quotes_owner_list on public.business_quotes(business_id,environment,created_at desc,id);
-- All writes are through bounded functions. Explicit owner checks precede definer access.
create function quote_private.owner_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb,p_expiry date,p_enquiry uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.business_quotes;b public.businesses;c text;z text;s jsonb;
begin
 select * into b from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true);
 if not found or not exists(select 1 from quote_private.ingress where environment=p_environment and enabled) then raise exception 'Quotes unavailable';end if;
 if p_action not in ('save','send') or p_action is null or p_id is null or p_version is null then raise exception 'Check quote details';end if;
 select * into q from public.business_quotes where id=p_id for update;
 if found then
 if q.business_id<>p_business or q.environment<>p_environment or q.version<>p_version or q.status<>'Draft' then raise exception 'Quote changed or unavailable. Reload before saving.';end if;
 else
 if p_version<>0 or p_action<>'save' then raise exception 'Quote changed or unavailable. Reload before saving.';end if;
 end if;
 if p_action='save' then
 if not quote_private.valid(p_document) or p_expiry is null or p_expiry < (now() at time zone b.time_zone)::date or p_expiry > (now() at time zone b.time_zone)::date+366 then raise exception 'Check quote details and expiry';end if;
 select draft->>'currency' into c from public.business_service_catalogues where business_id=p_business and environment=p_environment;
 if p_document->>'currency'<>coalesce(c,'ZAR') then raise exception 'Business currency changed. Reload before saving.';end if;
 if p_enquiry is not null and not exists(select 1 from public.business_enquiries where id=p_enquiry and business_id=p_business and environment=p_environment) then raise exception 'Enquiry unavailable';end if;
 if q.id is null then insert into public.business_quotes(id,business_id,environment,enquiry_id,document,expires_on) values(p_id,p_business,p_environment,p_enquiry,p_document,p_expiry);
 else update public.business_quotes set document=p_document,expires_on=p_expiry,version=version+1 where id=p_id;end if;
 else
 if q.expires_on < (now() at time zone b.time_zone)::date then raise exception 'Update the expiry before sending.';end if;
 -- Capture explicit public business details only; no account metadata.
 select draft into s from public.business_profiles where business_id=p_business and environment=p_environment;
 s=jsonb_build_object('name',coalesce(nullif(s->>'name',''),b.name),'email',coalesce(s->>'email',''),'phone',coalesce(s->>'phone',''),'time_zone',b.time_zone);
 update public.business_quotes set status='Sent',sender=s,share_token=encode(extensions.gen_random_bytes(32),'hex'),sent_at=now(),version=version+1 where id=p_id;
 end if;
 return jsonb_build_object('id',p_id);
end$$;
-- Bearer capability access: no enumeration and no draft or unrelated customer fields returned.
create function quote_private.customer(p_environment text,p_token text,p_response text default '') returns jsonb language plpgsql security definer set search_path='' as $$
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
 return jsonb_build_object('reference',upper(substr(q.id::text,1,8)),'document',q.document,'sender',q.sender,'expires_on',q.expires_on,'status',st,'sent_at',q.sent_at);
end$$;
revoke all on all functions in schema quote_private from public;
grant usage on schema quote_private to anon,authenticated;
grant execute on function quote_private.owner_write(uuid,text,uuid,integer,text,jsonb,date,uuid) to authenticated;
grant execute on function quote_private.customer(text,text,text) to anon,authenticated;
create function public.business_quote_write(p_business uuid,p_environment text,p_id uuid,p_version integer,p_action text,p_document jsonb,p_expiry date,p_enquiry uuid default null) returns jsonb language sql security invoker set search_path='' as $$select quote_private.owner_write(p_business,p_environment,p_id,p_version,p_action,p_document,p_expiry,p_enquiry)$$;
create function public.business_quote_customer(p_environment text,p_token text,p_response text default '') returns jsonb language sql security invoker set search_path='' as $$select quote_private.customer(p_environment,p_token,p_response)$$;
revoke all on function public.business_quote_write(uuid,text,uuid,integer,text,jsonb,date,uuid),public.business_quote_customer(text,text,text) from public;
grant execute on function public.business_quote_write(uuid,text,uuid,integer,text,jsonb,date,uuid) to authenticated;
grant execute on function public.business_quote_customer(text,text,text) to anon,authenticated;
create view public.business_quote_list with (security_invoker=true) as
 select q.*,case when q.status='Sent' and q.expires_on < (now() at time zone (q.sender->>'time_zone'))::date then 'Expired' else q.status end as effective_status from public.business_quotes q;
revoke all on public.business_quote_list from public,anon,authenticated;
grant select on public.business_quote_list to authenticated;
commit;
