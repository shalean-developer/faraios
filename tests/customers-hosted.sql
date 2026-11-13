-- Synthetic fixtures and JWT role probes in one transaction; no records retained.
begin;
select set_config('faraios.customer_bid',(select id::text from public.businesses order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.customer_bid')::uuid),true),set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
do $$declare bid uuid=current_setting('faraios.customer_bid')::uuid;cid uuid='813ad559-df25-45cc-8dd0-09082a4abb11';qid uuid='813ad559-df25-45cc-8dd0-09082a4abb12';rid uuid='813ad559-df25-45cc-8dd0-09082a4abb13';eid uuid='813ad559-df25-45cc-8dd0-09082a4abb14';d jsonb='{"name":"Rollback Customer","email":"rollback-customer@example.test","phone":"+27 (82) 555-0199","address":"10 Fictional Road","notes":"Private rollback notes"}';doc jsonb;res jsonb;denied boolean;zone text;currency text;snap jsonb;
begin
 select time_zone into zone from public.businesses where id=bid;
 select coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=bid and environment='preview'),'ZAR') into currency;
 perform public.business_customer_write(bid,'preview',cid,0,d,false);
 if not exists(select 1 from public.business_customers where id=cid and details=d) then raise exception 'FAIL save/reload';end if;
 res=public.business_customer_search(bid,'preview','825550199',1);
 if not res @> jsonb_build_array(jsonb_build_object('id',cid)) then raise exception 'FAIL normalized phone search';end if;
 res=public.business_customer_write(bid,'preview','813ad559-df25-45cc-8dd0-09082a4abb15',0,d||'{"name":"Different rollback name","email":"ROLLBACK-CUSTOMER@example.test","phone":""}'::jsonb,false);
 if not res ? 'duplicates' then raise exception 'FAIL duplicate detection';end if;
 denied=false;begin perform public.business_customer_write(bid,'preview',cid,0,d,false);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL stale';end if;
 denied=false;begin perform public.business_customer_write(bid,'preview',gen_random_uuid(),0,d||'{"name":"x"}',false);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL validation';end if;
 denied=false;begin update public.business_customers set details=d;exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL direct DML';end if;
 doc=jsonb_build_object('name',d->>'name','email',d->>'email','phone',d->>'phone','notes','Customer agreement','currency',currency,'items',jsonb_build_array(jsonb_build_object('name','Test service','quantity',1,'price',10000)));
 perform public.business_customer_quote_create(bid,'preview',qid,0,'save',doc,(now() at time zone zone)::date+14,null,cid);
 perform public.business_customer_booking_create(bid,'preview',rid,0,null,doc,'10 Fictional Road','2026-11-28 08:30',zone,90,'Scheduled',cid);
 select to_jsonb(r)-'customer_id'-'version' into snap from public.business_bookings r where id=rid;
 perform public.business_customer_write(bid,'preview',cid,1,d||'{"name":"Changed Rollback Customer","address":"90 New Profile Road"}',false);
 if (select document from public.business_quotes where id=qid)<>doc or (select to_jsonb(r)-'customer_id'-'version' from public.business_bookings r where id=rid)<>snap then raise exception 'FAIL snapshot preservation';end if;
 denied=false;begin perform public.business_customer_link(bid,'live',cid,'booking',rid,1);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL environment';end if;
end$$;
reset role;
-- Explicit historical association has no snapshot side effects.
insert into public.business_enquiries(id,business_id,environment,request_id,page_slug,customer_name,email,phone,requirements) values('813ad559-df25-45cc-8dd0-09082a4abb14',current_setting('faraios.customer_bid')::uuid,'preview','813ad559-df25-45cc-8dd0-09082a4abb16','rollback-only','Historical same name','historical@example.test','','Historical saved requirements');
set local role authenticated;
select public.business_customer_link(current_setting('faraios.customer_bid')::uuid,'preview','813ad559-df25-45cc-8dd0-09082a4abb11','enquiry','813ad559-df25-45cc-8dd0-09082a4abb14',1);
do $$begin if not exists(select 1 from public.business_enquiries where id='813ad559-df25-45cc-8dd0-09082a4abb14' and customer_id='813ad559-df25-45cc-8dd0-09082a4abb11' and requirements='Historical saved requirements' and version=2) then raise exception 'FAIL explicit link';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','ffffffff-ffff-ffff-ffff-ffffffffffff',true);
set local role authenticated;
do $$declare denied boolean=false;begin
 if exists(select 1 from public.business_customers where id='813ad559-df25-45cc-8dd0-09082a4abb11') then raise exception 'FAIL foreign read';end if;
 begin perform public.business_customer_search(current_setting('faraios.customer_bid')::uuid,'preview','',1);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL foreign search';end if;
 denied=false;begin perform public.business_customer_link(current_setting('faraios.customer_bid')::uuid,'preview','813ad559-df25-45cc-8dd0-09082a4abb11','quote','813ad559-df25-45cc-8dd0-09082a4abb12',1);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL foreign link';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{"is_anonymous":true}',true),set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.customer_bid')::uuid),true);
set local role authenticated;
do $$declare denied boolean=false;begin begin perform public.business_customer_search(current_setting('faraios.customer_bid')::uuid,'preview','',1);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL anonymous auth';end if;end$$;
reset role;
set local role anon;
do $$declare denied boolean=false;begin
 begin perform count(*) from public.business_customers;exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL anon read';end if;
 denied=false;begin perform public.business_customer_search(null,null,null,null);exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL anon rpc';end if;
end$$;
reset role;
select 'PASS: customers, validation, duplicate review, stale saves, search, links, snapshots, owner/environment/anonymous permissions. Rollback only.' as result;
rollback;
