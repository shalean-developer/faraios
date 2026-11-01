# T20 staging checkout return

Canonical requirement: business-specific payment accounts and verified events; success, failure, replay and delayed-event acceptance. T19 Done; T20 In progress; T21 Not started.

The provider adapter already uses https://staging.faraios.com/payments/return but this route was missing. This increment completes the existing callback path; no production, EFT, refund, transfer or unrelated feature.

GET accepts only a valid saved FOS UUID reference and optional identical trxref. It requires the existing signed-in staging session, finds exactly one saved record through the enrolled backend accounts, then checks actual human business/record permission through t20_payment_owner status. It displays saved status and a verification form. It performs no provider verification/publication on GET and never trusts redirect status/amount/account metadata.

POST accepts only that reference, same Origin/Host and current session. After the same database authorization it runs the existing authenticated provider verification and atomic publisher. Paid is shown only when the publisher returns paid. Failure remains a fixed error; retry uses verification GET at the provider, never checkout initialization. Duplicate credit and late-event behavior remain governed by the existing SQL transition rules.

The response uses no-store, same-origin Referrer-Policy (so the form retains an Origin), CSP denying external resources/framing and self-only forms. Generated HTML uses only validated UUID references, business UUIDs and allowlisted statuses. No credentials, customer/payment details or external scripts appear.

Validation: 19 targeted tests passed locally across callback, controller and provider suites. These include GET with zero publication, POST permission-before-verification, anonymous/hostile/duplicate/mismatched callback rejection, provider failure, exact trusted-account resolution and ambiguous/mismatched record denial. Existing native SQL tests remain necessary; these tests alone do not prove hosted checkout acceptance.

Rollback: revert this increment's two source modules and test/document; preserve account mappings, backend enrollments and any payment evidence. Keep private runtime flags disabled until controlled TEST activation. No migration or credentials required.

Remaining staging evidence: enable the exact TEST runtime deliberately; approve concrete synthetic invoice/reference/amounts before provider initialization; prove intended provider-account binding plus success/failure/replay/delayed delivery. Inspect existing TEST webhook use before any replacement. No live changes.
