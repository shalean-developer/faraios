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

## Approved preview deployment — 14 November 2026

Owner explicitly approved additive migration and preview-only deployment. Applied service_rooms_extras_pricing in rxelmugnucfajrqmphhe through the Faraios connector; hosted migration ledger version20261114001631 corresponds to source20261113235814. Application candidate a55f38f9a723fac7b5c256b072e6571973b9d8f0 pulled and deployed only through faraios-accounts-preview.git, existing Plesk session; deployment completed/Done. Production repository remains main PR16; waitlist preview unchanged. Fresh Allanux login opened a sign-in page, but existing authorized Plesk session successfully pulled/deployed; no login workaround or permission change.

PASS hosted pure calculation: fictional 2 bedrooms/2 bathrooms/oven, base505, allowances1/1, additional60/80/100 → ZAR745 and185 minutes; quote total remains null, repeated option rejected, malformed scope rejected. Anonymous calculator execution false, anonymous request read false, authenticated direct request update false. No fixture or catalogue write was needed for these checks.

PASS hosted public legacy-service regression: new cached assets loaded; Service hides summary; selecting Standard directly opens Details with unchanged ZAR505/120m, address/unit/requirements and new summary fields. Desktop1280 screenshot inspected; mobile390 document375, expandable summary, reachable controls/no horizontal overflow. Viewport reset. No booking submitted. See [hosted desktop](evidence/rooms-hosted-desktop.png) and [hosted mobile](evidence/rooms-hosted-mobile.png).

PASS pre/post fingerprints identical for all protected rows: catalogues3 b71019fe9bdd26d267d0803898977f5d; requests5 f3d38db8089e7633513660eeb51a2218 (exclude additive null scope field from row representation); quotes7 fae0b987eb255f8f759a65e9457b970e; bookings13 02a5087e38c002f2d93b0d52be8f8aeb; invoices5 74925701dba50667f000f9cdff5ac737; payments9 37789d4f7c3ae4bf7a7f831a32fe57dd; staff5 9c2ea5a2b5cc12a8996348fe2192f76c; enquiries9 a9acc9792414d2f2963d748fa5ef2d0a; public pages1 97d15b5ace113f1619b359b2f4b65ba4. Request preview gate true/live false, live pages0/live requests0. No existing records or service prices changed. Existing security advisor notices unchanged: intentional deny-all private table INFO and leaked-password-protection WARN.

Owner Services access redirected to Welcome back: authenticated session expired. Owner editor hosted verification is pending sign-in; sign-in tab retained. No service options configured/published. Customer rooms/extras end-to-end evidence remains isolated until business configuration or a separately authorized new hosted fixture is available. Prior deployment block is resolved by owner's approval and successful preview deployment.

Decision: PASS additive migration, preview deployment and public/calculator checks; CONDITIONAL PASS owner acceptance pending signed-in editor verification. Production NO-GO; no merge, production application deployment or live-intake activation.
