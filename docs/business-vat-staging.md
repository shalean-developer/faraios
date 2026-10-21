# T04 VAT staging verification

Record T04-VAT-STG-01, version 1, 22 October 2026 (Africa/Johannesburg). Status: backend verified; local app/browser acceptance pending. Source: owner VAT01 decision in the Build Plan and Progress Tracker, PR96, application SHA `1168f8780ef99a90492b658cd7cdb4918bda0163`.

## Scope and migration

Only FaraiOS `faraios-staging` (`xdmfyrsauvqznkloroxg`) was selected through the Faraios connector. The separate restore project and live Shalean were not changed. No VAT registration, provider dispatch, payment, earnings accrual or payout was activated.

Applied source `supabase/migrations/20261021223123_business_vat_settings.sql`, SHA-256 `0a232df9c811ac05689b334a9585d223596728f81b395dc85d2cd9ddfd045a2f`. The remote tool recorded migration `20261021225037`, name `business_vat_settings`. Execution added a transaction-local five-second lock timeout, 60-second statement timeout, table locks and exact staging-scope/disabled-accounting guards. All schema changes committed atomically. No saved agreement was backfilled or repriced.

The local Windows app was observed running the previous code, with no VAT panel. It was not restarted remotely. The additive schema stage was performed under database locks while VAT remained disabled; application restart and browser checks remain a separate transition. Do not infer that the new UI is deployed from the applied migration.

## Evidence

| Check | Result |
| --- | --- |
| Real staging PostgreSQL checks using existing identities and synthetic businesses | 26 passed |
| Default off, client tax override rejection, owner save/read/off | Passed |
| Manager, staff, anonymous and foreign-owner denial | Passed at database role/RPC level |
| Future registration, missing number/confirmation, stale saves and direct updates | Denied |
| Inclusive VAT and unchanged total, rounding through maximum integer price | Passed |
| Quote conversion, recurring generation and invoice tax snapshots | Preserved after policy change |
| Saved VAT mutation and stale quote issue | Denied |
| VAT audit attribution and VAT accounting dispatch guard | Passed |
| Real HTTP Data API anonymous table read and configuration RPC | Both HTTP 401, SQLSTATE 42501 |
| Transaction cleanup on a fresh connection | Passed |
| Existing data fingerprints | All five categories unchanged |
| Post-migration security/performance advisor delta | No new findings |
| Owner local app UI and authenticated HTTP/browser journey on candidate code | Pending |

Run the reproducible rollback-only script at `scripts/verify-vat-staging.sql` solely against the pinned staging project. Its business-date boundary uses Africa/Johannesburg, because the server's UTC date can differ around midnight. Fixtures and audit rows are rolled back; sequence gaps after rollback are normal. No account is created, no credential is required by the SQL, and no external accounting request is made.

Authenticated database checks set the session's QA identity explicitly and exercise real grants, RLS and RPCs. They do not prove a fresh authenticated HTTP login or the browser journey. The two HTTP denial checks used only the staging publishable key and no user token.

Fresh readback after rollback: two existing businesses, seven quotes, fourteen bookings, two recurring agreements, two invoices and 227 audit rows. VAT policy rows: zero. Enabled VAT: zero. Enabled accounting connections: zero. All fourteen existing bookings retain null tax snapshots. Full saved records were fingerprinted before/after; the newly added null booking column was excluded from that comparison. Quote, booking, recurring, invoice and connection fingerprints matched exactly. Temporary businesses and agreements did not remain.

## Existing advisor findings

The pre-change baseline remains: one warning for [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); informational no-policy notices for three intentionally restricted audit/internal tables; eight existing unindexed foreign keys and two unused indexes. No existing security or performance configuration was changed by this task. See the [database linter guidance](https://supabase.com/docs/guides/database/database-linter).

## Next step and gate

Stop the previous local app, check out the review branch `feat/t04-business-vat` and start `staging.mjs` using the approved Node 24 runtime. Verify the owner VAT panel defaults off, registration validation and saved-price displays. Keep Shalean/Bokkie VAT off; use only synthetic businesses for any positive VAT-on test. Check owner save-off/audit, fresh membership denial, narrow/mobile layout and unchanged existing quote/booking/invoice views. If sign-in is required, the user enters the existing staging password privately.

**CONDITIONAL PASS:** database migration and bounded backend acceptance passed. The feature is not fully accepted or merged until local candidate-code browser verification passes. No production release is recommended by this record. T04 remains In progress, actual financial workflows inactive, and T19 on hold.
