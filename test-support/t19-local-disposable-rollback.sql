-- T19 local synthetic-only rollback fixture. NEVER run against hosted Supabase.
-- Requires database faraios_t19_local_qa and local Docker network=none.
-- One psql session, ON_ERROR_STOP and final ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '45s';
SET LOCAL lock_timeout = '2s';
SET LOCAL search_path = pg_catalog;
-- Refuse collisions, wrong executor or unexpected custody prerequisites.
DO $preflight$
BEGIN
 IF current_database() <> 'faraios_t19_local_qa' OR current_user <> 'postgres' OR session_user <> 'postgres'
    OR current_setting('server_version_num')::int < 170000
    OR current_setting('faraios.t19_local_qa',true) IS DISTINCT FROM 'isolated-synthetic-only'
    OR to_regnamespace('t19_local_qa_schema') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('t19_local_qa_executor','t19_local_qa_owner'))
 THEN RAISE EXCEPTION 'Local synthetic T19 preflight refused' USING ERRCODE='55000'; END IF;
END $preflight$;
CREATE ROLE t19_local_qa_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE t19_local_qa_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- One controlled switching path for the privileged fixture executor.
GRANT t19_local_qa_executor TO postgres WITH SET TRUE, INHERIT FALSE;
CREATE SCHEMA t19_local_qa_schema AUTHORIZATION t19_local_qa_executor;
REVOKE ALL ON SCHEMA t19_local_qa_schema FROM PUBLIC;
-- Prove executor cannot initially SET ROLE owner.
DO $initial$
BEGIN
 IF pg_has_role('t19_local_qa_executor','t19_local_qa_owner','SET')
 THEN RAISE EXCEPTION 'Unexpected owner SET privilege' USING ERRCODE='55000'; END IF;
END $initial$;
SET LOCAL ROLE t19_local_qa_executor;
CREATE FUNCTION t19_local_qa_schema.probe() RETURNS integer
LANGUAGE sql SET search_path=pg_catalog AS 'SELECT 1';
REVOKE ALL ON FUNCTION t19_local_qa_schema.probe() FROM PUBLIC;
DO $denial$
DECLARE observed text;
BEGIN
 BEGIN
  EXECUTE 'ALTER FUNCTION t19_local_qa_schema.probe() OWNER TO t19_local_qa_owner';
  RAISE EXCEPTION 'Forbidden ownership transfer unexpectedly worked' USING ERRCODE='55000';
 EXCEPTION WHEN insufficient_privilege THEN
  GET STACKED DIAGNOSTICS observed = RETURNED_SQLSTATE;
  IF observed <> '42501' THEN RAISE EXCEPTION 'Incorrect denial SQLSTATE' USING ERRCODE='55000'; END IF;
 END;
END $denial$;
RESET ROLE;
-- Only privileged staging executor supplies temporary SET and CREATE authority.
GRANT t19_local_qa_owner TO t19_local_qa_executor WITH SET TRUE, INHERIT FALSE;
SET LOCAL ROLE t19_local_qa_executor;
GRANT CREATE ON SCHEMA t19_local_qa_schema TO t19_local_qa_owner;
DO $allowed$
BEGIN
 IF NOT pg_has_role(current_user,'t19_local_qa_owner','SET')
 THEN RAISE EXCEPTION 'Temporary SET authority missing' USING ERRCODE='55000'; END IF;
END $allowed$;
ALTER FUNCTION t19_local_qa_schema.probe() OWNER TO t19_local_qa_owner;
-- The schema owner, not postgres, must revoke CREATE from the function owner.
REVOKE CREATE ON SCHEMA t19_local_qa_schema FROM t19_local_qa_owner;
RESET ROLE;
GRANT t19_local_qa_owner TO t19_local_qa_executor WITH SET FALSE, INHERIT FALSE;
SET LOCAL ROLE t19_local_qa_executor;
DO $cleanup$
BEGIN
 IF pg_has_role(current_user,'t19_local_qa_owner','SET')
 OR has_schema_privilege('t19_local_qa_owner','t19_local_qa_schema','CREATE')
 THEN RAISE EXCEPTION 'Temporary authority leaked' USING ERRCODE='55000'; END IF;
END $cleanup$;
RESET ROLE;
-- Synthetic SQLSTATE 55000 rollback assertion inside isolated exception subtransaction.
DO $abort_probe$
DECLARE observed text;
BEGIN
 BEGIN
  EXECUTE 'CREATE TABLE t19_local_qa_schema.abort_probe(id integer)';
  RAISE EXCEPTION 'synthetic abort' USING ERRCODE='55000';
 EXCEPTION WHEN SQLSTATE '55000' THEN
  GET STACKED DIAGNOSTICS observed = RETURNED_SQLSTATE;
  IF observed <> '55000' THEN RAISE EXCEPTION 'Unexpected abort code'; END IF;
 END;
 IF to_regclass('t19_local_qa_schema.abort_probe') IS NOT NULL
 THEN RAISE EXCEPTION 'Abort rollback failed' USING ERRCODE='55000'; END IF;
END $abort_probe$;
-- Final transaction-wide rollback, including both synthetic roles and schema.
ROLLBACK;
-- Must yield 0,0,0. This read-only verification runs after rollback.
-- Acceptance additionally requires independent outside-transaction zero-object readback.
-- No hosted catalog or financial baseline applies to this new disposable database.
SELECT (SELECT count(*) FROM pg_roles WHERE rolname IN ('t19_local_qa_executor','t19_local_qa_owner')) AS leftover_roles,
       (SELECT count(*) FROM pg_namespace WHERE nspname='t19_local_qa_schema') AS leftover_schemas,
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='t19_local_qa_schema') AS leftover_functions;
