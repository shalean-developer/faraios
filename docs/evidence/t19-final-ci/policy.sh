#!/bin/bash
set -Eeuo pipefail
exec > >(tee /evidence/policy.log) 2>&1
echo 'CANDIDATE=d4643e244f5f9538264a5beec15b03984a437d32'
date --utc --iso-8601=seconds
cat /etc/os-release
uname -a
id
node --version
npm --version
postgres --version
node -p 'require("node:os").availableParallelism()'
sha256sum package.json package-lock.json .github/workflows/ci.yml test/availability-concurrency.test.js
fixture=$(mktemp -d /tmp/faraios-t19-policy-XXXXXX)
data="$fixture/data"
cleanup() {
 result=$?; trap - EXIT; set +e
 if test -f "$data/postmaster.pid"; then pg_ctl -D "$data" -m fast -w stop || result=90; fi
 cp "$fixture/postgres.log" /evidence/policy-postgres.log 2>/dev/null
 if test -f "$data/postmaster.pid"; then result=91; else echo POSTGRES_PID_ABSENT; fi
 case "$fixture" in /tmp/faraios-t19-policy-??????) rm -rf -- "$fixture";; *) result=92;; esac
 if test -e "$fixture"; then result=93; else echo POLICY_DATABASE_REMOVED; fi
 printf '%s\n' "$result" > /evidence/policy.exit.txt
 echo "POLICY_EXIT=$result"
 date --utc --iso-8601=seconds
 exit "$result"
}
trap cleanup EXIT
printf 'postgres\n' > "$fixture/synthetic-password"
initdb -D "$data" -U postgres -A scram-sha-256 --pwfile="$fixture/synthetic-password" --encoding=UTF8 --no-locale
pg_ctl -D "$data" -l "$fixture/postgres.log" -o "-h 127.0.0.1 -p 5432 -k $fixture -c shared_buffers=64MB" -w start
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres
export PGPASSFILE="$fixture/absent-pass" PGSERVICEFILE="$fixture/absent-service"
createdb faraios_t16_test
export T16_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/faraios_t16_test
npm run check
echo POLICY_SYNTAX_PASS
npm test
echo POLICY_FULL_SUITE_PASS
T19_PG_BIN="$(pg_config --bindir)" npm run test:accounting:postgres
echo POLICY_DEDICATED_NATIVE_PASS
sha256sum package.json package-lock.json .github/workflows/ci.yml test/availability-concurrency.test.js
