# Self-managed database backups

**Current verified status and incident procedure: [F06 closeout](f06-closeout.md).**
Historical setup/open-status statements below are superseded by that record.
Daily encrypted export and weekly full Auth/API recovery are active once the
operations closeout merges; no paid Supabase upgrade is required.

Supabase remains on Free. No upgrade or production application deployment is included.

The proposed GitHub Actions workflow exports the FaraiOS database using a read-only
transaction, encrypts the export with GPG AES256 and verifies decryption before
uploading ciphertext and its SHA256 checksum. It runs daily at 01:00 UTC once merged
into the default branch. The artifact expires after 30 days. GitHub Actions/storage
quotas apply; this is not a guarantee of unlimited free storage.

## Private setup

In repository Settings → Secrets and variables → Actions, the owner supplies:

- Secret `FARAIOS_BACKUP_DB_PASSWORD`: existing Supabase database password.
- Secret `FARAIOS_BACKUP_PASSPHRASE`: a password-manager-generated value of at least
  32 characters. Keep a separate offline copy; losing it makes backups unusable.
- Variable `FARAIOS_BACKUP_HOST`: session pooler host from the project's Connect
  dialog, or `db.rxelmugnucfajrqmphhe.supabase.co` where IPv6 is supported.
- Variable `FARAIOS_BACKUP_USER`: `postgres.rxelmugnucfajrqmphhe` for the session
  pooler, or `postgres` for direct connection. Port is 5432, database `postgres`.

Do not send passwords in chat, commit them, reset the database password, or use the
transaction pooler. Merge/setup and manually run the workflow, then confirm success
and download the encrypted artifact to independent secure storage. Keep weekly and
monthly copies there beyond the artifact expiry. Monitor failed/missed Actions runs.
No live backup exists merely because these files are present.

## Recovery evidence and limits

`PG_BIN=/path/to/postgres/bin PHP_BIN=/path/to/php python3 tests/database-backup.py`
runs an actual encrypted export, decrypts it, restores to a new disposable database,
and compares all table fingerprints. Synthetic Auth-shaped records, issued invoices,
payments/reversals and business isolation are checked. Wrong keys and tampering fail.

Before calling hosted recovery ready, take the first real export and restore it to
an isolated compatible Supabase environment with production credentials/emails and
public intake disabled. Compare records and effective permissions. Never restore
directly over production. The local test does not establish hosted restore readiness.

The bundle contains application/Auth schemas and data, roles without password hashes,
and migration history/Storage metadata when present. It excludes Storage object bytes,
Vault/provider internals and external runtime secrets. Recover those separately. Auth
and provider-owned roles require the provider-supported recovery procedure; do not
blindly execute the roles file against Supabase. A fresh standalone restore target
must have the required roles/extensions and no conflicting application schemas
(including the default empty public schema). This script never performs a restore.

Plesk hosting snapshots remain a separate layer: they cover hosting files, not the
external Supabase database. F06 remains open until the first hosted export, independent
copy, isolated restore and operational failure monitoring are evidenced.

Local evidence (14 November 2026): PostgreSQL 17 native export/encryption/fresh
restore PASS. The disposable target recreates PostgreSQL's default public-schema
USAGE grant after restoring that schema; hosted schema ownership/default grants
must be verified independently. Production connection/container execution is pending.

## Snapshot and isolated restore verification (F06)

Version 2 backups retain a single read-only exported MVCC snapshot while collecting
all selected-table counts/fingerprints and running pg_dump. The encrypted manifest
also records effective schema grants. No customer values or per-table hashes are
published in logs or evidence. Prior version 1 backups remain supported, but cannot
prove snapshot fingerprint equality because they did not record those fingerprints.

The manual `Isolated database restore check` workflow downloads a retained encrypted
artifact using an Actions read token, checks ciphertext and decrypted-member hashes,
and restores it into a fresh PostgreSQL 17.11 container with `--network=none`, no
published ports, no production credentials and a read-only host mount. All roles and
object ownership are restored except the disposable bootstrap postgres role remains
superuser to perform the restore. Membership grantors are normalized to the local
bootstrap postgres role; effective membership flags are retained, but provider
grantor audit identity/revocation behavior is not rehearsed. Recorded source schema grants are reapplied because
pg_dump omits some initial privileges. It checks snapshot table fingerprints where
present, business constraints, owner/outsider row visibility and ledger write denial.
The container and private plaintext are removed even on failure. Only an aggregate
report is uploaded. No PHP, Auth, mail worker, or booking process is started.

The same rehearsal is scheduled weekly on Sunday at 03:00 UTC using the latest
successful main-branch backup. This proves standalone PostgreSQL data recovery,
not a complete hosted Supabase service recovery or an Auth login/session roundtrip.
Do not treat the measured small-database rehearsal as a service recovery guarantee.

The `Database backup heartbeat` workflow runs after backup/restore completion and
daily at 05:00 UTC. A failed latest completed run, missing/expired backup artifact,
backup older than 30 hours, or restore older than eight days causes a failing check.
API errors fail as unknown. This exposes failure in GitHub Actions; it does not
send custom emails, page a responder, or establish receipt of an alert. The owner
must monitor Actions notifications and provide an authorized destination before any
external notification integration is added. Private application logging and Storage
object/runtime-secret recovery remain separate open gates.
