# T28 Bokkie finance source aggregates — 2 November 2026

Owner-supplied Bokkie Supabase information_schema for four tables and grouped booking payment counts/amounts. No row identifiers, customer PII, payment reference values or credentials received.

## Verified source schema
- user_credits: user_id UUID, balance NUMERIC, updated_at timestamptz
- credit_transactions: id/user_id, transaction_type, amount, balance_before, balance_after, payment_method, payment_reference, status, metadata, created_at/updated_at
- eft_payment_submissions: id/user_id, amount, reference_number, proof_url, status, verified_by/verified_at, rejection_reason, timestamps
- payment_methods: id/user_id, type, name, last_four, brand, expiry_date, is_default, metadata, is_active, timestamps. Do not retrieve payment-method rows.

## Supplied aggregate, all 77 bookings
| payment_status | provider | count | with_ref | with_paid_at | booking value ZAR |
|---|---|---:|---:|---:|---:|
| completed | null | 47 | 47 | 0 | 21526.75 |
| completed | paystack | 6 | 6 | 1 | 9572.00 |
| failed | null | 3 | 3 | 0 | 1221.00 |
| failed | paystack | 1 | 1 | 0 | 1334.00 |
| pending | null | 16 | 0 | 0 | 12980.00 |
| pending | paystack | 4 | 0 | 0 | 4850.00 |

Derived: payment-status completed 53 / R31098.75; failed 4 / R2555; pending 20 / R17830; total booking value R51483.75. These are booked values, NOT proved cash receipts, issued invoices, collectible amounts or provider settlement. All 53 completed have a reference, only 1 has paid_at; 52 need evidence treatment. Four failed statuses have refs (attempt IDs possible). Source payment methods must not be copied.

## Read-only next checks
- Aggregate `user_credits` COUNT, SUM(balance), negative/zero/null balance counts; do not expose user IDs. For `credit_transactions`: group by transaction_type/status with COUNT/SUM(amount), missing balance snapshots, and arithmetic inconsistency counts; compare total balances only after identifying ledger semantics.
- Cross-tab booking status vs payment status to separate cancelled/pending bookings from collectible balances.
- Provider check: no automatic assertion that `payment_reference` means paid; verify with authorised Paystack/Zoho records under separate read-only provider access.
- Transition choice required: credits are a potentially live customer obligation; either carry forward through an approved V1 financial mechanism or maintain an owner-approved legacy servicing/settlement path. Do not zero, recreate or refund balances.

T28 mapping only. No financial mutation/import/notification/T29.
