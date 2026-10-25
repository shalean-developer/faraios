#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == faraios_t19_test && "${PGHOST:-}" == 127.0.0.1 ]] || exit 90
q() { local role="$1" pass="$2" sql="$3"; PGUSER="$role" PGPASSWORD="$pass" psql -X -qAt -v ON_ERROR_STOP=1 -c "$sql"; }
deny() {
 local role="$1" pass="$2" sql="$3" out code
 set +e
 out="$(PGUSER="$role" PGPASSWORD="$pass" psql -X -qAt -v VERBOSITY=sqlstate -v ON_ERROR_STOP=1 -c "$sql" 2>&1)"
 code=$?
 set -e
 [[ "$code" -ne 0 && "$out" == *42501* ]] || { echo "FAIL denied $role / $sql: $out"; exit 1; }
}
b="row('612be091-b1d7-4911-9c3b-143446a9fe27'::uuid,'synthetic','synthetic','22222222-2222-4222-8222-222222222222'::uuid,1,'synthetic-shalean',1)::custody_durable.binding"
before="$(q t19_fixture synthetic-only "select md5((select json_agg(row_to_json(c) order by connection_id)::text from custody_durable.connections c)||coalesce((select json_agg(row_to_json(o) order by operation_id)::text from custody_durable.operations o),'[]')||coalesce((select json_agg(row_to_json(p) order by reference)::text from custody_durable.prepared_refs p),'[]'))")"
for entry in t19_web:fake-web-only t19_invoice_worker:fake-invoice-only t19_historical_publisher:fake-historical-only t19_sealer:fake-sealer-only t19_custody:fake-custody-only; do
 role="${entry%%:*}"; pass="${entry#*:}"
 deny "$role" "$pass" 'select * from custody_durable.prepared_refs'
 deny "$role" "$pass" "update custody_durable.prepared_refs set consumed=true"
 deny "$role" "$pass" "insert into custody_durable.prepared_refs(reference,operation_id,lease_id,business_id,environment,provider,connection_id,generation,organization_id,credential_version) values('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','612be091-b1d7-4911-9c3b-143446a9fe27','synthetic','synthetic','22222222-2222-4222-8222-222222222222',1,'synthetic-shalean',2)"
 deny "$role" "$pass" 'set role t19_durable_owner'
 deny "$role" "$pass" 'create table custody_durable.malicious (id int)'
done
for entry in t19_sealer:fake-sealer-only t19_custody:fake-custody-only; do
 role="${entry%%:*}"; pass="${entry#*:}"
 deny "$role" "$pass" 'select * from custody_durable.connections'
 deny "$role" "$pass" 'update custody_durable.connections set enabled=true'
 deny "$role" "$pass" 'select * from custody_durable.operations'
done
deny t19_sealer fake-sealer-only "select custody_durable.publish($b,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)"
deny t19_custody fake-custody-only "select custody_durable.prepare($b,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)"
[[ "$(q t19_fixture synthetic-only "select rolcanlogin::text||':'||rolsuper::text||':'||rolcreaterole::text from pg_roles where rolname='t19_durable_owner'")" == "false:false:false" ]] || { echo 'FAIL function owner flags'; exit 1; }
[[ "$(q t19_fixture synthetic-only "select count(*) from pg_auth_members m join pg_roles r on r.oid=m.roleid where r.rolname='t19_durable_owner'")" == 0 ]] || { echo 'FAIL owner membership'; exit 1; }
after="$(q t19_fixture synthetic-only "select md5((select json_agg(row_to_json(c) order by connection_id)::text from custody_durable.connections c)||coalesce((select json_agg(row_to_json(o) order by operation_id)::text from custody_durable.operations o),'[]')||coalesce((select json_agg(row_to_json(p) order by reference)::text from custody_durable.prepared_refs p),'[]'))")"
[[ "$before" == "$after" ]] || { echo 'FAIL protected state mutated'; exit 1; }
echo T19_SEC02_EFFECTIVE_PRIVILEGE_DENIAL_PASS
