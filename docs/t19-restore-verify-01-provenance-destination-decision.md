# T19-RESTORE-VERIFY-01 — migration provenance and destination readiness

Date: 2026-10-27. **SOURCE ONLY / NO RESTORE AUTHORIZATION**. See Issue #183 and merged PR #184. SSL enforcement remains OFF; Gate B-02 and accounting activation NO-GO.

## Official pinned source evidence

- Supabase Auth `v2.197.0` `internal/indexworker/indexworker.go` defines four `auth.users` indexes absent from the former candidate. These are created by a separate index worker (concurrent index creation), not necessarily by Auth migrations. Its startup/configuration execution in the prior candidate has not been proven.
- Supabase Storage `v1.84.23` `migrations/tenant/0002-storage-schema.sql` provisions Storage tables, default ACLs, owner role `supabase_storage_admin`, and ownership transfers, conditional on `storage.install_roles`. Migration `0073` revokes selected unnecessary permissions from ordinary roles.
- Supabase PostgreSQL official source commit `802e6a10d46963f690ef0766a7d55c29150678c2`: `migrations/db/migrations/20250623125453_tmp_grant_storage_tables_to_postgres_with_grant_option.sql` Git blob `b499f9273691fd4256349b2be9c8a1dda664957e` conditionally GRANT ALL ON `storage.buckets` and `storage.objects` TO `postgres` WITH GRANT OPTION. Companion `20250709135250_grant_storage_schema_to_postgres_with_grant_option.sql` blob `7440924844c9db690401b5538b4daa872a1fb2f3` grants schema USAGE with grant option.
- Live staging source catalog previously verified eight explicit table privileges (DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE), `is_grantable=true`, from grantor `supabase_storage_admin` to `postgres` on each relation. The newer official PostgreSQL migration explains targeted privilege intent; *source existence does not establish this exact project's applied migration history, original execution context, effective grantor, or full managed catalog identity*.
- Live Storage default ACL for `postgres` is not grantable, demonstrating that defaults-only replay is insufficient.

## Reconciliation still required before runnable candidate

1. Match the official PostgreSQL image/commit and the two migration files against the protected prior candidate's pinned image, migration history and source-manifest hashes.
2. Determine historical execution role and `storage.install_roles`/`storage.super_user` context; establish grantor `supabase_storage_admin` and exact per-table ACL semantics. Do not assume merely running a grant as `postgres` will reproduce the source's grantor.
3. Confirm Auth v2.197.0 index-worker startup flag, privileged role and all four resulting valid/ready definitions in a **new isolated** candidate, alongside complete managed catalog and role/ACL fingerprint equality.
4. Recover source-controlled and managed initial provisioning evidence; no invented SQL GRANT/CREATE INDEX correction to force catalog hashes.
5. Privately reauthenticate sealed 2026-10-26 checkpoint and exact reviewed baseline. Do not publish archive digests, private paths or keys.

## Destination readiness — read-only decision

Current linked FaraiOS Supabase organization has two `ACTIVE_HEALTHY` projects: staging `xdmfyrsauvqznkloroxg` (protected source) and restore-test `zrlojsvkqipuwkkyfrkn` (prior T11 exercise/production-held). Neither is eligible for destructive reuse. Historical project-creation attempts were blocked by Free-plan two-project capacity; this review made no cost/availability quotation and does not authorize a third project.

**Disposition: NO ELIGIBLE HOSTED DESTINATION VERIFIED.** Preferred future choices for separate owner consideration: a fresh dedicated, empty and verified project with confirmed plan/cost/capacity; or a privately provisioned isolated local disposable PostgreSQL/Auth/Storage equivalent whose managed catalog can be verified. The latter remains a compatibility candidate, not assumed managed Supabase equivalence. No production-held project reuse, account upgrade, new billing commitment or cloud project creation without separate authorization.

## Mandatory before any rehearsal

Full pinned bootstrap/migration order and managed role/ACL/index equivalence; qualified empty isolated destination; reversible cleanup; archived backup receipt/key and data/sequence/RLS/audit reconciliation protocol; explicit owner approval of exact pinned executable/source, destination, costs, security boundaries and one run. Failure at any condition => STOP/NO-GO.

No SQL, restore, backup decryption, SSL toggle/reboot, project/role/grant creation, Plesk deploy, Zoho, accounting or T20 actions under this record.
