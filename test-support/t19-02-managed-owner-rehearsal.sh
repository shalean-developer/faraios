#!/usr/bin/env bash
# CI ONLY. Runs reviewed inactive schema proposal against a disposable PostgreSQL service's postgres DB.
set -euo pipefail
[[ "${PGHOST:-}" == '127.0.0.1' && "${PGDATABASE:-}" == 'faraios_t19_review_test' && "${PGUSER:-}" == 'postgres' ]] || exit 90
export PGOPTIONS="-c faraios.t19_02_approved_project_ref=xdmfyrsauvqznkloroxg"
psql -X -v ON_ERROR_STOP=1 -d postgres -f docs/proposals/t19-02-staging-inactive-schema.sql
psql -X -v ON_ERROR_STOP=1 -d postgres <<'SQL'
DO $verify$
BEGIN
 IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='private_t19_custody') <> 'postgres'
 THEN RAISE EXCEPTION 'migration executor ownership not retained'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='t19_hosted_owner')
 THEN RAISE EXCEPTION 'incompatible owner role created'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='t19_hosted_custody' AND NOT rolcanlogin)
 THEN RAISE EXCEPTION 'inactive custody role missing'; END IF;
 IF has_schema_privilege('public','private_t19_custody','USAGE')
 OR has_schema_privilege('t19_hosted_custody','private_t19_custody','USAGE')
 THEN RAISE EXCEPTION 'unexpected schema permission'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.role_table_grants WHERE table_schema='private_t19_custody' AND grantee IN ('PUBLIC','t19_hosted_custody'))
 THEN RAISE EXCEPTION 'unexpected object grant'; END IF;
END $verify$;
SQL
echo T19_02_MANAGED_OWNER_PROPOSAL_PASS
psql -X -v ON_ERROR_STOP=1 -d postgres <<'SQL'
BEGIN;
DROP TABLE private_t19_custody.prepared_references;
DROP TABLE private_t19_custody.operations;
DROP TABLE private_t19_custody.connections;
DROP SCHEMA private_t19_custody;
DROP ROLE t19_hosted_custody;
COMMIT;
DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='private_t19_custody')
 OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname='t19_hosted_custody')
 THEN RAISE EXCEPTION 'rollback incomplete'; END IF;
END $verify$;
SQL
echo T19_02_MANAGED_OWNER_PROPOSAL_ROLLBACK_PASS
