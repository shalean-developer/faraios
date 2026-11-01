# T25 assessment follow-up — review and conditional staging package

Farai approved this workflow for both Shalean and Bokkie on 1 November 2026: customer submissions requiring assessment are saved as **Awaiting office assessment**, with price and duration pending until office review and actual customer agreement. This resolves the mandatory per-option assessment blocker found during the deployed customer journey. T25 remains In progress; T26 is untouched.

## Exact source and database scope

Bounded branch: `t25/assessment-requests`, based on staging merge `902cc95e52439b32776be8fcb059ca40fd5a24e3`. This package changes only the T25 follow-up and its isolated fixtures/tests.

Additive migration: `database/t25-assessment-requests-candidate.sql`.

SHA256: `8417a6f3c9efe257494bf2b0174b7598e9360f78b0194856392cd52f101e7971`.

Expected application source fingerprint: `2e0ac191c0b505bdf4daf292cc07c7142359697c55aeea47c81fad89733d1285`.

The migration adds one private, RLS-enabled, client-inaccessible request table, guarded functions and two quote triggers. Public RPC `t25_customer_assessment` is an invoker facade available to authenticated users only. Every operation checks a real current session and a configured active business. Customer operations require that customer's explicit active relationship. Office operations lock and verify current owner/manager membership. No source-table RLS policy or direct client write grant is widened. The existing deployed T25 migration is not changed or reapplied.

The customer parser may capture valid scope without an assessment only for this unpriced path. Office/default parsers still require the existing assessment. The SQL writer separately validates the tenant, own address, current catalogue versions, service/options/counts/extras and requested future working-hours start. It rejects browser assessment, charge, duration and override fields. It never inserts a booking while price or duration is pending.

## Complete workflow

1. Customer submits from `/b/shalean` or `/b/bokkie`. A durable private request and idempotency receipt are saved. History displays price pending and duration pending, not R0.
2. Owner/manager opens `/customer-requests?business=<verified business ID>`, linked from customer details. The office records explicit additional charge, final duration and assessment reason. Existing quote builders enforce the business's current rules, minimums, time blocks and authoritative pricing. The transaction creates and issues a quote. No booking is created.
3. The customer sees the exact saved scope/address, price lines, total, duration and assessment reason. An explicit checkbox and submit record the actual authenticated customer actor, time and exact quote/request versions. An office actor cannot substitute for customer consent.
4. Office creates an unassigned Draft at the original requested time using existing accepted-quote conversion and working-hours controls. The quote's normal internal invoice handoff is retained; no invoice, payment, earnings, payout or external dispatch is created by this flow. Booking confirmation remains separate.

Reassessment before customer agreement cancels the old quote and requires agreement to a new immutable quote. Stale request/quote versions fail closed. Once agreed, silent reassessment is refused. Withdrawn quotes show office review required; arrange a new customer request if scope/time must change. Expired requested times cannot be converted through this path.

The database quote guard covers existing office quote screens too: acceptance/conversion requires the recorded T25 customer consent and a currently active relationship/address. A conversion through an existing authorised quote screen updates the portal request receipt. Durable idempotency receipts make exact retries return the original result; different payload reuse is refused. Quote/request locks precede relationship sharing to serialize against revocation.

## Verification completed locally

- Final focused run: **29 total, 28 passed, 0 failed, 1 explicit native T20 skip**. Includes actual HTTP customer and owner forms backed by guarded SQL: submission, pending history, office quote, customer agreement and Draft conversion. Includes mandatory property/bathroom assessment flags, forged fields, anonymous/other-customer/business denial, stale/replaced quotes, relationship revocation, old direct-booking behavior, cleaning profile defaults, T04 duration/workload and all seven T20 SQL payment regressions.
- Additional final assessment run: **4 passed, 0 failed**, including the second business and conversion through the existing office quote screens after actual saved customer consent.
- Final `npm run check` and `git diff --check` passed.
- Broad local run during implementation: **1,220 total, 1,188 passed, 3 failed, 29 skipped**. Two failures are the previously observed Unix-socket `listen EPERM` restriction. One T20 test file stopped without a diagnostic under the broad concurrent run; the complete T20 file subsequently passed in the focused run (7 pass, 1 native skip). This is not a broad-suite pass or final-head hosted qualification.
- Native PostgreSQL test source extends the existing disposable T25 runner with independent-connection duplicate pending submissions, duplicate consent, rolled-back conversion, concurrent finalization and committed response-loss retry in the second business. **Not run locally: no PostgreSQL binaries/server are available. Hosted CI must pass this exact source before deployment.** Existing T20–T24 CI gates remain in place.
- No follow-up shared database writes, migration, merge or deployment occurred during this preparation. No new live customer/account/address/booking was created.

## Requested next execution, conditional on approval

1. Publish this bounded source to a draft PR targeting **staging only**. Record the exact head/tree. Require all seven checks, the broad hosted suite with zero failures and the existing T20–T24 native gates, plus `T25_ASSESSMENT_NATIVE_CONSENT_ROLLBACK_RETRY_PASS`, `T25_CUSTOMER_NATIVE_CONCURRENCY_ROLLBACK_RETRY_PASS`, `T25_PORTAL_NATIVE_PASS`, cleanup and CI-policy exit 0. Stop and repair/requalify source if any fail. Do not deploy a different candidate under this package.
2. Verify staging has not drifted from the recorded source/database assumptions. Capture fresh preservation digests, existing synthetic contacts/addresses, catalogue/settings, all existing quotes and recovery/private-config/scheduler checks. Explicitly verify Plesk subscription **738**, staging site **841**, roots/startup and Supabase project `xdmfyrsauvqznkloroxg`. Never use port 5432.
3. Make a private source checkpoint preserving existing recovery material and private configuration. Apply only the additive migration above through the approved Supabase connector. Merge the qualified PR to staging at its exact approved head, deploy that source and restart only the verified staging app. Verify the expected fingerprint and disabled external dispatch/worker health. Do not enable notification, accounting or production payment dispatch.
4. Reuse only the two existing clearly synthetic T25 customer records and the actual signed-in customer account. Verify whether Bokkie's attempted address persisted before any retry. Retain the original total cap of two synthetic contacts/two addresses/two eventual Draft bookings; create no further contacts/Auth users. Allow **one new assessment request and one final issued quote per business**, two actual customer consents and at most two unassigned Draft conversions, with their inherent append-only audit/idempotency records and normal quote handoffs. No revisions/cancellations are needed for hosted testing; those are isolated-test cases. Do not modify pre-existing bookings, quotes or financial fixtures. All assessment values must be explicitly entered/reviewed in the actual authorised office UI; no impersonation or invented customer agreement. If a real office session is unavailable, stop that part and report it.
5. Inspect actual desktop and 390×844 mobile viewport forms/history for each business, complete actual customer/office/consent journeys where authorised sessions permit, and verify own-history and business isolation. No physical-device claim. Confirm Draft/no assignment and all price/duration snapshots; no financial or external side effects. Recompute preservation digests excluding only the approved new synthetic records; all original records must remain identical. Record migration version, merge, fingerprint and evidence boundaries in the canonical tracker.

## Recovery and acceptance

Contain/revert application source if necessary while preserving the new strict table, customer consent, quote and booking history. Never delete receipts/events/quotes/bookings, alter accepted financial fixtures or restore a permissive writer. Existing retained T24/T25 checkpoints and scheduled task257 remain intact.

T25 stays **In progress**, completion blank, until actual acceptance evidence is complete and Farai explicitly accepts staging. Approval of this package does not constitute acceptance. No T26 work, production action, actual service/charge/refund/transfer/payout or external customer communication is included.
