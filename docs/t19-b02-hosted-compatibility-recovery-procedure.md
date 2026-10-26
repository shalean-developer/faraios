# T19 Gate B-02 — Hosted compatibility and recovery test procedure (approval request)

**Status:** PROPOSED / NOT APPROVED / NOT EXECUTED. **Date:** 27 October 2026. Owner-led staging governance: T19-A12-OWNER-20261026 (D15). Scope is a *new isolated scratch namespace* in **FaraiOS staging only**, with all changes rolled back or separately verified cleaned. Not an approval for `database/t19-custody-runtime.sql`, credentials, Vault writes or Zoho.

## Pinned target and source
- Supabase staging project `xdmfyrsauvqznkloroxg`, eu-west-1, managed PostgreSQL 17.11; executor `postgres` (LOGIN / CREATEROLE / non-superuser). Verify these values anew immediately before testing.
- Git staging baseline `68ea34e2c129764fb0bad1ec0d5544eea69d79d8`.
- Proposed **future** runtime SQL `database/t19-custody-runtime.sql` blob `1e3fdd9335308d86d3e9228491ece12f1d809a5b` — **must not be executed** during this rehearsal.
- Existing `private_t19_custody` schema and tables are excluded from test mutation. Never reapply the old inactive schema proposal.
- All scratch object names below are test-only, prefixed `t19_b02_qa_`. Refuse execution if any already exist. Do not choose random production-like or business-owned IDs.

## Stage 0 — Read-only identity, dependency and protected-state baseline
Run through approved restricted SQL execution route, with results saved in a private evidence packet (no credentials or customer financial data).
- Verify exact project ref via project metadata *outside* SQL; SQL `current_user`, `session_user`, version, roles/SET memberships, installed extensions and schema inventory.
- Capture object/column/index/constraint/grant/role membership and default-ACL fingerprints for `private_t19_custody`; counts and stable fingerprints (not row values) of business accounting connections, invoices, bookings, audit and migrations; Vault **count only** (never query secret contents).
- Check protected snapshot, database restore destination, backup encryption/key location, retention, test-restoration procedure and approved recovery owner. **If no safe isolated restore destination or validated recovery method, classify operational recovery BLOCKED; do not infer a restore PASS from transactional rollback.**
- Verify `private_t19_custody` is excluded from Supabase Data API exposed schemas. Owner screenshot confirms configuration, but this does not replace an API probe.
- Review host/Edge/app Vault consumers and exact `service_role` grants before any later changes.

## Stage 1 — Read-only HTTP API denial (no service role key)
Using only a published staging URL and public **publishable/anon** key provisioned privately for the probe (never paste, log or commit it), issue a bounded read-only GET for a nonexistent row in `private_t19_custody.connections` using `Accept-Profile: private_t19_custody` against /rest/v1/connections?select=connection_id&limit=1. Expect a non-success schema-not-exposed/permission-denied response, no rows, no object metadata or secrets. Repeat with an ordinary authenticated TEST account **only if already available and expressly authorized**, never customer credentials. Log HTTP status, public error code and redacted response category only. If the exposed-schema configuration has changed, or if HTTP returns 2xx, stop and declare NO-GO. Do not probe actual business tables or enumerate data.

## Stage 2 — Managed PostgreSQL owner/SET compatibility, inside explicit rollback
Requires a separate owner approval of this exact synthetic SQL and a verified restricted executor. Do not silently use SQL Editor or any production project. Test roles are `t19_b02_qa_executor` (NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEROLE), `t19_b02_qa_owner` (NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEROLE), created by the privileged staging executor strictly inside a **single BEGIN/ROLLBACK transaction**. Scratch schema: `t19_b02_qa_schema`, scratch function `probe()`. No persistent role grants, applications, tokens or real tenant IDs.
1. Assert none of these names already exist; record before fingerprints.
2. BEGIN; create the scratch roles and schema/function solely for the test. Revoke PUBLIC EXECUTE for probe() and ensure no external grants.
3. Verify `pg_has_role('t19_b02_qa_executor','t19_b02_qa_owner','SET') = false` and no inherited privilege initially.
4. Confirm an unauthorized owner transfer as restricted execution fails with SQLSTATE **42501**; ensure the error is caught in a SAVEPOINT so transaction can continue.
5. Verify a deliberately authorized *temporary* membership SET privilege and schema CREATE prerequisite permit ownership transfer using the **same syntax and privilege pattern** proposed by runtime SQL; revoke the temporary authority before ROLLBACK. Confirm post-revoke `SET=false`, CREATE=false. If managed PostgreSQL rejects GRANT/ownership syntax, stop and mark incompatible; do not improvise elevated grants.
6. ROLLBACK entire transaction; prove roles, schema, function and every grant absent afterward. Confirm protected catalog/data fingerprints unchanged and no prior objects dropped.
7. A deliberately raised exception inside a SAVEPOINT must be captured with SQLSTATE **55000** and rolled back with no leaked scratch objects. Missing capability or unexpected SQLSTATE => FAIL, no runtime installation.
Do **not** use `SET SESSION AUTHORIZATION` on hosted Supabase without separately verifying managed restrictions. Use a properly scoped test identity where permitted. Do not run source-only test superuser shortcuts against hosted application data.

## Stage 3 — Non-production recovery rehearsal
Two independent proof levels must be recorded:
- **Transaction rollback**: stage-2 scratch objects absent and protected fingerprints unchanged, capture actual SQLSTATEs; this validates only the bounded transactional test.
- **Operational restore**: using a *separately approved isolated disposable recovery destination* and authorized encrypted backup copy, perform a real restore and compare immutable schema/object counts, grants, financial-record counts/fingerprints, and archive manifest. Test failure/abort and cleanup. Capture evidence of restoration, permissions, inaccessible secrets, cleanup and recovery time. Do not restore over staging or production, export credentials, or declare recovery PASS from a mock/no-op. If destination or encrypted-key custody is unavailable, **STOP and mark RECOVERY NOT VERIFIED**; request distinct owner risk decision before any operational SQL approval.

## Acceptance and stop conditions
PASS requires: exact project/source match; denied HTTP profile request; 42501 restricted transfer denial; scoped permitted transfer; temporary grants removed; 55000 abort rollback; zero persistent scratch roles/objects; unchanged business and security fingerprints; confirmed Vault isolation impact; independently verified isolated restore or separately approved explicit risk acceptance *specific to the operational stage*. Record SQLSTATE/HTTP redacted evidence and operator identity/time.
NO-GO if any role/SET action succeeds unexpectedly, a public API request leaks data, a test changes a financial record or Vault secret, an SQL error leaves a persisted role/grant, recovery is unavailable without risk acceptance, or final SQL bytes drift.

## Approval boundaries
Approving **this procedure only** authorizes read-only probes now; the managed-role transactional test and isolated restore each require their own explicit action-time approval and resource check. It does NOT authorize the T19 runtime SQL, OAuth SQL, API SQL, mTLS service provisioning, credentials, Zoho consent, worker scheduling, invoices or production operations.

**Status before execution:** T19 In progress; Gate B-02 PARTIAL; Accounting activation NO-GO; T20 Not started.
