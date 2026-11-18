# OWNER-03 — shared directory foundation

Status: isolated implementation; not installed or accepted. Parent OWNER-01. Production task TASK-4D58A7674A. Source base PR71 `6cff41c6cbf8f3bd1dadc769655f82255bb2c971`; do not merge this historical branch wholesale.

## Integration contract

`account/platform-directory.php` is include-only: direct requests return404. It adds no live route, no automatic data read and no sidebar link on include. Existing platform.php/core/session/CSS/JS and index.php remain unchanged. This preserves the separately installed owner sign-in repair. Directory reads must use `platform_directory()->read()` in each future page or JSON endpoint, call `platform_directory_headers()` before output, map PlatformDirectoryError status/message without exposing causes, and escape all values at HTML rendering. Production wiring requires platform-session.php and its real Auth check; no preview/core fallback. Private UUID allowlist is reloaded for every read. No cached authorization token is accepted from the browser.

The default reader deliberately returns503. OWNER-04/05 must implement and review a restricted server-side reader, credential custody, query timeouts and authorization before integration. This module is not evidence that a new cross-tenant database path already works. Never grant anon/authenticated broad reads, expose a service-role key, or use client-supplied role/metadata as platform authority. No production configuration or grants changed.

## Minimal data contract (schema inspected read-only 18 November 2026)

| Output | Verified source / rule |
| --- | --- |
| Business id/name/registration | public.businesses id/name/created_at; registration is distinct from owner Auth registration |
| location_configured | country and time_zone validated against existing regions.json; null if source unavailable |
| service_configured | live business_service_catalogues.draft.items has at least one nonarchived service; no catalogue contents returned |
| profile_saved | matching live business_profiles row exists; does not mean publication-ready |
| published | matching live business_public_pages row exists; do not infer from an old published_at timestamp |
| User id/registration | auth.users id/created_at; exclude anonymous users; no email/name required for first version |
| email_verified | email_confirmed_at is present; does not assert active/revoked account state |
| business_associations | businesses.owner_id plus live business_memberships user_id/role/active, deduplicated by business+role; ownership role derives from businesses; no preview memberships |

Facts are independent, not a percentage. `false` is an observed absence, `null` is unknown; unavailable query yields503, not empty success. Empty association list means known no association; null means unknown. No active-business, trial/subscription, deletion or suspension status is invented. Synthetic business classification requires explicit future metadata; never silently infer from names or emails. Trial users remain real registrations.

Only fixed resource names businesses/users; GET only; fixed live environment,25 rows, page1–9999, UTF-8 search<=100bytes with no control characters. Reader must bind search literally (escape SQL LIKE wildcard characters), use stable created_at/id ordering, fetch26 to determine has_more and return25. No arbitrary table/column/sort/tenant/environment parameters. Observed_at is query receipt time, not latest activity. Validate request before queries; validation is not SQL escaping.

Output projects a strict field allowlist and rejects duplicate rows, malformed ids/timestamps/roles and oversized responses. No Auth tokens, password hashes, raw profiles/documents, financial/customer data, secrets, email addresses or phone numbers. Registration identifiers remain owner-private. JSON is data, not HTML; render with platform_directory_escape.

## Navigation and owner sign-in

The additive navigation helper defaults to no links. Once OWNER-04/05 pages exist and pass acceptance, enable only those explicit keys adjacent to—not instead of—the existing Development group. Do not link unfinished pages. Proposed route name is reserved for future implementation, not active now. Existing owner login work owns index.php; OWNER-03 must reconcile its final installed behavior rather than rewrite it. Existing business-role landing pages must remain unchanged.

## Reconciliation and release gates

PR71 source platform.php SHA256 matches the recorded accepted installed entry d7ac087c3568b7032214118130f173bdc963d6568d84c0715f3d3aa30fb0128b. Accepted adapter receipt is01bb9fdec84ed397470ce9d7136a959975dcae182bad2e60448706a26edb8508. These are historical receipts, not fresh byte verification. Plesk live listing18Nov shows platform.php/session last modified16Nov14:55, while index.php changed18Nov09:54 and core.php17Nov02:32. Do not replace those overlays from this branch. Fresh exact-file hashes and final owner-login destination checks remain required for integration.

Before hosted enablement: validate exact current files, restricted reader, live session/role denial and query boundaries; test mobile/keyboard plus owner/business login destinations and performance; retain originals and guarded rollback. Rollback of this additive module is removal only after its callers are disabled; tracker state/config and business records are never restored/replaced. No migration, deployment, main merge, message or business-data mutation in this task.

## Verification on 18 November 2026

- PHP8.4 syntax passed; `tests/owner-directory.php` passed69 assertions: owner-positive, every supported business role denied, anonymous/unverified/expired/disabled/removed owner denied before reader, no authorization caching, unsafe methods/parameters denied, projection excludes provider secrets, duplicate/invalid rows rejected, unknown facts preserved, redacted errors, escaped HTML and links disabled by default. Synthetic callbacks only; no hosted cross-tenant query or new Auth session claimed.
- Existing `tests/platform-owner.py`: seven test methods PASS; optional isolated Chromium test SKIPPED, not counted as pass. Actual loopback PHP/Auth fixtures exercised tracker persistence, security and encrypted history.
- Read-only Plesk source inspection confirms18Nov index.php has redirect_signed_in_platform_owner(), uses platform_authorized with private settings, redirects to platform.php?view=overview for signed-in GET/sign-in POST, and preserves staff_join/after_signin precedence. No editor save performed.
- No public entry, database reader or live navigation integration yet. Remaining acceptance: exact hosted fingerprints, restricted data-reader design and tests, all future page/data guard wiring, business-role login regression and hosted mobile/keyboard/rollback checks. OWNER-03 remains In progress.
