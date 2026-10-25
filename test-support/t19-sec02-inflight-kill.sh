#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == faraios_t19_test && "${PGHOST:-}" == 127.0.0.1 ]] || exit 90
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
custody() { PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
sealer() { PGUSER=t19_sealer PGPASSWORD=fake-sealer-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
b="row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding"
op="'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid"
lease="'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid"
ref="'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid"
reset_fixture() {
 admin "TRUNCATE custody_durable.prepared_refs,custody_durable.operations; UPDATE custody_durable.connections SET generation=1,credential_version=1,enabled=true,reference='33333333-3333-4333-8333-333333333333'"
 [[ "$(custody "select custody_durable.claim($b,$op,$lease,interval '5 minutes')")" == t ]]
 [[ "$(custody "select custody_durable.dispatch($b,$op,$lease)")" == t ]]
 [[ "$(sealer "select custody_durable.prepare($b,$op,$lease,$ref)")" == t ]]
}
snapshot() { admin "select credential_version||':'||reference||':'||enabled from custody_durable.connections"; }
dir="$(mktemp -d)"; trap 'rm -rf "$dir"' EXIT
# Terminate the authenticated PostgreSQL backend while its publication update
# is uncommitted and blocked on a transaction-scoped advisory barrier.
reset_fixture
before="$(snapshot)"
# A transaction obtains an advisory lock then waits; another backend blocks
# before publishing. Killing that backend must not publish or consume.
admin "select pg_advisory_lock(19132)" >/dev/null &
# The above SQL connection ends immediately, releasing its session lock.
# Instead hold an active PostgreSQL process and detect the published barrier.
PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "BEGIN; SELECT 1 FROM custody_durable.connections FOR UPDATE; SELECT pg_sleep(3); COMMIT;" >"$dir/holder" &
holder=$!
sleep 0.3
PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "SELECT custody_durable.publish($b,$op,$lease,$ref)" >"$dir/publisher" 2>"$dir/publisher.err" &
publisher=$!
sleep 0.3
# Kill PostgreSQL's actual backend via pg_terminate_backend while waiting on lock.
pid="$(admin "select pid from pg_stat_activity where usename='t19_custody' and query like 'SELECT custody_durable.publish%' and state='active' order by backend_start desc limit 1")"
[[ "$pid" =~ ^[0-9]+$ ]] || { echo 'FAIL active publisher backend not found'; kill "$holder" || true; exit 1; }
[[ "$(admin "select pg_terminate_backend($pid)")" == t ]] || exit 1
wait "$publisher" && { echo 'FAIL terminated publication unexpectedly succeeded'; exit 1; } || true
wait "$holder"
[[ "$(snapshot)" == "$before" ]] || { echo 'FAIL publication committed despite backend termination'; exit 1; }
[[ "$(admin "select phase from custody_durable.operations where operation_id=$op")" == dispatched ]] || exit 1
[[ "$(admin "select consumed from custody_durable.prepared_refs where reference=$ref")" == f ]] || exit 1
[[ "$(custody "select custody_durable.publish($b,$op,$lease,$ref)")" == t ]] || { echo 'FAIL legitimate subsequent completion'; exit 1; }
echo T19_SEC02_INFLIGHT_DB_TERMINATION_PASS
