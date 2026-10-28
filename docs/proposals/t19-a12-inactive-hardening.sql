-- REVIEWED CANDIDATE ONLY. Separate exact owner approval before hosted apply.
-- Target control-plane ID xdmfyrsauvqznkloroxg must be verified outside SQL.
-- Inactive private schema only; no Vault, public tables, logins or runtime RPCs.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
DO $guard$
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR current_database()<>'postgres'
    OR current_setting('server_version_num')::integer<170000
 THEN RAISE EXCEPTION 'INACTIVE_HARDENING_EXECUTOR_MISMATCH' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='t19_hosted_custody'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole)
   OR EXISTS(SELECT FROM pg_roles WHERE rolname='t19_runtime_owner')
   OR EXISTS(SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='private_t19_custody')
   OR (SELECT array_agg(c.relname::text ORDER BY c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='private_t19_custody' AND c.relkind IN ('r','p'))
     IS DISTINCT FROM ARRAY['connections','operations','prepared_references']::text[]
   OR EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='private_t19_custody' AND c.relkind IN ('r','p')
       AND pg_get_userbyid(c.relowner)<>'postgres')
   OR EXISTS(SELECT FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private_t19_custody')
 THEN RAISE EXCEPTION 'INACTIVE_HARDENING_BASELINE_CHANGED' USING ERRCODE='55000';END IF;
END $guard$;
LOCK TABLE private_t19_custody.connections,private_t19_custody.operations,
 private_t19_custody.prepared_references IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $empty$
BEGIN
 IF EXISTS(SELECT FROM private_t19_custody.connections)
   OR EXISTS(SELECT FROM private_t19_custody.operations)
   OR EXISTS(SELECT FROM private_t19_custody.prepared_references)
 THEN RAISE EXCEPTION 'INACTIVE_HARDENING_NOT_EMPTY' USING ERRCODE='55000';END IF;
END $empty$;
ALTER TABLE private_t19_custody.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_t19_custody.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_t19_custody.prepared_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA private_t19_custody FROM PUBLIC,anon,authenticated,service_role,t19_hosted_custody;
REVOKE ALL ON TABLE private_t19_custody.connections,private_t19_custody.operations,
 private_t19_custody.prepared_references FROM PUBLIC,anon,authenticated,service_role,t19_hosted_custody;
DO $verify$
DECLARE r record;t record;privilege text;
BEGIN
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='private_t19_custody' AND c.relkind IN ('r','p') AND c.relrowsecurity)<>3
 THEN RAISE EXCEPTION 'INACTIVE_HARDENING_RLS_FAILED';END IF;
 FOR r IN SELECT oid,rolname FROM pg_roles WHERE rolname IN
   ('anon','authenticated','service_role','t19_hosted_custody') LOOP
  IF has_schema_privilege(r.oid,'private_t19_custody','USAGE')
     OR has_schema_privilege(r.oid,'private_t19_custody','CREATE')
  THEN RAISE EXCEPTION 'INACTIVE_HARDENING_SCHEMA_GRANT_REMAINS';END IF;
  FOR t IN SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private_t19_custody' AND c.relkind IN ('r','p') LOOP
   FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
    IF has_table_privilege(r.oid,t.oid,privilege)
    THEN RAISE EXCEPTION 'INACTIVE_HARDENING_TABLE_GRANT_REMAINS';END IF;
   END LOOP;
  END LOOP;
 END LOOP;
END $verify$;
COMMIT;
