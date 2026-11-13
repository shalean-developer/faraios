-- Rollback-only native role verification in faraios-new. JWT identities simulated.
begin;
select set_config('faraios.booking_bid',(select id::text from public.businesses order by created_at limit 1),true);
select set_config('faraios.booking_owner',(select owner_id::text from public.businesses where id=current_setting('faraios.booking_bid')::uuid),true);
select set_config('request.jwt.claim.sub',current_setting('faraios.booking_owner'),true),set_config('request.jwt.claims','{"is_anonymous":false}',true);
select set_config('faraios.booking_zone',(select time_zone from public.businesses where id=current_setting('faraios.booking_bid')::uuid),true);
select set_config('faraios.booking_doc',jsonb_build_object('name','Rollback Booking Customer','email','booking@example.test','phone','','notes','Fictional rollback only','currency',coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=current_setting('faraios.booking_bid')::uuid and environment='preview'),'ZAR'),'items',jsonb_build_array(jsonb_build_object('name','Test service','quantity',2,'price',50000)))::text,true);
set local role authenticated;
select public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb11',0,null,current_setting('faraios.booking_doc')::jsonb,'10 Fictional Road','2026-11-20 08:30',current_setting('faraios.booking_zone'),120,'Scheduled');
do $$declare denied boolean;st text;v integer=1;begin
 if not exists(select 1 from public.business_bookings where id='713ad559-df25-45cc-8dd0-09082a4abb11' and status='Scheduled' and starts_at at time zone time_zone=timestamp '2026-11-20 08:30') then raise exception 'FAIL save/time zone';end if;
 denied=false;begin update public.business_bookings set status='Completed';exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL direct update';end if;
 denied=false;begin perform public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb11',0,null,current_setting('faraios.booking_doc')::jsonb,'10 Fictional Road','2026-11-20 08:30',current_setting('faraios.booking_zone'),120,'Scheduled');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL stale save';end if;
 foreach st in array array['In Progress','Completed','Cancelled','Scheduled'] loop
 perform public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb11',v,null,current_setting('faraios.booking_doc')::jsonb,'10 Fictional Road','2026-11-21 09:30',current_setting('faraios.booking_zone'),90,st);v=v+1;
 if not exists(select 1 from public.business_bookings where id='713ad559-df25-45cc-8dd0-09082a4abb11' and status=st and version=v) then raise exception 'FAIL status reload';end if;
 end loop;
 denied=false;begin perform public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'live','713ad559-df25-45cc-8dd0-09082a4abb11',v,null,current_setting('faraios.booking_doc')::jsonb,'10 Fictional Road','2026-11-20 08:30',current_setting('faraios.booking_zone'),120,'Scheduled');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL environment';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ffffffff-ffff-ffff-ffff-ffffffffffff',true);
set local role authenticated;
do $$declare denied boolean=false;begin
 if exists(select 1 from public.business_bookings where id='713ad559-df25-45cc-8dd0-09082a4abb11') then raise exception 'FAIL cross owner read';end if;
 begin perform public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb11',5,null,current_setting('faraios.booking_doc')::jsonb,'10 Fictional Road','2026-11-20 08:30',current_setting('faraios.booking_zone'),120,'Scheduled');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL cross owner write';end if;
end$$;
reset role;
set local role anon;
do $$declare denied boolean=false;begin
 begin perform count(*) from public.business_bookings;exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL anon read';end if;
 denied=false;begin perform public.business_booking_write(null,null,null,null,null,null,null,null,null,null,null);exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL anon write';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('faraios.booking_owner'),true);
set local role authenticated;
select public.business_quote_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb22',0,'save',current_setting('faraios.booking_doc')::jsonb,current_date+14,null);
select public.business_quote_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb22',1,'send',null,null,null);
select public.business_quote_customer('preview',(select share_token from public.business_quotes where id='713ad559-df25-45cc-8dd0-09082a4abb22'),'Accepted');
select public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb33',0,'713ad559-df25-45cc-8dd0-09082a4abb22','{}'::jsonb,'20 Fictional Road','2026-11-23 10:00',current_setting('faraios.booking_zone'),60,'Scheduled');
do $$declare denied boolean=false;begin
 if not exists(select 1 from public.business_bookings where id='713ad559-df25-45cc-8dd0-09082a4abb33' and document=current_setting('faraios.booking_doc')::jsonb) then raise exception 'FAIL quote source';end if;
 begin perform public.business_booking_write(current_setting('faraios.booking_bid')::uuid,'preview','713ad559-df25-45cc-8dd0-09082a4abb44',0,'713ad559-df25-45cc-8dd0-09082a4abb22',current_setting('faraios.booking_doc')::jsonb,'20 Fictional Road','2026-11-23 10:00',current_setting('faraios.booking_zone'),60,'Scheduled');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL duplicate quote';end if;
end$$;
reset role;
do $$declare denied boolean=false;begin
 begin perform booking_private.instant('2027-03-14 02:30','America/New_York');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL DST gap';end if;
 denied=false;begin perform booking_private.instant('2026-11-01 01:30','America/New_York');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL DST repeat';end if;
end$$;
rollback;
select 'PASS: rollback-only booking save, reschedule, four statuses, quote snapshot, duplicate prevention, stale/anonymous/cross-owner/environment denial and DST validation' as result;
