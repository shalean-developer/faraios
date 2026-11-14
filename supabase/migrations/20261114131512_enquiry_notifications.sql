begin;
-- Default-off dispatcher: no historical backfill or existing record changes.
create table enquiry_private.mail_settings(environment text primary key check(environment in ('preview','live')),enabled boolean not null default false);
insert into enquiry_private.mail_settings values('preview',false),('live',false);
create table enquiry_private.mail_outbox(
 id uuid primary key default gen_random_uuid(), enquiry_id uuid not null references public.business_enquiries(id) on delete restrict,
 business_id uuid not null references public.businesses(id) on delete restrict,environment text not null check(environment in ('preview','live')),
 kind text not null check(kind in ('admin','customer')),recipient text not null,reply_to text not null default '',payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','sending','accepted','failed')),
 attempts integer not null default 0,available_at timestamptz not null default now(),lease uuid,leased_until timestamptz,
 first_attempt_at timestamptz,provider_id text,last_error text not null default '',created_at timestamptz not null default now(),
 unique(enquiry_id,kind)
);
alter table enquiry_private.mail_settings enable row level security;
alter table enquiry_private.mail_outbox enable row level security;
revoke all on enquiry_private.mail_settings,enquiry_private.mail_outbox from public,anon,authenticated;
create index enquiry_mail_ready on enquiry_private.mail_outbox(environment,status,available_at);
create function enquiry_private.queue_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_email text; doc jsonb; data jsonb; reply text;
begin
 -- Internal/manual records do not send unsolicited confirmations. Future public submissions only.
 if new.page_slug='' or not exists(select 1 from enquiry_private.mail_settings where environment=new.environment and enabled) then return new;end if;
 select p.document into doc from public.business_public_pages p where p.business_id=new.business_id and p.environment=new.environment and p.slug=new.page_slug;
 if doc is null then return new;end if;
 select u.email into owner_email from public.businesses b join auth.users u on u.id=b.owner_id where b.id=new.business_id and u.email_confirmed_at is not null;
 data=jsonb_build_object('business',doc->>'name','slug',new.page_slug,'customer',new.customer_name,'service',coalesce(nullif(new.service_name,''),'General enquiry'),'requirements',new.requirements,'email',new.email,'phone',new.phone,'reference',upper(left(replace(new.id::text,'-',''),8)));
 -- Only the verified owner receives private customer details. Editable public email cannot redirect admin alerts.
 if owner_email is not null and owner_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and owner_email !~ '[[:cntrl:]]' then
  insert into enquiry_private.mail_outbox(enquiry_id,business_id,environment,kind,recipient,reply_to,payload) values(new.id,new.business_id,new.environment,'admin',owner_email,new.email,data);
 end if;
 if new.email<>'' then
  reply=case when coalesce(doc->>'email','') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and doc->>'email' !~ '[[:cntrl:]]' then doc->>'email' else '' end;
  -- Do not echo arbitrary free-text messages to an unverified address (mail-bomb/reflection abuse).
  insert into enquiry_private.mail_outbox(enquiry_id,business_id,environment,kind,recipient,reply_to,payload) values(new.id,new.business_id,new.environment,'customer',new.email,reply,data-array['customer','requirements','email','phone']);
 end if;
 return new;
end $$;
revoke all on function enquiry_private.queue_mail() from public,anon,authenticated;
create trigger enquiry_queue_mail after insert on public.business_enquiries for each row execute function enquiry_private.queue_mail();
create function public.business_enquiry_mail_claim(p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job enquiry_private.mail_outbox;
begin
 if not exists(select 1 from enquiry_private.mail_settings where environment=p_environment and enabled) then return '{}'::jsonb;end if;
 -- Never retry outside provider idempotency retention; unknown sends require review.
 update enquiry_private.mail_outbox set status='failed',last_error='Retry window expired' where environment=p_environment and status in ('pending','sending') and ((first_attempt_at is not null and first_attempt_at<now()-interval '20 hours') or created_at<now()-interval '24 hours' or (attempts>=5 and leased_until<now()));
 select * into job from enquiry_private.mail_outbox where environment=p_environment and attempts<5 and ((status='pending' and available_at<=now()) or (status='sending' and leased_until<now())) order by created_at,id for update skip locked limit 1;
 if not found then return '{}'::jsonb;end if;
 update enquiry_private.mail_outbox set status='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease=gen_random_uuid(),leased_until=now()+interval '2 minutes' where id=job.id returning * into job;
 return jsonb_build_object('id',job.id,'enquiry_id',job.enquiry_id,'kind',job.kind,'recipient',job.recipient,'reply_to',job.reply_to,'payload',job.payload,'lease',job.lease,'environment',job.environment);
end $$;
create function public.business_enquiry_mail_finish(p_id uuid,p_lease uuid,p_provider_id text,p_retry boolean,p_error text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if char_length(coalesce(p_provider_id,''))>200 or p_error not in ('','Temporary provider failure','Provider rejected message','Recipient blocked in preview','Invalid mail configuration') then raise exception 'Invalid mail outcome';end if;
 update enquiry_private.mail_outbox set status=case when coalesce(p_provider_id,'')<>'' then 'accepted' when p_retry and attempts<5 then 'pending' else 'failed' end,provider_id=nullif(p_provider_id,''),last_error=p_error,available_at=now()+make_interval(secs=>least(3600,60*(2^attempts)::integer)),lease=null,leased_until=null where id=p_id and lease=p_lease and status='sending';
 if not found then raise exception 'Mail lease changed';end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.business_enquiry_mail_claim(text),public.business_enquiry_mail_finish(uuid,uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.business_enquiry_mail_claim(text),public.business_enquiry_mail_finish(uuid,uuid,text,boolean,text) to service_role;
-- Only the owner can inspect outcomes; recipients, bodies and credentials are not returned.
create function public.business_enquiry_mail_status(p_business uuid,p_environment text,p_enquiry uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid()) or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'Enquiry unavailable';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'status',status,'attempts',attempts,'error',last_error)) from enquiry_private.mail_outbox where business_id=p_business and environment=p_environment and enquiry_id=p_enquiry),'[]'::jsonb);
end $$;
revoke all on function public.business_enquiry_mail_status(uuid,text,uuid) from public,anon;
grant execute on function public.business_enquiry_mail_status(uuid,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
