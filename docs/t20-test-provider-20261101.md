# T20 TEST provider adapter

1 November 2026 SAST. Scope: canonical T20 business-specific payment accounts and verified events. T19 Done; T21 Not started.

## Verified audit and direction

Staging source base cf5dcbd082ac02f6b0e4eea101b20ad63910cd7e includes the private durable store and live-session-gated backend. Current payment dispatch remains disabled. The owner saved independent TEST keys after correcting an identical-key copy. Protected server checks verified distinct full TEST key shapes, exact configured business/account metadata, disabled settings, directory0700/files0600 and separate HTTP200 authenticated read-only timeout requests. The timeout endpoint does not identify the numeric account. Dashboard switching confirmed Shalean1019240 and Bokkie1855953 with distinct TEST public keys. These are credential-setup facts, not final provider account-binding or payment acceptance evidence.

This bounded change adds only src/t20-paystack-test-provider.js and its isolated tests. It has no runtime import, file loader, route mounting, schema change, credential access at import, scheduled job or provider call during tests. Existing T19 and unrelated work remain untouched.

## Behaviour and controls

- One adapter instance pins one trusted business/account and TEST secret. Only staging/ZAR saved intents with server-generated FOS UUID references can proceed. Credentials never come from request metadata.
- Initialization requires an explicitly approved trusted-controller call, takes the saved amount/reference, and permits card checkout only. No splits, authorization reuse, subscriptions, transfers, refunds or EFT reconciliation. The approval argument is an internal contract, not an authorization mechanism: a future route must independently check membership, saved intent ownership and explicit TEST approval. Do not mount this module directly as a browser API.
- Outbound requests use only the fixed HTTPS Paystack initialize/verify paths, default certificate validation, no redirects, a12second timeout and262144byte response limit. Provider messages/errors are never returned. Initialization returns only exact reference and an allowlisted checkout URL; access codes, customer/card data and secrets are excluded.
- Unknown initialization outcomes never trigger an automatic POST retry or a replacement reference. The durable saved intent must survive; reconcile that exact reference with GET verification. A future durable dispatch guard must fence concurrent initialization before enabling the route. This adapter alone does not claim durable checkout initialization idempotency.
- Verification distinguishes API success from transaction state and returns sanitized bound observations for the existing atomic store. Browser callback data never marks a payment paid. The fixed callback path is a candidate contract and is not mounted by this change.
- Webhooks require exact raw-body HMAC verification before any network request, followed by authenticated GET verification and matching successful transaction ID. The controller must look up the saved intent under its pinned account, publish atomically and acknowledge only after successful durable commit. No intake/acknowledgement route is introduced here.
- Numeric accountId is a trusted configuration binding. Current documented verify responses do not reliably expose it; do not invent API account identity evidence. Hosted acceptance must use unique synthetic references visible under the intended dashboard and verify wrong-account key isolation before activation.

## Evidence and remaining acceptance

36 focused tests PASS, one native-only case explicitly skipped locally across provider/verification/backend/store tests. New8provider tests cover saved checkout body, approval denial, cross-business/account/environment/amount rejection before I/O, sanitized success/failure/pending verification, live-domain/reference/amount mismatch, redacted errors, uncertain POST no retry, foreign checkout URLs, redirects, oversized/invalid responses and signature-before-network plus authenticated transaction match. Existing durable store tests cover failure/delay/replay and single-credit publication; native CI remains required. Mock provider tests are not real checkout or hosted route evidence.

Official documentation checked1November2026: https://paystack.com/docs/api/transaction/ (initialize/verify, saved reference and currency subunits), https://paystack.com/docs/payments/webhooks/ (signature and raw bytes), https://paystack.com/docs/api/authentication/ (TEST versus live). No unsupported account-discovery endpoint is assumed.

Next within T20: private file loading and durable checkout dispatch fence, authenticated owner/manager route and raw-body webhook composition, reviewed TEST-only activation, then explicit synthetic success/failure/replay/delayed-event and business-isolation acceptance. Provider checkout and shared activation are not performed by this source change. No need to copy more keys for this increment.

Rollback: revert/remove the three unmounted files. No data, key, account, webhook, hosting or database rollback is required for this source increment. Existing empty-store rollback becomes inapplicable once account/payment data is populated; preserve it as historical evidence rather than dropping populated tables.

Decision: PASS for isolated adapter preparation; NO-GO for payment activation or T20 closure until the remaining composed and hosted acceptance evidence exists.
