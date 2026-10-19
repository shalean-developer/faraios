# T16 — Availability and calendar

Scope: owner-authorised next tracker task, after T15 acceptance. Day and seven-day agenda views, proposed-time availability, and database-enforced prevention of concurrent overlapping cleaner assignments across explicitly shared staff accounts. Uses existing owner/manager booking permissions and business time zones.

## Scheduling contract

- Draft and Confirmed jobs are visible but do not reserve cleaners. Assignment begins the reservation; En route, Arrived and In progress retain it. Completed visits retain historical occupied time. Cancelled jobs release it.
- Intervals are `[start,end)`: a job ending at 11:00 permits another starting at 11:00. Duration is the booking's saved elapsed duration. Travel buffers, leave, recurring shifts, overrun forecasts and drag-and-drop scheduling are not introduced by this task.
- Assignment, individual or saved-team reassignment, and rescheduling update reservations in the same transaction as the booking. Any conflict aborts the entire change, including booking version and audit writes. No override permits double-booking.
- A private `audit.cleaner_reservations` table normalises the existing assignment array into one interval per cleaner. A GiST exclusion constraint with btree_gist enforces conflicts across business IDs, including simultaneous requests. Sorting team inserts reduces multi-cleaner lock-order conflicts. Ordinary clients cannot read or write this table. Existing bookings are backfilled atomically; any existing overlap stops migration.
- AFTER triggers use the final timestamps and service-assessed duration, after existing booking validation. Identity, lifecycle, working-hours checks, snapshots and optimistic version guards remain intact. Errors are sanitised to avoid PostgreSQL conflicting-key details exposing another tenant's booking.

## Privacy and access

Both readers verify current active owner/manager membership in the selected active business. Calendar data includes only that business's booking ID, customer name, status, times and assigned staff. Foreign jobs expose only clipped start/end and the already-authorised shared cleaner ID; no source business ID/name, booking ID, customer, address, price or notes. Foreign busy time is returned only for active staff memberships in the selected business. Availability returns only eligible staff IDs with busy booleans; an excluded booking must belong to the selected business. There is no arbitrary staff-ID lookup.

SECURITY DEFINER readers and trigger helpers are confined to the private audit schema, with empty search paths and explicit grants. Public RPC wrappers are SECURITY INVOKER; anonymous execution is revoked. Private reservation table has RLS, no client grants and no policies. The source booking audit continues to record the actor, reason and final assignment/schedule. No accounts, memberships, rates, invoices, payment or earnings changes.

## UI

Selected-business desktop/mobile navigation links to Availability & calendar. Business-time-zone day/week agendas show own scheduled jobs (including unassigned Draft/Confirmed) and shared-cleaner busy time. Cancelled jobs are omitted. Booking detail links prefill availability for its saved time/duration, excluding its own reservation. The GET checker is advisory; saving is independently protected atomically in PostgreSQL. Availability means no overlapping assignment, not a promise about working hours, leave or travel.

## Validation and rollout

Local isolated PostgreSQL tests exercise cross-business overlaps, adjacent bookings, failed reschedule and multi-person reassignment rollback, cancellation release, completed history, private read denial, owner/manager/staff/anonymous boundaries, suspension and redacted RPC output. HTTP tests cover authenticated calendar access, date/view validation, day/week navigation, availability results, anonymous/staff/foreign denial and read-only behaviour. A disposable PostgreSQL 17 service in CI runs two independent psql connections: hold an uncommitted assignment, observe the contender waiting on a database lock, commit the first, require a sanitised exclusion error and unchanged version on the second. This test requires T16_TEST_DATABASE_URL, restricted to localhost/faraios_t16_test; local runs without that isolated database skip it explicitly. It provisions no cloud database and has no production credentials.

Database change: `database/availability-draft.sql`. FaraiOS staging only; no Shalean/Bokkie production system or production migration. Preflight existing interval overlaps before application. Validate existing booking digests before/after. A SHARE ROW EXCLUSIVE lock is acquired before backfill, blocking booking writes until backfill and trigger installation commit together; reads may continue. Apply database before enabling application routes. Recovery: stop new scheduling writes and revert application release, retain reservation table and constraint while diagnosing; never disable the constraint while accepting booking writes. Remove only with an explicitly reviewed replacement and reconciliation. Full environment recovery remains T11.

Current decision: CONDITIONAL PASS for local preparation; T16 In progress pending CI/review, actual concurrent staging checks and browser acceptance.

## Staging verification — 19 October 2026

Applied availability_and_calendar only to FaraiOS staging, xdmfyrsauvqznkloroxg. Lock correction from PR47 initial review is included; application/schema re-review on 67665cd found no findings. Syntax and 44 focused tests passed; CI462/465 passed 101 tests before adding the independent-connection test. Final CI/review for that addition remains a separate gate.

All five pre-existing bookings are unchanged: digest 50d09e12a0c1ebf04487742d1645a8d3 before/after migration and after fixture cleanup. Two historical cleaner reservations were backfilled. Two labelled synthetic fixtures cloned only existing authorised Office inputs, with no service to deliver: Shalean 73fbc9c1-1133-4bf8-be8a-ac9f4488aa6e, Bokkie d9dfe5f9-ac60-4e15-92c6-ce7c1af791e9. Owner assignment succeeded; Bokkie-only manager assignment of the shared cleaner at the overlapping time failed with sanitised 23P01. Manager calendar exposed exactly one foreign busy interval with only staff_id/starts_at/ends_at. Own availability, adjacent-slot availability, foreign-business exclusion denial, private-table denial, staff denial, anonymous denial and failed-write/version rollback assertions passed in a rolled-back acceptance transaction.

Parallel MCP requests could not establish an observed overlapping transaction: the connector serialised them. Do not count these calls as actual concurrent-transaction proof. That requirement is exercised by the independent PostgreSQL connections in CI. Both synthetic staging fixtures were cancelled afterwards, with no test reservation left. No customer messages, accounts, memberships, price configuration, production or financial changes.

Security advisors report an intentional INFO for the private reservation table having RLS with no policies/no client grants; [linter explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). The existing identity_audit INFO and [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remain baseline findings. No new warning/error. Browser acceptance requires pulling the merged application and restarting the owner's local staging server. T16 remains In progress until that acceptance is recorded.
