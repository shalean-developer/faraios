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

Hosted migration, advisor checks, preview deployment, authenticated browser desktop/mobile flows and owner review pending. No full preview PASS claimed yet.

## Rollback

Disable `customer_private.ingress` for the affected environment, restore application to PR #9 and retain all customer records/associations. Do not drop columns/tables or delete records. Production release requires explicit owner instruction after preview review, then main merge/Plesk deployment and separate live customer gate activation.
