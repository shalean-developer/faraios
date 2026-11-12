-- Rollback-only native hosted assertions. No mailbox sign-in or real outbound calls.
begin;
select set_config('faraios.test_business',(select business_id::text from public.business_profiles where environment='preview' limit 1),true);
select set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.test_business')::uuid),true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
do $$
declare bid uuid=current_setting('faraios.test_business')::uuid; d jsonb='{"currency":"ZAR","items":[{"id":"01234567890123456789012345678901","name":"Isolated service check","description":"Fictional test","duration":90,"mode":"fixed","amount":50525,"visible":true,"archived":false}]}';
begin
 if bid is null then raise exception 'Missing designated preview business';end if;
 perform public.business_services_save(bid,'preview',d,0);
 perform public.business_services_publish(bid,'preview',1);
 if not exists(select 1 from public.business_service_catalogues where business_id=bid and published->'items'->0->>'name'='Isolated service check') then raise exception 'Publication failed';end if;
 perform public.business_services_save(bid,'preview',jsonb_set(d,'{items,0,name}','"Private changed service"'),1);
 if exists(select 1 from public.business_public_pages where environment='preview' and services->'items'->0->>'name'='Private changed service') then raise exception 'Draft leaked';end if;
 begin perform public.business_services_publish(bid,'preview',1);raise exception 'Stale publish accepted';exception when others then if sqlerrm<>'Services changed. Reload before saving or publishing.' then raise;end if;end;
 perform public.business_services_save(bid,'preview',jsonb_set(d,'{items,0,archived}','true'),2);
 perform public.business_services_publish(bid,'preview',3);
 if exists(select 1 from public.business_service_catalogues where business_id=bid and jsonb_array_length(published->'items')<>0) then raise exception 'Archived service leaked';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.business_service_catalogues) then raise exception 'Other owner read draft';end if;
 begin perform public.business_services_publish(current_setting('faraios.test_business')::uuid,'preview',3);raise exception 'Other owner published';exception when others then if sqlerrm<>'Services changed. Reload before saving or publishing.' then raise;end if;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform draft from public.business_service_catalogues;raise exception 'Anon read draft';exception when insufficient_privilege then null;end;
 begin perform business_id from public.business_public_pages;raise exception 'Anon read private ID';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: native owner lifecycle, stale publish, archive, cross-owner and anon denial; rolled back' as result;
rollback;
select json_build_object('services_rls',(select relrowsecurity from pg_class where oid='public.business_service_catalogues'::regclass),'live_services',(select count(*) from public.business_service_catalogues where environment='live'),'live_profiles_published',(select count(*) from public.business_profiles where environment='live' and published_at is not null),'migration',(select version from supabase_migrations.schema_migrations where version='20261112215916')) as preserved;
