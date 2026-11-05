# T31-A02 — Controlled V3 rebaseline decision package (5 November 2026)

**Scope:** Owner review of one fresh FaraiOS staging pre-migration backup; original T30 backup profile remains authoritative until explicit replacement approval. **This document is not approval** to rebaseline, activate a local profile, run a backup/restore, migrate SQL, deploy or enable signup/email.

## Verified source and preservation

- Canonical T30 Done · T31 In progress · T32 Not started.
- PR #313 source-only merged into `staging`; Draft PR #314 contains the current read-only forensic evidence and a proposed atomic T31 migration and post-T31 backup-scope plan. T31 schema remains unapplied.
- Owner has verified `~/.faraios-backup-profile/current.json` is V3, source `xdmfyrsauvqznkloroxg`, exact 30 public/audit plus 35 private tables, owner-only `SHALEAN\info` file/directory ACL with inheritance disabled, and all seven fields equal to preserved `profile-v3-t30-candidate.json`. Local backup script is byte-identical to the approved staging source; working tree was clean.
- Approved original T30 V3 hashes: `catalog=6ab220df693da9748332e5eaa874231ed6fc6c21df293d91873219cf84d0ba14`, `application=2fc21b9e8cbee3e0b97b978ad774d7cd1aac9dae475947ff2ac3a5575b768797`, `managed=b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23`.
- Current, independently obtained hashes from the *same reviewed SQL*: `catalog=c3a84e04e1c1708adbeb57d51318ce3c5abf794f917f552b5c6a6b062a2b0198`, `application=70d9924639df9dddb4b126609e297079b999d850e9d2461c5fa4c236df3fec09`, `managed=b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23`.
- The 4 November object-level/component baseline has **not** been recovered. The old and live SHA-256 digests are not invertible and cannot, alone, establish which function or grant changed. The 3 November T30 review referenced 45 private functions but current count is 43 (not a proven same-date removal). The older T19 Auth/Storage differences do not explain the application hash mismatch.

## Present-day risk evidence (scope-limited, read-only)

- RLS is enabled on all 27 public, 3 audit and 35 private application tables; all 65 have `postgres` owner, and the checked private tables have neither PUBLIC nor direct `anon`/`authenticated` SELECT/INSERT grants.
- The protected app has 43 private functions across seven schemas; 39 SECURITY DEFINER functions all have function-level `search_path` entries. This does **not** establish function-body safety or user-to-tenant authorization.
- Examined `anon`, `authenticated`, T19 and T20 worker roles have no direct login, BYPASSRLS, superuser or CREATEROLE privileges. Role inheritance, all effective grants, memberships and all API paths require independent final review.
- `private_t25.portal` deliberately supports an `anon` EXECUTE+USAGE path for the T25 customer portal. Its committed definition checks session and a verified non-anonymous Auth identity. This must retain explicit live/native denial tests; the current state check was not a comprehensive security proof.
- Existing selected-field row digests for 2 businesses, 5 memberships, 53 catalogue items and 353 audit records were unchanged across read-only samples. They are not backups or whole-row integrity guarantees.
- The 24-hour PostgreSQL log text scan found no matching function/role DDL strings, which **cannot prove the absence** of DDL because successful DDL need not appear in logs.
- Post-T31 V3 backup is not supported: branding table, four private_t31 tables, new function/role structure and brand-audit identity sequence require an independently reviewed future V4 scope and recovery process.

## Prepared inactive rebaseline proposal

`scripts/t31-a02-v3-rebaseline-review.mjs` exports a **pure** `proposeT31A02V3Rebaseline` helper. It has no file access, password, network, environment mutation or backup execution. It:

1. Validates an already verified original V3 profile, preserving the exact 30+35 table inventory and original T30 three fingerprints.
2. Requires the independently reviewed current hash triplet and a reviewed 40-hex source SHA.
3. Constructs a *distinct* V3 candidate using the exact same tables, private tables and source project but a **new candidate ID**, and revalidates it using the existing V3 scope validator.
4. Returns `activation: DISABLED`, `approval: NOT_GRANTED` and `classification: UNEXPLAINED_HISTORICAL_DRIFT`. It does not create `current.json` or write any owner-private path. The separate unit test rejects a changed source, baseline, inventory, fingerprint, collision or missing provenance.

**No candidate file has been created or installed on the owner's Windows computer.** An owner-only candidate can only be written there later under a separately approved offline preparation step using the existing ACL-preserving writer; the original V3 and V2 history must remain unchanged. GitHub must never contain the active private profile or recovery key.

## Mandatory reviewer decision before owner approval

A designated independent reviewer should explicitly decide:

- [ ] Are current public/audit/private schema and function ownership, security definer bodies, RLS policies and effective grants consistent with approved T19–T30 migrations and the role matrix, including the T25 anonymous compatibility exception?
- [ ] Are the two undocumented private-function count differences, and the missing November 4 component baseline, recorded as **unresolved historical provenance limitations**, not falsely called benign or restored?
- [ ] Does live Supabase migration history and the current deployment provenance support a controlled current-state risk acceptance rather than a retrospective exact drift claim?
- [ ] Do the exact protected V3 30+35 table inventory, export scope, roles-only data, snapshot keeper/SQL/TLS pins, and sequence capture remain safe **before** the T31 schema is added?
- [ ] Are Auth, Storage, managed objects, Plesk private T19/T20 worker files and provider credentials handled by separate preservation controls rather than silently claimed in the logical DB archive?
- [ ] Are a genuine staging writer/worker freeze, archive verification, fresh source fingerprints, a protected original-profile history copy and independent restore plan documented and feasible?

If any item is NO/unknown, do not approve activation. An independent reviewer can explicitly accept **current-state** risk despite missing historic baseline; that is a governance decision, not a technical proof that nothing changed.

## Future approval boundaries

1. **Separate owner sign-off** for an owner-only NEW V3 candidate. Before writing it, re-read the live hash triplet using exact SQL and compare to the pinned proposal. Preserve original candidate, active file, directory ACL and original SHA. Do not use GitHub to change private local profile.
2. **Separate owner approval** to switch the active protected `current.json` only after candidate and inherited ACL checks pass. No silent edit or removal; use owner-controlled, collision-safe swap with documented rollback and readback.
3. Existing approval for **one fresh pre-migration staging encrypted backup** remains conditional on all guards passing and an actual staging write freeze, followed by encrypted archive+SHA validation. A backup is not evidence of independent restore.
4. Any isolated hosted restore, T31 SQL migration, preview deployment, Auth signup activation, and T32 start require independent authorisations.

**Decision today: REBASELINE PREPARATION ONLY. NO GO for owner-local activation or hosted backup.**
