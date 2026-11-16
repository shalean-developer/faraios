# V1-012 — financial safeguards acceptance

16 November 2026. Verification-only change; no financial application or SQL repair reproduced. Do not deploy this branch or run the one-use hosted operator again. No merge or main change.

Six focused native PostgreSQL/PHP methods pass: concurrent booking invoice creation, consecutive unique invoice numbering and stale issue rejection, exact 53050 total/partial/full balances, competing payments below outstanding balance, append-only linked reversals and a single replacement chain, and role/tenant/direct-write denials. These use disposable synthetic data.

Hosted synthetic owner A/live acceptance exercised four concurrent invoice creation requests to one ID, four same-key payment requests to one receipt, changed-key/duplicate/overpayment rejection, the actual owner PHP remainder-payment form, four concurrent retries for each reversal and one concurrent replacement child. Original issued/void documents, receipts, booking agreement and linked events are retained. No real payment transfer or customer communication. Sanitized receipt is in live-verification.json; private full snapshots stay on the host.

All existing live/preview financial and assignment history and all web/config bytes are compared before/after. Existing V1-003, V1-004, V1-022, SEO/public/dashboard overlays are hash guarded. No delegated access activation or authorization changes.

The one-use CLI operator is review evidence, stored outside the web root with private permissions, explicit synthetic project/business checks, phase guards and no blind replay. It creates fictional accounting records and retains their history. It does not install code or schema.
