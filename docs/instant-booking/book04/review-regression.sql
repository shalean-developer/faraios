-- Run on the isolated checkout preview with the Bokkie synthetic offer. Rolls back.
begin;
do $test$
declare
  merchant constant text := 'bokkie-book05';
  offer record;
  day date;
  start_at timestamptz;
  options jsonb;
  quote jsonb;
  contact jsonb;
  attempt uuid := gen_random_uuid();
  response jsonb;
  held jsonb;
begin
  select * into strict offer from instant_private.config(merchant);
  select jsonb_agg(jsonb_build_object('id',item->>'id','quantity',
    greatest((item->>'minimum')::int,case item->>'kind' when 'bedrooms' then 2 when 'bathrooms' then 1 else 0 end)))
    into options from jsonb_array_elements(offer.service->'options') item;
  for offset_days in 1..30 loop
    day := (now() at time zone 'Africa/Johannesburg')::date + offset_days;
    quote := instant_private.slots(merchant,offer.service->>'id',offer.areas[1],options,day);
    if jsonb_array_length(quote->'times')>0 then
      start_at := (day + (quote#>>'{times,0}')::time) at time zone 'Africa/Johannesburg';
      exit;
    end if;
  end loop;
  if start_at is null then raise exception 'Fixture needs a free synthetic slot.'; end if;
  contact := jsonb_build_object('name','BOOK04 rollback fixture','email','book05@example.com',
    'phone','','notes','','review_business',offer.bid,'review_version','previous-price-snapshot');
  response := instant_private.reserve(attempt,merchant,offer.service->>'id',offer.areas[1],options,start_at,
    (quote->>'total')::int,(quote->>'minutes')::int,contact,'10 Example Street');
  if response is distinct from '{"changed":true}'::jsonb or exists(select from instant_private.holds where reference=attempt)
    then raise exception 'A stale price snapshot created a hold.'; end if;

  contact := contact || jsonb_build_object('review_version',quote->>'version');
  held := instant_private.reserve(attempt,merchant,offer.service->>'id',offer.areas[1],options,start_at,
    (quote->>'total')::int,(quote->>'minutes')::int,contact,'10 Example Street');
  response := instant_private.reserve(attempt,merchant,offer.service->>'id',offer.areas[1],options,start_at,
    (quote->>'total')::int,(quote->>'minutes')::int,contact,'10 Example Street');
  if response is distinct from held or not(held ? 'expires') then raise exception 'Retry changed the hold.'; end if;
  response := instant_private.release_unpaid(attempt,merchant);
  if response is distinct from '{"released":true}'::jsonb then raise exception 'Unpaid hold could not be released.'; end if;
  if exists(select from instant_private.holds where reference=attempt and (expires_at>clock_timestamp() or booking_id is not null or payment_method is not null))
    then raise exception 'Release left capacity or a payment attached.'; end if;
  if instant_private.worker(merchant,start_at,(quote->>'minutes')::int,null) is null then raise exception 'Released capacity was not recovered.'; end if;
end $test$;
rollback;
select 'BOOK04 preview regression passed' as result;