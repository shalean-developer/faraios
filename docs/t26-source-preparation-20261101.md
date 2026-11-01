# T26 notifications and failed jobs — source review package

T26-SOURCE-20261101 v1. Date: 1 November 2026 (owner's Africa/Johannesburg date context). Prepared by Codex; owner review/approval: Farai. Local branch `t26/notifications-failed-jobs`; unpublished. Base: `22c64938ecab8bdfff688beab436917606ff16cb`. No independent reviewer required.

## Verified scope and decision

Read AGENTS.md, docs/blueprint.md, canonical Build Tracker/Decisions, accepted T24/T25 implementation and preparation documents, current staging source and open PRs. The canonical tracker directly confirms T24 and T25 **Done**, completed **01/11/2026**. T26's exact scope is Notifications and failed jobs; Confirmations, assignments and relevant payment messages; acceptance Paid customer gets no pending-payment reminder; retry safe; dependencies T24/T25. No conflicting T26 PR exists. Historical T19 PRs remain untouched.

Only T26 status H27 and append-only notes L27 were updated, with formatting retained and completion J27 blank. Historical evidence remains authoritative for accepted tasks; older preparation documents' pending statements do not supersede the tracker acceptance.

The existing application has scoped booking transitions, assigned staff, explicit customer ownership, verified T20 online credits, verified T21 EFT allocations, private accounting jobs and live-session guards. It has no notification outbox. Reusing an accounting queue would mix provider credentials, recovery semantics and business actions. Add a separate small notification outbox using the accepted state sources and office authorisation. No new dependencies, provider integration, scheduler, recipient lookup by email, business-policy change or financial action is introduced.

## Implementation and traceability

| Requirement | Implementation | Evidence |
|---|---|---|
| Confirmations | Transactional booking transition trigger; Drafts and assessment requests generate none | SQL/HTTP tests, current booking-version checks |
| Assignments | Transition capture per assigned staff ID; current business/staff membership, exact saved assignment and booking version checked at delivery | Positive assigned-staff sink delivery, revoked-member/stale-version suppression |
| Relevant payments | Capture only accepted verified online credits/EFT allocations; pending provider status is not payment | Both payment paths exercised; receipt idempotency |
| No reminder to paid customer | Resolve invoice/customer/booking in same business; sum current verified online/EFT amounts; suppress zero/paid/overpaid/ineligible records | Both-business paid-after-queue, online credit, partial balance, payment-after-failed-attempt checks |
| Retry safe | Durable request receipts, unique business/event keys, job row locks, transactional unique sink insert, bounded five attempts, one-minute backoff | SQL failure injection, response-loss replay, HTTP, native race candidate |
| Business/role isolation | Current active business and owner/manager membership, live session, non-anonymous user; owner alone controls mode; private RLS/default-deny tables | Office/customer/staff/outsider/anonymous, foreign job/invoice, direct table and forged payload denials |
| Failed jobs visible | `/notifications?business=<id>` lists queued, failed, suppressed and sink-delivered jobs and next retry eligibility | Escaped responsive panel markup and HTTP route-to-SQL tests |

`database/t26-notifications-candidate.sql` adds private settings, jobs, sink and request-event tables, triggers and a guarded private writer/public security-invoker facade. No existing function body, invoice, customer, booking, rule, membership, accepted fixture, price or financial history is replaced. Add the exact public RPC to the existing hosted HTTPS/public-schema allowlist. Add office navigation and route; reuse existing server auth, CSRF/origin checking and styles.

No customer contact address is copied into the queue. Customer recipient is the current business-owned customer ID; staff recipient is the current explicit business member. No matching-email inference or Auth identity provisioning occurs. The sink is office-visible test evidence, not a customer inbox or a claim of customer delivery. Content is assembled from current scoped state and escaped by the UI. Test sink records minimal booking/time/business/payment data, without customer notes, passwords, tokens or provider credentials.

Capture is transactional with the source event. Dispatch locks its job, booking, current recipient/member and invoice. Payment insert triggers and dispatch advance the existing T21 invoice fence: an old REPEATABLE READ snapshot must serialize-fail rather than authorize a stale reminder. READ COMMITTED uses fresh state after waiting. Sink publication and completed state commit together. No network call or unknown provider outcome exists in this implementation. The queue never repeats a booking/payment/accrual/financial writer.

### Deliberate bounds

- No settings row means **disabled**. Owner can choose only `disabled` or `sink`. External delivery remains impossible, including retries. Health continues to report external notification dispatch disabled.
- No historical backfill. Only future committed transitions create jobs. Disabled jobs remain queued until an explicitly selected sink delivery.
- One manual pending-payment reminder per invoice. No unapproved cadence, recurring reminders, automatic worker or marketing campaign.
- Changed booking versions conservatively suppress pending confirmation, assignment and reminder messages. Suppressed jobs cannot be forced/replayed into delivery. A later genuine source transition has its own key. New wording/policies are not inferred from stale snapshots.
- Sink failures are retained with generic `sink_failure`; no raw SQL/provider error enters a customer message. Same request key replays its prior outcome; a new retry key rechecks eligibility after backoff. Five failed attempts require investigation; no reset/delete control exists.
- External adapter/provider, verified external recipient routes, provider idempotency and uncertain-outcome reconciliation would require a separately approved implementation. They are not represented as completed or needed for the owner-authorised sink-only staging verification.

## Validation and evidence quality

Final focused command `node --test test/t26-notifications*.test.js`: **11 total, 10 PASS, 0 FAIL, 1 explicit native SKIP**. Real local HTTP server -> guarded SQL -> disposable PGlite covers queue/control/payment suppression and role/CSRF/business denials; Auth client is a synthetic test adapter. This is not hosted Auth/JWT or deployed browser acceptance.

Full local suite: **1243 total, 1210 PASS, 2 FAIL, 31 SKIP**, exit 1. Both failures are Unix-socket listen `EPERM` in existing `test/hosted-staging.test.js`. Both reproduce on unchanged accepted base `22c64938` (2 tests/2 failures). Do not label the broad suite PASS. Skips retain their individual reasons in the full log.

`npm run check` and `git diff --check` PASS. Evidence: `docs/evidence/t26/focused-tests.txt`, `full-suite-tests.txt`, `base-unix-socket-tests.txt`, `syntax-checks.txt`.

Native PostgreSQL/Docker are unavailable locally. `test/t26-notifications-native.test.js` and `scripts/run-t26-notifications-postgres.mjs` are prepared for the existing pinned Node24/PostgreSQL17 CI policy image. They use only an owned disposable loopback cluster with an ephemeral non-5432 port. Tests cover both businesses' concurrent different-key delivery, same-key response-loss replay, rollback of sink/job/receipt, genuine EFT commit against an old REPEATABLE READ snapshot, fresh paid suppression, concurrent failed retries/backoff and eventual one-message recovery. **Not run; no native PASS claimed.** Existing T19–T25 gates remain unchanged, with the T26 step appended.

## Read-only staging findings

Connected FaraiOS staging project `xdmfyrsauvqznkloroxg`, PostgreSQL17.11: 29 bookings, 9 invoices, 4 online credits, 4 EFT allocations; `private_t26` absent. Counts are a source-preparation observation, not a complete deployment preservation baseline. No hosted write, port5432 connection, real notification, Auth account/reset/consent action, charge, transfer, refund or payout occurred. Plesk subscription738/site841 and fresh full-row digests must be verified before environment execution; prior-session observations do not replace that gate.

## Concrete approval requested now: source publication only

Approve committing/pushing this bounded local branch to `shalean-developer/faraios` and opening one Draft PR targeting **staging**, to execute exact-head CI. This includes the candidate SQL as source only, UI/RPC code, focused/HTTP/native tests, disposable runner, CI invocation and evidence/docs. No migration, merge, deployment, provider setup, private-config read/write, scheduled-worker change, shared synthetic record or external message is authorised by this publication request.

Expected impact: public repository source/CI only; no application downtime or customer effect. No additional purchase or provider account is requested. Record exact head/tree, require all seven existing exact-head checks, zero unexpected broad failures in native CI, all retained T19–T25 native gates and T26 markers `T26_NATIVE_DUPLICATE_ROLLBACK_PAYMENT_FENCE_PASS`, `T26_NOTIFICATIONS_NATIVE_PASS`, `T26_DISPOSABLE_CLUSTER_CLEANED`, `CI_POLICY_T26_NOTIFICATIONS_NATIVE_PASS`, plus existing cleanup and `CI_POLICY_EXIT=0`. Stop on failure; preserve logs and requalify any corrected head. No scanner bypass or gate weakening.

Publication rollback: close the Draft PR or add a source-only corrective commit; do not merge or change staging under this authority. Monitor exact-head workflow results and inspect native logs directly. Farai is the approval authority; source publication does not constitute staging acceptance.

## Next staging gate and final acceptance checklist

After source qualification, prepare a separate exact package for review: qualified SQL/hash/head/tree/fingerprint, correct staging project and Plesk subscription738/site841/roots/startup, fresh private source checkpoint, unchanged private configs/recovery archives/task257, full-row before/after preservation groups, migration/merge/deploy/restart and tightly bounded clearly synthetic fixtures. No accepted records may be repurposed. No external recipient/provider test is requested. If browser actions time out, reconcile saved state before retry.

Required final evidence remains:

1. Installed functions/privileges and actual anonymous/API/role denials; both businesses isolated.
2. Actual deployed office UI/API/database queue, stale booking/assignment, paid-after-queue suppression, failure/retry and duplicates; desktop/mobile viewport inspection.
3. Native concurrent-processing and payment-fence gates PASS at exact published head.
4. Before/after full-record preservation excluding only explicitly approved new synthetic fixtures; existing financial/rules/membership/history unchanged.
5. External delivery disabled, existing private configurations/checkpoints/scheduled workers preserved; actual runtime fingerprint matches qualified source.
6. Farai explicitly accepts T26 staging, then and only then update T26 Done/completion date. Do not start T27.

Recovery after any future approved staging execution: select disabled mode, contain route/source if needed, restore only approved source while retaining stricter DB guards and all committed job/sink/event history. Never drop retained evidence, restore permissive guards or replay financial actions. Exact restoration/checkpoint instructions belong to the subsequent environment package.

**Gate: CONDITIONAL PASS for local source review; NO-GO for migration, merge, deployment, external delivery or completion until the relevant approvals and evidence above exist.** Genuine current gate: source-publication approval, then exact-head native/CI qualification. Optional provider delivery, recurring cadence and automated workers are separate follow-ups, not silently added scope.
