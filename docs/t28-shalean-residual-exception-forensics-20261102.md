# T28 — Shalean residual exception forensic review (2026-11-02)

Read-only Supabase project `paqjwfulwywtsyyvdxrq`. This is T28 mapping evidence, not an authorized production data repair.

## One booking without crm_customer_id
- Booking has a valid `customer_id` linking to `auth.users.id` (previously verified).
- Against the *actual* `public.customers` schema, no matching `customers.auth_user_id` and no matching `customers.normalized_email` was found (aggregate counts each zero).
- One affected booking remains, so there is no unique existing CRM record to link.
- Source booking and its Auth ownership must be preserved; only independently verified office/customer evidence can support an explicit CRM linking/new relationship operation. Email alone is not sufficient evidence, and do not infer that a new CRM row is required.

## One unmatched booking-labelled payment
- One `payment_transactions` record, `entity_type=booking`, `booking_id IS NULL`, `entity_id` does not match a current `bookings.id`.
- Metadata indicates Paystack gateway, created date 2026-07-12, `settlement_status=pending`, `sync_status=ignored`; a gateway reference and gateway transaction ID are present (values never retrieved).
- Its `expense_id` references an existing `expenses.id`, but `entity_id` is not equal to that expense ID.
- No verified replacement booking or source-document relation exists. Preserve record, original references, settlement status and expense link; do not guess a booking, treat `ignored` as payment cancellation, or erase historical provider evidence.
- The 122 other payment records without booking_id are correctly represented as 89 monthly-invoice and 33 sales-document entity relationships; no change required.

## Safe handling
- **Mapping treatment:** retain both unresolved records with explicit lineage and exception flags, original source remains authoritative until independently verified business decision.
- **Production repair status:** NO-GO. No unique target record/authoritative provider or customer linkage proved; no SQL UPDATE/INSERT/DELETE, source migration or provider action performed. No rollback candidate can responsibly be prepared until an exact target and original-state evidence are available.
- Required later evidence: authenticated office/customer relationship verification and/or exact booking/provider transaction history; backup and before/after immutable snapshots, independent approval for any repair (outside T28), and recovery controls.
- T28 acceptance may only proceed if each required feature is mapped or its unresolved record is covered by an **explicitly approved transition**, not by falsely marking the source corrected. T29 remains Not started.
