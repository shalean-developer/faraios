-- T19 Gate 2 synthetic PostgreSQL integrity acceptance, disposable database ONLY.
-- Must be invoked with psql -X -v ON_ERROR_STOP=1 by a separately approved runner.
\set ON_ERROR_STOP on
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
 BEGIN
  EXECUTE 'SET LOCAL ROLE t19_gate2_denied';
  PERFORM value FROM t19_gate2_synthetic.protected WHERE id=1;
  RAISE EXCEPTION 'DENIAL_NOT_ENFORCED';
 EXCEPTION WHEN insufficient_privilege THEN
  GET STACKED DIAGNOSTICS code = RETURNED_SQLSTATE;
  IF code <> '42501' THEN RAISE EXCEPTION 'INCORRECT_SQLSTATE %',code; END IF;
  RAISE NOTICE 'T19_SQLSTATE_42501_PASS';
 END;
END $$;
ROLLBACK;
SELECT CASE WHEN to_regclass('t19_gate2_synthetic.protected') IS NULL
 THEN 'T19_ROLLBACK_PASS' ELSE 'T19_ROLLBACK_FAIL' END AS result;
