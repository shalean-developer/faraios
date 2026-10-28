# T19 static image/source reconciliation — 28 October 2026

Decision: **PASS for the enumerated byte comparisons; NO-GO for managed-bootstrap or restore execution.** Owner-supplied image file indexes were compared with upstream bytes at immutable commits. This does not assert build-signature verification, complete binary/source equivalence, historical hosted migration execution, or a qualified restore destination.

## Verified source sets

| Component | Immutable upstream commit | Migration comparison |
|---|---|---|
| PostgreSQL | `802e6a10d46963f690ef0766a7d55c29150678c2` | 53 shared SQL files match exactly; two source SQL files are not packaged; the image-specific SQL file maps byte-for-byte to its upstream Ansible source |
| Auth | `4eee58f296d9698a1c2c0ae14d7a0b379c7622d3` (`v2.197.0`) | All 75 migration names and SHA-256 digests match |
| Storage | `d2836fe9e8157f4fc558af0071a7671d373ff3ef` (`v1.84.23`) | All 74 tenant migration names and SHA-256 digests match |

All 204 upstream migration blobs matched their pinned directory identities. Of these, 202 are present in the image indexes and byte-identical; the other two are the PostgreSQL omissions below. There are no differing bytes among the shared files. PostgreSQL's four numbered initialization SQL files, initialization README, migrate.sh and both extra Ansible-sourced SQL files also match their upstream SHA-256 values (eight files). Full path/blob/digest results are in [comparison.json](evidence/t19-image-source-20261028/comparison.json). The evidence contains public vendor-file fingerprints, not protected backup or business-data fingerprints.

Previously captured owner evidence binds the Linux/amd64 image manifests and configurations: PostgreSQL manifest d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda/config 4011bb9bf67341889fc52b7c12f91cf602a92c948559f4aa23144b2b06f69cca; Auth manifest 839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f/config 1181bff5ba4ce440013a63cef9f4cf13024c432d705c9b1fbc9e5b949e852f48; Storage manifest b8f956b64ea3aee1dfc2cd9f0c9ce8d74335405992a90281bb5a979d1d552c22/config 2a109dc3d00d98655c91f0b428f24289ef95ed17c69ae3ce56b1b713d033f4f9. Owner inspection reported configuration-digest matches, unchanged container inventory, and no entrypoint execution.

## PostgreSQL provisioning boundaries

The pinned source includes `20260923021047_update_pgrst_watch_triggers.sql` and `20261016000001_search_path_for_supa_functions.sql`; neither is in this cached image. Do not silently apply them or infer that staging has/has not received them. Verify the reviewed source/target provisioning boundary and the relevant extensions event-trigger definitions/configurations before deciding which immutable files belong in a candidate.

The image adds `docker-entrypoint-initdb.d/init-scripts/00-schema.sql` and `docker-entrypoint-initdb.d/migrations/00-extension.sql`. Both match the pinned source bytes at ansible/files/pgbouncer_config/pgbouncer_auth_schema.sql and ansible/files/stat_extension.sql respectively; Dockerfile-17 documents these COPY destinations. This establishes their source mapping, not hosted execution history.

The packaged entrypoint matches docker-library/postgres commit `6edb0a8c4def40c371514b34aef9037ec82d9110`, path 17/alpine3.23/docker-entrypoint.sh, exactly. Historical Supabase Dockerfile-17 at `a4f321df4dd226e75b7a253fc29e6d8bd18054dd` explicitly downloads that unmodified file and supplies gosu. The later `3d0f24bebea3728e95cea7fcf92aa504a70223df` change replaces it with a su-exec-adjusted copy; that adjusted script has a different hash. The inspected image is consistent with the earlier documented entrypoint route. This does not bind the full image build to that historical commit or establish complete build provenance. Do not modify the cached image to match the later recipe.

The byte-matched [migrate.sh](https://github.com/supabase/postgres/blob/802e6a10d46963f690ef0766a7d55c29150678c2/migrations/db/migrate.sh) defines initialization scripts as postgres and later migrations as supabase_admin, with distinct direct-psql and dbmate paths plus an optional post-migration file. It cannot be replaced by unordered SQL replay. Actual candidate configuration and observed principals must verify the chosen path. The image contains Vault 0.3.1 control-file metadata; installed/runtime extension compatibility is still unverified.

The previously used Auth/Storage portable structural scope is not a complete fingerprint of every provider-managed extensions function. The two omitted migrations affect extensions event-trigger functions; separate complete source/candidate verification remains necessary.

## Storage migration boundary and permissions

The image includes tenant migration `0074-unlock-object-versioning.sql`. Earlier recovery records named completion through 0073. Refresh authenticated source/checkpoint migration-boundary metadata before choosing a freeze; do not assume 0074 is eligible solely because it is packaged.

Pinned source [files.ts](https://github.com/supabase/storage/blob/d2836fe9e8157f4fc558af0071a7671d373ff3ef/src/internal/database/migrations/files.ts), [migrate.ts](https://github.com/supabase/storage/blob/d2836fe9e8157f4fc558af0071a7671d373ff3ef/src/internal/database/migrations/migrate.ts) and config.ts support `DB_MIGRATIONS_FREEZE_AT`, corresponding to the named migration, and an explicit upToMigration boundary. This is an available upstream mechanism, not a selected or executed configuration. DB_ALLOW_MIGRATION_REFRESH must not be used to rewrite evidence into agreement.

The matched 0046 migration grants table rights based on storage.super_user and app-role settings. The matched 0049 migration grants ALL on storage.buckets/objects to postgres WITH GRANT OPTION. These supply additional official provenance for the previously observed grant-option discrepancy. Recorded grantor depends on the actual migration actor; a source statement does not establish historical execution. Verify supabase_storage_admin ownership, actor credentials confined to the candidate, exact default and explicit ACLs, all eight grantable privileges and their grantors. No ad hoc corrective GRANT to force a catalog match.

Storage package.json's version field is 1.11.2. Its full SHA-256 `f0b79984c63ba7262791814651ebf9f395d2412290c6804b831909b461bd1dd0` matches the pinned v1.84.23 source file exactly; that field is not independently the service release identifier.

## Auth index-worker route

Pinned source establishes the route `cmd/serve_cmd.go` -> `apiworker.Work` -> indexWorker -> maybeCreateIndexes -> indexworker.CreateIndexes. `EnsureUserSearchIndexesExist` defaults false and MaxUsersThreshold defaults zero; the worker creates indexes only when the opt-in or positive threshold allows it. The four required indexes are not supplied merely by replaying the 75 SQL migrations.

This identifies an upstream invocation path, not a running candidate. Verify the packaged binary release/build identity, exact configuration encoding, DB principal, namespace, readiness/validity and definitions of all four indexes under the isolated execution plan. Do not manually CREATE INDEX to conceal a missing worker invocation.

## Next evidence and unchanged boundaries

Read-only source ledger/version and relevant extensions-function metadata; full image build/configuration identity and Auth binary build/version information; exact isolated network/filesystem/volume and resource plan; full managed migration/role/ACL/catalog parity; then a separately bounded approved restore and reconciliation. The 26 October authenticated checkpoint remains distinct from the later empty custody recovery definition. Current source/target permissions and both private evidence directories are preserved.

No container was started, database changed, archive decrypted/restored, protected restore project reused, credential provisioned, operational custody activated or T20 work performed for this source comparison. T19 remains in progress.
