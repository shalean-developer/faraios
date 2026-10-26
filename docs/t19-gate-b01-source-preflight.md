# T19 Gate B-01 — source-only hosted custody preparation

Date: 2026-10-26. Status: REVIEW ONLY. Approval T19-A12-OWNER-20261026 authorizes owner-led **staging security review**, not hosted SQL, credentials or service activation. Canonical Build Tracker T19 remains In progress; T20 Not started.

## Exact baseline
- Target staging Supabase project: `xdmfyrsauvqznkloroxg` (PostgreSQL 17.11 in last audit).
- Source baseline staging commit: `70721e29b09b22e1066e706f1619f5545b75cc13`.
- Existing `private_t19_custody` schema is already installed. Objects: `connections`, `operations`, `prepared_references`; postgres ownership; no runtime functions. **Never reapply** `docs/proposals/t19-02-staging-inactive-schema.sql` (blob `ffc54cc1676edc83533c1f16dec56af05f16928f`).
- Staging SQL review-source blobs (not approval or executable deployment artifacts):
  1. `database/t19-custody-runtime.sql` blob `1e3fdd9335308d86d3e9228491ece12f1d809a5b`
  2. `database/t19-custody-oauth.sql` blob `1714b3c5b959b77e23dcf35d68d4d6e4dfe1cd38`
  3. `database/t19-custody-api.sql` blob `4227c60c9cd615e21b1deb5b372c40dda7f85c18`.

## Source checks already established
- Each proposed SQL stage contains transactional preflight collision denial using SQLSTATE `55000`.
- Native PostgreSQL CI at this baseline includes `T19_OP04_SQLSTATE_55000_COLLISION_AND_ROLLBACK_PASS`, `T19_OP02_RESTRICTED_NATIVE_PASS`, and `T19_NATIVE_ACCEPTANCE_PASSED` (Foundation run `40383358586`). CI is disposable evidence only.
- Hosted effective grants: `anon`, `authenticated`, `service_role` cannot use `private_t19_custody`. `t19_hosted_custody` NOLOGIN/NOINHERIT. Vault `service_role` still has USAGE/SELECT and privileged functions. Zero Vault secrets in most recent read-only count.
- Vault consumer inventory and Supabase API exposed-schema configuration remain incomplete. The SQL explicitly proposes managed-role creation, RLS policies, authenticated public functions, and revocation of legacy financial publisher privileges: dependency assessment is mandatory.

## Gate B-01 acceptance checklist — no hosting side effects
- [ ] Reconcile each proposed SQL statement with exact hosted columns, unique constraints, functions, grants and dependencies; document any mismatch and fix only verified source defects in separate reviewed commits.
- [ ] Enumerate all Vault consumers (hosted app/Edge/custom RPCs/other integrations), then determine whether service_role's managed Vault grants may be retained or must be isolated with a reviewed compensating control. No blanket revoke.
- [ ] Inspect actual Supabase Data API exposed schemas. Prove private custody is not HTTP reachable and verify PUBLIC `t19_*` wrappers deny unauthorized owners/businesses.
- [ ] Demonstrate managed Supabase authority can provision `t19_runtime_owner` and perform temporary `ALTER FUNCTION OWNER` without leaving SET/CREATE authority. If incompatible, stop for bounded redesign.
- [ ] Inspect exact privilege paths and captured actual SQLSTATE 42501 denials using permitted restricted identities. Preserve catalog before/after comparison and protected data integrity.
- [ ] Prepare immutable recovery checkpoint (database schema/data, audit ledger, hosting source/ACLs, and restoration rehearsal). Prior 639-file copy comparison is not a full database restore.
- [ ] Confirm runtime and provider operations remain disabled; no credential material, schedule or mTLS identity provisioned.
- [ ] Verify final complete SQL bytes and blob hashes; require a new **separate owner approval** naming project, exact final SQL, migration order, expected grants, backup and restore protocol.

## Proposed staging execution gates — NOT AUTHORIZED
1. When **all** B-01 preconditions and owner approval pass, apply the reviewed *runtime* SQL in one controlled transaction. Stop on preflight collision; capture post-commit catalog, RLS/ACL/role test results. Verify failure rollback before any retry.
2. Request **separate** approval for OAuth SQL after runtime post-check PASS. Repeat exact-SHA checks and recovery readiness.
3. Request **separate** approval for API SQL after OAuth post-check PASS; verify HTTP authorization denial and intended permitted routes.
4. Keep `_passenger.cjs` as existing launcher; do not select `_accounting.cjs`, install systemd services, set up Vault credentials or connect Zoho without later explicit security/runtime/provider gates.

## Restore and failure protocol
- Pre-commit failure: transaction rollback, verify no objects or grants leaked; do not continue to later SQL stages.
- Unknown outcome: re-audit hosted catalog and migration state; never blindly replay source SQL.
- Committed defect: disable affected operation; preserve financial/audit and credential references; use separately approved verified PITR/snapshot restore or reviewed forward correction. Do **not** destructively drop tables, functions or secrets as a generic rollback.
- Staging success criteria: exact post-commit catalog evidence, privilege-denial SQLSTATE, RLS/API denial, owner/tenant isolation and unchanged financial baselines.

## Explicit non-actions
No migrations, roles, grants, secrets, Zoho OAuth or provider calls, worker/scheduler activation, invoice writes, production changes or T20 work in Gate B-01.

**Disposition:** source preparation ready for review; hosted installation NO-GO until checklist and separate exact-SQL approval.
