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
reset_fixture() { admin "TRUNCATE custody_durable.prepared_refs,custody_durable.operations; UPDATE custody_durable.connections SET generation=1,credential_version=1,enabled=true,reference='33333333-3333-4333-8333-333333333333'"; }
prepare_fixture() {
 reset_fixture
 [[ "$(custody "select custody_durable.claim($b,$op,$lease,interval '5 minutes')")" == t ]]
 [[ "$(custody "select custody_durable.dispatch($b,$op,$lease)")" == t ]]
 [[ "$(sealer "select custody_durable.prepare($b,$op,$lease,$ref)")" == t ]]
}
snap() { admin "select generation||':'||credential_version||':'||enabled||':'||reference from custody_durable.connections"; }
d="$(mktemp -d)"; trap 'rm -rf "$d"' EXIT
# Each contender holds a real row lock in a separate authenticated connection.
# A second operation waits on that exact row, then sees the committed winner state.
for first in disconnect publish; do
 prepare_fixture
 if [[ "$first" == disconnect ]]; then
   first_sql="select custody_durable.disconnect($b)"
   second_sql="select custody_durable.publish($b,$op,$lease,$ref)"
 else
   first_sql="select custody_durable.publish($b,$op,$lease,$ref)"
   second_sql="select custody_durable.disconnect(row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',2)::custody_durable.binding)"
 fi
 # First connection explicitly locks row and holds it until second is attempting its operation.
 PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "BEGIN; $first_sql; SELECT pg_sleep(1); COMMIT;" >"$d/first" &
 p1=$!
 sleep 0.2
 PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$second_sql" >"$d/second" &
 p2=$!
 wait "$p1"; wait "$p2"
 [[ "$(grep -c "^t$" "$d/first")" == 1 && "$(cat "$d/second")" == "$([[ "$first" == disconnect ]] && echo f || echo t)" ]] || { echo "FAIL $first order"; exit 1; }
 [[ "$(snap)" == "$([[ "$first" == disconnect ]] && echo '2:1:false:33333333-3333-4333-8333-333333333333' || echo '2:2:false:cccccccc-cccc-4ccc-8ccc-cccccccccccc')" ]] || { echo "FAIL $first state"; exit 1; }
 echo "PASS overlapping_$first"
done
echo T19_SEC02_OVERLAPPED_RACE_PASS
