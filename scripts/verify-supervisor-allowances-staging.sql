-- Rollback-only acceptance. Run solely on faraios-staging xdmfyrsauvqznkloroxg.
-- Existing auth identities; disposable businesses only. No pay or provider calls.
begin;
set local statement_timeout='60s';
set local lock_timeout='5s';
create temporary table allowance_checks(name text primary key) on commit drop;
grant select,insert on allowance_checks to authenticated;
create function pg_temp.allowance_check(label text,ok boolean) returns void language plpgsql as $fn$
begin
 if ok is not true then raise exception 'Allowance acceptance failed: %',label;end if;
 insert into allowance_checks values(label);
end $fn$;
create function pg_temp.allowance_denied(label text,statement text,expected text) returns void language plpgsql as $fn$
declare denied boolean:=false;
begin
 begin execute statement;
 exception when others then
  if sqlstate<>expected then raise exception 'Unexpected rejection for %: %',label,sqlstate;end if;
  denied:=true;
 end;
 perform pg_temp.allowance_check(label,denied);
end $fn$;
do $setup$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();o uuid;m uuid;s uuid;
begin
 if to_regclass('public.supervisor_allowance_changes') is null then raise exception 'Apply the allowance migration first';end if;
 if (select count(*) from public.businesses)<>2 or not exists(select 1 from public.businesses where id='612be091-b1d7-4911-9c3b-143446a9fe27') or not exists(select 1 from public.businesses where id='0cc3f518-d64e-40c2-8817-bc14d1ef1420') then raise exception 'Unexpected staging business scope';end if;
 if exists(select 1 from public.business_accounting_connections where enabled) or exists(select 1 from public.supervisor_allowance_changes) then raise exception 'Expected no active accounting or saved allowances';end if;
 select user_id into o from public.business_memberships where role='owner' and status='active' limit 1;
 select x.user_id into m from public.business_memberships x join auth.users u on u.id=x.user_id where x.role='manager' and x.status='active' and u.email like '%.test' limit 1;
 select x.user_id into s from public.business_memberships x join auth.users u on u.id=x.user_id where x.role='staff' and x.status='active' and u.email like '%.test' limit 1;
 if o is null or m is null or s is null or o=m or m=s or o=s then raise exception 'Required existing QA identities unavailable';end if;
 perform set_config('faraios.allowance.qa.a',a::text,true);perform set_config('faraios.allowance.qa.b',b::text,true);
 perform set_config('faraios.allowance.qa.owner',o::text,true);perform set_config('faraios.allowance.qa.manager',m::text,true);perform set_config('faraios.allowance.qa.staff',s::text,true);
 insert into public.businesses(id,name,industry) values(a,'T04_ALLOWANCE_QA_A','cleaning'),(b,'T04_ALLOWANCE_QA_B','cleaning');
 insert into public.business_memberships(business_id,user_id,role) values(a,o,'owner'),(a,m,'manager'),(a,s,'staff'),(b,m,'owner'),(b,s,'staff');
 -- Set a non-default business zone to exercise server-side calendar boundaries.
 insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values(a,'Synthetic',array[1,2,3,4,5]::smallint[],'08:00','17:00','Africa/Johannesburg');
end $setup$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('faraios.allowance.qa.owner'),true);
do $owner$
declare a uuid:=current_setting('faraios.allowance.qa.a')::uuid;b uuid:=current_setting('faraios.allowance.qa.b')::uuid;s uuid:=current_setting('faraios.allowance.qa.staff')::uuid;c jsonb;n date;later date;
begin
 c:=public.supervisor_allowance_context(a);n:=(c->>'next_month')::date;later:=(n+interval '1 month')::date;
 perform set_config('faraios.allowance.qa.next',n::text,true);
 perform pg_temp.allowance_check('DEFAULT_OFF',(select count(*)=0 from public.supervisor_allowance_changes));
 perform pg_temp.allowance_check('BUSINESS_CALENDAR',c->>'time_zone'='Africa/Johannesburg' and n=(date_trunc('month',now() at time zone 'Africa/Johannesburg')+interval '1 month')::date);
 perform pg_temp.allowance_denied('CURRENT_MONTH_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,true,50000,%L,%L)',a,s,c->>'current_month','Synthetic'),'P0001');
 perform pg_temp.allowance_denied('MID_MONTH_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,true,50000,%L,%L)',a,s,n+1,'Synthetic'),'P0001');
 perform pg_temp.allowance_denied('ZERO_ON_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,true,0,%L,%L)',a,s,n,'Synthetic'),'P0001');
 perform pg_temp.allowance_denied('OFF_AMOUNT_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,false,1,%L,%L)',a,s,n,'Synthetic'),'P0001');
 perform pg_temp.allowance_denied('MISSING_REASON_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,true,50000,%L,%L)',a,s,n,''),'P0001');
 perform pg_temp.allowance_denied('FOREIGN_BUSINESS_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,true,50000,%L,%L)',b,s,n,'Synthetic'),'42501');
 perform pg_temp.allowance_denied('NON_STAFF_RECIPIENT_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,true,50000,%L,%L)',a,current_setting('faraios.allowance.qa.owner'),n,'Synthetic'),'P0001');
 perform pg_temp.allowance_check('OWNER_ON',public.configure_supervisor_allowance(a,s,0,true,50000,n,'Synthetic agreed monthly allowance')=1);
 perform pg_temp.allowance_denied('STALE_SAVE_DENIED',format('select public.configure_supervisor_allowance(%L,%L,0,false,0,%L,%L)',a,s,n,'Synthetic'),'40001');
 perform pg_temp.allowance_check('OWNER_OFF_FUTURE',public.configure_supervisor_allowance(a,s,1,false,0,later,'Synthetic future stop')=2);
 perform pg_temp.allowance_check('EARLIER_RECORD_PRESERVED',(select count(*)=1 from public.supervisor_allowance_changes where business_id=a and user_id=s and version=1 and enabled and amount_cents=50000 and effective_month=n));
 perform pg_temp.allowance_denied('DIRECT_INSERT_DENIED','insert into public.supervisor_allowance_changes select * from public.supervisor_allowance_changes','42501');
 perform pg_temp.allowance_denied('DIRECT_UPDATE_DENIED','update public.supervisor_allowance_changes set amount_cents=0','42501');
 perform pg_temp.allowance_denied('DIRECT_DELETE_DENIED','delete from public.supervisor_allowance_changes','42501');
 perform pg_temp.allowance_check('AUDIT_ATTRIBUTION',(select count(*)=2 and bool_and(actor_user_id=auth.uid()) from audit.events where business_id=a and entity_table='supervisor_allowance_changes'));
 perform pg_temp.allowance_check('AUDIT_BEFORE_AFTER',(select (old_record->>'version')::int=1 and (new_record->>'enabled')::boolean=false from audit.events where business_id=a and entity_table='supervisor_allowance_changes' and (new_record->>'version')::int=2));
end $owner$;
select set_config('request.jwt.claim.sub',current_setting('faraios.allowance.qa.manager'),true);
do $manager$
declare a uuid:=current_setting('faraios.allowance.qa.a')::uuid;b uuid:=current_setting('faraios.allowance.qa.b')::uuid;s uuid:=current_setting('faraios.allowance.qa.staff')::uuid;n date:=current_setting('faraios.allowance.qa.next')::date;
begin
 perform pg_temp.allowance_check('MANAGER_READ',(select count(*)=2 from public.supervisor_allowance_changes where business_id=a));
 perform pg_temp.allowance_check('MANAGER_CONTEXT',public.supervisor_allowance_context(a)->>'business_id'=a::text);
 perform pg_temp.allowance_denied('MANAGER_WRITE_DENIED',format('select public.configure_supervisor_allowance(%L,%L,2,true,60000,%L,%L)',a,s,n,'Synthetic'),'42501');
 perform pg_temp.allowance_check('SHARED_STAFF_BUSINESS_DEFAULT_OFF',(select count(*)=0 from public.supervisor_allowance_changes where business_id=b));
 perform pg_temp.allowance_check('OTHER_BUSINESS_INDEPENDENT',public.configure_supervisor_allowance(b,s,0,true,10000,n,'Synthetic other business')=1);
end $manager$;
select set_config('request.jwt.claim.sub',current_setting('faraios.allowance.qa.staff'),true);
do $staff$
declare a uuid:=current_setting('faraios.allowance.qa.a')::uuid;s uuid:=current_setting('faraios.allowance.qa.staff')::uuid;n date:=current_setting('faraios.allowance.qa.next')::date;
begin
 perform pg_temp.allowance_check('STAFF_HISTORY_DENIED',(select count(*)=0 from public.supervisor_allowance_changes));
 perform pg_temp.allowance_denied('STAFF_CONTEXT_DENIED',format('select public.supervisor_allowance_context(%L)',a),'42501');
 perform pg_temp.allowance_denied('STAFF_WRITE_DENIED',format('select public.configure_supervisor_allowance(%L,%L,2,true,60000,%L,%L)',a,s,n,'Synthetic'),'42501');
end $staff$;
reset role;
-- Fail the audit to prove source insert and event are one transaction.
create function pg_temp.reject_allowance_audit() returns trigger language plpgsql as $fn$
begin if new.entity_table='supervisor_allowance_changes' then raise exception 'Synthetic audit failure';end if;return new;end $fn$;
create trigger qa_allowance_audit_failure before insert on audit.events for each row execute function pg_temp.reject_allowance_audit();
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('faraios.allowance.qa.owner'),true);
do $atomic$
declare a uuid:=current_setting('faraios.allowance.qa.a')::uuid;s uuid:=current_setting('faraios.allowance.qa.staff')::uuid;n date:=current_setting('faraios.allowance.qa.next')::date;
begin
 perform pg_temp.allowance_denied('AUDIT_FAILURE_ROLLS_BACK',format('select public.configure_supervisor_allowance(%L,%L,2,true,60000,%L,%L)',a,s,n,'Synthetic'),'P0001');
 perform pg_temp.allowance_check('NO_PARTIAL_REVISION',(select count(*)=2 from public.supervisor_allowance_changes where business_id=a));
 perform pg_temp.allowance_check('FOREIGN_ROWS_HIDDEN',(select count(*)=0 from public.supervisor_allowance_changes where business_id=current_setting('faraios.allowance.qa.b')::uuid));
end $atomic$;
reset role;
drop trigger qa_allowance_audit_failure on audit.events;
update public.business_memberships set status='suspended' where business_id=current_setting('faraios.allowance.qa.a')::uuid and user_id=current_setting('faraios.allowance.qa.staff')::uuid;
set local role authenticated;
select pg_temp.allowance_denied('INACTIVE_RECIPIENT_DENIED',format('select public.configure_supervisor_allowance(%L,%L,2,true,60000,%L,%L)',current_setting('faraios.allowance.qa.a'),current_setting('faraios.allowance.qa.staff'),current_setting('faraios.allowance.qa.next'),'Synthetic'),'P0001');
reset role;
update public.business_memberships set status='suspended' where business_id=current_setting('faraios.allowance.qa.a')::uuid and user_id=current_setting('faraios.allowance.qa.owner')::uuid;
set local role authenticated;
select pg_temp.allowance_denied('SUSPENDED_OWNER_DENIED',format('select public.configure_supervisor_allowance(%L,%L,2,true,60000,%L,%L)',current_setting('faraios.allowance.qa.a'),current_setting('faraios.allowance.qa.staff'),current_setting('faraios.allowance.qa.next'),'Synthetic'),'42501');
reset role;
set local role anon;
do $anon$
declare denied boolean:=false;
begin
 begin perform public.supervisor_allowance_context(current_setting('faraios.allowance.qa.a')::uuid);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous context unexpectedly allowed';end if;
end $anon$;
reset role;
select jsonb_build_object('checks',count(*),'passed',jsonb_agg(name order by name),'anonymous_context','DENIED','cleanup','ROLLBACK_NEXT') as acceptance from allowance_checks;
rollback;
