# T30 — end-to-end staging acceptance matrix (initial source audit, 2026-11-03)

Status: **IN PROGRESS — NO ACCEPTANCE CLAIM**. Canonical Build Tracker row 31 verified: Stage 06, End-to-end acceptance; scope "Roles, payments, teams, payouts, mobile and recovery"; evidence "Evidence linked; blocking defects resolved"; dependency T29, recorded Done 03/11/2026. T31 remains Not started.

## Baseline and bounded authority

- Starting source: T29 accepted Draft PR #306 head `57a763484d90b3fe608e1bdce85c3692fde39053`, not a merge or a deployed release. T29 owner acceptance is documented in PR #306 issue discussion; its limits remain binding.
- Foundation CI run 41638665770: four completed successful jobs for **T29 head only**; **not evidence for T30 branch**.
- `AGENTS.md` and `docs/blueprint.md`: enforce verified server-side membership, database RLS, specific record scope and negative tests; never assume platform access equals tenant access.
- This initial audit records existing source/evidence candidates. **No T30 execution, native database PASS, new hosted verification, physical mobile check, payment, transfer, recovery restore or deployment is asserted here.**
- Preserve original Shalean and Bokkie systems as independent authoritative writers, T28/T29 transition exceptions, historical and future obligations, and existing T19 TEST scheduler. Do not import historical data or initiate cutover.

## Requirement-by-requirement evidence matrix

| Area | Existing implementation / reusable checks | Mandatory T30 qualification (not yet passed) |
| --- | --- | --- |
| Roles / tenant separation | `src/access.js`, `src/auth-session.js`, `test/access.test.js`, `test/identity.test.js`, `test/staging-access-verifier.test.js`; T29 hosted Bokkie-only → Shalean HTTP 403 and bounded read-only RLS denials | Native PostgreSQL actual authenticated roles/membership revocation, cross-business record/finance denial both directions, manager owner-only denial, customer own-only and shared-staff assignment restrictions; separately verify hosted sessions |
| Payments / invoices | `src/t20-payment-*.js`, `src/t21-eft.js`; `test/t20-*.test.js`, `test/t21-*.test.js`, `scripts/run-t20-payments-postgres.mjs`, `scripts/run-t21-payments-postgres.mjs` | Each business independently: synthetic provider/test-only checkout, double webhook/replay, pending vs confirmed states, EFT linkage and invoice status; reject cross-tenant forged provider/account input; zero real provider requests/refunds/messages |
| Teams / job lifecycle | `src/staff-teams.js`, `test/staff-teams.test.js`, `docs/staff-and-teams.md`; assignment/availability tests | Each business: own team membership, foreign-team rejection, revoked membership, assignment lifecycle and concurrent capacity; permitted shared-staff time disclosure must not leak private client/finance data |
| Earnings / monthly payouts | `src/monthly-settlements.js`, `docs/t23-monthly-payouts-20261101.md`, `test/t22-*.test.js`, `test/t23-*.test.js`, `scripts/run-t23-payouts-postgres.mjs` | Each business: provenance-to-accrual-to-statement reconciliation, owner approval, frozen snapshot/version, partial and unknown transfer states, double-settlement race and cross-business denial; synthetic only, no bank instruction |
| Mobile web | Existing T24 cleaner, T25 customer and T15 team responsive evidence; `test/t24-*.test.js`, `test/t25-*.test.js` | On deployed **qualified T30 source**, check mobile viewport for owner, manager, cleaner, customer across key business booking, assignments, payment state, earnings/payout and history screens; distinguish emulation from physical handset evidence |
| Recovery / rollback | `docs/t11-recovery-record.md`, `docs/audit-and-recovery.md`, `test/isolated-restore.test.js`, `test/restore-session-recovery.test.js`, `test/deploy-153-source-recovery.test.mjs`; T29 disposable rollback | Prove recoverable application/data/config scope with owner-approved isolated restore only, archive custody, post-restore role isolation, RPO/RTO measurement/limitations, current release rollback instructions and zero effect on legacy systems; do not repeat historical restore into a used destination |

## Initial risk and defect triage

1. **BLOCKER — T30 current-head results absent**: T29 CI is inherited evidence, not an exact-T30-head PASS. Re-run full CI and actual native PostgreSQL security/concurrency suite once source changes are final.
2. **BLOCKER — hosted bidirectional access and complete role coverage unverified**: Existing Bokkie-only → Shalean 403 is useful but does not close reverse-direction and customer/staff record-level tests.
3. **BLOCKER — hosted complete business-by-business financial and operational journeys unverified for T30**: Existing individual task acceptances do not establish one continuous T30 evidence chain.
4. **BLOCKER — recovery and current release provenance**: Historical T11 and isolated T29 synthetic rollback do not independently prove current full T30 restore/rollback, RPO/RTO or complete hosted no-change fingerprints.
5. **CONTROL LIMITATION — host/private worker**: Existing enabled Plesk T19 TEST invoice scheduler and private activation/egress state are not comprehensively verified; keep tests disconnected and do not invoke provider paths.
6. **EVIDENCE GAP — mobile**: Existing responsive screenshots/emulation are not proof of current deployed T30 phone journey or physical device behavior.

## Next qualification gates

1. Gather specific exact-source test commands and map existing fixtures to each row; add only missing isolated denial/replay tests, with no new business feature or policy.
2. Run disposable Node24 / native PostgreSQL17 tests with outbound access disabled. Record exact SHA, command, job IDs, failures/skips and fixture cleanup, not an inferred result.
3. Verify Shalean and Bokkie independently, including denied cross-business roles and no-outbound/no-write before/after evidence, under approved synthetic setup.
4. Qualify deployment provenance, privacy-controlled hosted staging checks, responsive UI and rollback without any live-side mutation. Record exact limitations.
5. Produce final gate report with evidence URLs, blockers, rollback, retained T29 limitations and explicit owner decision. **No T30 Done / no T31** without owner acceptance.

## Initial source audit references

- [Canonical tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit#gid=1809996177&range=A30:L32)
- [T29 Draft PR and acceptance](https://github.com/shalean-developer/faraios/pull/306)
- [T29 Foundation run](https://github.com/shalean-developer/faraios/actions/runs/41638665770)

This document is a T30 audit and test-plan artifact only, not fabricated acceptance evidence.
