#!/bin/bash
set -Eeuo pipefail
exec > >(tee /evidence/run.log) 2>&1
echo 'CANDIDATE=d4643e244f5f9538264a5beec15b03984a437d32'
date --utc --iso-8601=seconds
uname -a
cat /etc/os-release
node --version
postgres --version
psql --version
id
sha256sum test/availability-concurrency.test.js
test "$(node -p 'process.versions.node.split(".")[0]')" = 24
postgres --version | grep -E 'PostgreSQL\) 17\.'
fixture=$(mktemp -d /tmp/faraios-t19-linux-XXXXXX)
data="$fixture/data"
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres
export PGPASSFILE="$fixture/absent-pass" PGSERVICEFILE="$fixture/absent-service"
cleanup() {
 result=$?
 trap - EXIT
 set +e
 if test -f "$data/postmaster.pid"; then
   pg_ctl -D "$data" -m fast -w stop
   stopped=$?
   if test "$stopped" -ne 0; then result=90; fi
 fi
 cp "$fixture/postgres.log" /evidence/postgres.log 2>/dev/null
 if test -f "$data/postmaster.pid"; then result=91; else echo 'POSTGRES_PID_ABSENT'; fi
 case "$fixture" in /tmp/faraios-t19-linux-??????) rm -rf -- "$fixture";; *) result=92;; esac
 if test -e "$fixture"; then result=93; else echo 'DISPOSABLE_DATABASE_DIRECTORY_REMOVED'; fi
 printf '%s\n' "$result" > /evidence/exit-code.txt
 echo "HARNESS_EXIT=$result"
 date --utc --iso-8601=seconds
 exit "$result"
}
trap cleanup EXIT
initdb -D "$data" -U postgres -A trust --encoding=UTF8 --no-locale
pg_ctl -D "$data" -l "$fixture/postgres.log" -o "-h 127.0.0.1 -p 5432 -k $fixture -c shared_buffers=32MB -c log_lock_waits=on -c deadlock_timeout=100ms" -w start
createdb faraios_t16_test
psql -X -At -d faraios_t16_test -c 'select version(); select count(*) from pg_tables where schemaname not in ($$pg_catalog$$,$$information_schema$$);'
export T16_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/faraios_t16_test
node --test --test-reporter=tap test/availability-concurrency.test.js
echo 'UNCHANGED_LEGACY_NATIVE_LINUX_PASSED'
