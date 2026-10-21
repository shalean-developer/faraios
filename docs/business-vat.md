# Business VAT setting — T04

The owner reports that Shalean is not VAT registered and requests an on/off option. Shalean remains off. This capability is business scoped; no registration, live accounting connection, financial accrual or payout is activated by this change.

## Behaviour

Only an active owner in an active business can configure VAT, using Business settings → VAT. The default is off when no policy has been saved. On requires a South African VAT number, an already effective registration date, a reason and confirmation that the setting matches the business's registration. Off also requires a reason and confirmation. The application does not independently verify SARS registration. Future registrations require a later explicit update; this is not an automatic scheduled switch. The saved version prevents stale browser saves from overwriting a newer decision, and every change is recorded with its actor and before/after values in the audit transaction.

Catalogue and assessed prices are **customer totals**. When on, those prices include standard VAT at 15%; the switch never increases the customer total. For example R1,700 contains R221.74 VAT and R1,478.26 before VAT. Any desired price increase requires a separate catalogue review. Off means no VAT charged, not zero-rated or exempt. Nonstandard tax supplies and foreign tax jurisdictions need a separate implementation.

The rate source is [SARS Value-Added Tax](https://www.sars.gov.za/types-of-tax/value-added-tax/), checked during this work. The standard rate remains 15%; the previously proposed 2025/2026 increases were reversed. A future rate change requires a reviewed implementation; owners cannot enter an arbitrary rate.

New one-off bookings and quotes receive server-calculated VAT snapshots with policy version, registration details and totals. VAT is rounded once on the agreement total to the nearest cent, half up. Net plus VAT equals the unchanged customer total. Client totals and tax snapshots cannot override these values.

Conversion, recurring generation and invoice preparation copy the source agreement's tax snapshot. Saved totals and VAT details are immutable. No historical row is backfilled or reclassified: pre-feature agreements show that VAT status was not captured. A quote without captured VAT details, or whose policy version changed before issue, must be replaced with a new draft before issue. Existing issued/accepted quotes and recurring agreements retain their historical terms; any tax-point or registration-transition correction requires accounting review before external issue rather than a silent rewrite.

The cost examples now use the owner's reported nonregistered position; supplier/payment-fee VAT remains an unrecovered cost unless separately verified. VAT is excluded from eligible labour for earnings; the inactive earnings workflow is not extended here. This setting does not establish tax invoice compliance or input-tax recovery.

## Accounting boundary

The existing Zoho adapter assumes no tax. VAT-enabled invoice drafts therefore cannot be dispatched through it: both the database claim path and adapter stop before external requests. Verified VAT tax-code mapping, tax-inclusive line rounding and provider reconciliation belong to the later accounting acceptance work. T19 remains on hold. Non-VAT behaviour remains unchanged.

## Release and rollback

Apply `supabase/migrations/20261021223123_business_vat_settings.sql` to the approved staging project only **before** starting the new code; it depends on the invoices, earnings and duration schema. Stop the app during the schema/code transition. Do not apply it to the restore rehearsal or live Shalean. No production deployment is performed. The source migration was applied to the approved staging project on 22 October 2026; see [staging evidence](business-vat-staging.md) for the recorded remote version, safeguards and completed browser checks. Shalean's owner-confirmed OFF setting is saved and audited in staging; Bokkie defaults OFF.

Verify off for Shalean in staging. Use synthetic businesses to test on/off, inclusive calculations, manager/staff/foreign denial, audit, stale saves and saved documents. Never enable Shalean VAT with a fabricated number. Record owner browser acceptance before release. A code rollback should keep the additive table/column and snapshots; do not drop financial history. Investigate VAT-enabled agreements before using an older application that cannot display their tax details. Use a forward fix for persisted errors.

## Validation

`node --test test/vat.test.js test/staging-server.test.js` covers HTTP membership/origin checks, real PostgreSQL RLS/function grants through PGlite, settings versions, audit attribution, default off, legacy preservation, tax rounding through maximum integer prices, immutable quote→booking→recurring→invoice snapshots and a zero-network VAT accounting hold. Existing suites cover the remaining module behaviours. Staging schema/advisors, rollback-only backend acceptance and the local authenticated browser journey passed. Desktop and 390px responsive checks passed; physical mobile testing and a fresh password login were not part of this VAT journey. Disposable browser fixtures were removed and existing saved-data fingerprints remained unchanged; see [staging evidence](business-vat-staging.md).

T04 remains In progress. Financial workflows remain inactive.

Local result: `npm run check` passed; `npm test` passed 273 tests with one existing independent-connection integration test skipped because `T16_TEST_DATABASE_URL` was not supplied. The dedicated VAT/HTTP/picker run passed 52 tests. These are isolated checks, not remote staging acceptance.
