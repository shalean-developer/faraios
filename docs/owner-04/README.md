# OWNER-04 — Businesses

Task: TASK-2909083EEF. Depends on verified OWNER-03.

Added explicit setup stages and server-side stage filtering, retaining the existing minimal read-only cards, owner checks, bounded search and pagination. Stage precedence is published, draft profile, service configured, service not configured, unknown; location is an independent fact. A published page does not guarantee a configured service or booking readiness.

The required four-argument RPC overload leaves original three-argument requests compatible. No additional data fields, owner enrollment, or raw-table grants. Both overloads are covered by containment and uninstall scripts.

Local tests: 69 module + 14 HTTPS + 91 disposable database + 33 page assertions passed. Thirty synthetic businesses exercise all stages and stable tie ordering across two pages, literal wildcard search, invalid filters, and denied access. Live records may change between requests; pagination is not a cross-request snapshot.

## Installation and recovery

Installed five account files on 2026-11-18 after exact OWNER-03 hash checks and PHP 8.2 lint. Private backup: `/var/www/vhosts/shalean.com/private/faraios-account/owner04-20261118`. `release-files.json` records before/after hashes. No shared tracker, session, core, navigation or booking files changed.

Recovery: validate all installed hashes and all four backup hashes before writing. Restore page first, then adapter, module and CSS using same-filesystem atomic replacements; remove the additive JS only if its installed hash matches. Then apply `rollback.sql` through the database migration tool. If any file differs, stop and reconcile the later change. Global containment remains `docs/owner-03/disable-https.sql` and now covers both signatures.

Hosted checks and final task acceptance are recorded after verification; do not infer completion from this preparation note.
