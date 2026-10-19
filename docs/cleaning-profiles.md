# Cleaning booking profiles

Implementation for the T14 extension. This is an office one-off booking flow, with business-owned configuration. Live Shalean prices were not imported. Existing bookings have no invented room counts; their original snapshots remain intact.

## Configure a service

In Services, prices and extras, edit a service, choose the relevant cleaning profile and save. Reopen it to enter its pricing and duration rules. Profiles require fixed base pricing. The catalogue price is the base visit price; the service fee is separate. Every option and count requires explicit additional cents and minutes, including zero when no addition applies. A saved profile without configuration is blocked from new bookings.

Choose the allowed active extras from the same business and enter additional minutes for each. Extras use their own catalogue rates, quantities and version snapshots. Deleting/deactivating an extra prevents new selection; old bookings remain unchanged. Managers can book with the configured rules; only owners can change catalogue configuration.

Choose an equipment policy explicitly: included, customer supplies equipment, or optional distance delivery. Optional delivery requires a base location, base fee, cents per kilometre, minimum fee and extra minutes. Fee = max(minimum, ceil(base + distance × rate)). This is a configurable FaraiOS rule, not an inferred claim about Shalean's existing formula. The office must record distance and its source; no route or distance provider is connected.

## Book and review

Choose the customer, then the service. A cleaning customer must have a saved contact phone; create a separate customer/contact when booking for someone else. Choose an active address for that customer. The profile shows the appropriate room counts and choices. Counts are exact integers up to 100; bedrooms, extra rooms and rugs allow zero, while bathrooms and carpeted rooms require at least one. Airbnb includes optional sensitive access instructions. Office does not request residential bedrooms; Carpet uses carpeted rooms and rugs.

The database calculates the draft's itemised price and estimated duration from base, scope, extra and equipment rules. Supported duration is 15–1440 minutes and total is limited to the existing integer-cent range. Working-hours validation uses the calculated duration. Reopen the draft to review all scope answers, equipment policy, original estimated duration and itemised total before confirming. Availability/overlaps remain T16; recurring bookings remain T17; payments remain separate.

The complete service configuration and catalogue version, scope, equipment evidence, original duration, prices, customer and address are snapshotted. Subsequent catalogue edits do not alter a booking. Scope cannot be edited after saving; cancel/recreate an incorrect draft. Existing rescheduling supports a reasoned operational duration change while retaining the original estimated-duration snapshot.

## Database order and verification

Apply `database/cleaning-profiles-draft.sql` after the existing catalogue, customer and booking/context migrations. Existing data is retained; no business rates or profiles are automatically assigned. Preparation runs before the existing booking validator so calculated duration is checked against working hours. The final quote adjustment runs after validation, before the audit trigger records the completed row. All functions use invoker permissions and an empty search path; existing catalogue/booking RLS and audit policies remain in force.

Tests cover all six profiles and every listed choice, count boundaries, service-specific form rendering, explicit configuration, tenant/role denials, allowed extras, extra duration, equipment distance evidence/minimum/rounding, calculated-duration working-hours rejection, duplicate-request scope comparison, immutable snapshots and compatibility with legacy bookings.

Visible field inventory is in `cleaning-booking-requirements.md`. This implementation does not claim full parity with live pricing formulas, route calculation, recurring availability, checkout or payment outcomes. Owner-entered prices/durations and real staging browser acceptance remain necessary before T14 is accepted.
