# Self-managed database backups

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
