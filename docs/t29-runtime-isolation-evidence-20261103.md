# T29 — Runtime isolation evidence and final acceptance limitations
Date: 2026-11-03. Scope: owner-approved fresh-start rehearsal; not a historical import.

## Read-only hosted staging observation
Read-only connected Supabase SQL against FaraiOS staging `xdmfyrsauvqznkloroxg` showed `private_t26.settings`: 2 business rows, both `mode='disabled'`, none `sink`. No `pg_cron`, `pg_net` or `wrappers` extension is installed; `cron.job` relation absent. These checks do not inspect Plesk scheduled tasks, active Node/worker processes, private payment dispatch settings, or external network egress. No production SQL was run.

## Runtime-capability code and synthetic gate
Existing `src/t20-payment-runtime.js` refuses to load payment accounts when explicit settings are disabled; `src/t19-accounting-worker.js` rejects an inactive machine before resolving pending work. `src/hosted-staging.js` scopes SDK requests and does not permit provider hosts by default, but explicitly cautions that this is NOT an OS network sandbox; some accounting, payment and recurring RPC capabilities are opt-in or allowed for other stage tasks. These are not automatically switched off for all possible hosted routes.

Added `test/t29-runtime-isolation.test.js` at commit `33f30477ba8534a92f87b7a1e5b69503bed7cdd7`. It invokes the actual booking parser/create function with synthetic tenant-scoped in-memory adapter; runs disabled payment runtime and inactive accounting worker code; verifies disallowed Paystack, Zoho, email-domain and payment/EFT/invoice-enqueue RPC requests are rejected before network dispatch. It asserts no notification, payout or recurrence handler was invoked by this narrowly defined rehearsal. All synthetic identifiers are fictitious. No hosted database, payment account or production source is written.

## Evidence classification
- Hosted notification mode metadata: PASS for both configured businesses at time queried.
- Postgres cron/network extension absence: PASS for inspected extensions.
- Disconnected T29 synthetic service capability test: PENDING latest-head CI at authoring, then PASS only if successful.
- Complete hosted runtime outbound isolation: NOT VERIFIED (Plesk scheduler, full worker state, private payment/accounting config and independent egress restriction).
- Isolated PostgreSQL rollback/repeatability: prior CI PASS for synthetic fixture only.
- Hosted authenticated Bokkie-only manager Shalean dashboard: owner-supplied 403; read-only hosted RLS denied selected foreign records.

## Required before unconditional staging acceptance
Independently verify runtime isolation for the exact selected T29 rehearsal execution target (not live production) including disabled scheduled workers, Paystack/Zoho/EFT dispatch, outbound email/SMS notifications, payouts and recurrence generation, with non-secret evidence and no actual sends. Do not convert source-level zero-call assertions into a claim of a system-wide network sandbox. No production cutover, release or T30. Keep PR #306 Draft and T29 In progress pending these gates and owner acceptance.
