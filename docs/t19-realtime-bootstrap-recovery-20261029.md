# T19 Realtime bootstrap correction — 29 October 2026

The synthetic candidate compared Realtime metadata without initializing its tenant schema. This left its role, memberships, parameter grant, types, functions, tables and six indexes absent. The corrected runner loads the vendor-supported PostgreSQL 17 tenant bootstrap after PostgreSQL initialization and before Auth/Storage. It does not start a Realtime daemon or create a Realtime control database.

Read-only staging inspection found 91 tenant migration versions ending at `20261009120000`. The immutable public snapshot at `supabase/realtime@cdb70addbe82e5f0347c544c112ec36c9855d965` has that boundary; its successor introduces `20261027120000`, which staging has not applied. Use the preceding snapshot, never current `main` or the later migration. The unmodified dump and Apache 2.0 license are vendored with attribution and exact-byte tests. The dump's Git blob is `485164c1c574824ef0a01b81f66d1c082273af59`, SHA256 `f98beb234131e3295d2d7651607db5b79a754b7c745b1a853ba0e1b76f757c47`.

The upstream migrator explicitly supports loading `priv/repo/tenant_db_dump_17.sql` into an empty tenant database. This snapshot includes role setup and migrations history; these INSERTs are the vendor's fresh initialization, not edits to an existing ledger. The runner requires an empty Realtime object set and absent Realtime role, binds the dump into its signed source digest, verifies its bytes again before execution, and executes it as the fresh candidate's bootstrap owner in a transaction. Native PG17 CI checks all 91 versions' boundary, the exact restricted role configuration, three grantor/ADMIN/INHERIT/SET membership tuples, six valid/ready indexes, empty operational tables and the parameter privilege. All fixture objects and roles roll back.

Staging's three memberships are **anon, authenticated and service_role granted to supabase_realtime_admin**, with grantor supabase_admin, ADMIN false, INHERIT false, SET true. They are not grants of supabase_realtime_admin to those browser roles. This direction is material to least privilege and matches the vendor dump.

Full managed catalogue comparison, custody, authenticated boundary checks, stability and cleanup remain mandatory. No comparison is removed and no hosted permission is changed. Existing signed receipts remain historical and cannot authorize this changed bundle. No rerun is proposed until the remaining extension/helper and Storage-context differences are resolved. Native CI proves this component, not the complete Supabase destination or protected-checkpoint recovery.

T19 remains In progress; checkpoint use and accounting activation remain NO-GO. T20 and the protected restore project remain untouched.

References:

- https://github.com/supabase/realtime/blob/cdb70addbe82e5f0347c544c112ec36c9855d965/priv/repo/tenant_db_dump_17.sql
- https://github.com/supabase/realtime/blob/cdb70addbe82e5f0347c544c112ec36c9855d965/lib/realtime/tenants/migrations.ex
- https://github.com/supabase/realtime/commit/b84d8556e1d644d046cb20d236aa83f3dd398994
