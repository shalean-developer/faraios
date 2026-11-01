# T20 private payment storage candidate

1 November 2026. T20 only; source preparation/isolated testing. T19 Done, T21 Not started. Not an installed migration or payment activation.

## Bounded implementation

The candidate SQL adds private staging account metadata, immutable full-invoice payment intents, sanitized status observations and at most one payment credit per business invoice. It stores no provider secret, card data, customer details or raw webhook body. Account metadata does not prove actual provider ownership; that remains a TEST activation prerequisite. No booking/invoice/Zoho/earnings/payout state is changed.

Owner account configuration reuses existing live business membership checks. Owner/manager intent creation reads the saved invoice's integer ZAR amount, never a client-supplied price; staff/foreign users are denied. Repeated pending requests reuse their existing intent/reference. The model is full-invoice only; no deposits/partial payments, EFT, refunds or subscription features are introduced. Actual checkout eligibility against invoice lifecycle remains to qualify before any runtime is mounted.

Private tables enable RLS and grant no direct data access to browser, service_role or verifier roles. Narrow SECURITY DEFINER functions have empty search paths and PUBLIC execution revoked. Candidate authenticated callers can configure their own account (owner only) or create their own intent (owner/manager); the future verifier role can only publish already verified observations. The helper authorization function remains private. The verifier is NOLOGIN/NOINHERIT with no deployed login membership, public RPC or Auth principal. This does not qualify a hosted verifier identity. Future HTTPS composition must separately prove genuine server identity/session, exact account authorization and signature/API verification before publication. Do not grant verifier membership to browsers or reuse a broad service key.

Publishing takes the existing account lock, invoice lock and intent lock in that order. Observation insertion, provider identity binding and credit publication occur in one transaction. Unique constraints bind account+transaction, intent+transaction+status, and business+invoice credit. Failed/pending outcomes never credit; a later verified success may upgrade them. Repeated success adds no second observation/credit. Late pending/failure cannot downgrade paid. A second genuinely successful payment attempt against an already credited invoice is retained as review_required, without allocating a second credit or automatically refunding. Invalid bindings/amount/currency or reuse of one transaction across invoices roll back the entire statement. Unsupported reversal statuses reject; future operator review remains separate from refund execution.

These private records represent verification outcomes and an allocation safeguard, not financial settlement, bank reconciliation, or permission to mark a Zoho invoice paid. T21 and later tasks retain their own scope.

## Evidence and limits

20 focused tests PASS, 1 native test skipped locally: node --test test/t20-payment-store.test.js test/t20-payment-verification.test.js. SQL tests run actual candidate DDL/functions in disposable PGlite, with owner/manager/staff/foreign/anon/service/verifier role checks and both-business positive cases. The minimal invoice fixture covers existing columns/composite ownership keys used here, not the entire hosted invoice dependency graph.

The separate Node24 runner creates its own ephemeral local PostgreSQL cluster/database and cleans only that exact random directory. It never reads application DB configuration. Native test disconnects an uncommitted publication, then delivers the same success from three independent connections, and finally repeats it from a fresh connection after accepted commits. It requires exactly one observation/credit and one changed result. CI must emit T20_PAYMENT_CONCURRENCY_NATIVE_PASS, T20_PAYMENT_STORE_NATIVE_PASS and CI_POLICY_T20_PAYMENT_NATIVE_PASS. Ordinary npm test never launches a cluster; a local skip is not concurrency acceptance. No native PASS claimed until exact-head logs verify these markers.

The verification JS and SQL are separately tested candidates; no runtime adapter yet joins them. Their changed booleans have different meanings: JS proposes a payment-state transition, SQL records a new observation, which can leave the paid state unchanged. A future adapter must preserve that distinction. A verified signature alone does not establish business routing; future trusted account lookup must supply the binding. No durable intake/acknowledgement queue or actual checkout has been activated.

## Next T20 gate and rollback

Review exact-head CI, SQL privileges/locking and collision/rollback evidence. Then prepare the minimal trusted TEST backend/HTTPS facade and account configuration adapter, not a new custody service. Inspect existing hosted principal boundaries before choosing a credential-delivery delta. Only later qualify per-business TEST account ownership and explicitly approved synthetic checkout success/failure/replay/delay acceptance. Existing payment-dispatch block stays intact throughout source preparation.

No hosted migration, roles, grants, credentials, webhook, checkout or provider request occurred. Source rollback is to omit/revert the new candidate files and the single CI invocation. Do not run this SQL against staging without a concrete reviewed deployment/rollback package. Existing T19 evidence, permissions, jobs and connections are untouched. T20 remains In progress.
