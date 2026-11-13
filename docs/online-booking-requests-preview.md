# Online booking requests — FaraiOS New

Owner scope: 13 November 2026. Base main PR16 f28830d373b77b70ca6ff2e4c1f1248ecfdcf663. Inspected branch docs/private-style-release-20261113 production closeout: authenticated styling PASS. Fresh Supabase rxelmugnucfajrqmphhe only. No production release authorized.

## Smallest complete implementation

Published /b/{slug} links to ?booking=1. One published service, contact, address, preferred future date/time and requirements. Existing integer minor-unit prices and zero-decimal currency presentation retained. Fixed / From / Quote required shown; service/currency/zone snapshot verified again transactionally on submit. Stale price/zone/service changes reject rather than silently reprice. Request remains Pending until owner review; no capacity reservation, payment or notification. Desktop summary sticky in flow; mobile compact expandable summary above form, never fixed over controls. No sticky summary on private/manual booking pages.

New Requests sidebar page offers review, decline, create/open quote, accept, and create/open booking. Quote action copies customer/items to the existing quote editor and links the enquiry. From/quote modes require a customer-accepted quote. Fixed requests can be owner accepted at their captured price. Owner acceptance and conversion require a review checkbox. Atomic conversion copies address, preferred instant, saved zone, service duration and agreed document. Per-business serialization shared with existing booking conversion, unique quote/bookings links and repeat conversion return the original booking, including cancelled history. Existing quote conversion detected and linked without modifying it. Linked customer ID retained where present. No matching customers by name.

A past preferred instant cannot become a booking through this flow; owner must review with the customer. This version does not provide availability selection or request rescheduling. Confirmations are handled by the owner outside this application; there are no automatic messages.

## Security and schema

Additive CLI-generated migration 20261113183501_online_booking_requests. Preview gate true; live gate false. No existing records updated. Owner-only SELECT RLS; no direct DML/anonymous table access. Invoker public RPCs delegate to narrow unexposed request_private functions, fixed search_path and explicit owner/is_anonymous checks. Public function deliberately permits bounded anonymous intake through existing enquiry validation/caps (30 per business/hour; 5 per contact/hour), published row lock and UUID idempotency. PHP preserves separate public session, CSRF/origin, honeypot, 2-second age, one-hour expiry, body/field bounds and hashed-IP limit. No service role credentials. Session snapshot hash detects stale multi-tab forms; GET refreshes snapshot. Inputs escaped; JS uses textContent. No new dependencies in application.

## Local verification

PASS native disposable PostgreSQL17.11 / PHP8.4.27 HTTP tests/requests.py: live gate denial; malformed/past schedule, service, snapshot, zone, currency, contact and bounds rejection; identical retry; cross-owner/anonymous/direct writes denied; accept/decline/stale state; simultaneous duplicate conversion; exact price/zone/address/duration; quote/from requirements; existing quote lifecycle with customer acceptance and agreed amount; public timing/CSRF/contact retention/redirect/no repeat; owner page and cross-owner UI denial; helper403; unpublished page404. Auth/PostgREST transport simulated, database roles/RLS real.

Regressions PASS: bookings, quotes, enquiries, staff, invoices, dashboard. PHP lint PASS; whitespace PASS. No paid GitHub Actions. No Resend access or waitlist webhook/recovery checks. Local inherited harness initializes inert existing schema; no actual provider calls or waitlist journey execution.

## Hosted baseline before additive migration

Connected Allanux → fresh Plesk session: production faraios.git follows main PR16 automatically; faraios-accounts-preview.git manual /faraios.com/_accounts-preview at private-style branch; waitlist preview separate. Fresh Supabase history through dashboard_live_intake. Only public page: preview faraios-demo-cleaning; no live pages.

Existing full-row deterministic fingerprints (all environments, before new preview fixtures): bookings11 80c0426e875dbde667e90135a9a25b8e; invoices5 74925701dba50667f000f9cdff5ac737; payments9 37789d4f7c3ae4bf7a7f831a32fe57dd; staff5 9c2ea5a2b5cc12a8996348fe2192f76c. Compare existing-ID subsets after tests; new labelled preview request/bookings may be retained without changing original rows.

## Preview/release and rollback

Install additive schema through connected fresh Supabase SQL editor, record history after success; preview writes only. Deploy only manual accounts-preview repository from feature/online-booking-requests-20261113. Verify published fictional demo intake, owner review/quote/decline/accept/conversion, mobile layout and native rollback-only permissions. Retain preview fixtures; mark new verification bookings Cancelled after conversion. Do not modify existing bookings, invoices/payments/staff, publication or accounts. Show tested preview to owner before production.

Production NO-GO until owner preview review and explicit Deploy instruction. Future release must enable live request gate separately after approval. Rollback application to PR16; disable request_private.ingress for affected environment; retain new schema and all requests/quotes/bookings. Never drop/reset history. No homepage/waitlist changes.

Decision: PASS local validation; hosted preview verification pending.
