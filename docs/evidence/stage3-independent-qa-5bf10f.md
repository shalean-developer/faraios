# Independent Stage 3 QA — initial assessment

## 1. Document control
QA-T04-S3-5bf10f, version 1, ISSUED 2026-10-22. Independent reviewer: delegated `/root/stage3_qa`; delivery owner: FaraiOS implementation agent. Restricted engineering/staging assurance. Repository: shalean-developer/faraios, PR #100. This report records the original opinion and must remain preserved after remediation.

## 2. Executive assurance summary
**QA outcome: NO-GO.** Do not represent Stage 3 as accepted. A reproduced settlement-allocation defect can deduct money cleared against a subsequently disputed line from another, unpaid undisputed line. Latest-head CI also has not executed successfully. Synthetic containment and access safeguards are supported by source/tests; they do not compensate for settlement arithmetic failure. No actual money moved during this assessment.

## 3. Scope and assessment context
Subject: remote head `5bf10fa7cde800c3378547515f175e808a471078`, independently inspected through local HEAD `617d323deb86fcd55f47a5093b4100205c121341`; both have tree `bcf9be5f8efbfe8f1e782718dbb6ef69ffecacbb`. Implementation originated at `acce96907637a3e5de9489bf6979fc7a6f9a2117`; subsequent changes are evidence-only. Base: `a0c461b238d490eb386552cf1ce1974a0508293f`. Intended gate: acceptance of synthetic monthly settlement controls, not financial activation. Reviewed SQL migrations/draft, application and HTTP controls, test suite and delivery evidence. Excluded real entitlement imports, agreement applicability/classification, legal/HR/Finance decisions, real payouts, production deployment and pilot cost validation. Hosted data cleanup was not independently re-queried by this reviewer.

## 4. Governance, authority and independence
User explicitly authorised independent QA delegation. Reviewer did not author implementation, change source, perform remediation, or publish/commit. Owner retains acceptance and risk decisions. Findings were escalated immediately to delivery owner. QA skill and repository AGENTS.md govern this review. Actual worker obligations and activation remain reserved to applicable owners/specialists.

## 5. Authoritative sources and applicable obligations
Approved tracker: `upload/01-FaraiOS-Build-Plan-and-Progress-Tracker.xlsx`, sheet `T04 Decisions`, row 61 PAY03 and row 60 ADJ01, independently read with openpyxl. PAY03 requires reliable clearing/allocation, distinct partial/unknown/failed states, payment of undisputed amounts while disputes remain under review, renewed approval following change, and original-period preservation. ADJ01 requires approved linked correction deltas and protection against duplicate settlement. Implementation scope is `docs/monthly-settlements-stage3.md`. No law or individual entitlement was inferred from policy text.

## 6. Methodology and assessment criteria
Risk-based independent source inspection and executable local verification against approved decisions. Ran `npm run check` and `npm test`, then independently exercised a cross-state adverse sequence using the actual migrated database fixture and public RPC. Checked boundaries for role/tenant/worker visibility, typed payloads, version/replay, linked adjustments, customer pools, calendar deadlines, approval and uncertain retries through source and executed tests. The new allocation sequence was absent from delivery regression coverage. No broad additional testing after finding the blocker.

## 7. Evidence and source assessment
Independent local suite: **327 tests discovered, 326 passed, zero failed, one skipped** (native PostgreSQL unavailable locally). Syntax checks passed. PGlite fixture executes both actual Stage 3 migrations and verifies function equivalence with final draft. Independent adverse test succeeded in reproducing the incorrect R50 second request. Delivery evidence: `stage3-staging-20261022.json`, `stage3-browser-20261022.json` and screenshots; mobile submitted screenshot independently inspected. Browser delivery records explicitly disclose final mobile click by user after automation timeout. No claim of independent live browser execution is made.

Implementation-head CI run 39772984923 is delivery/parent-reported passing, including native concurrency with zero skips. Latest evidence-head CI run 39792597472 did not start execution: parent independently inspected GitHub annotation stating recent account payments failed OR spending limit needs increase. Which alternative applies is unknown. This is a distinct external CI gate limitation, not an established source defect. Do not change billing or infer latest-head CI success.

## 8. Traceability and coverage assessment
| Approved criterion | Assessed evidence | Result |
|---|---|---|
| Closed Johannesburg month; fifth day/preceding banking day; earlier obligation | SQL create path; executed PAY03 tests | PASS within synthetic declared calendar |
| Owner freeze/approval and fresh role/tenant/own worker control | SQL, HTTP source; executed DB/HTTP suite | PASS within assessed scope |
| Dispute invalidation and renewed review | Executed dispute/refreeze tests | PASS for pre-payment paths |
| Undisputed amounts remain payable after clearing/dispute changes | Independent two-line partial-clearing sequence | FAIL, F-01 |
| Conditional customer pool separated from company-funded work | SQL collect_pool and executed tests | PASS within synthetic inputs |
| Linked correction only; original period; Stage 2 duplicate guard | SQL claims/trigger and executed tests | PASS within synthetic inputs |
| Typed, versioned, replay-safe inputs | SQL/HTTP and executed tests | PASS within tested paths |
| Native concurrency | Implementation CI evidence only; locally skipped | NOT independently reproduced |
| Unknown/failed/partial/cleared distinctions and retry blocking | Executed tests | PASS except allocation-change combination F-01 |
| Financial execution remains disabled | SQL immutable synthetic marker and application paths | PASS within assessed implementation |
| Hosted cleanup/original 18-group hashes | Delivery evidence only | NOT independently re-queried |
| Latest-head CI completion | Current run blocked before execution | NOT SATISFIED |

## 9. Independent assurance dimensions
Functional settlement correctness: FAIL. Access-control and synthetic containment: supported within assessed implementation. Traceability: approved sources and exact tree established. Test sufficiency: gap confirmed for dispute after partial allocation. Native runtime/latest CI currency: limited as disclosed. Financial activation, real worker pay/legal applicability and pilots: NOT ASSESSED and outside this gate. Dimensions were not averaged.

## 10. Findings, causes and impact
**F-01 — High / mandatory acceptance blocker.** Criterion: PAY03 clearing allocation and undisputed payment continuity.

Verified sequence using September 2026 synthetic review for one worker:
1. Add reimbursement A = R100 and B = R100; freeze and approve R200.
2. Submit R200; reconcile R50 cleared, remainder failed, allocation evidence explicitly states R50 belongs exclusively to A.
3. Worker disputes A; owner refreezes/reapproves the remaining undisputed B = R100.
4. Public RPC accepts a new **R50** request. B has received no allocation and requires **R100**. The previously cleared R50 belongs to A.

Cause demonstrated in source: `database/monthly-settlements-draft.sql` calculates total from eligible undisputed lines, then subtracts all transfer `clearedCents` (lines 169, 173–185). Reconciliation retains `allocationEvidence` only as free text; it cannot preserve typed line attribution through eligibility changes. `src/monthly-settlements.js` summary lines 7–8 repeats aggregate subtraction. Potential impact is an understated undisputed balance and false payment progression. This is demonstrated synthetic behavior, not a claim that real workers were underpaid. Owner: Engineering. Required action: preserve and validate line-level allocations/remaining obligations through dispute, resolution and pending-pool changes, with regression evidence. An alternative bounded control must demonstrably keep undisputed amounts payable without reallocating prior clearings.

## 11. Risks, exceptions, overrides and residual exposure
No exception or override requested or granted. Synthetic-only execution contains direct financial exposure but does not make incorrect arithmetic acceptable. Current test success cannot close F-01. Billing restriction is independently recorded, with no cause inferred beyond GitHub's alternative wording.

## 12. Corrective actions and commitments
Engineering must remediate F-01 before acceptance; provide regression tests for partial clearing attributed to one line, subsequent dispute, remaining undisputed line paid in full, subsequent resolution without duplicate repayment, and uncertainty/retry integrity. Independent QA must review the exact new candidate and rerun meaningful cases. Latest exact-head CI must execute successfully when account access is restored, or owner must explicitly record the outstanding gate; this report does not authorise a waiver. No source fixes were made by this reviewer.

## 13. Options and independent recommendation
Keep Stage 3 in implementation/remediation and return a new exact candidate for independent reassessment. Continue reversible synthetic development as authorised. Do not declare Stage 3 accepted or activate financial workflows.

## 14. QA outcome and gate recommendation
**NO-GO — initial Stage 3 synthetic staging acceptance.** Evidence cut-off: 2026-10-22, initial candidate tree above. Basis: verified F-01 mandatory correctness failure, plus current CI execution limitation. Valid only for the identified candidate and scope. Reassess upon source change, new evidence or gate change. Final acceptance belongs to the authorised owner; QA does not grant organisational approval.

## 15. Governance decision and implementation handover
Owner decision pending. Finding and reproduction sent to parent implementation owner. Preserve this original NO-GO if a later opinion supersedes it. T04 stays **In progress**, completed pilots **0/4**, allowances **Off**, financial workflows **inactive**. Real receipts and worker-pay applicability remain activation requirements, not blockers to synthetic remediation.

## 16. Appendices and evidence index
Independent command logs: `/tmp/stage3-independent-check.log`, `/tmp/stage3-independent-tests.log`. Adverse sequence used exported `monthlyDatabase` in `test/monthly-settlements-db.test.js`; all amounts above are integer cents in RPC (10000, 20000, 5000), unique event IDs 300–310, existing fixture owner/manager/worker IDs 1/2/3. Reproduction script saved at `/tmp/stage3-independent-allocation-repro.mjs`. All fixtures were local ephemeral PGlite instances, closed after use. No hosted records or production data were changed. Report is a new evidence file; no source edits, commits or publishing performed.
