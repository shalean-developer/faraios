#!/usr/bin/env bash
# Isolated disposable PostgreSQL rollback rehearsal; NEVER run on hosted projects.
set -euo pipefail
[[ "${PGDATABASE:-}" == "faraios_t19_review_test" && "${PGHOST:-}" == "127.0.0.1" && "${PGUSER:-}" == "postgres" ]] || exit 90
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $guard$
BEGIN
 IF current_database()<>'faraios_t19_review_test' OR session_user<>'postgres'
 THEN RAISE EXCEPTION 'disposable rollback rehearsal only'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='private_t19_custody')
 THEN RAISE EXCEPTION 'candidate schema missing'; END IF;
END $guard$;
-- Exact dependency order: one isolated rehearsal schema, no CASCADE and no other data.
BEGIN;
DROP FUNCTION private_t19_custody.disconnect_connection(uuid,uuid,integer);
DROP FUNCTION private_t19_custody.publish_reference(uuid,uuid,uuid);
DROP FUNCTION private_t19_custody.prepare_reference(uuid,uuid,uuid,uuid,text,integer,integer);
DROP FUNCTION private_t19_custody.quarantine_operation(uuid,uuid);
DROP FUNCTION private_t19_custody.mark_dispatched(uuid,uuid);
DROP FUNCTION private_t19_custody.claim_operation(uuid,uuid,text,text,integer,integer,uuid,uuid,interval);
DROP FUNCTION private_t19_custody.current_reference(uuid,uuid,text,text,integer,integer);
DROP TABLE private_t19_custody.prepared_references;
DROP TABLE private_t19_custody.operations;
DROP TABLE private_t19_custody.connections;
DROP SCHEMA private_t19_custody;
DROP ROLE t19_hosted_custody;
DROP ROLE t19_hosted_owner;
COMMIT;
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='private_t19_custody')
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('t19_hosted_owner','t19_hosted_custody'))
 THEN RAISE EXCEPTION 'rollback left objects'; END IF;
END $verify$;
SQL
echo T19_02_DISPOSABLE_ROLLBACK_REHEARSAL_PASS
