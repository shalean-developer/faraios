#!/bin/bash
set -Eeuo pipefail
set +x
root=/mnt/c/Users/info/.codex/worktrees/main-ci-credentials/faraios/.pr103-tls-run
bin="$root/bin"
export PATH="$bin:/usr/bin:/bin"
chmod +x "$bin/node" "$bin/docker"
cd "$root/source"
clean() { env -i PATH="$PATH" HOME="$root/home" TMPDIR="$root/tmp" WSL_INTEROP="${WSL_INTEROP:-}" WSL_DISTRO_NAME=Ubuntu "$@"; }
if test "${1:-}" = check; then
 date --utc --iso-8601=seconds
 uname -a
 cat /etc/os-release
 node --version
 openssl version
 clean docker info --format '{{.OSType}} CPUs={{.NCPU}} Memory={{.MemTotal}}'
 clean docker image inspect postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826 --format '{{.Id}}'
 sha256sum scripts/check-backup-transport.mjs scripts/backup-staging.mjs scripts/vendor/supabase-root-2021.crt "$bin/docker"
 exit
fi
test "${1:-}" = run
# A local marker prevents accidental second invocation of the approved probe.
( set -o noclobber; printf 'approved one invocation\n' > "$root/probe-invoked" )
finish() {
 code=$?
 trap - EXIT
 test "$(realpath "$root/tmp")" = "$root/tmp" || exit 97
 find "$root/tmp" -mindepth 1 -maxdepth 1 -type d -name 'faraios-t11-tls-*' -exec rm -rf -- {} +
 printf 'OUTER_TMP_REMAINING='
 find "$root/tmp" -mindepth 1 -maxdepth 1 | wc -l
 printf 'TRANSPORT_EXIT=%s\n' "$code"
 date --utc --iso-8601=seconds
 exit "$code"
}
trap finish EXIT
date --utc --iso-8601=seconds
printf 'APPROVED_HEAD=81588da0de91e092463a18920f7c8522ec360c95\n'
clean timeout --signal=TERM --kill-after=10s 600s node scripts/check-backup-transport.mjs
