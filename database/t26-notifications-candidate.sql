-- T26 source candidate. External delivery is intentionally impossible.
begin;
create schema private_t26;
revoke all on schema private_t26 from public,anon,authenticated,service_role;
create table private_t26.settings(business_id uuid primary key references public.businesses(id), mode text not null check(mode in ('disabled','sink')));
create table private_t26.jobs(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 booking_id uuid not null,invoice_id uuid,kind text not null check(kind in ('confirmation','assignment','payment_received','pending_payment')),
 recipient_id uuid not null,booking_version integer not null,event_key text not null,
 state text not null default 'queued' check(state in ('queued','failed','suppressed','sink_delivered')),
 attempts integer not null default 0 check(attempts between 0 and 5),error_code text not null default '',
 available_at timestamptz not null default clock_timestamp(),created_at timestamptz not null default clock_timestamp(),
 unique(business_id,event_key),foreign key(business_id,booking_id) references public.one_off_bookings(business_id,id),
 foreign key(business_id,invoice_id) references public.business_invoices(business_id,id)
);
create index t26_jobs_queue on private_t26.jobs(business_id,created_at,id);
create table private_t26.sink(
 job_id uuid primary key references private_t26.jobs(id),business_id uuid not null references public.businesses(id),
 recipient_id uuid not null,message jsonb not null,created_at timestamptz not null default clock_timestamp()
);
create table private_t26.events(
 id bigint generated always as identity primary key,business_id uuid not null references public.businesses(id),actor uuid not null,
 request_id uuid not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),unique(business_id,request_id)
);
alter table private_t26.settings enable row level security;
alter table private_t26.jobs enable row level security;
alter table private_t26.sink enable row level security;
alter table private_t26.events enable row level security;
revoke all on all tables in schema private_t26 from public,anon,authenticated,service_role;

create function private_t26.capture_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare worker uuid;
begin
 if new.status='confirmed' and (tg_op='INSERT' or old.status is distinct from new.status or old.local_start is distinct from new.local_start) then
  insert into private_t26.jobs(business_id,booking_id,kind,recipient_id,booking_version,event_key)
  values(new.business_id,new.id,'confirmation',new.customer_id,new.version,'confirmation:'||new.id||':'||new.version) on conflict do nothing;
 end if;
 if new.status='assigned' and (tg_op='INSERT' or old.status is distinct from new.status or old.assigned_staff is distinct from new.assigned_staff or old.local_start is distinct from new.local_start) then
  foreach worker in array new.assigned_staff loop
   insert into private_t26.jobs(business_id,booking_id,kind,recipient_id,booking_version,event_key)
   values(new.business_id,new.id,'assignment',worker,new.version,'assignment:'||new.id||':'||new.version||':'||worker) on conflict do nothing;
  end loop;
 end if;
 return new;
end;$$;
create trigger t26_booking_event after insert or update on public.one_off_bookings for each row execute function private_t26.capture_booking();

create function private_t26.capture_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare i public.business_invoices;j public.one_off_bookings;event text;
begin
 select * into i from public.business_invoices where business_id=new.business_id and id=new.invoice_id;
 select * into j from public.one_off_bookings where business_id=i.business_id and id=i.booking_id;
 event:=tg_table_schema||':'||case when tg_table_schema='private_t20' then to_jsonb(new)->>'intent_id' else to_jsonb(new)->>'receipt_id' end;
 insert into private_t26.jobs(business_id,booking_id,invoice_id,kind,recipient_id,booking_version,event_key)
 values(i.business_id,j.id,i.id,'payment_received',j.customer_id,j.version,'payment:'||event) on conflict do nothing;
 return new;
end;$$;
create trigger t26_online_payment after insert on private_t20.credits for each row execute function private_t26.capture_payment();
create trigger t26_eft_payment after insert on private_t21.allocations for each row execute function private_t26.capture_payment();

-- Locking without a row change is insufficient at REPEATABLE READ. Both credit
-- sources and dispatch advance the shared invoice fence to reject stale snapshots.
create function private_t26.payment_fence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.business_invoices where business_id=new.business_id and id=new.invoice_id for update;
 insert into private_t21.invoice_fences(business_id,invoice_id) values(new.business_id,new.invoice_id)
 on conflict(business_id,invoice_id) do update set revision=private_t21.invoice_fences.revision+1;
 return new;
end;$$;
create trigger t26_credit_fence before insert on private_t20.credits for each row execute function private_t26.payment_fence();
create trigger t26_allocation_fence before insert on private_t21.allocations for each row execute function private_t26.payment_fence();

create function private_t26.office(business uuid,action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();j public.one_off_bookings;i public.business_invoices;q private_t26.jobs;prior private_t26.events;
 req uuid;result jsonb;paid bigint;mode text;message jsonb;business_name text;keys text[];reason text:='';
begin
 if not private_t20.live_session() or not exists(select 1 from auth.users where id=uid and not coalesce(is_anonymous,false)) or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>4096 then raise exception 'notification_denied' using errcode='42501';end if;
 perform 1 from public.businesses b join public.business_memberships m on m.business_id=b.id where b.id=business and b.status='active' and m.user_id=uid and m.status='active' and m.role in ('owner','manager') for share of b,m;
 if not found then raise exception 'notification_denied' using errcode='42501';end if;
 select array_agg(k order by k) into keys from jsonb_object_keys(payload) k;
 if action='list' then
  if keys is not null and keys<>array['page'] then raise exception 'notification_invalid';end if;
  if coalesce((payload->>'page')::integer,0) not between 0 and 1000000 then raise exception 'notification_invalid';end if;
  select jsonb_build_object('mode',coalesce((select s.mode from private_t26.settings s where s.business_id=business),'disabled'),'rows',coalesce(jsonb_agg(x.data order by x.created_at desc,x.id),'[]'::jsonb)) into result from (
   select v.id,v.created_at,jsonb_build_object('id',v.id,'bookingId',v.booking_id,'kind',v.kind,'state',v.state,'attempts',v.attempts,'error',v.error_code,'availableAt',v.available_at,'createdAt',v.created_at,'message',s.message) data
   from private_t26.jobs v left join private_t26.sink s on s.job_id=v.id where v.business_id=business order by v.created_at desc,v.id limit 51 offset coalesce((payload->>'page')::integer,0)*50
  ) x;return result;
 end if;
 if action is null or action not in ('mode','reminder','deliver') or not (
  action='mode' and keys=array['mode','requestId'] or action='reminder' and keys=array['invoiceId','requestId'] or action='deliver' and keys=array['jobId','requestId']) then raise exception 'notification_invalid';end if;
 req:=(payload->>'requestId')::uuid;if req is null then raise exception 'notification_invalid';end if;
 -- Durable same-request receipt also covers a response lost after successful commit.
 perform pg_advisory_xact_lock(hashtextextended('t26:'||business::text||req::text,0));
 select * into prior from private_t26.events e where e.business_id=business and e.request_id=req;
 if found then
  if prior.actor<>uid or prior.payload<>jsonb_build_object('action',action,'input',payload) then raise exception 'notification_request_reused' using errcode='23505';end if;
  return prior.result;
 end if;
 if action='mode' then
  if payload->>'mode' is null or payload->>'mode' not in ('disabled','sink') or not exists(select 1 from public.business_memberships m where m.business_id=business and m.user_id=uid and m.status='active' and m.role='owner') then raise exception 'notification_mode_denied' using errcode='42501';end if;
  insert into private_t26.settings values(business,payload->>'mode') on conflict(business_id) do update set mode=excluded.mode;
  result:=jsonb_build_object('mode',payload->>'mode');
 elsif action='reminder' then
  select * into i from public.business_invoices where business_id=business and id=(payload->>'invoiceId')::uuid;
  if not found then raise exception 'notification_denied' using errcode='42501';end if;
  select * into j from public.one_off_bookings where business_id=business and id=i.booking_id for share;
  -- One reminder per invoice; replay/new request keys cannot manufacture duplicates.
  insert into private_t26.jobs(business_id,booking_id,invoice_id,kind,recipient_id,booking_version,event_key)
  values(business,j.id,i.id,'pending_payment',j.customer_id,j.version,'reminder:'||i.id) on conflict do nothing;
  select jsonb_build_object('id',v.id,'state',v.state) into result from private_t26.jobs v where v.business_id=business and v.event_key='reminder:'||i.id;
 else
  select * into q from private_t26.jobs v where v.business_id=business and v.id=(payload->>'jobId')::uuid for update;
  if not found then raise exception 'notification_denied' using errcode='42501';end if;
  select s.mode into mode from private_t26.settings s where s.business_id=business for share;
  if coalesce(mode,'disabled')<>'sink' then return jsonb_build_object('id',q.id,'state',q.state,'dispatch','disabled');end if;
  if q.state in ('sink_delivered','suppressed') or q.attempts>=5 or q.available_at>clock_timestamp() then return jsonb_build_object('id',q.id,'state',q.state,'attempts',q.attempts);end if;
  -- Serialize against booking changes and both accepted payment writers. Holding
  -- these locks through the sink INSERT makes the eligibility decision atomic.
  select * into j from public.one_off_bookings where business_id=business and id=q.booking_id for share;
  if not found or j.status in ('draft','cancelled') then reason:='booking_ineligible';end if;
  if q.kind in ('confirmation','assignment','pending_payment') and j.version<>q.booking_version then reason:='booking_changed';end if;
  if q.kind='assignment' then
   perform 1 from public.business_memberships m where m.business_id=business and m.user_id=q.recipient_id and m.status='active' and m.role='staff' for share;
   if not found or not q.recipient_id=any(j.assigned_staff) or j.status<>'assigned' then reason:='assignment_changed';end if;
  else
   perform 1 from public.business_customers c where c.business_id=business and c.id=j.customer_id and c.id=q.recipient_id and c.is_active for share;
   if not found then reason:='recipient_changed';end if;
  end if;
  if q.invoice_id is not null then
   select * into i from public.business_invoices where business_id=business and id=q.invoice_id for update;
   if not found or i.booking_id<>j.id or i.customer_id<>j.customer_id then reason:='invoice_changed';end if;
   insert into private_t21.invoice_fences(business_id,invoice_id) values(business,i.id)
   on conflict(business_id,invoice_id) do update set revision=private_t21.invoice_fences.revision+1;
   select coalesce(sum(r.amount_cents),0) into paid from private_t21.allocations a join private_t21.receipts r on r.id=a.receipt_id where a.business_id=business and a.invoice_id=i.id and r.verified_at is not null;
   paid:=paid+coalesce((select c.amount_cents from private_t20.credits c where c.business_id=business and c.invoice_id=i.id),0);
   if q.kind='pending_payment' and (i.total_cents<=0 or paid>=i.total_cents or paid<0) then reason:='no_pending_balance';end if;
   if q.kind='payment_received' and (paid<=0 or paid>i.total_cents) then reason:='payment_needs_review';end if;
  end if;
  if reason<>'' then
   update private_t26.jobs set state='suppressed',error_code=reason where id=q.id;
   result:=jsonb_build_object('id',q.id,'state','suppressed','reason',reason);
  else
   select s.display_name into business_name from public.business_settings s where s.business_id=business for share;
   if business_name is null then raise exception 'notification_business_unavailable';end if;
   message:=jsonb_build_object('businessId',business,'businessName',business_name,'bookingId',j.id,'recipientId',q.recipient_id,'recipientType',case when q.kind='assignment' then 'staff' else 'customer' end,
    'kind',q.kind,'localStart',j.local_start,'timeZone',j.time_zone,'bookingStatus',j.status,'verifiedCents',paid,'balanceCents',case when i.id is not null then i.total_cents-paid end,
    'text',case q.kind when 'confirmation' then 'Your booking is confirmed.' when 'assignment' then 'You are assigned to this booking.' when 'payment_received' then 'A verified payment has been recorded.' else 'Your invoice has an outstanding balance.' end);
   begin
    insert into private_t26.sink(job_id,business_id,recipient_id,message) values(q.id,business,q.recipient_id,message);
    update private_t26.jobs set state='sink_delivered',attempts=attempts+1,error_code='' where id=q.id;
    result:=jsonb_build_object('id',q.id,'state','sink_delivered');
   exception when others then
    -- The sink insert rolls back with this subtransaction. No unknown external
    -- outcome exists: there is no external adapter or network call in this path.
    update private_t26.jobs set state='failed',attempts=attempts+1,error_code='sink_failure',available_at=clock_timestamp()+interval '1 minute' where id=q.id;
    result:=jsonb_build_object('id',q.id,'state','failed');
   end;
  end if;
 end if;
 insert into private_t26.events(business_id,actor,request_id,payload,result) values(business,uid,req,jsonb_build_object('action',action,'input',payload),result);
 return result;
end;$$;
revoke all on all functions in schema private_t26 from public,anon,authenticated,service_role;
grant usage on schema private_t26 to authenticated;
grant execute on function private_t26.office(uuid,text,jsonb) to authenticated;
create function public.t26_notifications(business uuid,action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private_t26.office(business,action,payload);$$;
revoke all on function public.t26_notifications(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.t26_notifications(uuid,text,jsonb) to authenticated;
commit;
