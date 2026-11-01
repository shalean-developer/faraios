# T20 online payments — first bounded source increment

1 November 2026, Africa/Johannesburg. T19 is Done following explicit owner staging acceptance. T20 is In progress; T21 is Not started.

## Scope and authority

Canonical Build Tracker row21: **Business-specific payment accounts and verified events**; acceptance **Success, failure, replay and delayed-event tests pass**. Owner requested T20 only, without extra features. AGENTS.md and blueprint require tenant-scoped accounts, backend-only credentials, saved agreements, distinct booking/invoice/payment/payout states and denial tests.

This increment prepares inactive verification primitives and isolated tests. It introduces no runtime import, endpoint, hosted configuration, database object or provider call. Existing hosted payment-dispatch barriers remain in place. Paystack is the candidate transport, informed by the existing Shalean provider context; neither business's FaraiOS TEST payment account or credential has been selected, inspected or activated. Do not assume a Shalean account belongs to Bokkie.

Exclude manual EFT/evidence reconciliation (T21), refunds, payouts, settlement accounting, subscriptions, stored cards, split payments, notifications and automatic changes to booking, earnings or Zoho records. T19 is not reopened.

## Verified starting point

The staging repository has no dedicated online-payment implementation by filename. Existing access.js defines owner payment_settings.manage and scoped owner/manager payments.record; those permissions alone do not implement online payment verification. Existing hosted transport blocks Paystack payment dispatch. Existing invoices store immutable ZAR totals and separate internal/Zoho draft identity; payment records must not masquerade as invoice sync status.

Official Paystack references reviewed on1November:
- https://paystack.com/docs/payments/webhooks/ — HMAC-SHA512 on raw event bytes; validate before processing. Success events are not a complete failure-status feed.
- https://paystack.com/docs/payments/verify-payments/ — server-side verification by reference; API response.status is distinct from response.data.status; failed, pending and success states differ; avoid duplicate fulfilment.
- https://paystack.com/docs/payments/accept-payments/ — amounts in currency subunits; redirect callback alone is not payment proof.

## This candidate and its limits

src/t20-payment-verification.js verifies bounded raw signatures before parsing; requires a trusted backend business/account/environment binding and exact immutable reference/amount/currency; accepts only TEST domain/ZAR/staging. It strips customer/card metadata from the resulting observation. Only documented charge.success is accepted as a webhook; failure/pending observations come from a successful authenticated verification API response, never an invented charge.failed event or browser success flag. The caller must obtain that API response using the pinned account; the pure response parser is not a network authentication boundary.

The pure transition proposal makes repeated success a no-op, upgrades pending/failed after verified success, and prevents delayed failures/pending states from downgrading paid. A different provider transaction identity cannot replace an existing record. Unsupported reversed/unknown outcomes are rejected for later operator handling; no refund handling is added. No durable exactly-once claim: a future SQL adapter must atomically enforce intent ownership, account binding, version comparison, unique transaction/reference and observation/payment publication. Signed event metadata never selects its tenant.

13 focused synthetic tests PASS (node --test test/t20-payment-verification.test.js). These cover success/failure/pending, replay and delay transitions, malformed signatures/bodies, foreign bindings/live domains, amount/currency/reference mismatches and metadata redaction. They do not prove hosted RLS, concurrent SQL publication, actual TEST provider acceptance or T20 completion. No real customer, payment instrument or financial data used.

## Remaining T20 increments

1. Add a minimal private durable account/intent/event store with scoped owner account administration, immutable invoice/amount/reference binding and transactional idempotency. Native database tests must cover permitted/denied roles, concurrent duplicate delivery, restart, delayed status ordering and distinct business accounts. No new authentication foundation.
2. Add the bounded TEST-only initialize/verify adapter and public raw-body webhook intake. Select the account from trusted backend configuration; never browser metadata. Store/acknowledge durably before background processing; keep credentials and card data out of responses/logs. Qualification must prove actual TEST business account ownership and independent settings before activation.
3. Perform explicitly approved synthetic TEST checkout success/failure and replay/delay verification, verify persistent business-scoped results and visible failures, and obtain staging acceptance. No real charge or production activation is implied.

Before shared schema/credential/activation changes prepare their exact reviewed patch, disabled defaults, evidence and rollback. Source rollback for this increment is removal/revert of these unimported files; no hosted rollback required. Do not import them into the current staging server yet.

Decision: source primitives verified in isolation; T20 remains In progress. Full source CI and durable/hosted acceptance remain outstanding. No wider Build Plan task is started by this increment.
