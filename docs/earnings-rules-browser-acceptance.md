# T04 — Earnings draft configuration browser acceptance

Date: 21 October 2026 (Africa/Johannesburg). Environment: FaraiOS staging only, project `xdmfyrsauvqznkloroxg`. Owner terminal evidence shows main `356b91a2c0fbf89a3f62ace0728d4e0612960ed4` pulled and the app started using Node 24.22.0. The signed-in owner browser displayed the matching Earnings rules feature. This is not an independent runtime SHA endpoint attestation.

## Scope and result

**PASS for the bounded owner draft-configuration and responsive-layout checks below.** Full configured-preview acceptance and T04 closure remain pending actual numerical choices. This record does not close T22/T23 or activate booking earnings, legacy imports, worker agreement acceptance, accrual or payouts.

| Check | Observed evidence | Result |
|---|---|---|
| Six-service overview | Airbnb/Regular percentage with cap; Carpet/Deep/Moving/Office fixed per cleaner | PASS |
| Percentage suggestions | Airbnb and Regular forms show R300 per cleaner per visit; percentage, basis, hours, split and rounding remain blank | PASS |
| Fixed suggestions | All four fixed forms have no invented amount or covered hours | PASS |
| Native owner save | Each of the six forms saved through the authenticated local app, with success feedback and the same incomplete values after redirect | PASS |
| Draft guard | Each saved setup remains incomplete; no Calculate preview action is offered until required parameters exist | PASS |
| Reopen and error retention | Regular reopened with blank percentage and R300 cap. An invalid 101% submission showed the bounded validation error and retained 101 for correction; navigating back/reopening restored the saved blank value | PASS |
| Desktop visuals | Six-service overview and percentage editor inspected at the normal desktop viewport; readable controls and consistent workspace layout | PASS |
| Phone viewport | 390 x 844 browser emulation: overview, percentage editor and fixed Office editor inspected. Document width equals client width (390); percentage field bounds remain inside the viewport; no horizontal overflow observed | PASS |
| Dropdown interaction | Phone Team split dropdown opens with the placeholder selected, exposes Equal shares, and Escape closes it with aria-expanded=false; no split saved | PASS |
| Persisted verification | Fresh read: six Shalean setup rows, all version 1; percentage caps 30000 cents; all pay rates, hours, split and rounding unset; six audit INSERTs and zero UPDATEs | PASS |
| Data boundaries | Other-business setup row count 0; bookings 12, schedules 2, quotes 3, invoices 2 and catalogue 50 remain unchanged. Audit total is 192, up from 186 by the six authorised setup saves only | PASS |

The browser connection intermittently timed out, including after actions had completed. Each uncertain outcome was inspected before proceeding; a save was not repeated merely because its follow-up read timed out. The final database versions/audit confirm exactly one insert per service and no accidental updates.

## Evidence

- [Desktop Regular draft](evidence/t04-earnings-desktop-20261021.jpg): saved feedback, R300 cap and blank unresolved parameters.
- [Phone Regular draft](evidence/t04-earnings-phone-20261021.jpg): responsive percentage form at the emulated phone size.
- PR92 candidate `3bfd065e18000dfbb23f622505a06a3c434eb2a0`, reviewed tree `3c6e08542cf9cca1e7a6ddbe3eaced164525b476`: Linux265/265, Windows110/110, backup transport and GitGuardian passed. The merge has the same tree.
- Prior staged rollback-only role/version/audit checks passed under PR92. Manager/staff browser sign-ins were not repeated during this owner-session review.

Screenshots contain staging configuration only, with no account email, customer record, payment details or provider credentials. Their bytes are retained as returned by the browser screenshot service (JPEG); no image edits were made.

## Remaining decisions and acceptance

Choose the actual percentage and fixed amounts, covered duration, eligible labour definition, supported team split and rounding explicitly. Minimums/funding, adjustments, cancellation/refunds, monthly cutoff and other T04 scenarios remain open. Do not treat the earlier 70% example as an adopted rate. Bokkie choices are separate.

Configured job-preview browser acceptance remains pending; the calculator already has automated unit/HTTP/Postgres coverage in PR92. The phone check used browser emulation, not a physical handset. No cleaner-portal or bank-payout acceptance is claimed.
