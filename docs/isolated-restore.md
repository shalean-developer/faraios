# T11 — Isolated restore preparation

20 October 2026. One-off FaraiOS recovery exercise only. Source `xdmfyrsauvqznkloroxg`; destination `faraios-restore-test` / `zrlojsvkqipuwkkyfrkn`, approved organization `lypbvtudsbxxdcnzbqwc`. Existing Shalean/Bokkie systems and the source staging launcher remain unchanged. T04 finance decisions and T19 accounting hold remain open.

## Completed capture checkpoint

The owner completed logical capture `6d6642b010653cc4a83adc3a56b40734`. Encrypted local verification and helper cleanup passed. The encrypted archive and checksum were uploaded to the approved private Drive folder; independent encrypted retrieval matched SHA-256 `53672bbedb8de3d6faa5b1e7830558d6dd5b84bfb1d9d40335e2d433725e18f6`. The owner subsequently reported `encryptedBackupVerification: PASSED` for the downloaded-file handoff. The key was never transmitted to the agent or Drive. **No offline key copy exists**; the owner has no removable drive available. That acceptance item stays pending.

No actual restore or restored sign-in/access acceptance has run. The current encrypted archive is a logical database capture, not all provider configuration or Storage bytes. Source inventory had zero Storage objects, Vault secrets, Edge Functions, column-encryption extensions, custom managed-schema triggers/policies or custom PostgreSQL login roles. These are scoped observations, not universal guarantees.

## Fixed bindings and provenance

`config/restore-test.json` contains only public connection metadata, a publishable key, the approved archive identity/checksum and structural fingerprints. The archive must pass the original authenticated private-key checks and match that exact ciphertext. Its captured raw catalog hash must match the reviewed source hash before any destination connection.

The reviewed source raw catalog and portable catalog were computed together in one repeatable-read, read-only snapshot. The raw projection uses the capture connection's default search path, then the portable projection uses an empty search path; only hashes and the setting are returned. A changed raw capture hash fails closed; do not silently bless a different backup. The portable application projection covers columns, column ACLs, relation/schema grants and ownership, RLS, constraints, indexes, views, functions, audit triggers, custom types, global/schema default grants, role capabilities/configuration and named role memberships. All role names and memberships are checked; no role-name prefix is excluded. Managed server credentials are not copied.

Auth/Storage structure is compared before import and again with the application catalog after import. Managed schemas are **never** blindly replayed from `managed-schema-reference.sql`. Native managed migration histories remain provider-owned. Their two table row digests are excluded from data replay comparison; their structure is still checked. A managed-schema difference stops the exercise for review.

Transport uses the existing immutable PostgreSQL17.11 Docker client and pinned provider CA, `verify-full`, fixed destination tenant username and session-pooler port5432. CLI arguments/environment cannot supply another project, host, CA, image or password. No source connection, password reset, role escalation, broad Docker cleanup or app repointing is available through the restore helper. The destination's own Connect panel confirmed `aws-0-eu-west-1.pooler.supabase.com:5432`, database `postgres` and user `postgres.zrlojsvkqipuwkkyfrkn` on20Oct2026.

## Isolation before execution

Use only the approved empty destination. Recheck its identity, health, public/application objects, all non-migration Auth/Storage data, Vault, large objects, foreign servers, extensions and managed schema. Unknown application functions, domains/types or nonempty data block the import. `btree_gist` is enabled only inside the destination import transaction; the installed version must match the capture.

Before import, verify destination signup/provider/email/SMS/hooks/job configuration and keep the project unused. No production OAuth, SMTP, payment or accounting credentials should be added. The destination dashboard review on20Oct2026 confirmed phone, external/custom providers, manual linking and anonymous sign-ins disabled, no Auth hooks, custom SMTP off, and all seven security notification switches off. New signup was disabled and its saved state was rechecked. Email/password login and email confirmation remain enabled. Provider-default email delivery still exists: the restore launcher blocks signup/recovery/email flows and allows password sign-in/local logout only; do not use the dashboard or public Auth API to send invitations, reset emails or magic links. This is a bounded rehearsal isolation control, not a claim that Supabase has no email capability. New destination credentials, if needed, are entered and submitted privately by the owner; never reset the source again.

## Two explicit restore phases

1. `scripts/restore-staging.mjs` decrypts in memory using the existing separate private PC key, validates the archive, and checks the exact empty destination. It rechecks emptiness/catalog inside an advisory-locked transaction, imports roles/schema/history/data and checks all replayed table counts/row digests, extension versions, disabled accounting connections and the portable structural fingerprints **before** commit. The helper writes no plaintext SQL dump files. Dumps and child errors remain in memory; the workstation/Docker administrator is trusted.
2. Native `data.sql` contains one managed Auth sequence assignment (`auth.refresh_tokens_id_seq`). PostgreSQL `setval` does not roll back; this destination's `postgres` role has SELECT/UPDATE privileges but is not the owning role, so transactional `ALTER SEQUENCE RESTART` is not assumed. Strict parsing removes the native assignments outside COPY rows during phase1. After an acknowledged table/schema commit, a separate guarded phase rechecks the imported rows/catalog before applying the captured `last_value` and `is_called`, then verifies them. The project stays held until this phase passes. This is explicitly **not one atomic transaction covering sequences**.

The parser rejects missing, duplicate, malformed, out-of-range or unknown sequence entries and preserves COPY record text unchanged. Sequence privileges are checked before phase1. Interrupted/lost acknowledgements or cleanup failure block a success result and never trigger automatic reimport. A late phase1 failure should roll back schema/data/role creation without changing the pre-existing managed sequence. Native CI exercises this contract, including guarded sequence completion/resume.

## Private operator commands after reviewed preparation

Pull the merged package and keep the restore project unused. Run `npm run restore:test` in an interactive Windows PowerShell terminal. A file picker selects the verified downloaded `.fbackup`; no long path or key path must be typed. Confirm `RESTORE_TEST` only after isolation is verified, then enter **the existing destination database password** at the hidden prompt. It is different from the source password. The helper does not reset either password.

Success reports `restore: COMMITTED`, `dataVerification: PASSED`, `catalogVerification: PASSED` and `sequenceVerification: PASSED`, plus elapsed time and capture completion time. Actual operator execution is still pending. `helperPlaintextSQLFiles: NEVER_WRITTEN` refers to helper-managed dump outputs, not swap/crash dumps/administrator access.

If a failure occurs, share only its fixed label. Do not retry an import blindly. Use `node scripts/restore-staging.mjs --verify-restored-file <downloaded-archive>` privately to determine whether restored rows/catalog/sequences pass. `RESTORE_DATA_VALID_SEQUENCES_UNVERIFIED` distinguishes a passed data/catalog check from unverified sequence completion. Only after that outcome is reviewed, an isolated held destination may use `--finish-sequences-file <downloaded-archive>`; it revalidates approved data/catalog before any sequence update. No schema/data reimport occurs. If source tables changed or someone signed in, this guard may fail and requires review rather than resetting counters.

## Separate read-only app acceptance

Only after both restore phases pass, start `npm run restore:app`. `restore-rehearsal.mjs` pins the destination publishable key/URL and binds `127.0.0.1:3103`. The regular staging app remains on3101. The restore app uses a distinct cookie, visible RESTORE TEST banner, blocks all business mutations and has no accounting worker. Its request allowlist permits only destination password sign-in/user verification/local logout, table reads and the six existing read RPCs; redirects, signup/recovery, refresh grants, arbitrary mutation RPCs and other hosts are blocked.

Verify a fresh owner sign-in and both business/module views privately. Repeat the manager and shared-staff access verifier with `--restore-test`; it uses only3103 and the restore cookie and checks its isolation marker before submitting a QA password. Authorization must still come from restored trusted membership records; test denied access and logout cleanup as well as allowed reads. Auth sign-in can change managed session/user rows, so record database digest verification **before** these acceptance logins. Existing sessions/JWTs are not reused across projects.

A rollback-only audit probe and direct RLS/permission checks on the actual restored project remain separate acceptance evidence. Record capture age, database restoration elapsed time and full application recovery elapsed time distinctly; no promised RPO/RTO is implied. Independent final QA and owner acceptance are still required.

## Gate

Preparation is not complete recovery. Keep T11 In progress with completion dates blank until actual isolated restore, provider/configuration coverage, fresh sign-in/module/RBAC/audit checks, offline key custody, measurements and independent acceptance are evidenced. No schedule, retention deletion or production activation is added here.

Primary references: [Supabase CLI logical restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [PostgreSQL17 sequence state](https://www.postgresql.org/docs/17/functions-sequence.html), [ALTER SEQUENCE ownership/transactionality](https://www.postgresql.org/docs/17/sql-altersequence.html). Current provider changelog and PostgreSQL17.11/extension changes reviewed20Oct2026.
