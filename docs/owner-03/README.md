> Current status: approved HTTPS foundation installed; pages remain inactive. See [installation receipt](installed-20261118.md). Earlier PDO/preparation details below are historical.

> Current preferred path: [HTTPS installation](https-installation.md). Port443 verified reachable with TLS; narrow owner/session-gated RPC prepared and129 local assertions PASS. No new deployment or grants. Earlier PDO/session-pooler notes below are historical alternatives.

> Latest preparation (18 November2026): see [installation.md](installation.md), [hosted-baseline.json](hosted-baseline.json) and the generated migration. Six hosted editor sources reconciled; raw-byte host guard still required. Local DB/rollback checks now36 PASS. The live tracker save was recovered successfully; earlier unsaved-tracker notes below are historical. No deployment or merge.

# OWNER-03 — shared directory foundation

Status: isolated implementation; not installed or accepted. Parent OWNER-01. Production task TASK-4D58A7674A. Source base PR71 `6cff41c6cbf8f3bd1dadc769655f82255bb2c971`; do not merge this historical branch wholesale.

## Integration contract

`account/platform-directory.php` is include-only: direct requests return404. It adds no live route, no automatic data read and no sidebar link on include. Existing platform.php/core/session/CSS/JS and index.php remain unchanged. This preserves the separately installed owner sign-in repair. Directory reads must use `platform_directory()->read()` in each future page or JSON endpoint, call `platform_directory_headers()` before output, map PlatformDirectoryError status/message without exposing causes, and escape all values at HTML rendering. Production wiring requires platform-session.php and its real Auth check; no preview/core fallback. Private UUID allowlist is reloaded for every read. No cached authorization token is accepted from the browser.

The reader is now wired to the restricted PDO adapter in platform-directory-reader.php. It remains unavailable without a separately provisioned database role/views and private enabled configuration. Those changes have not been installed. OWNER-04/05 must use this guard when implementing pages; hosted integration acceptance remains pending. This module is not evidence that a new cross-tenant database path already works. Never grant anon/authenticated broad reads, expose a service-role key, or use client-supplied role/metadata as platform authority. No production configuration or grants changed.

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
- No public entry or live navigation integration yet; the database reader is implemented and locally tested but not provisioned on the host. Remaining acceptance: exact hosted fingerprints, restricted data-reader design and tests, all future page/data guard wiring, business-role login regression and hosted mobile/keyboard/rollback checks. OWNER-03 remains In progress.


## Restricted reader follow-up — 18 November 2026

Prepared `account/platform-directory-reader.php` and `docs/owner-03/restricted-reader.sql`. The SQL is a review draft outside automatic migrations; it was executed only against disposable local PostgreSQL17.11 synthetic tables. Production metadata was inspected read-only again; no directory objects existed. No production customer/business rows were queried.

The proposed NOLOGIN role receives SELECT on exactly two security-barrier views in a private, non-PostgREST schema. These are deliberately privileged projections owned by the provisioning administrator, not security-invoker views: cross-business access is needed, while raw auth/business table grants are prohibited. This trust boundary needs explicit review before deployment. Ownership derives from businesses.owner_id; only manager/receptionist/worker memberships are included from live data, with duplicate business/role associations combined. More than100 associations fails closed rather than silently truncating. Malformed catalogue items give unknown; archived-only or missing catalogues give false. Country/time zone travel only between private view and PHP to calculate the location fact and are removed before output. Business names support the existing120-Unicode-character database limit.

The PHP reader validates scope again, uses native bound statements, escapes LIKE wildcards, orders by registration date/id, fetches26 and emits25. Users search only their opaque ID; business search name or ID. Transactions are read-only, query timeout3s, lock timeout500ms, connect timeout5s, TLS verify-full, nonpersistent connections. Authorization runs before configuration loading/connection. Only the named reader role is accepted; superuser/bypass-RLS/role-management/inherited-role privileges, raw application table privileges, writable directory views, application schema creation and accessible SECURITY DEFINER functions are rejected. Ordinary SECURITY INVOKER extension functions remain governed by the reader's restricted grants. Read-only production metadata found98 PUBLIC-executable non-system functions but no PUBLIC-executable SECURITY DEFINER functions; this is metadata evidence only, not acceptance of a future role.

Future private configuration: platform-directory-db.json beneath existing FARAIOS_ACCOUNT_DIR, outside the webroot, non-symlink mode0600, <=4096bytes. Keys: enabled(boolean), host(DNS hostname), port(integer), database(identifier), password(secret). The username is fixed to faraios_owner_reader; no arbitrary DSN, service key or Auth-admin fallback. Do not put real credentials in Git, task notes, logs or browser code. Provisioning must verify PDO_PGSQL availability, CA trust for verify-full and direct/session-pooler compatibility with the exact database role. Do not copy application postgres/service-role credentials here.

Validation: original69 module assertions PASS;27 actual local PostgreSQL integration assertions PASS; seven tracker tests PASS and optional Chromium SKIPPED. Database assertions cover pagination ties/lookahead, literal wildcard and injection strings, live-only facts/memberships, anonymous exclusion, field projection, raw-table and anon/authenticated denials, writes denied even with read-only default disabled, rejection of elevated/broadened privileges and a PUBLIC SECURITY DEFINER function, bounded lock failure/recovery, and redacted503 errors. The local database was stopped after testing. Run tests/owner-directory-db.php with PHP PDO_PGSQL against an empty disposable localhost database named owner03_fixture; it creates synthetic tables/roles and must never run on hosted production.

Hosted baseline: existing signed-in owner GET signin still redirected to platform.php?view=overview; Tasks and UI review navigation loaded successfully. At390x844 the existing Development links were present in the DOM. A separate cookie-free GET of the live overview returned303 to index.php?page=signin with no-store caching. Mobile geometry/keyboard checks were interrupted by browser connection loss, so responsive/keyboard acceptance is NOT claimed. New reader/pages/denial routes cannot be hosted-tested without an explicitly scoped installation, which this task does not perform.

Remaining gates: fresh hosted hashes and overlay reconciliation; reviewed conversion of the SQL draft into a managed migration plus narrow rollback; approval/provisioning of restricted login and private configuration; target-role privilege audit and query plans/performance against representative data; protected page/data-route tests including real supported-role sessions; navigation/mobile/keyboard and rollback acceptance. Keep OWNER-03 In progress,1/5, and PR88 draft. Nothing merged or deployed.

Tracking limitation: the live OWNER-03 task was read as In progress,1/5 at the start. Subsequent browser calls timed out despite reconnect attempts, so this follow-up evidence has NOT been saved to the live tracker. Copy this follow-up evidence into TASK-4D58A7674A once access is restored; do not claim the live record was updated.
