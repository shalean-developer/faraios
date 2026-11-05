# T31 — Owner-controlled staging backup and independent restore readiness

**Prepared:** 5 November 2026. **Authorization:** NONE for hosted backup, hosted restore, schema migration, Auth change, Plesk deployment, or third-business onboarding. This is a bounded, source-only operator checklist; it contains no secret, password, token, archive path, or live access credential.

## What was verified and what was not

- T31 atomic candidate and native PostgreSQL security + injected rollback + a *disposable same-cluster, separate-database* pg_dump/pg_restore were verified on PR #314 prior CI.
- Live FaraiOS staging project is `xdmfyrsauvqznkloroxg`; existing 2 businesses, 5 memberships and their other operational state must be preserved. Other Supabase projects must not be touched.
- Original encrypted backup implementation is `scripts/backup-staging.mjs`, owner-private profile file `~/.faraios-backup-profile/current.json`, key root `~/.faraios-recovery-keys`. The profile is owner-controlled and its contents must **not** be committed to Git.
- Existing V3 scope validator in `scripts/backup-scope.mjs` expects exact reviewed non-managed private tables from `scripts/backup-private-scope.mjs`. Current capture code pins exactly two business IDs, as well as schema, roles, RLS, protected catalog fingerprints and provider constraints.
- **Before the T31 migration:** continue to use the existing approved V3 profile only if its current owner, inheritance-disabled ACL, table list, all three live catalog fingerprints, project pin and write-freeze checks pass. Do not activate a different candidate profile by copying values from this document.
- **After the T31 migration:** the original V3 scope MUST fail closed because the future schema contains `public.t31_business_branding`, four `private_t31` tables, two new roles, new functions, policies and a new schema. Even if a new business has not been created, the structural fingerprint changes. If a third business has been created, the two-ID pin rejects it. This fail-closed rejection is intentional.
- `scripts/t31-backup-scope-proposal.mjs` is an **inactive, offline proposal**. It enumerates the exact additional tables, expected new roles and T31 function owners/SECURITY DEFINER flags. It does not change the live backup or restore helper and it cannot activate a V4 profile. Its test `test/t31-backup-scope-proposal.test.js` checks omissions, extra schemas, role drift, cross-business changes, RLS or owner mismatch and catalog drift.
- Existing restore script `scripts/restore-staging.mjs` pins a legacy restore-test destination and approved historical capture config; that destination **cannot be presumed empty or safe for this new archive**. Do not change its fixed destination or import constraints without a distinct review and approval.

## Additional blocking sequence incompatibility

The T31 `private_t31.brand_audit` table has `id bigint generated always as identity`, creating `private_t31.brand_audit_id_seq`. Existing `scripts/backup-scope.mjs` only includes previously approved private schemas in the sequence snapshot, while `scripts/backup-staging.mjs` validates sequence names against `public`, `audit`, `auth`, `storage`, and `supabase_migrations` **without private schemas**. Existing `scripts/restore-staging.mjs` also validates against a hard-pinned historical sequence list. A post-T31 V4 pipeline must explicitly include and restore the new sequence under the reviewed private schema, without weakening known-sequence checks or existing managed Auth sequence handling. An encrypted archive without complete sequence recovery cannot qualify.

The inactive candidate `scripts/t31-backup-scope-proposal.mjs` now rejects missing or unreviewed private T31 sequence entries in a prospective manifest. Neither the current V3 backup nor the existing restore implementation is modified or activated by this proposal.

## Gate A — approve and run a fresh protected PRE-migration backup

1. Receive the owner's separate explicit authorisation for **one FaraiOS staging backup only** at source project `xdmfyrsauvqznkloroxg`, not schema migration or deployment. Record owner, date, approved project and limits.
2. On the owner's machine, verify Windows Node 24, Docker 29/compatible approved pinned image, protected owner-only directory ACL, actual current V3 profile, source/database TLS pin and full T30 30 public/audit + 35 private-table inventory. Compare live catalog/application/managed fingerprints with protected profile; **stop** on mismatch.
3. Verify an allowed quiet window and pause staging writes without disrupting production; inventory background workers, T19 private scheduled jobs and external dispatch protections. Do not change production or provider configuration as part of this checklist.
4. Only after the approved write-freeze, operator uses the already-reviewed interactive command `node scripts/backup-staging.mjs`. The helper requires typing `QUIET` and an existing staging database password **privately**; never paste credentials here. It produces an encrypted `.fbackup` archive, checksum and owner-controlled key.
5. Do not disable any scope/role/managed-data check to make a capture pass. If snapshot, manifest, ACL, login, provider, data comparison or structural check fails, **STOP** and record a redacted error code; no unverified backup may be used.
6. Verify archive and checksum offline with `node scripts/backup-staging.mjs --verify-file <owner-private-archive-path>`; compare exact resulting artifact ID, checksum, approved size, archive role contents and catalog/row manifest. Store `.fbackup` and `.sha256` in approved owner-private storage and the decryption key separately (never in Git/Chat).
7. Record pre/post source table counts plus independently observed catalog/managed/application structural fingerprints and source release SHA. Do not confuse a successful archive self-check with a verified restore.

## Gate B — separately authorise and prove an INDEPENDENT isolated restore

1. Receive separate owner approval for a **new or independently verified empty** restore destination, with provider dispatch, outbound messages, app authentication and financial processing disabled. Protect destination network access and exclude production credentials.
2. Verify the restore target really is unused/empty, PostgreSQL/extension compatibility, role ownership and the exact capture manifest; do not assume legacy `zrlojsvkqipuwkkyfrkn` is free or suitable.
3. Review restore/import differences for managed Supabase Auth/Storage, default grants, roles, sequences, migrations, T19 private custody and the T30 audited V3 scope. Do not blindly replay managed schemas or change historical financial state.
4. Test decryption, schema/catalog preflight, full restore, independent row counts/hash comparisons, role/grant/RLS/function/trigger checks, original business memberships and isolation denial. Re-run on a **different disposable host/cluster/project**, not merely a second database in the same cluster.
5. Preserve the encrypted source archive and owner-only key. Produce a signed/owner-observed `INDEPENDENT_RESTORE_PASS` evidence record with exact archive hash, source and destination project IDs, target isolation proof, security regression and final cleanup. If target import cannot be fully verified, mark **NO GO** and do not use the backup as a recovery guarantee.

## Gate C — POST-migration backup compatibility (not yet executable)

After an independently approved atomic T31 migration and **before** a real new business is allowed:
- Implement and review a new protected backup scope/profile version in a distinct source PR, including the five new T31 tables and the four private ones separately; existing source V3 must remain a valid historical recovery profile.
- Record new catalog/application/managed fingerprints, protected ACL and exact role/function provenance, ensure new `private_t31` tables are captured in *schema and data* dumps, verify sequence/constraint/trigger compatibility, and test old profile rejection with no network or export. Audit any owner-only key changes.
- Explicitly approve business-ID scope policy for independent SaaS tenants. Current two-ID hardcoded whitelist cannot support automatically onboarded third or later businesses. Never silently replace it with an unbounded wildcard.
- Prove a fresh V4 encrypted backup and **independent isolated full restore** using the approved destination and final candidate schema; compare Auth, audit, T31 invitations, branding, memberships and history. If any step fails, prevent activation of third-business onboarding.

## Decision table

| Gate | Observed result | Decision |
|---|---|---|
| Atomic T31 migration rollback in disposable PG17 | PASS, CI-evidenced | Source qualification only |
| Synthetic separate-database backup/restore | PASS, CI-evidenced | Not independent host recovery |
| V3 compatibility and two-business pin reviewed | Confirmed read-only | Preserve original |
| Owner-local protected V3 profile/ACL/credentials | Not observed | STOP |
| Fresh authorised hosted staging backup | Not run | STOP |
| Independently isolated hosted restore | Not run | STOP |
| Post-T31 V4 backup pipeline + restore | Not implemented | STOP |
| Owner staging migration approval | Not requested | STOP |
| T31 deployment/real registration | Not approved | STOP |

**No GO:** No live backup, independent restore, migration, hosted deployment, outbound messaging or production changes are authorised by this document.
