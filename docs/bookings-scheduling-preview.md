# Bookings and scheduling — FaraiOS New

Authorized 13 November 2026 SAST. Base PR #8 merge `67da2c317faf2de90b5b4565dab3ca123910ce18`; verified merged PR and authenticated production closeout. Fresh project only: `rxelmugnucfajrqmphhe`. Production main automatically deploys to `/faraios.com`; accounts preview is manual at `/_accounts-preview`. Shalean remains unpublished. No historical system, staff assignment, recurrence, payments, email sends, Resend operations or waitlist webhook/recovery work.

## Smallest complete release

Welcome → Bookings; accepted private quote → Create / open booking. Manual booking editor reuses quote customer/item validation: name, email and/or phone, 1–20 items, whole quantities, exact final prices. Address, date, start time and duration 1–10080 minutes are required. Dates 2000–2099 support historical recording. New records are Scheduled; saved records can be changed manually among Scheduled, In Progress, Completed and Cancelled. Cancellations are retained. Status transitions are deliberately owner-controlled with no clock-driven effects.

A quote conversion copies the immutable accepted agreement in the database and freezes its customer/items/currency/notes in the booking editor. Scheduling/address/status remain editable. Quote remains Accepted and its customer page is unchanged. Reopening conversion opens the existing booking, including when Cancelled. Quote foreign key uniqueness plus per-business transaction serialization prevents parallel conversions; clients cannot supply a different agreement. No public booking or booking link is added.

Manual bookings capture current catalogue currency (default ZAR); accepted quotes retain their agreed currency. Each booking captures the business time zone at creation and an absolute timestamptz start. Existing booking edits retain its zone/currency if business settings later change. New forms reject changed time zone/currency rather than reinterpret entered values. DST gaps/repeated local hours are rejected; duration is elapsed minutes. Lists/calendar display dates in the current business zone, editor in the saved booking zone.

Private chronological list with status filter and month calendar. Calendar shows bookings on their start day, with time, customer, status and duration. Multi-day bookings are not repeated on following days. No capacity/resource blocking: overlapping bookings are allowed and explicitly described in the editor. Lists and calendar paginate 100 rows with a clear continuation notice; no silent truncation. Mobile calendar uses date cards in two/three columns.

## Security and isolation

Additive table with RLS, authenticated owner SELECT only, no anonymous table/function access or direct authenticated DML. Public invoker RPC delegates to a bounded private definer with fixed search_path, explicit nonanonymous owner UID, environment gate, quote business/environment/status validation, expected row version, currency/zone validation and complete field validation. No service credentials in application code. Preview enabled; live booking writes disabled until approved release. Existing business-owner RLS protects reads; application explicitly filters environment. Preview/live use existing separate cookies and configured paths.

CSRF/origin validation, no-store/noindex, strict CSP, escaped output and direct-helper 403 retained. UUID request identity and version protect accidental manual resubmission. Native tests simulate two owner JWT identities; no claim of two real browser-authenticated owners.

## Verification

Local PASS: `tests/bookings.py` real PHP HTTP/disposable native PostgreSQL with simulated Auth and REST. Manual validation, exact totals, save/reload, reschedule, four statuses, stale denial, calendar month filtering, snapshot currency/zone retention, accepted quote source copying, repeat and simultaneous conversion prevention (including cancellation), nonaccepted quote denial, anonymous/direct DML/cross-owner/environment denial and DST gaps/repeats. `tests/bookings-hosted.sql` rollback-only permissions and lifecycle script also passes locally. Regression PASS: quotes, enquiries, services, profiles (4), accounts (5): 13 intended suites including bookings. PHP syntax and whitespace pass. No GitHub Actions or paid CI used.

Hosted migration, rollback-only role test, real preview browser/mobile acceptance and advisor review are pending. No production deployment or full preview PASS claimed.

## Release / rollback

Do not merge/deploy production until preview owner review and explicit deployment instruction. Install additive migration with live gate false, deploy only accounts preview branch manually, run rollback-only hosted roles and real browser save/reload/manual/quote/status/calendar/mobile journeys. Verify other data and Shalean unpublished; record candidate SHA and limitations.

On later approval, inspect final head, merge/deploy production main through connected Plesk and separately enable only booking_private.ingress live. Verify authenticated empty live Bookings and preserved existing features; do not create live fictional bookings by default. Keep Resend and waitlist checks separate.

Rollback: disable affected booking ingress; restore application to PR #8. Preserve bookings and linked quotes; do not drop table or delete records. Disable preview separately if needed.
