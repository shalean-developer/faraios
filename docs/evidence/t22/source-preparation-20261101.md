# T22 source preparation — 1 November 2026

Status: IN PROGRESS. Initial source increment only; not complete integrated T22 and not staging acceptance.

## Verified authority and deployment

Canonical tracker inspected directly: Build Tracker A23:L23. Deliverable Earnings and adjustments; scope Defined configurable earnings rules; explained adjustments; acceptance Team earnings and zero-lead cases tested; dependencies T17 and T21, both Done. T21 completion date 01/11/2026 and acceptance link confirmed. Detailed L23 clarification explicitly includes integrated accrual, accepted terms and full-pay gates. T23 remains Not started.

AGENTS.md and docs/blueprint.md read. Clean checkout of origin/staging at 77455dd29af15a4c063b5e558a7bf9aeb74a3d2c; local branch t22/earnings-adjustments. Open-PR inventory inspected; no open T22 PR found. Existing unrelated PRs preserved.

GET staging.faraios.com/environment-health verified staging, LiteSpeed managed TLS edge, project xdmfyrsauvqznkloroxg, source fingerprint 86239729f9118893b426a55ce6a6c93c1c03021a802d7a0861f45bcc67d6de3e, TEST-only app payment dispatch, notifications disabled, accountingWorker disabled. This matches the T21 source evidence at 5fa7da6736d96da97cbd92fe27c9df2fc6376987. That evidence records _test_payments.cjs on Plesk 104.238.222.122. Current Plesk startup configuration and private-file permissions have NOT been independently inspected in this session; recheck before deployment. No hosting or connectivity change made.

## Reuse and approved policy

T04 Decisions and current operational baseline inspected. E01–07, CALC01, CAP01, FEE01 and ADJ01 define percentages, caps, deterministic cents, duration and correction controls. BK01 prospectively adopts the earnings/adjustment design for Bokkie; it does not copy Shalean catalogue/timing/VAT/allowance configuration. Read each business's saved rules; never use Shalean's template as Bokkie's saved rule. Do not treat historical pending wording as overriding later approval.

Reuse src/earnings.js, existing business_earnings_rules, adjustment sources/events and their RLS/RPC, recurring frozen snapshots and accepted T21 conflict guard. Existing protected agreements cannot be replaced by new previews. Previews, agreement evidence, accrued obligations, approved corrections, customer receipts and payouts remain separate.

## Prepared increment

- Existing adjustment workspace reads/reconstructs each visible source journal and shows original and approved corrected amounts per worker/booking, with reimbursements and disputes separate. Zero lead does not suppress another worker's amount.
- Existing detailed history now explains saved evidence and decisions; text remains escaped.
- Isolated src/earnings-accrual.js prepares immutable agreement/accrual events. New-agreement calculations reuse the existing engine and require matching booking duration/team. Existing and recurring agreements preserve explicitly verified original worker amounts/version. Completion plus independent entitlement evidence is required; customer payment does not create accrual. Exact retry is a no-op; changed key content, changed team, foreign business, non-owner, missing evidence and duplicate accrual are denied.
- The accrual core is NOT mounted and NOT authoritative persistence. Its caller must obtain trusted current membership, booking, service and saved rule; atomically persist expected-version changes; enforce database ACL/RLS and reconstruct/validate persisted history. There is no claim that a caller-supplied object proves membership or saved-rule authenticity.

## Requirement to evidence map

| Requirement | Current evidence | Remaining |
| --- | --- | --- |
| Configurable business rules, rounding, team caps | Existing earnings engine/rule database tests pass | Fresh hosted readback and browser previews for both businesses |
| Explained adjustments and preserved original | Existing core, HTTP and real PGlite SQL plus new displayed payload history | Deployed browser/API verification |
| Team and zero-lead isolation | New SQL-backed journal reconstruction: lead R0/disputed, other R300 plus R50 reimbursement remains independent | Hosted synthetic journey |
| Permission/business denial | Existing real PGlite role/RLS and local HTTP tests; new core rejects non-owner/foreign scope | Hosted API/database denials for accrual adapter |
| Retry and immutable history | Existing SQL retries; new SQL check verifies three events after repeated approval; isolated accrual retry/conflict tests | Durable accrual storage/API and concurrency tests |
| Integrated accrual | Isolated agreement/accrual core prepared | Database persistence, authenticated API/UI integration and adjustment source linkage; not implemented |
| T21 fixtures/conflict guard | Source unchanged; T21 regression passed except native concurrency skip | Before/after hosted read-only fixture baseline |

## Verification

Node v24.22.1, npm ci --ignore-scripts succeeded. Initial focused suite 24/24 passed; team review increment 26/26 passed. Final focused suite including accrual: see final run recorded below. Broader earnings/adjustment/accrual/T17/T21 run: 42 tests, 41 PASS, 1 native T21 concurrency SKIP, zero failures. Native concurrent PostgreSQL evidence was not produced in this environment. npm run check and git diff --check passed before the final small duration/label refinement; final checks recorded below. No hosted T22, physical phone, provider or production PASS claimed.

## Remaining source work and deployment boundary

Finish durable agreement/accrual integration and link approved accrual sources into the existing adjustment journal without relabelling historical synthetic reviews as real obligations. Use immutable booking/worker agreement identifiers, stable source IDs and database uniqueness/version locks; accrue only a verified completed source, independently of customer payment. Deny caller-provided identity and direct table mutation. Preserve historical accepted agreements and T21 fixtures. Prepare rollback that disables new writes/UI but retains financial history. Do not implement T23 approval/transfer/clearing.

Actual worker terms, applicability and full-pay prerequisites remain unverified for real activation. These do not block isolated synthetic source preparation. Publication/deployment/shared writes require the owner's next explicit approval under this session's authorisation. T22 remains In progress until hosted evidence and explicit owner staging acceptance. No independent reviewer is required.

## Operating instructions for the prepared review increment

Open Earnings rules in the selected business for new-agreement previews. Open Earnings adjustments to inspect original amounts, approved corrections, pending proposals and disputes independently per worker. Follow Explanation and history for evidence and actors. Managers prepare; owners approve financial corrections. Negative corrections still require lawful-basis, applicable agreement and fair-process evidence. Displayed review examples are not accrued pay, settlement balances or payout instructions.

Rollback: revert application source to the verified staging base; preserve existing adjustment tables/events and all T21 history. This increment includes no migration or shared data mutation. No actual earnings, payments or payouts were posted.

Final verification after duration/label refinements: 29/29 focused tests PASS, zero failures/skips. node --check src/earnings-accrual.js, npm run check and git diff --check PASS. Canonical Build Tracker G23/H23 updated to Codex / In progress; L23 preserves historical clarification and records this limited increment, test limits, operating instructions and remaining integration/acceptance work.

## Subsequent authorised source preparation

The owner instructed “proceed”. The durable agreement/accrual database, authenticated Earnings workspace and atomic adjustment-source linkage are now prepared. The initial unmounted JavaScript accrual prototype was replaced by this integrated source candidate; it is not an alternate authority. The current reviewable implementation and remaining gates are in ../../t22-earnings-20261101.md. Earlier statements about missing source integration above are historical; hosted execution and owner acceptance remain pending.
