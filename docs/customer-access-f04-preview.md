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

## Hosted acceptance evidence

Runtime f0022ff61139d5ece44400a3bdc52914455fe990 deployed manually through faraios-accounts-preview.git → /faraios.com/_accounts-preview. Production main and waitlist repository untouched. Git tree b31c7a565587e7afa82b4af29037dbfba1365852 matches locally tested source. Draft PR #36 is stacked on PR #35; neither merged.

PASS actual Chrome/PHP/Supabase public website → Customer help: business branding, no forms/password inputs or customer sign-in, private-link explanation, contact and guest-booking actions. Desktop at 1280 fits. Booking Office cleaning → Details → typed fictional address/notes → Customer help → Back to your request returns to Details, preserving selected service, address, notes and Quote required summary. All five steps still shown. No booking/enquiry submitted. The radio auto-advanced before a checked-state assertion completed; fresh UI inspection confirmed selection, with no repeated submission. An ephemeral test tab was closed after review, discarding its synthetic local draft.

PASS help and booking at width 320 (scrollWidth 305), help at 390 (scrollWidth 375), no page horizontal overflow. Existing narrow-screen header nav remains horizontally scrollable within its own region. Existing fictional original invoice link opens unchanged INV-000004 / Void / R250.50, with new single-document/no-account guidance. Secure token access and invalid token/ID/email denial are covered natively; no hostile hosted POSTs or real customer messages sent.

GitHub application regression run 43617845453 PASS for runtime candidate; application workflow executes new access and updated header suites alongside financial/enquiry/booking regressions. Local PostgreSQL 17/PHP 8.4 verification covers 20 methods across the expanded regression set. Auth/PostgREST transport simulated locally; hosted browser uses actual transport. No automated accessibility scan claimed for hosted page.

All 17 public-table counts and fingerprints match exactly before/after this F04 preview session; no exclusions required. Evidence in docs/evidence/customer-access-f04-preservation.json. Live booking intake false/preview true and enquiry mail live true/preview false unchanged. No schema, settings, publication, mail or retained record writes. Public help left open for owner review.

Decision: PASS for preview review. Owner acceptance and explicit production release authorization remain outstanding. This technical delivery does not enable customer accounts or activate booking intake.

## Release and rollback

Preview-only delivery. Restore preview application to PR #35 to roll back; no data rollback required. Existing public pages, enquiry/quote/invoice/payment records and five-step booking implementation remain intact. No live booking intake activation or Shalean republication. Production application release still requires explicit authorization.

Next: F05 extend automated full-journey/auth/isolation coverage and F06 restore/operational visibility evidence, followed by shared-core capability specification. Full customer accounts stay deferred until a complete verified ownership/history/recovery contract is approved.
