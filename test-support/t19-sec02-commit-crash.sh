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
# 1. Crash after successful SQL publication but before the caller can observe its COMMIT.
reset_fixture
PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "BEGIN; SELECT custody_durable.publish($b,$op,$lease,$ref); SELECT pg_sleep(5); COMMIT;" >"$dir/precommit" 2>"$dir/error" &
worker=$!
sleep 0.5
pid="$(admin "select pid from pg_stat_activity where usename='t19_custody' and state='active' and query like '%custody_durable.publish%' order by backend_start desc limit 1")"
[[ "$pid" =~ ^[0-9]+$ ]] || { echo 'FAIL no pre-commit backend'; exit 1; }
[[ "$(admin "select pg_terminate_backend($pid)")" == t ]]
wait "$worker" && { echo 'FAIL pre-commit backend survived'; exit 1; } || true
[[ "$(snapshot)" == "1:33333333-3333-4333-8333-333333333333:true" ]] || { echo 'FAIL uncommitted publication survived'; exit 1; }
[[ "$(admin "select consumed from custody_durable.prepared_refs where reference=$ref")" == f ]]
[[ "$(admin "select phase from custody_durable.operations where operation_id=$op")" == dispatched ]]
admin "UPDATE custody_durable.operations SET lease_until=clock_timestamp()-interval '1 second' WHERE operation_id=$op"
[[ "$(custody "select custody_durable.recover($b,$op,$lease)")" == t ]]
[[ "$(custody "select custody_durable.claim($b,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,interval '1 minute')")" == f ]]
echo T19_SEC02_PRECOMMIT_BACKEND_CRASH_PASS
# 2. Crash after commit and before caller acknowledgement. No repeat publication or refresh.
reset_fixture
[[ "$(custody "select custody_durable.publish($b,$op,$lease,$ref)")" == t ]]
[[ "$(snapshot)" == "1:2:cccccccc-cccc-4ccc-8ccc-cccccccccccc:true" ]] || true
[[ "$(admin "select credential_version from custody_durable.connections")" == 2 ]]
[[ "$(custody "select custody_durable.publish($b,$op,$lease,$ref)")" == f ]]
[[ "$(admin "select count(*) from custody_durable.operations where phase='published'")" == 1 ]]
[[ "$(admin "select consumed from custody_durable.prepared_refs where reference=$ref")" == t ]]
echo T19_SEC02_POSTCOMMIT_REPLAY_DENIAL_PASS
