# Account and business details — preview

Base: main 593accb0097eb580c994451effe2486d3e3e8239 (merged PR #2).

Registration already saved personal name as Supabase Auth user_metadata.name. This change preserves that storage, validates Unicode name length/control characters and displays the saved name after sign-in. Metadata is display-only and never used for permissions.

Businesses gain ISO country and IANA time_zone, validated against the same bundled allowlists in PHP and SQL. Columns remain nullable for existing businesses and old live application compatibility. Existing businesses complete their missing location without a duplicate record. Country/time zone UPDATE is owner-scoped, column-limited; ownership/name/type/deletion permissions remain unchanged. No defaults or backfill guesses.

Welcome shows personal name, email, business name/type, country, time zone and complete/needs-details status. Existing homepage/waitlist source and marketing consent are unchanged. No imports, bookings, payments or dashboard.

Local checks: PHP 8.4.27 syntax passed; five account suites passed with real HTTP and disposable PostgreSQL 17.11, simulated Auth/REST. Tests cover invalid names/countries/zones, metadata payload, create/reload, existing-business completion, authenticated/anonymous access, cross-owner SELECT/UPDATE, denied ownership edits and database constraints. Waitlist regression tracked below.

Hosted preview verified below; fresh production signup/verification/sign-in/business/welcome and password reset remain pending production deployment. Preview shares faraios-new database with production; it is URL/session/source-isolated, not a separate database. Apply only the additive migration after native tests; leave main and production source untouched until owner review. Keep WL-WEBHOOK and WL-RECOVERY open separately; do not inspect mismatched Resend logs.

## Hosted preview evidence — 12 November 2026 (SAST)

Application commit deployed: 3d7b802fdaa213cfe33e132418dc47e892d92c2d. Plesk preview follows feature/account-details-20261112, manual destination /faraios.com/_accounts-preview. Production remains main at 593accb0097eb580c994451effe2486d3e3e8239.

- Additive migration 20261112184403 applied through connected Supabase browser; columns, owner UPDATE policy and migration history verified. No business backfill or deletion. Preview and production share this fresh database; source, URL, callback and session paths are separated.
- Owner signed into preview. Saved Auth name displayed as FaraiOS Preview Test.
- Existing business completed by owner, initially with Africa/Cairo. Added location editing and country-based time-zone suggestions after this exposed a correction usability gap. Suggestions do not alter existing saved values on load; explicit user changes remain possible.
- Real hosted edit/save corrected this designated test business to ZA / Africa/Johannesburg. Reloading Welcome and reopening edit retained both values; setup status Complete.
- Hosted database confirms exactly one business, same FaraiOS Preview Test Business, with the saved location. No duplicate business created.
- Required empty country/time-zone fields blocked browser submission. Selecting ZA suggested Africa/Johannesburg.
- At 390px, Welcome and edit forms showed no horizontal overflow; welcome screenshot inspected. Browser viewport override reset afterward.
- Native hosted transaction assertions passed: owner SELECT and location UPDATE; invalid country and invalid zone rejected; ownership edit denied; second simulated identity SELECT returns zero and UPDATE affects zero. Transaction rolled back. This is a real policy test with simulated claims, not two mailbox-authenticated accounts.
- Five local account suites re-passed after edit/suggestion correction; PHP and JavaScript syntax and diff checks passed. The earlier 15 waitlist suites passed; no waitlist source changed.
- Fresh production email journey and password reset are not yet claimed passed. Owner must review preview before merge/deployment. Do not inspect mismatched Resend logs; WL-WEBHOOK and WL-RECOVERY remain separate.
