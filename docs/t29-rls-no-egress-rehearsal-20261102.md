# T29 — RLS and synthetic no-egress verification (2 November 2026)

## Read-only hosted database RLS
A read-only transaction on FaraiOS staging `xdmfyrsauvqznkloroxg` selected an existing active Bokkie-manager membership as the simulated JWT subject, then used `SET LOCAL ROLE authenticated` to exercise real PostgreSQL RLS. Result: effective role authenticated; Bokkie business visible = 1; Shalean business visible = 0; Shalean business_customers = 0, one_off_bookings = 0 and business_invoices = 0. Transaction ROLLBACK completed. No customer data or JWT token was retrieved into the report.

This **passes database RLS denial for the tested selected identity and tables**; it is a role/claim simulation, not a credentialed HTTP API request. Previously the signed-in Bokkie manager dashboard denied Shalean with explicit message. Direct API enforcement remains unverified.

## Synthetic booking preparation
Added `test/t29-fresh-start-no-egress.test.js` at commit `147c5d3d0d39bd9b4e90ced3797accf7f2cf57da`. It uses two synthetic tenant IDs, synthetic booking input, an in-memory insert-only fake business-scoped data adapter and global fetch that fails closed on invocation. Assertions verify two distinct scoped synthetic writes, no fabricated payment/booking status and zero outbound fetch attempts. This test **does not create any actual database record** or prove that hosted workers, cron or financial provider connections are disabled. CI result still pending at time of this evidence record; do not claim completed/green until verified.

## Remaining
Credentialed hosted HTTP API cross-business denial, real isolated Postgres workflow and no-egress runtime checks, rollback/source preservation, and owner staging acceptance. No imports, provider activity, live data mutation, deployment or T30.
