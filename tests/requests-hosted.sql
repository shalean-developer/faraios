-- Rollback-only native roles and lifecycle; simulated JWTs, no real second-login claim.
begin;
select set_config('request.jwt.claim.sub',b.owner_id::text,true),set_config('request.jwt.claims','{"is_anonymous":false}',true),set_config('faraios.probe_business',b.id::text,true) from public.businesses b join public.business_public_pages p on p.business_id=b.id where p.environment='preview' and p.slug='faraios-demo-cleaning';
set local role anon;
do $$
declare s jsonb;
begin
 select services->'items'->0 into s from public.business_public_pages where environment='preview' and slug='faraios-demo-cleaning';
 perform public.business_booking_request_submit('preview','faraios-demo-cleaning',s->>'id','Fictional Rollback Request','rollback-request@example.test','','Rollback-only native permission probe.', '1934ee07-7404-400c-9c3d-49ece66f952e','999 Fictional Rollback Road',timestamp '2090-01-20 10:30','Africa/Johannesburg','ZAR',s);
 perform public.business_booking_request_submit('preview','faraios-demo-cleaning',s->>'id','Fictional Rollback Request','rollback-request@example.test','','Rollback-only native permission probe.', '1934ee07-7404-400c-9c3d-49ece66f952e','999 Fictional Rollback Road',timestamp '2090-01-20 10:30','Africa/Johannesburg','ZAR',s);
 begin perform id from public.business_booking_requests;raise exception 'ASSERT anon read allowed';exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;
do $$
declare bid uuid=current_setting('faraios.probe_business')::uuid;rid uuid;outcome jsonb;again jsonb;
begin
 select id into strict rid from public.business_enquiries where request_id='1934ee07-7404-400c-9c3d-49ece66f952e';
 if (select count(*) from public.business_booking_requests where id=rid)<>1 then raise exception 'ASSERT duplicate';end if;
 begin update public.business_booking_requests set status='Accepted' where id=rid;raise exception 'ASSERT direct write allowed';exception when insufficient_privilege then null;end;
 begin perform public.business_booking_request_action(bid,'preview',rid,1,'convert');raise exception 'ASSERT premature conversion';exception when raise_exception then if sqlerrm like 'ASSERT%' then raise;end if;end;
 perform public.business_booking_request_action(bid,'preview',rid,1,'accept');
 outcome=public.business_booking_request_action(bid,'preview',rid,2,'convert');again=public.business_booking_request_action(bid,'preview',rid,2,'convert');
 if outcome<>again or (select document->'items'->0->>'price' from public.business_bookings where id=(outcome->>'booking_id')::uuid)<>'50500' then raise exception 'ASSERT conversion mismatch';end if;
 perform set_config('faraios.probe_request',rid::text,true);
end$$;
select set_config('request.jwt.claim.sub','5d2511b9-d008-43b6-a512-a1fd1939a319',true);
do $$
begin
 if exists(select 1 from public.business_booking_requests where id=current_setting('faraios.probe_request')::uuid) then raise exception 'ASSERT cross-owner read';end if;
 begin perform public.business_booking_request_action(current_setting('faraios.probe_business')::uuid,'preview',current_setting('faraios.probe_request')::uuid,3,'convert');raise exception 'ASSERT cross-owner conversion';exception when raise_exception then if sqlerrm like 'ASSERT%' then raise;end if;end;
end$$;
reset role;
select 'PASS rollback-only request lifecycle, idempotency, permissions and business isolation' as result;
rollback;
