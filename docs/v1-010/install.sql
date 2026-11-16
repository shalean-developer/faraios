begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
-- Additive only. No historical backfill, scheduling/financial writer replacement,
-- global gate change, recipient grant or worker activation.
create table authorization_private.communication_scopes(
 business_id uuid references public.businesses(id), environment text check(environment in ('preview','live')),
 capture boolean not null default false, outbound boolean not null default false,
 recipients text[] not null default '{}', primary key(business_id,environment)
);
create table authorization_private.communication_outbox(
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 environment text not null check(environment in ('preview','live')), entity text not null,
 entity_id uuid not null, version integer not null, event text not null, recipient text not null,
 owner_id uuid not null, payload jsonb not null,
 status text not null default 'review' check(status in ('review','queued','sending','accepted','failed','blocked')),
 attempts integer not null default 0, first_attempt_at timestamptz, available_at timestamptz not null default now(),
 lease uuid, leased_until timestamptz, provider_id text unique, error text not null default '',
 delivery text not null default 'unknown' check(delivery in ('unknown','delivered','failed')),
 created_at timestamptz not null default now(), approved_by uuid, approved_at timestamptz,
 unique(business_id,environment,entity,entity_id,version,event,recipient)
);
create table authorization_private.communication_attempts(
 job_id uuid references authorization_private.communication_outbox(id), attempt integer,
 lease uuid not null, started_at timestamptz not null default now(), finished_at timestamptz,
 outcome text not null default 'unknown', primary key(job_id,attempt)
);
create table authorization_private.communication_delivery(
 event_id text primary key, provider_id text not null, event text not null, created_at timestamptz not null default now()
);
alter table authorization_private.communication_scopes enable row level security;
alter table authorization_private.communication_outbox enable row level security;
alter table authorization_private.communication_attempts enable row level security;
alter table authorization_private.communication_delivery enable row level security;
revoke all on authorization_private.communication_scopes,authorization_private.communication_outbox,authorization_private.communication_attempts,authorization_private.communication_delivery from public,anon,authenticated,service_role;
create index communication_ready on authorization_private.communication_outbox(environment,status,available_at);

create function authorization_private.communication_capture() returns trigger language plpgsql security definer set search_path='' as $$
<<capture_event>>
declare e text; d jsonb; prev jsonb; recipient text; owner_id uuid; business text; payload jsonb; link text='';
begin
 if not exists(select 1 from authorization_private.communication_scopes s where s.business_id=new.business_id and s.environment=new.environment and s.capture) then return new; end if;
 select b.owner_id,b.name into owner_id,business from public.businesses b where b.id=new.business_id;
 d=to_jsonb(new); if tg_op='UPDATE' then prev=to_jsonb(old);end if;
 if tg_table_name='business_booking_requests' then
  -- The existing enquiry outbox owns receipt acknowledgements. Do not duplicate it.
  if tg_op='INSERT' or d->>'status'=prev->>'status' or new.status='Booked' then return new;end if;
  e='request.'||lower(new.status);
  select jsonb_build_object('email',q.email) into d from public.business_enquiries q where q.id=new.id and q.business_id=new.business_id and q.environment=new.environment;
 elsif tg_table_name='business_quotes' then
  if new.status='Draft' or (tg_op='UPDATE' and new.status=old.status) then return new;end if;
  e='quote.'||lower(new.status); d=new.document;
  link='/quote/index.php?token='||new.share_token;
 elsif tg_table_name='business_bookings' then
  if tg_op='INSERT' then e='booking.confirmation';
  elsif new.status is distinct from old.status then e='booking.'||lower(replace(new.status,' ','_'));
  elsif (new.starts_at,new.time_zone,new.duration_minutes,new.address,new.document) is distinct from (old.starts_at,old.time_zone,old.duration_minutes,old.address,old.document) then e='booking.changed';
  else return new;end if;
  d=new.document;
 elsif tg_table_name='business_invoices' then
  if new.state='Draft' or (tg_op='UPDATE' and new.state=old.state) then return new;end if;
  e='invoice.'||lower(new.state);d=new.document;
  link='/invoice/index.php?token='||new.share_token;
 end if;
 recipient=lower(btrim(coalesce(d->>'email','')));
 if e in ('quote.accepted','quote.declined') then
  select lower(u.email) into recipient from auth.users u where u.id=owner_id and u.email_confirmed_at is not null;
 end if;
 payload=jsonb_build_object('business',business,'event',e,'reference',upper(left(replace(new.id::text,'-',''),8)),
  'status',coalesce(to_jsonb(new)->>'status',to_jsonb(new)->>'state'),'link',link);
 if tg_table_name='business_bookings' then
  payload=payload||jsonb_build_object('local',to_char(new.starts_at at time zone new.time_zone,'DD Mon YYYY HH24:MI'),'zone',new.time_zone,'duration',new.duration_minutes,'address',new.address);
  if tg_op='UPDATE' then payload=payload||jsonb_build_object('previous_local',to_char(old.starts_at at time zone old.time_zone,'DD Mon YYYY HH24:MI'),'previous_zone',old.time_zone,'previous_duration',old.duration_minutes,'previous_address',old.address,'previous_status',old.status);end if;
 end if;
 if tg_table_name='business_invoices' then payload=payload||jsonb_build_object('number',new.number,'due_on',new.due_on,'currency',new.document->>'currency','total_minor',invoice_private.total(new.document));end if;
 if tg_table_name='business_quotes' then payload=payload||jsonb_build_object('expires_on',new.expires_on,'currency',new.document->>'currency','total_minor',invoice_private.total(new.document));end if;
 insert into authorization_private.communication_outbox(business_id,environment,entity,entity_id,version,event,recipient,owner_id,payload,status,error)
 values(new.business_id,new.environment,tg_table_name,new.id,new.version,e,coalesce(recipient,''),owner_id,payload,
 case when recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and recipient !~ '[[:cntrl:]]' then 'review' else 'blocked' end,
 case when recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and recipient !~ '[[:cntrl:]]' then '' else 'No valid email. Contact the intended recipient manually; no message sent.' end)
 on conflict do nothing;
 if exists(select 1 from authorization_private.communication_outbox o where o.business_id=new.business_id and o.environment=new.environment and o.entity=tg_table_name and o.entity_id=new.id and o.version=new.version and o.event=e and o.recipient=coalesce(capture_event.recipient,'') and o.payload is distinct from capture_event.payload) then raise exception 'Communication event payload conflict';end if;
 return new;
end $$;
revoke all on function authorization_private.communication_capture() from public,anon,authenticated,service_role;
create trigger communication_request after insert or update on public.business_booking_requests for each row execute function authorization_private.communication_capture();
create trigger communication_quote after insert or update on public.business_quotes for each row execute function authorization_private.communication_capture();
create trigger communication_booking after insert or update on public.business_bookings for each row execute function authorization_private.communication_capture();
create trigger communication_invoice after insert or update on public.business_invoices for each row execute function authorization_private.communication_capture();

create function authorization_private.communication_owner(p_business uuid,p_environment text) returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid=auth.uid();
begin
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,true) or not exists(select 1 from public.businesses b where b.id=p_business and b.owner_id=actor)
 or authorization_private.member_role(p_business,p_environment) is distinct from 'owner' or p_environment not in ('preview','live') or not exists(select 1 from authorization_private.communication_scopes s where s.business_id=p_business and s.environment=p_environment and s.capture)
 then raise exception 'Communications unavailable';end if;return actor;
end $$;
revoke all on function authorization_private.communication_owner(uuid,text) from public,anon,authenticated,service_role;
create function authorization_private.communication_current(j authorization_private.communication_outbox) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if j.entity='business_booking_requests' then return exists(select 1 from public.business_booking_requests r where r.id=j.entity_id and r.business_id=j.business_id and r.environment=j.environment and lower(r.status)=split_part(j.event,'.',2));
 elsif j.entity='business_quotes' then return exists(select 1 from public.business_quotes r where r.id=j.entity_id and r.business_id=j.business_id and r.environment=j.environment and r.version=j.version);
 elsif j.entity='business_bookings' then return exists(select 1 from public.business_bookings r where r.id=j.entity_id and r.business_id=j.business_id and r.environment=j.environment and r.version=j.version);
 elsif j.entity='business_invoices' then return exists(select 1 from public.business_invoices r where r.id=j.entity_id and r.business_id=j.business_id and r.environment=j.environment and lower(r.state)=split_part(j.event,'.',2));
 end if;return false;
end $$;
revoke all on function authorization_private.communication_current(authorization_private.communication_outbox) from public,anon,authenticated,service_role;
create function public.business_communication_list(p_business uuid,p_environment text,p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform authorization_private.communication_owner(p_business,p_environment);
 if p_offset<0 or p_offset>100000 then raise exception 'Invalid page';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from(select id,entity_id,event,version,recipient,payload,status,attempts,delivery,error,created_at from authorization_private.communication_outbox where business_id=p_business and environment=p_environment order by created_at desc,id desc limit 21 offset p_offset)r),'[]');
end $$;
create function public.business_communication_approve(p_business uuid,p_environment text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; j authorization_private.communication_outbox;
begin
 actor=authorization_private.communication_owner(p_business,p_environment);
 select * into j from authorization_private.communication_outbox where id=p_id and business_id=p_business and environment=p_environment for update;
 if not found then raise exception 'Message unavailable';end if;
 if not authorization_private.communication_current(j) then raise exception 'Message superseded. Review the current record; do not send old details.';end if;
 if j.owner_id<>actor then raise exception 'Message owner changed; review required';end if;
 if j.status in ('queued','sending','accepted') then return jsonb_build_object('id',j.id,'status',j.status);end if;
 if j.status<>'review' and not(j.status='failed' and j.error='Temporary provider failure' and j.attempts<5 and j.first_attempt_at>now()-interval '20 hours') then raise exception 'Message cannot be retried safely. Check delivery with support; do not resend.';end if;
 if not exists(select 1 from authorization_private.communication_scopes s where s.business_id=p_business and s.environment=p_environment and s.capture and s.outbound and j.recipient=any(s.recipients)) then raise exception 'Sending disabled or recipient not approved';end if;
 update authorization_private.communication_outbox set status='queued',approved_by=actor,approved_at=now(),available_at=now() where id=j.id;
 return jsonb_build_object('id',j.id,'status','queued');
end $$;

create function public.business_communication_claim(p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j authorization_private.communication_outbox;
begin
 -- Recheck scope, recipient and current owner immediately before every attempt.
 update authorization_private.communication_outbox o set status='blocked',error='Sending approval revoked' where o.environment=p_environment and o.status in ('queued','sending') and (not authorization_private.communication_current(o) or not exists(
 select 1 from authorization_private.communication_scopes s join public.businesses b on b.id=s.business_id where s.business_id=o.business_id and s.environment=o.environment and s.capture and s.outbound and o.recipient=any(s.recipients) and b.owner_id=o.approved_by and o.owner_id=b.owner_id));
 update authorization_private.communication_outbox set status='failed',error='Retry window expired; check delivery before any recovery' where environment=p_environment and status in ('queued','sending') and (created_at<now()-interval '24 hours' or first_attempt_at<now()-interval '20 hours' or (attempts>=5 and leased_until<now()));
 select * into j from authorization_private.communication_outbox where environment=p_environment and attempts<5 and ((status='queued' and available_at<=now()) or(status='sending' and leased_until<now())) order by created_at,id for update skip locked limit 1;
 if not found then return '{}';end if;
 update authorization_private.communication_outbox set status='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease=gen_random_uuid(),leased_until=now()+interval '2 minutes' where id=j.id returning * into j;
 insert into authorization_private.communication_attempts(job_id,attempt,lease) values(j.id,j.attempts,j.lease);
 return jsonb_build_object('id',j.id,'environment',j.environment,'recipient',j.recipient,'payload',j.payload,'lease',j.lease);
end $$;
create function public.business_communication_finish(p_id uuid,p_lease uuid,p_provider_id text,p_retry boolean,p_error text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j authorization_private.communication_outbox;
begin
 if length(coalesce(p_provider_id,''))>200 or p_error not in ('','Temporary provider failure','Provider rejected message','Recipient blocked','Invalid message') then raise exception 'Invalid mail outcome';end if;
 select * into j from authorization_private.communication_outbox where id=p_id and lease=p_lease and status in ('sending','blocked') for update;
 if not found then raise exception 'Mail lease changed';end if;
 update authorization_private.communication_attempts set finished_at=now(),outcome=case when coalesce(p_provider_id,'')<>'' then 'accepted' else p_error end where job_id=j.id and lease=p_lease;
 update authorization_private.communication_outbox set status=case when coalesce(p_provider_id,'')<>'' then 'accepted' when p_retry and attempts<5 then 'queued' else 'failed' end,
 provider_id=nullif(p_provider_id,''),error=p_error,available_at=now()+make_interval(secs=>least(3600,60*(2^attempts)::integer)),lease=null,leased_until=null where id=j.id;
 -- A signed webhook may precede this finish acknowledgement.
 update authorization_private.communication_outbox o set delivery=case when exists(select 1 from authorization_private.communication_delivery d where d.provider_id=o.provider_id and d.event<>'email.delivered') then 'failed' when exists(select 1 from authorization_private.communication_delivery d where d.provider_id=o.provider_id) then 'delivered' else 'unknown' end where o.id=j.id;
 return '{}';
end $$;
create function public.business_communication_delivery(p_event_id text,p_provider_id text,p_event text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if length(p_event_id) not between 1 and 200 or length(p_provider_id) not between 1 and 200 or p_event not in ('email.delivered','email.bounced','email.complained','email.failed','email.suppressed') then raise exception 'Invalid delivery event';end if;
 insert into authorization_private.communication_delivery(event_id,provider_id,event) values(p_event_id,p_provider_id,p_event) on conflict do nothing;
 if exists(select 1 from authorization_private.communication_delivery where event_id=p_event_id and (provider_id<>p_provider_id or event<>p_event)) then raise exception 'Delivery event conflict';end if;
 update authorization_private.communication_outbox o set delivery=case when exists(select 1 from authorization_private.communication_delivery d where d.provider_id=o.provider_id and d.event<>'email.delivered') then 'failed' else 'delivered' end where provider_id=p_provider_id;
 return '{}';
end $$;
revoke all on function public.business_communication_list(uuid,text,integer),public.business_communication_approve(uuid,text,uuid),public.business_communication_claim(text),public.business_communication_finish(uuid,uuid,text,boolean,text),public.business_communication_delivery(text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.business_communication_list(uuid,text,integer),public.business_communication_approve(uuid,text,uuid) to authenticated;
grant execute on function public.business_communication_claim(text),public.business_communication_finish(uuid,uuid,text,boolean,text),public.business_communication_delivery(text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
