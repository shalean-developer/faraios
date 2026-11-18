-- Isolated BOOK-05 synthetic Bokkie offer. Every change below is rolled back.
begin;
do $test$
declare
 slug constant text:='bokkie-book05'; c record; d date; at_time timestamptz;
 options jsonb; q jsonb; work uuid; h uuid:=gen_random_uuid(); j uuid:=gen_random_uuid();
 contact jsonb; full_doc jsonb; res jsonb; oldhours jsonb;
begin
 select * into strict c from instant_private.config(slug);
 if cardinality(c.workers)<>1 then raise exception 'Requires one fixture cleaner';end if;
 work=c.workers[1];
 options=jsonb_build_array(jsonb_build_object('id',repeat('2',32),'quantity',2),jsonb_build_object('id',repeat('3',32),'quantity',1),jsonb_build_object('id',repeat('4',32),'quantity',1));
 select day::date into strict d from generate_series((now() at time zone 'Africa/Johannesburg')::date+8,(now() at time zone 'Africa/Johannesburg')::date+26,interval '1 day') day
 where not exists(select from public.business_bookings b where b.business_id=c.bid and (b.starts_at at time zone 'Africa/Johannesburg')::date=day::date)
 and not exists(select from instant_private.holds x where x.business_id=c.bid and x.expires_at>now() and (x.starts_at at time zone 'Africa/Johannesburg')::date=day::date) order by day limit 1;
 at_time=(d+time '09:00') at time zone 'Africa/Johannesburg';
 select hours into oldhours from authorization_private.scheduling_policies where business_id=c.bid and environment='preview';
 update authorization_private.scheduling_policies set hours=(select jsonb_agg(jsonb_build_object('day',i,'start',0,'end',1440)) from generate_series(1,7) i),before_minutes=0,after_minutes=0 where business_id=c.bid and environment='preview';
 insert into instant_private.availability_rules(business_id) values(c.bid) on conflict do nothing;
 update instant_private.availability_rules set paused=false,notice_minutes=0,horizon_days=30,holidays='{}',staff_blocks='[]' where business_id=c.bid;
 q=instant_private.slots(slug,c.service->>'id',c.areas[1],options,d);
 if (q->>'minutes')::int<>300 or not(q->'times' ? '09:00') then raise exception 'Baseline five-hour slot missing';end if;
 contact=jsonb_build_object('name','BOOK03 rollback','email','book05@example.com','phone','','notes','','review_business',c.bid,'review_version',q->>'version');

 update instant_private.availability_rules set paused=true where business_id=c.bid;
 if instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Pause failed';end if;
 update instant_private.availability_rules set paused=false,horizon_days=1 where business_id=c.bid;
 if instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Horizon failed';end if;
 update instant_private.availability_rules set horizon_days=30,notice_minutes=43200 where business_id=c.bid;
 if instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Notice failed';end if;
 update instant_private.availability_rules set notice_minutes=0,holidays=array[d] where business_id=c.bid;
 if instant_private.worker(slug,(d::timestamp at time zone 'Africa/Johannesburg'),30,null) is not null
 or instant_private.worker(slug,((d-1)+time '23:30') at time zone 'Africa/Johannesburg',30,null) is distinct from work
 or instant_private.worker(slug,((d-1)+time '23:30') at time zone 'Africa/Johannesburg',60,null) is not null then raise exception 'SAST midnight or end-exclusive holiday boundary failed';end if;
 update instant_private.availability_rules set holidays='{}',staff_blocks=jsonb_build_array(jsonb_build_object('staff',work,'start',d::text||'T11:00','end',d::text||'T12:00')) where business_id=c.bid;
 if instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Time off hidden from checkout';end if;
 begin
  perform instant_private.reserve(h,slug,c.service->>'id',c.areas[1],options,at_time,37500,300,contact,'BOOK03 Synthetic Street');
  raise exception 'Stale slot accepted';
 exception when raise_exception then if sqlerrm<>'Slot unavailable.' then raise;end if;end;
 if exists(select from instant_private.holds where reference=h) then raise exception 'Stale attempt created a hold';end if;
 update instant_private.availability_rules set staff_blocks='[]' where business_id=c.bid;
 begin
  perform instant_private.slots(slug,c.service->>'id','Outside fixture areas',options,d);
  raise exception 'Outside area accepted';
 exception when raise_exception then if sqlerrm<>'Selection unavailable.' then raise;end if;end;
 update public.business_staff set active=false where id=work;
 if instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Inactive cleaner accepted';end if;
 update public.business_staff set active=true where id=work;
 res=instant_private.reserve(h,slug,c.service->>'id',c.areas[1],options,at_time,37500,300,contact,'BOOK03 Synthetic Street');
 if not(res ? 'expires') or instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Active hold failed to exclude second customer';end if;
 select customer into full_doc from instant_private.holds where reference=h;
 perform instant_private.release_unpaid(h,slug);
 insert into public.business_bookings(id,business_id,environment,document,address,starts_at,time_zone,duration_minutes,status) values(j,c.bid,'preview',full_doc,'BOOK03 Synthetic Street',at_time-interval '1 hour','Africa/Johannesburg',60,'Scheduled');
 insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) values(j,work,c.bid,'preview');
 if instant_private.worker(slug,at_time,300,null) is distinct from work then raise exception 'Touching jobs should fit with zero buffers';end if;
 if instant_private.worker(slug,at_time-interval '30 minutes',300,null) is not null then raise exception 'Overlapping job accepted';end if;
 update authorization_private.scheduling_policies set after_minutes=15 where business_id=c.bid and environment='preview';
 if instant_private.worker(slug,at_time,300,null) is not null then raise exception 'Adjacent job ignored travel buffer';end if;
 if instant_private.worker(slug,at_time+interval '30 minutes',300,null) is distinct from work then raise exception 'Safe buffered gap missing';end if;
end $test$;
rollback;
select 'PASS: hours/capacity, pause, notice, horizon, SAST midnight/holiday crossing, time off and stale hold, area, staff activity, holds, adjacent jobs and travel buffers' as result;

begin;
do $test$
declare bid uuid; item jsonb; opt jsonb; original jsonb; d date; shorter jsonb; longer jsonb;
begin
select c.bid,c.service into strict bid,item from instant_private.config('bokkie-book05') c;
select published into strict original from public.business_service_catalogues where business_id=bid and environment='preview' for update;
if original#>>'{items,0,options,2,kind}'<>'extra' then raise exception 'Unexpected fixture';end if;
original=jsonb_set(jsonb_set(jsonb_set(original,'{items,0,options,2,name}','"Synthetic oven clean"'),'{items,0,options,2,minimum}','0'),'{items,0,options,2,minutes}','60');
update public.business_service_catalogues set published=original where business_id=bid and environment='preview';
update public.business_public_pages set services=services where business_id=bid and slug='bokkie-book05' and environment='preview';
d=(now() at time zone 'Africa/Johannesburg')::date+19;
opt=jsonb_build_array(jsonb_build_object('id',repeat('2',32),'quantity',2),jsonb_build_object('id',repeat('3',32),'quantity',1),jsonb_build_object('id',repeat('4',32),'quantity',0));
shorter=instant_private.slots('bokkie-book05',item->>'id','Gardens',opt,d);
longer=instant_private.slots('bokkie-book05',item->>'id','Gardens',jsonb_set(opt,'{2,quantity}','1'),d);
if (shorter->>'minutes')::int<>300 or not(shorter->'times' ? '09:00') or (longer->>'minutes')::int<>360 or jsonb_array_length(longer->'times')<>0 then raise exception 'Extra duration did not change capacity';end if;
end $test$;rollback;
select 'Synthetic optional extra: 300 min and 09:00 available without extra; 360 min and no whole-visit slot with extra. Catalogue rolled back.' as result;