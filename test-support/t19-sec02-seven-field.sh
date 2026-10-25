#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == faraios_t19_test && "${PGHOST:-}" == 127.0.0.1 ]] || exit 90
admin() { PGUSER=t19_fixture PGPASSWORD=synthetic-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
custody() { PGUSER=t19_custody PGPASSWORD=fake-custody-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
sealer() { PGUSER=t19_sealer PGPASSWORD=fake-sealer-only psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
b() { printf "row('%s'::uuid,'%s','%s','%s'::uuid,%s,'%s',%s)::custody_durable.binding" "$1" "$2" "$3" "$4" "$5" "$6" "$7"; }
biz=612be091-b1d7-4911-9c3b-143446a9fe27
connection=22222222-2222-4222-8222-222222222222
normal="$(b "$biz" synthetic synthetic "$connection" 1 synthetic-shalean 1)"
op="'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid"
lease="'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid"
ref="'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid"
admin "TRUNCATE custody_durable.prepared_refs,custody_durable.operations; UPDATE custody_durable.connections SET generation=1,credential_version=1,enabled=true,reference='33333333-3333-4333-8333-333333333333'"
[[ "$(custody "select custody_durable.claim($normal,$op,$lease,interval '5 minutes')")" == t ]]
[[ "$(custody "select custody_durable.dispatch($normal,$op,$lease)")" == t ]]
for changed in "$(b 99999999-9999-4999-8999-999999999999 synthetic synthetic "$connection" 1 synthetic-shalean 1)" "$(b "$biz" production synthetic "$connection" 1 synthetic-shalean 1)" "$(b "$biz" synthetic zoho "$connection" 1 synthetic-shalean 1)" "$(b "$biz" synthetic synthetic 99999999-9999-4999-8999-999999999999 1 synthetic-shalean 1)" "$(b "$biz" synthetic synthetic "$connection" 2 synthetic-shalean 1)" "$(b "$biz" synthetic synthetic "$connection" 1 different-org 1)" "$(b "$biz" synthetic synthetic "$connection" 1 synthetic-shalean 2)"; do
 [[ "$(sealer "select custody_durable.prepare($changed,$op,$lease,$ref)")" == f ]] || { echo 'FAIL foreign binding accepted'; exit 1; }
done
[[ "$(admin "select count(*) from custody_durable.prepared_refs")" == 0 ]] || exit 1
[[ "$(sealer "select custody_durable.prepare($normal,$op,$lease,$ref)")" == t ]]
# Correct reference can only be consumed once; mismatched next credential version is fenced.
[[ "$(custody "select custody_durable.publish($normal,$op,$lease,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid)")" == f ]]
[[ "$(admin "select consumed from custody_durable.prepared_refs where reference=$ref")" == f ]]
[[ "$(custody "select custody_durable.publish($normal,$op,$lease,$ref)")" == t ]]
[[ "$(custody "select custody_durable.publish($normal,$op,$lease,$ref)")" == f ]]
[[ "$(admin "select consumed from custody_durable.prepared_refs where reference=$ref")" == t ]]
echo T19_SEC02_SEVEN_FIELD_REGISTRY_PASS
