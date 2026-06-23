# FaraiOS V3 — Revenue Engine

Version 3 adds quotes, invoices, customer payments, revenue reporting, and a customer portal on top of the existing V1 operations module and V2 booking engine.

## Financial system audit (pre-V3)

| Area | Pre-V3 state |
|------|----------------|
| Quotes | Not implemented (marketing CTAs only) |
| Invoices | Not implemented |
| Customer payments | `bookings.payment_status` schema only, never updated |
| Paystack | Platform/hosting subscriptions only |
| Revenue dashboard | Sum of completed booking `price_cents` (estimates) |
| Customer payment history | Hosting payments only |
| PDF documents | Not implemented |
| Financial emails | Booking emails only |
| Customer portal | Not implemented |

### Legacy / overlapping systems (unchanged, isolated)

1. **Booking pricing** — `bookings.price_cents` + `payment_status` (now updated when invoices are paid)
2. **Company SaaS billing** — `companies.subscription_status` + Paystack `product_type: website`
3. **Hosting billing** — `hosting_subscriptions` + `hosting_payments`

No duplicate quote/invoice tables existed; V3 introduces the first dedicated financial schema.

---

## V3 schema

Migration: `supabase/migrations/20260625000000_v3_revenue_engine.sql`

| Table | Purpose |
|-------|---------|
| `quotes` / `quote_line_items` | Quote engine |
| `invoices` / `invoice_line_items` | Invoice engine |
| `customer_payments` | B2C payment ledger |
| `financial_document_sequences` | Per-company `QTE-000001` / `INV-000001` numbering |
| `company_payment_settings` | EFT details, default deposit config |
| `customer_portal_tokens` | Secure customer portal access |
| `financial_audit_logs` | Audit trail for financial changes |

### Status flows

**Quotes:** `draft` → `sent` → `viewed` → `accepted` | `rejected` | `expired` → `converted`

**Invoices:** `draft` → `issued` → `partially_paid` → `paid` | `overdue` | `cancelled` | `refunded`

**Payments:** `pending` → `processing` → `paid` | `failed` | `cancelled` | `refunded`

---

## Architecture

```
Dashboard UI / Customer portal
  → Server Actions / Public API
  → lib/services/{quotes,invoices,payments,revenue-metrics}.ts
  → Supabase (RLS per company_id)
  → Paystack webhook (product_type: customer_invoice)
```

### Payment providers

Provider-based design in `lib/payments/`:

| Provider | Status |
|----------|--------|
| Paystack | Active (customer invoices) |
| EFT / bank transfer | Active (manual confirm in dashboard) |
| Stripe, Ozow, Peach, Yoco | Reserved in schema, not wired |

---

## API surface

| Route | Purpose |
|-------|---------|
| `PATCH /api/public/portal/[token]/quotes/[id]` | Customer accept/reject quote |
| `POST /api/public/portal/[token]/payments/initialize` | Start Paystack or EFT payment |
| `GET /portal/[token]/document/[type]/[id]` | Printable quote/invoice HTML |
| `POST /api/paystack/webhook` | Extended for `product_type: customer_invoice` |

---

## Dashboard navigation

Added under Operations:

- Quotes
- Invoices
- Payments
- Revenue
- Reports

---

## Customer journey

```
Lead → Quote (sent) → Accepted → Booking and/or Invoice → Payment → Completed job
```

Portal URL: `/portal/{token}` (token emailed when quote/invoice is sent).

---

## Security checklist

- [x] Business isolation via `company_id` + RLS on all financial tables
- [x] Paystack webhook signature verification (existing)
- [x] Customer invoice amount validation on webhook
- [x] Idempotent payment references (`provider` + `provider_reference`)
- [x] Portal access via unguessable tokens (service role only)
- [x] Financial audit logs for create/send/pay/convert actions
- [ ] Portal token expiry (column exists; optional enforcement)
- [ ] Rate limiting on portal payment endpoints (recommended)

---

## V3 implementation checklist

- [x] Database migration + RLS
- [x] Quote CRUD, send, accept/reject, convert to booking/invoice
- [x] Invoice CRUD, issue, numbering `INV-000001`
- [x] Customer payments (Paystack + EFT)
- [x] Deposit support (full / percentage / fixed on invoices)
- [x] Partial payments + invoice balance recalculation
- [x] Revenue dashboard (collected payments)
- [x] Reports (quotes, payments, monthly revenue)
- [x] Customer financial history on profile
- [x] Customer portal (quotes, invoices, payments)
- [x] PDF-ready HTML documents
- [x] Email notifications (quote sent, accepted, invoice issued, payment received)
- [x] Navigation updates
- [x] Unit tests for totals and deposits
- [ ] Apply migration to production Supabase
- [ ] E2E Paystack test with live keys
- [ ] Company payment settings UI in dashboard settings
