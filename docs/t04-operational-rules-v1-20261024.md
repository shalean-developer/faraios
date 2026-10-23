# T04 Operational Rules v1 — 24 October 2026

Status: owner-approved definitions and worked examples; final acceptance review pending. This is T04 only.

Canonical authority: [FaraiOS Build Plan and Progress Tracker](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit), Build Tracker row 5: **Define operational rules — booking lifecycle, pricing, earnings and payout options; supported options specified with examples; depends on T03**. The owner's subsequent decisions are in T04 Decisions. A stale pending paragraph does not undo a later approval; code alone does not establish acceptance.

## Version and business boundaries

Owner Farai approved this baseline for final review on 24 October 2026. Maintain separate records: **Shalean T04-v1-20261024** and **Bokkie T04-v1-20261024**. BK01 adopts the already-approved Shalean earnings, cancellation and monthly-payment design for Bokkie prospectively, including the approved calculation and adjustment controls. Bokkie retains its own customer prices, catalogue and financial records. This does not copy Shalean's VAT status, pilot prices/cost estimates, workforce classification or allowance amounts.

Existing accepted and recurring agreements, recorded original prices/pay and stronger independently applicable rights remain protected. New definitions apply to new agreements only after the separately required acceptance/applicability/activation gates. **No activation date is selected.** Neither policy version enables payments, accrual, refunds, real adjustments, earnings or payouts.

## Booking lifecycle, timing and recurrence

Carry forward the accepted booking rules in [one-off bookings](one-off-bookings.md), [cleaning booking requirements](cleaning-booking-requirements.md), [cleaning profiles](cleaning-profiles.md) and [recurrence](recurring-bookings.md). Normal operational states are draft, confirmed, assigned, en route, arrived, in progress and completed; cancellation is explicit. Booking, invoice, customer-payment and worker-settlement states are separate. Reviewed cancellation/rescheduling controls preserve original-slot/request evidence, reasons and saved agreements; a booking cancellation does not itself execute a fee, refund or worker payment. Customer access confirmation and accepted/travelling/arrived/started timestamps belong to the approved dispatch design; no fixed no-access timer is approved.

Shalean's approved minimum **total** booking durations: Regular/Airbnb 210 minutes; Deep/Moving 300; assessed Office 210; assessed Carpet 120. Approved item mappings use 30-minute blocks; apply the total floor after scope/extras. Preserve the approved eight-hour daily aggregate across jobs, required travel and setup, explicit reviewed inputs, assessment requirements and protected historical snapshots (DUR01–02/TIME01–03). A booking-duration rule is not a worker minimum-pay or rest-law determination. BK01 does not independently copy these Shalean-specific catalogue timings into Bokkie; Bokkie's own existing catalogue/timing configuration remains unchanged. The reusable timing option and examples are specified; no new Bokkie timing activation is claimed.

T17 weekly, fortnightly and monthly schedules, multiple weekdays, shorter-month choice and future-only edits remain as accepted. Created visits keep their frozen agreement; a changed agreement requires a new schedule. Individual occurrence identity and retries must not recreate cancelled/rescheduled visits. X02 now explicitly selects **no additional recurring discounts or subscription billing initially** for either business. An already-agreed R500 recurring visit remains R500; existing agreed discounts remain in its frozen agreement.

## Pricing and earnings

Retain each business's approved service/room/unit/extra catalogue and saved price/scope snapshots. X01 defers additional hourly/fractional-hour pricing and new commercial exceptions initially. The historical 1.5h × R200 illustration does not approve that runtime option. Existing R500 agreement stays R500. Existing approved fee/VAT controls remain; no new tariff, tax status, discount authority or manual exception is selected.

Approved earnings design (E01–07, SVC01–06, PAY01, CALC01, CAP01, FEE01; Bokkie adoption BK01):

- Regular/Airbnb: one 70% eligible-labour pool, equal shares, R300 commercial cap per cleaner per booking after allocation; no redistribution of capped excess.
- Deep/Moving/Office/Carpet: R300 fixed per cleaner per agreed booking; Office/Carpet scope assessed. Earlier completion of agreed scope does not reduce the agreed fixed amount.
- Eligible labour includes approved service/room labour and labour extras/linen after labour discounts; excludes service fee, equipment, delivery/transport and applicable tax.
- Round the pool half-up to integer cents, then allocate residual cents in ascending stable cleaner-ID order. Never create a separate 70% pool for each cleaner.
- Covered visit maximum is 480 minutes; retain separate daily workload checks. Changed scope/team/pay needs prior agreement.
- Service fee is shown and charged once per booking/visit, outside percentage earnings; waiving only that fee does not reduce unchanged agreed cleaner earnings. No fee amount is selected by these examples.
- These commercial formulas/caps cannot extinguish stronger accepted or mandatory worker obligations. Actual full-pay applicability remains a separate gate.

| Worked example | Expected output |
| --- | --- |
| Eligible labour R500.01; 70%; two cleaners | Pool R350.01; stable-ID shares R175.01 / R175.00 |
| Eligible labour R500.05; two cleaners | Pool R350.04; R175.02 each |
| Eligible labour R1,000; two cleaners | Pool R700; cap produces R300 each; no excess redistribution |
| Fixed service; two cleaners | R600 commercial total, R300 each |
| One cleaner's reviewed amount R0; another's valid undisputed amount R300 | The second R300 is not blocked or reassigned; no deduction authority inferred |
| Customer price R0; independently verified agreed worker obligation R300 | Business funds R300; customer price does not turn it into R0 |
| Customer price later discounted from R500 to R200 after an independently agreed R300 worker amount | No automatic reduction of that agreed R300; prospective percentage agreements still use their approved eligible basis |

P03 explicitly approves business funding of independently verified obligations for free/discounted work and truthful partial/outstanding balances. It selects no loan, bank instruction or funding source. Uncollected optional customer-cancellation pools stay conditional; P03 does not create a routine top-up of those pools.

## Cancellation, rescheduling and refunds

CANCEL01–03 are approved designs for new individual visits; BK01 adopts them for Bokkie. Existing/recurring and stronger rights remain protected. Exactly 24 hours' notice is early. Preserve request/start timestamps in Africa/Johannesburg.

Early customer cancellation: R0 cancellation fee; refund unperformed services including service fee/unused extras. Early reschedule: no rescheduling fee, agreed available date and existing payment credit; scope/price changes agreed upfront. Late reschedule uses the reviewed released-original-slot cancellation assessment once, with no stacked rescheduling charge; replacement work reduces/waives mitigated loss. Display charge, credit and new balance before confirmation.

Late customer charge is manually reviewed and no more than the minimum of **50% of eligible booked labour after labour discounts, R300 total per booking, supported reasonable cancellation loss after mitigation**, subject to overriding customer rights. No automatic debit, stacked penalties or automatically non-refundable service fee.

Cleaner additional customer-cancellation allowance is the lawfully collected/retained compensation pool after any required tax, proportionate to recorded agreed earnings. No company commission or processing fee is deducted from shares. Four equal cleaners: R300 pool → R75 each; R200 → R50 each; R0 → R0 additional pool allowance. Independently owed actual work, approved expenses and other protected rights remain separately assessed. Customer-caused cancellation after departure extends this optional pool; it does not create the separate business-caused guarantee.

Business-caused cancellation: customer cancellation charge R0; refund unperformed services. Before travel and at least 24h: no additional allowance, but approved unavoidable expenses reimbursed. Less than 24h before travel: 50% of agreed worker earnings. Travelling: 50% plus approved unrecoverable transport. On site/work started: 100% of agreed visit earnings plus approved expenses not already included. Business funds its own cancellations; tiers are total visit amounts, not stacked bonuses. R300 agreed pay → R150 before arrival or R300 on site; four such workers → R600/R1,200 before separate approved expenses. The customer R300 whole-booking ceiling does not cap this business-funded protection.

Examples: labour R800, supported mitigated loss R250 → reviewed fee at most R250 (not R400 or R300 automatically). If R250 is lawfully available for compensation and four cleaners have equal agreed earnings, R62.50 each. A business-requested date change may be declined; then apply business-caused cancellation protection, not customer-caused treatment. Partial service/quality/work performed receives actual-evidence review, not an automatic full refund or larger penalty.

Refund acknowledgement/review target: one business day; approved refund submission target: within five business days **of request**, not approval. Original route where feasible; no processor-fee deduction. Record amount/reference, track submission separately from actual completion, reserve pending refunds and prevent over-refund/replay. These are business targets, not universal legal/bank-credit deadlines; stronger applicable rights prevail.

DEF01 explicitly defers automatic job-refusal rating penalties and fixed no-access waiting-time rules initially for both businesses. Declining unaccepted work creates no automatic rating penalty; reaching 15 minutes without access creates no automatic fee. Review actual evidence manually under approved cancellation rules. No new scoring, dispatch/suspension consequence or deduction is approved.

## Adjustments and monthly payment options

Managers/authorised preparers submit evidence; owner alone approves financial corrections, refunds and payout amounts/payment details. Preserve original earnings/version; link booking, cleaner, amount, reason, evidence, approver/date and correction history. Allowed designs: verified calculation corrections, approved reimbursements and separately agreed additional work under approved rules. No automatic fines, damage/refund/nonpayment clawbacks. Negative corrections need independently verified lawful basis and applicable agreement/fair process; owner approval alone does not certify lawfulness.

Review disputes separately and pay undisputed obligations on time. Corrections after freeze require recorded change/refreeze/renewed owner approval. Already settled R2,500 plus a missed approved R50 reimbursement → only R50 additional, never R2,550 again.

PAY03: calendar month in Africa/Johannesburg; review during the month and finalise promptly after closure using verified events/terms. Target cleared available funds by the fifth **calendar** day following month-end; preceding reviewed banking day if closed. Earlier applicable deadlines override. Keep event/original period references. Freeze reviewed statements, owner approval before transfer, statement/reference evidence and separately identified visit earnings, business cancellation protection, collected customer pool and reimbursements.

Customer payment alone does not establish worker entitlement or clearing. Completed/unpaid customer case: independently verified R500 obligation is not R0 because customer paid R0. Customer paid/incomplete visit: validate actual event and agreed entitlement; no automatic worker advance or full-paid status. Verified R500 obligation with R300 cleared/allocated means R200 outstanding, not fully paid.

Submitted, unknown, partial, failed and cleared/allocated stay distinct. Reconcile uncertainty before retry; never repay cleared originals. Each source/worker clearing allocation is bounded and preserved through disputes/resolution; zero lead/disputed line must not block other undisputed earnings. Example: R100 A + R100 B, R50 allocated to A; dispute A → B still has R100 unpaid; after B's R100 clears and A resolves, only A's R50 remains. Synthetic reviewed non-banking date 5 October 2026 → preceding banking target 2 October; a separately evidenced earlier deadline 1 October wins. This example does not declare 5 October a real holiday.

## Evidence and acceptance boundary

Approved definition trace: baseline/catalogue/T17 carry-forward B00–04; earnings E01–07/SVC01–06/FEE01/CALC01; cancellation C01–04/CANCEL01–03; adjustments ADJ01; monthly P01–07/PAY03; later owner resolutions **BK01, P03, X01, X02, DEF01, V01**. Shalean-only planning cost/pilot decisions remain labelled planning, not universal tariffs or Bokkie approvals.

Synthetic implementation was accepted through [PR108](https://github.com/shalean-developer/faraios/pull/108), main 804790f07f02f87bac5de4edee8dd128b4f23712. PR98 is merged; PR99/100 closed as incorporated with history retained. [Current acceptance evidence](t04-synthetic-acceptance-20261024.md) and [independent technical opinion](evidence/t04-independent-final-qa-20261024.md) record exact runtime fingerprint, native CI 346/346 without skips, desktop/mobile valid/invalid reconciliation, hosted rollback suites 22/13/16 and all 18 original fingerprints/cleanup independently corroborated. This is synthetic technical acceptance, not live liability, worker classification or payout certification.

The user's final V01 approval explicitly submits the **definitions/examples** for T04 acceptance, with activation separate. Do not erase or relabel the unresolved actual-terms, hours/full-pay/classification/tax applicability, site/team/route, actual costs, affordability and four-pilot-actuals records. They remain unverified prerequisites for affected future commitments/activation, with owners/review recorded in HR01/AGR03/SAFE02/EVID01/COST07/AFF02. They are not claimed complete, and no live pilot is run merely to finish T04 documentation. Future ledger integration, portals, migration/cutover and T19–T23 retain their own unchanged scope and statuses.

No production deployment, real payment/refund/earnings/adjustment/accrual/settlement/payout, notification, worker contact, source-agreement replacement or new migration is included. T05 remains deferred, T06/T07/T08–T10 Done and T19 held. Final T04 closure requires independent definition-level traceability review and canonical tracker reconciliation; this document alone does not mark it Done.
