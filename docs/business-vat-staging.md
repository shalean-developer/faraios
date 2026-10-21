# T04 VAT staging verification

Record T04-VAT-STG-01, version 2, 22 October 2026 (Africa/Johannesburg). Status: bounded staging acceptance passed. Source: owner VAT01 decision in the Build Plan and Progress Tracker, PR96, application SHA `1168f8780ef99a90492b658cd7cdb4918bda0163`.

## Scope and migration

Only FaraiOS `faraios-staging` (`xdmfyrsauvqznkloroxg`) was selected through the Faraios connector. The separate restore project and live Shalean were not changed. No VAT registration, provider dispatch, payment, earnings accrual or payout was activated.

Applied source `supabase/migrations/20261021223123_business_vat_settings.sql`, SHA-256 `0a232df9c811ac05689b334a9585d223596728f81b395dc85d2cd9ddfd045a2f`. The remote tool recorded migration `20261021225037`, name `business_vat_settings`. Execution added a transaction-local five-second lock timeout, 60-second statement timeout, table locks and exact staging-scope/disabled-accounting guards. All schema changes committed atomically. No saved agreement was backfilled or repriced.

The additive schema stage was performed under database locks while VAT remained disabled. After the owner restarted the local Windows candidate app and confirmed readiness, the connected Chrome browser displayed the new VAT panel and completed the authenticated journey below. This proves local staging behaviour, not a production deployment.

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
| Owner local app UI and authenticated browser journey on candidate code | Passed |
| Required reason and missing registration details | Browser validation blocked saves; missing number/date produced the expected application error |
| Shalean owner save-off and atomic audit | Passed; retained OFF policy version 1 with owner attribution |
| Synthetic VAT-on quote and later policy-off | R1,150 customer total retained; R150 VAT and R1,000 net retained in saved draft |
| Issue of that now-stale synthetic draft | Blocked; draft status and saved tax snapshot unchanged |
| Fresh server membership after owner form opened | Manager POST denied without policy change; manager/staff settings navigation denied |
| Existing quote, booking and invoice views | Display legacy uncaptured-VAT warning; saved records unchanged |
| Desktop and 390 × 844 viewport | VAT panel/dropdown usable; no horizontal overflow at 390px; viewport override reset |
| Persistent browser fixtures and their audit records | Removed only the disposable QA business and its synthetic records; independently verified |

Run the reproducible rollback-only script at `scripts/verify-vat-staging.sql` solely against the pinned staging project. Its business-date boundary uses Africa/Johannesburg, because the server's UTC date can differ around midnight. Fixtures and audit rows are rolled back; sequence gaps after rollback are normal. No account is created, no credential is required by the SQL, and no external accounting request is made.

Automated review identified that the script's original-business check assumed there were no saved policies. It now captures and compares their complete starting records, so a legitimate retained OFF policy is preserved instead of falsely rejected. The corrected script was rerun after browser acceptance with Shalean OFF version 1 present: all 26 checks passed and fixtures rolled back. A fresh read confirmed the retained policy/audit, counts and fingerprints were unchanged. This correction changes verification only, not application behaviour.

Authenticated database checks set the session's QA identity explicitly and exercise real grants, RLS and RPCs. The separate browser journey used the owner's existing authenticated staging session; no password or cookie was read. Only the disposable QA membership was temporarily changed for denial checks. The two anonymous HTTP denial checks used only the staging publishable key and no user token. A fresh password login and a physical mobile device were not tested in this VAT journey.

Fresh readback after rollback: two existing businesses, seven quotes, fourteen bookings, two recurring agreements, two invoices and 227 audit rows. VAT policy rows: zero. Enabled VAT: zero. Enabled accounting connections: zero. All fourteen existing bookings retain null tax snapshots. Full saved records were fingerprinted before/after; the newly added null booking column was excluded from that comparison. Quote, booking, recurring, invoice and connection fingerprints matched exactly. Temporary businesses and agreements did not remain.

After browser acceptance and fixture cleanup, the same two businesses, seven quotes, fourteen bookings, two recurring agreements and two invoices remained. All five saved-data fingerprints still matched. The one intentional retained change is Shalean's OFF policy, version 1, and its owner-attributed INSERT audit event: 228 audit rows total. Bokkie has no policy row and defaults OFF. Enabled VAT and enabled accounting connections are zero. No synthetic business, customer, address, service, quote, policy, membership or audit row remains. Existing booking tax snapshots remain null.

## Existing advisor findings

The pre-change baseline remains: one warning for [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); informational no-policy notices for three intentionally restricted audit/internal tables; eight existing unindexed foreign keys and two unused indexes. No existing security or performance configuration was changed by this task. See the [database linter guidance](https://supabase.com/docs/guides/database/database-linter).

## Outcome and remaining gates

Keep Shalean and Bokkie VAT off. Any future registration change requires the owner's verified business details and explicit update. The synthetic VAT number was used only in the disposable QA business, never in either real staging business. No email, external invoice, provider request, financial accrual or payout was sent by the acceptance journey.

**PASS for this bounded VAT capability in staging:** database migration, backend enforcement and candidate-code browser checks passed. This record does not approve production, tax invoice compliance or financial activation. Actual costs, pay/classification safeguards and final affordability remain separate T04 gates. T04 remains In progress, actual financial workflows inactive, and T19 on hold.
