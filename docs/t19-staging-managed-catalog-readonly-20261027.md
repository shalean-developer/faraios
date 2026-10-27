# T19 — staging managed bootstrap catalog read-only verification (27 October 2026)

**Project:** FaraiOS staging `xdmfyrsauvqznkloroxg` (eu-west-1). **Mode:** read-only Supabase metadata/catalog inspection. **Disposition:** partial catalog PASS; historical execution provenance NO-GO; managed bootstrap/restore/accounting execution NO-GO.

## Directly observed
- Project ACTIVE_HEALTHY, PostgreSQL version `17.11.0.003`. Installed `supabase_vault` version `0.3.1`. This proves hosted extension installation, not disposable-image extension compatibility or its ACL safety.
- `pg_index` / `pg_get_indexdef` on `auth.users`: `idx_users_email`, `idx_users_created_at_desc`, `idx_users_last_sign_in_at_desc`, and `idx_users_name` are all `indisvalid=true`, `indisready=true`, with expected btree/partial expression definitions. Actual worker startup flags/database session identity/original creation role **not observed**.
- `storage.buckets` and `storage.objects` are owned by `supabase_storage_admin`. For each, `aclexplode(relacl)` reports eight privileges to `postgres`: DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE, all `is_grantable=true` and recorded `grantor=supabase_storage_admin`. Current catalog grantor is not a historical actor audit.
- `storage.migrations` count is 74. No full per-row comparison to the 74 pinned migration file names, 40-character migration-history SHA-1 scheme or execution order performed. Supabase's standard application migrations listing is not a substitute for managed Storage migration history.

## Still required
1. Trusted hosted Auth startup/configuration source including index-worker activation, DB connection role and execution log; credentials must not be retrieved.
2. Exact Storage migration names/hashes/runner ordering and historical strategy/freeze values from authoritative source, plus migration executor and grants chronology.
3. Authenticate registry manifests and map images to pinned source commits; locally printed image config ID is not independent registry provenance.
4. Verify Vault 0.3.1 against the future disposable environment and least-privilege ACLs; prove network, RAM, volume and cleanup isolation.
5. Independently review original and current protected recovery/catal​og evidence before any attempted restore.

No write statements or deployment actions performed. Do not infer historical provisioning from current ACLs. T19 In progress; A12 unresolved; managed execution NO-GO; Zoho activation NO-GO; T20 Not started.
