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
