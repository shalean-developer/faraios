# T29 — Fresh-start continuity and source no-change evidence (3 November 2026)

**Scope:** Owner-approved shared-V1 fresh start for Shalean and Bokkie, not a historical import or production cutover. Both legacy systems remain separately authoritative.

## Executable new-customer → booking → internal invoice test
Added `test/t29-first-customer-invoice-continuity.test.js` on the dedicated T29 draft PR. This uses the existing V1 schema drafts loaded into a disposable in-process PostgreSQL (PGlite) instance with synthetic identities and explicit per-business memberships; it runs the real customer parser, booking parser, and internal `prepareInvoice` wrapper/RPC. For each of two isolated business IDs it:
- creates a synthetic customer and separate address under that business;
- creates a synthetic catalogue entry and one booking;
- prepares an invoice against that business's own booking;
- asserts ZAR 150.00 (15000 cents), matching customer/booking/business IDs, document status `draft`, sync status `not_synced`, null external invoice identity, and distinct invoice keys;
- checks Bokkie-only identity cannot see Shalean's invoice through RLS;
- rolls back the synthetic customer, address, booking and invoice writes and verifies zero retained rows in those tables;
- blocks and counts global fetch calls, expecting zero external network activity.

This is not a customer-facing hosted run, an actual Zoho invoice, or a payment confirmation. It is a synthetic internal-document continuity check, with no live dispatch adapters or recurring generator. Latest-head CI is **pending as authored**, and the test must not be labelled passed before verified.

## No-change evidence boundaries
Operations undertaken for T29 have been source-only changes on draft PR #306, canonical tracker evidence updates, read-only staging catalog/RLS/notification queries, and disconnected synthetic tests in CI. No business record insert/update/delete SQL was issued to Shalean or Bokkie production databases. No migration import, backup restore, host restart, staging deployment, cron or payment trigger was initiated for T29.

Read-only FaraiOS staging aggregate query on 3 November reported businesses=2, customers=8, bookings=31, invoices=11, recurring_schedules=2, quotes=9, memberships=5. Those counts were consistent with the earlier visible staging table summaries, but **do not constitute byte-level source fingerprints**, exclude unrelated concurrent activity, or prove full production immutability. The real rollback proof applies only to the isolated synthetic transaction.

## Previous gates
Hosted Bokkie-manager request to Shalean dashboard yielded owner-captured HTTP 403. Read-only PostgreSQL `authenticated`-role checks confirmed selected Bokkie manager could see own tenant but not tested Shalean records. Staging notification settings were disabled for both businesses; `pg_cron`, `pg_net` and `wrappers` absent in inspected database. Plesk screenshot shows existing T19 TEST invoice scheduler enabled every five minutes; private T19/T20 worker configuration was NOT inspected. Do not claim entire host outbound disabled. The T29 rehearsal is disconnected and never invoked that worker.

## Completion boundary
T29's originally proposed historical import was expressly replaced in the canonical Build Plan by fresh-start isolation and synthetic continuity checks. Do not claim historical records migrated or counts/financial reconciliations done. Future cutovers preserve Shalean 13 active schedules and 85 future linked visits plus all financial history, and Bokkie outstanding credits/quotes/historical groups.

Do not merge/deploy or start T30; T29 In progress until latest-head CI, owner acceptance, and readback-verified tracker status update after acceptance.
