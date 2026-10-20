# T11 — Audit history and recovery

Updated 20 October 2026. Scope: FaraiOS staging only (`xdmfyrsauvqznkloroxg`). Existing Shalean/Bokkie systems are unchanged.

## Isolated recovery setup — 20 October 2026

The owner accepted the recommended encrypted private Google Drive backup and separate temporary Supabase restore project in `shalean-developer`. The encryption key is to be kept separately with an offline copy; key creation and custody verification have not happened yet. This authorizes the one-off recovery exercise, not a recurring backup schedule or retention/deletion policy.

Supabase's organization-specific project quote returned **$0 monthly** before creation. The connector permits creation at a zero quote without a cost-confirmation form. This is the returned additional-project quote, not a guarantee about future usage, plan changes or storage charges.

| Resource | Verified identity / state |
|---|---|
| Source | `faraios-staging` — `xdmfyrsauvqznkloroxg`, ACTIVE_HEALTHY |
| Restore destination | `faraios-restore-test` — `zrlojsvkqipuwkkyfrkn`, ACTIVE_HEALTHY |
| Organization | `shalean-developer` — `lypbvtudsbxxdcnzbqwc` |
| Region / database | Both `eu-west-1`, PostgreSQL 17.11.0.003 |
| Backup folder | [FaraiOS Recovery Backups](https://drive.google.com/drive/folders/1Jd6uqTW3uHAnEX1-2ouc4paga7ebyXuu); metadata reports `shared:false` and one owner permission |

The new destination is separate from the working source. Read-only checks found zero public tables, Auth users, Storage buckets and Storage objects there. No data has been imported and no application has been pointed at it. No staging database password was reset.

Refreshed source inventory: 15 public tables and two audit tables, all 17 with RLS enabled; 3 Auth users; 21 migration records; 186 `audit.events` rows; 0 Storage buckets/objects; 0 Vault secrets; 0 deployed Edge Functions. Installed extensions are `btree_gist`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault` and `uuid-ossp`; neither `pg_cron` nor `pg_net` is installed. This is a point-in-time inventory, not the eventual backup's consistency manifest.

**T11 remains In progress.** The folder is empty; it is not a protected backup. Full schema/roles/data/Auth export, configuration capture, encryption/checksum, off-site retrieval/decryption, import and restored sign-in/access/audit verification have not run. The connected Supabase tools cannot produce the supported full logical export. The agent has inspected the pinned CLI but has no source database credential, Docker daemon or PostgreSQL clients for a real export; execution belongs in the owner's local terminal. Do not substitute visible Auth/credential queries for a private backup or reset the source password just to obtain access.

### Private Windows capture helper — prepared 20 October

`npm run backup:staging` runs `scripts/backup-staging.mjs`. This prepares an encrypted **logical database capture**, not a complete Supabase recovery. It has no restore, password-reset, project-link, network-ban clearing or application-repointing command.

The source is fixed to `xdmfyrsauvqznkloroxg`; Supabase CLI is pinned to `2.121.0` and its official built-in `supabase` profile. The owner has Node, Docker Desktop with a Linux server and the pinned CLI available and completed private CLI sign-in. The previously suggested arbitrary `--profile faraios-recovery` was invalid: custom profiles are configuration files, not login labels. No second login is needed.

In the source checkout, after pulling the merged helper:

```powershell
git switch main
git pull --ff-only
npm run backup:staging
```

Stop the local FaraiOS staging app first. Type `QUIET` only when schema, account and business writes are paused until capture finishes. Enter the **existing staging database password** at the hidden prompt. This is distinct from the CLI login. If it is unknown, press Ctrl+C and report `PASSWORD_UNKNOWN`; do not reset it. Never paste passwords, keys, SQL, Auth records, connection strings or terminal captures into chat.

The helper removes inherited project/PostgreSQL/Docker overrides, verifies a local Unix socket or Windows named pipe and Linux Docker server, then pins that endpoint for every export. The database password is passed in the child environment, not shell arguments; the npm invocation is shell-free. Telemetry opt-outs are forced. Linked query resolution uses the supplied password, avoiding the CLI's passwordless temporary-role fallback. No `--dry-run` is used because that path can print expanded credentials.

**Capture contents and validation:**

- Roles without role passwords; application schema; default data including Auth; separate `supabase_migrations` schema/data; and an Auth/Storage schema reference. The reference is for restoration review, never blanket replay over managed schemas.
- A private manifest records PostgreSQL major, extension versions, exact business IDs, table counts/digests, RLS and a catalog digest covering constraints, grants/owners, role memberships, functions, triggers, policies, views, indexes, types and sequences. The final read-only manifest query was executed successfully against staging: 53 table fingerprints, 15 public and two audit tables, three Auth users and 21 migration rows. No table records or credentials were read into this evidence report.
- Before/after row and catalog digests must agree. Each dump uses its own transaction: this is **not one global snapshot**. Operator write quiescence is essential; comparison cannot exclude a change that is later reversed.
- Exactly one complete PostgreSQL dump banner pair is required per member; complete COPY blocks and exact exported row counts are checked, including Auth and migration history. Duplicate/partial retry output fails closed.
- Unexpected business/schema scope, extension changes, lost application RLS, nonzero Storage buckets/objects, large objects or Vault secrets stop capture. The two excluded vector metadata tables must be empty. This first helper deliberately fails when the verified empty external-data assumptions change.

Raw dump stdout stays in Node memory until compression and AES-256-GCM encryption. The helper writes no plaintext SQL dump files to its output directories. It writes only static config/query files in its temporary work directory, then removes that directory after archive verification. Canonical paths, Git ancestry, symlinks and directory replacement are checked at boundaries; POSIX owner/modes or Windows owner-only protected directory ACLs are enforced. Newly created Windows directories and files may start with the elevated Administrators owner; only those new objects are assigned to the current user. Existing directories with another owner are refused. Windows ACL operations use the bundled Windows PowerShell .NET Framework APIs without depending on loaded security cmdlets; inherited PowerShell7 module paths are removed from these children. Retrieval performs read-only owner/DACL checks on both the Windows key directory and key file; it never repairs an unsafe key ACL. These checks do not defeat a host owner/administrator moving paths between checks.

The local Docker daemon and owner workstation remain trusted. The upstream CLI uses `docker run --rm` with default daemon logging. **No claim is made that plaintext can never reach daemon logs, swap, crash dumps or host-managed storage.** Process deadlines/cancellation stop the owned process tree, stop further preflight/export steps and discard captured diagnostics, but do not prove daemon-side container cleanup. After an interrupted run, stop and have the exact leftover container reviewed privately; do not run broad Docker cleanup, alter global logging settings or upload incomplete output.

A successful report includes `encryptedLocalVerification: PASSED`, `privateWorkdirCleanup: PASSED`, and `helperPlaintextSQLFiles: NEVER_WRITTEN`. The latter applies to helper-managed SQL output files only. It leaves:

| Local location | Purpose |
|---|---|
| `%USERPROFILE%\\.faraios-backups\\<run-id>\\*.fbackup` | Authenticated encrypted archive with per-member SHA-256 |
| Same archive path plus `.sha256` | Ciphertext SHA-256 |
| `%USERPROFILE%\\.faraios-recovery-keys\\<run-id>.key` | Separate 32-byte decryption key; never upload beside the archive |

Copy the key separately to protected offline storage and verify custody. Upload only the verified `.fbackup` and `.sha256` to the approved private Drive folder. A success report still says `offsiteBackup: PENDING`, `offlineKeyCopy: PENDING` and `restore: NOT_RUN`; it cannot attest to subsequent manual copies.

Retrieve the encrypted file from Drive into a private folder and verify locally with the matching key still in its separate private directory:

```powershell
node scripts/backup-staging.mjs --verify-file 'C:\\private-retrieval\\faraios-staging-<run-id>.fbackup'
```

This decrypts and checks the archive in memory without executing SQL. Compare its reported SHA-256 to the original report/checksum. Off-site retrieval, offline key custody and an actual isolated restore require their own evidence. A safe failure returns only a fixed diagnostic label; share that label alone. Local incomplete work/key/archive files may remain after failure and are not approved uploads.

### Metadata failure diagnostics — 20 October

The first owner-operated Windows attempt reached `Checking source metadata`, then stopped with the original generic `CHILD_FAILED`. No dump step, encryption key or ready archive was reached. The source project was independently rechecked as ACTIVE_HEALTHY; this does not establish CLI access or network reachability from the owner workstation. The actual failure cause remains unconfirmed.

Metadata children now inspect failure stderr **in memory** and emit only fixed observation labels. They never attach or print raw error text, SQL, provider responses, paths or credentials. Ordinary child errors retain their existing behavior; cancellation, timeout and output-limit labels take precedence. Both initial and final manifest reads use these diagnostics. No retries or alternate connection/permission paths are enabled.

| Observation | Next investigation |
|---|---|
| `METADATA_LOGIN_REQUIRED` | Stored CLI login availability |
| `METADATA_API_ACCESS_DENIED` / `METADATA_PROJECT_NOT_FOUND` | CLI account/project access; project identity |
| `METADATA_IPV6_UNAVAILABLE` / `METADATA_NETWORK_FAILED` / `METADATA_TLS_FAILED` | Direct/pooler resolution, workstation connectivity or certificate trust |
| `METADATA_SQL_FILE_UNREADABLE` / `METADATA_CONFIG_INVALID` / `METADATA_CLI_COMMAND_INVALID` / `METADATA_CLI_LAUNCH_FAILED` | Local helper/CLI invocation and files |
| `METADATA_DATABASE_AUTH_FAILED` / `METADATA_QUERY_FAILED` | Pinned query/preflight failure; do not infer the password was wrong from a generic failure |
| `METADATA_PROCESS_FAILED` / `METADATA_UNCLASSIFIED` | Further safe local diagnostics needed; raw output remains private |

These labels classify observed error text, not a proved root cause. Keep the incomplete run directory private and do not upload it. After pulling this diagnostic update, run the same private helper once and return only the new fixed label, or `encryptedLocalVerification: PASSED`. Do not use `--debug`, reset the source password, weaken permissions, repoint the app or enable a restore to diagnose this failure. T11 remains In progress.

Configuration/provider secrets, Edge Functions, Storage bytes and custom managed-schema recovery remain separate work. No recurring schedule, retention deletion, restore import or complete T11 acceptance is enabled by this helper.

Primary implementation references: [CLI v2.121.0 dump](https://github.com/supabase/cli/tree/v2.121.0/apps/cli/src/commands/db/dump), [CLI export implementation](https://github.com/supabase/cli/blob/v2.121.0/apps/cli/src/command-internal/pg-dump.scripts.ts), [PostgreSQL 17 dump-all output](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/bin/pg_dump/pg_dumpall.c), [Docker context inspection](https://docs.docker.com/reference/cli/docker/context/inspect/), [Windows ACL retrieval](https://learn.microsoft.com/en-us/dotnet/api/system.io.directory.getaccesscontrol?view=netframework-4.8.1), [PowerShell module-path inheritance](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_psmodulepath).

## Earlier assessment — 20 October 2026

T11 remains In progress. The existing restore covers a historical identity/audit subset, while the read-only current inventory includes 15 public tables (each RLS enabled), 3 Auth users and no Storage buckets/objects. Current modules include catalogue, customers/addresses, bookings, teams, recurring schedules, quotes, handoffs, invoices and accounting connection metadata. A passing subset rehearsal does not establish recovery for these modules or actual Auth sign-in. No full export, cloud upload, new project or restore was performed by this assessment.

T08–T10 staging access now has independent PASS; see [the closeout](staging-role-acceptance.md). Repeat that baseline on an eventual isolated restore; it is not proof that recovery has passed.

### Prepared full-recovery work package

1. Confirm the owner's protected backup destination/key custody, retention/schedule, restore organization and quoted resource cost before resource creation or full-backup transmission. An encrypted archive in an owner-controlled private folder is proposed, not an approved/completed upload. Keep its key separate; no Auth dumps or secrets enter Git/chat.
2. Inventory current schemas/data, migrations, grants/RLS, functions/triggers, extensions, Auth dependencies, Storage and external configuration. Record the capture consistency strategy and any required write-quiescence window. A redacted manifest records counts/digests, not user records or credentials.
3. Prepare a supported roles/schema/data logical backup. Verify Auth data, custom auth/storage objects and migration history are explicitly accounted for. Storage file bytes and required environment/provider configuration need separate recovery treatment. Keep operational integrations disabled and private.
4. Encrypt/checksum the artifact, deliver only to the approved location and prove retrieval/decryption. Approve retention and cleanup before enabling a recurring job. No schedule or retention duration is selected here.
5. Restore into a separate disposable Supabase project after cost approval. Verify its reference differs from staging and all live projects; disable outbound messages, provider/payment workers and automatic operational jobs before import. Review managed-schema/encryption-key requirements for that exact project. Never restore over active staging for this test.
6. Compare schema/row counts, immutable agreement digests, audit continuity and RLS/grants. Privately verify restored owner/manager/shared-staff sign-in/denials, module reads and application health. The current launcher pins the source project: prepare/review an explicit isolated harness rather than silently repointing it.
7. Record measured recovery-point and restoration time, gaps, independent QA and owner acceptance. T11 closes only after protected backup, isolated restore, sign-in/access and audit evidence pass. No promised RPO/RTO or ongoing backup operation exists yet.

Primary sources rechecked 20 October: [database backups](https://supabase.com/docs/guides/platform/backups) and [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Supabase recommends off-site CLI exports for free projects; database backups exclude Storage file bytes. Managed-schema customizations and environment-specific configuration need attention during manual restoration. The helper above pins CLI/encryption procedures; an actual owner-terminal export, off-site retrieval and restore remain unverified.

## Implemented audit coverage

Migration `foundation_audit_history` installs `audit.events` and invoker-rights triggers for `public.businesses` and `public.business_memberships`. An administrative INSERT/UPDATE/DELETE records business, timestamp, verified request subject when available, database role, transaction ID and before/after records. Identical updates produce no event. Identity keys cannot be changed. Audit insertion and the source mutation succeed or roll back together.

Application roles cannot insert/update/delete/truncate audit history. Only an active owner can SELECT their business's events under RLS. Audit history survives source record deletion. The schema is not added to exposed Data API schemas and no audit UI exists yet. Direct database administrators retain authority over the database; this is not an externally tamper-proof log.

Current identity tables deny application writes. The invoker audit function deliberately does not grant extra write privileges. Future client-facing mutations must add a reviewed audited write path; do not grant users arbitrary audit INSERT to bypass a permission failure. Service-role mutation workflows must verify explicit audit privileges before adoption.

Direct SQL operations may have no authenticated human subject: the database role remains recorded. Do not label an absent subject as a verified human. Nothing backfills changes that happened before this migration.

## Validation

- 43 local tests pass; syntax checks pass.
- Live staging transaction changed a business name, checked before/after and actor capture, verified owner reads, denied audit deletion, downgraded membership and verified manager denial. The whole transaction rolled back. No test changes or audit rows persisted.
- Security advisor: no finding for the new audit schema. Existing findings remain: admin-only `public.identity_audit` has RLS and no policies (intentional default denial); leaked-password protection is disabled. Do not treat the latter as resolved.

## Recovery rehearsal

`scripts/rehearse-foundation-restore.mjs` accepts a v1 JSON snapshot with `project_ref`, `businesses`, `memberships` and `events`. It opens only an in-memory PGlite database, creates tracked schemas, imports the captured rows with parameterized SQL, compares SHA-256 digests, verifies each user's RLS scope and verifies that a new change still produces an audit event after restore. It has no remote database restore operation.

An actual staging snapshot was restored offline: 2 businesses, 2 memberships, 0 new audit events. Digest `3d434b405cba547fdc90fb715f183b75f592b205d615185518a8771cc60a0144`. Data comparison, RLS and post-restore audit passed. Separate synthetic tests restore non-empty history. Microsecond timestamps are preserved as canonical UTC text.

**This is a scoped application-data recovery rehearsal, not a complete Supabase disaster restore.** Auth users are ID placeholders only; credentials, sessions, Auth configuration, existing bootstrap `public.identity_audit`, Storage objects, secrets and provider settings are outside this snapshot. No snapshot is committed to Git. The temporary copy is not a durable off-site backup.

## Full recovery gate still open

Before deployment, establish an approved protected off-site backup destination, retention and schedule; export the full database schema/data and required roles through the supported Supabase CLI/pg_dump workflow; separately account for Storage files and environment/provider settings. Rehearse restoring into an isolated Supabase project and verify real sign-in, business access and application health before any production recovery claim. Record actual RPO/RTO after that exercise; neither is currently promised. Never restore over the live staging project merely to demonstrate recovery.

Source: https://supabase.com/docs/guides/platform/backups (reviewed 19 October 2026). Free projects should export and maintain off-site backups; database backups alone do not restore Storage objects.

## Rollback

If staging identity changes start failing because of audit integration, investigate the write role and privileges first. A reviewed rollback can drop only `audit_business_change` and `audit_membership_change` triggers, preserving `audit.events`; record the resulting gap explicitly. Do not delete history or weaken RLS to make a write succeed.

## Historical remaining foundation acceptance — 19 October

PR #12 records live role resolution, suspension, logout and mobile-menu acceptance. Separate manager/staff test identities and fresh sign-in still need completing. Browser creation of credentials requires the user's private password entry. No Auth admin-create connector is exposed, so no accounts were fabricated through auth-table SQL.

Decision: CONDITIONAL PASS for continued isolated development. T11 remains In progress until full backup/recovery acceptance. T12 settings implementation follows as a separate bounded package.

