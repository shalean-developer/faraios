# T04 — Cleaning configuration contracts

Status: consolidated engineering record, 20 October 2026. T04 remains In progress for the financial choices below. Existing owner-approved tariffs and delivered recurrence decisions are carried forward; no new policy, rate or financial formula is activated here. `src/cleaning-rules.js` remains an isolated synthetic helper, distinct from the persisted booking/quote engines.

Every configuration belongs to one business and has a version. Bookings retain an agreed price snapshot, currency, quantity, unit rate and policy references. Changes to a catalogue must not rewrite booked prices. The isolated cleaning-rules helper does not persist or enforce database immutability/rule-version uniqueness; Object.freeze is only in-process protection. Persisted booking, quote and recurring snapshots already have their separately reviewed database guards.

## Initial isolated helper contracts

| Setting | Contract | Remaining work |
|---|---|---|
| Pricing | Fixed service price; hourly; per unit | Reference existing approved catalogues; decide any additional required partial-hour, tax, discount or commercial exceptions per business |
| Earnings | Fixed amount per worker; percentage pool in basis points | Approve pool basis, allocation, rounding, funding cap, lead adjustments and eligibility |
| Payout schedule | Monthly bank transfer | Configure cutoff/timezone, review/freeze and transfer evidence in payout module |
| Cancellation | Explicit policy version | Define fees, timing, refunds and approval permissions |
| Recurrence | Explicit policy version | T17 operational decisions are consolidated below; financial recurrence policies remain separate |

Money uses nonnegative integer cents; percentages use integer basis points (3500 = 35%). Current price helper accepts positive whole quantities only. Fractional hours, multiple currencies and advanced pricing need explicit additional contracts before use. Zero prices are accepted structurally; zero-price eligibility and settlement need separate tests in the finance module.

The original helper supports synthetic base-price tests only. It does not itself calculate earnings, taxes or final customer totals, enforce policy validity in a database, process payments, settle payouts or provide an authenticated endpoint. Do not expose it as a production quote engine.

## Required scenarios before T04 closes

- Reference existing approved service catalogues; approve only additional required commercial options, without reopening approved Shalean tariffs.
- Two-person team, zero lead earnings, adjustments, cancellation and completed/unpaid visit examples agreed.
- Monthly payout eligibility and funding rules agreed separately from customer payment state.
- Carry forward T17 price locks and future-only schedule edits below; specify any additional recurring financial policy separately.
- Supported settings documented with expected outputs and versions.

General boundaries and roles are approved. This bounded contract work does not close those unresolved financial choices.

## Established decisions carried forward

The owner-approved six-service Shalean configuration is business-specific data in `config/shalean-approved-cleaning.json`, sourced from the accepted pricing/timing PDF on 19 October. [Cleaning profiles](cleaning-profiles.md) records scope, extras and required office/equipment assessments. Do not request those tariffs again or copy them into Bokkie. Saved agreements retain scope, prices, duration, equipment/assessment and customer/address snapshots; later catalogue edits do not reprice them. Operational booking/invoice/payment/payout states remain distinct. An operational cancellation selects no monetary fee or refund by itself.

Monthly bank transfer is already the initial payout cadence. The cutoff/timezone, funding, eligibility, allocation, adjustments, freeze/approval and transfer-evidence rules remain to be specified; customer payment alone does not establish payout eligibility.

## Recurrence decisions already delivered in T17

The owner chose weekly, fortnightly and monthly schedules, multiple weekdays, and keeping created visits unchanged. Weekly/fortnightly support multiple weekdays; fortnightly uses alternating Monday–Sunday source weeks. Monthly preserves the original calendar day with an explicit shorter-month choice (last day or skip).

A schedule inherits the original non-cancelled booking's frozen agreement. Catalogue edits do not reprice visits; a changed agreement requires a new schedule. Office generation is explicit, through an inclusive date within 90 days; visits start as unassigned Drafts and reserve no staff.

Cadence/time/end/status edits require a reason/current version and apply after `generated_through`. Already-created visits are not rewritten or bulk-cancelled. Pause/cancel stops generation; cancellation is terminal. Past skipped dates are not backfilled. Individual visit cancellation/rescheduling retains occurrence identity, so retries cannot recreate it. Generation is atomic and concurrency safe.

These [T17 operational rules](recurring-bookings.md) establish no subscription billing, recurring discount, cancellation fee or payout policy. Do not reopen the approved operational recurrence choices as missing T04 decisions.

## Remaining owner decisions, separately for each business

| Decision | Required example or answer |
|---|---|
| Earnings basis | Fixed per worker or percentage pool; define the base and treatment of discounts, extras, equipment, tax and adjustments. Supported helper options do not select a formula. |
| Team allocation and rounding | Give expected cents for a two-person team, any unequal split and leftover cent; define unfunded visits and funding caps. |
| Lead/other adjustments | Give a zero-lead/positive-other-worker example, adjustment limits, approver and audit requirements. |
| Cancellation/refund | Give before/after-cutoff and customer/business-cancelled examples, fee/refund outcomes and permitted approver. |
| Monthly eligibility | Give completed-unpaid, paid-incomplete, post-freeze adjustment and already-settled examples; specify cutoff/timezone, review/freeze, approval, funding and bank evidence. |
| Additional commercial options | State whether partial hours, taxes, discounts, special recurring rates or exceptions are required next, with a versioned expected-output example. |

T04 closes after the remaining business-specific decisions, expected outputs and versions are approved and traced to acceptance. Consolidation of established tariff/recurrence/cadence decisions is complete; no new financial policy is selected here.

## 21 October earnings-method implementation

Owner approved the six-service Shalean mapping and prospective R300 percentage cap with “Good lets implement them”. Standard/Regular and Airbnb use a capped percentage pool; Deep, Moving, assessed Office and Carpet use fixed per-cleaner amounts. Percentage and fixed rates, covered hours and the other financial choices remain unspecified. The 70% example is not a selected rate.

The separate [earnings rules increment](earnings-rules.md) adds owner-controlled service setup, manager read/preview access, draft-safe validation, per-cleaner caps, explicit team/rounding choices, versioned audit and new-agreement-only calculation previews. This prepares T04 decisions; it does not persist accepted booking earnings or deliver T22/T23 accrual and payouts. Existing agreement imports and recurring financial snapshots remain future acceptance work. T04 is In progress.

## Approved duration and daily workload extension

On 21 October the owner approved minimum total durations for all six Shalean services, an eight-hour daily maximum per cleaner, then requested item mapping and implementation/tests. [Duration and workload](cleaning-duration-and-workload.md) records the half-hour item mapping, business-scoped settings, protected agreement snapshots and cross-business assignment enforcement. Financial rates and other T04 choices remain open. Application delivery, schema delivery, policy activation and browser acceptance are separate evidence states.
