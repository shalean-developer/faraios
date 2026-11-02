# T28 Bokkie recurring group history — 2 November 2026

Source: owner-run read-only aggregate in Bokkie Supabase project `scsrxogumimsrtbnqeas`. Temporary group numbers derive from ORDER BY first_visit,last_visit,visits and are **not durable crosswalk identifiers**; ordering ties mean groups 1–4 may swap on a later run. Never rely on them for migration identity.

| Temporary group | Visits | First date | Last date | Confirmed | Completed | Cancelled |
|---|---:|---|---|---:|---:|---:|
| 1 | 3 | 2026-01-14 | 2026-01-28 | 3 | 0 | 0 |
| 2 | 3 | 2026-01-14 | 2026-01-28 | 3 | 0 | 0 |
| 3 | 3 | 2026-01-14 | 2026-01-28 | 3 | 0 | 0 |
| 4 | 3 | 2026-01-14 | 2026-01-28 | 3 | 0 | 0 |
| 5 | 1 | 2026-09-24 | 2026-09-24 | 1 | 0 | 0 |

Totals: 13 grouped confirmed historical visits, 0 completed/cancelled across these groups; 1 additional pending recurring-flagged booking without group (from earlier owner counts). All group last-visit dates predate 2026-11-02. This **does not establish** whether actual services were performed, whether existing statuses are stale, or whether a recurrence agreement remains live.

Acceptance impact: owner/office must verify work completion and continuation for each source group and ungrouped booking from operational evidence. Do not automatically complete, cancel, regenerate, reprioritize, migrate or invoice visits. Preserve source identifiers, status, history and parent links.

Next: perform decision review through original Bokkie admin system, with an approved per-group continuation/ended/review transition, then reconcile finances/customer credits separately. No source mutations or T29 import.

## Owner transition decision — 2 November 2026

The owner explicitly instructed: **“For T28 Bokkie, preserve all five recurring groups as historical records and leave their completion and future agreement status under review pending operational evidence.”**

**Decision T28-BOK-REC-01 — APPROVED for mapping only.** Preserve all five groups and their 13 historical grouped bookings, with original source IDs, dates, statuses, parent links and original recurrence group links. Preserve the sixth, ungrouped recurring-flagged booking separately for review. No source booking status, payment status or recurring agreement is reclassified. Do **not** infer completed work, expired or active customer agreements, or generate future visits.

**Open acceptance qualification:** historical-preservation treatment is agreed; operational completion and continuation of each group and the ungrouped booking still require evidence and a specific disposition before declaring the recurrence transition fully resolved. This approval does not authorize a migration, write, booking generation, payment, notification, deployment or T29 rehearsal.
