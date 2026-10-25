#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == faraios_t19_test && "${PGHOST:-}" == 127.0.0.1 ]] || exit 90
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
custody() { PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
sealer() { PGUSER=t19_sealer PGPASSWORD=fake-sealer-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
conn="'22222222-2222-4222-8222-222222222222'::uuid"
b="row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic',$conn,1,'synthetic-shalean',1)::custody_durable.binding"
op="'99999999-9999-4999-8999-999999999999'::uuid"
lease="'88888888-8888-4888-8888-888888888888'::uuid"
ref="'77777777-7777-4777-8777-777777777777'::uuid"
admin "TRUNCATE custody_durable.prepared_refs,custody_durable.operations; UPDATE custody_durable.connections SET generation=1,credential_version=1,enabled=true,reference='33333333-3333-4333-8333-333333333333'"
state() { admin "select generation||':'||credential_version||':'||enabled||':'||reference from custody_durable.connections where connection_id=$conn"; }
old="$(state)"
[[ "$(custody "select custody_durable.claim($b,$op,$lease,interval '1 second')")" == t ]]
[[ "$(custody "select custody_durable.dispatch($b,$op,$lease)")" == t ]]
dir="$(mktemp -d)"; trap 'rm -rf "$dir"' EXIT
# Synthetic provider records side effect once, then the client dies before sealing/publication.
# This is a stub, NOT a real network request or cryptographic credential.
(
  printf 'synthetic-provider-rotated-token-v2\n' > "$dir/provider-effect"
  kill -KILL "$BASHPID"
) 2>/dev/null || true
[[ "$(wc -l < "$dir/provider-effect")" -eq 1 ]] || exit 1
sleep 1.15
[[ "$(custody "select custody_durable.recover($b,$op,$lease)")" == t ]]
[[ "$(admin "select phase from custody_durable.operations where operation_id=$op")" == recovery_required ]]
[[ "$(custody "select custody_durable.claim($b,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,interval '1 minute')")" == f ]] || { echo 'FAIL provider replay claim'; exit 1; }
[[ "$(custody "select custody_durable.publish($b,$op,$lease,$ref)")" == f ]] || { echo 'FAIL late publication'; exit 1; }
[[ "$(sealer "select custody_durable.prepare($b,$op,$lease,$ref)")" == f ]] || { echo 'FAIL delayed seal'; exit 1; }
[[ "$(state)" == "$old" ]] || { echo 'FAIL stale credential changed'; exit 1; }
[[ "$(admin "select count(*) from custody_durable.prepared_refs")" == 0 ]] || exit 1
[[ "$(wc -l < "$dir/provider-effect")" -eq 1 ]] || { echo 'FAIL duplicate provider effect'; exit 1; }
echo T19_SEC02_SIMULATED_PROVIDER_INTERRUPTION_PASS
