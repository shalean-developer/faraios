# T28 — Shalean live database source health and usage (2026-11-02)

**Read-only evidence, not a full application health certification.** Connected Supabase Shalean production project `paqjwfulwywtsyyvdxrq`. No production row contents were fetched and no writes, DDL, repair, deployment or migration were performed.

## Catalog-wide structural checks
- `public` base tables: **245**.
- `relrowsecurity=true`: **245**; RLS disabled **0**. Policy strength, execution roles and record ownership require separate testing.
- Tables with at least one outgoing declared foreign key: **154**; remaining 91 without one are not automatically faulty.
- Catalog estimated empty tables: **161** (`reltuples<1`), not exact empty counts; may be unanalysed, optional or dormant.
- Existing names classified 245/245 in `docs/t28-shalean-245-table-triage-20261102.md`. Classifications remain provisional.

## Selected source usage evidence
Metadata query against `pg_stat_user_tables` showed nonzero cumulative scan counts and RLS enabled for `bookings`, `customers`, `cleaners`, `booking_cleaners`, `recurring_bookings`, `monthly_invoices`, `payment_transactions`, `accounting_invoice_sync`, `cleaner_earnings`, `cleaner_payouts`, `sales_documents`, `sales_quote_acceptance_snapshots`, `expenses`, `cleaning_credit_transactions`. Stats scan counters are cumulative and resettable, not evidence of successful operations, request dates or healthy outcomes. Some last-autoanalyze fields are populated through 2 Nov 2026.

## Exact COUNT(*) for core record families
| Source table | Exact count |
|---|---:|
| accounting_invoice_sync | 204 |
| bookings | 1161 |
| cleaner_earnings | 872 |
| cleaner_payouts | 180 |
| cleaners | 35 |
| customers | 262 |
| monthly_invoices | 189 |
| payment_transactions | 517 |
| recurring_bookings | 25 |
| sales_documents | 177 |

These are independent counts in a read-only statement, not an isolated consistency snapshot spanning integrations. They cannot be summed into revenue or customer population. No financial reconciliation or per-business destination crosswalk has been demonstrated.

## T28 implications / next gates
- Treat the ten populated core tables as confirmed source record families requiring mappings/transition treatment; map rows/statuses/relationships/immutable prices to T12–T23 capabilities where supported.
- Do not claim foreign key presence proves zero orphan rows: validate target relationships and non-FK textual references separately.
- Do not claim all 245 tables work: RLS present does not prove correctly scoped policies, and read-only table scans do not prove provider/worker/website flows.
- Record exact status breakdowns, scoped source fields, FK metadata and financial reconciliation for the required families; defer unrelated broad site-health remediation outside T28.
- Bokkie remains separate under T28-BOK-DEV-01; no shared-owner customer inference or imported records.
- Preserve all live Shalean/Bokkie data and accepted T19–T27 functionality. T28 **In progress**, T29 **Not started**.
