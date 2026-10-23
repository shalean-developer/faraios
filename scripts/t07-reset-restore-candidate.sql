-- T07 only. Run solely through the connection bound to zrlojsvkqipuwkkyfrkn.
-- NEVER run on xdmfyrsauvqznkloroxg. This resets restored TEST data only.
-- Execute in a transaction. SET LOCAL applies before the DO begins.
-- Any failed assertion rolls everything back. No schema/object CASCADE is used.
-- Does not rotate provider credentials, deploy, or install application schema.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $t07_reset$
DECLARE
  r record;
  n bigint;
  table_list text;
  progress boolean;
  expected text[] := ARRAY['business_accounting_connections','business_catalogue','business_customers','business_invoices','business_memberships','business_quotes','business_settings','businesses','customer_addresses','identity_audit','one_off_bookings','quote_invoice_handoffs','recurring_schedules','staff_profiles','staff_teams'];
  actual text[];
BEGIN
  IF current_setting('lock_timeout')<>'5s' OR current_setting('statement_timeout')<>'30s' THEN
    RAISE EXCEPTION 'T07_TRANSACTION_TIMEOUT_CONFIGURATION_REQUIRED';
  END IF;
  IF NOT pg_try_advisory_xact_lock(70720261023) THEN RAISE EXCEPTION 'T07_RESET_ALREADY_RUNNING'; END IF;
  PERFORM set_config('search_path','pg_catalog',true);
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'T07_WRONG_DATABASE_OR_ACTOR';
  END IF;
  -- Freeze reviewed application tables and existing accounts during the reset.
  FOR r IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','audit') ORDER BY schemaname,tablename LOOP
    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE NOWAIT',r.schemaname,r.tablename);
  END LOOP;
  -- Provider-owned Auth schema history is read-only to postgres and is never reset.
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='auth' AND tablename<>'schema_migrations' ORDER BY tablename LOOP
    EXECUTE format('LOCK TABLE auth.%I IN ACCESS EXCLUSIVE MODE NOWAIT',r.tablename);
  END LOOP;
  -- Vault is inspected but not changed; its provider-owned table cannot be locked.
  LOCK TABLE supabase_migrations.schema_migrations,storage.objects,storage.buckets IN ACCESS EXCLUSIVE MODE NOWAIT;
  SELECT array_agg(tablename::text ORDER BY tablename) INTO actual FROM pg_tables WHERE schemaname='public';
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'T07_PUBLIC_INVENTORY_CHANGED'; END IF;
  SELECT array_agg(tablename::text ORDER BY tablename) INTO actual FROM pg_tables WHERE schemaname='audit';
  IF actual IS DISTINCT FROM ARRAY['cleaner_reservations','events']::text[] THEN RAISE EXCEPTION 'T07_AUDIT_INVENTORY_CHANGED'; END IF;
  IF (SELECT count(*) FROM auth.users)<>3 OR (SELECT count(*) FROM auth.sessions)<>59
     OR (SELECT count(*) FROM auth.refresh_tokens)<>59 OR (SELECT count(*) FROM auth.identities)<>3
     OR (SELECT count(*) FROM public.businesses)<>2 OR (SELECT count(*) FROM public.one_off_bookings)<>12
     OR (SELECT count(*) FROM public.business_customers)<>3 OR (SELECT count(*) FROM public.business_quotes)<>3
     OR (SELECT count(*) FROM public.business_invoices)<>2 OR (SELECT count(*) FROM supabase_migrations.schema_migrations)<>21 THEN
    RAISE EXCEPTION 'T07_DATA_INVENTORY_CHANGED';
  END IF;
  IF EXISTS(SELECT 1 FROM public.business_accounting_connections WHERE enabled OR environment<>'staging')
     OR EXISTS(SELECT 1 FROM storage.objects) OR EXISTS(SELECT 1 FROM storage.buckets)
     OR EXISTS(SELECT 1 FROM vault.secrets)
     OR EXISTS(SELECT 1 FROM pg_extension WHERE extname IN ('pg_cron','pg_net','http'))
     OR EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace s ON s.oid=e.extnamespace WHERE s.nspname IN ('public','audit')) THEN
    RAISE EXCEPTION 'T07_INTEGRATION_INVENTORY_CHANGED';
  END IF;
  -- Reject new Auth/provider material; never wipe unknown provider configuration.
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='auth'
    AND tablename NOT IN ('schema_migrations','users','sessions','refresh_tokens','identities','mfa_amr_claims') LOOP
    EXECUTE format('SELECT count(*) FROM auth.%I',r.tablename) INTO n;
    IF n<>0 THEN RAISE EXCEPTION 'T07_UNEXPECTED_AUTH_DATA'; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace s ON s.oid=c.relnamespace
     JOIN pg_class rc ON rc.oid=k.confrelid JOIN pg_namespace rs ON rs.oid=rc.relnamespace
     WHERE k.contype='f' AND rs.nspname IN ('public','audit') AND s.nspname NOT IN ('public','audit')) THEN
    RAISE EXCEPTION 'T07_EXTERNAL_TABLE_DEPENDENCY';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
     JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace ps ON ps.oid=p.pronamespace
     WHERE NOT t.tgisinternal AND s.nspname NOT IN ('public','audit') AND ps.nspname IN ('public','audit')) THEN
    RAISE EXCEPTION 'T07_EXTERNAL_TRIGGER_DEPENDENCY';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace s ON s.oid=c.relnamespace
     JOIN pg_class rc ON rc.oid=k.confrelid JOIN pg_namespace rs ON rs.oid=rc.relnamespace
     WHERE k.contype='f' AND rs.nspname='auth' AND s.nspname NOT IN ('public','audit','auth'))
     OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
     WHERE NOT t.tgisinternal AND s.nspname='auth') THEN
    RAISE EXCEPTION 'T07_UNREVIEWED_AUTH_CASCADE_OR_TRIGGER';
  END IF;
  -- Remove only application-owned triggers, constraints and defaults. RESTRICT
  -- refuses dependent objects elsewhere instead of removing them implicitly.
  FOR r IN SELECT s.nspname,c.relname,p.polname FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname IN ('public','audit') LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',r.polname,r.nspname,r.relname);
  END LOOP;
  FOR r IN SELECT s.nspname,c.relname,t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace s ON s.oid=c.relnamespace WHERE NOT t.tgisinternal AND s.nspname IN ('public','audit') LOOP
    EXECUTE format('DROP TRIGGER %I ON %I.%I RESTRICT',r.tgname,r.nspname,r.relname);
  END LOOP;
  FOR r IN SELECT s.nspname,c.relname,k.conname FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname IN ('public','audit') AND k.contype IN ('f','c') LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I RESTRICT',r.nspname,r.relname,r.conname);
  END LOOP;
  FOR r IN SELECT table_schema,table_name,column_name FROM information_schema.columns
    WHERE table_schema IN ('public','audit') AND column_default IS NOT NULL LOOP
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',r.table_schema,r.table_name,r.column_name);
  END LOOP;
  -- Dependency order is discovered by RESTRICT itself; no outside object is dropped.
  LOOP
    progress:=false;
    FOR r IN SELECT s.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace WHERE s.nspname IN ('public','audit') LOOP
      BEGIN
        EXECUTE format('DROP ROUTINE %I.%I(%s) RESTRICT',r.nspname,r.proname,r.args);
        progress:=true;
      EXCEPTION WHEN dependent_objects_still_exist THEN NULL;
      END;
    END LOOP;
    EXIT WHEN NOT progress;
  END LOOP;
  SELECT string_agg(format('%I.%I',schemaname,tablename),',' ORDER BY schemaname,tablename)
    INTO table_list FROM pg_tables WHERE schemaname IN ('public','audit');
  EXECUTE 'DROP TABLE '||table_list||' RESTRICT';
  -- Remaining views/types/routines or outside dependencies stop the reset atomically.
  DROP SCHEMA audit RESTRICT;
  DROP SCHEMA public RESTRICT;
  CREATE SCHEMA public AUTHORIZATION postgres;
  REVOKE ALL ON SCHEMA public FROM PUBLIC,anon,authenticated,service_role;
  DELETE FROM auth.sessions;
  DELETE FROM auth.refresh_tokens;
  DELETE FROM auth.users;
  DELETE FROM supabase_migrations.schema_migrations;
  -- This inaccessible marker prevents old restore code accepting an empty destination.
  CREATE TABLE public.t07_environment_guard (
    singleton boolean PRIMARY KEY CHECK(singleton),
    project_ref text NOT NULL CHECK(project_ref='zrlojsvkqipuwkkyfrkn'),
    environment text NOT NULL CHECK(environment='production-held'),
    reset_at timestamptz NOT NULL DEFAULT clock_timestamp()
  );
  INSERT INTO public.t07_environment_guard(singleton,project_ref,environment)
    VALUES(true,'zrlojsvkqipuwkkyfrkn','production-held');
  ALTER TABLE public.t07_environment_guard ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.t07_environment_guard FORCE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.t07_environment_guard FROM PUBLIC,anon,authenticated,service_role;
  IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM auth.sessions)
     OR EXISTS(SELECT 1 FROM auth.refresh_tokens) OR EXISTS(SELECT 1 FROM auth.identities)
     OR EXISTS(SELECT 1 FROM auth.mfa_amr_claims) OR to_regnamespace('audit') IS NOT NULL THEN
    RAISE EXCEPTION 'T07_RESET_POSTCHECK_FAILED';
  END IF;
END
$t07_reset$;
