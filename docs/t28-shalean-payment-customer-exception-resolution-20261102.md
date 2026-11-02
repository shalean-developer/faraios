# T28 — Shalean payment and customer exception classification (2026-11-02)

Read-only connected Supabase production source project `paqjwfulwywtsyyvdxrq`. User authorised investigation and asked to fix without data loss, but T28's production nonmutation boundary remains in effect; no production record writes were made.

## 123 payment rows without booking_id
Metadata confirms payment_transactions has a polymorphic `entity_type` + `entity_id`, besides nullable `booking_id` and `expense_id`. A missing booking_id is not automatically broken.

Read-only classification:
- 89 `entity_type=monthly_invoice` rows, each entity_id matches public.monthly_invoices.id; 66 also carry expense_id.
- 33 `entity_type=sales_document` rows, each entity_id matches public.sales_documents.id; 32 also carry expense_id.
- 1 `entity_type=booking` row, entity_id does not match public.bookings.id, booking_id null. This record has an expense_id matching public.expenses, gateway reference present, settlement_status=pending and sync_status=ignored.

Result: **122/123 validly reference existing intended financial-document families**. Do not fabricate booking_id for them, and do not delete the payment rows. **One anomalous booking-labelled row remains to review**, preserving original reference and expense linkage. The 99 pending/23 settled/1 reversed counts are stored payment status only; no provider confirmation or bank reconciliation was performed.

## One booking with missing CRM customer link
The booking's crm_customer_id is NULL but its customer_id matches a real auth.users.id. This is an unresolved Auth→CRM identity relationship, not a missing Auth identity. Do not merge by email or automatically create/link a CRM customer. Verify ownership using source audit and independently confirmed customer evidence before proposing a reversible, strictly scoped link.

## Proposed mapping rules (not permission to update)
1. `payment_transactions.entity_type='monthly_invoice'` => retain and map source payment to monthly-invoice obligation/financial evidence; preserve original document and provider references.
2. `entity_type='sales_document'` => retain and map to sales-document payment evidence; preserve original amounts, links and statuses.
3. Booking-labelled unmatched row => quarantine for **mapping review only** (no database quarantine/write), classify against audited provenance and expense purpose before any change.
4. Missing CRM link => retain booking/auth identity; log mapping gap until independently established CRM relationship.
5. Do not infer success from gateway ref, synced status, or settled label alone.

## Remaining acceptance
One orphan-like booking entity, one Auth-to-CRM relationship, provider verification, existing source financial reconciliation, and completed T28 coverage/evidence. No production changes or T29 work.
