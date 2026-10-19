# T14 acceptance — 19 October 2026

Decision: CONDITIONAL PASS for the checks below. T14 remains In progress; full acceptance is not claimed.

Baseline: main d4f7d61f5a22d2345389ee0e74eeb68dd0fc41e5. No application or schema change was needed by these checks.

## Automated isolated checks

Current GitHub main modules and their dependencies were materialized in an isolated verification directory. Command:

`node --test --test-concurrency=1 test/bookings.test.js test/cleaning-profiles.test.js test/staging-server.test.js`

31 tests passed, zero failed. Coverage includes owner/manager HTTP lifecycle, duplicate request handling, stale versions, reschedule, cancellation, tenant denial, anonymous/staff denial, PostgreSQL RLS, immutable quote snapshots, service profiles, equipment, assessments and extras. An initial incomplete materialization lacked configuration/static assets; after fetching the referenced assets, the complete run passed. This run is a targeted subset, not a claim that the entire suite was rerun.

## Actual staging database checks

Executed as authenticated owner using existing business-owned customers/addresses and current saved catalogue settings, inside explicit transactions ending in ROLLBACK. No staff memberships were changed.

Each of six profiles was tested for both businesses (12 calculations), then rescheduled, confirmed and cancelled:
- Regular: one bedroom, bathroom and extra room; no pets; customer equipment; explicit zero-charge assessment: R395 / 270 minutes.
- Deep: same counts; 1–3 month condition; explicit zero-charge assessment: R1520 / 375 minutes.
- Moving: same counts; empty move-in: R1520 / 375 minutes.
- Airbnb: same counts; no linen change: R370 / 210 minutes.
- Office: small, one bathroom; explicit zero-charge assessment: R300 / 180 minutes.
- Carpet: one carpeted room and rug, no stain treatment: R680 / 110 minutes.

Regular reflects the latest owner-saved R40 service fee and assessment flags, not the earlier proposal. Both catalogues currently match.

For each business, Regular plus all seven allowed extras produced R590 / 412 minutes. The same payload without the required assessment was rejected.

Bokkie Office additionally passed draft → confirmed → assigned → en_route → arrived → in_progress → completed, with rescheduling while assigned. The assigned staff identity came from the authorised booking_context function. Final version 8, R300 / 180 minutes. All changes rolled back.

After rollback: one pre-existing booking remained, digest 47cf1779785f8cf75bd80f47783ff4b8, zero T14 test rows. Each business retained six services and 19 extras.

## Browser observations

Connected local Chrome, existing owner session on local staging. Opened Bokkie bookings, selected a customer and Regular via the custom dropdowns. Observed address selector, property type, bedrooms/bathrooms/extra rooms, pets, equipment arrangement, assessment inputs and the seven applicable extras. No booking was submitted through the browser in this verification.

At 390×844, inspected form controls had no right-edge overflow; page scroll width 375, viewport 390. Viewport override reset. This is a focused form check, not complete mobile acceptance or a saved-booking browser journey.

## Remaining acceptance

1. Shalean has no active staff membership. Owner must select/authorise its cleaner; do not implicitly share Bokkie's test cleaner.
2. Real browser save, reload, price review, assignment and completion for each business remain pending. Database and mocked HTTP coverage do not replace this.
3. Some saved extra duration values remain zero. Owner must confirm/configure them; no durations invented.
4. Review equipment policy: current services use assessment arrangements. Delivery tariffs remain unconfigured.
5. Foundation hosting, restricted-link real HTTP and complete recovery gates remain separate.

No production, payment, invoice, notification or earnings actions were performed.

## Browser follow-up — after owner re-sign-in

Owner explicitly authorised the existing Bokkie test cleaner to also hold an active Shalean staff membership. That grant was applied and its INSERT audit event verified. Both authorised booking_context responses list the cleaner.

Real Chrome owner workflow passed for both businesses:
- Bokkie: Regular, one bedroom/bathroom/extra room, fridge extra, customer equipment and explicit zero-charge assessment. Draft saved and reloaded at R410 / 330 minutes. Confirmed, rescheduled from 20 to 21 October 09:00, assigned the test cleaner, then En route → Arrived → In progress → Completed. Final version 8.
- Shalean: medium Office, one bathroom, Kitchen extra, business equipment, explicit R75 assessed additional charge and final 240 minutes. Draft saved and reloaded at R875 / 240 minutes, then Confirmed → Assigned → En route → Arrived → In progress → Completed. Final version 7.
- Switching businesses showed separate lists; the pre-existing Shalean draft was preserved unchanged.
- Browser timeouts were followed by fresh DOM reads before taking another action. Audit history verified one draft and each lifecycle transition per test booking; Bokkie additionally had the reschedule event.
- Two clearly labelled acceptance bookings intentionally remain completed in staging for audit evidence. No production action, customer message, invoice or earnings creation occurred. They are test records, not jobs to deliver.
- The pre-existing booking digest remains 47cf1779785f8cf75bd80f47783ff4b8.

This closes the staff-assignment and real browser save-to-completion blockers recorded above. T14 remains In progress for the outstanding business configuration review (zero-valued extra durations and equipment arrangements); do not treat this as production readiness. Cancellation and both-business rescheduling are covered by the prior actual database rollback checks and isolated HTTP tests, not claimed as separate browser cancellation checks.

## Approved setup and T14 closeout

Final decision: PASS for T14 one-off booking acceptance. This supersedes the earlier In progress decisions. Foundation and production-readiness gates remain separate.

On 19 October the owner approved these missing extra durations for both businesses: Cupboards, Interior Windows, Balcony cleaning, Ceiling cleaning, Kitchen and Sanitisation 30 minutes each; Walls, Garage and Mattress 45 each; Carpet cleaning and Outside windows 60 each; Stain treatment and Welcome Setup 20 each; Water plants and Post-clean Photos 10 each; Airbnb Inside Oven 20 and Laundry 22. Existing non-zero values were preserved (Regular Fridge60/Oven20/Ironing40/Laundry22).

A guarded atomic transaction updated only cleaning_config.extra_minutes across 12 services / 58 previously zero links. Readback verified both businesses match, with zero linked extras still carrying zero duration. Equipment remains policy assessed: customer supplies or explicit business-equipment office assessment. No automatic delivery tariff was invented; assessed charge and final duration are mandatory when business equipment is selected. Office final duration remains explicitly assessed rather than a sum treated as authoritative.

Post-save authenticated-owner regression transactions created all six profiles in each business with all applicable extras, then rolled back. Expected final minutes passed for both: Regular497, Deep695, Moving650, Airbnb322, Office240 (explicit assessment), Carpet245. Thus 12 actual database calculations passed after the change.

All three existing booking records (including two labelled completed browser acceptance fixtures) remained unchanged: aggregate digest before/after 672089597ac392b146d2d6d1e9ab8ead. No test rows from the timing regression persisted. No price, equipment policy, membership, invoice, payment or production change was made by this final timing update.

T14 is complete for its office one-off booking scope. Next tracker task: T15 Staff and teams. Availability/double-booking prevention remains T16, recurrence T17, and finance/portals/recovery/hosting retain their separate tasks.
