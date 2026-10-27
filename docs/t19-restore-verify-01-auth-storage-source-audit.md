# T19-RESTORE-VERIFY-01 — pinned Auth/Storage bootstrap source audit

2026-10-27. SOURCE-ONLY / NO MIGRATION OR RESTORE AUTHORIZATION. Parent: Issue #183 and merged PRs #188/#189. No managed DB, local Docker, Zoho or production writes.

## Auth v2.197.0: confirmed implementation path

Official tagged source: https://github.com/supabase/auth/blob/v2.197.0/internal/indexworker/indexworker.go

- `CreateIndexes` uses the configured DB URL/namespace, application name `auth_indexworker` and advisory lock `auth_index_worker`.
- Returns without building indexes if the users table uses OrioleDB (unsupported for `CREATE INDEX CONCURRENTLY`), another process holds the lock, or (unless `EnsureUserSearchIndexesExist` is enabled) the approximate user-count threshold is exceeded.
- Examines `pg_index.indisvalid` and `indisready`; a valid/ready existing set may be skipped, whereas invalid indexes may be dropped concurrently before rebuilding. Index work runs **outside** a surrounding transaction.
- Four explicit indexes are named `idx_users_email`, `idx_users_created_at_desc`, `idx_users_last_sign_in_at_desc`, `idx_users_name` (last is conditional on non-NULL JSON name).
- Need still establish actual `CreateIndexes` invocation / index-worker startup configuration, runtime DB principal, namespace, flag `EnsureUserSearchIndexesExist`, threshold, access method and grant scope for the exact v2.197.0 candidate. Source definitions alone do not demonstrate runtime invocation or catalog equality.

## Storage v1.84.23: confirmed migration behavior

Official tagged source: https://github.com/supabase/storage/blob/v1.84.23/migrations/tenant/0002-storage-schema.sql

- `storage.install_roles` defaults to `true`. When disabled, role/grant/owner setup is bypassed; schema and table migration sections still run.
- In role-install path, configurable `storage.anon_role`, `storage.authenticated_role`, `storage.service_role` default to anon/authenticated/service_role, with authenticator memberships, schema USAGE and default privileges; `service_role` is created with BYPASSRLS.
- Later section derives `storage.super_user` (default `supabase_storage_admin`), creates role if necessary, grants schema/table/sequence rights and transfers ownership of `storage.buckets`, `storage.objects`, `storage.migrations` and certain functions.
- Current-object grants and future-object default privileges are distinct. `0002` does **not by itself** prove the eight live `postgres` grantable table privileges, their recorded grantor, or the final effect of migration 0073 and PG managed grant-option migrations.
- Track v1.84.23 complete tenant migration order/hashes (including 0073), PostgreSQL official grant-option migration order and the effective DDL actor. Do not synthesize `GRANT ALL` to force parity.

## Required fail-closed candidate evidence (NOT YET SATISFIED)

1. Privately pinned image manifest/config ID, source commits and migration hashes for all managed components; PostgreSQL 17.11.0.003, Auth v2.197.0, Storage v1.84.23, Vault 0.3.1.
2. Authorized isolated bootstrap operator; exact invocation and configuration, role/ownership/grantor provenance and per-step migrations (including PostgreSQL provider migrations).
3. Catalog equality: membership/options, schemas/relations/functions/sequences, indexes and their validity/readiness/definitions, RLS/policies, owners, explicit ACLs with grantor/grantee/grantability, per-owner default ACLs, extensions and migration ledger against protected baseline.
4. Resource and isolation proof, synthetic-only new empty candidate, no live consumers, no ports, no credentials or archive access; independently verified cleanup.
5. Separate owner review/approval of immutable candidate, bounded executable, environment and one rehearsal; stop on any unknown or discrepancy.

**Decision:** Upstream Auth index logic and Storage 0002 behaviors reviewed. Exact initialization actor, full migration history and local managed catalog still OPEN. No managed bootstrap execution or checkpoint restore authorized. T19 In progress, A12 unresolved, Gate B-02 and accounting NO-GO, T20 Not started.
