#!/usr/bin/env bash
set -euo pipefail
# SEC-02 disposable PostgreSQL only. Required: dedicated GitHub Actions container.
[[ "${PGDATABASE:-}" == faraios_t19_test && "${PGHOST:-}" == 127.0.0.1 ]] || { echo "Unsafe SEC-02 database target"; exit 1; }
unset PGUSER PGPASSWORD
op='11111111-1111-4111-8111-111111111111'
ref='33333333-3333-4333-8333-333333333333'
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
state_before="$(admin "select string_agg(operation_id::text||':'||state,',' order by operation_id) from custody_test.grants")"
[[ "$state_before" == "$op:prepared" ]] || { echo "Fixture not prepared"; exit 1; }
attacker() {
  local role="$1" password="$2" sql="$3" label="$4" result exit_code
  set +e
  result="$(PGUSER="$role" PGPASSWORD="$password" psql -X -v VERBOSITY=sqlstate -v ON_ERROR_STOP=1 -Atc "$sql" 2>&1)"
  exit_code=$?
  set -e
  if [[ "$exit_code" -eq 0 || "$result" != *42501* ]]; then
    echo "FAIL $label: expected SQLSTATE 42501 (actual exit=$exit_code)"
    exit 1
  fi
  [[ "$(admin "select string_agg(operation_id::text||':'||state,',' order by operation_id) from custody_test.grants")" == "$state_before" ]] || {
    echo "FAIL $label: protected state changed"; exit 1;
  }
  echo "DENIED $label sqlstate=42501 state=unchanged"
}
for entry in 't19_web:fake-web-only' 't19_invoice_worker:fake-invoice-only' 't19_historical_publisher:fake-historical-only'; do
  role="${entry%%:*}"; pass="${entry#*:}"
  who="$(PGUSER="$role" PGPASSWORD="$pass" psql -X -qAt -v ON_ERROR_STOP=1 -c 'select session_user')"
  [[ "$who" == "$role" ]] || { echo "FAIL distinct login $role"; exit 1; }
  attacker "$role" "$pass" 'select * from custody_test.grants' "$role read"
  attacker "$role" "$pass" "select custody_test.publish_prepared('$op'::uuid,'$ref'::uuid)" "$role publish"
  attacker "$role" "$pass" "update custody_test.grants set state='published' where operation_id='$op'::uuid" "$role update"
done
custody_result="$(PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "select custody_test.publish_prepared('$op'::uuid,'$ref'::uuid)")"
[[ "$custody_result" == 't' ]] || { echo 'FAIL custody positive control'; exit 1; }
[[ "$(admin "select state from custody_test.grants where operation_id='$op'::uuid")" == 'published' ]] || { echo 'FAIL custody state'; exit 1; }
echo 'ALLOWED custody prepared publication state=published'
echo 'T19_SEC02_SEPARATE_SESSIONS_PASS'
