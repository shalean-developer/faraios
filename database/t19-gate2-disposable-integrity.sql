-- T19 Gate 2 synthetic PostgreSQL integrity acceptance, disposable database ONLY.
-- Must be invoked with psql -X -v ON_ERROR_STOP=1 by a separately approved runner.
\set ON_ERROR_STOP on
SELECT md5(coalesce(string_agg(v, E'\n' ORDER BY v),'')) AS before_catalog
FROM (
 SELECT 'role:'||rolname||':'||rolsuper||':'||rolcanlogin AS v FROM pg_roles
 UNION ALL SELECT 'schema:'||oid||':'||nspname FROM pg_namespace
 UNION ALL SELECT 'relation:'||oid||':'||relname||':'||relkind FROM pg_class
) baseline \gset
BEGIN;
CREATE SCHEMA t19_gate2_synthetic;
CREATE TABLE t19_gate2_synthetic.protected (id integer primary key, value text not null);
INSERT INTO t19_gate2_synthetic.protected VALUES (1,'unchanged');
CREATE ROLE t19_gate2_denied NOLOGIN;
REVOKE ALL ON SCHEMA t19_gate2_synthetic FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA t19_gate2_synthetic FROM PUBLIC;
DO $$
DECLARE code text;
BEGIN
 -- SET ROLE is outside the denial handler: inability to assume the test role
 -- must fail, rather than masquerade as denial of the protected SELECT.
 EXECUTE 'SET LOCAL ROLE t19_gate2_denied';
 IF current_user <> 't19_gate2_denied' THEN RAISE EXCEPTION 'DENIED_ROLE_NOT_ACTIVE';END IF;
 BEGIN
  PERFORM value FROM t19_gate2_synthetic.protected WHERE id=1;
  RAISE EXCEPTION 'DENIAL_NOT_ENFORCED';
 EXCEPTION WHEN insufficient_privilege THEN
  GET STACKED DIAGNOSTICS code = RETURNED_SQLSTATE;
  IF code <> '42501' THEN RAISE EXCEPTION 'INCORRECT_SQLSTATE %',code; END IF;
  RAISE NOTICE 'T19_SQLSTATE_42501_PASS';
 END;
 RESET ROLE;
END $$;
DO $$
BEGIN
 BEGIN
  INSERT INTO t19_gate2_synthetic.protected VALUES (1,'duplicate');
  RAISE EXCEPTION 'DUPLICATE_NOT_DENIED';
 EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'T19_DUPLICATE_23505_PASS';
 END;
 BEGIN
  CREATE SCHEMA t19_gate2_synthetic;
  RAISE EXCEPTION 'COLLISION_NOT_DENIED';
 EXCEPTION WHEN duplicate_schema THEN
  RAISE NOTICE 'T19_COLLISION_42P06_PASS';
 END;
 BEGIN
  -- T19 operation precondition: a prior operation's namespace is a collision,
  -- never permission to adopt/drop/rewrite an existing resource.
  IF EXISTS (SELECT FROM pg_namespace WHERE nspname='t19_gate2_synthetic') THEN
   RAISE EXCEPTION 'OPERATION_COLLISION' USING ERRCODE='55000';
  END IF;
  RAISE EXCEPTION 'OPERATION_COLLISION_NOT_DENIED';
 EXCEPTION WHEN object_not_in_prerequisite_state THEN
  RAISE NOTICE 'T19_COLLISION_55000_PASS';
 END;
 IF (SELECT value FROM t19_gate2_synthetic.protected WHERE id=1) <> 'unchanged'
    OR (SELECT count(*) FROM t19_gate2_synthetic.protected) <> 1 THEN
  RAISE EXCEPTION 'SYNTHETIC_STATE_CHANGED';
 END IF;
 RAISE NOTICE 'T19_ALLOWED_WRITE_PASS';
END $$;
ROLLBACK;
SELECT md5(coalesce(string_agg(v, E'\n' ORDER BY v),'')) = :'before_catalog'
 AND to_regclass('t19_gate2_synthetic.protected') IS NULL
 AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname='t19_gate2_denied') AS final_ok
FROM (
 SELECT 'role:'||rolname||':'||rolsuper||':'||rolcanlogin AS v FROM pg_roles
 UNION ALL SELECT 'schema:'||oid||':'||nspname FROM pg_namespace
 UNION ALL SELECT 'relation:'||oid||':'||relname||':'||relkind FROM pg_class
) final_catalog \gset
\if :final_ok
 \echo T19_ROLLBACK_PASS
\else
 \echo T19_ROLLBACK_FAIL
 \quit 1
\endif
