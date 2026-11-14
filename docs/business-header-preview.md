# Business header branding and customer login — preview

Owner request 14 November 2026, draft PR25 / feature/business-template-audit-20261114. No production merge/deployment or Shalean republish authorized. Existing business records, content, test history and intake gates must remain unchanged.

## Implementation

Owner Profile → Website style & public address offers four proportional logo sizes (32/48/64/80px height bounds, corresponding width bounds) and Show/Hide company name. Desktop and mobile caps preserve intrinsic aspect ratio. Hidden names remain accessible. Without a logo, the visible business name always remains. Defaults retain Medium/Show. Controls follow existing draft/save/explicit publish/version and ownership checks; no automatic edits/publication. Business identity also replaces the FaraiOS home link in the separate booking header; five steps and calculation/submission logic remain unchanged.

Optional string fields presentation.logo_size and presentation.show_name are validated in PHP and native Postgres. Existing documents remain valid. The additive validator replacement is SECURITY INVOKER, immutable, empty search_path; existing ACL remains. No table, policy, record or intake gate changed. CLI-created migration 20261114092535_business_header_branding.sql prepared and tested locally; hosted migration name business_header_branding applied successfully.

The audited old business Sign in linked to /account/index.php?page=signin and /account/header-session.php, which represented FaraiOS owner administration. Public home/standalone/booking headers now use /account/customer.php?slug=…. Every request resolves the published environment-scoped business first; draft/unpublished/unknown businesses fail closed. No user-supplied URL is used as a return destination. Allowed subpages and booking steps are enumerated. Booking links capture the current step on click; the existing same-tab booking draft restores entered values.

Customer sessions have a separate cookie name for each base URL/environment and business slug. Cookies remain Secure (hosted), HttpOnly, SameSite=Lax, scoped to /account/. Session fixation protection, server-side tokens, verified /auth/v1/user, refresh, 30-minute idle expiry, CSRF/origin checking, no-store and noindex retained. Only a minimal initials/authenticated header response is exposed. Customer logout uses Supabase scope=local and clears only this customer browser session. Owner login routes and owner RLS are unchanged. Customer pages never load business() or create an owner business, customer record, membership, booking or enquiry.

## Capabilities and limitations

Existing verified email/password identities can sign in in the business context. Supabase identity accounts are still shared within the project: this is session/UI separation, not a separate identity provider or a customer-membership authorization system. An owner identity may independently authenticate as a customer without exposing its owner browser session. No business membership is inferred from an email or editable metadata.

Customer signup, business-branded verification/recovery email/callbacks, customer membership/invitations, record linking, private booking history, profile editing, customer-specific RLS/API and payments are not implemented. The page explicitly states registration/recovery and history/profile limitations. No private customer data is exposed. Existing public quote/invoice capability links remain unchanged. Future customer records need explicit business+user authorization before access. There is no production-ready claim for a full customer portal.

## Local evidence

PASS tests/business-header.py: native PG17 validator acceptance/rejection; two published synthetic businesses; real PHP sign-in, header, logout, CSRF, unknown business, environment and owner-cookie isolation; unchanged profile fingerprint during customer auth; owner draft/save/reload/explicit publish. Auth and PostgREST transports are simulated locally; no emails/providers/hosted writes used in these journeys.

PASS tests/customer-login-browser.cjs real PHP browser journeys at1280/390/320: login → correct business → avatar → branded account → different business stays signed out → logout → Contact. Six axe scans zero violations. Screenshot docs/evidence/customer-login-local.png is synthetic fixture evidence.

PASS tests/header-branding-browser.cjs 24 combinations (four sizes × logo/no-logo ×1280/390/320), proportional wide logo, accessible name, hidden-name/no-logo fallback, no overflow and zero axe violations. Evidence header-branding-browser.json. Hosted business profiles were not edited to exercise controls.

PASS existing homepage5, SEO5, account5 and request lifecycle1 native PG/PHP regressions. New customer session implementation reuses the already tested owner API transport/refresh helpers without reading its session cookie.

At the local checkpoint, hosted provider-backed sign-in still required separate evidence; it was subsequently verified below. Actual email delivery, physical-device and screen-reader checks remain unverified; local simulated Auth is not claimed as a real Supabase password test. No new hosted user or business record is created for testing.

## Release boundary

Accounts-preview deployment/read-only verification completed below. Production NO-GO pending owner review/authorization. Application rollback: previous preview branch head2841630e49d4079e74fc285ffbf70cbc7fd864a1. Keep additive validator support if any future drafts use these fields; never overwrite snapshots/erase records as rollback.

## Hosted checkpoint — 14 November 2026

Application683d8ff39093abe9e89a205c2fc840f810168e5d pulled and deployed to the existing manual accounts-preview target; Plesk completed / Done. Production automatic-main and waitlist-preview targets untouched. Git CLI push lacked credentials, so the GitHub connector uploaded the tested tree; its tree SHA exactly matches the tested local commit. No production merge.

PASS12 GET-only template-hosted checks and10 customer-header-hosted checks: deployed preview assets match candidate, production assets match main9e4c42d; five page canonicals/noindex/no-store, unknown business/subpages404, service preselection, customer route/guest JSON/return sanitization, production new customer endpoint404. Actual hosted browser at390px: branded form has no horizontal overflow; successful provider-backed password sign-in using the browser's existing account returned to demo homepage; avatar opened Your account; Sign out returned to the business and restored guest header. Credentials were not extracted or changed, no new user/customer/business record was created. Screenshot customer-login-hosted.jpg has fields cleared.

Actual separate booking page still shows five stages and now business branding. Selecting Deep cleaning advanced to Details; Sign in captured return=booking-details and Back to business points to the correct booking step. The optional final hosted Back click hit a browser connection error; returned-step restoration remains proven in the local booking-history/browser suite, not claimed as an additional hosted pass. Browser left on the branded preview sign-in for review. No booking/enquiry submission.

PASS existing standalone browser pages1280/390/320, booking sticky/guest/avatar checks and URL/history/refresh/draft recovery. PASS all15 public-table full-row counts/fingerprints identical before and after (header-preservation.json). Live intake=false / preview=true unchanged, all published documents validate. Security advisor unchanged:13 existing deny-all INFO findings and existing leaked-password WARN; no new finding. Existing warning remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No setting altered in this task.

Branding settings and two-business customer isolation were exercised on disposable fixtures, preserving hosted profile records. Hosted cross-business membership/private-record access does not exist; no customer portal access claim is made. Branded registration/recovery/email callbacks and customer membership/record authorization remain outstanding. Physical-device/screen-reader checks unverified.

Decision: **PASS preview implementation and existing-account sign-in verification; ready for owner review. Production NO-GO until explicit authorization.** Shalean was not republished.
