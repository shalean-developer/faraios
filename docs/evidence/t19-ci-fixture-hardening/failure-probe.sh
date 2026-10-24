#!/bin/bash
set -eu
npm() {
  if test "${1:-}" = --version; then command npm --version; else return 42; fi
}
export -f npm
set +e
/bin/bash /repo/scripts/run-ci-policy.sh
result=$?
set -e
test "$result" = 42
test -z "$(find /tmp -maxdepth 1 -type d -name 'faraios-ci-policy-*' -print -quit)"
echo CI_INJECTED_FAILURE_EXIT_42_PRESERVED
echo CI_FAILURE_CLEANUP_VERIFIED
