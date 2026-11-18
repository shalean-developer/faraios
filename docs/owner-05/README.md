# OWNER-05 — Users

Task TASK-A22D0249AA follows verified OWNER-04 and depends on verified OWNER-03. PR90 targets the OWNER-03 branch, not main; neither PR has been merged.

## Scope and data definition

Reuses the installed owner-only Users directory. The minimum identity is the stable Auth UUID; names, emails and phone numbers are intentionally not added. Account registered is Auth creation time, normalized to UTC. Verified/Unverified describes email confirmation, not identity assurance, business setup or permission to work. Unknown remains explicit if a provider fact is missing. Anonymous Auth accounts are excluded.

Live business associations show only business UUID, supported role (owner, manager, receptionist, worker), and active flag. The view aggregates duplicate supported memberships with active OR semantics, includes business ownership, excludes preview memberships, and bounds associations at 100 (more fails closed). No associations does not mean registration failed. No edit, impersonation, export, delete or bulk actions.

Only `account/platform-directory-page.php` changes for this phase. No new data fields, database migration, access grant, customer messages, business mutations or unrelated pages.

## Validation

Local HTTP route suite: 45 assertions PASS, including Users unknown/unverified/no-business, empty/unavailable, escaping/privacy, anonymous, expired and four business-role denials. Disposable PostgreSQL suite: 100 assertions PASS, including 30-user two-page completeness, literal search, exact registration instant, anonymous exclusion, field allowlist and multiple associations. The timestamp assertion compares instants because PostgreSQL can format equivalent timestamps in the local timezone. Existing module 69 and HTTPS 14 assertions passed earlier in this change. Loading lifecycle has 4 assertions, and rollback rehearsal has 4 checks (restore, additive file removal and drift refusal).

Live Users page showed 20 records and UUID search returned one. Read-only aggregate DB check agreed: 20 users, seven with no live business association, zero currently unverified. Unverified/unknown cases are therefore synthetic fixture evidence, not invented live states. Four controlled signed-in business roles were denied by the installed PHP page and signed HTTPS RPC, with no rows and created-session cleanup. Anonymous HTTP returned 303 to sign-in with no-store. The four-role page checks execute the installed page in hosted PHP8.2 CLI, not four browser sessions; the real platform owner uses the browser/web route. Actual private backup reconstructed and linted without a live rollback.

Desktop/mobile/keyboard final checks and tracker closeout are appended once verified.

## Recovery

OWNER-05 pre-change page is backed up privately at `/var/www/vhosts/shalean.com/private/faraios-account/owner05-20261118`; manifest records exact before/after hashes. For full phase rollback to OWNER-03, `rollback.py` defaults to verify-only and uses the OWNER-04 four-file backup plus final hashes from `rollback-manifest.json`. `--restore` restores the old page first, then adapter/module/CSS, removes only matching new JS, and refuses any subsequent drift. After code restoration, apply `../owner-04/rollback.sql` using the migration tool to remove only the additive four-argument RPC overload. This does not revoke original owner access or touch tracker/business data. Global emergency containment covers both signatures.

## Remaining verification at last checkpoint

Browser automation timed out repeatedly while checking Users empty/Clear and mobile layout, then timed out even naming the recovered browser session. Do not treat those actions as verified. OWNER-05 remains In progress; finish observed mobile/desktop geometry, keyboard and empty-state recovery, reset the temporary viewport, and save evidence/accepted criteria in the live task when the connection works. Do not replace this with the older preview tracker. The unsaved Plesk Run Now form had Active unchecked and Do not notify selected; no scheduled task was saved.

Security advisor check at 11:50 UTC remained unchanged from OWNER-03: 39 RLS-no-policy INFO, 26 authenticated-definer WARN and one leaked-password-protection WARN. No new advisory count from this additive overload. These baseline advisories are not a claim of whole-platform security clearance.

Remote source commit643f816e447a935049a149e164796b5177bb9b53 and local source commitca3b7c4 have identical tree b78e7899c52dcaf365c24fccca7ef3018dba465d. Later documentation-only checkpoints do not change installed code.

## Final closeout — 2026-11-18

Browser reconnected. The authoritative task still showed To do on reopening (the prior In progress selection/save had not persisted). Reconciled the original unchanged five criteria, saved Verified with evidence, reloaded the page, and confirmed persisted Status=Verified and all5/5 accepted. Dependency remains OWNER-03 TASK-4D58A7674A; release Later, non-blocking.

Remaining live checks passed: observed Users viewport widths320/390/1280, document width equal to viewport and no overflowing record cards; keyboard Enter search; unmatched query No matching records; Clear restores20 users; skip link focuses main. Temporary viewport override reset after testing. These are desktop browser viewport checks, not a new physical-phone acceptance claim. Earlier security/privacy, data accuracy and recovery evidence is retained, not rerun or broadened. No application files, database grants, business records or unrelated pages changed during this closeout.

Task: https://www.faraios.com/account/platform.php?task=TASK-A22D0249AA
Live page: https://www.faraios.com/account/platform-directory-page.php?view=users
PR: https://github.com/shalean-developer/faraios/pull/90
