# QA-T17-20261019 — Independent staging assurance

## 1. Document control

Version 1. Independent reviewer: delegated QA agent `t17_independent_qa`, separate from the implementation agent. Implementation: merged [PR54](https://github.com/shalean-developer/faraios/pull/54), main `59402d731f3324212cac7e1cda67292980659359`. Staging: FaraiOS `xdmfyrsauvqznkloroxg`. Evidence cut-off: 19 October 2026, 17:36:08 UTC.

## 2. Executive assurance

**QA outcome: PASS — T17 bounded staging functional closure.** Applicable T17 functional, integrity and access criteria are satisfied with sufficient evidence. No unresolved T17 blocker was identified. Closure is supportable within this staging scope.

## 3. Scope

Weekly, fortnightly, monthly and multiple-weekday schedules; explicit future Draft generation; changes, pause, terminal cancellation; duplicate prevention and preservation of agreed history. Excludes production deployment, automated workers, billing, communications and foundation completion.

## 4. Authority and independence

Review was delegated under the Quality Assurance skill. The reviewer did not implement or remediate T17 and performed no live mutations. Engineering owns delivery; Farai owns reserved production and foundation approval decisions.

## 5. Criteria

Approved tracker T17 scope and owner choices recorded in [recurring-bookings.md](recurring-bookings.md), together with repository `AGENTS.md` requirements for access, tenant isolation and truthful verification. Created visits must remain unchanged by schedule edits; all supported cadence forms must work without duplicate generation.

## 6. Method

Independent source and trigger review; complete local regression and syntax execution; GitHub source/CI verification; additional isolated direct-insert probes; read-only staging data, schema, privileges and audit inspection.

## 7. Evidence integrity

GitHub confirmed PR54 merged to the stated SHA. All 10 inspected local implementation, test, script and package blob hashes matched that exact merge. Final-head CI job `118194183093` logs independently confirmed 114 passed, zero failed and zero skipped, including independent PostgreSQL connection contention. Local suite: 113 passed, one explicit concurrency skip; syntax checks passed.

## 8. Traceability

Cadence boundaries, monthly/leap-year handling, snapshot preservation, retries, stale writes, access denial, cancellation and atomic rollback map to executed tests. Both-business [browser acceptance](t17-acceptance-2026-10-19.md) maps to persistent records and ordered audit events.

## 9. Assurance dimensions

| Mandatory dimension | Result and basis |
|---|---|
| Functional behaviour | Satisfied by cadence, lifecycle, UI and direct-insert checks. |
| Agreed history | Satisfied by frozen agreement/source equality, seven original rows and generated-row audit digests. |
| Duplicate/concurrency protection | Satisfied by unique occurrence identity, row locking and independent-connection CI. |
| Tenant/role controls | Satisfied by scoped RLS, explicit active membership and denied-role tests. |
| Audit | Satisfied by actor, reason, version and old/new records. |
| Bounded staging compatibility | Satisfied; existing one-off/update validators and reservation/audit triggers remain installed. |

Public RPCs are invoker functions. Private privileged functions use empty search paths and explicit membership checks; anonymous execution is denied.

## 10. Findings

No unresolved implementation finding. Independent isolated direct-insert checks confirmed forged price, status, team, contact and duration are replaced by the saved agreement. Duplicate, foreign, stale, beyond-horizon and processed-date inserts fail; price/identity changes fail; cancelled occurrences are not regenerated.

## 11. Residual exposure and limitations

Browser interaction evidence was supplied by the delivery agent; the reviewer did not replay the UI. Read-only staging audit independently corroborated substantive writes and history preservation. No runtime SHA endpoint exists; owner pull/restart confirmation and observed behaviour do not independently measure the running process SHA. Real non-owner HTTP sessions were not exercised; database role tests and mocked HTTP enforcement cover those paths. Existing security-advisor INFO entries and the leaked-password warning remain separate baseline matters.

## 12. Conditions and actions

No technical condition blocks bounded closure. Record this QA opinion and final acceptance evidence before changing tracker status. Retain cancelled acceptance fixtures and audit history.

## 13. Recommendation

Close T17 as delivered for staging. Preserve separate production, hosting, restricted-link and full-recovery gates.

## 14. Outcome and validity

**PASS**, limited to the identified implementation, staging configuration and evidence cut-off. Reassess after code, schema or access changes; changed recurrence requirements; migration to another environment; or a recurrence defect. This opinion does not establish sustained production effectiveness.

## 15. Decision and handover

Root may record T17 delivery closure under the existing task instruction. Farai's production and foundation decisions remain separate. This is an assurance recommendation, not organisational approval.

## 16. Evidence index

- PR54 and exact merged source SHA above; final head `ba86e45fc74864c70ceab7320028b582cdf8af47`.
- Final-head CI job `118194183093`: 114/114 passed, including real independent PostgreSQL connections. Independent local run: 113/114 plus syntax checks; the one concurrency skip is explicit.
- Independent isolated direct-insert probe results recorded in section 10.
- [Acceptance report](t17-acceptance-2026-10-19.md), recurring tests, `scripts/verify-recurring-staging.sql` and read-only staging schema/data/audit queries.

These confirmed seven original bookings retain digest `86e064e552ce7cb1e10664eba5f2bd44`; zero duplicate occurrences or source updates; both schedules and all three generated visits cancelled; zero recurring reservations; and two INSERT/eight UPDATE schedule audit events with active-owner actors. Both schedules' frozen agreements equal their original source bookings.

The generated rows' INSERT digests exactly matched their pre-cancellation UPDATE old-record digests across intervening schedule changes: Shalean `0316c234774d06729f09c1632c393030`; Bokkie `cf8494d2b809fbbc8e0fd60a8c410ddb`.
