# T19 read-only Storage 0074 and managed startup provenance audit — 2026-10-27

**Scope:** existing FaraiOS staging project `xdmfyrsauvqznkloroxg`, managed catalog SELECTs and pinned upstream source inspection only. **No migration, permission, container, secret, OAuth or financial mutation.**

## Directly observed: migration 0074
- Pinned upstream Storage `supabase/storage@v1.84.23`, commit `d2836fe9e8157f4fc558af0071a7671d373ff3ef`, `migrations/tenant/0074-unlock-object-versioning.sql`, Git blob `d0e28135e866601b78de24dee901c026fcb4a2eb`.
- The SQL drops `storage.buckets` constraint `buckets_versioning_dark_check`, creates/replaces `storage.enforce_versioning_status_transition()`, and creates trigger `enforce_versioning_status_transition`.
- Current staging `pg_constraint` still contains `buckets_versioning_dark_check` with definition `CHECK ((versioning_status = 'DISABLED'::text))`.
- Current staging `pg_trigger` has no non-internal trigger named `enforce_versioning_status_transition` on `storage.buckets`.
- Previous read-only migration-history comparison: 74 rows; 73 pinned file-name stems match; `unlock-object-versioning` absent and library `create-migrations-table` additional. Current catalog matches a pre-0074 state for these inspected objects.

**Disposition:** 0074 was **not applied in its expected form**, corroborated by history and catalog. Why is **unverified**. Do not run or force replay of the migration.

## Runner and identity evidence
- `supabase/storage@v1.84.23` `src/internal/database/migrations/files.ts` blob `9456d3af2324c6e01eff3dc69e3f5354710ba317` reads `dbMigrationFreezeAt`; `migrate.ts` blob `f3e387ef6704542dc37b06ea49f7620fd2a1d9ee` can select `upToMigration`, sets `storage.install_roles` and `storage.super_user` during migration sessions.
- Original deployed settings, process identity, and migration-execution chronology have not been recovered.
- Earlier read-only `pg_index` evidence confirms four Auth indexes valid and ready; this does **not** reveal the Auth worker's startup parameters, connection role or index-creation actor.
- Existing Storage owners/grantors identify present PostgreSQL catalog state, **not historical bootstrap execution identities**.

## Requirements for a qualified next verification
1. Obtain sanitized provider-managed Auth startup and Storage migration logs or configuration receipts for the exact deployed service revisions; do not reveal passwords, tokens or environment secrets.
2. Verify actual Storage `dbMigrationFreezeAt`, `upToMigration`, role settings, managed release revision, and any policy intentionally holding 0074.
3. Verify actual Auth `IndexWorker.EnsureUserSearchIndexesExist`, `MaxUsersThreshold`, connection principal, and index-worker invocation.
4. Reconcile the history table's own migration SHA-1 calculation against exact pinned Storage runner semantics, separately from the 149-file SHA-256 source inventory.
5. Review any managed-platform change separately; no `ALTER TABLE`, `DROP CONSTRAINT`, `CREATE TRIGGER`, SQL repair or rebaseline is authorised.

**Build Plan:** T19 In progress; A12 unresolved; managed bootstrap/restore NO-GO; Zoho accounting activation NO-GO; T20 Not started. This source/evidence PR is not independent security certification or production deployment approval.

## Read-only startup log availability check — 18 October 2026 UTC
Supabase unified logs were queried only through aggregate counts (no raw log messages, credentials or customer data extracted). Sources present: auth_logs, storage_logs, postgres_logs, pgbouncer_logs and others. Bounded keyword counts: auth_logs had 3 index-worker and 2 migration mentions; postgres_logs had 1 migration mention; storage_logs had no matching migration/index-worker/freeze references. Zero freeze mentions in those three sources. **These counts do not identify the database login role, startup flags, original Storage executor, or establish that logging is comprehensive.** Next step is scoped, sanitised provenance review of exact startup events under a separate evidence protocol; no credential-bearing raw log publication.

## Sanitized 18 October 2026 startup-event classification
Read-only aggregated query (no raw log entries exported): 43 Auth events, including 3 index-worker references and 2 migration references. These matched only broad index/migration classifications, not explicit `index_created`, `indexes_already_exist` or `index_creation` markers. The same 24-hour window contained 16 PostgreSQL events (1 migration reference) and 1 Storage event (0 migration references). Across these three log sources, no event-message mentions of `storage.install_roles`, `storage.super_user`, `dbMigrationFreezeAt` or `freeze` were found. These are log-text observations, not verified absence of deployed settings. Historical execution principals, Auth index-worker DB role/flags, Storage migration-freeze selection and original grantor chronology remain **NO-GO**. Further verification requires sanitized authoritative managed deployment receipts or provider support evidence. Do not access environment secret values or interpret missing log messages as configuration defaults.
