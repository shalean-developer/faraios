# T19-RESTORE-VERIFY-01 — pinned source-only restore candidate specification

**Date:** 2026-10-27  
**Disposition:** SPECIFICATION ONLY / EXECUTION NO-GO  
**Source project:** FaraiOS staging `xdmfyrsauvqznkloroxg`.  
**Baseline:** staging Git commit `1ec38f7b19ae4c9b8d79dde17393b1ac5a07680b` at preparation.  
**Owner decision:** SSL enforcement stays OFF; prioritize independently verified restoration. T19 In progress; A12 unresolved; accounting activation NO-GO; T20 Not started.

## Candidate identity and immutable input requirements

The 2026-10-26 protected encrypted **v2 checkpoint** is the recovery target, not the earlier T11 archive successfully rehearsed 2026-10-21. Its protected ciphertext digest, reviewed manifest, original application and managed catalog fingerprints, exact scope, immutable receipt and private key provenance must be verified from existing private evidence **without copying values, keys, paths or sensitive digests into Git, CI, chat or PR comments**. Archive authentication is not restoration proof.

Preserve the previously reviewed candidate version line without retagging:
- PostgreSQL **17.11.0.003** (reviewed candidate image; privately pin exact digest before any rehearsal)
- Supabase Auth **v2.197.0**, official pinned source `supabase/auth` tag `v2.197.0`, file `internal/indexworker/indexworker.go`.
- Supabase Storage **v1.84.23**, official pinned source `supabase/storage` tag `v1.84.23`, migrations `0002-storage-schema.sql` through `0073-revoke-grants-to-unused-operations.sql`.
- Supabase Vault **0.3.1**, and all managed Auth/Storage role/schema and migration provenance required by the protected v2 profile. Never assume an image tag alone pins digest or complete hosted provisioning.

The exact approved source commits, architecture/image digests, 74 Storage migration-file checksums, Auth migration set, PostgreSQL extensions and other provider-managed component versions must be independently verified against the privately retained compatibility packet before any execution. No silent substitution of current/latest vendor release.

## Six previously observed managed-catalog discrepancies

**Four missing-in-candidate Auth indexes.** Live staging has:
1. `idx_users_email`: btree `auth.users(email)`
2. `idx_users_created_at_desc`: btree `auth.users(created_at DESC)`
3. `idx_users_last_sign_in_at_desc`: btree `auth.users(last_sign_in_at DESC)`
4. `idx_users_name`: partial btree `(raw_user_meta_data ->> 'name')`, excluding NULL.

Official Auth v2.197.0 `internal/indexworker/indexworker.go` defines all four through its optional/concurrent index worker. **Required proof:** correct pinned executable/configuration, authorized index-worker invocation, readiness/validity/definition comparison, and reproducibility on disposable destination. A migration-only run does not prove these indexes exist.

**Two Storage table ACL discrepancies.** `storage.buckets` and `storage.objects` are owned in source by `supabase_storage_admin`. For each, live source has eight explicit grants from `supabase_storage_admin` to `postgres`, with `is_grantable=true` for DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.

Official Storage v1.84.23 migration 0002 configures default grants, creates tables and transfers their ownership to `supabase_storage_admin`; migration 0073 adjusts selected `anon`/`authenticated` privileges. **Required proof:** exact provider bootstrap actor, `storage.install_roles`/`storage.super_user` context, ownership and grantor sequence, final table ACLs (including grant options), default ACLs and equivalent managed migration history. A default-privilege statement alone does not prove those eight explicit existing-table grants. Do not insert guessed `GRANT ... WITH GRANT OPTION` as an undocumented compatibility patch.

## Preflight (no execution authorised by this document)

1. Independently confirm approved *new, empty, disposable isolated* restore destination, owner/account, project isolation, price and capacity, no live consumers and no repointing of staging or production-held projects. Previous capacity limit and no eligible destination remain blockers.
2. Verify source identity and private checkpoint receipt/crypto authentication, exact v2 profile and archive integrity without exposing sensitive materials.
3. Reconcile current official pinned vendor source with all Auth and Storage managed roles, default/current ACL, indexes, functions, migrations, ownership and provider bootstrap operations. Produce a full expected-catalog diff, not a six-item-only waiver.
4. Confirm compatible PostgreSQL runtime, extensions, managed Auth/Storage components, provider role bootstrap and secure TLS route; verify complete least-privilege executor scope.
5. Establish recovery operator, clean stop/rollback/cleanup protocol, no active consumers, and independent baseline fingerprints for tables, RLS, audit, managed schema and sequences.
6. Obtain separate owner approval naming the exact destination, fully pinned executable/configuration/images and immutable candidate digest and one bounded rehearsal. A documentation PR merge is **not** that approval.

## Proposed rehearsal acceptance — *separate future approval required*

- One isolated attempt only; no source-project writes.
- Managed PostgreSQL catalog, Auth/Storage migrations, index validity/definitions, explicit and default ACLs, grantors/grantees/ownership, extensions and roles exactly match reviewed checkpoint criteria.
- Authenticated archive restore with data/row digest/sequence consistency, RLS denied/permitted tests, audit trails, business tenancy invariants, restore functionality and full cleanup or residual disposition independently demonstrated.
- Provider configuration and non-database assets explicitly itemized as recovered/not covered. No declaration of full recovery if excluded assets or managed configuration remain unverified.
- Preserve protected evidence privately, public PASS/NO-GO summary without credentials/digests.
- Any failure/unknown comparison => **NO-GO**, stop without iterative mutations to make hashes pass.

## Invariants and explicit prohibitions

No automatic execution, no hosted DB migrations or grants, no backup decryption/copy, no Vault or provider credentials, no new project, no SSL toggle/reboot, no Plesk deploy, no Zoho/accounting operations, no production-held project modification and no T20. Do not interpret old T11 restore PASS or synthetic/local PostgreSQL success as the new T19 checkpoint restore PASS.

**Current acceptance:** provenance partially verified; exact Storage grant-option bootstrap, complete managed catalog equivalence, eligible isolated destination and authenticated restore remain **OPEN**. T19 recovery **NO-GO**.
