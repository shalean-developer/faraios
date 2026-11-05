# T31 — Read-only staging migration review and rollback readiness (5 November 2026)

**Decision:** REVIEW COMPLETE FOR INVENTORY; MIGRATION NOT YET AUTHORISED OR READY TO EXECUTE. This is source-only evidence on a separate review branch. No live database DDL, DML, backup, restore, Auth configuration, Plesk deployment, or outbound messaging was performed.

**Source release:** PR #313 is merged source-only to `staging` at `3d1de9155cbb09e4e95d8e6b64699351716e62bc`. T30 Done · T31 In progress · T32 Not started.

## Live, read-only inventory

- Supabase **faraios-staging**, project `xdmfyrsauvqznkloroxg`, PostgreSQL **17.11.0.003**, status `ACTIVE_HEALTHY`. Never use project `paqjwfulwywtsyyvdxrq` for T31 review.
- The existing `public.businesses`, `public.business_memberships`, `public.business_settings`, `public.business_catalogue`, `audit.events` objects exist. The two identity audit triggers `audit_business_change` and `audit_membership_change` are enabled.
- Neither `private_t31` schema nor `public.t31_business_branding` table nor any `public.t31_*` functions are currently installed. Dedicated execution roles `t31_bootstrap` and `t31_invite_worker` are absent.
- `postgres` is a role-creating login with `BYPASSRLS` and `CREATE` on `public`; it is **not** superuser. `auth.users` belongs to `supabase_auth_admin`, not `postgres`; read-only column grant inspection shows `postgres` has **grantable SELECT** on `id`, `email` and `email_confirmed_at`. Dedicated Auth column grants in the candidates still require execution-role and ownership proof in a disposable hosted-parity rehearsal.
- Existing audit `events_entity_table_check` includes `businesses` and `business_memberships`; no constraint expansion required for T31 branding because `private_t31.brand_audit` is a new, separate table. T19 runtime role policies coexist with existing authenticated select policies and must not be disturbed.
- The existing identity audit trigger is **SECURITY INVOKER**. In the rehearsal, prove the new nologin roles can insert only the intended audit events under RLS, with no accidental global write permissions.
- Current security advisor shows a WARN for **leaked-password protection disabled**, plus INFO for existing RLS-enabled private/audit tables without select policies. This does not justify enabling Auth email/signup; independent Auth review is required before any real owner registration.

### Baseline snapshot — OBSERVATION ONLY

Counts and deterministic fingerprints were read directly from current staging. They are a *point-in-time comparison*, not a verified backup. Re-read immediately before an approved migration and compare directly after it.

| Dataset | Rows | MD5 fingerprint of sorted selected identifier/status fields |
|---|---:|---|
| `public.businesses` | 2 | `c4e263bfc29b5c36d7bc23819986d688` |
| `public.business_memberships` | 5 | `c23c10e0c49dd5ab414005b52baba0ac` |
| `public.business_settings` | 2 | `2aadeaeb366195de3cfaa3749c5b6d8c` |
| `public.business_catalogue` | 53 | `639535f3f8677731c4bd24e57bbe2c2e` |
| `audit.events` | 353 | `562ddc22e3d722155ab4db9eeeb8ac20` |

**Caution:** Fingerprints cover selected identity/status/price fields only, not every column or private record; they are not cryptographic backups and can legitimately change with concurrent use. Add whole-schema backup/restore readback and no-write freeze evidence before execution.

## Candidate scripts reviewed

1. `database/t31-provisioning-candidate.sql`: creates `private_t31`, `t31_bootstrap`, request idempotency table/policies, audited atomic creation function, public invoker wrapper. Verified-owner `auth.users.email_confirmed_at` check is present.
2. `database/t31-branding-candidate.sql`: adds owner-RLS `public.t31_business_branding` plus private audit/trigger. Does not create Storage logo bucket or upload access.
3. `database/t31-staff-invitations-candidate.sql`: adds `t31_invite_worker`, private invitation/identity-audit records and public invoker wrappers for invite, accept, owner roster, and suspend. No outbound email or messaging transport.

**Critical release blocker:** Each script has its own `BEGIN/COMMIT`. Applying the three files as separate live transactions could commit provisioning but fail later in branding/invitations, leaving a partial installation. **Do not apply the three source candidates directly.** Produce a reviewed *single atomic generated migration* with consolidated transaction boundaries or a separately qualified multi-phase recovery protocol. Verify no conflicting role/policy/function/table names, and verify migration version/history behavior before the write.

## Rollback and recovery plan — prepared, NOT executed

**Before migration approval:**
- Freeze only the intended **T31 schema write window**; verify other business operations are unaffected. Obtain an authorised fresh staging full database backup including Auth, `public`, `audit` and private schemas/roles, plus a separate encrypted owner-controlled offsite copy where permitted. Verify checksum, manifest, owner-only ACL, and an isolated full restore that can read both business memberships and settings. A local backup *candidate profile* is not evidence that a full backup/restore happened.
- Capture exact app/server release SHA, Plesk deployment branch, permitted private worker states, network/API allowlist, credentials fingerprints (never secrets), counts/fingerprints, and original policies/grants. Confirm there is no automatic deploy on Git push; Plesk Git deployment remains separately controlled.
- Generate an exact reviewed T31 migration from the three source candidates using the approved Supabase migration process; run it under a **disposable PostgreSQL 17 hosted-parity role fixture**. Prove Auth column grants, role ownership, native RLS, audit triggers, concurrency/rollback, no cross-business reads or role escalation, anonymous denial, and clean rollback of deliberately injected errors.
- Confirm latest-head source CI plus native PostgreSQL and HTTP synthetic PASS markers. Independently review official Auth redirect allowlists, confirmation requirements, outbound email restrictions, and leaked-password setting before activation.

**If migration fails before the transaction commits:** abort/roll back the one atomic migration transaction and verify none of the T31 objects/roles/policies remain, with old counts, fingerprints and permissions intact. Inspect migration history. Do not try an automatic `DROP SCHEMA ... CASCADE`.

**If migration commits but no T31 accounts/businesses have been created:** preserve a source/SQL evidence journal and explicitly approve any narrowly scoped reversal; verify zero new T31 business/invite/audit rows and absence of dependencies before removing objects. Never blindly remove shared `auth`, `public` or `audit` objects.

**If migration commits and any T31 business, invite, audit or membership is present:** do **not** destructively downgrade. Stop/restrict the new T31 API wrappers and source route under a separate emergency-change approval, retain all T31 and existing records, keep original owner memberships, revert the application to an owner-verified prior SHA, and investigate isolated restoration/migration-forward. Retain the original audit trails and obligations. Never restore an old snapshot over valid newer business data without a separately reviewed point-in-time recovery/cutover plan.

**After authorised installation, before visual preview:** verify previous businesses/memberships/catalogue/settings/audit baselines still match within any known controlled changes; verify newly created schema objects, owners, RLS/grants, role membership, function SECURITY DEFINER/INVOKER configuration and callable API exposure. Deny user-supplied owner role and foreign-tenant reads. Only then seek a separate *protected* preview deployment approval.

## Unresolved go/no-go prerequisites

- [ ] Generated atomic migration and exact diff (source candidates are not deployable migrations).
- [ ] Hosted-parity isolated migration and controlled failure/rollback rehearsal; Supabase Auth grants and T19 policy coexistence checked.
- [ ] Fresh authorised staging backup + checksum + **independent isolated restore** verified.
- [ ] At-time-of-change data and permission fingerprints, change freeze and owner-observed no-change readback.
- [ ] Final dry-run operator runbook with exact target project, source SHA, SQL SHA, migration history, rollback procedure and independent readback.
- [ ] **Explicit owner approval for staging migration** — NOT YET GIVEN.
- [ ] **Separate owner approval for protected preview deployment and Auth email activation**, when qualified — NOT YET GIVEN.

**Current decision: NO GO for database migration, deployment and Auth activation.** This document records read-only evidence only.
