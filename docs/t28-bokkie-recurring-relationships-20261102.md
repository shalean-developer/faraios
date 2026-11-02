# T28 — Bokkie recurring relationships, owner-supplied aggregate (2026-11-02)

Data source: Bokkie project `scsrxogumimsrtbnqeas`, owner-executed read-only aggregation on `public.bookings`.

| frequency | status | bookings | distinct_groups | missing_group | no_end_date | end_date_today_or_later | linked_to_parent |
|---|---|---:|---:|---:|---:|---:|---:|
| bi-weekly | confirmed | 1 | 1 | 0 | 1 | 0 | 0 |
| weekly | confirmed | 12 | 4 | 0 | 12 | 0 | 8 |
| weekly | pending | 1 | 0 | 1 | 0 | 0 | 0 |

Totals: 14 recurring flagged, 5 non-null groups, 1 ungrouped, 13 confirmed with null end dates, 8 parent links in weekly confirmed bookings. Pending ungrouped has a non-null end date earlier than 2026-11-02 (the query does not disclose its exact end date).

**Do not conflate end-date null with active agreement.** No future visits are recorded, but generation status and agreement intent are not proven. Preserve existing bookings and group/parent identities. Business owner must classify each of the five groups and one ungrouped booking as continuing/ended/requires-review based on source evidence; do not automatically import schedules or generate visits in T28.

No source mutation, import, payments or notifications.
