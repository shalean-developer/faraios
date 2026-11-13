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

## Hosted preparation — 13 November 2026 SAST

Initial application candidate `2be3fa436ccde40a6c1cddffca6950e9c1abfda4` published as draft PR #9 and deployed only to manual accounts preview. Additive migration installed through connected Supabase SQL editor; migration history recorded with source commit reference. Verification: bookings RLS=true, anon SELECT=false, authenticated UPDATE=false, preview enabled=true/live=false, booking rows=0. Rollback-only hosted script PASS for save/reschedule/statuses, accepted quote copy/duplicate prevention, stale/anonymous/cross-owner/environment denial and DST validation; probe data rolled back. Fresh baseline: 2 businesses, 0 live quotes, 3 preview quotes, 0 live public pages. No other system accessed.

Production/main remains PR #8, waitlist preview unchanged. Live homepage and waitlist HTTP 200 and byte-identical to preserved source; booking preview stylesheet matches candidate; helper direct 403; unpublished Shalean page 404. No email/Resend or waitlist webhook/recovery operations.

Preview owner session expired and redirects to sign-in. Full real browser save/reload, quote conversion, calendar and mobile acceptance remain pending owner sign-in. No full preview PASS claimed. Final self-review hardened manual browser-back resubmission to reuse posted request ID and reject stale writes; local journey confirms exactly one manual record after replay. This is an application-only change; schema unchanged. Local booking suite rerun PASS.

Connected Security Advisor rerun: zero errors; one existing Auth leaked-password-protection disabled warning, unchanged. No new security warning.

## Authenticated preview acceptance — 13 November 2026 SAST

Owner signed in to preview; claimed the signed-in Welcome tab. Application remains `c59051a94a6862152e13b53610c45c3a5f6d3d14`; subsequent changes are evidence only.

Real connected Chrome/PHP/Supabase PASS: Welcome retains complete Shalean business setup and Bookings entry; empty preview list; manual fictional customer/phone/address/date/time/duration; three-decimal price rejected with fields retained; corrected 2 × ZAR 505.25 saved/reloaded at ZAR 1,010.50, 20 November 08:30–10:30 Africa/Johannesburg. Rescheduled to 09:00–11:00 and sequentially saved/reloaded In Progress, Completed and Cancelled. Cancelled filter retains the booking.

Existing accepted fictional quote A54CEBAC converted with customer, two service items, notes and ZAR 1,135.50 preserved and noneditable. Address/date/start/duration saved as 23 November 10:00–11:30. Reload succeeded. Returning to accepted quote and choosing Create / open booking reopened the identical booking URL. Source quote remains Accepted. No duplicate conversion or quote mutation.

Calendar PASS: November shows both records on the correct dates/times/statuses; December shows no bookings; returning November restores entries. Mobile viewport 390×844: calendar, quote editor, manual editor and list have document scrollWidth 375 (no horizontal overflow). Quote booking duration changed from 90 to 105 minutes on mobile, saved/reloaded as 10:00–11:45 with agreed price unchanged. Desktop viewport restored; full-page calendar screenshot visually inspected and saved at docs/evidence/bookings-calendar-preview.jpg. Mobile screenshots from connected viewport capture appeared scaled in the capture surface; responsive sizing, controls and save/reload were independently verified through DOM/layout and interaction. No claim of physical-device testing.

Final hosted SQL PASS: businesses=2; live_bookings=0; preview_bookings=2 (Cancelled=1, Scheduled=1); linked quote booking count=1; source quote Accepted; preview booking writes enabled=true/live=false; live_quotes=0; preview_quotes=3; live_public_pages=0; Shalean unpublished. Two fictional preview bookings retained for owner review. Existing account/business/profile/services/enquiries/quotes not changed by booking tests; no production fixtures, email, publication, payment, staff or recurrence operations.

Decision: **PASS for owner preview review**, with documented limitations. High-volume hosted pagination and abuse are not browser-tested; cross-owner database tests simulate JWT identities rather than two real owner logins. Overlaps allowed, long bookings displayed on start day and pagination at 100 records remain explicit V1 behavior. Production main stays PR #8 with booking writes disabled. Explicit owner Deploy instruction is required before production release.
