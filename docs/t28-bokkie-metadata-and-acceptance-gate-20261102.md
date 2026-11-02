# T28 — Bokkie missing-metadata source review and final evidence gate
Date: 2026-11-02. **Read-only source mapping; NOT acceptance ready.**

## Evidence provenance
- Live Bokkie project `scsrxogumimsrtbnqeas` was identified by owner. Direct connected access remains denied; owner supplied current 43-table inventory, exact counts for 11 record types, and 77 `bookings`, 12 `credit_transactions`, 11 `customers` field definitions. The quoted field export did not include live `quotes`, `recurring_schedules` or `user_credits` definitions.
- Connected GitHub Bokkie `main`: `supabase/migrations/035_quotes_table.sql`, `029_recurring_schedules.sql`, `042_teams_system.sql`, `043_booking_cleaners.sql` provide **historical intended schema**, not proof of current live columns, foreign keys, grants or row content.
- Historical SQL migration 029 includes seeded customer-associated example rows; those are NOT copied into this evidence. Never treat historical seed data as a current Bokkie agreement.

## Additional source-to-target map
| Family | Historical Bokkie source definition | Existing FaraiOS target | What remains to verify |
|---|---|---|---|
| Quotes | `quotes`: id, first/last_name, email/phone, location/custom_location, service, bedrooms/bathrooms, additional_services JSONB, note, status(pending/contacted/converted/declined), timestamps | `business_quotes`: id,business_id,customer_id,address_id,status,converted_booking_id, created/updated | Live columns/status and exact count 161; distinguish contact inquiry from priced accepted quote; verify conversion links; do not assign CRM identity on email alone |
| Recurrence | `recurring_schedules`: id,customer_id,frequency,day_of_week/day_of_month/days_of_week, preferred_time, start/end, is_active, cleaner_id, last_generated_month, cost fields | `recurring_schedules` and immutable visit links | Live table count zero; preserve 14 recurrence-flagged bookings/five historical groups under T28-BOK-REC-01; no new schedules/visits |
| Teams | `teams` team_id/name/is_active; `team_members` join by team_id and cleaner_id | `staff_teams`, memberships and assignments | Live teams and team_members estimated zero, not exact; preserve historical `booking_cleaners` (2 exact) and booking-assigned arrays separately |
| Cleaner assignment | `booking_cleaners`: booking_id TEXT FK to bookings.id; cleaner_id TEXT FK to cleaners.cleaner_id | Existing T18 booking assignments / T24 cleaner view | Live FK/columns and orphan check, no assumption that cleaner preferences are actual assignments |
| Credits | owner-supplied **live** `user_credits`: user_id UUID, balance NUMERIC, updated_at TIMESTAMPTZ | Legacy servicing under approved T28-BOK-CREDIT-01; no assumed V1 wallet | 20 accounts, one R64.75 positive; 9 ledger rows plus R50 historical continuity issue retained. Confirm independent secure servicing and no double redemption, not new FaraiOS functionality |

## Legacy-only and security disposition
T28-BOK-DEV-01 approves preserving development-stage website/CMS, blog, analytics, marketing and unfinished non-V1 functionality in the legacy system; underlying data, retrieval, obligations and ownership must remain protected. Historical quotes policy in `035_quotes_table.sql` permits broad authenticated read/update on source as written; actual live policy not established, so flag separate security review if needed. Existing live credit-function grants and non-atomic balance/ledger implementation raise a separate security issue; T28 authorizes no remediation.

## Final acceptance evidence checklist (current)
- [x] Canonical T28 wording and T27 dependency directly checked
- [x] Shalean 245/245 and Bokkie 43/43 public table-name inventories
- [x] Approved retention and recurrence policies: SHA-LEG-01, SHA-REC-01, BOK-DEV-01, BOK-REC-01, BOK-CREDIT-01
- [x] Representative V1 destinations and transformation/ownership rules recorded
- [x] Bokkie exact key-record counts and source booking/payment/credit aggregate checks
- [x] Shalean 122 document-linked payment exceptions explained, two residual records retained for review
- [ ] Bokkie current live quote/teams/recurrence/booking-assignment column and FK metadata, plus access-controlled file/bucket metadata
- [ ] Complete per-required-record field compatibility and source-to-target identity crosswalk evidence for each business
- [ ] Final accounting/provider reference and outstanding-obligation reconciliation, without inventing cash or settlement
- [ ] Named operator and verified access/recovery for legacy histories and Bokkie credit servicing
- [ ] Source/target preservation and no-change evidence before qualified acceptance
- [ ] Every required unmapped feature has owner-approved transition with evidence
- [ ] Explicit owner T28 staging acceptance; only then mark canonical tracker Done

**Conclusion:** T28 remains In progress. There is no evidence sufficient to request staging acceptance. T29 remains Not started. No imports, updates, provider calls, finance operations or site changes were performed.
