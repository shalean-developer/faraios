# BOOK-05 hosted checkout — 18 November 2026

Private synthetic acceptance for the isolated faraios-checkout-preview project. The customer-facing website and production database are outside this deployment. The PHP runtime and operator-only launcher reside in an isolated mount. Source is stacked on draft PR #87 at d2020bfd.

Plesk calls one pinned Supabase HTTPS Edge Function. It authenticates every operation using a high-entropy server-only credential and a SHA-256 verifier. The Edge Function connects under book05_checkout_login using a separate secret, TLS verification, and five parameterized operations. No arbitrary SQL, owner JWT, table grants or service-role key. The operator entry requires the existing platform owner; the Paystack webhook independently validates its signature and verifies the test transaction with Paystack. Disabling the Edge Function or revoking the runtime credential stops the private path. Keep verification available for any unreconciled receipts before removal.

## Hosted acceptance

- Anonymous quote HTTP 401. Authenticated quote HTTP 200, Gardens, 2 bedrooms, 1 bathroom, service fee, 37500 ZAR cents, 300 minutes, 09:00 SAST. The booking form and hold worked through the hosted PHP runtime.
- Paystack rejected the .test address on the first attempt. No booking or assignment was created for that attempt. A fresh test used a reserved example.com address.
- 20 November 2026 09:00 SAST synthetic visit. Paystack Test Mode displayed Shalean Cleaning Services and ZAR 375. The independent server-side verify result returned domain test, success, ZAR, 37500 and reference fi-5e95cc4b-fba5-4625-8e29-43ca7b5afab5.
- The customer returned to Booking confirmed. Booking e02f6e1f-602c-4c93-8c56-a9b83e7197d2 has one booking row and one cleaner assignment. An invalid webhook signature returned 403. Two operator-generated signed replays of the successful charge returned 200. Counts remained one and one after both replays.
- The hosted success proves the provider callback and private HTTPS checkout for one synthetic merchant. The signed replays exercise the handler. They do not prove delivery directly from Paystack. Multi-business routing, bank settlement, automated refunds, manual EFT and public rollout are separate checks.

- Paystack hosted decline tested on fi-89b0d632-205d-4806-a49f-52736855a7ad. The provider showed Declined and the database showed zero bookings and assignments. The first abandoned attempt passed its deadline and the 09:00 slot became available again. The confirmed visit's 09:00 slot remained unavailable. An anonymous request to the private browser launcher returned HTTP 403.

## Fixture boundaries

The private launcher preloads synthetic cleaning details and then hands off to the PR #87 slot, hold, review, provider and return screens. Its return link opens the private launcher. The hosted-only overlay pins the preview project and mount. Production PHP is not patched by this branch. Secret files are outside the document root with owner-only permissions. The deploy-time publishable key should be read from preview configuration. No test secret or database password belongs in this directory.

## Operator review for unbooked payments

The private checkout links to `payments.php`. The platform owner can search by Paystack transaction ID or FaraiOS payment reference, request a full test refund for a verified unbooked payment, and refresh the merchant’s refund records. A request with an uncertain outcome remains recorded for reconciliation. Only a full amount reported as processed counts as complete.

The private database found Shalean transaction 6776264389 (ZAR 375.00) by both transaction ID and payment reference. A transaction rolled back after verification showed that only the first refund claim succeeds. The replacement booking retained one assignment. Local HTTP tests with a simulated provider covered the operator view, denied access, CSRF validation, duplicate submission and the transition from pending to processed. Ten status checks covered partial, failed and other responses.

Hosted acceptance still requires confirming the installed PHP files, opening the operator screen and matching its refund status to Paystack Test Mode. At this checkpoint the isolated database migration and gateway version 4 are installed. The browser connection was interrupted during the PHP install. No refund was submitted in these checks.
