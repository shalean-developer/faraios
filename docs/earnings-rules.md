# T04 — Service earnings configuration

Owner instruction, 21 October 2026: “Good lets implement them” following the six-service mapping and proposed R300 cap. This approves the Shalean methods and the prospective R300 per-cleaner/per-visit cap. The previous 70% example did not select a percentage. No fixed amount, minimum, covered hours, eligibility/funding policy, start date or Bokkie policy is inferred.

| Shalean service | Method | Configuration still needed |
|---|---|---|
| Standard / Regular | Percentage pool, capped at R300 per cleaner per visit | Percentage, eligible labour definition, team split, rounding, covered duration |
| Airbnb | Same method and cap | Same choices; explicitly define linen/extra labour eligibility |
| Deep | Fixed per cleaner | Agreed amount and covered duration |
| Moving | Fixed per cleaner | Agreed amount and covered duration |
| Office | Fixed per cleaner for assessed visit/shift | Assessed hours and agreed amount |
| Carpet | Fixed per cleaner/operator | Scope, covered hours and agreed amount |

The accepted mapping is data in `config/shalean-approved-earnings.json`. Only the explicitly configured Shalean staging business receives these form suggestions. Other businesses choose their own methods and amounts; the shared engine contains no brand policy. Template suggestions are not saved or activated by a GET request.

## Delivered increment

The workspace has **Earnings rules** for owners and managers. Owners save business/service-scoped setup, including incomplete drafts. Managers read and preview; staff/anonymous users cannot open business rules. An owner must choose all required parameters before a preview can calculate. Blank is different from explicitly entered zero. Covered duration is mandatory and a preview beyond it is rejected.

A percentage is applied once to the explicitly entered eligible labour value. The saved rounding choice rounds the pool to integer cents. Equal allocation (the currently supported selectable option) divides the pool once, with leftover cents assigned by ascending stable worker ID. The cap is applied to each worker's share afterwards; capped excess is not redistributed. Fixed earnings multiply the per-cleaner amount by the assigned count. The preview labels cleaner positions rather than implying synthetic IDs are real staff assignments.

Examples using **illustrative 70%**, equal shares and R300 cap: eligible R400/one cleaner -> R280; R600/one -> R300; R1,000/two -> R300 each, total R600. These are calculation scenarios, not approved actual worker pay. Company remainder is before expenses.

`previewEarnings` requires `agreementKind: 'new'` and rejects existing/recurring-existing input. It returns a deeply frozen preview with the rule version, covered duration, calculation inputs and per-worker amounts. A later settings edit cannot mutate that in-process result. This is not database-enforced booking snapshot persistence.

Saving settings touches only `business_earnings_rules`; database audit captures the actor, business, old/new values and version atomically. Business/service identity is immutable, services must belong to the same business, and stale versions conflict. Direct database writes are constrained and protected by membership-based RLS.

## Staging and acceptance

`database/earnings-rules-draft.sql` is an additive schema draft after the existing catalogue/audit migrations (after invoices in the current staging sequence). It creates no financial ledger, bookable customer rate, provider request, payment, payout, background job or existing-agreement conversion. Apply only to isolated FaraiOS staging after review. Restart the local staging app with the same code before opening the new page.

Before browser acceptance, verify the exact staging business and its six service profiles, schema/RLS/grants/audit state, the owner/manager/staff paths, draft save/reopen, configured percentage and fixed previews, zero/missing values, multi-cleaner caps, excess-duration rejection, stale saves and another-business denial. Phone layout/interaction acceptance is separate from rendered-markup tests.

Rollback: revert the application increment to remove the new route/navigation. Preserve the additive table and its audit records for review rather than deleting setup or audit evidence. Previously deployed application code does not read this table. No existing booking needs rewriting. A future backup must capture the then-current schema; the earlier T11 one-off archive remains evidence of its original capture, not of later changes.

## Explicit remaining work

T04 remains In progress: actual rates/parameters, adjustments, minimum/eligibility/funding, cancellation/refunds, monthly cutoff/freeze and expected payout scenarios remain open. This increment does not close T22 or T23. It does not yet capture an accepted earning agreement on a real booking, carry verified legacy percentage/fixed agreements into future recurring visits, post completed-job earnings, collect cleaner acceptance, expose cleaner earnings, settle bank payouts or activate production. Those flows must use persisted agreed terms, protect existing agreements and pass their own acceptance before cutover.

Local tests cover calculation and scope limits, immutable preview copies, six-method template, drafts and zero, stable rounding, version conflicts, actual isolated Postgres RLS/audit, and authenticated HTTP owner/manager/staff/restore guards. Hosted/browser acceptance must be recorded separately with the released SHA.

Gate: CONDITIONAL PASS for earnings setup and new-job previews after the matching staging schema is applied; NO-GO for real earning accrual, production or payouts until the outstanding parameters and T22/T23 flows are accepted.
