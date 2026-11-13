-- Fresh project only. Native role probes use simulated JWT claims; all test records roll back.
begin;
select set_config('faraios.test_bid',(select business_id::text from public.business_public_pages where environment='preview' and slug='faraios-demo-cleaning'),true);
select set_config('faraios.test_owner',(select owner_id::text from public.businesses where id=current_setting('faraios.test_bid')::uuid),true);
select set_config('faraios.test_other',coalesce((select owner_id::text from public.businesses where id<>current_setting('faraios.test_bid')::uuid limit 1),'ffffffff-ffff-ffff-ffff-ffffffffffff'),true);
set local role anon;
select public.business_enquiry_submit('preview','faraios-demo-cleaning','33333333333333333333333333333333','Rollback Test','rollback-enquiry@example.test','','Fictional rollback-only quote request.','a8198091-3dd4-42b5-a0d2-c8e58c745aa2');
select public.business_enquiry_submit('preview','faraios-demo-cleaning','33333333333333333333333333333333','Rollback Test','rollback-enquiry@example.test','','Fictional rollback-only quote request.','a8198091-3dd4-42b5-a0d2-c8e58c745aa2');
do $$declare denied boolean=false;begin
 begin perform count(*) from public.business_enquiries;exception when insufficient_privilege then denied=true;end;
 if not denied then raise exception 'FAIL: anon can read enquiries';end if;
 denied=false;begin perform public.business_enquiry_submit('preview','faraios-demo-cleaning','ffffffffffffffffffffffffffffffff','Rollback Test','rollback-enquiry@example.test','','Fictional invalid-service enquiry.','2f0e449b-5874-40a9-9131-70aadf4ef4db');exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL: private service accepted';end if;
 denied=false;begin perform public.business_enquiry_submit('live','shalean-cleaning','','Rollback Test','rollback-enquiry@example.test','','Fictional live disabled enquiry.','2f0e449b-5874-40a9-9131-70aadf4ef4db');exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL: live intake accepted';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('faraios.test_owner'),true),set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
do $$declare r public.business_enquiries;denied boolean=false;begin
 select * into r from public.business_enquiries where request_id='a8198091-3dd4-42b5-a0d2-c8e58c745aa2';
 if not found or r.service_name<>'Office cleaning' or (select count(*) from public.business_enquiries where request_id=r.request_id)<>1 then raise exception 'FAIL: owner read/service snapshot/idempotency';end if;
 perform public.business_enquiry_status(r.business_id,'preview',r.id,'Contacted',1);
 if not exists(select 1 from public.business_enquiries where id=r.id and status='Contacted' and version=2) then raise exception 'FAIL: contacted status';end if;
 perform public.business_enquiry_status(r.business_id,'preview',r.id,'Closed',2);
 begin perform public.business_enquiry_status(r.business_id,'preview',r.id,'New',1);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL: stale status accepted';end if;
 denied=false;begin update public.business_enquiries set email='forged@example.test' where id=r.id;exception when insufficient_privilege then denied=true;end;
 if not denied then raise exception 'FAIL: customer fields mutable';end if;
 perform set_config('faraios.test_eid',r.id::text,true);
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('faraios.test_other'),true);
set local role authenticated;
do $$declare denied boolean=false;begin
 if exists(select 1 from public.business_enquiries where id=current_setting('faraios.test_eid')::uuid) then raise exception 'FAIL: cross-owner read';end if;
 begin perform public.business_enquiry_status(current_setting('faraios.test_bid')::uuid,'preview',current_setting('faraios.test_eid')::uuid,'New',3);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL: cross-owner status';end if;
end$$;
reset role;
rollback;
select 'PASS: rollback-only enquiry intake, service validation, idempotency, owner statuses, stale/cross-owner/anonymous denial; live intake disabled' as result;
