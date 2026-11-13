-- Rollback-only native role probes in fresh FaraiOS, with simulated JWT identities.
begin;
select set_config('faraios.invoice_bid',(select id::text from public.businesses where name='FaraiOS Preview Test Business'),true);
select set_config('request.jwt.claim.sub',(select owner_id::text from public.businesses where id=current_setting('faraios.invoice_bid')::uuid),true),set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
do $$declare bid uuid=current_setting('faraios.invoice_bid')::uuid;i uuid=gen_random_uuid();p uuid=gen_random_uuid();r uuid=gen_random_uuid();c text;d jsonb;doc jsonb;denied boolean;begin
 select coalesce((select draft->>'currency' from public.business_service_catalogues where business_id=bid and environment='preview'),'ZAR') into c;
 doc=jsonb_build_object('name','Rollback Invoice Probe','email','probe@example.test','phone','','notes','Rollback only','currency',c,'items',jsonb_build_array(jsonb_build_object('name','Test service','quantity',2,'price',25000)));
 perform public.business_invoice_write(bid,'preview',i,0,'save',doc,current_date+14);
 perform public.business_invoice_write(bid,'preview',i,1,'issue');
 if not exists(select 1 from public.business_invoice_list where id=i and total=50000 and balance=50000 and status='Unpaid') then raise exception 'FAIL invoice calculation';end if;
 perform public.business_invoice_payment(bid,'preview',i,p,20000,current_date,'ROLLBACK payment');
 perform public.business_invoice_payment(bid,'preview',i,p,20000,current_date,'ROLLBACK payment');
 if (select count(*) from public.business_invoice_payments where invoice_id=i)<>1 or not exists(select 1 from public.business_invoice_list where id=i and balance=30000 and status='Part Paid') then raise exception 'FAIL idempotency';end if;
 denied=false;begin perform public.business_invoice_payment(bid,'preview',i,gen_random_uuid(),40000,current_date,'Overpayment');exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL overpayment';end if;
 perform public.business_invoice_payment(bid,'preview',i,r,20000,current_date,'ROLLBACK payment',p,'Rollback correction');
 perform public.business_invoice_write(bid,'preview',i,4,'void',null,null,null,'Rollback void test');
 if not exists(select 1 from public.business_invoice_list where id=i and status='Void' and paid=0) then raise exception 'FAIL void';end if;
 denied=false;begin update public.business_invoice_payments set amount=1 where invoice_id=i;exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL direct DML';end if;
 denied=false;begin perform public.business_invoice_write(bid,'live',gen_random_uuid(),0,'save',doc,current_date+14);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL live disabled';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','ffffffff-ffff-ffff-ffff-ffffffffffff',true);
set local role authenticated;
do $$declare denied boolean=false;begin
 if exists(select 1 from public.business_invoices) or exists(select 1 from public.business_invoice_payments) or exists(select 1 from public.business_invoice_events) or exists(select 1 from public.business_invoice_list) then raise exception 'FAIL cross tenant read';end if;
 begin perform public.business_invoice_write(current_setting('faraios.invoice_bid')::uuid,'preview',gen_random_uuid(),0,'save','{}',current_date);exception when raise_exception then denied=true;end;if not denied then raise exception 'FAIL cross tenant write';end if;
end$$;
reset role;
set local role anon;
do $$declare denied boolean=false;begin
 begin perform * from public.business_invoices;exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL anon read';end if;
 if public.business_invoice_customer('preview',repeat('f',64))<>'{}'::jsonb then raise exception 'FAIL invalid token';end if;
 denied=false;begin perform public.business_invoice_payment(null,null,null,null,1,current_date,'denied');exception when insufficient_privilege then denied=true;end;if not denied then raise exception 'FAIL anon payment';end if;
end$$;
reset role;
rollback;
select 'PASS: invoices hosted rollback probes' as result;
