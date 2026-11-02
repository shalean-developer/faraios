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
