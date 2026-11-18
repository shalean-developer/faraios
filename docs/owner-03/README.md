# OWNER-03 — shared owner security, contract and navigation

Implemented and hosted-tested on 18 November 2026. See [closeout evidence](closeout-20261118.md), [foundation installation receipt](installed-20261118.md) and draft PR88. No merge or main changes. Never deploy this historical branch wholesale.

The shared navigation preserves Development and adds Platform → Businesses / Users. The small server-rendered directory proves the common integration; it does not implement account administration, monitoring, SEO or support features. Those remain separate owner tasks.

Every directory request uses platform_directory()->read(): managed Auth identity verification, current private immutable owner allowlist, fixed HTTPS RPC using current session JWT and existing publishable key, independent database enrollment/session/eligibility gate, then strict output projection. HTTPS is the default transport; no private configuration change or privileged fallback key was introduced. Explicit older PDO configuration remains a historical alternative and is not enabled here.

The new route is account/platform-directory-page.php?view=businesses or view=users. It is GET-only and has no export or mutation endpoint. Failed authorization returns no rows. Responses are private/no-store/noindex. Search, names, IDs, dates and links are escaped; filters and responses are bounded. Shared include-only modules return404 directly. Platform navigation never grants permission.

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

## Release and rollback

Five named code files form the UI integration: platform.php (shared-navigation extraction only), platform-directory.php (HTTPS default), platform-directory-page.php, platform-navigation.php and platform-directory.css. Existing core/session/index/CSS/JS/regions overlays are preserved.

Private backup directory: /var/www/vhosts/shalean.com/private/faraios-account/owner03-closeout-20261118. It holds original platform.php and platform-directory.php plus verification.json. Run rollback-closeout.py without flags to verify exact installed/backup hashes. --restore atomically restores the originals and removes only the three matching additive files. Drift aborts before mutation. It never restores tracker/business records or changes database enrollment. The separate disable-https.sql/uninstall-https.sql procedure contains/removes the database foundation if needed.

Local UI rollback rehearsal passed exact restore/removal and concurrent-drift refusal. Hosted originals were reconstructed and syntax checked privately; no live rollback was performed. No support/customer messages or business-data edits. Controlled synthetic Auth sessions used for testing were closed locally; the real owner's session was retained.
