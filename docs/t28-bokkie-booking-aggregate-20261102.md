# T28 Bokkie booking-status and recurrence aggregate — 2026-11-02

Owner-provided output of group-by status/payment_status/frequency/is_recurring with count and future-or-today count using 2026-11-02. No personal records or identifiers provided.

| Booking status | Payment status | Frequency | Recurring | Count | Future/today |
|---|---|---|---|---:|---:|
| confirmed | completed | one-time | false | 29 | 0 |
| confirmed | completed | weekly | true | 12 | 0 |
| completed | completed | one-time | false | 11 | 0 |
| cancelled | pending | one-time | false | 10 | 0 |
| pending | pending | one-time | false | 10 | 0 |
| pending | failed | one-time | false | 2 | 0 |
| completed | failed | one-time | false | 1 | 0 |
| pending | failed | weekly | true | 1 | 0 |
| confirmed | completed | bi-weekly | true | 1 | 0 |

Totals: 77 bookings, matching prior COUNT(*); 42 confirmed, 12 completed, 13 pending, 10 cancelled; 14 is_recurring true (13 weekly, 1 bi-weekly). Zero future-or-today among included rows. Original SQL WHERE excluded non-null non-ISO-looking dates: 77 total matching prior count suggests no excluded rows if snapshot unchanged, but independent same-query date-coverage proof and calendar date validity still pending. No current future booking proven by this result; no claim of no outstanding recurrence obligation. Zero separate recurring_schedules but embedded flags/fields exist.

Open: validate all dates and immutable recurrence group relationships, detect completed+failed payment anomaly (one), determine whether confirmed+completed-payment are historical visits versus work still pending. No status, invoice, funds, provider or booking changed. Do not generate visits/import or activate recurring worker.
