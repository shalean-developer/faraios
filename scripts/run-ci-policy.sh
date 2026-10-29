#!/bin/bash
# Synthetic CI only: no host credentials, published ports or external database.
set -Eeuo pipefail
set +x
for key in $(compgen -e); do
  case "$key" in PG*|*DATABASE_URL|FARAIOS_*|SUPABASE_*) unset "$key" ;; esac
done
node -e 'if (process.versions.node.split(".")[0] !== "24") process.exit(1)'
postgres --version | grep -E '^postgres .* 17\.'
node --version
npm --version
fixture=$(mktemp -d /tmp/faraios-ci-policy-XXXXXX)
data="$fixture/data"
cleanup() {
  result=$?; trap - EXIT INT TERM; set +e
  if test -f "$data/postmaster.pid"; then
    pg_ctl -D "$data" -m fast -w stop || result=90
  fi
  if test -f "$data/postmaster.pid"; then
    echo CI_POSTGRES_CLEANUP_FAILED >&2
    exit 91
  fi
  echo CI_POSTGRES_PID_ABSENT
  case "$fixture" in
    /tmp/faraios-ci-policy-??????) rm -rf -- "$fixture" || result=92 ;;
    *) result=93 ;;
  esac
  if test -e "$fixture"; then result=94; else echo CI_FIXTURE_REMOVED; fi
  echo "CI_POLICY_EXIT=$result"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
password=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')
(umask 077; printf '%s\n' "$password" > "$fixture/pwfile")
test "$(stat -c '%a' "$fixture/pwfile")" = 600
initdb -D "$data" -U postgres --auth-host=scram-sha-256 --auth-local=scram-sha-256 --pwfile="$fixture/pwfile" --encoding=UTF8 --no-locale >/dev/null
rm -- "$fixture/pwfile"
pg_ctl -D "$data" -l "$fixture/postgres.log" -o "-h 127.0.0.1 -p 5432 -k $fixture -c shared_buffers=64MB" -w start
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGCONNECT_TIMEOUT=5
export PGPASSFILE="$fixture/absent-pass" PGSERVICEFILE="$fixture/absent-service"
if PGPASSWORD="${password}wrong" psql -X -w -qAt -d postgres -c 'select 1' >"$fixture/wrong.out" 2>"$fixture/wrong.err"; then
  echo CI_WRONG_PASSWORD_ACCEPTED >&2; exit 95
fi
grep -q 'password authentication failed' "$fixture/wrong.err"
echo CI_WRONG_PASSWORD_REJECTED
export PGPASSWORD="$password"
test "$(psql -X -w -qAt -d postgres -c 'select 1')" = 1
echo CI_CORRECT_PASSWORD_ACCEPTED
T19_SYNTHETIC_CATALOG_ONLY=yes node scripts/t19-custody-recovery-native17.mjs
T19_PG_BIN="$(pg_config --bindir)" node scripts/run-t19-operational-postgres.mjs
echo CI_POLICY_OPERATIONAL_FULL_STAGE_NATIVE_PASS
createdb faraios_t16_test
export T16_TEST_DATABASE_URL="postgresql://postgres:${password}@127.0.0.1:5432/faraios_t16_test"
unset password
npm run check
echo CI_POLICY_SYNTAX_PASS
npm test
echo CI_POLICY_FULL_SUITE_PASS

T19_PG_BIN="$(pg_config --bindir)" npm run test:accounting:postgres
echo CI_POLICY_DEDICATED_NATIVE_PASS

# Explicit invocation: ordinary Node discovery must not launch native clusters.
T19_PG_BIN="$(pg_config --bindir)" node scripts/run-t19-c2-postgres.mjs
echo CI_POLICY_C2_NATIVE_PASS

T19_PG_BIN="$(pg_config --bindir)" node scripts/run-t19-custody-postgres.mjs
echo CI_POLICY_CUSTODY_NATIVE_PASS

T19_PG_BIN="$(pg_config --bindir)" node scripts/run-t19-restore-postgres.mjs
echo CI_POLICY_RESTORE_NATIVE_PASS
