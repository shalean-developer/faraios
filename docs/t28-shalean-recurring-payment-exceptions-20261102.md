# T28 — Shalean active recurrence and unlinked payment exception closeout evidence

Date: 2 November 2026. Connected Shalean production Supabase project `paqjwfulwywtsyyvdxrq`. Read-only aggregate SQL only; no personal records, provider references, or booking identifiers extracted.

## 13 active recurring schedules
13 active: 10 weekly, 1 biweekly, 2 monthly; all have next_run_date >= 2026-11-02, none with invalid auth identity or saved address references. Other schedule statuses: nine cancelled and three paused; paused one has future next_run_date but no future linked visits, so never reactivate based on date alone.
Linked booking aggregates: active 563 linked bookings, 85 ISO-string future dated, 30 cancelled linked; cancelled 64 linked and zero future; paused 78 linked and zero future. Calendar validity and full per-visit identity snapshots remain outside this aggregate.
**Proposed owner decision T28-SHA-REC-01 — NOT YET APPROVED:** Shalean legacy scheduler remains authoritative until separately approved cutover; preserve 13 active schedules, all generated visits and 85 future linked visits with source IDs, agreements, historical prices, assignment, exceptions, generated_through/next_run cursor, status; prevent dual generation. Paused/cancelled remain paused/cancelled. No scheduling, imports or worker changes during T28.

## One booking lacking CRM foreign key
One booking has crm_customer_id NULL. Its legacy customer_id is nonnull and matches auth.users.id; zero match to public.customers.id (separate namespaces). It is not an orphaned auth user. Leave CRM relationship unresolved pending independent identity verification, avoid email-only matching and preserve booking. Do not create a customer or link identities as part of T28.

## 123 payment_transactions without booking_id
Total 517 payment_transactions; 394 linked, 123 unlinked. All unlinked have nonblank gateway_reference. Grouped settlement:
- pending + ignored: 55 records, 12,688,900 cents
- pending + not_synced: 15 records, 4,981,300 cents
- pending + synced: 29 records, 8,480,000 cents
- reversed + ignored: 1 record, 42,000 cents
- settled + synced: 23 records, 4,923,500 cents
Total unlinked: pending 99 / 26,150,200 cents (R261,502); reversed 1 / 42,000 cents (R420); settled 23 / 4,923,500 cents (R49,235). Gross stored amount 31,115,700 cents (R311,157). **Not net cash received, provider-confirmed settlement, or uncollected debt.** Booking-less payments may be monthly invoice, sales-document, credit, expense or other obligations. Classify with source schema relationships and provider evidence, not guessed booking links.

## Required next read-only checks
1. Inspect payment_transactions schema for linked monthly invoice, sales document, expense, credit and provider event FKs; group counts by independent links without exposing IDs.
2. Reconcile source booking/customer relationships using auth and CRM permission-safe identifiers privately. Do not auto-merge.
3. Obtain owner approval of Shalean recurring preservation/legacy single-scheduler approach, and separately classify unlinked payments.
4. Keep T28 open pending remaining mapped/retained source family decisions and final evidence. No import, no production mutation, no T29.

## T28-SHA-REC-01 — OWNER APPROVED 2 November 2026
The owner explicitly approved: preserve Shalean's 13 active recurring schedules and existing historical and future visits, original agreements, prices, and assignments. Keep Shalean's current scheduler authoritative until independently approved cutover; prevent duplicate generation; do not reactivate paused or cancelled schedules. This is a **mapping/preservation approval only**, not migration, schedule activation, production modification or T29 authority. The current source aggregate recorded 85 future visits linked to active schedules; that is evidence of the current source, not authorization to create them again. All source references, statuses, dates, historical policy versions and exceptions remain intact. Any actual cutover will need independently approved single-writer coordination and reconciliation.
