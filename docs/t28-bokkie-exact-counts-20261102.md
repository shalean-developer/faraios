# T28 Bokkie exact count evidence — 2 November 2026

Source: owner ran SELECT COUNT(*) UNION ALL query in Bokkie Supabase project scsrxogumimsrtbnqeas and pasted aggregate output. This is owner-supplied query output, not connector-authenticated verification; no personal row values received. Individual counts are exact for the query execution, not an atomic multi-table snapshot.

| Record family | Prior pg_stat estimate | COUNT(*) |
|---|---:|---:|
| booking_cleaners | 2 | 2 |
| bookings | 77 | 77 |
| cleaners | 5 | 12 |
| credit_transactions | 0 | 9 |
| customer_profiles | 7 | 7 |
| customers | 0 | 101 |
| eft_payment_submissions | 0 | 0 |
| profiles | 13 | 21 |
| quotes | 161 | 161 |
| recurring_schedules | 0 | 0 |
| user_credits | 13 | 20 |

## Implications
- Previous row estimates for customers, cleaners, credit transactions and user credits were demonstrably stale. Never use estimated zero for exclusions.
- Customers are present (101); their relationship to 7 customer_profiles/21 profiles must be established through verified keys, never email-only.
- Zero recurring_schedules does not prove no future recurring obligations: check booking frequency, date and status aggregates.
- Credit transaction history and 20 user_credits records require liability/balance reconciliation and explicit treatment; no automatic settlement, zeroing or reissue.
- Exact counts cover only 11 of the 43 source tables. Other tables, auth/storage counts, foreign keys, financial totals and historic/future booking splits remain open.
- Live data was not imported, modified or downloaded. T28 mapping remains In progress; T29 rehearsal prohibited.

Next: readonly information_schema column names and key metadata for bookings, customers, customer_profiles, profiles, cleaners, booking_cleaners, recurring_schedules, user_credits, credit_transactions and quotes, then bounded aggregate future/date/status and financial checks using verified columns.
