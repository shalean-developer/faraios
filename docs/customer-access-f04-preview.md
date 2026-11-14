# F04 — customer access through confidential links

14 November 2026. Owner selected **Secure links (Recommended)** over full customer accounts. Authorized implementation/test/deployment scope remains accounts-preview only. Based on PR #35 head 7b5802567e2b10508108a84d76bad128daf3e340; do not merge or deploy the preceding batch to production implicitly.

## Audit and decision

Existing customer.php authenticated Supabase users in business/mount-scoped sessions but then displayed that customer booking history and profile management were unavailable. It had no customer registration/recovery/verified record ownership journey. Signing in did not grant a usable customer portal. The existing quote and invoice bearer-capability RPCs already provide bounded single-document access; public booking already supports guest requests. Reuse them rather than inventing another account or document store.

Initial contract: a customer opens the confidential document URL supplied by the business, responds to that quote if still eligible, reads that invoice, or requests a booking as a guest. A booking reference is a support reference, not proof of identity or an online status capability. Changes/cancellation/history/missing or misdirected links go through the selected business, with identity verification before disclosure. Anyone holding a bearer link can open that one document; no claim of verified-recipient authentication or automatic token revocation is made.

## Implementation

Preview public site/booking header offers Customer help instead of Sign in/avatar. The old customer URL now serves business-branded, published-snapshot-only help without reading either owner or legacy customer sessions. Cached header probes return authenticated=false. Credential POST and all mutations reject with 405. No sign-up, recovery, password collection, account-history promises or customer record enumeration. Owner sign-in/dashboard remain separate. Live customer route/header behavior remains unchanged until release authorization.

Help explains confidential quote/invoice links, pending booking requests, references, missing-link recovery through the business, and current self-service limits. Contact and return paths stay within the selected business; arbitrary redirects are ignored. Booking CTA reflects the existing read-only gate and visible published service availability; it cannot activate intake. Return links retain all five wizard step names and the existing tab draft. Draft owner website previews omit the public help link until publication.

Existing preview quote/invoice pages clarify no account is needed and that a link opens only that document. Both use no-referrer, no-store/noindex controls; malformed token arrays reject without PHP type warnings. No new schema, auth configuration, grants, memberships, account deletion, emails, published content edits or data migrations. Legacy customer sessions are not consumed or rewritten by help.

## Verification

PASS native PostgreSQL 17/PHP 8.4 customer-access test: published business scoping, owner session independence, no credential form/cookie, credential POST/method denial, unknown/malformed/unpublished slug and helper denial, return-path allowlist, gate-aware CTA, all five step return URLs, no enumeration by ID/email, valid single-document capability access and invalid-token denial, other-owner financial isolation. Auth/PostgREST transport simulated; database RLS/RPCs run natively. Existing business-header, foundation, quote, invoice, booking-request, rooms and live publication regressions pass. PR application workflow includes customer-access and business-header suites.

Hosted visual/browser and latest-head CI evidence pending.

## Release and rollback

Preview-only delivery. Restore preview application to PR #35 to roll back; no data rollback required. Existing public pages, enquiry/quote/invoice/payment records and five-step booking implementation remain intact. No live booking intake activation or Shalean republication. Production application release still requires explicit authorization.

Next: F05 extend automated full-journey/auth/isolation coverage and F06 restore/operational visibility evidence, followed by shared-core capability specification. Full customer accounts stay deferred until a complete verified ownership/history/recovery contract is approved.
