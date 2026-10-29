# T19 step 3: operational custody permission preflight

29 October 2026. **Source corrections prepared; hosted provisioning remains NO-GO pending the remaining exact operational packet.** This follows the accepted [current-scope restore rehearsal](t19-current-scope-restore-pass-20261029.md), not a new recovery attempt. The owner directed step 3 preparation and staging delivery of completed local fixes. No credentials, SQL, grants, role login flags, service configuration, OAuth or financial state were changed on a hosted system.

## Verified authority and current state

Re-read canonical Build Tracker rows 20–21, Decisions D14–D15 and T19 Evidence rows 65–72. T19 remains In progress and T20 Not started. Owner-led staging assessment replaces the external-review dependency; technical, exact-operation and acceptance gates remain. The tracker was not edited.

Read-only Supabase connector observations on project xdmfyrsauvqznkloroxg, authenticated database principal/session postgres, PostgreSQL 17.11:

- Three custody tables remain postgres-owned with RLS enabled, no custody functions and zero rows in each table. Runtime owner is absent; t19_hosted_custody remains NOLOGIN/NOINHERIT/non-superuser without CREATEROLE or BYPASSRLS. Its only recorded membership is postgres with supabase_admin grantor, ADMIN true, INHERIT false, SET false.
- Vault secrets and enabled accounting connections are zero. Browser roles and service_role lack custody-schema USAGE. The custody role lacks Vault USAGE.
- postgres can delegate Vault view SELECT and the installed four-argument create_secret function. It can use auth and auth.uid(), but has neither auth-schema USAGE grant option nor auth.uid() EXECUTE grant option. auth.uid() currently has PUBLIC EXECUTE. These are effective permission observations, not successful grant tests.
- service_role retains managed Vault SELECT/create/update capabilities. No non-Vault routine body matched the bounded textual Vault reference scan. This does not prove absence of dynamic SQL, external consumers, Edge functions or host-held service keys; full consumer closure remains open. No blanket managed-role revocation was attempted.
- No pgrst.db_schemas role-setting row was returned. This is not fresh proof of actual exposed-schema settings. Preserve the prior dashboard evidence; obtain current API/configuration evidence before provisioning acceptance.

## OP-05: managed Auth schema delegation

The old runtime source attempted to delegate Auth schema USAGE and auth.uid() EXECUTE. On this managed principal those grants cannot establish the intended runtime privileges. A non-superuser synthetic reproduction confirmed a definer function's late auth.uid() lookup fails with SQLSTATE 42501 when its owner lacks Auth schema USAGE.

The corrected source adds private_t19_custody.actor(), a no-argument STABLE SQL SECURITY INVOKER helper with fixed pg_catalog search_path and a BEGIN ATOMIC body that checks effective EXECUTE before selecting auth.uid(), returning no identity when authority is absent. PostgreSQL resolves this body and records its function dependency at definition time, when the reviewed executor already has Auth access. This preserves the existing identity function; it does not parse a new identity claim, accept a caller UUID, add a definer escalation, change Auth ownership/grants or expose a new public RPC. Existing business authorization continues to use trusted memberships.

The runtime owner receives no Auth schema grant. A new preflight checks effective auth.uid() EXECUTE and fails with 42501 when unavailable; the helper explicitly rechecks EXECUTE on each invocation as well. The first native CI run demonstrated that cached/inlined SQL can otherwise keep returning the identity after revocation; that failed result is retained. A revoked underlying grant must now produce NULL or 42501, never the prior identity, and protected authorization must deny. Browser roles cannot invoke the private helper directly. The helper is owned by the same restricted runtime owner and hardened with the other private functions before transfer.

## OP-06: function ACL order

The previous source hardened some functions after transferring ownership and restoring the executor's NOINHERIT/NOSET membership. Restricted PostgreSQL executors can then issue ineffective GRANT/REVOKE statements with warnings; default PUBLIC EXECUTE can remain. Superuser fixtures masked this permission lifecycle defect.

Move each private function's existing revocations and intended narrow grants before its ownership transfer, while the executor still owns it. No intended caller permission is broadened. Table/schema ownership and the temporary SET/CREATE lifecycle stay unchanged. Runtime, OAuth and API stages retain separate collision guards and transactions; historical installed inactive SQL is unchanged.

## Regression evidence and limits

The OP-05 regression executes the actual source helper/guard under a non-superuser executor with no provider grant option. It demonstrates old lookup denial, unchanged identities across two subjects and missing subject, stored dependency, invoker mode, no Auth schema access, private-helper denial and failure after underlying EXECUTE removal.

OP-06 reproduces the old ineffective revocation and tests the actual corrected source ACL blocks under a NOINHERIT executor. It verifies exact effective anonymous/service/browser/machine privileges and removal of temporary SET authority across all three stages. Both regressions run with PGlite locally and explicitly in the dedicated native PostgreSQL CI cluster, using synthetic objects and rollback. They do not establish actual hosted login/mTLS/API enforcement.

Final SQL SHA256 identities for review:

Local targeted custody/OAuth/machine/operation and OP-05/OP-06 regressions: 41/41 PASS, zero skips/failures. The added old-order reproduction rerun passed separately. Syntax and diff checks passed. Native PostgreSQL execution is required by the updated dedicated CI runner before staging merge.

| Review source | SHA256 |
| --- | --- |
| database/t19-custody-runtime.sql | 5797da30b84c2a09de30c0b024cb62fe123d6eed610a6ca24867badb7f295f65 |
| database/t19-custody-oauth.sql | 45a4f0a3bfa8010bcf02ff0a5a28f49d40779fc82855c860ff826a29b981a05a |
| database/t19-custody-api.sql | 5939789b9da7d37531394f403a5ca45d1db25609c0fa202b39c5bdd3b2419ba2 |

These supersede prior operational review-source hashes only. They are not apply instructions, a generated migration or authorization to run the files. The accepted bootstrap/restore bundles and historical evidence remain unchanged.

## Remaining before exact provisioning

Complete current dependency/default-privilege and Vault-consumer closure, verify Data API exposure, qualify restricted pooler login/transport and actual private service/OS/mTLS configuration, and prepare exact staged SQL postconditions plus pre-commit rollback/unknown-outcome handling. Verify nonempty operational custody recovery/fencing before credentials are introduced; the accepted empty-custody reconstruction is not that evidence. Present the concrete reviewed installation and private credential-provisioning package before hosted execution. Keep both connections and dispatch disabled.

Security advisor readback reported expected RLS-without-policies on the inactive custody tables and other deny-by-default ledgers; no permissive policy was added. It also reported leaked-password protection disabled (remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This audit did not change unrelated Auth settings.

References: https://www.postgresql.org/docs/17/sql-createfunction.html (SQL-standard body resolution/dependencies); https://supabase.com/docs/guides/database/postgres/roles and https://supabase.com/docs/guides/database/vault (managed roles and Vault access). T19 remains In progress, accounting activation NO-GO, T20 excluded.
