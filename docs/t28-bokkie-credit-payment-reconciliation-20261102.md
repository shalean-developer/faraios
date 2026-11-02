# T28 — Bokkie credit and payment reconciliation gate (2026-11-02)

Scope: read-only owner-executed aggregate metadata and finance checks for `scsrxogumimsrtbnqeas`. Prior exact counts: `user_credits` 20, `credit_transactions` 9, `bookings` 77, `eft_payment_submissions` 0. Existing booking fields `payment_status`, `payment_provider`, `payment_reference`, `paid_at`, `total_amount`, `tip_amount`; existing ledger fields `transaction_type`, `status`, `amount`, `balance_before`, `balance_after`. **user_credits schema not yet provided**, therefore no guess as to its amount/balance column.

## Operator read-only queries

```sql
-- T28 metadata only: identify actual column types before reading financial sums.
SELECT table_name, ordinal_position, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
 'user_credits','credit_transactions','bookings',
 'eft_payment_submissions','payment_methods'
)
AND (
 table_name <> 'bookings'
 OR column_name IN ('id','total_amount','payment_status',
                   'payment_provider','payment_reference','paid_at',
                   'status','service_fee','tip_amount')
)
ORDER BY table_name, ordinal_position;

-- T28 aggregate only: no names, references, or user IDs.
SELECT payment_status, payment_provider, status, COUNT(*) AS bookings,
 COUNT(*) FILTER (WHERE payment_reference IS NOT NULL
                   AND btrim(payment_reference) <> '') AS with_reference,
 COUNT(*) FILTER (WHERE paid_at IS NOT NULL) AS with_paid_at,
 SUM(total_amount) AS booked_amount,
 SUM(tip_amount) AS tips
FROM public.bookings
GROUP BY payment_status, payment_provider, status
ORDER BY payment_status, payment_provider, status;

-- T28 aggregate only: credit ledger totals by status and type.
SELECT transaction_type, status, COUNT(*) AS transactions,
 SUM(amount) AS total_amount,
 COUNT(*) FILTER (WHERE balance_before IS NULL
                    OR balance_after IS NULL) AS missing_balance_snapshots
FROM public.credit_transactions
GROUP BY transaction_type, status
ORDER BY transaction_type, status;
```

Never provide customer names, emails, phone numbers, user IDs, payment reference values, tokens, account numbers, or private row contents. Aggregated totals are preliminary, not proof of provider settlement. No financial action is authorised.

## Reconciliation gates
1. Read user_credits column metadata and then prepare precise sum of balances by status with null/negative check; do NOT infer that 20 rows equal 20 outstanding liabilities.
2. Compare 9 credit transactions by type/status and balance snapshots; investigate double credits/adjustments through approved confidential source review. Do not claim ledger sum equals balance without accounting for opening balances, failed/reversed entries and linked user aggregates.
3. Group 77 bookings by payment_status/payment_provider/status with total amounts, reference-presence and paid-at-presence counts; separately reconcile with payment provider and accounting records if available. A status string is not settlement evidence.
4. Determine whether any credit/voucher scheme remains live, has unredeemed obligations, or stays on Bokkie; explicit owner disposition required if no V1 equivalent. Preserve accounting history and original evidence.
5. In T28 mapping only, record source→target or retain-in-place disposition; do not create transactions, zero balances, resend messages or initiate import. T29 remains prohibited.

**Status:** Ready for owner to run read-only query. Results not received; T28 acceptance blocked.
