# Service rooms, extras and pricing — preview candidate

Owner approved implementation on 14 November 2026 after the source audit and Shalean live UI comparison. PR17 branch feature/online-booking-requests-20261113; inspected baseline 6acc0f35a1bbb71b81d45a1d3ec31243560e56f6. This is a reviewable implementation, not a production release.

## Behavior

Services → Edit → Rooms and extras configures up to 19 options per service: one Bedrooms, one Bathrooms, named extra rooms, quantity extras and selectable extras. Each has a stable ID, name, minimum/maximum, included quantity, additional unit price and additional minutes. Enable, save privately and explicitly publish through the existing catalogue workflow. Disabling removes it from the next published configuration; historical snapshots remain. No default business prices are assigned.

Customer Details keeps address/unit and Requirements, adding only the selected published service's room controls and extras. Quantity presets plus custom quantities, selected extra cards, immediate itemized totals and estimated duration. Summary remains hidden only on Service. Back/Continue retains entries. No-JavaScript fallback provides a read-only Show selected service options action, then numeric controls and the existing server-validated full form.

Price = base + sum(max(0, quantity − included) × additional unit price).
Duration = base minutes + sum(max(0, quantity − included) × additional minutes).
No discount for fewer than included quantities. Selectable extras respect configured minimums and included allowances.

Fixed shows the calculated amount. From shows the calculated starting amount and still requires a customer-accepted quote. Quote required never presents a complete total, although known addition charges remain visible. Quote/from acceptance rules are unchanged. Catalogue price and option changes never reprice existing records.

## Integrity

Additive CLI-created migration 20261113235814_service_rooms_extras_pricing.sql. No UPDATE/DELETE/INSERT of existing business records in the migration. Existing service/document shapes remain valid. Optional service options; nullable request scope; optional validated document scope. No new tables or exposed schemas; existing RLS and owner-checked RPC architecture retained. Pure calculators have no table access; narrow public invoker submit overload delegates to existing private definer intake checks. Fixed search_path, explicit grants. Legacy submit delegates to the same calculator and cannot omit configured quantities.

Database independently computes from the published, transactionally locked service snapshot. Rejects unknown/repeated/foreign-service IDs, missing quantities, malformed/fractional/negative/out-of-range values, stale published rules/currency/zone, maximum total/duration overflow and unsupported zero-decimal prices. Canonical selections make equivalent input ordering identical. UUID retry comparison includes scope; shared conversion serialization and unique links remain.

Scope captures the original service/rules, all selections including included/free options, calculated charge lines, currency, pricing mode, total or null, and duration. Requests display the calculated amount and full scope. Request quote creation and Enquiries → Quote seed scope/items. Database quote writes attach trusted request scope and preserve it during draft price edits. Accepted offered document items remain the agreed financial amount; original requested scope is labelled separately. Scoped fixed bookings preserve their saved agreement on routine edits. Accepted quote → Booking → Invoice copies document/scope; ordinary saves cannot silently discard it. Manual documents cannot inject scope. Existing unscoped documents retain prior editing behavior.

## Verification

PASS disposable PostgreSQL17.11 and PHP8.4.27: tests/rooms.py includes the existing requests lifecycle and tests catalogue validation, owner save/reload/private draft publication separation, stale owner versions, room bounds/included allowances, exact price/duration, quote/from customer acceptance, snapshot retention through invoice issuance/customer access, legacy requests, server tampering, cross-business denial, concurrent retries, repeat conversion, changed retry rejection, canonical ordering and overflow. Simulated Auth/PostgREST transport; real native roles/RLS/functions/constraints. No real emails/provider calls.

PASS regressions against the complete current migration chain: services, quotes, bookings, customers, staff, invoices, dashboard. All PHP syntax, browser JS syntax and diff whitespace checks passed.

PASS tests/rooms-browser.py with real local Chromium156, desktop1280x900 and mobile390x844: preset/custom quantities, extra toggling, ZAR745/185 minutes then ZAR865 after custom quantity, retained selection after Back/Service/Details, summary hidden on Service, complete review, no mobile horizontal overflow or page errors, and real local HTTP submission with pending-confirmation success. Existing two-second anti-spam minimum retained. The harness now emulates the existing /b/{slug} rewrite. Test runtime dependencies stay outside application dependencies.

Evidence: [Desktop](evidence/rooms-desktop.png), [Mobile](evidence/rooms-mobile.png). Fictional test values only.

Example test command: PHP_BIN=/path/to/php PG_BIN=/path/to/postgresql/bin PG_LIB=/path/to/libs python tests/rooms.py. Optional browser smoke: configure BROWSER_BIN and PLAYWRIGHT_MODULE, then python tests/rooms-browser.py. EVIDENCE_DIR selects the screenshot destination.

## Hosted status and next gate

No hosted migration, record change, service configuration, deployment, merge or live-intake activation performed. Hosted security advisors read-only: existing private deny-all table INFO notices and existing leaked-password-protection WARN; no settings changed. Read-only baseline: catalogues3, requests5, quotes7, bookings13, invoices5, payments9, staff5, enquiries9, public pages1, live public pages0.

Automatic approval review rejected access to the signed-in Allanux hosting origin, interpreting the earlier deployment restriction as covering preview actions and the private hosting account as outside scope. No alternate hosting access or deployment workaround attempted. Preview-only deployment authorization remains necessary before applying the additive migration and deploying accounts-preview. Production remains prohibited.

After preview authorization: re-read current schema/branch, capture protected-row fingerprints, apply only this additive migration, deploy only accounts-preview, verify owner editor and unchanged legacy service flow. Do not configure existing services or change test records without authorization. Any richer hosted fixture must be newly created and explicitly labelled; test prices must never be assigned to real services. Verify fingerprints/gates unchanged and show owner the preview. Document that end-to-end rooms verification is currently isolated, not hosted.

Rollback candidate application to 6acc0f35. Before removing the optional-column schema, retain all new scopes and agreements; do not drop history. Old public submit already routes through the calculator and refuses configured services without quantities, so published options should not be introduced until preview verification. Production rollback/release is a separate owner-controlled action.

Decision: PASS isolated implementation and regression validation; hosted preview pending. Production NO-GO.
