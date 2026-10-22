-- Rollback-only Stage 2 acceptance on faraios-staging xdmfyrsauvqznkloroxg.
-- Existing staging auth identities; no provider operation or retained fixture.
begin;
set local statement_timeout='60s';set local lock_timeout='5s';
create temporary table adjustment_checks(name text primary key) on commit drop;
grant select,insert on adjustment_checks to authenticated;
create function pg_temp.adjust_check(label text,ok boolean) returns void language plpgsql as $$begin if ok is not true then raise exception 'Cancellation acceptance failed: %',label;end if;insert into adjustment_checks values(label);end$$;
create function pg_temp.adjust_denied(label text,statement text,pattern text) returns void language plpgsql as $$
declare denied boolean:=false;
begin
 begin execute statement;exception when others then if sqlerrm!~pattern then raise exception 'Unexpected rejection for %: %',label,sqlerrm;end if;denied:=true;end;
 perform pg_temp.adjust_check(label,denied);
end$$;
do $setup$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();o uuid;m uuid;s uuid;
begin
 if to_regclass('public.adjustment_review_sources') is null then raise exception 'Apply Stage 2 migration first';end if;
 if (select count(*) from public.businesses)<>2 or not exists(select 1 from public.businesses where id='612be091-b1d7-4911-9c3b-143446a9fe27') or not exists(select 1 from public.businesses where id='0cc3f518-d64e-40c2-8817-bc14d1ef1420') then raise exception 'Unexpected staging business baseline';end if;
 if exists(select 1 from public.business_accounting_connections where enabled) then raise exception 'Accounting must remain disabled';end if;
 select user_id into o from public.business_memberships where role='owner' and status='active' limit 1;
 select x.user_id into m from public.business_memberships x join auth.users u on u.id=x.user_id where x.role='manager' and x.status='active' and u.email like '%.test' limit 1;
 select x.user_id into s from public.business_memberships x join auth.users u on u.id=x.user_id where x.role='staff' and x.status='active' and u.email like '%.test' limit 1;
 if o is null or m is null or s is null or o=m or m=s or o=s then raise exception 'Existing QA identities required';end if;
 perform set_config('faraios.cancel.a',a::text,true);perform set_config('faraios.cancel.b',b::text,true);perform set_config('faraios.cancel.owner',o::text,true);perform set_config('faraios.cancel.manager',m::text,true);perform set_config('faraios.cancel.staff',s::text,true);
 insert into public.businesses(id,name,industry) values(a,'T04_ADJUST_QA_A','cleaning'),(b,'T04_ADJUST_QA_B','cleaning');
 insert into public.business_memberships(business_id,user_id,role) values(a,o,'owner'),(a,m,'manager'),(a,s,'staff'),(b,m,'owner');
end $setup$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('faraios.cancel.owner'),true);
do $owner$
declare a uuid:=current_setting('faraios.cancel.a')::uuid;s uuid:=current_setting('faraios.cancel.staff')::uuid;
 cust uuid:=gen_random_uuid();addr uuid:=gen_random_uuid();svc uuid:=gen_random_uuid();booking uuid:=gen_random_uuid();c uuid;k uuid:=gen_random_uuid();reserve uuid:=gen_random_uuid();p jsonb;result uuid;item uuid:=gen_random_uuid();
begin
 insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values(a,'Synthetic QA',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg');
 insert into public.business_customers(id,business_id,name) values(cust,a,'T04 synthetic customer');
 insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values(addr,a,cust,'QA','Synthetic address');
 insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values(svc,a,'service','Synthetic QA','fixed','visit',100000,'ZAR',1,true);
 insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values(booking,a,gen_random_uuid(),cust,addr,((now() at time zone 'Africa/Johannesburg')::date+2)+time '09:00',120,jsonb_build_array(jsonb_build_object('catalogue_id',svc,'quantity',1)));
 update public.one_off_bookings set status='confirmed' where id=booking;
 update public.one_off_bookings set status='assigned',assigned_staff=array[s],change_reason='Synthetic assigned team' where id=booking;
 p:=jsonb_build_object('sourceId',k,'bookingId',booking,'workerId',s,'originalVersion',3,'originalCents',250000,'originalPeriod','2026-10','agreementEvidence','SYNTHETIC accepted terms','originalRecordEvidence','SYNTHETIC original R2500');
 perform pg_temp.adjust_denied('numeric strings rejected',format('select public.append_earnings_adjustment(%L,%L,0,%L,''register_source'',%L)',a,k,reserve,p||jsonb_build_object('originalCents','250000')),'integer');
 perform public.append_earnings_adjustment(a,k,0,reserve,'register_source',p);
 perform pg_temp.adjust_check('synthetic source only',(select synthetic_only and version=1 from public.adjustment_review_sources where id=k));
 perform public.append_earnings_adjustment(a,k,0,reserve,'register_source',p);
 perform pg_temp.adjust_check('exact source replay',(select version=1 from public.adjustment_review_sources where id=k));
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.manager'),true);
 perform public.append_earnings_adjustment(a,k,1,item,'propose',jsonb_build_object('sourceId',k,'kind','reimbursement','deltaCents',5000,'reason','Missed R50','evidence','TEST receipt','occurrenceReference','missed1'));
 perform pg_temp.adjust_denied('manager approval denied',format('select public.append_earnings_adjustment(%L,%L,2,%L,''approve'',%L)',a,k,gen_random_uuid(),jsonb_build_object('adjustmentId',item,'reason','TEST','originalVerificationEvidence','TEST','entitlementReviewEvidence','TEST')),'Owner');
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.staff'),true);
 perform pg_temp.adjust_check('staff own source visible',(select count(*)=1 from public.adjustment_review_sources where id=k));
 perform public.append_earnings_adjustment(a,k,2,gen_random_uuid(),'raise_dispute',jsonb_build_object('adjustmentId',item,'reason','Review','evidence','Own worker'));
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.owner'),true);
 perform pg_temp.adjust_denied('disputed approval blocked',format('select public.append_earnings_adjustment(%L,%L,3,%L,''approve'',%L)',a,k,gen_random_uuid(),jsonb_build_object('adjustmentId',item,'reason','TEST','originalVerificationEvidence','TEST','entitlementReviewEvidence','TEST')),'Undisputed');
 perform public.append_earnings_adjustment(a,k,3,gen_random_uuid(),'resolve_dispute',jsonb_build_object('adjustmentId',item,'reason','Reviewed','workerReviewEvidence','TEST worker review'));
 perform public.append_earnings_adjustment(a,k,4,gen_random_uuid(),'approve',jsonb_build_object('adjustmentId',item,'reason','Verified','originalVerificationEvidence','TEST original','entitlementReviewEvidence','TEST obligations'));
 perform public.append_earnings_adjustment(a,k,5,gen_random_uuid(),'freeze_review',jsonb_build_object('adjustmentId',item,'reference','TEST review'));
 perform pg_temp.adjust_denied('original not repaid',format('select public.append_earnings_adjustment(%L,%L,6,%L,''simulate_settlement'',%L)',a,k,gen_random_uuid(),jsonb_build_object('adjustmentId',item,'amountCents',255000,'reference','TEST')),'Correction only');
 perform public.append_earnings_adjustment(a,k,6,gen_random_uuid(),'simulate_settlement',jsonb_build_object('adjustmentId',item,'amountCents',5000,'reference','TEST-NO-MONEY'));
 perform pg_temp.adjust_check('only R50 simulated',(select simulated and delta_cents=5000 and old_cents=0 and new_cents=5000 from public.adjustment_review_items where id=item));
 perform pg_temp.adjust_check('original snapshot unchanged',(select original_payload=p from public.adjustment_review_sources where id=k));
 perform pg_temp.adjust_denied('repeat simulation denied',format('select public.append_earnings_adjustment(%L,%L,7,%L,''simulate_settlement'',%L)',a,k,gen_random_uuid(),jsonb_build_object('adjustmentId',item,'amountCents',5000,'reference','TEST-again')),'unsimulated');
 perform pg_temp.adjust_denied('direct rewrite denied',format('update public.adjustment_review_sources set version=99 where id=%L',k),'permission denied');
 perform pg_temp.adjust_denied('direct deletion denied',format('delete from public.adjustment_review_events where source_id=%L',k),'permission denied');
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.manager'),true);
 perform pg_temp.adjust_denied('foreign business denied',format('select public.append_earnings_adjustment(%L,%L,7,%L,''propose'',%L)',current_setting('faraios.cancel.b'),k,gen_random_uuid(),jsonb_build_object('sourceId',k,'kind','reimbursement','deltaCents',50,'reason','TEST','evidence','TEST','occurrenceReference','other')),'unavailable');
end $owner$;
reset role;
select jsonb_build_object('checks',count(*),'names',jsonb_agg(name order by name),'outcome','PASS — rollback-only Stage2 review checks') as acceptance from adjustment_checks;
rollback;
