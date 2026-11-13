# Invoices and payment tracking — FaraiOS New

Owner scope: manual payments only; fresh project rxelmugnucfajrqmphhe. Base main 6798d1ef21be61a16ffa6c1a8bd8b0a5c79b31b6 (PR #11), independently confirmed through GitHub and connected Plesk. No legacy access, notifications, Resend, online payments or accounting integration. Production staff/booking verification history must remain intact. Shalean public page remains unpublished.

## Smallest complete implementation

Welcome → Invoices. Manual draft or Create / open invoice from saved booking. Booking invoices snapshot the saved agreement server-side; later booking changes cannot rewrite invoices. One invoice per booking, including voided invoices; this version does not create replacement invoices for the same booking. Manual drafts accept up to 20 final-price items and whole quantities, using the business currency at creation. Existing draft currency stays fixed if catalogue currency changes. No separate tax calculation is introduced.

Save/reload drafts and due date. Issue assigns a monotonically increasing INV number per business/environment under a database transaction lock, locks customer/items/prices/currency/due date, and snapshots public business contacts. No account metadata in sender. Invoice links are read-only random 256-bit bearer capabilities, no indexing/caching/referrer leakage, no draft access or arbitrary ID lookups. Customer payload excludes customer email/phone, payment references, correction reasons, actors and internal IDs. Share only with intended customer. No notification is sent.

Record a positive manual payment already received, with date/reference; reject future dates, overpayments, invalid amounts, draft/void payments, and fractional zero-decimal currency payments. Submission UUIDs are idempotent; conflicting reuses reject. Same active invoice payment with same amount/date/reference (case-insensitive) rejects even with a different UUID. Every payment and full reversal is append-only for application roles, with actor/time and event history. Correct mistakes by reversing with a reason and entering a replacement; no actual refund occurs. Void requires net recorded payments zero and a reason. Number, link, original payments and reversal history remain. Draft, Unpaid, Part Paid, Paid and Void derive from locked invoice state and ledger totals.

Owner-only RLS, explicit nonanonymous owner checks in private definer writers, fixed empty search_path, revoked direct DML, public invoker wrappers. Numbering, invoice creation and payments serialize per business/environment. Live gate disabled by default; preview enabled. Production PHP remains main until owner review and explicit Deploy instruction.

## Verification

Disposable PostgreSQL 17 and real PHP HTTP with simulated Auth/PostgREST transport: integer calculations, save/reload, booking snapshot integrity, concurrent invoice creation and issuance, concurrent/replayed payment submissions, partial/full balances, full reversals, void constraints, stale versions, cross-business/environment/anonymous/direct-DML denial, public token isolation, XSS escaping and helper denial. Existing 15 targeted account/profile/service/enquiry/quote/booking/customer/staff tests PASS. Waitlist test cases, workers, webhooks and recovery checks were not run. Local harness initializes existing baseline SQL but invokes no waitlist operations or provider calls.

Hosted preview and mobile verification PASS on 13 November 2026. No production deployment authorized. Rollback: disable invoice_private.ingress for affected environment and restore PR #11 application; retain invoice, ledger, event and counter data. Never reset counters or delete payment history.


## Hosted evidence — 13 November 2026

Draft PR #12; deployed application 7568a56455172dcd3530c4849b34febac68cac89 to /_accounts-preview only using connected Plesk. Production repository remained main at PR #11. Native invoice journey plus the 15 existing regression tests PASS (16 targeted tests total). Hosted rollback-only financial/role probes PASS with simulated JWT identities, no retained probe fixtures. No paid CI workflow introduced.

Authenticated fictional preview invoices:
- 4833E252 / INV-000001: manual draft save/reload, 2 × R250.25 + 3 × R10 = R530.50. Issue → Unpaid; R200 payment → Part Paid / R330.50 balance; duplicate rejected; R330.50 → Paid. Full reversal retained original entry and reason, returned to Part Paid, replacement R330.50 restored Paid. Four immutable ledger entries remain (three payments and one reversal). Customer link matched totals/status and exposed no write controls.
- DFA8AABD / INV-000002: from new labelled fictional PREVIEW booking 4F5E5DE0, 2 × R225.25 = R450.50. Draft reload and issuance preserved the saved agreement; void with reason retained number/history; repeated booking creation opened this existing void invoice. This version allows one invoice per booking, so replacements for voided booking invoices are a documented future extension.

Desktop invoice list and customer page visually reviewed. At 390 × 844 the customer invoice and owner invoice/history fit without horizontal overflow; owner draft form and status filter inspected. Temporary viewport reset. Screenshots in docs/evidence/invoices-*.jpg. Browser interaction timeouts were recovered by checking observed state before continuing; successful submissions were not blindly repeated.

All pre-existing booking, quote and staff record fingerprints match before/after (the one newly authorised fictional preview booking is excluded from the booking comparison): bookings 6c17605e8ed3bb2e60a2f1e3b81f492c, quotes 1be781b4754930d66944ea0943488e62, staff 0babe4129c1f13c6db0e358b2ec4b5ff. Production verification bookings 8EF88DF7 and 14616616 remain Cancelled. New invoice RLS true, direct authenticated payment UPDATE false, preview gate true/live false, live invoices 0, preview invoices 2, Shalean unpublished. Homepage and waitlist source unchanged. No account/business records modified.

Migration 20261113122458 is recorded with full source; LF-normalized source MD5 b6c9cac99ae7fb103d5507b1469eeee1 matches committed migration. The initial migration-history source had a string-escaping discrepancy; its stored source was corrected, with no schema or business-record change. Security Advisor rerun: 0 errors, 1 Auth warning (Leaked Password Protection Disabled), 12 informational suggestions. Auth configuration was not changed in this feature.

Decision: PASS for owner preview review. Production remains gated pending explicit owner deployment approval and release review. Scope exclusions and rollback above remain in force.
