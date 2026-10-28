# T19 inactive custody recovery definition

Decision: **CONDITIONAL PASS for source preparation; NO-GO for restore execution.** This is owner-requested recovery source, not operational custody installation. It does not authorize applying SQL to staging or the protected prior restore project.

## Evidence and recovery scope

The owner authenticated two encrypted archives using the hash-verified Windows backup helper and existing key ACL checks. The 2026-10-26 archive is bound to the saved v2 profile and contains 30 application/audit tables; the older 2026-10-20 archive is not current-profile-bound and contains 17. Neither records custody tables in its manifest. Authentication and member checks passed, but neither archive has been restored for current T19 acceptance.

Current staging's 30 application/audit table names match the saved profile. Managed Auth/Storage structural hash matches. The current application hash reproduces the checkpoint hash when only the added t19_hosted_custody role and its memberships are excluded from the read-only projection. Current and prior application/managed readings were stable. This accounts for the difference in the measured structural projection; it is not proof of row/sequence equality, custody recovery, every platform setting, or restored functionality. Both original evidence directories remain unchanged and private.

The owner verified three postgres-owned custody tables, RLS enabled and FORCE RLS false, no custody functions and no policies. Prior bounded reads found all three empty, with no enabled accounting connections or Vault secrets. Fresh emptiness verification is required before classifying this as empty-state recovery. Nonempty custody requires a new authenticated data checkpoint and a different recovery plan; this overlay must never replace missing custody data.

The authenticated B02 v2 managed-role test passed: observed 42501 denial and 55000 abort notices, exit 0, zero scratch objects and matching fresh protected after-state. That is transactional compatibility evidence, not an operational restore.

## Source candidate

`docs/proposals/t19-inactive-custody-recovery.sql` derives table definitions from `docs/proposals/t19-02-staging-inactive-schema.sql` and RLS/revocations/assertions from the applied `docs/proposals/t19-a12-inactive-hardening.sql`. Historical sources remain unchanged.

SQL SHA-256: `b3aa5f7578b8cbabeeb7343a8e1b26fadc59b9c6d19e4b73026534d446cae4c0`.

| Object | Candidate recovery definition |
|---|---|
| Role | t19_hosted_custody: NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS; no password or role configuration supplied |
| Membership | postgres receives ADMIN TRUE, INHERIT FALSE, SET FALSE; exact source grantor/options and absence of other edges must be confirmed before acceptance |
| Schema | private_t19_custody, explicitly postgres-owned; no app-role or PUBLIC access |
| connections | Original 9 columns, UUID PK, staging/zoho/positive-version checks, original composite uniqueness, enabled defaults false |
| operations | Original 7 columns, UUID PK, connection FK, original phase check and unique partial t19_one_open_operation index |
| prepared_references | Original 8 columns, UUID PK, unique operation FK, connection FK, consumed defaults false |
| RLS | Enabled on all three tables, not forced; no policies |
| Permissions | Existing applied hardening revokes PUBLIC/anon/authenticated/service_role/t19_hosted_custody schema and table privileges; postgres retains ownership; exact effective/explicit ACL and grantor comparison required |
| Functions and runtime | None; no runtime owner, SECURITY DEFINER functions, Vault grants, credentials, OAuth, workers or operational activation |

The overlay is a single transaction. It refuses a wrong SQL principal/version, missing isolated-candidate intent, any existing custody schema/role, runtime owner, or absent standard app roles. The custom GUC is a fail-closed intent check, **not an authorization or isolation proof**. Caller must independently bind the approved new disposable container, local socket, image digest, database, resource limits and complete execution plan. Never run this from the hosted pooler. Never change guards, revoke broader rights, or drop preexisting objects to make it pass.

## Required live-definition reconciliation

Compare the privately retained custody structural projection against candidate reconstruction: columns/types/defaults/nullability, constraints and validation/deferability, index definitions and validity, owner, RLS/FORCE RLS, explicit/effective schema/table/column/default ACLs including grantor/grantee/grant option, role flags/config/connection limit and every membership edge. Confirm empty tables, no functions, policies, custom types, sequences or unexpected objects. A matching subset of table names/RLS flags is insufficient. Do not silently generalize the broader public/Vault permissions or change existing service_role Vault capabilities.

Remaining live role/default-ACL details and full candidate catalog parity are pending. This document does not claim they have passed. Private archive paths, ciphertext/member hashes, key material, financial fingerprints and rows must stay out of Git and CI.

The offline `scripts/t19-custody-recovery-compare.mjs` compares the owner's saved custody definition against 17 canonical component fingerprints reconstructed from this candidate in embedded PostgreSQL. Its expected JSON contains synthetic source-derived fingerprints, not copied live evidence. It reads one private JSON file and prints only differing component names. Matching is limited to the reviewed projection, whose custody scope omits global role capabilities/memberships and some native readiness fields. The separate read-only `docs/proposals/t19-inactive-custody-recovery-readback.sql` checks exact role flags/config/limit/expiry, the single grantor/ADMIN/INHERIT/SET membership edge, empty table counts, six valid/ready indexes and absent runtime owner. Neither comparison authorizes a restore or substitutes for native managed-bootstrap equivalence.

## Eligible isolated destination and bounded rehearsal

The owner's local Linux amd64 Docker host reports 16 CPUs and approximately 8 GB daemon memory, with the original 13 containers stopped and three pinned candidate images cached. This is capacity evidence only. No destination is yet qualified. Source and protected prior restore project are excluded.

Before any archive access in a candidate: verify registry-manifest/config provenance, exact PostgreSQL 17.11.0.003/Vault 0.3.1, Auth v2.197.0 and Storage v1.84.23, complete official bootstrap order/actors and migration checksums. Prove Auth index-worker invocation and all four valid/ready indexes; prove Storage ownership and eight explicit postgres grantable privileges with supabase_storage_admin grantor, along with full managed role/ACL/function/type/trigger/migration equivalence. No guessed index or GRANT patch to force hashes. The current managed-source hash is the checkpoint comparison target, not evidence that a local candidate matches it.

Prepare one separately reviewed synthetic-only bootstrap with a fresh isolated network/filesystem, no published ports, no live mounts/consumers/provider dispatch, bounded CPU/memory and verified cleanup. Preserve the original 13 containers and their volumes. Only after full compatibility/eligibility evidence and owner approval naming exact source, images, destination and one run may the authenticated checkpoint restore be proposed.

Restore the checkpoint into that approved candidate, independently reconcile archive rows/sequences/catalog/Auth/Storage scope, then apply the separately reviewed empty custody overlay and compare its complete expected/live structural definition. Record original versus overlay state distinctly; never rewrite historical receipts or call the old archive custody-complete. Verify actual permitted/denied access, audit behavior, failure/abort and final cleanup. Missing assets/platform configuration remain explicit exclusions. No full recovery PASS until all current-scope acceptance evidence exists.

## Local validation

Embedded PostgreSQL tests cover recovery intent/collision/runtime-owner refusal without partial tables, role flags/membership options, RLS and all four app identities denied across all three tables, staging-only check constraints, open-operation uniqueness, and unrelated public/Vault data and grants preserved. Embedded tests are not native managed-bootstrap or restore evidence. Current-head CI and automated review must pass before staging merge.

T19 remains in progress. Accounting activation and operational custody remain NO-GO pending recovery and subsequent approved stages. T20 payment-account/event implementation remains excluded.

## PostgreSQL major-version fixture correction

The first hosted offline comparison matched 16 of 17 components and stopped at constraints before the role readback. Investigation established that the embedded generator was PostgreSQL 18.6 (PGlite 0.5.10), while the source is PostgreSQL 17.11. PG18 records table NOT NULL constraints as pg_constraint entries; PG17 stores their nullability in pg_attribute, already covered by the unchanged columns component. The reported 13 PK/UNIQUE/FK/CHECK constraints match the corresponding source-derived definitions. No live DDL defect or missing NOT NULL was established by this mismatch.

Only the synthetic expected constraint fingerprint is corrected for the PG17 projection. The embedded PG18 test adapter excludes its extra contype=n table records during fixture reconstruction. The production offline comparator, historical restore projection, source SQL and captured evidence stay unchanged. NULL-ability and other constraint drift remain strict failures; tests cover both.

An explicit native PostgreSQL 17 CI regression runs the original unfiltered projection against this recovery definition, checks all 17 expected components and 13 constraints, rejects deliberate nullability/constraint drift and verifies transaction-wide removal of its synthetic roles and schema. It runs only inside the existing network-isolated CI policy container's fresh loopback cluster, before other suites. Candidate BEGIN/COMMIT is wrapped in a fixture transaction and always rolled back. A native CI PASS verifies this version-specific fixture; it does not qualify a managed Supabase bootstrap or authenticate/restore a protected archive.

Official catalog references: https://www.postgresql.org/docs/17/catalog-pg-constraint.html and https://www.postgresql.org/docs/18/catalog-pg-constraint.html . Owner-host evidence is retained unchanged; rerun the corrected offline comparator and separately collect role/empty-state readback before declaring definition reconciliation complete.
