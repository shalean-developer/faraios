#!/bin/bash
set -Eeuo pipefail
root=/mnt/c/Users/info/.codex/worktrees/t19-research/faraios/.t19-ci-hardening-build
bin="$root/linux-bin"
chmod +x "$bin/node" "$bin/docker"
cd "$root/transport"
export PATH="$bin:/usr/bin:/bin"
if test "${1:-}" = check; then
  uname -a
  cat /etc/os-release
  "$bin/node" --version
  openssl version
  env -i PATH="$PATH" HOME="$root/transport-home" TMPDIR="$root/transport-temp" WSL_INTEROP="${WSL_INTEROP:-}" WSL_DISTRO_NAME=Ubuntu docker info --format '{{.OSType}}'
  env -i PATH="$PATH" HOME="$root/transport-home" TMPDIR="$root/transport-temp" WSL_INTEROP="${WSL_INTEROP:-}" WSL_DISTRO_NAME=Ubuntu docker image inspect postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826 --format '{{.Id}}'
  exit
fi
test "${1:-}" = run
date --utc --iso-8601=seconds
echo 'CANDIDATE=90dbc74933357b9e9ca257c08c9616b1b3ade96e'
sha256sum scripts/check-backup-transport.mjs scripts/backup-staging.mjs
env -i PATH="$PATH" HOME="$root/transport-home" TMPDIR="$root/transport-temp" WSL_INTEROP="${WSL_INTEROP:-}" WSL_DISTRO_NAME=Ubuntu node scripts/check-backup-transport.mjs
date --utc --iso-8601=seconds
