# T04 — Cleaning configuration contracts

Status: isolated implementation proposal, 19 October 2026. No actual Shalean or Bokkie rates or policies activated.

Every configuration belongs to one business and has a version. Bookings retain an agreed price snapshot, currency, quantity, unit rate and policy references. Changes to a catalogue must not rewrite booked prices. Database immutability and rule-version uniqueness require later persistence constraints; Object.freeze is only in-process protection.

## Initial supported options

| Setting | Contract | Remaining work |
|---|---|---|
| Pricing | Fixed service price; hourly; per unit | Decide units, minimums, partial hours, extras, tax and discounts per business |
| Earnings | Fixed amount per worker; percentage pool in basis points | Approve pool basis, allocation, rounding, funding cap, lead adjustments and eligibility |
| Payout schedule | Monthly bank transfer | Configure cutoff/timezone, review/freeze and transfer evidence in payout module |
| Cancellation | Explicit policy version | Define fees, timing, refunds and approval permissions |
| Recurrence | Explicit policy version | Define occurrence generation, skipped visits and future price changes |

Money uses nonnegative integer cents; percentages use integer basis points (3500 = 35%). Current price helper accepts positive whole quantities only. Fractional hours, multiple currencies and advanced pricing need explicit additional contracts before use. Zero prices are accepted structurally; zero-price eligibility and settlement need separate tests in the finance module.

The helper supports synthetic base-price tests only. It does not calculate earnings, taxes or final customer totals, enforce policy validity in a database, process payments, settle payouts or provide an authenticated endpoint. Do not expose it as a production quote engine.

## Required scenarios before T04 closes

- Each business's service catalogue and pricing examples approved.
- Two-person team, zero lead earnings, adjustments, cancellation and completed/unpaid visit examples agreed.
- Monthly payout eligibility and funding rules agreed separately from customer payment state.
- Recurring price locks and future schedule edits specified.
- Supported settings documented with expected outputs and versions.

General boundaries and roles are approved. This bounded contract work does not close those unresolved financial choices.
