#!/usr/bin/env bash
set -euo pipefail
[[ "$PGDATABASE" == faraios_t19_test && "$PGHOST" == 127.0.0.1 ]] || exit 90
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
sealer() { PGUSER=t19_sealer PGPASSWORD=fake-sealer-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
custody() { PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
conn="'22222222-2222-4222-8222-222222222222'::uuid"
b="row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',$conn,1,'synthetic-shalean',1)::custody_durable.binding"
b2="row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',$conn,1,'synthetic-shalean',2)::custody_durable.binding"
op1="'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid"
op2="'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid"
l1="'11111111-1111-4111-8111-111111111111'::uuid"
l2="'22222222-2222-4222-8222-222222222223'::uuid"
ref="'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid"
reset_db() { admin "TRUNCATE custody_durable.prepared_refs, custody_durable.operations; UPDATE custody_durable.connections SET enabled=true,generation=1,credential_version=1,reference='33333333-3333-4333-8333-333333333333' WHERE connection_id=$conn"; }
check() { [[ "$1" == "$2" ]] || { echo "FAIL $3 expected $2 got $1"; exit 1; }; echo "PASS $3"; }
reset_db
d="$(mktemp -d)"; trap 'rm -rf "$d"' EXIT
(custody "select custody_durable.claim($b,$op1,$l1,interval '30 seconds')" >"$d/one") &
p1=$!
(custody "select custody_durable.claim($b,$op2,$l2,interval '30 seconds')" >"$d/two") &
p2=$!
wait "$p1"; wait "$p2"
check "$(sort "$d/one" "$d/two")" "$(printf 'f\nt')" concurrent_single_winner
check "$(admin "select count(*) from custody_durable.operations where phase='claimed'")" 1 single_claim
reset_db
check "$(custody "select custody_durable.claim($b,$op1,$l1,interval '1 millisecond')")" t short_lease_claim
sleep 0.05
check "$(custody "select custody_durable.dispatch($b,$op1,$l1)")" f expired_dispatch_denied
check "$(custody "select custody_durable.recover($b,$op1,$l1)")" t expired_undispatched_fenced
reset_db
check "$(custody "select custody_durable.claim($b,$op1,$l1,interval '1 minute')")" t claim_for_disconnect
check "$(custody "select custody_durable.disconnect($b)")" t disconnect_wins
check "$(custody "select custody_durable.dispatch($b,$op1,$l1)")" f disconnected_dispatch_denied
check "$(custody "select custody_durable.publish($b,$op1,$l1,$ref)")" f disconnected_publish_denied
reset_db
check "$(custody "select custody_durable.claim($b,$op1,$l1,interval '1 minute')")" t claim_for_publish
check "$(custody "select custody_durable.dispatch($b,$op1,$l1)")" t dispatch_for_publish
check "$(custody "select custody_durable.publish($b,$op1,$l1,$ref)")" f unprepared_rejected
check "$(sealer "select custody_durable.prepare($b,$op1,$l1,$ref)")" t sealed_reference_registered
check "$(custody "select custody_durable.publish($b,$op1,$l1,$ref)")" t publish_wins
check "$(custody "select custody_durable.disconnect($b2)")" t disconnect_after_publish
check "$(admin "select generation||':'||credential_version||':'||enabled from custody_durable.connections where connection_id=$conn")" "2:2:false" published_then_disconnected
reset_db
check "$(custody "select custody_durable.claim($b,$op1,$l1,interval '100 milliseconds')")" t uncertain_claim
check "$(custody "select custody_durable.dispatch($b,$op1,$l1)")" t uncertain_dispatch
sleep 0.15
check "$(custody "select custody_durable.recover($b,$op1,$l1)")" t recover_dispatched
check "$(admin "select phase from custody_durable.operations where operation_id=$op1")" recovery_required uncertain_not_reclaimed
check "$(custody "select custody_durable.claim($b,$op2,$l2,interval '1 minute')")" f blocked_replay
echo T19_SEC02_ADVERSARIAL_PASS
