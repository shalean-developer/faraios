# T18 — Quotes and conversion

19 October 2026. Owner: Codex. Authority: owner instruction to proceed with T18 in the original Build Plan and Progress Tracker after UI-01 closure. Baseline main `ef5ba8c065682dd735d44512a5ed825cad37ae41`, tree `9d51e260b62cf223b896dd354d16094cfa308e5a`. Status: bounded staging delivery accepted; independent final QA PASS after both-business browser acceptance. Tracker closure follows this documentation gate. PR59 candidate `c07ee93cdc56aa2f28eae1801e40bc35d66003f2`; see [validation and QA evidence](quotes-validation.md).

## Objective and scope

T18's approved scope is accepted-quote conversion into the correct booking and invoice flow; its acceptance criterion is that repeated conversion cannot create duplicates. T14 supplies the existing booking lifecycle. T19 separately implements invoice identities and accounting connections and depends on T18. This increment therefore creates a durable, one-per-quote invoice handoff, not an issued/accounting invoice. No tax, discount, expiry, payment, earnings or payout policy is introduced.

Owner/manager office users in an active authorised business can create a quote from an active customer/address and that business's configured service/extras. Database calculations reuse the existing cleaning scope, equipment/assessment, quantity and rate rules. Saved contact/address, service selection, scope, lines, total, duration, team size and timezone form an immutable agreement. Private office customer notes are excluded. No visit date is required until conversion.

## Behavioural contract

- Save a Draft; review it; mark it Issued after sharing through the office's existing process. This action sends no message. Record customer acceptance with a required evidence/reference note and the actual office actor/time. Issued quotes can be declined; Draft/Issued/Accepted quotes can be cancelled with a reason. Declined/Cancelled/Converted are terminal quote states.
- This increment keeps a saved quote's agreement immutable. A correction requires a new quote; no silent repricing or post-acceptance editing. No automatic quote expiry or customer self-service acceptance is claimed.
- Convert an Accepted quote with an explicit local start and an out-of-hours reason where needed. The accepted price/scope/duration are copied unchanged even after catalogue edits. The customer/address must still be active and the business accessible. Current working-hours validation and the existing saved timezone are respected.
- Conversion creates one unassigned Draft booking, its unique invoice handoff and the quote's Converted link in one transaction. Office review and confirmation use T14's existing workflow. Drafts reserve no staff. Confirmation does not imply payment.
- A quote row lock and database uniqueness protect concurrency. An identical conversion retry returns the existing booking/handoff even from the original submitted version; conflicting date/override payloads return conflict. Cancelling/rescheduling that booking never allows conversion to manufacture a replacement.
- The handoff retains history and displays the linked booking's current status. A cancelled booking shows invoicing needs review. T19 must inspect the booking and apply its approved invoice policy before creating an invoice; a handoff is not permission to bill automatically.
- Direct Data API insertion of quote-linked bookings must use the same frozen agreement validator and atomic after-insert handoff/link creation. Client-supplied snapshots, totals, assignments and lifecycle values cannot override the accepted agreement. A forged, foreign, non-accepted or duplicate source is rejected.
- All office quote state writes, conversion links and handoffs are business-scoped and audited with actor/time and old/new records. No client deletes, direct quote/handoff updates or platform/staff/customer access are granted.

## Technical design and trade-off

Reuse server-rendered workspace navigation, grouped creation forms and compact lists. Add a scoped Quotes destination and source-quote links on converted bookings. Public RPCs remain SECURITY INVOKER; narrow internal implementations use explicit current membership checks, empty search paths and revoked anonymous/PUBLIC execution. Tables have RLS and scoped read policies; mutation grants are limited to the supported workflow.

Extract the existing three price/snapshot routines into reusable record builders, preserving booking trigger wrappers and update/lifecycle logic. Quotes can calculate the same agreement without creating a provisional booking or requiring a fictitious visit date. This bounded refactor is preferred to duplicated SQL pricing or temporary booking insert/delete: it keeps one rate calculation and does not create operational side effects during quoting. Regression and all-six-profile parity tests must prove existing results unchanged.

Quote creation locks the active customer, then address, then catalogue rows in ID order before validating and copying snapshots. A concurrent contact edit therefore cannot invalidate a phone check between pricing stages. Creation retries take the request advisory lock; conversion/change retries take the quote row lock and recheck authorization after waiting.

Add business_quotes, quote_invoice_handoffs and a nullable immutable source_quote_id on bookings. Composite foreign keys enforce customer/address/business and quote/booking/handoff association. A database CHECK and early trigger rejection prohibit mixing source_quote_id with recurring_schedule_id. Preserve recurrence routing and the cleaner-reservation constraint. No dependency, hosting, authentication, account/membership, external accounting or production change is included.

## Verification and traceability

| Requirement | Required evidence |
|---|---|
| Correct accepted agreement | Generic and all-six-cleaning-profile quote/booking parity; catalogue/customer changes do not rewrite the snapshot; private-note exclusion; equipment assessment and duration rules retained. |
| Correct booking/invoice flow | Accepted-only conversion; immutable source link; one Draft booking and one durable handoff; no invoice/payment falsely reported; source quote and booking links render. |
| No duplicates | Creation request replay/conflict, repeat conversion, different request payload, direct API attempts, real independent PostgreSQL connections contending on the same quote, cancelled/rescheduled booking replay. |
| Atomicity | Forced handoff failure rolls back booking, quote state/link/version and audit; no orphan receipt or partial conversion. |
| Business security | Owner/manager allow, manager foreign-business denial, staff/anonymous/suspended denial through HTTP and real RLS/RPC tests; composite FK, stale version, CSRF and body/identifier validation. |
| UI acceptance | Both-business desktop/mobile create, review, issue, record acceptance, convert, reload/retry, linked booking and invoice-pending state. Invalid/stale/cancel paths and keyboard/picker fit. |
| History preservation | Pre/post original-record digests and rolled-back staging verification. Existing one-off/recurring lifecycle, reservations and configured prices unchanged. |

## Release, impact and recovery

Local isolated checks → independent technical review → clean exact-candidate CI → capture FaraiOS staging record digests and function baselines → apply the reviewed additive SQL transaction to faraios-staging `xdmfyrsauvqznkloroxg` only → rolled-back allow/deny/integrity acceptance and advisor comparison → bounded PR merge → owner pulls/restarts local port-3101 client → real browser acceptance → independent closure opinion and tracker evidence. Existing Shalean/Bokkie live sites remain authoritative.

No customer-facing downtime or external communication is expected from preparation. Audit/link consistency and visible workflow errors are the relevant monitoring signals. No worker, cron or paid service is activated. Budget impact: no new service or dependency.

Failed migration rolls back atomically. For an app issue, stop new quote writes and restore the prior application while retaining quote agreements, additive columns and duplicate constraints. Do not delete populated quotes/handoffs or remove source uniqueness as rollback. If shared snapshot builders regress, restore their reviewed prior trigger bodies while retaining protected quote history; full environment recovery remains T11.

## Current gate and ownership

Independent preliminary design QA: CONDITIONAL PASS for isolated preparation; no unapproved commercial policy identified. Reviewer required mutual exclusion of quote and recurring sources, explicit office-recorded acceptance, uniquely scoped handoffs labelled awaiting invoicing, authorization before retries, conflicting-payload denial even after booking lifecycle changes, and all-profile builder/routing parity. These conditions are incorporated above and require implementation evidence. No completed-candidate tests or live changes were assessed by that opinion.

Local evidence: syntax and whitespace checks pass. Independent full regression run passed 122 tests with one explicit independent-PostgreSQL skip (no local database URL). The four-test quote suite passes, including rollback-only staging-script rehearsal, terminal-state reasons and inactive-address denial. Both exact-candidate CI jobs passed all 123 tests with zero skips, including real PostgreSQL 17 independent-connection conversion contention and contact-edit locking. HTTP evidence covers owner/manager forms and RPC bindings, foreign/staff/anonymous/suspended denial, CSRF, stale versions, escaped content, handoff failures and current cancelled-booking presentation. SQL evidence covers forced-handoff full rollback, direct Data API guards, cancelled/rescheduled replay, six representative configured-profile parity samples and original-record digests. These checks do not substitute for actual owner browser acceptance.

`scripts/verify-quotes-staging.sql` passed both isolated rehearsal and actual staging execution. It exercises both existing completed fixtures against current prices, owner/manager conversion, staff/anonymous/foreign denial, replay/conflict, source immutability and direct API completion in a transaction that ends in ROLLBACK. All original staging booking, catalogue, customer/address, membership, settings and audit baselines matched afterward. No SQL test quote, handoff or booking persisted. Independent staging/premerge QA PASS confirmed all 17 deployed function-body hashes, controls, baseline digests and cleanup. Detailed advisory differences and review limitations are retained in the linked validation record.

Both-business owner browser acceptance passed: Bokkie R410/330 minutes and Shalean R875/240 minutes retained their saved agreements in unassigned Draft bookings. A real second Accepted form returned the same Shalean booking after conversion. Desktop/mobile, invalid date, picker/keyboard, list filtering and cancelled-booking invoicing-review presentation passed. Both labelled test visits are Cancelled with zero reservations; history remains. All original record digests are unchanged. Independent QA-T18-CLOSURE-20261019 issued PASS for bounded staging delivery; its limits and evidence are preserved in the linked record.

Engineering owns implementation and documentation/tracker closure. T19 actual invoice identities/accounting remain unstarted. Farai retains production, foundation, financial-policy and materially expanded scope decisions. No approval is inferred for those separate matters.
