# T19 operational custody SQL — remaining gated execution design (review only)

Status: **NO-GO for hosted execution**. Source-only companion to Issue #140, operational review packet T19-OPERATIONAL-SQL-REVIEW-01. Not an installation script, approval, permission change, or rollback attestation.

## Confirmed source fix on PR #148

The runtime SQL must GRANT EXECUTE on the managed routine identity `vault.create_secret(text,text,text,uuid)`, not the shorthand three-argument call with defaults. The disposable fixture defines the same four-argument identity. Fixture success does **not** establish actual Supabase Vault cryptography or hosted grantor authority.

## OP-02 — managed function-owner transfer (UNRESOLVED)

The inactive schema was installed as postgres-owned, with the runtime owner role initially absent. PostgreSQL non-superuser ALTER FUNCTION OWNER requires both an actor that can SET ROLE to the proposed owner and new-owner CREATE privilege on the function schema. A function-owner transfer is not made safe by a successful superuser fixture. Review the exact current session_user/current_user, current role membership options, schema owner/default ACL and the effective SET and CREATE paths on the actual host **read-only** before approving any execution.

A future reviewed plan must prove temporary CREATE and SET rights can be granted by the authenticated grantor, used only for enumerated functions within the intended transaction, and removed/reverted with postconditions confirming no residual privilege paths. The existing creator-admin membership can have SET=false; do not assume it is equivalent to SET permission. Do not leave broad CREATE rights or silently transfer managed ownership. Stop if exact authoritative preconditions cannot be met. Include existing PostgreSQL ownership and membership auto-effects in the rollback inventory.

## OP-03 — Vault permissions and consumers (UNRESOLVED)

The source proposes broad REVOKE on managed Vault tables/functions and grants runtime-owner access to decrypted_secrets and create_secret. Before any hosted mutation, inventory ALL grants/grantors, ownership, default privileges, role inheritance and effective permission paths, including indirectly privileged DEFINER routines. Enumerate all actual Vault consumers outside T19, including platform processes, projects and any external scripts that cannot be excluded by a database count. **Zero Vault rows is not evidence of zero consumers.** Do not REVOKE managed grants solely on SQL fixture evidence. A failed inventory is NO-GO, not reason to suppress denial checks.

## OP-04 — atomic execution / guarded rollback (UNRESOLVED)

The three reviewed operational SQL files each contain independent BEGIN/COMMIT. The review-context GUC is not host identity or owner authorization. They are **not** suitable as an unattended three-file concatenation, automatic retry, or partial-commit repair. A future separate approval packet must bind exact source bytes and target identity; preflight expected absent objects, constraints, catalog fingerprints, auth/accounting digests, effective grants and managed functions; and retain an inverse inventory for every new policy, function, table, column, index, role, membership, grant and revocation.

Pre-commit error: rely on transaction rollback and verify unchanged state. Post-commit mismatch: stop writes, preserve evidence, assess pre-existing data and external dependencies; perform only a separately authorised inverse transaction whose guards prove all introduced objects remain empty/unreferenced and whose captured ACL/grantor/member baseline permits exact privilege restoration. **Never CASCADE, guess previous grants, delete financial/credential data, or automatically rerun a partially committed stage.** A source file committed in Git is not a recoverable database checkpoint.

## Other gates

- OP-05: custody remains NOLOGIN and checks session_user=t19_hosted_custody. No actual authenticated custody-host session established; do not replace with service_role/SET ROLE impersonation.
- OP-06: independently accepted A12 operational security, current-scope isolated recovery, off-site/key retrieval and credential-bearing recovery remain outstanding. The inactive-only risk acceptance is not transferable.
- Authenticated/public API wrappers and managed-role indirect access require hosted allow/deny acceptance before provisioning credentials.
- Actual Zoho consent, per-business organization and CREATE permissions, tax mapping, financial reconciliation, and scheduler activation are separate gates.

## Decision

PR #148 remains draft, source-only, unmerged. No hosted SQL, production change, credentials, provider operation or financial write is authorised by this document. T19 In progress; A12 unresolved; Accounting activation NO-GO; T20 Not started.
