# T19 guarded database-provisioning package: rollback rehearsal gate

The owner requested preparation of the exact guarded package. Hosted installation is not authorised by this source change. The first executable package is deliberately rollback-only, for one stage per fresh baseline and owner approval. No commit mode or connector invocation exists. Do not treat a generated packet, review GUC, database name or project comment as execution authority or project identity.

## Bound source and prerequisites

The original runtime, OAuth and API SQL files remain unchanged and bound to the three SHA256 values in `scripts/t19-provisioning-package.mjs` and the accepted operational SQL pin manifest. The prepared SQL replaces only the single outer BEGIN/COMMIT boundaries; generated guards, source hash and complete resulting SQL hash are reviewable together. It always ends ROLLBACK. Commit provisioning requires a separate reviewed packet after this gate; do not edit ROLLBACK into COMMIT.

Fresh read-only hosted observation on 30 October: t19_hosted_custody is NOLOGIN/NOINHERIT without superuser/CREATEROLE/BYPASSRLS; runtime owner and machine table absent; private function count0, Vault secret count0. This observation is not a protected execution baseline and is not embedded as one. Private package upgrade and key-material checks are separate evidence. Staging service remains disabled; T20 excluded. The private loopback test certificate expires6November2026; do not assume it will remain eligible at execution time.

Before any rehearsal, reconfirm the original protected checkpoint/restore evidence and private hosted prerequisites; record the quiet window and review Vault and legacy publisher consumers. Obtain the actual Data API schema-exclusion readback. Do not run over nonempty custody or Vault. Do not enable a database LOGIN, register machine grants, install credentials or start consumers as part of this package.

## Owner preparation

1. On the pinned Node24 owner workstation, emit `node scripts/t19-provisioning-prepare.mjs --capture-sql` to a new owner-only file outside Git.
2. Execute that read-only capture through the exact verified staging session-pooler route: aws-0-eu-west-1.pooler.supabase.com:5432, database postgres, wire user postgres.xdmfyrsauvqznkloroxg, sslmode=verify-full and the previously verified root CA. Enter the password privately, never in argv, source or logs. Preserve the connection/TLS evidence. The SQL additionally verifies postgres session/current role, managed non-superuser CREATEROLE, PostgreSQL17 and backend TLS. It does not replace endpoint certificate and project-routing verification.
3. Retain the reported `T19_NATIVE_BASELINE_SHA256` from that exact capture, its time and full protected operator evidence. Create owner-only input JSON with exactly version1, projectRef, stage, baselineSha256 and capturedAt (epoch milliseconds). Only runtime is eligible initially; later stages require separately accepted prior installations.
4. Use `--prepare input.json empty-private-output-directory`. Linux owner-only input/output paths, canonical ancestors, no Git ancestors, a capture at most5minutes old and a15minute total lifetime are required. Outputs are rehearsal.sql, packet.json and fresh-after.sql. Inspect/hash all files and approve this exact one-stage rollback operation before execution. No preparation command executes SQL.

## In-transaction guards and after-state

The native baseline hashes catalog, role/membership/ACL/function definitions and protected relation/sequence values in PostgreSQL, preserving numeric text and returning only the SHA256. Protected scopes are public, audit, auth, storage, supabase_migrations, private_t19_custody and vault. No decrypted Vault view is read. Large tables are refused at100000rows; a60second statement timeout and5second lock timeout bound the rehearsal. Baseline bytes and source must match immediately inside the SERIALIZABLE transaction. Custody and Vault must be empty, the custody identity restricted, the stage sequence correct and packet unexpired.

After the exact stage runs, required counts, role restrictions, RLS, empty custody and removal of temporary SET/CREATE authority must pass. A fixed notice records that these limited checks passed; it is not a substitute for complete before/after ACL and function review. The transaction then rolls back. Run fresh-after.sql on a genuinely fresh verified connection; require the original baseline hash and zero scratch/new operational objects. Full protected catalog/permission and data/sequence evidence must remain unchanged, apart from PostgreSQL's nontransactional unused OID allocation. Do not infer equality from a psql exit code alone.

Use ON_ERROR_STOP. After a failure close/rollback the failed session, preserve private diagnostics and take a fresh read-only after-state. Unknown outcomes are quarantined; never auto-retry. No successful commit marker is generated, and repeated rehearsal is not implicitly authorised. Quiet-window coordination is required: the transaction and advisory-free capture do not stop an independent privileged operator from changing the project concurrently.

## Verification and remaining limits

Unit checks exercise all exact stage pins, refusal cases and non-managed/non-TLS capture denial. Existing full-file managed-style SQL tests retain commit, forced-abort, collision and permission evidence. A separate disposable PostgreSQL17 runner enables TLS with a synthetic CA and repeats the full-stage fixture: the generated packets run over verified TLS, drift/expiry fail closed, and fresh connections verify each rollback. The candidate has synthetic Vault substitutes; it is not hosted provider evidence.

This gate supplies a reviewable rehearsal package, not full provisioning acceptance. Still required before commit: exact executor authorisation and protected baseline, complete expected after-catalog/ACL/function review, legacy-consumer closure, actual API readback and a separately approved commit packet with commit-outcome reconciliation. Nonempty encrypted custody recovery/fencing remains required before provider/client secrets. No hosted mutation has run through this implementation.
