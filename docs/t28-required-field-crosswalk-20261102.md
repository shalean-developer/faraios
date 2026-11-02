# T28 final field-crosswalk evidence addendum — 2 November 2026

Evidence boundary: connected FaraiOS staging project `xdmfyrsauvqznkloroxg` read-only information_schema metadata, earlier connected Shalean production `paqjwfulwywtsyyvdxrq`, and Bokkie owner-supplied schema/aggregates. This is a **mapping contract, not migration or exhaustive equivalence proof**.

| Required data family | Verified source fields / identity | Verified FaraiOS V1 target fields | Transformation / acceptance gate |
|---|---|---|---|
| Shalean customers | customers.id, auth_user_id, primary_email/normalized_email; bookings.crm_customer_id; recurring_bookings.customer_id references auth.users | business_customers.id,business_id,name,email | Per-business scoped source-ID crosswalk; independent auth→CRM relationship verification; one source booking remains Auth-linked but no CRM match |
| Bokkie customers | customers.id, first_name/last_name/email/phone; bookings.user_id/contact_*; profiles/customer_profiles distinct | business_customers.id,business_id,name,email | Keep separate identities, no email-only linking; verify keys/ownership and historical booking references |
| Addresses | Shalean customer_saved_addresses and booking address snapshot; Bokkie booking street_address/suburb/city/access fields | customer_addresses.id,business_id,customer_id,address_line; one_off_bookings.address_snapshot | Preserve exact site/access notes, privacy and historical snapshot; no invented normalized match |
| Bookings | Shalean bookings.id,status,date/time TEXT, booking_snapshot, amount_paid_cents, total_price; Bokkie bookings.id,booking_reference,status,scheduled_date/time TEXT, pricing_summary and total_amount NUMERIC | one_off_bookings.id,business_id,customer_id,address_id,address_snapshot,price_lines,total_cents,currency,status | Explicit source-scoped external-key ledger required (not yet installed); decimal ZAR→integer cents with checked rounding; status and date/time validation; no silent repricing or payment-verified assumption |
| Recurrence | Shalean recurring_bookings.customer_id(auth),frequency,status,next_run_date; Bokkie bookings.is_recurring,group_id,parent_booking_id,frequency; Bokkie recurring_schedules count 0 | recurring_schedules.id,business_id,source_booking_id,status; one_off_bookings.recurring_schedule_id,occurrence_date,revision | Owner-approved SHA-REC-01 and BOK-REC-01; preserve generated visits/source IDs/cursors; single writer, never infer active state from null end-date |
| Quotes/invoices | Shalean sales_documents/monthly_invoices.total_amount_cents,balance_cents,crm_customer_id; Bokkie quotes count 161, fields not verified; booking amount fields | business_quotes.id,business_id,customer_id,address_id,status; business_invoices.id,business_id,booking_id,customer_id,source_quote_id,total_cents,currency,external_invoice_id | Verify Bokkie quote columns, tax, versions and accepted actor; monthly vs single document lifecycle; preserve T19 Zoho external references, no invented issuer status |
| Payments | Shalean payment_transactions.entity_type,entity_id,booking_id,settlement_status,amount_cents; Bokkie bookings.payment_provider,status,reference,paid_at; credit_transactions and user_credits | Existing T20/T21 payment/EFT support plus business_invoices and T27 reporting | 89 monthly invoices + 33 sales documents source entity links valid, one booking-labelled unmatched retained EX01; provider evidence not a status string; no double count |
| Staff/earnings/payout | Shalean cleaners, booking_cleaners, cleaner_earnings.amount_cents/status, cleaner_payouts.total_amount_cents/status; Bokkie cleaners 12, booking_cleaners 2 and booking earnings fields | staff_profiles.id,business_id,user_id; existing T18/T22/T23 modules | Explicit memberships, history, agreed pay rule versions and frozen payout evidence; no fabricated bank transfer |
| Business ownership | Each Shalean/Bokkie source system and verified source provenance | business_memberships.business_id,user_id,status and all business-owned destination keys | No cross-business data import, no assumed sharing, review customer portal Auth identity separately |

## Approved decisions
T28-BOK-DEV-01, T28-BOK-REC-01, T28-SHA-REC-01, T28-SHA-LEG-01, T28-BOK-CREDIT-01. The Bokkie positive R64.75 credit remains in its existing source under approved protected servicing policy; no actual servicing action authorised.

## Still open / cannot claim
- No direct Bokkie connector proof for complete column/FK/source file inventory; owner-provided aggregates only.
- Shalean 245/245 and Bokkie 43/43 *name* classifications do not independently prove every field transform or historical obligation.
- Unmatched source Shalean booking-labelled payment and separate Auth-to-CRM relationship remain open, retained without repair.
- Exact provider settlement and target crosswalk IDs/complete line/credit balances require private record-level evidence and owner-approved future gate.
- Files/storage metadata, no-change fingerprints and final evidence review remain open.
- T28 acceptance **NOT READY**, T29 untouched; no production records copied or modified.
