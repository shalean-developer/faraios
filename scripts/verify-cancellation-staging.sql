-- Rollback-only Stage 1 acceptance on faraios-staging xdmfyrsauvqznkloroxg.
-- Existing staging auth identities; no provider operation or retained fixture.
begin;
set local statement_timeout='60s';set local lock_timeout='5s';
create temporary table cancellation_checks(name text primary key) on commit drop;
grant select,insert on cancellation_checks to authenticated;
create function pg_temp.cancel_check(label text,ok boolean) returns void language plpgsql as $$begin if ok is not true then raise exception 'Cancellation acceptance failed: %',label;end if;insert into cancellation_checks values(label);end$$;
create function pg_temp.cancel_denied(label text,statement text,pattern text) returns void language plpgsql as $$
declare denied boolean:=false;
begin
 begin execute statement;exception when others then if sqlerrm!~pattern then raise exception 'Unexpected rejection for %: %',label,sqlerrm;end if;denied:=true;end;
 perform pg_temp.cancel_check(label,denied);
end$$;
do $setup$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();o uuid;m uuid;s uuid;
begin
 if to_regclass('public.cancellation_review_cases') is null then raise exception 'Apply Stage 1 migration first';end if;
 if (select count(*) from public.businesses)<>2 or not exists(select 1 from public.businesses where id='612be091-b1d7-4911-9c3b-143446a9fe27') or not exists(select 1 from public.businesses where id='0cc3f518-d64e-40c2-8817-bc14d1ef1420') then raise exception 'Unexpected staging business baseline';end if;
 if exists(select 1 from public.business_accounting_connections where enabled) then raise exception 'Accounting must remain disabled';end if;
 select user_id into o from public.business_memberships where role='owner' and status='active' limit 1;
 select x.user_id into m from public.business_memberships x join auth.users u on u.id=x.user_id where x.role='manager' and x.status='active' and u.email like '%.test' limit 1;
 select x.user_id into s from public.business_memberships x join auth.users u on u.id=x.user_id where x.role='staff' and x.status='active' and u.email like '%.test' limit 1;
 if o is null or m is null or s is null or o=m or m=s or o=s then raise exception 'Existing QA identities required';end if;
 perform set_config('faraios.cancel.a',a::text,true);perform set_config('faraios.cancel.b',b::text,true);perform set_config('faraios.cancel.owner',o::text,true);perform set_config('faraios.cancel.manager',m::text,true);perform set_config('faraios.cancel.staff',s::text,true);
 insert into public.businesses(id,name,industry) values(a,'T04_CANCEL_QA_A','cleaning'),(b,'T04_CANCEL_QA_B','cleaning');
 insert into public.business_memberships(business_id,user_id,role) values(a,o,'owner'),(a,m,'manager'),(a,s,'staff'),(b,m,'owner');
end $setup$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('faraios.cancel.owner'),true);
do $owner$
declare a uuid:=current_setting('faraios.cancel.a')::uuid;s uuid:=current_setting('faraios.cancel.staff')::uuid;
 cust uuid:=gen_random_uuid();addr uuid:=gen_random_uuid();svc uuid:=gen_random_uuid();booking uuid:=gen_random_uuid();c uuid;k uuid:=gen_random_uuid();reserve uuid:=gen_random_uuid();p jsonb;result uuid;
begin
 insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values(a,'Synthetic QA',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg');
 insert into public.business_customers(id,business_id,name) values(cust,a,'T04 synthetic customer');
 insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values(addr,a,cust,'QA','Synthetic address');
 insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values(svc,a,'service','Synthetic QA','fixed','visit',100000,'ZAR',1,true);
 insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values(booking,a,gen_random_uuid(),cust,addr,((now() at time zone 'Africa/Johannesburg')::date+2)+time '09:00',120,jsonb_build_array(jsonb_build_object('catalogue_id',svc,'quantity',1)));
 update public.one_off_bookings set status='confirmed' where id=booking;
 update public.one_off_bookings set status='assigned',assigned_staff=array[s],change_reason='Synthetic assigned team' where id=booking;
 p:=jsonb_build_object('policyVersion','shalean-cancel-20261021-v1','agreementKind','new_accepted','acceptanceEvidence','TEST accepted prospective terms','cause','customer','action','cancel','stage','accepted','originalStart',(select starts_at from public.one_off_bookings where id=booking),'requestedAt',now()-interval '5 minutes','stageTimes',jsonb_build_object('accepted',now()-interval '1 hour'),'workers',jsonb_build_array(jsonb_build_object('id',s,'agreedCents',30000,'expenseCents',0)),'eligibleLabourCents',100000,'reasonableLossCents',0,'verifiedReceiptsCents',100000,'performedServiceCents',0,'completedRefundsCents',0,'pendingRefundsCents',0,'reviewedCustomerFeeCents',0,'collectedPoolCents',0,'mandatoryRightsReviewed',true,'feeMustBeWaived',false,'holidays','[]'::jsonb);
 perform pg_temp.cancel_denied('policy off by default',format('select public.append_cancellation_review(%L,%L,null,0,%L,''prepare'',%L)',a,booking,k,p),'not configured');
 insert into public.business_cancellation_review_policies(business_id,policy_version,approval_reference) values(a,'shalean-cancel-20261021-v1','TEST owner approval for disposable QA only');
 c:=public.append_cancellation_review(a,booking,null,0,k,'prepare',p);
 perform pg_temp.cancel_check('prepared once',(select version=1 from public.cancellation_review_cases where id=c));
 result:=public.append_cancellation_review(a,booking,null,0,k,'prepare',p);perform pg_temp.cancel_check('exact replay',result=c);
 perform pg_temp.cancel_denied('different replay rejected',format('select public.append_cancellation_review(%L,%L,%L,1,%L,''prepare'',%L)',a,booking,c,k,p||jsonb_build_object('collectedPoolCents',1)),'different details');
 perform pg_temp.cancel_denied('pending review blocks cancellation',format('update public.one_off_bookings set status=''cancelled'',change_reason=''Synthetic request'' where id=%L',booking),'approval required');
 perform pg_temp.cancel_denied('stale approval rejected',format('select public.append_cancellation_review(%L,%L,%L,0,%L,''approve'',''{"reason":"TEST"}'')',a,booking,c,gen_random_uuid()),'changed');
 perform set_config('faraios.cancel.case',c::text,true);perform set_config('faraios.cancel.booking',booking::text,true);
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.manager'),true);
 perform pg_temp.cancel_check('manager can read',(select count(*)=1 from public.cancellation_review_cases where id=c));
 perform pg_temp.cancel_denied('manager approval denied',format('select public.append_cancellation_review(%L,%L,%L,1,%L,''approve'',''{"reason":"TEST"}'')',a,booking,c,gen_random_uuid()),'Owner approval');
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.owner'),true);
 perform public.append_cancellation_review(a,booking,c,1,gen_random_uuid(),'approve','{"reason":"Synthetic owner review"}');
 perform public.append_cancellation_review(a,booking,c,2,reserve,'reserve_refund','{"amountCents":60000,"receiptReference":"TEST-PAY","route":"test-card","originalRoute":"test-card"}');
 perform pg_temp.cancel_denied('over-refund rejected',format('select public.append_cancellation_review(%L,%L,%L,3,%L,''reserve_refund'',''{"amountCents":60000,"receiptReference":"TEST-PAY","route":"test-card","originalRoute":"test-card"}'')',a,booking,c,gen_random_uuid()),'exceeds');
 perform public.append_cancellation_review(a,booking,c,3,gen_random_uuid(),'submit_refund',jsonb_build_object('refundId',reserve,'reference','TEST-SUBMITTED'));
 perform pg_temp.cancel_denied('uncertain money stays reserved',format('select public.append_cancellation_review(%L,%L,%L,4,%L,''release_refund'',%L)',a,booking,c,gen_random_uuid(),jsonb_build_object('refundId',reserve,'reference','TEST-UNCERTAIN')),'uncertain');
 perform public.append_cancellation_review(a,booking,c,4,gen_random_uuid(),'complete_refund',jsonb_build_object('refundId',reserve,'reference','TEST-RECEIVED'));
 perform pg_temp.cancel_check('submission distinct from completion',(select count(*)=2 from public.cancellation_review_events where case_id=c and event_type in ('submit_refund','complete_refund')));
 perform pg_temp.cancel_denied('direct event rewrite denied',format('update public.cancellation_review_events set payload=''{}'' where case_id=%L',c),'permission denied');
 perform pg_temp.cancel_denied('direct case delete denied',format('delete from public.cancellation_review_cases where id=%L',c),'permission denied');
 update public.one_off_bookings set status='cancelled',change_reason='Approved synthetic cancellation' where id=booking;
 perform pg_temp.cancel_check('approved cancellation keeps price',(select status='cancelled' and total_cents=100000 from public.one_off_bookings where id=booking));
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.staff'),true);
 perform pg_temp.cancel_check('staff read denied',(select count(*)=0 from public.cancellation_review_cases where id=c));
 perform pg_temp.cancel_denied('staff RPC denied',format('select public.append_cancellation_review(%L,%L,%L,5,%L,''approve'',''{}'')',a,booking,c,gen_random_uuid()),'denied');
 perform set_config('request.jwt.claim.sub',current_setting('faraios.cancel.manager'),true);
 perform pg_temp.cancel_denied('foreign tenant denied',format('select public.append_cancellation_review(%L,%L,%L,5,%L,''approve'',''{}'')',current_setting('faraios.cancel.b'),booking,c,gen_random_uuid()),'unavailable');
end $owner$;
reset role;
select jsonb_build_object('checks',count(*),'names',jsonb_agg(name order by name),'outcome','PASS — rollback-only synthetic backend checks') as acceptance from cancellation_checks;
rollback;
