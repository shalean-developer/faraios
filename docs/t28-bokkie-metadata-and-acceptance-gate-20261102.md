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

## Owner-supplied live metadata — 2 November 2026 addendum

Owner supplied live `information_schema` column metadata (attached text) and the FK table in the conversation. The delivered column file ends at `recurring_schedules` ordinal 20, while earlier reported schema count was 25; **recurring_schedules columns 21–25 and all `teams`/`team_members` columns are absent from this attachment**. Therefore no claim of complete live field coverage for those tables.

Verified current live columns:
- `quotes` 16 fields, with **id TEXT primary key** (historical migration 035 suggested UUID, therefore real schema drift). `service_type`, `extras ARRAY`, `status` and `estimated_price NUMERIC` exist. FaraiOS `business_quotes.id` is UUID: use a source-system+source-business+original TEXT quote ID crosswalk to a separate target UUID, never cast IDs or fabricate a quote acceptance/payment state.
- `customers` 13 columns, including id UUID PK, nullable auth_user_id UUID, and role. `customer_profiles` 9 columns, id UUID PK and user_id UUID required. No FK between these identities appears in supplied FK list: linking is NOT established by matching email or name.
- `cleaners` 37 columns, with id UUID PK and a separate required cleaner_id TEXT. Retain both identity namespaces. Password hashes, OTP codes, contact details and location coordinates are sensitive; none were requested or copied. Don't migrate login secrets.
- `booking_cleaners` has id UUID PK, booking_id TEXT and cleaner_id TEXT. Verified live FKs: booking_cleaners.booking_id → bookings.id, booking_cleaners.cleaner_id → cleaners.cleaner_id. Preserve text-based source identifiers in a scoped key crosswalk for T18 and T24.
- `recurring_schedules` first 20 columns observed: id UUID PK, customer_id UUID, cleaner_id UUID, start/end, frequency, preferred_time, days, money-related fields in later columns not yet confirmed. Earlier exact row count was zero; no live schedule transition inferred.
- Live FK metadata supplied: recurring_schedules.customer_id → customers.id; team_members.cleaner_id → cleaners.cleaner_id; team_members.team_id → teams.team_id. No FK from quotes to customers appeared. Five FK rows in total, but this query excludes tables outside the selected set, so it is not proof of all project FKs.

Remaining exact metadata needed before claiming full schema check: the five trailing recurrence columns, all `teams`/`team_members` columns, and the live `booking_cleaners`/customer/quote relationship cardinality and integrity counts (privacy-preserving aggregates). Existing 161 quotes, 12 cleaners, 2 booking_cleaners, and zero recurring_schedules are owner-reported exact counts. Status/value distributions and customer association still require read-only validation. No source data was modified.

**T28 remains In progress. T29 Not started. This is not staging acceptance.**

## Live missing-column completion — owner-supplied 2 November 2026

The owner supplied the previously missing live `information_schema.columns` rows:

- `recurring_schedules` ordinals 21–25: updated_at timestamptz, days_of_week ARRAY, earnings_override TEXT, total_amount NUMERIC, cleaner_earnings NUMERIC. Combined with the earlier first 20 entries, all **25 reported columns** are now represented.
- `team_members` all 6: id UUID, team_id TEXT, cleaner_id TEXT, display_order INTEGER, created_at/updated_at timestamptz.
- `teams` all 9: id UUID, team_id TEXT, name TEXT, display_order INTEGER, is_active BOOLEAN, created_at/updated_at timestamptz, team_type TEXT, max_jobs_per_day INTEGER.

The owner-supplied live foreign keys match text-key joins `team_members.team_id→teams.team_id`, `team_members.cleaner_id→cleaners.cleaner_id`. FaraiOS T18 staff/team mappings must preserve original text IDs through source-scoped crosswalks. Do not equate the legacy text IDs with UUID primary keys. `max_jobs_per_day` is a configuration field, not proof that limits were enforced. The recurrence earnings_override is TEXT and monetary NUMERIC fields require source-rule validation before transforming to V1 amounts; zero source `recurring_schedules` rows were previously counted, but the 14 recurring-flagged booking records remain governed by T28-BOK-REC-01.

**Structural metadata gap closed** for these three tables, based on owner-provided query results. Still outstanding: actual FK integrity/relationship counts, source quote statuses and customer linking, storage metadata, financial/provider reconciliation, owner and access/recovery evidence. No production writes or T29.
