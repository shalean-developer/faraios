# T14 follow-up — Cleaning booking scope from live Shalean flow

Inspected 19 October 2026 at the owner's request, using the live booking UI without submitting a booking or proceeding to payment. This document records observed requirements, not implemented FaraiOS capability. It extends the current T14 foundation; T14 remains In progress.

Source entry points: https://shalean.co.za/book and the owner's Regular Cleaning address/rooms links. All six service-specific detail forms were inspected through the UI.

| Service | Observed scope fields |
| --- | --- |
| Regular Cleaning | Property type (House/Apartment/Townhouse), bedrooms, bathrooms, extra rooms; pets; equipment Yes/No with delivery/collection logistics fee |
| Deep Cleaning | Property type, bedrooms, bathrooms, extra rooms |
| Moving Cleaning | Property type, Move-in/Move-out, bedrooms, bathrooms, extra rooms |
| Airbnb Cleaning | Property type, bedrooms, bathrooms, extra rooms |
| Office Cleaning | Office size (1–5, 6–20, 21–50, 50+ desks), bathrooms |
| Carpet Cleaning | Property type, carpeted rooms, rugs, carpet type (Standard pile, Thick/shag pile, Berber/loop, Persian/delicate) |

Home room selectors offer bedrooms 0/1/2/custom 3+, bathrooms 1/2/3/custom 4+, and extra rooms 0/1/2/custom 3+. The bedroom custom dialog explicitly states that exact counts affect pricing and duration. Carpet room/rug counts also have custom options. Store exact counts rather than a capped display bucket.

Regular Cleaning was followed through Details, Schedule and Review. Observed common journey: saved/new property address and contact phone, optional booking for someone else; property/scope; pets and equipment request; optional add-on extras; once-off versus repeat; date/time; cleaner quantity and preference (business chooses or named cleaners); review of scope, equipment, schedule, extras, estimated duration and itemised price. Applicability varies by service; these must not become universal rules for other FaraiOS industries.

Regular extras observed: inside fridge, inside oven, laundry, ironing and interior windows. Office extras observed: kitchenette and sanitisation. Extras therefore need explicit service applicability rather than showing every active extra for every service. Regular Cleaning equipment was explicitly rechecked: a required Yes/No switch asks whether the business should bring equipment. Selecting Yes displays a delivery/collection logistics fee based on distance from the equipment base and changes the booking total. One observed address at 10.1 km showed R753 logistics (R500 base + R253 distance), increasing the R345 quote to R1,098. This single displayed example does not prove the complete rounding, minimum, route-distance or fee formula. The toggle was returned to No after inspection. Model equipment availability, base location and fee rules as business/service configuration; preserve the quoted equipment selection and charge in the booking snapshot. Repeat bookings remain T17 and payment remains the finance stages.

An observed Regular quote with one bedroom/one bathroom/no extra rooms displayed base R250 + bedroom R30 + bathroom R35 + service fee R30 = R345 and estimated 4 hours. This is one observed quote, not a complete tariff/duration schedule. Do not seed these prices, delivery calculations, credits or operational rules into Bokkie or use them as universal defaults. Owner-controlled business/service configuration and versioned snapshots must define actual rates and duration rules.

## Required FaraiOS extension

- Define service-specific Cleaning form profiles, including exact room counts, moving variant, office size and carpet scope. Avoid service-name string matching; the owner chooses a profile for a business-owned service.
- Extend service configuration for relevant room/size/type pricing and duration inputs. Monetary values must be explicit integer-cent configuration; no guessed rates or silent zero defaults. Version configuration and validate server-side.
- Configure which extras apply to which service. Add pets/equipment/contact/access fields where applicable and distinguish quantities from property room counts.
- Persist an immutable cleaning-scope snapshot and the applicable configuration version alongside the existing contact/address/price snapshots. Existing bookings must keep their original totals and show that older scope data was not captured; never backfill invented room counts.
- Render the right questions before date/team selection, then show a readable itemised review before confirmation. Calculate prices/durations server-side from scoped, approved configuration. Keep availability, recurrence, payments and equipment-delivery policy under their relevant acceptance gates.
- Test room/size/type variants, large exact counts, zero bedrooms/extra rooms where supported, invalid/foreign scope, service-extra applicability, price/duration snapshots and old-booking compatibility.

Current PR25 provides lifecycle, assignment, schedule and catalogue snapshots. It does not yet implement this service-specific Cleaning scope or its pricing/duration extensions. No live booking was submitted during inspection.

## Expanded per-service field inventory — rechecked 19 October 2026

The six detail journeys were rechecked beyond the first room screen. This inventory confirms visible fields/options and conditional detail screens; it is not a claim that all tariffs, duration formulas, recurrence branches, slot-availability rules or checkout behaviour have been reverse-engineered or implemented.

| Service | Property/scope | Further required/detail questions | Observed optional extras |
| --- | --- | --- | --- |
| Regular | House/Apartment/Townhouse; exact bedrooms, bathrooms, extra rooms | Pets; bring equipment Yes/No; Yes adds distance-based delivery/collection quote | Inside Fridge, Inside Oven, Laundry, Ironing, Interior Windows |
| Deep | House/Apartment/Townhouse; exact bedrooms, bathrooms, extra rooms | Last professional clean: Never/unsure, 6+ months, 3–6 months, 1–3 months; pets | Balcony cleaning, Garage, Outside windows |
| Moving | House/Apartment/Townhouse; Move-in or Move-out; exact bedrooms, bathrooms, extra rooms | Furnished/empty; pets present during the clean. Both Move-in and Move-out detail branches inspected | Balcony cleaning, Garage, Outside windows |
| Airbnb | House/Apartment/Townhouse; exact bedrooms, bathrooms, extra rooms | Fresh linen available or no linen change; key/access method; optional access instructions | Inside Oven, Laundry, Interior Windows, Welcome Setup, Post-clean Photos |
| Office | Office size: Small 1–5 desks, Medium 6–20, Large 21–50, Enterprise 50+; exact bathrooms | Scope and applicable extras share the details screen | Kitchen (shared kitchenette), Sanitisation |
| Carpet | House/Apartment/Townhouse; exact carpeted rooms and rugs; carpet type | Visible stains Yes/No; observed Yes updates the estimate | Mattress |

Pet choices observed in Regular: No pets, Dogs, Cats, Dogs & Cats, Snakes, Lizards. Other services' pet option lists must be validated against their configured choices before implementation; their pet fields were observed but not every option menu repeated.

Airbnb key/access choices: Lockbox, Smart lock/code, Meet in person, Managed by agent. Instructions support arrival, parking, concierge, key-return and access notes. Treat access instructions as sensitive operational information.

Carpet type choices: Standard pile, Thick/shag pile, Berber/loop, Persian/delicate. Carpeted rooms offer 1–5 and custom 6+; rugs offer 0–3 and custom 4+. Exact counts are pricing/duration inputs. Carpet scheduling goes directly to date/time and explicitly states that time is calculated from carpeted rooms and rugs; do not assume it uses Regular's frequency screen.

Only Regular's equipment toggle was observed. Other service detail screens had no equivalent equipment selector in the checked paths; this does not establish whether equipment is included, unavailable or governed by another policy. Equipment policy/availability must be explicit per service and business.

### Shared booking record requirements

- Selected business and service/profile/configuration version.
- Customer or booking-for-someone-else contact, property address and contact phone; private access instructions where applicable.
- Exact service-specific scope and optional extras with quantities where supported.
- Explicit equipment selection when offered, equipment base/distance/fee quote evidence and immutable fee snapshot.
- Service-appropriate frequency (one-off first; recurrence T17), date, start time and timezone.
- Required/selected cleaner quantity, automatic business allocation or named preference, subject to future availability validation.
- Estimated duration and itemised, versioned price (base, scope adjustments, extras, equipment logistics, service fee, applicable adjustments), reviewed before confirmation/payment.
- Booking lifecycle/assignment/history from PR25, kept independent of payment and invoice status.

### Remaining verification before a full parity claim

Confirm authoritative business/service pricing and duration configuration, exact custom-count bounds, equipment distance/minimum/rounding policy, service-specific recurrence availability, all pet choices, availability/cleaner-slot logic and checkout validation/payment outcomes. No production booking/payment was submitted in this inspection. The field inventory is recorded; the Cleaning-form implementation and those acceptance checks remain open.

## Implementation follow-up

The six office booking profiles, explicit business pricing/duration configuration, allowed extras, equipment policy and immutable scope/configuration snapshots are implemented in this branch. See `cleaning-profiles.md` for configuration, calculation, limits and acceptance boundaries. The observations above remain source evidence; they are not authoritative tariffs. T14 remains In progress until owner configuration and real staging acceptance.
