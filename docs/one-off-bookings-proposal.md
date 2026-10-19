# T14 — One-off bookings: proposed acceptance contract

Prepared 19 October 2026 after owner instruction to proceed. T12 and T13 are accepted. This proposal does not activate booking operations or change business data. The approved blueprint explicitly leaves final lifecycle and financial policy choices open.

## Proposed office flow

1. Select one authorised business and one of its active customers/addresses.
2. Select an active service, date, start time, estimated duration and explicit timezone from business settings. Store UTC start/end alongside the timezone. Office entry outside working hours warns and requires an explicit override reason.
3. Review and save a Draft. Show the customer, address, service, quantity and price before confirmation. A manager cannot change catalogue prices.
4. Confirm the booking independently of payment status. Confirmation means the office accepts the job; it does not record payment or settle an invoice.
5. Assign active staff explicitly belonging to the selected business. Remove/reassign before starting with audit history. No automatic cross-business sharing.
6. Start the assigned booking, then mark it Completed. Completion requires a nonempty assignment. Staff self-service and detailed teams/availability are later stages.

Proposed transitions: Draft → Confirmed → Assigned → In progress → Completed. Draft, Confirmed and Assigned may be Cancelled with a required reason. Completed and Cancelled are terminal; no silent reopen. Cancel/reschedule In progress is excluded until an exception process is approved. Cancellation records the operational result only; no fees/refunds are calculated.

Allow rescheduling Draft, Confirmed or Assigned with required reason. Preserve old/new dates and assignments in audit history. No automatic customer messages. Assignment overlap detection/calendar acceptance remains T16; scheduling must not be represented as availability-verified before that work.

## Proposed pricing

Fixed service: exactly one catalogue rate. Hourly/per-unit service: an explicit positive whole-number quantity multiplied by that rate; label hours/units accurately. Fractional quantities require a later explicit rule. Extras are explicitly selected with the same fixed/hourly/per-unit interpretation; no automatic applicability assumptions. Owner reviews configuration; staff allocation does not multiply the customer price.

Store immutable price lines: business, catalogue ID/version, name, pricing model, unit label, unit rate, quantity, currency and line total. Store an immutable customer/address snapshot for the booking as well as scoped references; later contact/catalogue edits must not rewrite an existing booking. No discounts, taxes, earnings, cancellation charges, payment confirmation or financial settlement are inferred. T04 still requires decisions for those affected areas.

## Security and integrity requirements

Owner/manager access only at this increment. Scope every customer, address, service, extra, booking and assignment to its business; database foreign keys and RLS must reject foreign links. Server revalidates memberships per request. Database enforcement must reject inactive/foreign assignees and invalid lifecycle changes, including direct API writes. Snapshot prices must be created from authorised catalogue records in a transaction, not trusted browser totals. Require optimistic versions for mutations and an idempotency key for booking creation. Audit actor, timestamp, business, changes and reasons atomically.

## Acceptance

Prove office create/reload/confirm/assign/reschedule/start/complete and cancellation separately for Shalean and Bokkie. Test forged scope, foreign addresses/catalogue/assignees, staff/anonymous denial, inactive memberships, stale changes, duplicate submission, terminal transitions, immutable snapshots and audit. Real browser acceptance follows isolated tests, review and staging checks. No production migration or payment activation.

## Decisions awaiting owner confirmation

- Use the proposed lifecycle, terminal states and pre-start-only reschedule/cancellation rules.
- Permit office confirmation before payment, with payment state separate and no payment claims.
- Use fixed rates once and explicit whole-number hours/units; extras selected explicitly.
- Warn and require an override reason for office bookings outside working hours.

Gate: implementation of these proposed business rules waits for owner confirmation. Existing foundations/customer records remain unchanged.
