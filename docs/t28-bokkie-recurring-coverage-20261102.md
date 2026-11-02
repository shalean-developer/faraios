# T28 Bokkie date and recurrence coverage — 2026-11-02

Owner-supplied read-only aggregate query output from Bokkie Supabase project `scsrxogumimsrtbnqeas`:

| Field | Value |
|---|---:|
| total_bookings | 77 |
| missing_dates | 0 |
| non_iso_dates | 0 |
| possible_future_bookings | 0 |
| recurring_flagged | 14 |
| recurring_without_group | 1 |
| recurring_groups | 5 |

This reconciles the full booking count and establishes that `scheduled_date` has no null/format mismatches according to the tested regex, and no ISO text date >= 2026-11-02. Regex does not independently prove calendar-valid date values. Five distinct non-null recurring-group IDs represent one or more recurring visits; a separate recurring booking has null group ID. A missing future visit record does NOT prove a recurring agreement has ended.

**Required next bounded check**: group-level aggregate without IDs, contacts or individual booking details: assess number of groups by recurring frequency, status, earliest/latest scheduled dates and whether end dates exist; identify whether the ungrouped recurring booking has parent ID or recurrence start/end metadata. Owner to decide active/ceased status only after reconciliation. Do not create visits or migrate records as part of T28.
