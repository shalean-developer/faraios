# Cleaning booking profiles

Implementation for the T14 extension. This is an office one-off booking flow, with business-owned configuration. Live Shalean prices were not imported. Existing bookings have no invented room counts; their original snapshots remain intact.

## Configure a service

In Services, prices and extras, add or edit a service and choose the relevant cleaning profile. Its fields load without saving a catalogue record; enter its pricing and duration rules, then save once. With JavaScript disabled, use Load profile fields. Profiles require fixed base pricing. The catalogue price is the base visit price; the service fee is separate. Every option and count requires explicit additional cents and minutes, including zero when no addition applies. A saved profile without configuration is blocked from new bookings.

For profiles with pets, enter the service’s allowed pet answers and their rates/minutes explicitly. These choices are specific to that business-owned service; no pet menu is imported from Regular into Deep or Moving. Changing a profile clears the previous profile’s draft configuration and loads fields for the new profile before saving. Saved bookings retain their snapshots.

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

## Owner-accepted Shalean rules - 19 October 2026

The owner accepted the attached pricing/timing PDF and requested implementation. `config/shalean-approved-cleaning.json` records the six approved tariff configurations as business-specific data; the shared engine does not choose businesses or infer service profiles from names. Configuration is applied only to explicitly identified Shalean services using expected versions. Bokkie is unchanged. Carpet becomes a fixed R500 base visit with separate carpet-room/rug charges; Office's base becomes R300.

No additional service fee is introduced. Room charges apply to every entered count; no first-room allowance is deducted. Stains add R100 once per Carpet booking, with no extra duration specified. Shalean explicitly enables the optional linen-change feature for its Airbnb service. Other businesses retain their existing Airbnb questions and rules unless they enable and price that feature themselves. When enabled, the explicit linen-change Yes/No question applies: Yes adds R50 and 30 minutes and requires fresh linen availability. Pets are recorded with zero surcharge/minutes. Unpriced descriptive choices have zero automatic additions; assessment requirements still apply.

### Office assessments

A service can require office-estimated duration on every booking and mark individual scope answers as requiring assessment. The accepted Shalean configuration requires assessment for all Deep condition choices, furnished Moving jobs, and every Office booking (Office duration has no approved numeric formula). Enterprise Office quotes require the assessed additional amount. The configured subtotal is a starting price, not a completed assessment.

Equipment uses an explicit per-booking arrangement until a per-service included/customer-supplied policy or delivery tariff is approved. Customer-supplied equipment has no automatic delivery charge. Business-supplied equipment requires an office assessment covering the equipment/delivery decision and charge. No delivery base, per-km fee or minimum is guessed.

Before saving these cases, the office records an explicit additional charge in cents (including zero when assessment finds no extra charge), final total duration and assessment notes. The database validates these values, adds the charge to the configured subtotal, uses the final duration for working-hours checks, and snapshots the actor/time. It preserves the configured pre-assessment estimate separately from the final assessed duration; manually estimated Office jobs have no invented automatic estimate. For automatically timed services, assessment cannot shorten the configured estimate. The scope and assessment are immutable; correcting a quote requires cancelling/recreating the draft. Existing bookings remain unchanged.

Only existing, active, applicable extras are enabled. The existing Shalean Fridge hourly rate is retained for Regular and Airbnb; one whole-hour quantity adds 60 minutes. Other extras need explicit catalogue prices and durations before they can be enabled. This is not an import of any other business's catalogue.

Apply `database/cleaning-assessments-draft.sql` after the cleaning profile migrations. Update/restart the local application before browser acceptance: older application code cannot render the new assessment controls. Availability, recurring bookings, payments and public booking pages remain separate stages.

## Compact service setup

The owner editor now shows one service at a time. Basic name/price/team/status fields are separate from expandable booking questions, price/time rules, pets, equipment and allowed extras. Room additions use compact rows; descriptive-answer charges and assessment flags remain editable under advanced rules. Prices are entered in Rand, converted server-side to integer cents with the existing limits; legacy cent-based submissions remain supported. Existing profile configuration and booking calculations do not change.

Pets can be recorded with an explicit no-added-charge/time checkbox. Only configured answers are initially expanded; Add pet answer reveals another existing unused row up to the current limit of 20. Businesses with paid pet options keep their amounts and minutes. Without JavaScript, remaining answer rows are available through the Add more pet answers disclosure. Optional delivery fields and linen-change charges are progressively shown when relevant; selected extras expose their additional duration. Unused controls retain their values, and server validation remains authoritative. Invalid native controls expand their enclosing sections; rejected submissions keep entered prices, answers and checked extras.

No database migration or rate update is required. Round-trip tests cover every accepted service and confirm that the rendered form retains prices, duration, assessment flags, optional linen, equipment and extras. Browser layout/interaction acceptance still requires pulling and restarting the local application.

## Catalogue management

Services and Extras have compact comparison rows, category-specific Add actions, search/status filters and an applicability filter for Extras. Profile service prices are labelled as base prices. Confirmed Deactivate and Delete actions remain owner-only and version-checked. Focused creation/edit screens hide the list and offer Save and Cancel. No tariffs or business configurations are automatically changed by these UI improvements.
