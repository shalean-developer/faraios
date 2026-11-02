#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == faraios_t19_test && "${PGHOST:-}" == 127.0.0.1 ]] || exit 1
op='66666666-6666-4666-8666-666666666666'
lease='77777777-7777-4777-8777-777777777777'
epoch='55555555-5555-4555-8555-555555555555'
ref='88888888-8888-4888-8888-888888888888'
binding='{"business_id":"612be091-b1d7-4911-9c3b-143446a9fe27","environment":"synthetic","provider":"synthetic","connection_id":"44444444-4444-4444-8444-444444444444","generation":1,"organization_id":"synthetic-shalean","credential_version":1}'
custody() { PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v VERBOSITY=sqlstate -v ON_ERROR_STOP=1 -c "$1"; }
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
step() { custody "select custody_test.fenced_step('$1','$binding'::jsonb,'$op'::uuid,'$lease'::uuid,'$epoch'::uuid,${2:-null})"; }
expect_denied() {
 local result code
 set +e
 result="$(custody "$1" 2>&1)"
 code=$?
 set -e
 [[ $code -ne 0 && "$result" == *"42501"* ]] || { echo "Expected denial $2: exit=$code"; exit 1; }
 echo "DENIED $2 sqlstate=42501"
}
[[ "$(step claim)" == 'claimed' ]] || exit 1
[[ "$(step dispatch)" == 'dispatched' ]] || exit 1
[[ "$(step prepare "'$ref'::uuid")" == 'prepared' ]] || exit 1
expect_denied "select custody_test.fenced_step('publish','${binding/synthetic-shalean/synthetic-bokkie}'::jsonb,'$op'::uuid,'$lease'::uuid,'$epoch'::uuid,'$ref'::uuid)" cross_business
expect_denied "select custody_test.fenced_step('publish','$binding'::jsonb,'$op'::uuid,'$lease'::uuid,'99999999-9999-4999-8999-999999999999'::uuid,'$ref'::uuid)" stale_epoch
expect_denied "select custody_test.fenced_step('publish','$binding'::jsonb,'$op'::uuid,'99999999-9999-4999-8999-999999999999'::uuid,'$epoch'::uuid,'$ref'::uuid)" stale_lease
[[ "$(step publish "'$ref'::uuid")" == 'published' ]] || exit 1
[[ "$(admin "select credential_version||':'||phase from custody_test.fenced")" == '2:idle' ]] || exit 1
expect_denied "select custody_test.fenced_step('publish','$binding'::jsonb,'$op'::uuid,'$lease'::uuid,'$epoch'::uuid,'$ref'::uuid)" duplicate_publish
# Version 2 / generation 1: disconnect then ensure no old completion can publish.
binding="${binding/\"credential_version\":1/\"credential_version\":2}"
[[ "$(step disconnect)" == 'disabled' ]] || exit 1
[[ "$(admin "select generation||':'||credential_version||':'||status from custody_test.fenced")" == '2:2:disabled' ]] || exit 1
expect_denied "select custody_test.fenced_step('publish','$binding'::jsonb,'$op'::uuid,'$lease'::uuid,'$epoch'::uuid,'$ref'::uuid)" late_publish
echo "T19_SEC02_FENCING_BASIC_PASS"
