#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == "faraios_t19_review_test" && "${PGHOST:-}" == "127.0.0.1" ]] || exit 90
sql() { PGPASSWORD=synthetic-only PGUSER=postgres psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
# Use a fresh operation on business B; abort a transaction after a successful claim.
sql "update private_t19_custody.operations set phase='fenced' where connection_id='88888888-8888-4888-8888-888888888888';"
sql "BEGIN; SET LOCAL ROLE t19_hosted_custody; SELECT private_t19_custody.claim_operation('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','staging','synthetic-bokkie',1,1,'eeeeeeee-aaaa-4eee-8eee-eeeeeeeeeeee','ffffffff-bbbb-4fff-8fff-ffffffffffff',interval '1 minute'); ROLLBACK;" >/dev/null
[[ "$(sql "select count(*) from private_t19_custody.operations where operation_id='eeeeeeee-aaaa-4eee-8eee-eeeeeeeeeeee'")" == 0 ]] || exit 1
echo T19_02_ROLLBACK_PASS
# Independent physical PostgreSQL sessions compete for same connection lock.
q="BEGIN; SET LOCAL SESSION AUTHORIZATION t19_hosted_custody; SELECT private_t19_custody.claim_operation('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','staging','synthetic-bokkie',1,1,'eeeeeeee-aaaa-4eee-8eee-eeeeeeeeeeee','ffffffff-bbbb-4fff-8fff-ffffffffffff',interval '1 minute'); COMMIT;"
d="$(mktemp -d)"; trap 'rm -rf "$d"' EXIT
(sql "$q" >"$d/one") & a=$!
(sql "$q" >"$d/two") & b=$!
wait "$a";wait "$b"
[[ "$(sort "$d/one" "$d/two")" == "$(printf 'f\nt')" ]] || { echo "unexpected concurrent claims"; cat "$d/"*; exit 1; }
[[ "$(sql "select count(*) from private_t19_custody.operations where operation_id='eeeeeeee-aaaa-4eee-8eee-eeeeeeeeeeee'")" == 1 ]] || exit 1
echo T19_02_CONCURRENT_CLAIM_PASS
