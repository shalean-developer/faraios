# T28 — Bokkie field mapping evidence (2 November 2026)

## Provenance and completeness
Owner uploaded information_schema output from project `scsrxogumimsrtbnqeas`, 2026-11-02. **The delivered file ends after customers column 11.** It contains all **77 bookings columns**, **12 credit_transactions columns** and **11 customers columns**. The original query requested six tables, but **quotes, recurring_schedules and user_credits column rows are absent**, so they are NOT verified by this attachment. No personal row values were supplied.

## Source-to-V1 transformation candidates (NOT approved for import)
| Source evidence | Exact source columns | FaraiOS target / mapping rule | Validation or decision needed |
|---|---|---|---|
| Booking identity | id, booking_reference, parent_booking_id, recurring_group_id, recurring_sequence | Business-owned one_off_bookings with original-ID crosswalk; schedule/occurrence linkage where supported | Preserve original references and duplicate detection by source-project+source-ID, not global ID alone |
| Booking status | status, payment_status, job_progress, cleaner_response, paid_at | Separate booking/payment/assignment progress states and audit evidence | Distinct enum mapping required; never infer verified settlement solely from `payment_status` |
| Booking dates | scheduled_date TEXT, scheduled_time TEXT, alternative_date DATE, alternative_time TEXT, team_booking_date DATE | Visit timestamps in Africa/Johannesburg, independent alternative request history | Validate date/time parseability, daylight/offset handling, and time accuracy without changing original values |
| Recurrence | frequency, is_recurring, recurring_frequency, recurring_days JSONB, recurring_start_date, recurring_end_date, recurring_visit_count, recurring_notes | Existing T17 schedule and immutable generated visit mapping | Source recurring_schedules count zero; inspect booking-level recurring groups, existing future visits, generated visit references; no regeneration |
| Customer relationship | bookings.user_id UUID, bookings.contact_* fields, customers.id UUID, email/phone/first_name/last_name | business_customers, customer_addresses, independent customer-portal links | Do not link on email alone; verify exact keys and orphan counts; customers.total_bookings is TEXT and must not be authoritative without validation |
| Booking address | street_address, apt_unit, suburb, city, postal_code, access_instructions, parking_instructions | customer_addresses + immutable visit address/scope snapshot | Preserve access notes within business assignment permissions; no cross-business access |
| Service and scope | service_type, bedrooms, bathrooms, extras JSONB, selected_extras JSONB, extra_quantities JSONB, service_details JSONB, fitted_rooms_count, loose_carpets_count, rooms_furniture_status, office_size | T15/T16 catalogue, assessment, service scope and price snapshots | Explicit mapping of every Bokkie-specific service/extra; never inherit Shalean tariffs |
| Pricing | subtotal, frequency_discount, discount_code_discount, service_fee, tip_amount, total_amount, estimated_total, pricing_summary JSONB, cleaner_earnings, cleaner_earnings_percentage | T16 snapshots, T19 invoice, T22 earned amounts | Exact decimal-to-integer cents treatment, historical discount/fee/tip allocations; freeze historical agreed amount |
| Payments | payment_reference, payment_provider, payment_status, paid_at | T20/T21 verified provider event/EFT allocation references | Read-only provider reconciliation and distinct paid/verified/settled statuses; do not create a payment event from a text status |
| Cleaner/team | cleaner_preference, assigned_cleaner_id TEXT, assigned_cleaner_ids JSONB, cleaner_mode, cleaner_count, team_id | T18/T24 staff/assignment and explicit memberships | Reconcile assignments and work hours, confirm identity keys; preferences are NOT assignment |
| Credits ledger | credit_transactions.id, user_id, transaction_type, amount, balance_before, balance_after, payment_method, payment_reference, status, metadata JSONB, created_at, updated_at | No assumed direct V1 equivalent | Explicit owner decision on outstanding customer credit liability, original reference and audit retention; don't zero or reissue |
| Marketing lineage | source_page, utm_source, utm_medium, utm_campaign, form_version | Retain on website/source where not V1 | Preserve source where legally appropriate, not a reason to add marketing features |

## Next gates
- Request metadata-only missing `user_credits`, `quotes`, `recurring_schedules`, `customer_profiles`, `profiles`, `cleaners`, `booking_cleaners` columns and FK metadata.
- Read-only aggregate booking-by-status/payment/frequency, future-date parseability and count; no names, contacts, references or row payload.
- Read-only credit balance and ledger consistency, with no user identifiers, only grouped sums and anomaly counts.
- Record an explicit transition choice for any non-direct feature: archive/retain existing system, map into V1 without new functionality, or defer to separate approved scope. Do not mark T28 complete.

No SQL writes, migration, provider access, notification, payment or T29 work.
