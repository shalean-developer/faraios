# OWNER-09 and tracker reliability — 18 November 2026

Live 18 November 2026: /account/platform-seo-page.php reads 8 existing production SEO tasks (6 site, 1 indexing, 1 backlinks), preserving evidence and source links without duplicate records. Tracker revision/read time explicitly differs from audit dates; absent live SiteGuru/GSC feeds and unknown current scores are stated. Public scope excludes account/private/preview/draft targets; published business status is not inferred. 32 local model assertions pass (owner/role authorization before reader, GET-only, malformed filters, missing-data, escaping); 8 tracker HTTP/security/persistence/recovery tests pass, optional isolated Chromium test skipped. Live desktop1280 and mobile390/320 fit without horizontal overflow; indexing filter, keyboard evidence expansion and bad-filter error verified. Anonymous page requests redirect to sign-in without task data; direct model returns404. Private rollback originals match pre-install hashes and PHP lint passes. Five runtime files installed from pinned PR97 commits with drift guards. No merge, main changes, automatic submissions, outreach or provider credentials.

## Tracker reliability

OWNER-UI-02 TASK-AE18034B4A Verified 3/3 at revision191 (18:31:15Z). OWNER-09 TASK-8E2B9AA404 Verified5/5 receipt revision193 (18:43:25Z).

Production MON-01 history ended at revision177 with3/5; the earlier reported4/5 was not found in persisted history. No lost write or downgrade was reproduced. Do not claim corruption or change acceptance counts without evidence.

The confirmed defect was an unconditional saved=1 success banner. A one-use session receipt now records revision/time/check counts after successful persistence, and a saved-record summary separates durable state from edits. UTF8 byte validation and focused server errors prevent ambiguous failures. Existing locks, revisions, authentication and storage format remain intact.

## Deployment and rollback

PR97 remains draft/unmerged. Runtime changes are platform.php, platform.js, platform-navigation.php, platform-seo.php and platform-seo-page.php under account/. Tracker commit b1df18fdd828f2dd922de2d686c08a8b6e7eb196; SEO commit 0c072ca7bf083f44b3334f769149a9a74ee00d22. Installed via unsaved Plesk Run Now, then cancelled; no new schedule created.

Private rollback directories under private/faraios-account/: owner09-repair-backup contains platform.php.before and platform.js.before; owner09-seo-backup contains platform-navigation.php.before. Original hashes were verified and original PHP copies linted. The two SEO files are newly added. For rollback, first compare live hashes to these commits and stop on drift. Restore navigation from its .before copy, move the two new SEO files out of the public directory, and restore tracker PHP/JS from their .before copies if rolling back the receipt fix. Preserve original permissions. Never restore or alter tracker.json as part of code rollback. Actual live rollback was not performed.

Anonymous HTTP check initially expected401/403 but urllib followed the normal sign-in redirect to a200 sign-in page. Follow-up confirmed destination account/index.php?page=signin, no SEO-01 task data, and direct model404. This is expected authentication behavior, not a leaked dashboard.

## Limits

This is a read-only tracker projection, not a live SEO provider integration. Provider audit dates remain in original task evidence; missing dates are unknown. No indexing guarantees, disavow, purchases, submissions or outreach. MON-01 cadence remains independent and must be verified from unattended-run evidence.
