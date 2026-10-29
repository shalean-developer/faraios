-- Recovery-only, rollback-only synthetic actors against restored application RLS.
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';
SET LOCAL search_path='';
DO $t19_boundaries$
DECLARE
 a uuid:='0cc3f518-d64e-40c2-8817-bc14d1ef1420';
 b uuid:='612be091-b1d7-4911-9c3b-143446a9fe27';
 users uuid[]:=ARRAY[gen_random_uuid(),gen_random_uuid()];
 businesses uuid[]:=ARRAY[a,b];
 i integer; n integer; before_audit bigint; after_audit bigint;
BEGIN
 IF current_user<>'postgres' OR current_database()<>'postgres' THEN RAISE EXCEPTION 'RESTORE_BOUNDARY_ACTOR'; END IF;
 IF (SELECT count(*) FROM public.businesses WHERE id=ANY(businesses) AND status='active')<>2
 OR (SELECT count(*) FROM public.business_accounting_connections WHERE business_id=ANY(businesses) AND NOT enabled)<>2 THEN
  RAISE EXCEPTION 'RESTORE_BOUNDARY_CONTROLS_MISSING';
 END IF;
 FOR i IN 1..2 LOOP
  INSERT INTO auth.users(id,email) VALUES(users[i],'t19-restore-'||users[i]::text||'@example.invalid');
  PERFORM set_config('request.jwt.claim.sub',users[i]::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',users[i],'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.business_accounting_connections;
  IF n<>0 THEN RAISE EXCEPTION 'RESTORE_NONMEMBER_LEAK'; END IF;
  EXECUTE 'RESET ROLE';
  INSERT INTO public.business_memberships(business_id,user_id,role,status) VALUES(businesses[i],users[i],'owner','active');
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.business_accounting_connections WHERE business_id=businesses[i];
  IF n<>1 THEN RAISE EXCEPTION 'RESTORE_OWNER_CONTROL_FAILED'; END IF;
  SELECT count(*) INTO n FROM public.business_accounting_connections WHERE business_id=businesses[3-i];
  IF n<>0 THEN RAISE EXCEPTION 'RESTORE_FOREIGN_BUSINESS_LEAK'; END IF;
  BEGIN
   UPDATE public.business_accounting_connections SET enabled=true WHERE business_id=businesses[i];
   RAISE EXCEPTION 'RESTORE_CLIENT_WRITE_NOT_DENIED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO before_audit FROM audit.events;
  UPDATE public.business_accounting_connections SET version=version+1,last_actor=users[i],updated_at=clock_timestamp() WHERE business_id=businesses[i];
  SELECT count(*) INTO after_audit FROM audit.events;
  IF after_audit<>before_audit+1 THEN RAISE EXCEPTION 'RESTORE_AUDIT_NOT_RECORDED'; END IF;
  UPDATE public.business_memberships SET role='staff' WHERE business_id=businesses[i] AND user_id=users[i];
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.business_accounting_connections;
  IF n<>0 THEN RAISE EXCEPTION 'RESTORE_STAFF_LEAK'; END IF;
  EXECUTE 'RESET ROLE';
 END LOOP;
END;
$t19_boundaries$;
ROLLBACK;
SELECT 'T19_RESTORE_BOUNDARIES_ROLLED_BACK';
