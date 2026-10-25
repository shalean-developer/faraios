# T19 SEC-02 — bounded security assessment (2026-10-25)

PR: #132 (DRAFT). Assessed source head: 3c596dadd651312d1f1d4f2fc1e37f197827374e.
Scope: synthetic PostgreSQL fixture and CI only. Review is a source-level technical assessment, **not** independent security sign-off.

## Evidence
- PostgreSQL 17 durable-disposable run 40205472882: SUCCESS, including concurrent authenticated claims, expiry rejection, both sequential disconnect/publication orderings, dispatched uncertainty retained, replay denied and container restart persistence.
- Foundation checks run 40205472855 was still in progress when assessment began. Record its final result separately before review/merge.
- Existing PR #130 negative SQLSTATE 42501 privilege separation remains historical baseline.

## Critical findings / remediation gates

**SEC02-P1: sealed-reference provenance missing — BLOCKER.**
`custody_durable.publish(b,op,lease,sealed_ref)` accepts *any non-NULL UUID*. The exact binding, lease and generation checks cannot prove that reference was produced by an authorised distinct sealing identity for the same seven fields. Add a private prepared-reference registry tied to the complete seven-field C1 tuple, specific operation, lease and immutable reference; registration must be isolated to an independently authenticated restricted sealing principal (not web, invoice worker or historical publisher). Publication must consume the prepared entry atomically with version bump. Test arbitrary/foreign/duplicate/reused/stale references, missing attestations and concurrent consumption. A registry-only record does **not** cryptographically establish upstream credential authenticity; separately verify provenance of the source of sealing.

**SEC02-P2: overly privileged SECURITY DEFINER ownership — BLOCKER.**
Functions are owned by `t19_fixture` (disposable database superuser), not a dedicated minimal `NOLOGIN` owner. The fixed `search_path=pg_catalog` and `session_user` identity check are helpful but not sufficient. Recreate under a dedicated non-superuser NOLOGIN function owner with only necessary table privileges, and separate caller LOGIN role with EXECUTE only. Revoke schema/table/sequence/function access from PUBLIC; verify default privileges, role memberships, function ownership, RLS and effective grants from distinct physical login sessions. Demonstrate no caller path can `SET ROLE`/impersonate function owner or mutate registry data.

**SEC02-P3: actual effect boundary not atomic — BLOCKER.**
`dispatch` only records a database state transition. Real Zoho refresh, token rotation, provider uncertainty and the durable dispatch-intent/side-effect boundary are not integrated or verified. A successful SQL transition is NOT evidence the provider call occurred exactly once or that the rotated secret was durably sealed.

**SEC02-P4: crash/race evidence incomplete — BLOCKER.**
CI checks simultaneous claims and sequential state orderings; it does NOT deterministically overlap disconnect and publish in independent held transactions or simulate an abrupt process termination while a transaction/provider request is in flight. A normal PostgreSQL container restart establishes persistence of a committed recovery_required state, not mid-operation crash safety. Require barrier-controlled real-session races and interruption/restart at before-intent, after-intent, before-publish, after-commit checkpoints.

**SEC02-P5: recovery/reconnect policy incomplete — BLOCKER.**
Dispatched uncertainty is held and replay denied, but trusted provider classification, reviewed reconciliation, reconnect on a fresh generation, and historic credential retirement/deletion rules have not been exercised end-to-end. Preserve owner-approved D4 disconnect/reconnect semantics.

## Decision
**CONDITIONAL PASS for disposable SQL test expansion only; NO-GO for merge acceptance, A12 closure, hosted custody, real secrets, OAuth and accounting activation.** Keep #132 Draft pending P1–P5 resolution, independent security review and exact-head foundation checks. T19 In progress; T20 Not started. No hosted DB, production system, credential or Zoho connection altered.
