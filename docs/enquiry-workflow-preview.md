# Enquiry workflow improvements — preview

Owner requested fixes following a read-only audit. Based on main cc8f2fcff1155ae2d8c6ba394bc2327eadfbf04b. Build and accounts-preview review only; production application deployment needs later owner instruction.

## Changes

- Preserve full 4000-character enquiry requirements in quote notes, with the same supported limit through booking and invoice document editors/validation. Increase only affected HTTP form byte allowances to accommodate valid URL-encoded Unicode and bounded line items; default auth form allowance stays 8192 bytes. CSRF/origin checks remain.
- Enquiry details show up to 20 linked quotes with effective response/expiry status, totals and existing booking links. A filtered quotes list handles further pages and links back to the source enquiry. Creating/accepting a quote does not overwrite the owner's New/Contacted/Closed choice; quote and booking states are displayed alongside it.
- Add private enquiry notes (2000 characters), optional business-local follow-up date, due list and dashboard count. Closed enquiries retain the stored date but are excluded from due work. Clear date by saving it blank. No automatic reminders or external messages.
- Append immutable private activity snapshots on new enquiries and status/note/follow-up changes. Trigger-only inserts, owner-isolated reads, paginated history. No invented historical backfill. Private notes never enter customer quote documents or notifications.
- Sent quotes with an email address offer Compose quote email: opens the owner's mail app prefilled for that customer with the saved quote link. The owner reviews and sends there. This is not Resend quote dispatch; no automatic quote email or customer sending test is claimed.

## Data and security

Migration 20261114152048 is additive: two optional/default-empty columns, one RLS-protected activity table, trigger, owner-scoped security-invoker save/read RPCs, current quote validator's note bound and dashboard due count. Existing enquiry, booking, invoice, customer and publication records are retained. No intake, mail dispatch, pricing, publication or booking steps changed. Trigger-only activity writer is security-definer in enquiry_private with fixed search_path and no direct caller grants. All owner operations continue to check business/environment and version; no anonymous private reads or activity writes.

Installed in faraios-new after native tests. Immediately before/after, all 16 existing public-table row counts and fingerprints of original fields match, including 11 enquiries, 7 quotes, 13 bookings, profiles/public pages, media and financial records. New note/date columns excluded only from the enquiry original-field fingerprint; defaults are empty/null and no activity rows were backfilled. Security Advisor findings unchanged from baseline: existing mail-status SECURITY DEFINER warning, existing leaked-password-protection warning, and existing private-table policy informational notices. No new warning introduced.

## Validation

PASS disposable native PostgreSQL plus real PHP HTTP workflow test: 4000-character Unicode requirements through quote save/reload/acceptance, private note escaping and exclusion from public quote, stale-version rejection, invalid date rejection, follow-up due/closed/clear states, dashboard counts, linked quote status, activity pagination/immutability, cross-business and environment denial and anonymous activity denial. Auth/PostgREST transports are simulated; RLS and RPCs run natively.

PASS existing enquiries, quotes, bookings, invoices, dashboard, online request and room/extra suites. PASS PHP syntax and diff checks. Chromium real rendered HTTP fixture at 1280/390/320: labels, linked quotes, expanded history and no horizontal overflow. Screenshots are synthetic local test data.

## Release gate

Hosted accounts-preview deployment and authenticated save/reload/layout inspection pending. No production application merge/deployment. No existing hosted enquiry was edited for native testing. Roll back application to main cc8f2fc; retain additive schema/history so no customer records are removed. Old applications continue to use existing status RPC; do not drop history on rollback.

CONDITIONAL PASS: local/native and preservation gates passed; hosted preview remains to complete before production review.

## Authorized hosted verification — 14 November 2026

Owner explicitly approved Plesk access for PR #34 accounts-preview-only deployment. Manual faraios-accounts-preview.git repository selected feature/enquiry-workflow-20261114 and /faraios.com/_accounts-preview before each deployment. Final runtime candidate 8bbc84378e322c48118742cbcfced214fdc92209. Production main was not pulled/deployed or merged.

Hosted testing found a real multiline-boundary defect: browser textarea LF becomes CRLF on form submission, so a displayed 4000-character value exceeded the server character bound. Normalize textarea line endings to LF before validating manual/public enquiry requirements, quote/agreement notes and private enquiry notes. Native regression now posts CRLF at the 4000-character boundary as well as Unicode. Form also renews a malformed cached manual request ID and surfaces existing allowlisted safe validation errors instead of hiding every failure behind one generic message. Initial validator/request-ID hypotheses were not established as the browser root cause. During diagnosis migration 20261114153753 reinstated the manual validator from tested source; it changes no grants, intake gates or records. Database rollback probes succeeded; no diagnostic record persisted.

PASS real authenticated Chrome/PHP/Supabase workflow in FaraiOS Preview Test Business:
- Created only labelled fictional enquiry f14ffaf7-0058-d95d-385c-644e1cab00d5, Workflow Preview Test 14 Nov, workflow@example.test. Full 4000-character multiline requirements saved. Manual intake queued zero mail jobs.
- Saved Contacted status, explicit private test note and 2026-11-14 follow-up. Reload retained all fields. Created/Updated activity snapshots appear privately.
- Dashboard Follow-ups due=1 links to the due list containing the new enquiry.
- Create quote prefills exactly 4000 requirement characters with no private-note text. Saved/reloaded one ZAR 500.00 quote b0d3e2f7-5d0d-b203-cb6a-fb1a208c6a2a. Explicitly marked this fictional quote Sent to inspect the share action; no customer email was sent or composed. Compose quote email link targets only workflow@example.test. Source enquiry shows linked Sent quote and correct total; owner status remains Contacted. No customer acceptance action, real booking or invoice created.
- Desktop/mobile 390: note/date controls, linked quote and expanded activity have no horizontal overflow. Saved evidence enquiry-workflow-hosted-desktop.jpg and enquiry-workflow-hosted-mobile.jpg. Temporary viewport restored and tested enquiry left open for owner review.

SQL confirms requirements_length=4000, quote_notes_length=4000, test_outbox_jobs=0 and activity snapshots=2. Final original-field fingerprints for all 16 existing public tables match the pre-migration baseline after excluding only the two new explicit test IDs. Original enquiry/quote rows, bookings, financial records, profiles, published content, catalogue/media and waitlist records are unchanged. No existing hosted enquiry edited. No live intake, dispatch setting or business publication changed.

PASS hosted preview workflow/layout verification. Cross-owner denial, stale writes, closed/clear follow-ups, history pagination and customer-response privacy remain covered by disposable native tests rather than mutating existing hosted data. Resend quote delivery is not implemented: Compose quote email opens the owner's mail client. No provider delivery claim. Production application release still requires owner authorization after preview review.
