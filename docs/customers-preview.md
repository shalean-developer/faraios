# Customer profiles — FaraiOS New

Authorized 13 November 2026 SAST. Base PR #9 merge `7e0771e7b5d1cfcdde3dd194cb5a9dcfc961bb7b`; GitHub main and prior authenticated production evidence verified. Fresh project only `rxelmugnucfajrqmphhe`. Production Git deploys main automatically; candidate stays on `feature/customers-20261113` and manual `/_accounts-preview`. No production deployment authorized.

## Smallest complete implementation

Welcome → Customers. Private create/edit with name, email and/or phone, optional address and private notes. Case-insensitive substring name/email search and normalized phone substring search (at least three digits); 20-row pagination. Duplicate review checks exact case-insensitive trimmed name/email and digit-normalized phone within the same business/environment. Matching profiles are shown before writing; an explicit checkbox allows a separate profile. No merge, contact-based automatic linking or historical import.

Profile → Create quote / Create booking; each manual creation form also offers customer search and selection before data entry. Selected profile supplies name/email/phone; manual booking also copies address. Private notes never enter quotes or bookings. Documents remain editable using their existing rules; saving preserves their own snapshots. Quotes from linked enquiries and bookings from linked accepted quotes inherit the explicit customer ID. Existing APIs remain unchanged; new atomic creation endpoints wrap the proven quote/booking writers and add only the association.

Existing enquiry, quote and booking detail → Link customer profile → search → explicitly confirm ownership of that record. Only unlinked records may be associated. Existing documents, addresses, dates, prices and statuses remain unchanged; version increments prevent stale edits. No unlink/reassign or merge UI in V1. Profile activity lists explicitly linked records, with separate 20-row pagination for enquiries, quotes and bookings. Linking a preexisting source does not retroactively associate already-created descendants.

## Permissions and preservation

Customer SELECT has owner RLS; no anonymous table/function access, direct authenticated DML or service credentials. Composite foreign keys enforce identical business/environment for links. Public invoker functions delegate to private bounded definer functions with fixed empty search_path and explicit nonanonymous owner checks. Preview writes enabled; live customer operations disabled until approved release. Existing quote/booking APIs and production behavior remain usable with the additive schema. No customer edits trigger document or schedule changes. CSRF/origin, no-store/noindex, CSP, escaping, helper 403 and stale versions retained.

New-customer request IDs survive posted form replay. Per-business serialization prevents simultaneous duplicate checks from silently both saving; the later request receives duplicate matches. Duplicate confirmation is an owner decision, not a uniqueness constraint. Phone matching removes punctuation but does not infer country codes; near spellings are not fuzzy-matched. Duplicate preview returns up to 21 candidates; users can search further. Search scans owner records and is not benchmarked for very large customer lists.

No changes to public profiles/publication, account auth, homepage, waitlist, Resend/email, staff, recurrence or payments. Waitlist webhook/recovery tests remain separate and are not run as part of this feature.

## Verification and release

Local `tests/customers.py`: real PHP HTTP and disposable PostgreSQL 17; only Auth/PostgREST transports simulated. Save/reload, validation, normalized searches, duplicate warning/confirmation, stale replay, customer selection, private note exclusion, manual booking address, profile edits preserving quote/booking snapshots, explicit enquiry links, enquiry→quote→accepted booking ID inheritance, foreign/customer/environment/anonymous/direct DML denial, concurrent duplicate requests. `tests/customers-hosted.sql` provides rollback-only hosted role probes; JWT identities are simulated, not two real authenticated browsers.

Regression tests: quotes, bookings, enquiries, services, profiles, accounts. No paid GitHub Actions runs. Native dependencies fetched from official Debian snapshot packages into disposable scratch; no machine-wide installation.

## Hosted and authenticated preview acceptance — 13 November 2026 SAST

Application candidate `c1c9e4e99718b5448e7a3f83fb0d2d8c3dea0dc9`; heading correction `6e9e086a178e00530fb7b04fbef6007aee83d407`. Draft PR #10. Connected Plesk manual accounts preview follows `feature/customers-20261113`; production main remains PR #9. Additive migration installed through connected fresh Supabase SQL editor and recorded in migration history `20261113094646` with full source statement and candidate reference. Hosted rollback-only customer role script PASS, retaining no probe fixtures. Customer RLS true, anon SELECT false, direct authenticated UPDATE false. Security Advisor rerun: zero errors, unchanged existing leaked-password-protection warning; Health Advisor zero errors.

Authenticated connected Chrome/PHP/Supabase PASS: empty customer list, fictional profile creation/reload, profile edits/reload, normalized phone search and case-insensitive email search, duplicate pause with no premature save, explicit confirmation creating a separate profile. Selected profile creates linked ZAR quote and manual booking; address prefill correct and private notes excluded. Quote ZAR 1,010.50 (2 × 505.25) marked sent and accepted through secure preview customer page without any email. Accepted quote conversion creates one linked booking for 29 November 10:00–11:30 Africa/Johannesburg. Manual booking ZAR 505.25 saved for 28 November 08:30–10:30. Profile name/address updates preserve original quote name, booking name, booking address and agreed prices; further private note edit after acceptance also leaves the accepted agreement unchanged.

Manually created same-name quote remained unlinked, proving no automatic name match. Its detail → Link customer profile → explicit checkbox confirmation linked the correct customer; record appears under that profile with its own saved customer details. Profile activity shows accepted/draft quote statuses and both linked bookings. Native/rollback tests additionally exercise enquiry linking and enquiry→quote→booking inheritance; no new published page or hosted enquiry fixture was needed.

Responsive connected browser at 390×844: profile and search document width 375, no horizontal overflow; case-insensitive search and explicit link submission succeed. Normal mobile and desktop screenshots visually reviewed and saved in `docs/evidence/customers-mobile-preview.jpg` and `docs/evidence/customers-desktop-preview.jpg`. Viewport reset. This is browser viewport testing, not a physical-device claim. Cross-owner tests simulate JWT identities; no claim of two real owner browser logins. High-volume pagination/load and fuzzy/international phone equivalence remain unbenchmarked V1 limitations.

Final hosted state: preview customers 2, quotes 5 (3 preserved + 2 new), bookings 4 (2 preserved + 2 new); 2 linked quotes and 2 linked bookings. Live customers/quotes/bookings remain 0; live customer gate false, preview true; live public pages 0. No original preview fixtures changed. Homepage and waitlist HTTP 200 and byte-identical to preserved source; customer helper direct 403; Shalean unpublished public URL 404. No Resend workspace, emails, webhook/recovery, staff, recurring booking or payment operations. Fourteen intended local regression/lifecycle tests passed, with hosted rollback script also passing.

**PASS for owner preview review.** Preview Customers left open. No main merge or production customer deployment performed. Owner review and explicit Deploy instruction remain required.

## Rollback

Disable `customer_private.ingress` for the affected environment, restore application to PR #9 and retain all customer records/associations. Do not drop columns/tables or delete records. Production release requires explicit owner instruction after preview review, then main merge/Plesk deployment and separate live customer gate activation.

## Release hardening after owner Deploy instruction

Final automated review found that new unlinked quotes/bookings unnecessarily depended on the customer gate. The UI now uses the existing quote/booking APIs whenever no explicit customer association exists; customer-aware atomic creation is used only for selected/inherited customer IDs. Quote and booking regression suites deliberately leave the live customer gate disabled and cover manual creation and accepted-quote conversion in that state. Customer lifecycle tests continue to cover the enabled customer path. No database schema/function change is needed.
