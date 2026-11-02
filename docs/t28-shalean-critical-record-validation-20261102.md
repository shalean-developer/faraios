# T28 — Shalean critical relationship, recurrence and finance mapping validation
Date: 2026-11-02. Read-only Supabase SQL through connected Shalean project `paqjwfulwywtsyyvdxrq`. No row identities, credentials, or personal information exported.

## Schema and relation identities
FK metadata confirms `bookings.crm_customer_id` -> `customers.id`; `bookings.recurring_id` -> `recurring_bookings.id`; booking payment/invoice/payout and selected-cleaner FK references; `payment_transactions.booking_id` -> `bookings.id`, `cleaner_earnings.booking_id` -> `bookings.id`. Import crosswalk cannot conflate the legacy `bookings.customer_id` and CRM `crm_customer_id`.

Read-only relationship count checks: zero broken nonnull `bookings.crm_customer_id` references, **one null CRM customer link**; zero broken nonnull payment booking references, **123 null payment booking links**; zero broken earnings booking links, zero null earning booking links. The 123 unlinked payment rows are NOT automatically erroneous (could be standalone/expense payments) and require classified source semantics.

Initial cross-join to `public.customers.id` showed all 25 `recurring_bookings.customer_id` unmatched, BUT subsequent independent identity check proved all **25 match `auth.users.id`**, zero match CRM customers, and zero match neither. Correct interpretation: **different identity namespace, not 25 orphan rows**. A verified auth-user-to-CRM-business-relationship crosswalk remains mandatory; email matching alone prohibited.

Metadata shows key historical money in cents on `monthly_invoices`, `payment_transactions`, `cleaner_earnings`, `cleaner_payouts`. Booking amount fields mix cents/integer and total_price/numeric; map each separately and never infer settled cash from booking gross or status alone.

## Recurrence
25 recurring schedule rows: 13 active (weekly10, biweekly1, monthly2), 9 cancelled (weekly7, biweekly2), 3 paused (weekly3). All **13 active** have future next_run_date >= 2026-11-02. One paused has a future next_run_date but must NOT be treated as active. Cancellation with a future/no end date must NOT be reactivated. Preserve original policy versions, generated visits and scheduler ownership; do not run generator in T28.

## Finance status aggregates: counts and stored amounts
These are **stored line/batch amounts only**, NOT proof of provider settlement or bank movement.
- `monthly_invoices`: draft 19 / 4,712,000 cents; sent 24 / 8,065,000 cents; paid 146 / 39,427,300 cents. Count 189.
- `cleaner_payouts`: cancelled 46 / 1,488,990 cents; frozen 64 / 11,292,110 cents; paid 70 / 9,342,820 cents. Count 180.
- `cleaner_earnings`: pending 645 / 17,907,980 cents; paid 228 / 6,552,210 cents. Count 873 (prior COUNT(*) reported 872; possible source concurrent write, not an integrity failure without a common snapshot).
Provider events, actual current outstanding and adjusted/frozen financial liabilities are not reconciled. Do not add these totals as cash receipts or as a single amount due.

## RLS metadata
`pg_policies` lists policies on selected booking, earnings, payouts, monthly invoices, payment and recurrence tables; a coarse role-name query shows no explicit anon/public pattern among sampled policies. No policy list was returned for `customers` from the examined query, but `relrowsecurity` is enabled. This is NOT proof of appropriate grants or access controls; do not claim denial tests or authenticated isolation.

## Remaining T28 evidence
Exact current source snapshot status/currency/provider reconciliation, source field mapping and transformation crosswalks, 123 unlinked payment transaction disposition, one booking missing CRM link, 13 active recurring schedules' intended cutover treatment, owner Shalean non-V1 retention choice, and full final evidence review. No mutation, deployment, migration or T29.
