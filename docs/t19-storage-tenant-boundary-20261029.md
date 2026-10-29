# T19 Storage tenant migration/runtime separation

The hosted tenant and standalone service use different migration contexts. The source sets storage.multitenant from MULTI_TENANT before applying migrations. The earlier candidate started the API with MULTI_TENANT=false on an unmigrated tenant; that selected standalone Iceberg objects absent from staging. Disabling the Iceberg API feature alone does not select hosted tenant DDL.

The corrected Storage phase first runs the existing compiled runMigrationsOnTenant function in a short-lived nonroot migration container with MULTI_TENANT=true. It passes only the explicit candidate-local database URL, synthetic tenant ID, waitForLock=true and the 0073 freeze name. It never starts the multitenant API, runs control-database migrations or creates tenant-control rows. Any lazy multitenant pool URL is confined to the same candidate; no hosted endpoint or credential is supplied. Vector migrations, queue workers, installation of roles and migration-hash refresh remain disabled.

The migration process checks the exact target host/user/database/port and flags before importing the vendor module. Zero exit, no OOM, an explicit marker and exact existing Auth/Storage ledger boundaries are required. The process is then removed before the standalone API starts with MULTI_TENANT=false. The API must become healthy without changing ledger entries or creating storage.iceberg_namespaces/storage.iceberg_tables. Complete managed metadata equality is still the compatibility gate.

The new process uses the same pinned Storage image, audited vendor files, private environment handoff, read-only root, nonroot identity, CPU/memory/PID bounds, internal network and ownership-checked cleanup. The maximum live-container budget remains four. The node command is part of the signed source bundle. No user-supplied command, URL or migration boundary is accepted.

Local tests execute the Node process against a synthetic vendor-module adapter, verify exact options, and prove invalid target/configuration stops before the migrator is imported. Host-adapter tests verify removal before standalone startup and fail-closed behavior after migration failure. These tests do not claim a full native Storage migration rehearsal. The owner-built historical derivative must be bound into the image/file manifest and exercised by a fresh owner-signed full synthetic run.

No checkpoint or archive is read. No hosted schema/permissions, provider accounting or T20 change occurs. Full compatibility and recovery remain unverified until that run and the later separately bounded restore pass.

References at immutable supabase/storage commit d2836fe9e8157f4fc558af0071a7671d373ff3ef:

- src/internal/database/migrations/migrate.ts: runMigrationsOnTenant/connectAndMigrate and storage.multitenant setup.
- migrations/tenant/0047-iceberg-table-metadata.sql and 0048-iceberg-catalog-ids.sql: deployment-context branches.
- src/start/server.ts: standalone startup invokes the tenant migrator using the configured freeze boundary.
- build.js: compiled CommonJS relative module paths for the migration entrypoint.
