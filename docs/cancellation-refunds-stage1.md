# T04 Stage 1 — cancellation and refund review

22 October 2026. Scope: FaraiOS staging only. Source: tracker CANCEL01–03 and
owner instruction to implement Stage 1 before Stage 2. Existing/recurring terms
remain protected. This is a review and simulated-refund workflow, not a payment
integration, worker-classification decision or authority to send money.

## Behaviour and boundaries

Owners/managers can prepare a business-scoped review from an assigned one-off
booking. An explicit business policy approval and evidence of accepted prospective
terms are required. No policy is enabled by the migration. Bokkie does not inherit
Shalean's approved commercial design. Request time, saved original start, cause,
dispatch stage/times, customer access confirmation and per-cleaner agreed amounts
are recorded without rewriting the source booking or its agreement.

The 24-hour boundary uses elapsed instants; exactly 24 hours is early notice.
Late customer charges are manually reviewed and capped by half eligible labour,
R300 for the whole booking and supported loss after mitigation. Stronger customer
rights can waive the charge. Only lawfully retained collected compensation is
allocated, proportionately to agreed earnings, with deterministic residual cents.
No commission, processor fee, routine company top-up or per-worker R300 fee is
introduced. Zero-weight workers cannot receive a collected-pool share.

Shalean-caused cancellation is separate: no customer fee; no additional allowance
for early pre-travel cancellation; 50% before arrival when late or travelling;
100% on site or after work starts. Amounts are total visit compensation, not
stacked tiers. Approved nonduplicated expenses and independently owed work/pay
remain separate. The supplied team stage describes the whole accepted team;
mixed individual stages require separate review rather than assuming this
homogeneous-team calculation resolves them.

Partial service value, previous refunds and pending refund reservations reduce
available credit. Unpaid assessed balances are displayed without collecting or
debiting them. Rescheduling preserves the original-slot assessment and records
the accepted new start/price, credit, balance and excess refundable credit. A
booking with an existing review cannot bypass owner approval when cancelling or
rescheduling. A changed booking price needs a separate accepted agreement; the
immutable price is never overwritten. Stopping an in-progress visit requires an
approved partial-service cancellation review.

Owners approve assessments and record refund reservation, simulated submission,
simulated completion or unused-reservation release. Submitted and completed are
distinct. An uncertain/submitted refund cannot release its money for another
attempt. Original-route exceptions require reasons. All records are simulations;
the module has no provider client or money-sending operation. Acknowledgement
evidence is recorded, not sent to customers. Reviewed holiday dates are required
for the 1/5-business-day targets, measured from the original request, not approval.
The pending 15-minute no-access proposal is not implemented.

## Storage and access

The additive migration adds explicit business policy approvals, immutable case
identity and an append-only input-event journal. Current active membership is
checked at the HTTP boundary and again by the bounded database writer. Managers
prepare; owners perform approval/refund events. Staff, anonymous and foreign
tenants are denied. Each original booking/start pair has one case; event keys
require matching actor, action and JSON payload on retry. Case-row locking and
expected versions serialize concurrent reservations. There are no direct client
insert/update/delete grants for the cases or event log.

The private writer is in the existing non-exposed `audit` schema, uses an empty
search path, explicit membership/tenant checks and a public invoker wrapper. This
preserves existing backup schema coverage. Journal events carry server actor,
role, timestamp and version. The application recomputes the complete result from
the journal and fails closed on invalid, missing or foreign events. The database
also enforces fee/receipt bounds, approval order, reservation amounts and refund
state transitions. Neither the journal nor its displayed result is an earned
ledger, payment receipt or financial activation record.

Policy approval is configured explicitly by an authenticated owner inserting the
approved business/version/reference into `business_cancellation_review_policies`.
The implementation does not infer that approval for any business. Browser
acceptance must use disposable QA data; real business policies remain unconfigured.

## Evidence and acceptance

| Criterion | Evidence | Current result |
|---|---|---|
| Cutoff, customer ceiling/pool, company tiers, partial service, credit, missing evidence | `test/cancellation-review.test.js` | Local pass |
| Owner/manager/staff, tenant, origin, stale-session and restore boundaries | `test/cancellation-http.test.js` | Local pass |
| PostgreSQL grants/RLS, replay, stale writes, reservations and immutable history | `test/cancellation-cases.test.js` | Local pass |
| Independent simultaneous refund reservations | Extended `test/availability-concurrency.test.js` | Passed native PostgreSQL CI on application 90d2711; locally skipped without its disposable database |
| Whole existing regression suite | `npm run check`; `npm test`; CI 39753982974 | Local 300 passed/one skip after browser fixes; native CI 300 passed/zero skips on application 90d2711 |
| Hosted migration, rollback-only QA and original fingerprints | FaraiOS staging only | Applied 20261022091924; 17 checks passed, 18 original groups unchanged, zero retained policy/case/event/QA rows |
| Authenticated desktop/narrow-screen browser acceptance | Candidate local staging app | Verified on fc390fc, desktop and 375px; see browser evidence |
| Payment provider execution, verified receipts, legal/pay applicability | Separate integration/activation gates | Excluded; inactive |

Technical implementation, CI, hosted checks, browser checks and evidence readback are complete. The separately delegated QA reviewer issued PASS on exact implementation commit 1e0fbe for Stage 1 synthetic staging acceptance. Stage 1 is accepted for this engineering scope under the owner’s instruction to complete it and the authorized separate review. Stage 2 synthetic development may proceed. No production deployment is included.

Backend evidence is in `docs/evidence/stage1-staging-20261022.json`. The exact
pre-change booking validator is retained separately for reviewed recovery.
Security advisers reported no new findings; the existing restricted-table INFO
items and leaked-password-protection warning remain. Four new unused-index INFO
items are expected on empty tables; no new unindexed foreign keys were reported.
The rollback-only acceptance script also passed against the complete disposable
booking schema locally. Authenticated browser testing completed the synthetic prepare → acknowledge → approve → reserve → submit → complete path on 379931d. A missing receipt was blocked, a R301 charge rejected against a R300 ceiling, and a second reservation beyond R1950 rejected. No payment was executed. Browser testing exposed dropdown reset after validation errors and duplicate control IDs; both are fixed with regression coverage. Cleaner-level shares, remaining refundable balance and Johannesburg times are now visible. Company cancellation, early and late rescheduling, fresh role checks, and 375px visual checks subsequently passed on fc390fc. The QA business and all its synthetic records/reservations were removed. All 18 original record groups match the original fingerprints exactly. No policy remains enabled. Synthetic tests are not completed pilot bookings.

## Recovery

Retain all additive tables and history when reverting the candidate app. The
booking validator's new in-progress cancellation branch remains protected by
the database review guard. Do not drop the guard while retaining that branch.
Any database rollback requires restoring the exact captured validator definition
and removing the new trigger together, under a separate reviewed change. Normal
rollout does not backfill, reprice or enable any existing agreement.

## Browser continuation on fc390fc

See `docs/evidence/stage1-browser-20261022.json` for scenario and role results. Dropdown preservation, cleaner shares, remaining refund and label associations were verified in the fixed app. CI 39757550206 passed. The 375px viewport has no horizontal overflow; visible totals, shares and owner controls fit. Fixture cleanup passed with zero retained QA business/cases/events/policies/reservations. All 18 original group fingerprints match. No Stage 2 work has started.

These browser checks are delivery evidence. The subsequently delegated independent QA agent verified the corrected implementation, CI and hosted evidence and issued the scoped PASS recorded below. This is an AI technical assessment, not a human audit or legal/pay activation approval. T04 remains In progress, pilot bookings 0/4, allowances Off and financial execution inactive.

## Independent QA remediation

The separate reviewer issued NO-GO on bf402ac: mixed UUID spelling bypassed refund-state tracking, and direct RPC payloads could persist cases that the app could not reconstruct. The original opinion is preserved in `docs/evidence/stage1-independent-qa-bf402ac.md`.

The corrective writer canonicalizes refund IDs before replay/persistence, limits typed state lookup to refund transition events, and rejects unsupported event IDs, mismatched JSON types, malformed/zoned dates and empty Unicode-whitespace evidence. Evidence strings use a conservative 2000-byte bound. The original applied migration remains unchanged; corrective migrations are additive function replacements. Hosted versions are 20261022101454 and 20261022101621.

All 22 rollback-only hosted checks pass. The original 18 data groups remain identical, and zero policies/cases/events are retained. Financial execution stays inactive. Desktop/375px browser evidence remains applicable because no UI or JavaScript changed. Final independent reassessment issued PASS on exact revised implementation commit 1e0fbe after both CI runs passed; Stage 2 implementation has not yet started. See `docs/evidence/stage1-rpc-hardening-20261022.json`.

## Stage 1 acceptance and Stage 2 handover

Separate QA report `docs/evidence/stage1-independent-qa-1e0fbe.md` issues PASS for exact implementation commit 1e0fbe8201d21d5853c65dcc216d8085c9fd52ea. Both final CI runs 39762056663 and 39762047580 passed. QA independently verified 19 cancellation tests/adversarial probes, hosted writer identity and all 18 original fingerprints. Both findings are closed; original NO-GO remains preserved.

Delivery records Stage 1 synthetic staging acceptance under the owner’s instruction to finish this stage and authorization of the separate reviewer. Stage 2 next: bounded linked earnings-adjustment implementation and synthetic testing. This handover does not merge or deploy PR #98 or authorize financial execution. T04 remains In progress, pilots 0/4, allowances Off and financial workflows inactive.
