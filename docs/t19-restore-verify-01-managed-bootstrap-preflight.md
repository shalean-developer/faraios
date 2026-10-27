# T19-RESTORE-VERIFY-01 — managed bootstrap preflight (source-only)

Date: 2026-10-27. Scope: one bounded T19 preflight; **NOT an execution approval**. Parent evidence: Issue #183; `docs/t19-restore-verify-01-candidate-spec.md` and `docs/t19-restore-verify-01-provenance-destination-decision.md`. T19 remains In progress; A12 unresolved; SSL enforcement OFF; B-02, checkpoint recovery and accounting activation NO-GO; T20 untouched.

## What the owner's local inspection actually establishes

The owner completed disposable PostgreSQL 17.11 role/denial/rollback testing and independently verified no synthetic role/schema remnants before stopping the `--rm` test container. That was a **vanilla PostgreSQL** compatibility test, not a managed Auth/Storage bootstrap or a restore.

The owner has three local Linux/amd64 Supabase images, independently identified by local SHA256 image IDs:

| Component | Pinned candidate | Local ID |
| --- | --- | --- |
| Supabase PostgreSQL | 17.11.0.003 (version/digest correlation to be independently rechecked against approved vendor image manifest) | `sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda` |
| Supabase Auth | v2.197.0 (version/digest correlation to be independently rechecked) | `sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f` |
| Supabase Storage | v1.84.23 (local image `VERSION=1.84.23`; manifest provenance still needed) | `sha256:b8f956b64ea3aee1dfc2cd9f0c9ce8d74335405992a90281bb5a979d1d552c22` |

An image ID proves which local image Docker references; it does **not** prove installed extensions, provider-managed role/bootstrap order, encrypted snapshot compatibility, or source project catalog equivalence. No reason to download or replace a cached image merely due to a missing tag.

## Next smallest **non-executing** checks

1. Confirm image manifests and architecture against approved vendor source, original reviewed compatibility packet, and protected image digest; distinguish registry manifest digest from local Docker image config ID. Read-only local `docker image inspect` is allowed; do not publish environment secrets.
2. Obtain the exact versioned image contents/source references for PostgreSQL bootstrap migrations, Vault 0.3.1 extension, Auth index worker and Storage tenant migrations. **Do not launch server processes or run migrations** in this step.
3. Build an expected-catalog matrix including all roles/memberships, owner/grantor/grantee/privilege/grant-option pairs, defaults, Auth indexes with ready/valid states, sequences, functions, extensions, RLS, trigger definitions, migration order/hashes and provider initialization settings. No six-discrepancy-only shortcut.
4. Verify the permitted initialization actor and sequence for `supabase_storage_admin` and the two grant-option PostgreSQL migrations. A `GRANT ALL WITH GRANT OPTION` statement in source is not proof of original actor or final grantor. No hand-written grant to force an equivalence diff.
5. Produce one **synthetic-only managed bootstrap** execution proposal: wholly isolated new Docker network/filesystem, unique temporary role identities, memory bounds and total resource budget, no ports, no mounted real data, no credentials, no checkpoint access, explicit cleanup and fail-closed readback. It requires a separately reviewed implementation, final CI, operator approval of exact runtime/image/config and run; no automatic execution.

## Stop conditions / acceptance

**Source-only PASS** requires a traceable, pinned image and migration provenance inventory plus comprehensive expected-catalog and bounded execution/cleanup protocol. Unverified grantors, undocumented Auth startup flags, missing Vault or insufficient RAM => **NO-GO** for executing bootstrap. A source-only PASS never substitutes for managed runtime compatibility, isolated restore or disaster recovery acceptance.

Forbidden: any hosted Supabase SQL, new project, provider credentials, secrets in Git, backup access/decryption, SSL toggle/reboot, Plesk deployment, Zoho/accounting writes or T20 work. Preserve existing Shalean Docker resources; no pulling, starting or deleting images/containers under this document.
