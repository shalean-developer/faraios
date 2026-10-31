# T19 staging owner review and approval

T19 remains In progress. This amendment adds review controls to the standard backend direction; no financial write or worker activation is authorised by installing it. T20 remains Not started.

The owner can inspect saved invoice details and separate queued, retry, review-required and verified states through the existing workspace. Approval requires explicit confirmation bound to invoice version, amount, customer ID and current connection generation/organisation. The server rechecks live owner membership and session. The previous unreviewed approval endpoint loses authenticated execution. Privileged implementations remain private behind public invoker facades. Tokens are never returned by review RPCs.

Missing historical tax evidence holds approval without rewriting the saved agreement. The current worker supports the existing non-VAT contract only. A dispatched uncertain outcome can be requeued solely for reconciliation by its current approving owner, preserving identity and dispatch history. It cannot create a replacement invoice. Five attempts remain the limit.

## Validation and release

Local focused validation: 19 tests passed across worker/database, handler, invoice review and connection pages. Five updated handler/page tests also passed after adding reconciliation controls. The broader hosted test run had 31 passes and two Unix listener EPERM failures in this execution environment; do not treat that run as full acceptance. Native PostgreSQL CI remains required before merge. No actual invoice approval or provider creation was performed by these tests.

Apply database/t19-standard-invoice-review.sql after the jobs and approval-facade migrations. Deploy the matching handler, renderer and staging capability allowlist together. Verify actual owner access, manager/anonymous denial, private schema exclusion, public invoker privileges and empty queue before any activation. The invoice-worker.json enable file and recurring schedule remain absent.

## Proposed synthetic acceptance case — awaiting exact owner approval

Prepare a fresh synthetic customer named `FaraiOS T19 Synthetic Customer`, one synthetic staging service, quantity 1, R100.00 ZAR total, non-VAT under the current staging policy, and draft-only creation in `FaraiOS - Shalean TEST` (943440851). Do not send, record payment or modify live records. Do not reuse the historical customer invoice. Nothing in this proposal creates the customer, internal draft, approval or Zoho invoice.

A matching synthetic Zoho TEST customer ID must first be verified. Current OAuth scopes allow contacts.READ, not contacts.CREATE; do not silently broaden scopes. Exact date and complete internal draft details must be reviewed before external financial-write approval. After approval, run one controlled worker pass and record the resulting Zoho ID, then prove retry/interruption reconciliation without duplicate POSTs. Bokkie enrollment, independent credentials, mapping/isolation, recurring execution evidence, recovery instructions and owner acceptance remain outstanding.

## Rollback

Disable the worker and recurring execution first. Preserve job approvals, dispatch flags, receipts, encrypted connections and historical migrations. Roll back matching application source together; do not restore the unreviewed approval privilege or delete accounting evidence. Production is untouched.
