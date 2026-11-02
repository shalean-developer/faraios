# T28 — Bokkie owner-provided live Supabase table inventory (2026-11-02)

**Provenance:** Owner ran a read-only SQL inventory on the Bokkie Supabase project identified as `scsrxogumimsrtbnqeas` and supplied the resulting table names, `pg_stat_user_tables.n_live_tup` estimated rows, information_schema column counts, and presence of a column literally named `business_id`. This evidence is provided by the owner, **not** a connector-authenticated database read. No row payload or credential was received. Counts are estimates and may include stale/zero statistics, not exact counts. All 43 public tables returned No for a `business_id` column, which does not itself demonstrate missing tenant security in a single-business database.

## Complete inventory (43 public tables)

| Table | Estimated rows | Columns | Initial classification |
|---|---:|---:|---|
| additional_services | 17 | 11 | Service catalogue |
| applications | 0 | 18 | Staff application / legacy review |
| blog_categories | 0 | 7 | Website retained |
| blog_posts | 10 | 25 | Website retained |
| blog_tags | 0 | 6 | Website retained |
| booking_cleaners | 2 | 5 | Assignment |
| bookings | 77 | 77 | Booking / payment / contact candidate |
| bookings_staging | 0 | 36 | Staging/transient; review |
| cleaner_applications | 0 | 18 | Recruiting / legacy review |
| cleaners | 5 | 37 | Staff |
| cms_content | 3 | 14 | Website retained |
| credit_settlement_operations | 0 | 10 | Financial audit; review |
| credit_transactions | 0 | 12 | Credits; decision |
| customer_profiles | 7 | 9 | Identity/customer relationship; review |
| customers | 0 | 13 | Customer source authority unresolved |
| discount_code_usage | 0 | 8 | Commercial history |
| discount_codes | 1 | 14 | Commercial policy |
| eft_payment_submissions | 0 | 11 | EFT history |
| frequency_options | 0 | 10 | Recurrence configuration |
| location_content | 0 | 8 | Website retained |
| notifications | 0 | 16 | Notification history |
| pageviews | 694 | 9 | Website analytics retained |
| payment_methods | 0 | 12 | Payment methods, sensitive; metadata only |
| pending_voucher_purchases | 0 | 8 | Financial transition decision |
| popular_services | 0 | 9 | Catalogue/website |
| profiles | 13 | 9 | Auth identity, separate from customers |
| quotes | 161 | 16 | Quotes |
| recurring_schedules | 0 | 25 | Recurrence; verify embedded booking frequency |
| referral_codes | 1 | 4 | Legacy marketing/commercial |
| referrals | 0 | 14 | Legacy marketing |
| reviews | 0 | 21 | Website retained |
| room_pricing | 1 | 7 | Pricing configuration |
| service_category_pricing | 0 | 9 | Pricing configuration |
| service_locations | 0 | 9 | Service areas |
| service_type_pricing | 0 | 9 | Pricing configuration |
| system_settings | 10 | 8 | Business configuration |
| team_members | 0 | 6 | Team membership |
| teams | 0 | 9 | Teams |
| time_slots | 0 | 7 | Availability/configuration |
| user_credits | 13 | 3 | Financial liability; owner decision |
| user_vouchers | 0 | 7 | Financial/commercial history |
| voucher_usage_history | 0 | 12 | Financial/commercial history |
| vouchers | 0 | 14 | Financial/commercial history |

**Aggregate:** 15 estimated nonempty tables, 28 estimated zero; sum of estimates 1015 (NOT unique records, nor a reconciled business total).

## Mapping and transition findings
1. **Customer identity discrepancy:** 77 estimated bookings, 7 customer_profiles, 13 profiles, but zero estimated customers. Require exact counts and metadata/relationship evidence to determine authoritative customer source, no email-based merging.
2. **Recurrence:** zero estimated recurring_schedules does not prove no recurring obligations; inspect distinct saved booking frequency/status aggregates and future dates.
3. **Financial:** user_credits 13 and quotes 161 require reconciliation and agreement; vouchers/discounts/referrals may remain in existing system, but any outstanding liability must receive owner-approved treatment. Do not migrate credentials/payment methods.
4. **Business attribution:** `business_id` absent from every source table. Source project is alleged dedicated Bokkie tenant; map source project provenance → FaraiOS immutable Bokkie business ID only after independently verifying connection and ownership. Never infer Bokkie from contact email or another business's record.
5. **Operational work:** map bookings, assigned cleaners, confirmed future reservations, completed/cancelled states, quote approvals and money to accepted FaraiOS V1; leave website CMS/blog/pageviews on website unless approved otherwise.
6. **No source content copied:** reported table statistics only. No snapshot hashes, exact row counts, foreign key metadata, date/status breakdowns, bank or provider records.

## Next SQL evidence
Use the separate read-only schema/foreign-key and aggregate-count requests prepared in the conversation, avoiding SELECT * and all customer PII. Verify one authoritative table at a time. Resolve remaining transition decisions before acceptance. T29 rehearsal is excluded.
