# T19-RESTORE-VERIFY-01 — upstream provenance manifest v0.1 (2026-10-27)

**Disposition: SOURCE-ONLY PARTIAL VERIFICATION / EXECUTION NO-GO.**
Baseline: FaraiOS `staging` `d1ca779f5f684804ad057c2ee3b6334ebf05cd68`. This document does not authorize SQL, Docker starts/pulls, provider calls, credentials, migrations or restore. PR #193 remains separately under governance review.

## Reproducible source anchors (Git blob SHA-1, NOT SHA-256)
| Component | Exact upstream ref | File | Git blob SHA-1 | Finding |
| --- | --- | --- | --- | --- |
| Auth | `supabase/auth@v2.197.0` | `internal/indexworker/indexworker.go` | `1b12a9ecb85d4b17bc85faae05fa6857eba1f164` | Source exists; index worker responsible for index creation; configured invocation and four live index results NOT VERIFIED |
| Storage | `supabase/storage@v1.84.23` | `migrations/tenant/0002-storage-schema.sql` | `aaa5999b9f23fd8e9ecfc4f90c094ce748f12a7f` | Role/default ACL and storage schema setup depends on settings/actor |
| Storage | `supabase/storage@v1.84.23` | `migrations/tenant/0073-revoke-grants-to-unused-operations.sql` | `d22763e1cd75740155d11510fba13320fb49dbd5` | Role privilege reduction includes MAINTAIN conditional on PostgreSQL >=17 |
| PostgreSQL | `supabase/postgres@802e6a10d46963f690ef0766a7d55c29150678c2` | `migrations/db/migrations/20250623125453_tmp_grant_storage_tables_to_postgres_with_grant_option.sql` | `b499f9273691fd4256349b2be9c8a1dda664957e` | Conditional GRANT ALL on storage buckets/objects to postgres WITH GRANT OPTION |
| PostgreSQL | same ref | `migrations/db/migrations/20250709135250_grant_storage_schema_to_postgres_with_grant_option.sql` | `7440924844c9db690401b5538b4daa872a1fb2f3` | Conditional schema USAGE grant WITH GRANT OPTION |
| Vault | `supabase/vault@v0.3.1` | `README.md` | `99f6fae26119c404e80f0d9933dd4d71804b4c88` | Tag/source path visible, not proof extension binary/config or ACL compatibility |

Git connector fetched the exact files at the stated refs. A Git blob SHA-1 is not the byte-level SHA-256 acceptance digest or container registry manifest digest. Upstream tag names do not prove deployed image byte identity.

## Owner-local pinned image observations (reported, not independently re-run)
- PostgreSQL Linux/amd64 local ID `sha256:d6844e71062a3c8e2f8021d644802850760ef970a45ac163ec8c9f0171075bda`
- Auth Linux/amd64 local ID `sha256:839f529492d116b4e8b7777c953a27c381d34c15a744b1bcefde5eefaa1f9f9f`
- Storage Linux/amd64 local ID `sha256:b8f956b64ea3aee1dfc2cd9f0c9ce8d74335405992a90281bb5a979d1d552c22`
- Local `RepoDigests` strings reuse each respective image-ID suffix; therefore remote manifest authentication is **NOT VERIFIED**.

## Local T19 application SQL bytes verified by owner against Git blob IDs
| File | SHA-256 (owner-local) | Git blob SHA-1 | Evidence limit |
| --- | --- | --- | --- |
| `database/t19-custody-runtime.sql` | `C058371A32B39DCE6328ADA6414D32D82A2579238D183CE001A054A0E6176130` | `1e3fdd9335308d86d3e9228491ece12f1d809a5b` | Local committed bytes only |
| `database/t19-custody-oauth.sql` | `ABA7DD7459DDC36EB76CCA3132B63D5ACDC0113D94BF63DE7ABEE57B1D1F0991` | `1714b3c5b959b77e23dcf35d68d4d6e4dfe1cd38` | Local committed bytes only |
| `database/t19-custody-api.sql` | `0CC52B840FA86CCBC7EFF3351FEDC2A7E969357ADA8BD51CD7C6B4F2A3AA967E` | `4227c60c9cd615e21b1deb5b372c40dda7f85c18` | Local committed bytes only |

## Required future manifest records — all remain NO-GO
1. **Auth:** authoritative full pinned migration inventory with independently computed SHA-256 hashes, exact index-worker startup switch and actor, and four source-catalog index definition/validity comparisons.
2. **Storage:** exhaustive ordered tenant-migration inventory (historically described as 74 files, exact enumeration/hash not established here), SHA-256 hashes and versioned execution settings; grantor, owner, default/explicit ACL and grant-option equivalence, including `storage.install_roles` and `storage.super_user`.
3. **PostgreSQL:** full approved image/source correspondence and bootstrap ordering; grant-option migration SHA-256, execution principal, source-to-destination effective grants and extensions.
4. **Vault:** pinned 0.3.1 extension source/binary and runtime installability in disposable PostgreSQL; actual function signatures, ACLs, grants and negative privilege tests.
5. **All images and resources:** independently authenticated registry manifests, full required image/sidecar catalog, precise startup order, limits/isolation/cleanup and eligible disposable destination.
6. **Protected recovery:** exact privately held checkpoint provenance/authentication, expected full managed catalog and rollback/restore evidence; do not place ciphertext digests, keys or protected paths in Git.

Do not synthesize missing SHA-256 values, fabricate bootstrap actors, replace images, manually patch ACL/index results or treat a source-only PASS as runtime equivalence.

**Governance:** T19 In progress; A12 unresolved; managed execution NO-GO; Zoho/accounting activation NO-GO; T20 Not started. No hosted migration, credential material, Docker mutation, data access or financial writes.
