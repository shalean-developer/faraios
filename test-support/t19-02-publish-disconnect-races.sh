#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == faraios_t19_review_test && "${PGHOST:-}" == 127.0.0.1 ]] || exit 90
sql(){ PGUSER=postgres PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
# Test actual physical overlapping transactions, not merely sequential orderings.
# Existing business A ends disconnected; reset ONLY disposable synthetic fixtures.
reset_fixture(){
sql "TRUNCATE private_t19_custody.prepared_references,private_t19_custody.operations;
 UPDATE private_t19_custody.connections SET enabled=true,generation=1,credential_version=1,sealed_reference='33333333-3333-4333-8333-333333333333' WHERE organization_id='synthetic-shalean';"
}
business=612be091-b1d7-4911-9c3b-143446a9fe27
conn=22222222-2222-4222-8222-222222222222
op=aaaaaaaa-1111-4111-8111-111111111111
lease=bbbbbbbb-2222-4222-8222-222222222222
ref=cccccccc-3333-4333-8333-333333333333
prepare(){
sql "BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody;
 SELECT private_t19_custody.claim_operation('$business','$conn','staging','synthetic-shalean',1,1,'$op','$lease',interval '2 minutes');
 SELECT private_t19_custody.mark_dispatched('$op','$lease');
 SELECT private_t19_custody.prepare_reference('$op','$lease','$ref','$business','synthetic-shalean',1,1);
 COMMIT;" >/dev/null
}
publish="BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody; SELECT private_t19_custody.publish_reference('$op','$lease','$ref'); SELECT pg_sleep(1); COMMIT;"
disconnect="BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody; SELECT private_t19_custody.disconnect_connection('$business','$conn',1); COMMIT;"
d="$(mktemp -d)";trap 'rm -rf "$d"' EXIT
# Publish first: commit precedes disconnect; final generation disabled and version 2.
reset_fixture;prepare
(sql "$publish" >"$d/pub-first") & a=$!
sleep 0.3
(sql "$disconnect" >"$d/disc-after") & b=$!
wait "$a";wait "$b"
[[ "$(sql "select generation||':'||credential_version||':'||enabled from private_t19_custody.connections where connection_id='$conn'")" == '2:2:false' ]] || exit 1
[[ "$(sql "select count(*) from private_t19_custody.prepared_references where reference='$ref' and consumed")" == 1 ]] || exit 1
echo T19_02_PUBLISH_FIRST_DISCONNECT_RACE_PASS
# Disconnect first: late publish fails and the pending reference remains unconsumed.
reset_fixture;prepare
(sql "BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody; SELECT private_t19_custody.disconnect_connection('$business','$conn',1); SELECT pg_sleep(1); COMMIT;" >"$d/disc-first") & a=$!
sleep 0.3
(sql "BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody; SELECT private_t19_custody.publish_reference('$op','$lease','$ref'); COMMIT;" >"$d/pub-after") & b=$!
wait "$a";wait "$b"
[[ "$(sql "select generation||':'||credential_version||':'||enabled from private_t19_custody.connections where connection_id='$conn'")" == '2:1:false' ]] || exit 1
[[ "$(sql "select count(*) from private_t19_custody.prepared_references where reference='$ref' and consumed")" == 0 ]] || exit 1
[[ "$(sql "select phase from private_t19_custody.operations where operation_id='$op'")" == recovery_required ]] || exit 1
echo T19_02_DISCONNECT_FIRST_PUBLISH_RACE_PASS
# A precommit terminated session must not expose a published reference.
reset_fixture;prepare
(sql "BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody; SELECT private_t19_custody.publish_reference('$op','$lease','$ref'); SELECT pg_sleep(8); COMMIT;" >"$d/interrupted" 2>&1) & worker=$!
sleep 1
pid="$(sql "select pid from pg_stat_activity where query like '%publish_reference%' and query like '%pg_sleep(8)%' and state='active' and pid <> pg_backend_pid() order by backend_start desc limit 1")"
[[ "$pid" =~ ^[0-9]+$ ]] || exit 1
[[ "$(sql "select pg_terminate_backend($pid)")" == t ]] || exit 1
wait "$worker" && exit 1 || true
[[ "$(sql "select credential_version from private_t19_custody.connections where connection_id='$conn'")" == 1 ]] || exit 1
[[ "$(sql "select count(*) from private_t19_custody.prepared_references where reference='$ref' and consumed")" == 0 ]] || exit 1
echo T19_02_PRECOMMIT_TERMINATION_ROLLBACK_PASS
