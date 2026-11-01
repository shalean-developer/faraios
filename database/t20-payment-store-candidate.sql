-- INACTIVE REVIEW CANDIDATE. Never applied to staging by this increment.
begin;
create schema private_t20;
revoke all on schema private_t20 from public,anon,authenticated,service_role;
create role t20_payment_verifier nologin noinherit;
create table private_t20.accounts(
 business_id uuid primary key references public.businesses(id),environment text not null default 'staging' check(environment='staging'),
 account_id text not null unique check(account_id ~ '^[1-9][0-9]{0,29}$'),enabled boolean not null default false,
 updated_by uuid not null,updated_at timestamptz not null default clock_timestamp(),unique(business_id,account_id)
);
create table private_t20.intents(
 id uuid primary key,business_id uuid not null,invoice_id uuid not null,account_id text not null,
 reference text not null unique,amount_cents integer not null check(amount_cents>0),currency text not null check(currency='ZAR'),
 transaction_id text check(transaction_id ~ '^[1-9][0-9]{0,29}$'),
 status text not null default 'pending' check(status in ('pending','failed','paid','review_required')),
 version integer not null default 1,created_by uuid not null,created_at timestamptz not null default clock_timestamp(),
 foreign key(business_id,account_id) references private_t20.accounts(business_id,account_id),
 foreign key(business_id,invoice_id) references public.business_invoices(business_id,id),
 unique(account_id,transaction_id),unique(business_id,id)
);
create table private_t20.observations(
 business_id uuid not null,intent_id uuid not null,transaction_id text not null,status text not null,
 observed_at timestamptz not null default clock_timestamp(),
 foreign key(business_id,intent_id) references private_t20.intents(business_id,id),
 primary key(intent_id,transaction_id,status)
);
create table private_t20.credits(
 business_id uuid not null,invoice_id uuid not null,intent_id uuid not null unique,amount_cents integer not null,
 recorded_at timestamptz not null default clock_timestamp(),primary key(business_id,invoice_id),
 foreign key(business_id,intent_id) references private_t20.intents(business_id,id),
 foreign key(business_id,invoice_id) references public.business_invoices(business_id,id)
);
alter table private_t20.accounts enable row level security;
alter table private_t20.intents enable row level security;
alter table private_t20.observations enable row level security;
alter table private_t20.credits enable row level security;
revoke all on all tables in schema private_t20 from public,anon,authenticated,service_role,t20_payment_verifier;

create function private_t20.authorized(b uuid,owner_only boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_memberships m join public.businesses x on x.id=m.business_id
 where m.business_id=b and m.user_id=auth.uid() and m.status='active' and x.status='active'
 and (m.role='owner' or not owner_only and m.role='manager'));
$$;
create function private_t20.configure_account(b uuid,a text,on_flag boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private_t20.authorized(b,true) or a is null or on_flag is null then raise exception 'payment_account_denied' using errcode='42501';end if;
 if exists(select 1 from private_t20.intents where business_id=b and account_id<>a) then raise exception 'payment_account_in_use';end if;
 insert into private_t20.accounts(business_id,account_id,enabled,updated_by) values(b,a,on_flag,auth.uid())
 on conflict(business_id) do update set account_id=excluded.account_id,enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=clock_timestamp();
end;$$;
create function private_t20.create_intent(b uuid,invoice uuid,request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private_t20.accounts;i public.business_invoices;v private_t20.intents;
begin
 if not private_t20.authorized(b,false) or request_id is null then raise exception 'payment_intent_denied' using errcode='42501';end if;
 select * into a from private_t20.accounts where business_id=b and enabled for share;
 if not found then raise exception 'payment_account_disabled';end if;
 select * into i from public.business_invoices where business_id=b and id=invoice for update;
 if not found or i.total_cents<=0 or i.currency<>'ZAR' then raise exception 'payment_invoice_denied';end if;
 if exists(select 1 from private_t20.credits where business_id=b and invoice_id=invoice) then raise exception 'payment_already_recorded';end if;
 select * into v from private_t20.intents where id=request_id;
 if found then
  if v.business_id<>b or v.invoice_id<>invoice or v.account_id<>a.account_id then raise exception 'payment_request_reused';end if;
  return jsonb_build_object('id',v.id,'reference',v.reference,'amountCents',v.amount_cents,'currency',v.currency,'status',v.status);
 end if;
 select * into v from private_t20.intents where business_id=b and invoice_id=invoice and status='pending' order by created_at,id limit 1;
 if not found then
  insert into private_t20.intents(id,business_id,invoice_id,account_id,reference,amount_cents,currency,created_by)
  values(request_id,b,invoice,a.account_id,'FOS-'||request_id::text,i.total_cents,i.currency,auth.uid()) returning * into v;
 end if;
 return jsonb_build_object('id',v.id,'reference',v.reference,'amountCents',v.amount_cents,'currency',v.currency,'status',v.status);
end;$$;

-- Only a future dedicated authenticated verifier may receive this role. No
-- browser/service-role grant or HTTP facade is supplied. Verification is upstream.
create function private_t20.publish_verified(b uuid,a text,request_id uuid,tx text,outcome text,cents integer,ccy text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v private_t20.intents;next_status text;credit_owner uuid;n integer;
begin
 if b is null or a is null or tx is null or tx !~ '^[1-9][0-9]{0,29}$' or outcome is null or outcome not in ('success','failed','abandoned','pending','ongoing','processing','queued') or cents is null or ccy is null then raise exception 'payment_observation_denied';end if;
 perform 1 from private_t20.accounts where business_id=b and account_id=a and enabled for share;
 if not found then raise exception 'payment_account_disabled';end if;
 -- Lock invoice before intent everywhere, so competing attempts serialize too.
 perform 1 from public.business_invoices i join private_t20.intents p on p.business_id=i.business_id and p.invoice_id=i.id
 where p.id=request_id and p.business_id=b and p.account_id=a for update of i;
 if not found then raise exception 'payment_observation_denied';end if;
 select * into v from private_t20.intents where id=request_id and business_id=b and account_id=a for update;
 if v.amount_cents<>cents or v.currency<>ccy or v.transaction_id is not null and v.transaction_id<>tx then raise exception 'payment_observation_denied';end if;
 insert into private_t20.observations(business_id,intent_id,transaction_id,status) values(b,request_id,tx,outcome) on conflict do nothing;
 get diagnostics n=row_count;
 if n=0 then return jsonb_build_object('changed',false,'status',v.status);end if;
 next_status:=case when outcome='success' then 'paid' when outcome in ('failed','abandoned') then 'failed' else 'pending' end;
 if v.status in ('paid','review_required') or v.status='failed' and next_status='pending' then next_status:=v.status;end if;
 if next_status='paid' then
  insert into private_t20.credits(business_id,invoice_id,intent_id,amount_cents) values(b,v.invoice_id,v.id,v.amount_cents) on conflict(business_id,invoice_id) do nothing;
  select intent_id into credit_owner from private_t20.credits where business_id=b and invoice_id=v.invoice_id;
  if credit_owner<>v.id then next_status:='review_required';end if;
 end if;
 update private_t20.intents set transaction_id=tx,status=next_status,version=version+1 where id=v.id;
 return jsonb_build_object('changed',true,'status',next_status);
end;$$;

revoke all on all functions in schema private_t20 from public,anon,authenticated,service_role,t20_payment_verifier;
grant usage on schema private_t20 to authenticated,t20_payment_verifier;
grant execute on function private_t20.configure_account(uuid,text,boolean),private_t20.create_intent(uuid,uuid,uuid) to authenticated;
grant execute on function private_t20.publish_verified(uuid,text,uuid,text,text,integer,text) to t20_payment_verifier;
-- No key, login, membership, public schema RPC, checkout, invoice mutation or
-- payment-side effect outside these private observation/credit records.
commit;
