# Independent Stage 3 QA — allocation fix reassessment

## 1. Document control
QA-T04-S3-A6039B, v1, ISSUED 2026-10-22. Independent delegated reviewer `/root/stage3_qa`. Engineering staging assurance. Original `stage3-independent-qa-5bf10f.md` remains unchanged; its historical NO-GO is preserved.

## 2. Executive assurance summary
**QA outcome: NO-GO for completed Stage 3 staging acceptance.** Initial defect F-01 is verified closed for this candidate. No additional source correctness blocker was identified in bounded reassessment. The changed reconciliation form has no current browser acceptance evidence and current candidate CI has not successfully executed. These are remaining verification gates, distinct from the closed implementation defect.

## 3. Scope and assessment context
Remote PR #100 head `a6039b0a86c440389a3d6b6e29d41127d2cd775b`, reviewed through local commit `e8f55ab9ea1a1083260d171592d0fa6b6b5895f6`, exact tree `7d7708c74dbbfb67c556660f795756c2995a9221`. Scope: delta implementing typed per-line clearing allocations, migration `20261022141509_t04_per_line_settlement_allocations.sql`, summary and reconciliation form. Initial assessment remains source for unchanged controls. Excludes real financial execution, entitlement/legal applicability, worker agreements, production, receipts and pilots.

## 4. Governance, authority and independence
Existing user-authorised independent QA delegation covers this reassessment. Reviewer did not author fixes or modify source, apply migrations, change hosted records, commit or publish. Final acceptance remains the authorised owner's decision. Engineering owns remediation and supporting evidence. No specialist financial or legal conclusion is provided.

## 5. Authoritative sources and obligations
Tracker `01-FaraiOS-Build-Plan-and-Progress-Tracker.xlsx`, `T04 Decisions` PAY03 row61 and ADJ01 row60; QA skill; repository AGENTS.md; approved synthetic Stage 3 scope. Clearing attribution must preserve the paid portion of each source, keep undisputed amounts payable, avoid duplicate repayment after resolution, and retain uncertainty/retry safeguards. Approved reductions remain linked to Stage 2 safeguards.

## 6. Methodology and criteria
Inspected exact candidate diff, assembled SQL writer, new additive migration, UI/parser and regression. Independently ran migrated PGlite fixture through six registered database tests, including the original two-line regression, and a separate signed-offset adverse sequence. Reviewed amount bounds, cumulative allocation monotonicity, exact sum/full-clearing rules, zero-net behavior and legacy fail-closed checks. Repeated broad suite was unnecessary; delivery's completed current full run is separately attributed below.

## 7. Evidence and source assessment
Independent run `/tmp/stage3-signed-repro.log`: six DB tests passed, zero failed or skipped, plus signed scenario executed. Fixture applies all three migrations and checks final writer equivalence. Delivery full suite `/tmp/stage3-fix-tests-final.log`: 328 discovered,327 passed,zero failed,one native skip; reviewer read final result. Parent reports syntax check passed and hosted 16 rollback checks with unchanged 18 baseline fingerprints. Those hosted checks were not independently re-queried. Original browser screenshots predate allocation form changes and cannot certify the new inputs. Current GitHub Actions run39794334515 has jobs119877791715,119877791838 and119877792151 queued; none has executed. Its cause cannot yet be attributed to billing. Prior run39792597472 was blocked before execution with a billing/spending annotation. Earlier green CI does not certify this writer.

## 8. Traceability and coverage
| Criterion | Evidence | Reassessment result |
|---|---|---|
| Original F-01: A/B line attribution through partial clearing/dispute | Executed fixed regression; line-specific SQL and summary calculation | PASS; F-01 verified closed |
| Resolution restores only unpaid A remainder | Executed regression: next requests R100 for B then R50 for A | PASS |
| Invalid line, excessive/wrong-sum allocation denied | Executed new regression; typed SQL | PASS within tested cases |
| Signed offsets preserve submitted bounds and applied amounts | Independent lawful -R100 correction sequence; source inspection | PASS within bounded scenario |
| Zero net never invents cash clearing | Source requires submit amount >0 and exact outstanding; no synthetic transfer on zero net | PASS as safe review-only boundary |
| Native concurrent SQL behavior on changed writer | Current local native skip; earlier CI predates fix | NOT independently verified for candidate |
| Changed reconciliation form end-to-end desktop/mobile | Original screenshots predate fix | NOT ASSESSED |
| Exact-candidate successful CI | Run39794334515: all three jobs queued, none executed; cause unconfirmed. Prior run39792597472 had billing/spending restriction | NOT SATISFIED |

## 9. Assurance dimensions
Bounded source/data arithmetic reassessment: favourable. Original allocation non-conformance: closed on this exact candidate. Browser acceptance currency and native CI evidence: incomplete. Synthetic containment remains supported by unchanged controls and source. No dimensions were averaged into overall acceptance.

## 10. Findings, causes and impact
F-01 closure: submissions capture signed `remainingLines`; reconciliation stores explicit cumulative allocations, validates known line IDs, integer cents, direction/bounds, monotonicity, sum equal to cleared amount, and complete snapshot allocation for full clearing. Future eligible balances subtract only their own allocations. The executed positive-line sequence now rejects incorrect R50 for unpaid B, accepts B R100, then leaves A R50 after resolution.

Independent signed scenario: two +R100 reimbursements and one Stage 2 approved/frozen lawful -R100 correction. Submit net R100; record R50 partial clearing with allocations +R100,+R50,-R100 and verified failed remainder. Subsequently dispute the already-applied reduction and renew approval: only the unpaid R50 positive remainder is available. Previously applied signed settlement is preserved; dispute does not automatically refund an already-applied reduction or replay cleared positive lines. Any reversal of settled reduction requires approved correction/review. No claim is made that the evidence establishes an actual lawful deduction.

At zero net, owner can review/freeze/approve but cannot submit a zero/negative cash attempt or mark source lines cleared without a transfer. This is safe containment, not a real ledger offset implementation or a fully-paid certification.

## 11. Risks, exceptions and residual exposure
Remaining risk is unverified changed-form browser execution and current native concurrency, not an observed new failure. No waiver/override granted. Legacy transfer records without explicit allocations reject further financial-state actions for manual review rather than inventing allocation history. No legacy hosted transfer population was present according to delivery cleanup evidence.

## 12. Corrective actions and commitments
Engineering/delivery: verify the changed reconciliation form in the actual staging app at desktop and375px, including typed allocation entry, validation feedback, saved per-line amounts and resulting summary. Obtain successful exact-candidate CI including native concurrency; monitor queued run39794334515 without assuming its delay has the same cause as the prior billing/spending block. Any required account intervention belongs to the authorised account owner. Do not infer success from the previous implementation run. Independent QA should inspect this new evidence and issue a follow-on gate opinion. The parent has corrected the main validation map to distinguish previous implementation evidence, current candidate gates and independent QA status.

## 13. Options and recommendation
Keep Stage 3 acceptance pending. Complete remaining current evidence without activating any financial workflows. F-01 does not require further source changes based on this bounded review. No recommendation to change billing settings or waive CI is made.

## 14. QA outcome and gate recommendation
**NO-GO — completed Stage 3 synthetic staging acceptance**, evidence cut-off2026-10-22, exact candidate above. Basis: initial correctness finding closed; remaining mandatory current acceptance evidence incomplete. This opinion does not mean the fix failed. Valid only for reviewed tree and scope. Reassess on browser/native CI evidence or source change. Authorised owner makes final organisational decision separately.

## 15. Governance decision and handover
Owner acceptance pending; no financial activation approved. Preserve original NO-GO and this reassessment as separate records. T04 remains **In progress**, pilots **0/4**, allowances **Off**, financial workflows **inactive**. Actual receipts and worker-pay applicability remain activation checks and do not block synthetic implementation/testing.

## 16. Evidence index and reproducibility
Initial report: `docs/evidence/stage3-independent-qa-5bf10f.md`. New reviewer script `/tmp/stage3-signed-repro.mjs`, log `/tmp/stage3-signed-repro.log`; script imports actual `monthlyDatabase` exported fixture and executes public RPC with signed allocations. Executed regression resides in `test/monthly-settlements-db.test.js`, case `PAY03 partial clearing stays allocated to its line through dispute and resolution`. Delivery full suite log `/tmp/stage3-fix-tests-final.log`. Changes reviewed in draft writer, additive migration, `src/monthly-settlements.js`, DB/HTTP regressions. No reviewer source edits, hosted changes, commits or publishing.
