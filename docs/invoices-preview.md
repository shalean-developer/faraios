# Invoices and payment tracking — FaraiOS New

Owner scope: manual payments only; fresh project rxelmugnucfajrqmphhe. Base main 6798d1ef21be61a16ffa6c1a8bd8b0a5c79b31b6 (PR #11), independently confirmed through GitHub and connected Plesk. No legacy access, notifications, Resend, online payments or accounting integration. Production staff/booking verification history must remain intact. Shalean public page remains unpublished.

## Smallest complete implementation

Welcome → Invoices. Manual draft or Create / open invoice from saved booking. Booking invoices snapshot the saved agreement server-side; later booking changes cannot rewrite invoices. One invoice per booking, including voided invoices; this version does not create replacement invoices for the same booking. Manual drafts accept up to 20 final-price items and whole quantities, using the business currency at creation. Existing draft currency stays fixed if catalogue currency changes. No separate tax calculation is introduced.

Save/reload drafts and due date. Issue assigns a monotonically increasing INV number per business/environment under a database transaction lock, locks customer/items/prices/currency/due date, and snapshots public business contacts. No account metadata in sender. Invoice links are read-only random 256-bit bearer capabilities, no indexing/caching/referrer leakage, no draft access or arbitrary ID lookups. Customer payload excludes customer email/phone, payment references, correction reasons, actors and internal IDs. Share only with intended customer. No notification is sent.

Record a positive manual payment already received, with date/reference; reject future dates, overpayments, invalid amounts, draft/void payments, and fractional zero-decimal currency payments. Submission UUIDs are idempotent; conflicting reuses reject. Same active invoice payment with same amount/date/reference (case-insensitive) rejects even with a different UUID. Every payment and full reversal is append-only for application roles, with actor/time and event history. Correct mistakes by reversing with a reason and entering a replacement; no actual refund occurs. Void requires net recorded payments zero and a reason. Number, link, original payments and reversal history remain. Draft, Unpaid, Part Paid, Paid and Void derive from locked invoice state and ledger totals.

Owner-only RLS, explicit nonanonymous owner checks in private definer writers, fixed empty search_path, revoked direct DML, public invoker wrappers. Numbering, invoice creation and payments serialize per business/environment. Live gate disabled by default; preview enabled. Production PHP remains main until owner review and explicit Deploy instruction.

## Verification

Disposable PostgreSQL 17 and real PHP HTTP with simulated Auth/PostgREST transport: integer calculations, save/reload, booking snapshot integrity, concurrent invoice creation and issuance, concurrent/replayed payment submissions, partial/full balances, full reversals, void constraints, stale versions, cross-business/environment/anonymous/direct-DML denial, public token isolation, XSS escaping and helper denial. Existing 15 targeted account/profile/service/enquiry/quote/booking/customer/staff tests PASS. Waitlist test cases, workers, webhooks and recovery checks were not run. Local harness initializes existing baseline SQL but invokes no waitlist operations or provider calls.

Hosted preview and mobile verification pending. No production deployment authorized. Rollback: disable invoice_private.ingress for affected environment and restore PR #11 application; retain invoice, ledger, event and counter data. Never reset counters or delete payment history.
