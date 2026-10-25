#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == "faraios_t19_test" && "${PGHOST:-}" == "127.0.0.1" ]] || exit 90
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
consume() { PGUSER=t19_evidence_consumer PGPASSWORD=fake-consumer-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
proof() { printf '%s\\037%s\\037%s\\037%s\\037%s\\037%s' "$1" "$2" "$3" "$4" "$5" "$6" | openssl dgst -sha256 -hmac synthetic-verifier-key-keep-out-of-real-systems -r | cut -d' ' -f1; }
# The isolated test harness signs synthetic tuples; the SQL consumer login cannot read the publication key.
sql="SELECT evidence_guard.consume_verified('synthetic-pinned-fingerprint','provider_result','nonce-one','op-one','synthetic-seven-field-binding','lease-one','$(proof synthetic-pinned-fingerprint provider_result nonce-one op-one synthetic-seven-field-binding lease-one)')"
[[ "$(consume "$sql")" == t ]] || { echo "FAIL valid consume"; exit 1; }
[[ "$(consume "$sql")" == f ]] || { echo "FAIL replay"; exit 1; }
[[ "$(admin "select count(*) from evidence_guard.receipts")" == 1 ]] || exit 1
[[ "$(admin "select state from evidence_guard.operations where operation_id='op-one'")" == verified ]] || exit 1
admin "insert into evidence_guard.operations(operation_id,c1_key,lease) values('op-two','scope-two','lease-two')"
wrong="SELECT evidence_guard.consume_verified('synthetic-pinned-fingerprint','provider_result','nonce-two','op-two','scope-other','lease-two','$(proof synthetic-pinned-fingerprint provider_result nonce-two op-two scope-other lease-two)')"
[[ "$(consume "$wrong")" == f ]] || exit 1
[[ "$(admin "select count(*) from evidence_guard.receipts")" == 1 ]] || exit 1
admin "insert into evidence_guard.operations(operation_id,c1_key,lease) values('op-three','scope-three','lease-three')"
simultaneous="SELECT evidence_guard.consume_verified('synthetic-pinned-fingerprint','provider_result','nonce-three','op-three','scope-three','lease-three','$(proof synthetic-pinned-fingerprint provider_result nonce-three op-three scope-three lease-three)')"
d="$(mktemp -d)";trap 'rm -rf "$d"' EXIT
(consume "$simultaneous" >"$d/one") & a=$!
(consume "$simultaneous" >"$d/two") & b=$!
wait "$a";wait "$b"
[[ "$(sort "$d/one" "$d/two")" == "$(printf 'f\nt')" ]] || { echo "FAIL simultaneous replay";exit 1; }
[[ "$(admin "select count(*) from evidence_guard.receipts where operation_id='op-three'")" == 1 ]] || exit 1
# Separate disposable application and invoice logins must have no publication RPC or table access.
for role in t19_invoice_worker t19_app_worker; do
  if [[ "$role" == t19_invoice_worker ]]; then password=fake-worker-only; else password=fake-app-only; fi
  if PGUSER="$role" PGPASSWORD="$password" psql -X -qAt -v ON_ERROR_STOP=1 -c "$sql" >"$d/$role.out" 2>"$d/$role.err"; then
    echo "FAIL $role bypassed publication boundary"; exit 1
  fi
  grep -q 'permission denied' "$d/$role.err" || { cat "$d/$role.err"; exit 1; }
  if PGUSER="$role" PGPASSWORD="$password" psql -X -qAt -v ON_ERROR_STOP=1 -c 'select * from evidence_guard.receipts' >"$d/$role.read" 2>"$d/$role.readerr"; then
    echo "FAIL $role read receipts"; exit 1
  fi
  grep -q 'permission denied' "$d/$role.readerr" || exit 1
done
echo T19_SEC02_ORDINARY_LOGIN_DENIAL_PASS
# SECURITY GAP CHARACTERISATION (expected unsafe behavior; NOT an acceptance pass):
# The currently permitted consumer can fabricate a new nonce and transition
# a dispatched operation without cryptographic verification. Keep the test
# explicit so green CI cannot be misrepresented as proof of a sealed boundary.
admin "insert into evidence_guard.operations(operation_id,c1_key,lease) values('op-direct-bypass','scope-direct','lease-direct')"
direct="SELECT evidence_guard.consume_verified('forged-fingerprint-without-signature','provider_result','fabricated-nonce','op-direct-bypass','scope-direct','lease-direct','unverified-forged-proof')"
if consume "$direct" >"$d/direct-out" 2>"$d/direct-err"; then echo "FAIL direct forged evidence accepted"; exit 1; fi
grep -q 'unauthenticated publication' "$d/direct-err" || { cat "$d/direct-err"; exit 1; }
[[ "$(admin "select state from evidence_guard.operations where operation_id='op-direct-bypass'")" == dispatched ]] || exit 1
[[ "$(admin "select count(*) from evidence_guard.receipts where nonce='fabricated-nonce'")" == 0 ]] || exit 1
echo T19_SEC02_DIRECT_FORGED_PUBLICATION_DENIED
# A killed transaction cannot persist its consumed nonce or publication transition.
admin "insert into evidence_guard.operations(operation_id,c1_key,lease) values('op-four','scope-four','lease-four')"
PGUSER=t19_evidence_consumer PGPASSWORD=fake-consumer-only psql -X -qAt -v ON_ERROR_STOP=1 -c "BEGIN; SELECT evidence_guard.consume_verified('synthetic-pinned-fingerprint','provider_result','nonce-four','op-four','scope-four','lease-four','$(proof synthetic-pinned-fingerprint provider_result nonce-four op-four scope-four lease-four)'); SELECT pg_sleep(5); COMMIT;" >"$d/interrupted" 2>&1 & worker=$!
sleep 0.6
pid="$(admin "select pid from pg_stat_activity where usename='t19_evidence_consumer' and state='active' and query like '%nonce-four%' order by backend_start desc limit 1")"
[[ "$pid" =~ ^[0-9]+$ ]] || { echo "FAIL interrupted backend missing";exit 1; }
[[ "$(admin "select pg_terminate_backend($pid)")" == t ]] || exit 1
wait "$worker" && { echo 'FAIL unexpected commit';exit 1; } || true
[[ "$(admin "select count(*) from evidence_guard.receipts where nonce='nonce-four'")" == 0 ]] || exit 1
[[ "$(admin "select state from evidence_guard.operations where operation_id='op-four'")" == dispatched ]] || exit 1
# Database-level intent survives: no automatic refresh is triggered by this fixture.
echo T19_SEC02_EVIDENCE_DURABILITY_PASS
