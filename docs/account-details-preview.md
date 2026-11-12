# Account and business details — preview

Base: main 593accb0097eb580c994451effe2486d3e3e8239 (merged PR #2).

Registration already saved personal name as Supabase Auth user_metadata.name. This change preserves that storage, validates Unicode name length/control characters and displays the saved name after sign-in. Metadata is display-only and never used for permissions.

Businesses gain ISO country and IANA time_zone, validated against the same bundled allowlists in PHP and SQL. Columns remain nullable for existing businesses and old live application compatibility. Existing businesses complete their missing location without a duplicate record. Country/time zone UPDATE is owner-scoped, column-limited; ownership/name/type/deletion permissions remain unchanged. No defaults or backfill guesses.

Welcome shows personal name, email, business name/type, country, time zone and complete/needs-details status. Existing homepage/waitlist source and marketing consent are unchanged. No imports, bookings, payments or dashboard.

Local checks: PHP 8.4.27 syntax passed; five account suites passed with real HTTP and disposable PostgreSQL 17.11, simulated Auth/REST. Tests cover invalid names/countries/zones, metadata payload, create/reload, existing-business completion, authenticated/anonymous access, cross-owner SELECT/UPDATE, denied ownership edits and database constraints. Waitlist regression tracked below.

Hosted preview and actual email journeys remain to be verified. Preview shares faraios-new database with production; it is URL/session/source-isolated, not a separate database. Apply only the additive migration after native tests; leave main and production source untouched until owner review. Keep WL-WEBHOOK and WL-RECOVERY open separately; do not inspect mismatched Resend logs.
