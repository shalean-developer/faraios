# T14 — Office one-off bookings

Owner approved proceeding on 19 October 2026 after reviewing the proposed contract, adding En route and Arrived. Implemented lifecycle:

Draft → Confirmed → Assigned → En route → Arrived → In progress → Completed.

Draft through Arrived may be rescheduled or cancelled before work starts, with a required reason. In progress can only become Completed. Completed/Cancelled are terminal. Office confirmation is independent of payment. No messages, invoice, charges, refunds, earnings or payouts are created by these transitions.

## Creation and snapshots

Choose one active customer/address and active service in the selected business, explicit whole-number quantities and optional extras. Fixed rates require quantity one. Save a Draft, review the immutable price total, then confirm. Database code reads catalogue rates/versions; browser totals and supplied snapshots are never trusted. Snapshots include customer contact details (not private office notes), selected address/access instructions and catalogue lines. Subsequent edits/deactivation of customers or catalogue entries do not change a stored booking. Prices cannot be edited on bookings at this increment.

Dates use local wall time and the business settings timezone (Africa/Johannesburg or UTC), persisted alongside computed UTC start/end. Estimated duration is 15–1440 minutes. Outside configured working days/hours or overnight bookings require an explicit override reason. No availability guarantee is claimed; calendar and overlap prevention remain T16.

## Assignment and access

Only owners/managers can use this office workflow. Assignment requires distinct active staff memberships in the selected business and at least the snapshotted service team size. A narrow, explicitly office-authorised read function in the private audit schema returns scheduling settings and active staff account labels for this business through a public SECURITY INVOKER wrapper. It cannot modify records or expose other businesses; anonymous execution is revoked. All writes run as the user's role with table RLS. Inactive staff cannot be assigned or advance an operational transition. Staff assignment can change only before departure, with a reason. En route/Arrived do not open staff portal access yet.

Business/customer/address composite foreign keys and database triggers enforce scope, immutable snapshots, transition order, team membership, reasons and version increments even through direct Data API writes. No client deletes. Audit-only internal triggers append actor, business, time and old/new booking records atomically.

## Request integrity

Creation uses a unique request key per business. Identical repeated creation returns the existing booking; a conflicting use returns 409. SQL uniqueness prevents duplicates under races. Mutations match business, booking ID and expected version; stale forms return 409. Browser form Origin checks and existing authenticated membership revalidation apply.

## Limits and open acceptance

List up to 200 bookings with a limit notice; direct booking details remain independently scoped. Customer/address/catalogue selectors retain the existing list caps. Booking/payment history reports, recurrence, cleaner profile management, actual calendar/availability and portals are later tasks. Full Auth/Storage/settings/customer/booking recovery remains open under T11; the existing identity-only rehearsal does not cover the growing schema.

Validation: exact quantity/idempotency/optimistic request tests; owner/manager HTTP create, confirm, assign, reschedule, En route, Arrived, start, complete, cancel, staff/anonymous/foreign-business/CSRF denial; isolated PostgreSQL lifecycle/links/roles/snapshots/working-hours/team/audit tests. Staging and real-browser acceptance are recorded separately. No production import or deployment.
