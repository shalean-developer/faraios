# T28 — live source metadata discovery, 2026-11-02

Status: read-only findings, **not a completed exhaustive mapping or a migration rehearsal**.

## Verified connections
- Connected Shalean Supabase account: **shalean-production** project `paqjwfulwywtsyyvdxrq`, ACTIVE_HEALTHY. Read-only `information_schema.tables` returned 245 public, 27 auth, 8 storage base tables. `list_tables(public)` provided table names/RLS flags and provider-estimated row totals. No customer or financial row payloads were fetched.
- Connected FaraiOS Supabase account: **faraios-staging** `xdmfyrsauvqznkloroxg`, ACTIVE_HEALTHY. Read-only information_schema returned 27 public, 27 auth, 8 storage base tables. Provider public table listing included 2 businesses, 5 memberships, 8 customers, 7 addresses, 31 one-off bookings, 2 recurring schedules, 9 quotes, 11 invoices, 2 accounting connections, 2 VAT configurations, 2 staff profiles, 4 staff teams and 2 settlement review statements. These are staging counts, not imported or equivalent source figures.
- No separately identifiable Bokkie production Supabase project was present in the connected Shalean or FaraiOS account project lists. The third connected CGF account contains only an unrelated inactive community-growth-fund project. **This does not prove Bokkie lacks a database**, nor that Shalean production contains Bokkie records. Bokkie's actual authoritative website, booking system, datastore, file store and accounting source require independently verified read-only access.

## Shalean production source evidence (provider-estimated rows, NOT reconciled)
Representative independently reported public tables:
`bookings` 1161; `customers` 261; `customer_saved_addresses` 172; `booking_cleaners` 501; `cleaners` 35; `cleaner_availability` 6349; `booking_line_items` 2369; `booking_cleaner_earnings_snapshot` 787; `cleaner_earnings` 869; `cleaner_payouts` 180; `monthly_invoices` 189; `accounting_invoice_sync` 204; `expenses` 604; `booking_events` 8372; `notification_logs` 2733; `booking_service_photos` 20; `booking_service_checklists` 12; `customer_care_cases` 1; `dispatch_offers` 48; `dispatch_retry_queue` 101; `cron_runs` 75161; `blog_posts` 88. Treat provider 'rows' as estimates until a snapshot-consistent count proves them.

## Gap expansion grounded in live source
- **G09 (Shalean owner, acceptance blocking):** 245 public table types vs 27 staging public types. Inventory all 245 individual tables and their relationships. Classify each as V1-required operational record, legacy-only retain-in-place/archive, derived/cache/ephemeral log, marketing/website outside V1, or non-migrating operational infrastructure. Explicitly approve disposition for every unmatched required record; do not treat all tables as migration requirements.
- **G10 (Shalean owner, acceptance blocking):** Separate treatment needed for existing dispatch/offer/retry/location-tracking, checklist/photos, cleaner recruiting/training, customer-care case, expenses/budgets, monthly billing/Paystack/Zoho, notifications and marketing/web content. Some are outside V1; do not add FaraiOS features to accommodate them. Require explicit archive/retain/source-of-truth/transition decision where not directly supported.
- **G11 (Bokkie owner, acceptance blocking):** Identify authoritative Bokkie production system and document distinct data source, record counts and business ownership; never assume Shalean DB is Bokkie source.
- **G12 (migration operator, acceptance blocking):** Obtain snapshot-consistent per-business counts and relationship checks (rather than provider estimates), monetary totals and future-booking breakdown after read-only access approval. No import or source write in T28.

## Evidence/validation limits
Authoritative read-only Supabase metadata inspection succeeded for Shalean and FaraiOS. No site/API route crawl, Bokkie production metadata inventory, exact per-table field mapping, source row-level checksum, financial reconciliation or owner-agreed transition has been completed. Supabase PostgreSQL port 5432 was not used. No migration, deploy, provider dispatch, bank transfer or modification of production data was performed.

Review alongside `docs/t28-feature-data-mapping-20261102.md`. Do not mark T28 Done until the full source record catalogue is classified and every required feature/record mapping or transition is agreed.
