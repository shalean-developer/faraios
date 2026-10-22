# T04 staging review — 22 October 2026

Scope: FaraiOS only. Tracker read on 22 October; local reviewed source HEAD
62ff426. The browser app's deployed SHA was not independently established in
this review; browser observations below describe the running staging application.
No production site was accessed during this review. No saved rule, booking,
agreement, invoice, allowance or payment was changed.

## Verification completed

- `npm run check`: passed.
- `npm test`: 282 discovered, 281 passed, zero failed, one skipped. The skipped
  independent-connection concurrency test requires `T16_TEST_DATABASE_URL`.
  Embedded PostgreSQL tests ran as part of the suite; this is not a new hosted
  database or independent-connection acceptance claim.
- FaraiOS browser: all six earnings setups display Ready for preview, version 3.
- Deep saved rule: R300 per cleaner, maximum 480 minutes. Two-cleaner,
  480-minute preview returned R600 (R300 each). A 481-minute preview was rejected.
- Regular saved rule: 70% pool, equal split, half-up rounding, R300 individual
  cap. R380.04 eligible labour, three cleaners and 210 minutes returned R266.03:
  R88.68, R88.68, R88.67. No setup Save action was used.

Prior VAT, workload and allowance acceptance remains separately recorded in
the tracker; this review does not claim to have repeated all of it.

## Requirements and gaps

| Requirement | Current evidence | Remaining work |
|---|---|---|
| Six-service earnings and cents allocation | Saved v3 preview configuration; local suite and browser cases above | Actual agreement capture/acceptance and posting belong to T22 |
| Duration, scope and daily workload | Previously accepted timing controls; 480/481 preview boundary rechecked | Full pay/rest applicability remains a separate review |
| VAT and optional allowance | Previously accepted PR96/97; settings/preview capability | No financial activation inferred |
| Cancellation/rescheduling/refunds | CANCEL01–03 approved design | Implement and accept financial review, dispatch-stage evidence, fee limits, refunds and replay guards; existing operational cancellation alone does not deliver these |
| Linked earnings adjustments | ADJ01 approved design | Implement owner approval, evidence, immutable linked corrections and post-freeze cases in earnings/payout modules |
| Monthly settlement | PAY03 approved design | T22/T23 accrual, funding/eligibility, freeze, approval, statements, clearing evidence and duplicate-settlement prevention |
| Completed-unpaid, paid-incomplete, zero-price, zero-lead | Required by T04 contracts; not delivered by earnings preview | Specify remaining funding/eligibility outcomes and test them with isolated fixtures when their modules exist |
| Cost model | COST11/AFF02 estimated scenarios accepted for planning | Actuals refine estimates after four explicitly authorised completed pilot jobs; receipts do not block software staging tests |
| Worker terms and full pay | HR01/AGR03/SAFE02 evidence gaps | Accepted terms, classification/applicability and full obligations need competent review before activation |
| Bokkie policy | Separate tenant and decisions | Do not inherit Shalean financial policy without approval |

## Next implementation boundary

Reconcile the approved CANCEL01–03, ADJ01 and PAY03 designs into the current
rule contracts, then deliver bounded financial scenario fixtures and workflow
implementation through their task dependencies. Do not mark missing workflows
as tested merely because arithmetic previews pass. Do not require a live Shalean
booking to continue FaraiOS development. Synthetic jobs never count as completed
cost pilots.

Decision: PASS for the bounded checks listed above. T04 remains OPEN; financial
activation is NO-GO until the outstanding implementation and real-world
applicability gates have their own evidence. No production release or payment
was authorised by this review.
