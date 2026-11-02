# T28 — Consolidated source-to-target disposition and acceptance review
Date: 2026-11-02. **Source-only working evidence; NOT staging acceptance.** Canonical T28 requirement is “Compare existing sites and all record types with V1”; acceptance “Every required feature mapped or transition agreed.” Dependency T27 is Done. This report deliberately distinguishes actual source evidence, accepted business decisions and unverified assumptions.

## Canonical baseline and decisions
- T27 Done, accepted 2026-11-02. T28 In progress, T29 Not started.
- `T28-BOK-DEV-01`: Bokkie development-stage system — preserve source Supabase/history; V1-only direct mappings; retain non-V1 website/marketing in legacy; preserve customer credits; no cutover.
- `T28-BOK-REC-01`: preserve five Bokkie recurring groups and historical 13 grouped bookings; one ungrouped recurring record requires review; no assumption on completion/future obligation.
- Shalean and Bokkie have separate authoritative record ownership; identity matching by email is prohibited; no production writes or new functionality.

## Mapping matrix — required V1 operational domains
Status meanings: MAPPED = source table family plus V1 target established, not proof of field-complete import; PARTIAL = known field/identity or policy issue; RETAIN = owner decision for non-V1 website/marketing functionality; OPEN = actual source discovery/transition missing.

| Area | Shalean source → V1 destination | Bokkie source → V1 destination | Disposition / acceptance gap |
|---|---|---|---|
| Business identity/access | Shalean single-business legacy + roles → businesses/business_memberships/RLS | Dedicated Bokkie Supabase ref scsrxogumimsrtbnqeas → Bokkie membership and business scope | PARTIAL: verify business-owned relationship crosswalk, no cross-tenant ownership leakage |
| Customers / addresses | public.customers, customer_saved_addresses → business_customers/customer_addresses | customers (101), customer_profiles (7), profiles (21), booking contact/address fields → same; T25 identity links | PARTIAL: duplicates, FK join and auth ownership need evidence, no email-only links |
| Catalogue/quotes | live services/line items/quotes (exact table inventory pending) → business_catalogue/business_quotes | additional_services(17 estimate), room_pricing, quotes(161 exact), booking extras → catalogue/quotes/assessments | PARTIAL: Bokkie-specific price/discount/units and quote lifecycles; Shalean actual source field inventory |
| Bookings | public.bookings (1161 estimate), booking_line_items, booking_cleaners → one_off_bookings + assignments/snapshots | bookings (77 exact) with all 77 columns mapped by family → one_off_bookings + snapshots | PARTIAL: exact statuses, dates, money, customer and foreign-key crosswalk; do not translate payment status to verified cash |
| Recurrence/future visits | source recurring/booking workflows → recurring_schedules + occurrence references | 14 recurring-flagged; five historical groups, one ungrouped; zero source schedule rows → T17; preserve only under owner decision | Bokkie historical treatment APPROVED; current completion/ongoing obligation OPEN. Shalean current plans/future counts OPEN |
| Staff/assignment | cleaners(35 estimated), booking_cleaners(501 estimated), availability(6349 estimated) → staff_profiles/staff_teams/availability | cleaners(12 exact), booking_cleaners(2 exact), teams/team_members (estimated 0) → same | PARTIAL: staff identity, job assignment/time and verified dual memberships |
| Invoices/payments | accounting_invoice_sync, monthly_invoices(189 estimated), payment sources → business_invoices/Zoho(T19), Paystack(T20), EFT(T21) | bookings payment-status: 53 completed/R31098.75, 20 pending/R17830, 4 failed/R2555, total R51483.75 → T19–T21 | PARTIAL: Bokkie only 1 of 53 completed bookings has paid_at; provider settlement and invoice amounts not verified; Shalean exact provider reconciliation OPEN |
| Credit liability | identify any legacy credit source and historical liabilities → V1-supported accounting or approved legacy retention | user_credits(20 exact), 1 positive R64.75; 9 completed ledger movements net R14.75, one historical +R50 continuity gap → proposed retain-on-Bokkie | OPEN: owner has approved preservation but not final servicing route; no fabricated adjustment or credit feature |
| Earnings/payouts | cleaner_earnings(869 estimated), cleaner_payouts(180 estimated), frozen snapshots → T22/T23 | booking cleaner earnings fields, no verified settlement records → T22/T23 if valid | PARTIAL: source status, rule version, settlement proofs and paid/unpaid state must be verified |
| Portals/notifications | auth user IDs, notification_logs, email history → T24–T26; preserve historic notifications | profiles/customer_profiles, website customer/cleaner pages, notification sources → T24–T26 | PARTIAL: ownership proof and never replay historical messages |
| Reports/audit | Shalean reports/cron/metrics and audit source → T27 reporting inputs and retained source | Bokkie bookings/quotes/status/website analytics → T27 where applicable; website-only logs retained | PARTIAL: metric definition/cutover reconciliation; no gross-value double-counting |
| Files/attachments | booking_service_photos and related storage evidence → approved scoped references or archive | booking/CMS storage metadata unknown → approved archive or V1 scoped references | OPEN: bucket metadata, ownership, retention and object counts |

## Development-stage/legacy-only disposition
**Bokkie**: owner-approved T28-BOK-DEV-01 retains website CMS, blog, SEO, pageviews, marketing, discounts/referrals/vouchers and unfinished non-V1 functionality in existing Bokkie environment **subject to preserving actual customer financial obligations**; source data is not deleted. Any used live customer credits remain explicitly OPEN pending account servicing decision. **Shalean**: marketing/AI/experiments, dispatch metrics, expense/budget, customer care, recurring billing, training/recruiting and other tables are identified in the 245-table source. The Bokkie-only decision does NOT automatically cover Shalean; classify each Shalean table and obtain owner acceptance where a required record is not represented in V1.

## Evidence quality and remaining completion gates
- Shalean: authoritative connected Supabase project `paqjwfulwywtsyyvdxrq`, 245 public tables, but only representative metadata; provider row estimates not exact source snapshots.
- Bokkie: owner-supplied 43 public table names; exact COUNT(*) for 11 tables; 77 booking fields, credit ledger and customers schema; 77 booking status/date/recurrence validated by aggregates. Source project `scsrxogumimsrtbnqeas` is not connector-readable to this session. No secret/PII captured.
- FaraiOS staging: connected project `xdmfyrsauvqznkloroxg`, 27 public tables at earlier metadata inspection. Do not misinterpret its existing records as migrated legacy business records.
- Not complete: field/FK inventory for every required source record, record-level migration crosswalk plan, exact Shalean statuses/financial totals/future bookings, Bokkie quotes and credit source provenance, both businesses' file/storage inventories, provider settlement identity, transition owner decisions for unmatched obligations, source read-only snapshot reconciliation, final acceptance.
- Security issue: Bokkie anonymous/authenticated access to SECURITY DEFINER `update_credit_balance` and non-atomic application balance+ledger writes documented separately; proposed remediation requires **separate approval**, not an unrequested T28 production patch. December R50 history remains unattributed.
- No code/runtime migration, import, provider dispatch, financial action, website change, rollback or deletion performed. Draft source evidence is not a staging deployment.

## Final acceptance checklist
- [x] T27 dependency verified; T28 exact tracker requirements read
- [x] Current staging source and accepted V1 capabilities referenced
- [x] Bokkie historical recurrence and development-stage mapping policy owner-approved
- [x] Core Bokkie source booking counts/dates and payment-status aggregates documented
- [ ] Every Shalean public source table classified with source/owner and disposition
- [ ] Every Bokkie record family field-mapped or explicitly approved for retain/transition, including credits
- [ ] Required source-to-V1 links, owners, statuses, transformations and reconciliation checks complete for both
- [ ] All open transition/business decisions resolved
- [ ] Complete read-only evidence and no-change verification assembled
- [ ] Owner explicitly accepts T28 staging
- [ ] Only then update T28 Done and read tracker back

**Conclusion: NOT ACCEPTANCE READY. T28 In progress; T29 Not started.**
