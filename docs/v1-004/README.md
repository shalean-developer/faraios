# V1-004 — stale assignment recovery

## Owner-authorized live repair Verified — 16 November 2026

The owner explicitly authorized PR76's one-file repair and synthetic verification. Reviewed source9a35e54a4abbd09fac8776ff06c9e532c66a3a20 was installed at18:44:37 Johannesburg, and live acceptance passed at18:47. Only account/bookings.php changed. Original bytes are retained privately under v1004-live-20261116/bookings.before.php. Exact candidate SHA256335f1f386dfcc775964ffc1b0011299129cf53cbd1202614a33bca3fbd32ef59 is installed; all other1159 regular web files and private configuration remained unchanged. No SQL/function installation or whole-branch deployment.

Hosted PASS140 cumulative checks (30 installation plus110 additional verification). Dedicated new synthetic booking747c8427-0dad-446d-a987-ce6db9b8d492 loaded assignmentversion1, another writer saved both staff atversion2, and stale partial/empty choices were each submitted twice. Four rejections retained choices and original tokens; the exact saved row/assignments remained unchanged. Explicit reload displayed both staff/currentversion2. Eleven original A/live table/view snapshots matched; every original preview payment and booking/assignment row matched. The original phone payment remains a single1000-minor ledger entry, and cross-page assignment fixture remains version5/onlystaff001. No new payment, invoice or message was submitted.

Synthetic Manager/Receptionist/Worker tokens still deny scoped data; no access activation or legitimate access change. New synthetic booking/assignment audit history is retained. Four original hosting schedules remain and the temporary unsaved task was cancelled. Accepted seven-file, V1-022, public/SEO and dashboard overlays were preserved.

Live V1-004 now has all three acceptance items checked and Status Verified. Refreshed overview13/30 verified,15 blockers; broader launch remains HOLD. PR76 stays draft/unmerged and main4cea37e unchanged. Exact deployed-source three required CI workflows passed; any later evidence commit is documentation/operator tooling only and does not replace the deployed source. Private receipts and sanitized copies: live-install.json/live-verification.json; live-install.php/live-verify.php document the one-use operators. Earlier pending-deployment statements below are historical.

## Decision

Repair prepared; not deployed. V1-004 remains In progress with its final acceptance item unchecked. The launch remains on hold. Payment replay and cross-page assignment phone passes already recorded in the tracker are preserved, not repeated.

## Reproduced live defect

The owner page rejects an old assignment version, and PostgreSQL preserves the newer booking/assignment row exactly. However, the response replaces the submitted checkbox choices with the saved assignments and upgrades the hidden assignment version. A second click could therefore submit a different, newly versioned selection without the user comparing it.

The one-use hosted test used only existing synthetic owner A and a new synthetic booking and two staff resources. No delegated access was enabled. It loaded version1, saved both staff from another writer at version2, then submitted version1 with only the first staff selected. The server rejected the stale write but rendered both staff selected and version2. See `hosted-reproduction.json`. All web files were unchanged; no customer messages, payments, document mutation, publication, access or scheduler changes occurred. New synthetic booking/staff and their history are retained.

Live owner page SHA256 exactly matches main: `2c895d06e29ac048bb9fd9baf0c07fc45669dd438e0f10ddf036f176bd244935`. All seven accepted account overlay hashes matched their private release manifest. The V1-022 guest quote hash remains `f26cc02d4101d38c860c3f4bc0476a62d80114782b9df6462d1afa0d19de922c`. Main is `4cea37e553edd3d6b1faae277a3286f7134c3801`; relevant PR68/72/73/74/75 remain unmerged and preserved.

## Bounded repair

Only `account/bookings.php` is deployable. On a failed assignment submission, retain selected and unchecked choices, including an empty selection, and retain the original stale version. Show a concise explanation and an explicit Reload and compare link. Saved assignments remain in the existing booking summary; the server's versioned assignment write is unchanged. No automatic retry, client storage, SQL, grant, access, finance or document changes.

The branch starts at current main and contains no copies of the unmerged overlays. Never deploy this branch wholesale. `release-scope.json` pins the exact previous and candidate hashes. Documentation/test files are not deployment files. `source-delta.json` adds the one reviewed hash transition without altering the frozen SC02 baseline or existing UI delta history.

## Verification

- Red test before repair: owner stale response upgraded version0 to version2 and reset an empty selection to both saved staff.
- Repaired native PHP/PostgreSQL test: empty choices retained, partial choices retained, original tokens retained, two repeated stale submissions rejected with exact saved-row preservation; explicit reload loads version2 and current saved assignments.
- Actual local browser at390/1280: load version1, change checkboxes, other writer saves version2, submit stale form; visible rejection, original checked/unchecked values and version1 retained, saved database row unchanged, no horizontal overflow; Reload and compare shows both current staff/version2. See `browser.json` and synthetic screenshots. This is automated responsive evidence, not new physical-phone acceptance.
- Separate Manager/Receptionist check against the pinned installed PR68 source combined with current main: empty/partial checkbox choices and original token/page IDs retained, repeated stale submissions preserve exact current row. `delegated-check.py` takes the disposable snapshot path. No role-workspace repair is needed.
- Full current-main Foundation gate PASS:32 suites/93 reported methods plus PHP checks, including native security/isolation, finance/document history, five-step booking, notification recovery and isolated recovery rehearsal. See `regression.json`. The earlier first run failed only the expected owner-page preservation hash; the bounded source-delta chain was added and the full gate rerun green. CI is separate and must be checked at the final published source.

Reproduction: `PG_BIN=<postgres-bin> PHP_BIN=<php> python3 tests/staff.py`. Add `FARAIOS_MOBILE_BROWSER_CHECK=true` and `FARAIOS_CHROMIUM=<headless-chromium>` for the two browser widths. Hosted reproduction tooling is CLI-only and one-use; never replay or remove its guard. Its test secrets remain only in the existing private host fixture/state, and its public evidence contains none.

## Remaining release gate

Obtain authorization for only the reviewed owner `account/bookings.php`. Immediately recheck its baseline hash, take a private copy and a fresh whole-web/configuration census, install that one file atomically, and verify all other files/overlays remain unchanged. Re-test with synthetic records on the installed candidate, including current assignment preservation, entered choices/token retention, repeated stale denial and reload/compare. Check existing payment/cross-page evidence remains applicable. Only then check the final tracker acceptance item and mark Verified.

Rollback restores only the saved owner page after checking the installed candidate hash. Never restore a database, replace directories, alter existing history or overwrite later concurrent changes. Stop on any unreviewed drift.
