# T20 protected checkout and event composition

1 November 2026 SAST. Canonical scope unchanged: business-specific online payment accounts and verified events; success/failure/replay/delayed-event acceptance. T19 Done; T20 In progress; T21 Not started. Base91f0c640ccfbd356e4bd5e954db9a5febb93ea46, following PR283.

## Audit and smallest change

Existing private intents preserve invoice amount/reference and atomic observation/credit publication, but have no durable pre-initialize claim. Existing backend transport permits only payment observation RPCs. Existing auth.withAccountingSession verifies the actual user/session and supplies its own authenticated client; owner_rpc independently checks the live session and actual business membership. Reuse those existing boundaries, without modifying the authentication foundation or T19.

The additive SQL candidate introduces one private RLS/default-deny checkout table and an invoker wrapper. Every checkout call delegates to the existing live-session/enrollment health gate, locks account then invoice then intent in existing order and enforces exact fields. Claim commits once per immutable intent. Only that caller gets dispatch=true. A committed claim never expires or becomes dispatchable again. A crash before POST can therefore require operator investigation; this deliberately favors duplicate prevention over automatic availability. An interrupted uncommitted claim rolls back. A ready result retains only an allowlisted checkout URL, while unknown results cannot become ready through a retry with a new nonce. Null/nonmatching nonce is denied.

The controller pins one independent enabled TEST account per business, rejects duplicate keys/accountIDs, obtains saved intent metadata from scoped backend lookup and claims before POST. Unknown POST outcomes are held; lost final publication leaves a nondispatchable claim. Reconciliation uses only authenticated GET verification, then existing atomic payment publication. Webhook processing authenticates bounded raw bytes before parsing/lookup, verifies the actual provider transaction and acknowledges only after durable publication. Publication errors propagate so provider delivery can retry; no in-memory event is represented as durable storage.

Candidate routes use exact staging host, existing session cookie and current Auth validation. Owner/manager authorization is enforced by the existing database owner_rpc under the real session, not the dedicated backend identity. POST requires same Origin and strict form shape; browser amount/account/reference overrides are not accepted. TEST initialization additionally requires explicit confirmation and a fictitious @example.test email. Status GET performs no provider write. Webhook scope comes from the configured business route and its pinned key, never metadata. Responses are no-store and fixed/redacted on errors. No customer/card data is stored by this increment.

## Source and limits

- database/t20-checkout-dispatch-candidate.sql and additive empty rollback.
- src/t20-payment-controller.js and src/t20-payment-handler.js, unmounted.
- Existing T20 backend client narrowly adds the checkout wrapper and claim/finish commands; its T19/owner/table/provider restrictions remain.
- Focused synthetic controller/route tests, PGlite SQL permission/rollback tests and extended native concurrency/interruption test. The native runner must emit T20_CHECKOUT_DISPATCH_NATIVE_PASS on the reviewed final CI head.

No shared migration, enrollment, configuration enablement, route mounting, provider write, webhook setting, customer message or production activation is performed. Private file loading and hosted transport mounting still require exact deployment/source qualification; the existing protected files remain disabled. Candidate HTTP routes do not constitute a finished staging UI or reliable background retry worker. No claim of T20 closure or actual TEST payment acceptance is made.

## Acceptance and rollback

Isolated acceptance: only one concurrent durable claim; disconnected transaction rolls back; committed claim survives retries; revoked/foreign/unenrolled callers denied; invalid nonce/URL rejected; unknown outcomes cannot repost; signature checked before lookup; failed durable publication is not acknowledged. Existing failure/delay/replay single-credit tests remain required. Real provider business binding and hosted success/failure/replay/delayed delivery acceptance remain outstanding.

Additive rollback removes only the new wrapper/function/table and refuses any checkout data; it preserves accounts, intents, observations, credits, invoices and T19. Once claims exist, retain them for reconciliation; do not drop or reset them. Source rollback restores the previous backend client and removes only the unmounted controller/handler. Existing five-table empty rollback must not be used with this new dependency installed.

Decision: source/isolated preparation only until exact-head CI/native evidence is verified. NO-GO for payment activation or T20 closure before composed hosted acceptance. No wider Build Plan task is started.
