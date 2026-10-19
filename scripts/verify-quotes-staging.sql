-- Rollback-only T18 acceptance. Run only on verified FaraiOS staging.
begin;
set local statement_timeout='30s';
do $qa$
declare owner_id uuid;manager_id uuid;manager_business uuid;staff_id uuid;r record;
 q uuid;k uuid;normal public.one_off_bookings;converted public.one_off_bookings;
 a jsonb;receipt jsonb;again jsonb;t timestamp;reason text:='T18 rollback-only acceptance';
 before_history text;after_history text;original_ids uuid[];v int;n int;tested int:=0;
begin
 select user_id into owner_id from public.business_memberships where role='owner' and status='active' group by user_id having count(*)=2 limit 1;
 select user_id,business_id into manager_id,manager_business from public.business_memberships where role='manager' and status='active' limit 1;
 select user_id into staff_id from public.business_memberships where role='staff' and status='active' limit 1;
 if owner_id is null or manager_id is null or staff_id is null then raise exception 'Missing acceptance roles';end if;
 select array_agg(id),md5(string_agg(to_jsonb(b)::text,',' order by id)) into original_ids,before_history from public.one_off_bookings b;
 for r in select * from public.one_off_bookings where status='completed' order by business_id loop
  execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',owner_id::text,true);
  k:=gen_random_uuid();
  q:=public.create_quote(r.business_id,k,r.customer_id,r.address_id,r.selection,r.cleaning_scope,r.duration_minutes);
  if public.create_quote(r.business_id,k,r.customer_id,r.address_id,r.selection,r.cleaning_scope,r.duration_minutes)<>q then raise exception 'Creation retry duplicated quote';end if;
  begin perform public.create_quote(r.business_id,k,r.customer_id,r.address_id,r.selection,r.cleaning_scope,r.duration_minutes+1);raise exception 'Conflicting creation allowed';exception when serialization_failure then null;end;
  select agreement into a from public.business_quotes where id=q;
  if a->'customer_snapshot' ? 'private_notes' then raise exception 'Private notes exposed';end if;
  t:=(now() at time zone (a->>'time_zone'))::date+1+time '09:00';
  -- Compare current quote rules with a current normal booking, not historic rates.
  insert into public.one_off_bookings(business_id,request_key,customer_id,address_id,selection,cleaning_scope,duration_minutes,local_start,hours_override_reason)
   values(r.business_id,gen_random_uuid(),r.customer_id,r.address_id,r.selection,r.cleaning_scope,r.duration_minutes,t,reason) returning * into normal;
  if (select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(normal)) where a ? key) is distinct from a then raise exception 'Quote/current booking parity failed';end if;
  begin perform public.convert_quote(r.business_id,q,1,t,reason);raise exception 'Draft quote converted';exception when raise_exception then if sqlerrm<>'Only an accepted quote can be converted' then raise;end if;end;
  perform public.change_quote(r.business_id,q,1,'issued',reason);
  begin perform public.change_quote(r.business_id,q,2,'accepted','');raise exception 'Empty acceptance allowed';exception when raise_exception then if sqlerrm<>'Record customer acceptance evidence' then raise;end if;end;
  perform public.change_quote(r.business_id,q,2,'accepted',reason);
  if not exists(select 1 from public.business_quotes where id=q and accepted_by=owner_id and accepted_at is not null) then raise exception 'Acceptance actor/time missing';end if;
  begin perform public.change_quote(r.business_id,q,2,'cancelled',reason);raise exception 'Stale quote changed';exception when serialization_failure then null;end;
  if r.business_id=manager_business then perform set_config('request.jwt.claim.sub',manager_id::text,true);end if;
  receipt:=public.convert_quote(r.business_id,q,3,t,reason);
  select * into converted from public.one_off_bookings where id=(receipt->>'booking_id')::uuid;
  if converted.status<>'draft' or cardinality(converted.assigned_staff)<>0 or converted.source_quote_id<>q or converted.recurring_schedule_id is not null then raise exception 'Conversion draft/source incorrect';end if;
  if (select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(converted)) where a ? key) is distinct from a then raise exception 'Accepted agreement changed';end if;
  if not exists(select 1 from public.quote_invoice_handoffs where id=(receipt->>'handoff_id')::uuid and business_id=r.business_id and quote_id=q and booking_id=converted.id) then raise exception 'Invoice handoff missing or foreign';end if;
  if public.convert_quote(r.business_id,q,3,t,reason) is distinct from receipt then raise exception 'Conversion retry differs';end if;
  begin perform public.convert_quote(r.business_id,q,3,t+interval '1 hour',reason);raise exception 'Conflicting conversion allowed';exception when serialization_failure then null;end;
  update public.one_off_bookings set local_start=local_start+interval '1 day',hours_override_reason=reason,change_reason=reason where id=converted.id;
  update public.one_off_bookings set status='cancelled',change_reason=reason where id=converted.id;
  if public.convert_quote(r.business_id,q,3,t,reason) is distinct from receipt then raise exception 'Cancelled booking recreated';end if;
  select count(*) into n from public.one_off_bookings where source_quote_id=q;if n<>1 then raise exception 'Duplicate booking';end if;
  select count(*) into n from public.quote_invoice_handoffs where quote_id=q;if n<>1 then raise exception 'Duplicate handoff';end if;
  begin update public.business_quotes set status='accepted' where id=q;raise exception 'Direct quote update allowed';exception when insufficient_privilege then null;end;
  begin delete from public.quote_invoice_handoffs where quote_id=q;raise exception 'Handoff delete allowed';exception when insufficient_privilege then null;end;
  begin update public.one_off_bookings set source_quote_id=null where id=converted.id;raise exception 'Source identity changed';exception when raise_exception then if sqlerrm<>'Source quote identity is immutable' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  if exists(select 1 from public.business_quotes where business_id=r.business_id) or exists(select 1 from public.quote_invoice_handoffs where business_id=r.business_id) then raise exception 'Staff quote/handoff read allowed';end if;
  begin perform public.convert_quote(r.business_id,q,3,t,reason);raise exception 'Staff retry allowed';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub',manager_id::text,true);
  if r.business_id<>manager_business then
   if exists(select 1 from public.business_quotes where id=q) then raise exception 'Foreign quote visible';end if;
   begin perform public.convert_quote(r.business_id,q,3,t,reason);raise exception 'Foreign conversion allowed';exception when insufficient_privilege then null;end;
  end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  -- Direct API insertion must freeze fields and finish the same atomic handoff.
  q:=public.create_quote(r.business_id,gen_random_uuid(),r.customer_id,r.address_id,r.selection,r.cleaning_scope,r.duration_minutes);
  perform public.change_quote(r.business_id,q,1,'issued',reason);perform public.change_quote(r.business_id,q,2,'accepted',reason);
  begin insert into public.one_off_bookings(business_id,source_quote_id,recurring_schedule_id,local_start) values(r.business_id,q,gen_random_uuid(),t);raise exception 'Mixed sources allowed';exception when raise_exception then if sqlerrm<>'A booking cannot combine quote and recurring sources' then raise;end if;end;
  insert into public.one_off_bookings(business_id,source_quote_id,local_start,hours_override_reason,status,total_cents,currency) values(r.business_id,q,t,reason,'completed',1,'USD') returning * into converted;
  if converted.status<>'draft' or converted.currency<>a->>'currency' or converted.total_cents<>(a->>'total_cents')::int then raise exception 'Forged API agreement accepted';end if;
  if not exists(select 1 from public.quote_invoice_handoffs where quote_id=q and booking_id=converted.id) then raise exception 'Direct API handoff missing';end if;
  receipt:=public.convert_quote(r.business_id,q,3,t,reason);if (receipt->>'booking_id')::uuid<>converted.id then raise exception 'Direct API conversion retry differs';end if;
  execute 'reset role';tested:=tested+1;
 end loop;
 if tested<>2 then raise exception 'Expected both business fixtures';end if;
 execute 'set local role anon';
 begin perform public.convert_quote(manager_business,q,3,t,reason);raise exception 'Anonymous conversion allowed';exception when insufficient_privilege then null;end;
 execute 'reset role';
 select md5(string_agg(to_jsonb(b)::text,',' order by id)) into after_history from public.one_off_bookings b where id=any(original_ids);
 if before_history<>after_history then raise exception 'Original booking history changed';end if;
 if (select count(*) from audit.events where entity_table='business_quotes')<16 or (select count(*) from audit.events where entity_table='quote_invoice_handoffs')<4 then raise exception 'Quote audit evidence missing';end if;
end;$qa$;
rollback;
select jsonb_build_object('bookings',(select count(*) from public.one_off_bookings),'booking_digest',(select md5(string_agg(to_jsonb(b)::text,',' order by id)) from public.one_off_bookings b),'quotes',(select count(*) from public.business_quotes),'handoffs',(select count(*) from public.quote_invoice_handoffs),'quote_audit',(select count(*) from audit.events where entity_table in ('business_quotes','quote_invoice_handoffs'))) cleanup;
