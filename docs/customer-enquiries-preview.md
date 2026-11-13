# Customer enquiries and quote requests

Owner scope: 13 November 2026, FaraiOS New only. Base: PR #5 merge `3f5e09b7e7ae38e8c984808626860aeb2434b6cc`. GitHub confirms merged; connected Plesk production card confirms main at PR #5 and preview separately manual to `/faraios.com/_accounts-preview`. Live owner Services page has no services. Do not publish Shalean's draft page for testing.

## Smallest complete implementation

Published business pages show a customer enquiry/quote form: optional published-service choice, name, email and/or phone, requirements. The private Enquiries page is linked from Welcome, with paginated newest-first listing, status filter, detail and New / Contacted / Closed updates. No dashboard, booking, payment, quote pricing/issuance, or email notification system.

Public intake resolves business ownership from the current published slug and environment; it does not accept a business ID. It checks the service against the published snapshot, not drafts. Service name is captured at submission so later edits/unpublishing do not erase context. Public pages and session responses are no-store. Customer input is escaped. Customer enquiry records never enter public snapshots. Public form cookies are isolated from owner sessions and scoped to the public business route. Owner changes use existing Auth, CSRF, origin and idle session protections. Updates use optimistic version matching. Owners have SELECT and status-only UPDATE; no customer-field/ownership mutation, insertion or deletion privileges. Anonymous callers cannot read enquiry rows or write the table.

Additive migration `20261113055208_customer_enquiries.sql`: RLS enquiry table, status RPC, anonymous intake wrapper and narrow private SECURITY DEFINER intake. The definer is needed to insert without exposing the private table or business IDs. Fixed empty search path, explicit execution grants, no dynamic SQL, published-row lock, strict bounded fields, no private result. All other functions are invoker security. Private tables have RLS with no client grants/policies. The private schema must remain outside PostgREST exposed schemas.

Basic spam controls: honeypot, two-second form age, one-hour expiry, CSRF/origin checks, bounded body and UTF-8 fields, server connection limit (10/hour per source IP and environment; no trusted arbitrary forwarded headers), database caps (30/page/hour and 5/contact/hour), transactional rate increments and request UUID idempotency. Direct REST callers cannot bypass database caps. These controls are not a CAPTCHA and cannot guarantee blocking determined spam. Connection hashes are held in a mode-0600 temporary file; expired entries are removed when used. Database contact hashes expire during subsequent intake. Neither raw IPs nor mail credentials are stored in enquiry rows. Site hosting logs have their independent retention.

## Evidence and limitations

Local PASS: 26 intended test suites via `tests/journey.py` (15), `accounts.py` (5), `profiles.py` (4), `services.py` (1), `enquiries.py` (1). Native disposable PostgreSQL 17 and real PHP HTTP. Auth and REST transports are simulated locally. Enquiry tests cover required/invalid inputs, honeypot/timing/CSRF, escaped output, anonymous table denial, cross-owner denial, immutable customer fields/business ownership, owner status lifecycle and stale updates, duplicate retries, contact rate limit, private/unavailable services, preview/live separation, disabled live intake, and unpublished-page rejection. No paid CI used. PHP syntax and git whitespace checks pass.

A broad unittest discovery invocation was unsuitable: it imported the optional Chromium script and inherited unrelated fixture tests, producing errors. Intended script entry points above passed. Local Chromium was unavailable; no browser/mobile PASS inferred from local HTTP.

Hosted schema installation, rollback-only permission assertions, authenticated owner/browser journey and mobile screenshots remain pending. The connected browser initially inspected Plesk, fresh Supabase SQL editor, and live owner Services. It later timed out. No hosted schema change or preview deployment has been completed in this turn. An attempted read-only SQL replacement initially appended into Monaco's active input and was rejected as syntax error; no mutation occurred. The editor was then replaced using select-all/type, but result confirmation was interrupted by browser timeout.

Resend workspace is untouched. Existing local waitlist tests do not close WL-WEBHOOK or WL-RECOVERY.

## Preview deployment and acceptance

1. Confirm fresh project `rxelmugnucfajrqmphhe`, inspect existing migration history and live Shalean publication state. Run the additive migration through connected Supabase; record migration history only after success. Inspect new RLS/grants/function security and security advisors. `enquiry_private` must not be exposed through Data API.
2. The migration enables **preview only**; live ingress is disabled. Do not enable live intake before production approval. Install no email credential/config change.
3. Use only manual Plesk repository `faraios-accounts-preview.git`, switch to `feature/customer-enquiries-20261113`, pull and deploy to `/faraios.com/_accounts-preview`. Keep production `faraios.git` on main and waitlist preview unchanged.
4. Use fictional preview records. Submit a general and published-service request; validate error retention, success, refresh without duplicates, owner list/detail, New → Contacted → Closed, save/reload, filters, pagination, cross-owner denial, private-service rejection and unpublish rejection. Run rollback-only hosted assertions with simulated JWT roles; explicitly label these as simulated identities.
5. Inspect public form and owner list/detail at 390px. Check no horizontal overflow, readable contacts, focus, required fields and long requirements. Save screenshots and show owner the preview. Restore viewport.
6. Owner preview acceptance and explicit production approval are required before merge/deployment. Record hosted limitations candidly.

## Production and rollback

After owner approval, merge reviewed PR to main, deploy via existing production Git and enable live intake with `update enquiry_private.ingress set enabled=true where environment='live';`. Verify live unpublished Shalean remains unavailable, existing account/service draft reload, homepage and waitlist unchanged, helper URLs 403, and source deployment. Do not create live enquiries against an unpublished business. Any temporary live synthetic page requires a separate explicit test plan.

Rollback source to PR #5 and disable live ingress. Preserve accounts, businesses, profile/service drafts and all enquiries. Do not drop schema or erase records. Preview can be disabled independently via ingress. Statuses are reversible; customer correction/deletion requests are handled by controlled owner administration in this first release.

Decision: PASS for local source validation; hosted preview acceptance pending. Production NO-GO until owner preview review and explicit deployment approval.

## Hosted preview update — 13 November 2026 SAST

Owner replied Ready. Reconnected browser verified fresh project history through services migration, only the fictional Bright & Co page published in preview, and live Shalean unpublished. Installed additive enquiry migration plus history entry through the connected SQL editor. Verified RLS=true, anon SELECT=false, authenticated INSERT=false, status-only UPDATE=true, requirements UPDATE=false, preview ingress=true, live ingress=false. No production application change.

Switched only manual `faraios-accounts-preview.git` to `feature/customer-enquiries-20261113` and deployed candidate b00485d. Production remains main at PR #5; waitlist preview unchanged. Public browser testing found the public page's no-referrer policy caused Chrome form Origin:null and a CSRF rejection. Candidate **63bd1d4edee9d9cabf0adab6c5ef6cc483d6e3cb** corrects the header to same-origin, preserving strict origin validation. Enquiry HTTP/native PG suite passed again with response-header assertion. Pulled/deployed this fix to preview only.

Hosted Chrome PASS after fix: required name/requirements browser validation; missing email AND phone rejected with entered name/requirements retained; optional service selector showed only three published demo services; Office cleaning request submitted with fictional customer/contact/requirements; success message confirmed business received it. No email was sent. This submission belongs only to the fictional Bright & Co preview page.

Preview owner's idle session expired and redirected to sign-in. Asked owner to sign in on the open preview tab. Authenticated owner list/detail/status/save/reload, public refresh duplicate check, mobile layout/screenshot, hosted rollback-only role assertions, and advisor review remain pending. A combined browser call attempting refresh, owner inspection and 390px layout timed out before observations were returned; no mobile/refresh result is claimed. Temporary viewport state is unknown after the timeout and must be reset on reconnect.

Prepared `tests/enquiries-hosted.sql` and verified it against disposable PostgreSQL with the same fictional fixture; PASS. It has not yet run on hosted Supabase. It uses simulated JWT identities and ROLLBACK, not mailbox-authenticated second-owner evidence.

Decision: preview deployed; public successful submission verified. Full end-to-end acceptance pending owner session and stable browser connection. Production remains NO-GO pending completed preview review and explicit owner release approval. Live intake is disabled. Resend and separate waitlist webhook/recovery checks are untouched.

## Authenticated hosted acceptance — 13 November 2026 SAST

Owner signed into preview. Application candidate remains `63bd1d4edee9d9cabf0adab6c5ef6cc483d6e3cb`; subsequent commits are evidence only.

PASS: Welcome → Enquiries loads the signed-in Shalean business with an empty list; the separate Bright & Co enquiry is not visible. Used the existing owner's preview profile only: retained original name/email/description/areas in browser memory, temporarily changed public name and public email to fictional Preview Cleaning Test / hello@example.test, saved/published the preview page at `shalean-cleaning-preview`. No live page or services were published or modified.

Submitted a fictional phone-only general enquiry through the real public PHP form. Success shown. Refresh returned to the blank GET form with no repeat success. Owner list contained exactly one Fictional Customer Test enquiry, initially New; detail showed requirements and phone link. New → Contacted → Closed succeeded, Closed survived reload, New filter showed no results and Closed filter showed exactly one. At 390px: public form scrollWidth 375, owner list 390, detail 375; no horizontal overflow. Visually inspected public form and owner list screenshots. Mobile detail status Closed → New saved and survived reload, then returned to Closed. Viewport reset.

Cleanup PASS: temporary owner preview page unpublished, GET shows Page not available. Original name/email/description/areas restored and all four compared equal after reload; other profile inputs were not changed. One fictional owner enquiry remains Closed for review. Bright & Co remains the public fictional demo; its published-service submission passed in the preceding session.

Hosted `tests/enquiries-hosted.sql` PASS through connected Supabase: published-service intake and snapshot; identical request idempotency; invalid/private-service rejection; live intake disabled; anonymous SELECT denied; owner read, Contacted/Closed and stale-write rejection; immutable email; other-owner read/status denied. All probes rolled back. These are simulated JWT identities under native authenticated/anon roles, not a second mailbox-authenticated browser owner.

Security Advisor: zero database errors; one Auth warning (leaked-password protection disabled), configuration unchanged. Six informational no-policy entries: two private enquiry tables and four pre-existing waitlist tables, all intentionally client-denied. Data API schema picker visually confirmed only public and graphql_public checked; enquiry_private and waitlist_private unchecked. No API settings changed.

Final native state: live_intake=false; live_enquiries=0; live_public_pages=0; owner_preview_published=false; owner_test_count=1; owner_test_status=Closed; rollback_probe_remaining=false. No Resend operations, email sends, paid CI, waitlist webhook/recovery changes, bookings, payments or dashboard.

Limits: spam caps and list pagination are covered by source/local checks rather than a hosted high-volume browser exercise; caps are basic abuse controls, not CAPTCHA. Prior 26 intended PHP/PostgreSQL suites remain passing, with enquiry suite rerun after Chrome header fix. No implementation changes were needed during this acceptance session.

Decision: **PASS for owner preview review**. Review the public demo and signed-in Enquiries before authorizing production. PR #6 remains draft/unmerged; production source stays PR #5 and live intake stays disabled. Existing Auth warning is documented independently and does not indicate an enquiry-table access defect.
