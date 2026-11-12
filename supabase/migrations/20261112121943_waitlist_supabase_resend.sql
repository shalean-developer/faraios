-- FaraiOS New: waitlist only. No application auth, historic imports or public table access.
create schema if not exists waitlist_private;
revoke all on schema waitlist_private from public, anon, authenticated;
grant usage on schema waitlist_private to service_role;

create table public.waitlist_subscribers (
 id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(btrim(email)) and length(email)<=254),
 name text not null check(length(name) between 2 and 120),
 business_type text not null check(business_type in ('cleaning','beauty-wellness','home-maintenance-trades','other','starting-business')),
 interests text[] not null check(cardinality(interests) between 1 and 6 and interests <@ array['business-management','website-builder','website-creation','hosting','seo','marketing']::text[]),
 status text not null default 'pending' check(status in ('pending','confirmed','withdrawn','suppressed')),
 consent_version text not null, consent_text text not null,
 created_at timestamptz not null default now(), confirmed_at timestamptz, withdrawn_at timestamptz,
 last_request_at timestamptz not null default now(), confirm_hash text unique, confirm_expires timestamptz, withdraw_hash text unique
);
alter table public.waitlist_subscribers enable row level security;
revoke all on public.waitlist_subscribers from public, anon, authenticated;
grant select,insert,update,delete on public.waitlist_subscribers to service_role;

create table waitlist_private.outbox (
 id uuid primary key default gen_random_uuid(), subscriber_id uuid not null references public.waitlist_subscribers on delete cascade,
 kind text not null check(kind in ('confirmation','owner')), payload jsonb,
 status text not null default 'pending' check(status in ('pending','sending','retry','sent','failed','cancelled')),
 attempts integer not null default 0, created_at timestamptz not null default now(),
 next_attempt timestamptz not null default now(), lease uuid, provider_id text unique,
 sent_at timestamptz, delivery_status text, last_error text
);
create index waitlist_outbox_subscriber on waitlist_private.outbox(subscriber_id);
create index waitlist_outbox_due on waitlist_private.outbox(next_attempt) where status in ('pending','sending','retry');
create index waitlist_subscribers_retention on public.waitlist_subscribers(status,last_request_at);
create table waitlist_private.rate_limits(bucket text primary key,hits integer not null,expires timestamptz not null);
create table waitlist_private.delivery_events(event_id text primary key,provider_id text not null,event_type text not null,received_at timestamptz not null default now());
alter table waitlist_private.outbox enable row level security;
alter table waitlist_private.rate_limits enable row level security;
alter table waitlist_private.delivery_events enable row level security;
revoke all on all tables in schema waitlist_private from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema waitlist_private to service_role;

create function public.waitlist_rate(p_bucket text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_limit<1 or p_limit>1000 or p_seconds<1 or p_seconds>86400 or length(p_bucket)<>64 then raise exception 'invalid rate'; end if;
 insert into waitlist_private.rate_limits as r(bucket,hits,expires) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=r.hits+1 returning hits into n;
 return n<=p_limit;
end $$;

create function public.waitlist_signup(p_name text,p_email text,p_business_type text,p_interests text[],p_consent_version text,p_consent_text text,p_confirm text,p_withdraw text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.waitlist_subscribers; job uuid;
begin
 if p_email is null or p_confirm !~ '^[a-f0-9]{64}$' or p_withdraw !~ '^[a-f0-9]{64}$' or p_confirm is null or p_withdraw is null then raise exception 'invalid request'; end if;
 -- Serializes concurrent requests for the same normalized email before first insert.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(btrim(p_email)),0));
 select * into s from public.waitlist_subscribers where email=lower(btrim(p_email)) for update;
 if found then
  if s.status<>'pending' or s.last_request_at>now()-interval '1 hour' then return null; end if;
  update public.waitlist_subscribers set confirm_hash=encode(extensions.digest(p_confirm,'sha256'),'hex'),confirm_expires=now()+interval '24 hours',withdraw_hash=encode(extensions.digest(p_withdraw,'sha256'),'hex'),last_request_at=now() where id=s.id returning * into s;
  update waitlist_private.outbox set status='cancelled',payload=null where subscriber_id=s.id and status in ('pending','retry');
 else
  insert into public.waitlist_subscribers(email,name,business_type,interests,consent_version,consent_text,confirm_hash,confirm_expires,withdraw_hash)
  values(lower(btrim(p_email)),btrim(p_name),p_business_type,p_interests,p_consent_version,p_consent_text,encode(extensions.digest(p_confirm,'sha256'),'hex'),now()+interval '24 hours',encode(extensions.digest(p_withdraw,'sha256'),'hex')) returning * into s;
 end if;
 insert into waitlist_private.outbox(subscriber_id,kind,payload) values(s.id,'confirmation',jsonb_build_object('to',s.email,'confirm',p_confirm,'withdraw',p_withdraw)) returning id into job;
 return job;
end $$;

create function public.waitlist_transition(p_action text,p_token text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare s public.waitlist_subscribers;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
 if p_action='confirm' then
  update public.waitlist_subscribers set status='confirmed',confirmed_at=now(),confirm_hash=null,confirm_expires=null
  where confirm_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='pending' and confirm_expires>=now() returning * into s;
  if not found then return false; end if;
  insert into waitlist_private.outbox(subscriber_id,kind,payload) values(s.id,'owner',jsonb_build_object('name',s.name,'email',s.email,'business_type',s.business_type,'interests',s.interests,'confirmed_at',s.confirmed_at));
 elsif p_action='unsubscribe' then
  update public.waitlist_subscribers set status='withdrawn',withdrawn_at=now(),confirm_hash=null,confirm_expires=null,withdraw_hash=null
  where withdraw_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status in ('pending','confirmed') returning * into s;
  if not found then return false; end if;
 else return false;
 end if;
 update waitlist_private.outbox set status='cancelled',payload=null where subscriber_id=s.id and status in ('pending','retry') and (kind='confirmation' or s.status='withdrawn');
 return true;
end $$;

create function public.waitlist_claim(p_only uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j waitlist_private.outbox; token uuid;
begin
 -- Resend idempotency lasts 24 hours; never retry beyond that safe window.
 update waitlist_private.outbox set status='failed',payload=null,last_error='Retry window expired; review required' where status in ('pending','retry','sending') and created_at<now()-interval '23 hours';
 for j in select o.* from waitlist_private.outbox o join public.waitlist_subscribers s on s.id=o.subscriber_id
 where (o.status in ('pending','retry') or (o.status='sending' and o.next_attempt<now())) and o.next_attempt<=now() and o.attempts<4
 and (p_only is null or o.id=p_only) and ((o.kind='confirmation' and s.status='pending' and s.confirm_expires>now()) or (o.kind='owner' and s.status='confirmed'))
 order by o.created_at for update of o skip locked limit 1 loop
  token:=gen_random_uuid();
  update waitlist_private.outbox set status='sending',attempts=attempts+1,next_attempt=now()+interval '2 minutes',lease=token where id=j.id;
  return jsonb_build_object('id',j.id,'kind',j.kind,'payload',j.payload,'lease',token);
 end loop;
 return null;
end $$;

create function public.waitlist_ack(p_id uuid,p_lease uuid,p_outcome text,p_provider_id text default null)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_outcome not in ('sent','retry','failed') then raise exception 'invalid outcome'; end if;
 update waitlist_private.outbox set
 status=case when p_outcome='retry' and attempts>=4 then 'failed' else p_outcome end,
 payload=case when p_outcome in ('sent','failed') or attempts>=4 then null else payload end,
 delivery_status=coalesce((select e.event_type from waitlist_private.delivery_events e where e.provider_id=p_provider_id order by e.received_at desc limit 1),delivery_status),
 provider_id=coalesce(p_provider_id,provider_id),sent_at=case when p_outcome='sent' then now() else sent_at end,
 next_attempt=now()+make_interval(secs=>least(3600,60*(2^attempts)::integer)),
 last_error=case when p_outcome='sent' then null else 'Email provider handoff failed' end,lease=null
 where id=p_id and lease=p_lease and status='sending';
 if not found then return false; end if;
 update public.waitlist_subscribers set status='suppressed',confirm_hash=null,confirm_expires=null where status<>'withdrawn' and id in (select o.subscriber_id from waitlist_private.outbox o where o.id=p_id and o.kind='confirmation' and exists(select 1 from waitlist_private.delivery_events e where e.provider_id=p_provider_id and e.event_type in ('email.bounced','email.complained','email.suppressed')));
 return true;
end $$;

create function public.waitlist_delivery(p_event_id text,p_provider_id text,p_event_type text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_event_type not in ('email.delivered','email.bounced','email.complained','email.failed','email.suppressed') or length(p_event_id)>200 or length(p_provider_id)>100 then return false; end if;
 insert into waitlist_private.delivery_events(event_id,provider_id,event_type) values(p_event_id,p_provider_id,p_event_type) on conflict do nothing;
 if not found then return true; end if;
 update waitlist_private.outbox set delivery_status=p_event_type where provider_id=p_provider_id;
 if p_event_type in ('email.bounced','email.complained','email.suppressed') then
  update public.waitlist_subscribers set status='suppressed',confirm_hash=null,confirm_expires=null where status<>'withdrawn' and id in (select subscriber_id from waitlist_private.outbox where provider_id=p_provider_id and kind='confirmation');
 end if;
 return true;
end $$;

create function public.waitlist_cleanup()
returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from waitlist_private.rate_limits where expires<now();
 delete from public.waitlist_subscribers where (status='pending' and last_request_at<now()-interval '7 days') or (status in ('withdrawn','suppressed') and coalesce(withdrawn_at,last_request_at)<now()-interval '30 days') or (status='confirmed' and confirmed_at<now()-interval '12 months');
 delete from waitlist_private.outbox where created_at<now()-interval '30 days' and status in ('sent','failed','cancelled');
 delete from waitlist_private.delivery_events where received_at<now()-interval '30 days';
end $$;

create function public.waitlist_status()
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('subscribers',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.waitlist_subscribers group by status) s),'mail',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from waitlist_private.outbox group by status) o));
$$;

create function public.waitlist_export(p_after uuid default null)
returns setof public.waitlist_subscribers language sql security invoker set search_path='' as $$
 select * from public.waitlist_subscribers where p_after is null or id>p_after order by id limit 500;
$$;

-- Postgres/Supabase default function grants are explicitly removed.
revoke all on function public.waitlist_rate(text,integer,integer),public.waitlist_signup(text,text,text,text[],text,text,text,text),public.waitlist_transition(text,text),public.waitlist_claim(uuid),public.waitlist_ack(uuid,uuid,text,text),public.waitlist_delivery(text,text,text),public.waitlist_cleanup(),public.waitlist_status(),public.waitlist_export(uuid) from public,anon,authenticated;
grant execute on function public.waitlist_rate(text,integer,integer),public.waitlist_signup(text,text,text,text[],text,text,text,text),public.waitlist_transition(text,text),public.waitlist_claim(uuid),public.waitlist_ack(uuid,uuid,text,text),public.waitlist_delivery(text,text,text),public.waitlist_cleanup(),public.waitlist_status(),public.waitlist_export(uuid) to service_role;
