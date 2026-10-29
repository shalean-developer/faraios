#!/bin/bash
# Preparation only. No signature, Docker mutation, checkpoint input or hosted apply.
set -euo pipefail
umask 077
test "$(id -u)" = 0
T19_NODE=/opt/faraios-t19-node24/node-v24.22.1-linux-x64/bin/node
printf '%s  %s\n' \
 e32e2d16081cf644f88392934288086e7662529d0d43277c34f7aad2207cfafb \
 "$T19_NODE" | sha256sum --check
cd "$(dirname "$0")/.."
export T19_RUN="$(mktemp -d /root/t19-operational-run-XXXXXXXX)"
"$T19_NODE" --input-type=module <<'NODE'
import {protectedPath,operationalCaptureSQL} from './scripts/t19-operational-rehearsal-host.mjs';
import {writeFile} from 'node:fs/promises';
await protectedPath('/root/t19-b02-djBr95UI/root.crt');
await writeFile(process.env.T19_RUN+'/capture.sql',await operationalCaptureSQL(),{flag:'wx',mode:0o600});
console.log('EXPLICIT_READ_ONLY_OPERATIONAL_CAPTURE_READY');
NODE
T19_CONNECTION="host=aws-0-eu-west-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.xdmfyrsauvqznkloroxg sslmode=verify-full sslrootcert=/root/t19-b02-djBr95UI/root.crt connect_timeout=10 application_name=t19-operational-catalog"
psql -X -W -qAt --set=ON_ERROR_STOP=1 "$T19_CONNECTION" \
 --file="$T19_RUN/capture.sql" > "$T19_RUN/expected.json"
"$T19_NODE" scripts/t19-operational-rehearsal-host.mjs \
 --prepare "$T19_RUN/expected.json" "$T19_RUN"
printf 'SOURCE_DIRECTORY=%s\nPRIVATE_OPERATIONAL_RUN_DIRECTORY=%s\n' "$PWD" "$T19_RUN"
