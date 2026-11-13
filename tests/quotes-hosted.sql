-- Fresh Supabase only. Simulated JWT identities, not two browser-authenticated owners.
begin;
select set_config('faraios.quote_bid',(select id::text from public.businesses order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.quote_bid')::uuid),true),set_config('request.jwt.claims','{"is_anonymous":false}',true);
select set_config('faraios.quote_doc',jsonb_build_object('name','Rollback Quote Customer','email','rollback-quote@example.test','phone','','notes','Fictional rollback only','currency',coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=current_setting('faraios.quote_bid')::uuid and environment='preview'),'ZAR'),'items',jsonb_build_array(jsonb_build_object('name','Test service','quantity',2,'price',50000)))::text,true);
set local role authenticated;
select public.business_quote_write(current_setting('faraios.quote_bid')::uuid,'preview','acbb7d53-73d4-4d77-962d-b80d4b23de11',0,'save',current_setting('faraios.quote_doc')::jsonb,current_date+14,null);
do $$declare denied boolean=false;begin
 if not exists(select 1 from public.business_quotes where id='acbb7d53-73d4-4d77-962d-b80d4b23de11' and status='Draft' and share_token is null) then raise exception 'FAIL draft';end if;
 begin update public.business_quotes set status='Accepted';exception when insufficient_privilege then denied=true;end;
 if not denied then raise exception 'FAIL direct update';end if;
 denied=false;
 begin perform public.business_quote_write(current_setting('faraios.quote_bid')::uuid,'preview','acbb7d53-73d4-4d77-962d-b80d4b23de11',0,'save',current_setting('faraios.quote_doc')::jsonb,current_date+14,null);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL stale';end if;
end$$;
reset role;
select set_config('faraios.quote_owner',current_setting('request.jwt.claim.sub'),true),set_config('request.jwt.claim.sub','ffffffff-ffff-ffff-ffff-ffffffffffff',true);
set local role authenticated;
do $$declare denied boolean=false;begin
 if exists(select 1 from public.business_quotes where id='acbb7d53-73d4-4d77-962d-b80d4b23de11') then raise exception 'FAIL cross owner read';end if;
 begin perform public.business_quote_write(current_setting('faraios.quote_bid')::uuid,'preview','acbb7d53-73d4-4d77-962d-b80d4b23de11',1,'send',null,null,null);exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL cross owner send';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('faraios.quote_owner'),true);
set local role authenticated;
select public.business_quote_write(current_setting('faraios.quote_bid')::uuid,'preview','acbb7d53-73d4-4d77-962d-b80d4b23de11',1,'send',null,null,null);
select set_config('faraios.quote_token',(select share_token from public.business_quotes where id='acbb7d53-73d4-4d77-962d-b80d4b23de11'),true);
set local role anon;
do $$declare r jsonb;denied boolean=false;begin
 begin perform count(*) from public.business_quotes;exception when insufficient_privilege then denied=true;end;
 if not denied then raise exception 'FAIL anon table read';end if;
 if public.business_quote_customer('preview',repeat('0',64))<>'{}'::jsonb or public.business_quote_customer('live',current_setting('faraios.quote_token'))<>'{}'::jsonb then raise exception 'FAIL invalid token/environment';end if;
 r=public.business_quote_customer('preview',current_setting('faraios.quote_token'));
 if r->>'status'<>'Sent' or r ? 'business_id' or r ? 'enquiry_id' or r ? 'share_token' then raise exception 'FAIL public allowlist';end if;
 r=public.business_quote_customer('preview',current_setting('faraios.quote_token'),'Accepted');
 if r->>'status'<>'Accepted' then raise exception 'FAIL accept';end if;
 denied=false;begin perform public.business_quote_customer('preview',current_setting('faraios.quote_token'),'Declined');exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL second response';end if;
end$$;
reset role;
update public.business_quotes set status='Sent',expires_on=current_date-1 where id='acbb7d53-73d4-4d77-962d-b80d4b23de11';
set local role anon;
do $$declare denied boolean=false;begin
 if public.business_quote_customer('preview',current_setting('faraios.quote_token'))->>'status'<>'Expired' then raise exception 'FAIL expiry';end if;
 begin perform public.business_quote_customer('preview',current_setting('faraios.quote_token'),'Accepted');exception when raise_exception then denied=true;end;
 if not denied then raise exception 'FAIL expired accepted';end if;
end$$;
reset role;
rollback;
select 'PASS: rollback-only quote drafts, send, accept, immutable response, expiry, anonymous/cross-owner denial and environment separation' as result;
