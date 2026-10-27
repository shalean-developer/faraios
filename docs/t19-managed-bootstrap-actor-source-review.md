# T19 managed Auth index-worker / Storage bootstrap actor — source review (2026-10-27)

**Disposition: SOURCE-ONLY PARTIAL PASS; EXECUTION NO-GO.** No SQL, container launch, grant provisioning, OAuth, financial write or managed restore authorized.

## Scope and reproducible source identities

- `supabase/auth` pinned tag `v2.197.0`, commit `4eee58f296d9698a1c2c0ae14d7a0b379c7622d3`, `internal/indexworker/indexworker.go` Git blob SHA-1 `1b12a9ecb85d4b17bc85faae05fa6857eba1f164`.
- `supabase/storage` tag `v1.84.23`, commit `d2836fe9e8157f4fc558af0071a7671d373ff3ef`, `migrations/tenant/0002-storage-schema.sql` blob `aaa5999b9f23fd8e9ecfc4f90c094ce748f12a7f`.
- Storage `migrations/tenant/0049-buckets-objects-grants-postgres.sql` Git blob SHA-1 `e81a70da621065ac0c819ca6fc74e43b285c11a9`.
- PostgreSQL pinned source commit `802e6a10d46963f690ef0766a7d55c29150678c2` grant-option migrations: `20250623125453_tmp_grant_storage_tables_to_postgres_with_grant_option.sql` blob `b499f9273691fd4256349b2be9c8a1dda664957e`; `20250709135250_grant_storage_schema_to_postgres_with_grant_option.sql` blob `7440924844c9db690401b5538b4daa872a1fb2f3`.

Git blob SHA-1 identifies committed upstream contents, not SHA-256. Owner-local Auth/Storage 149-file SHA-256 run reported PASS; independently reconciled CSV/evidence is not committed here.

## Confirmed source behavior

1. Auth `CreateIndexes` opens a dedicated DB connection using application name `auth_indexworker`, coordinates with PostgreSQL advisory lock `auth_index_worker`, checks index validity/readiness and uses concurrent index operations. Configuration `IndexWorker.EnsureUserSearchIndexesExist` changes user-count threshold behavior; `MaxUsersThreshold` can skip index creation. **Actual worker invocation, DB connection role, flags, advisory-lock behavior and resulting four index definitions remain unverified.**
2. Storage migration 0002 reads `storage.install_roles` and `storage.super_user` (default `supabase_storage_admin`). Role creation / grant paths and object ownership transfers depend on these settings and existing roles. A source default cannot establish historic host startup settings or effective grantor.
3. Storage migration 0049 includes `grant all on storage.buckets, storage.objects to postgres with grant option`. PostgreSQL's two later reviewed migrations also contain grant-option statements. **The existence of these statements in more than one source does not establish the actual migration sequence or the grantor recorded on the existing staging tables.**


## Additional pinned Storage runner inspection

- `supabase/storage@v1.84.23` `src/internal/database/migrations/files.ts` (Git blob `9456d3af2324c6e01eff3dc69e3f5354710ba317`) delegates discovery to `postgres-migrations.loadMigrationFiles`, caches the loaded migration list, and supports `dbMigrationFreezeAt`. Source directory listing order is **not** established as execution order; the exact pinned dependency implementation and freeze setting must be reviewed.
- `src/internal/database/migrations/migrate.ts` (Git blob `f3e387ef6704542dc37b06ea49f7620fd2a1d9ee`) imports `postgres-migrations` helpers, including `runMigration` and `validateMigrationHashes`, and reads `dbMigrationStrategy`, `dbInstallRoles`, `dbSuperUser` and the role settings. The deployed strategy/flags and original connection/session identity have **not** been captured.
- Migration 0002 declares `storage.migrations.hash` as 40-character SHA-1 of filename/content, distinct from the owner's SHA-256 evidence CSV. Comparing CSV SHA-256 values directly to this 40-character on-database column would be invalid.

## Fail-closed acceptance checklist

- [ ] Recover exact authorized Auth index worker command/config, connection identity and effective privileges from trusted startup provenance; prove all four index definitions, `indisvalid` and `indisready`.
- [ ] Recover exact Storage runner migration-order logic and deployed migration history (including 0049); validate `storage.install_roles`, `storage.super_user`, executor and resulting object owner.
- [ ] Establish original owner/grantor/grantee/privilege/`is_grantable` entries from independent managed evidence, including interactions between Storage 0049 and the two PostgreSQL grant-option migrations; never spoof grantor with handwritten GRANT.
- [ ] Match pinned Auth, Storage, PostgreSQL and Vault container/image manifests to approved vendor commits and hosted catalog; distinguish registry manifest digest from local image config ID.
- [ ] Verify the 149 SHA-256 CSV artifact against the pinned source manifest, with exact row count, unique paths, full-length hashes and no failures; keep historical and protected evidence unchanged.
- [ ] Design and review disposable-only least-privilege actor, resource/egress/cleanup controls and full managed-catalog comparison. Separate operator approval required before actual execution.

**Governance:** PR #193 and PR #195 remain separate review tracks; no inherited exception. T19 In progress; A12 unresolved; managed execution, checkpoint recovery and Zoho activation NO-GO; T20 Not started.
