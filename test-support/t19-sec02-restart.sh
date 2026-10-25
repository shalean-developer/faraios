#!/usr/bin/env bash
set -euo pipefail
[[ "$PGDATABASE" == faraios_t19_test && "$PGHOST" == 127.0.0.1 ]] || exit 90
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
custody() { PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
op="'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid"
b="row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding"
before="$(admin "select phase from custody_durable.operations where operation_id=$op")"
[[ "$before" == recovery_required ]] || { echo 'FAIL no durable uncertainty to restore'; exit 1; }
container="$(docker ps --filter ancestor=postgres:17 --format '{{.ID}}' | head -n 1)"
[[ -n "$container" ]] || { echo 'FAIL disposable PostgreSQL container not identifiable'; exit 1; }
docker restart "$container" >/dev/null
ready=0
for n in $(seq 1 30); do
  if PGUSER=t19_fixture PGPASSWORD=synthetic-only pg_isready -h 127.0.0.1 -p 5432 -d faraios_t19_test >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]] || { echo 'FAIL database restart readiness'; exit 1; }
after="$(admin "select phase from custody_durable.operations where operation_id=$op")"
[[ "$after" == recovery_required ]] || { echo 'FAIL lost uncertainty after restart'; exit 1; }
attempt="$(custody "select custody_durable.claim($b,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,interval '1 minute')")"
[[ "$attempt" == f ]] || { echo 'FAIL replay claim after restart'; exit 1; }
echo T19_SEC02_RESTART_PERSISTENCE_PASS
