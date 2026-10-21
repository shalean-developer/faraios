-- VAT staging acceptance. Run only against faraios-staging xdmfyrsauvqznkloroxg.
-- Every fixture and audit row is rolled back. Never enable VAT on Shalean/Bokkie.
-- Uses existing owner/manager/staff identities, not account creation or passwords.
begin;
set local statement_timeout='60s';
set local lock_timeout='5s';
do $setup$
declare owners uuid[];managers uuid[];staff uuid[];a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();customer uuid:=gen_random_uuid();address uuid:=gen_random_uuid();service uuid:=gen_random_uuid();
begin
 if to_regclass('public.business_vat_settings') is null then raise exception 'Apply the reviewed VAT migration first';end if;
 if (select count(*) from public.businesses)<>2 or not exists(select 1 from public.businesses where id='612be091-b1d7-4911-9c3b-143446a9fe27') or not exists(select 1 from public.businesses where id='0cc3f518-d64e-40c2-8817-bc14d1ef1420') then raise exception 'Unexpected staging business scope';end if;
 if exists(select 1 from public.business_accounting_connections where enabled) or exists(select 1 from public.business_vat_settings where enabled) then raise exception 'Expected inactive accounting and VAT';end if;
 select array_agg(distinct user_id) into owners from public.business_memberships where role='owner' and status='active';
 select array_agg(distinct m.user_id) into managers from public.business_memberships m join auth.users u on u.id=m.user_id where m.role='manager' and m.status='active' and u.email like '%.test';
 select array_agg(distinct m.user_id) into staff from public.business_memberships m join auth.users u on u.id=m.user_id where m.role='staff' and m.status='active' and u.email like '%.test';
 if cardinality(owners) is distinct from 1 or cardinality(managers) is distinct from 1 or cardinality(staff) is distinct from 1 then raise exception 'Expected one existing owner and two unique QA identities';end if;
 perform set_config('faraios.vat.qa.owner',owners[1]::text,true);perform set_config('faraios.vat.qa.manager',managers[1]::text,true);perform set_config('faraios.vat.qa.staff',staff[1]::text,true);
 perform set_config('faraios.vat.qa.a',a::text,true);perform set_config('faraios.vat.qa.b',b::text,true);perform set_config('faraios.vat.qa.service',service::text,true);perform set_config('faraios.vat.qa.customer',customer::text,true);perform set_config('faraios.vat.qa.address',address::text,true);
 perform set_config('faraios.vat.qa.checks','[]',true);
 perform set_config('request.jwt.claim.sub',owners[1]::text,true);
 insert into public.businesses(id,name,industry) values(a,'VAT QA A - ROLLBACK ONLY','cleaning'),(b,'VAT QA B - ROLLBACK ONLY','cleaning');
 insert into public.business_memberships(business_id,user_id,role) values(a,owners[1],'owner'),(a,managers[1],'manager'),(a,staff[1],'staff'),(b,managers[1],'owner');
 insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values(a,'VAT QA',array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59','Africa/Johannesburg');
 insert into public.business_customers(id,business_id,name,phone) values(customer,a,'VAT QA synthetic customer','0000000000');
 insert into public.customer_addresses(id,business_id,customer_id,label,address_line) values(address,a,customer,'QA','Synthetic test address');
 insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values(service,a,'service','VAT QA synthetic service','fixed','visit',11500,'ZAR',1,true);
end;$setup$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('faraios.vat.qa.owner'),true);
do $owner$
declare a uuid:=current_setting('faraios.vat.qa.a')::uuid;b uuid:=current_setting('faraios.vat.qa.b')::uuid;c uuid:=current_setting('faraios.vat.qa.customer')::uuid;d uuid:=current_setting('faraios.vat.qa.address')::uuid;service uuid:=current_setting('faraios.vat.qa.service')::uuid;row public.one_off_bookings;q uuid;stale uuid;checks jsonb:='[]';denied boolean;v integer;
begin
 insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,hours_override_reason,tax_snapshot)
 values(a,gen_random_uuid(),c,d,((now() at time zone 'Africa/Johannesburg')::date+1)::timestamp+interval '9 hours',120,jsonb_build_array(jsonb_build_object('catalogue_id',service,'quantity',1)),'QA','{"enabled":true,"vat_cents":1}') returning * into row;
 if row.total_cents<>11500 or row.tax_snapshot->>'enabled'<>'false' or (row.tax_snapshot->>'vat_cents')::int<>0 then raise exception 'Default-off or spoofed-snapshot protection failed';end if;
 checks:=checks||'["DEFAULT_OFF","CLIENT_TAX_OVERRIDDEN"]'::jsonb;
 stale:=public.create_quote(a,gen_random_uuid(),c,d,jsonb_build_array(jsonb_build_object('catalogue_id',service,'quantity',1)),null,120);
 denied:=false;begin perform public.configure_business_vat(b,0,false,null,null,'Foreign-owner denial QA',true);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Foreign-owner write allowed';end if;
 denied:=false;begin perform public.configure_business_vat(a,0,true,'4000000001',(now() at time zone 'Africa/Johannesburg')::date+1,'Future registration QA',true);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Future registration allowed';end if;
 denied:=false;begin perform public.configure_business_vat(a,0,true,null,current_date-1,'Missing number QA',true);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Missing VAT number allowed';end if;
 denied:=false;begin perform public.configure_business_vat(a,0,false,null,null,'Missing confirmation QA',false);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Unconfirmed VAT change allowed';end if;
 checks:=checks||'["FOREIGN_OWNER_DENIED","FUTURE_REGISTRATION_DENIED","NUMBER_REQUIRED","CONFIRMATION_REQUIRED"]'::jsonb;
 v:=public.configure_business_vat(a,0,true,'4000000001',current_date-1,'Synthetic registration - rollback only',true);if v<>1 then raise exception 'Unexpected policy version';end if;
 if (select count(*) from public.business_vat_settings where business_id=a and enabled)<>1 then raise exception 'Owner cannot read saved policy';end if;
 denied:=false;begin perform public.configure_business_vat(a,0,false,null,null,'Stale save QA',true);exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Stale policy overwrite allowed';end if;
 denied:=false;begin update public.business_vat_settings set enabled=false where business_id=a;exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Direct policy update allowed';end if;
 denied:=false;begin perform public.change_quote(a,stale,1,'issued','QA');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Stale quote issue allowed';end if;
 checks:=checks||'["OWNER_SAVE_AND_READ","STALE_SAVE_DENIED","DIRECT_UPDATE_DENIED","STALE_QUOTE_ISSUE_DENIED"]'::jsonb;
 q:=public.create_quote(a,gen_random_uuid(),c,d,jsonb_build_array(jsonb_build_object('catalogue_id',service,'quantity',1)),null,120);
 if not exists(select 1 from public.business_quotes where id=q and (agreement->>'total_cents')::int=11500 and (agreement->'tax_snapshot'->>'net_cents')::int=10000 and (agreement->'tax_snapshot'->>'vat_cents')::int=1500) then raise exception 'Inclusive VAT calculation failed';end if;
 perform public.change_quote(a,q,1,'issued','QA');perform public.change_quote(a,q,2,'accepted','Synthetic acceptance QA');
 v:=public.configure_business_vat(a,1,false,null,null,'Synthetic deregistration - rollback only',true);if v<>2 then raise exception 'Unexpected off policy version';end if;
 perform set_config('faraios.vat.qa.quote',q::text,true);
 checks:=checks||'["VAT_INCLUSIVE_TOTAL_UNCHANGED","OWNER_SWITCH_OFF"]'::jsonb;
 perform set_config('faraios.vat.qa.checks',checks::text,true);
end;$owner$;
-- The same identity is a manager in A and an owner in B: no role carryover.
select set_config('request.jwt.claim.sub',current_setting('faraios.vat.qa.manager'),true);
do $manager$
declare a uuid:=current_setting('faraios.vat.qa.a')::uuid;checks jsonb:=current_setting('faraios.vat.qa.checks')::jsonb;denied boolean:=false;
begin
 if exists(select 1 from public.business_vat_settings where business_id=a) then raise exception 'Manager read private VAT configuration';end if;
 begin perform public.configure_business_vat(a,2,true,'4000000001',current_date-1,'Manager denial QA',true);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Manager configured VAT';end if;
 checks:=checks||'["MANAGER_CONFIGURATION_READ_DENIED","MANAGER_WRITE_DENIED"]'::jsonb;perform set_config('faraios.vat.qa.checks',checks::text,true);
end;$manager$;
select set_config('request.jwt.claim.sub',current_setting('faraios.vat.qa.staff'),true);
do $staff$
declare a uuid:=current_setting('faraios.vat.qa.a')::uuid;checks jsonb:=current_setting('faraios.vat.qa.checks')::jsonb;denied boolean:=false;
begin
 if exists(select 1 from public.business_vat_settings) then raise exception 'Staff read private VAT configuration';end if;
 begin perform public.configure_business_vat(a,2,true,'4000000001',current_date-1,'Staff denial QA',true);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Staff configured VAT';end if;
 checks:=checks||'["STAFF_READ_DENIED","STAFF_WRITE_DENIED"]'::jsonb;perform set_config('faraios.vat.qa.checks',checks::text,true);
end;$staff$;
select set_config('request.jwt.claim.sub',current_setting('faraios.vat.qa.owner'),true);
do $handoffs$
declare a uuid:=current_setting('faraios.vat.qa.a')::uuid;q uuid:=current_setting('faraios.vat.qa.quote')::uuid;receipt jsonb;row public.one_off_bookings;expected jsonb;s uuid;i uuid;checks jsonb:=current_setting('faraios.vat.qa.checks')::jsonb;denied boolean:=false;amount integer;nextrow public.one_off_bookings;
begin
 select agreement->'tax_snapshot' into expected from public.business_quotes where id=q;
 receipt:=public.convert_quote(a,q,3,((now() at time zone 'Africa/Johannesburg')::date+1)::timestamp+interval '9 hours','');
 select * into row from public.one_off_bookings where id=(receipt->>'booking_id')::uuid;
 if row.tax_snapshot is distinct from expected or row.total_cents<>11500 then raise exception 'Conversion changed VAT or price';end if;
 begin update public.one_off_bookings set tax_snapshot='{}' where id=row.id;exception when raise_exception then denied:=true;end;if not denied then raise exception 'Saved VAT snapshot mutable';end if;
 s:=public.create_recurring(a,row.id,gen_random_uuid(),'weekly',array[0,1,2,3,4,5,6]::smallint[],null,'last_day');
 if (select agreement->'tax_snapshot' from public.recurring_schedules where id=s) is distinct from expected then raise exception 'Recurring source VAT changed';end if;
 perform public.generate_recurring(a,s,1,(now() at time zone 'Africa/Johannesburg')::date+8);
 if not exists(select 1 from public.one_off_bookings where recurring_schedule_id=s) or exists(select 1 from public.one_off_bookings where recurring_schedule_id=s and (tax_snapshot is distinct from expected or total_cents<>11500)) then raise exception 'Generated visit VAT changed';end if;
 i:=public.prepare_invoice(a,row.id);
 if (select snapshot->'tax_snapshot' from public.business_invoices where id=i) is distinct from expected then raise exception 'Invoice VAT changed';end if;
 perform set_config('faraios.vat.qa.invoice',i::text,true);
 checks:=checks||'["CONVERSION_FROZEN","SAVED_VAT_IMMUTABLE","RECURRING_SOURCE_FROZEN","GENERATED_VISITS_FROZEN","INVOICE_SNAPSHOT_FROZEN"]'::jsonb;
 perform public.configure_business_vat(a,2,true,'4000000001',current_date-1,'Rounding QA - rollback only',true);
 foreach amount in array array[0,1,3,4,5,170000,2147483647] loop
  update public.business_catalogue set price_cents=amount where id=current_setting('faraios.vat.qa.service')::uuid;
  insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection,hours_override_reason)
  values(a,gen_random_uuid(),current_setting('faraios.vat.qa.customer')::uuid,current_setting('faraios.vat.qa.address')::uuid,((now() at time zone 'Africa/Johannesburg')::date+1)::timestamp+interval '9 hours',120,jsonb_build_array(jsonb_build_object('catalogue_id',current_setting('faraios.vat.qa.service'),'quantity',1)),'QA') returning * into nextrow;
  if (nextrow.tax_snapshot->>'vat_cents')::int<>round(amount::numeric*1500/11500)::int or (nextrow.tax_snapshot->>'vat_cents')::int+(nextrow.tax_snapshot->>'net_cents')::int<>amount then raise exception 'VAT rounding failed for amount %',amount;end if;
 end loop;
 checks:=checks||'["ROUNDING_AND_MAXIMUM_PRICE"]'::jsonb;perform set_config('faraios.vat.qa.checks',checks::text,true);
end;$handoffs$;
reset role;
do $audit_and_hold$
declare a uuid:=current_setting('faraios.vat.qa.a')::uuid;checks jsonb:=current_setting('faraios.vat.qa.checks')::jsonb;denied boolean:=false;
begin
 if (select count(*) from audit.events where entity_table='business_vat_settings' and business_id=a)<>3 or exists(select 1 from audit.events where entity_table='business_vat_settings' and business_id=a and actor_user_id is distinct from current_setting('faraios.vat.qa.owner')::uuid) then raise exception 'VAT audit actor or row count incorrect';end if;
 begin update public.business_invoices set sync_status='syncing' where id=current_setting('faraios.vat.qa.invoice')::uuid;exception when raise_exception then if sqlerrm like 'VAT accounting sync%' then denied:=true;else raise;end if;end;if not denied then raise exception 'VAT accounting sync not held';end if;
 if exists(select 1 from public.business_vat_settings where business_id in ('612be091-b1d7-4911-9c3b-143446a9fe27','0cc3f518-d64e-40c2-8817-bc14d1ef1420')) then raise exception 'Original business policy changed';end if;
 checks:=checks||'["AUDIT_ATTRIBUTION","VAT_ACCOUNTING_HELD","ORIGINAL_BUSINESSES_UNCHANGED"]'::jsonb;perform set_config('faraios.vat.qa.checks',checks::text,true);
end;$audit_and_hold$;
set local role anon;
do $anonymous$
declare denied boolean:=false;checks jsonb:=current_setting('faraios.vat.qa.checks')::jsonb;
begin
 begin perform public.configure_business_vat(current_setting('faraios.vat.qa.a')::uuid,3,false,null,null,'Anonymous denial QA',true);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous VAT write allowed';end if;
 checks:=checks||'["ANONYMOUS_WRITE_DENIED"]'::jsonb;perform set_config('faraios.vat.qa.checks',checks::text,true);
end;$anonymous$;
reset role;
select jsonb_build_object('environment','staging','checks',current_setting('faraios.vat.qa.checks')::jsonb,'passed',true,'fixtures','ROLLBACK_ONLY','existing_business_vat_enabled',false) verification;
rollback;
