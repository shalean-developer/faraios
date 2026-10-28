-- SOURCE CANDIDATE ONLY. Never apply to staging or the protected restore project.
-- Caller must first verify one approved, isolated disposable Docker destination.
-- Restores EMPTY INACTIVE custody only; not operational custody or backup data.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
DO $guard$
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
    OR current_setting('server_version_num')::int<170000
    OR current_setting('faraios.t19_restore_candidate',true)
       IS DISTINCT FROM 'isolated-disposable-reviewed'
    OR to_regnamespace('private_t19_custody') IS NOT NULL
    OR EXISTS(SELECT FROM pg_roles WHERE rolname IN
       ('t19_hosted_custody','t19_runtime_owner'))
    OR (SELECT count(*) FROM pg_roles WHERE rolname IN
       ('anon','authenticated','service_role'))<>3
 THEN RAISE EXCEPTION 'CUSTODY_RECOVERY_DESTINATION_REFUSED' USING ERRCODE='55000'; END IF;
END $guard$;
CREATE ROLE t19_hosted_custody NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT t19_hosted_custody TO postgres WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;
-- Retain schema/table ownership with the migration executor (Supabase-managed postgres).
-- Do NOT assign owner to a new NOLOGIN role: managed postgres lacks SET ROLE to that role.
-- This remains an inactive schema; later SECURITY DEFINER ownership needs separate review.
CREATE SCHEMA private_t19_custody AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private_t19_custody FROM PUBLIC;
CREATE TABLE private_t19_custody.connections (
  connection_id uuid PRIMARY KEY,
  business_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment='staging'),
  provider text NOT NULL CHECK (provider='zoho'),
  organization_id text NOT NULL,
  generation bigint NOT NULL CHECK(generation>0),
  credential_version bigint NOT NULL CHECK(credential_version>0),
  sealed_reference uuid,
  enabled boolean NOT NULL DEFAULT false,
  UNIQUE (business_id,environment,provider,organization_id,connection_id)
);
CREATE TABLE private_t19_custody.operations (
  operation_id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES private_t19_custody.connections(connection_id),
  generation bigint NOT NULL,
  credential_version bigint NOT NULL,
  lease_id uuid NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  phase text NOT NULL CHECK(phase IN ('claimed','dispatched','prepared','published','recovery_required','fenced'))
);
CREATE UNIQUE INDEX t19_one_open_operation ON private_t19_custody.operations(connection_id)
 WHERE phase IN ('claimed','dispatched','prepared','recovery_required');
CREATE TABLE private_t19_custody.prepared_references (
  reference uuid PRIMARY KEY,
  operation_id uuid UNIQUE NOT NULL REFERENCES private_t19_custody.operations(operation_id),
  lease_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES private_t19_custody.connections(connection_id),
  business_id uuid NOT NULL,
  generation bigint NOT NULL,
  credential_version bigint NOT NULL,
  consumed boolean NOT NULL DEFAULT false
);
REVOKE ALL ON ALL TABLES IN SCHEMA private_t19_custody FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA private_t19_custody FROM PUBLIC;
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
