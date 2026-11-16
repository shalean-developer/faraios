# D01–D06 and worker joining: final release review — 16 November 2026

## New-account phone PASS; actual offline navigation defect fixed in preview — 16 November 2026

Read-only Auth/invitation checks confirm faraic3@gmail.com account created, email confirmed, invitationce301dfb-8ad8-47b5-b7eb-262b180d9fd4 accepted and A/preview Worker membership active. Owner confirms Worker Workspace/Preview and Jobs-only menu. Record new-account signup, verification, acceptance and worker landing phone PASS; no owner business creation inferred.

Physical-phone connection test FAILED: while offline, Send request navigated to Chrome offline/game page; Back returned to email custom tab. Input retention was not proved. Fresh read-only query finds zero availability requests for this new worker in A/preview. D03 reopened for client-to-PHP connection loss; earlier server-to-API connection tests did not cover this failure.

Corrective progressive enhancement now intercepts delegated workspace POSTs: known offline sends nothing and retains the live form; fetch/timeout failure retains input with explicit ambiguous-save/check-records warning; reconnect never resends. Submit is disabled while one request is pending. Normal same-origin PHP response is rendered through existing CSRF/session/revocation/validation logic; no browser draft storage or new API grant. Seven-file canonical release scope now includes new account/workspace.js (previous six-file scope superseded).

Focused native/browser8 methods PASS at390/1280 with Manager/Receptionist/Worker, known-offline no-navigation, post-online-check network abort, input retention, zero database writes/no automatic replay and server invalid-range retained form. Broad run36 suites PASS; preview suite initially caught source-manifest drift during iteration and passed10 methods after refreshing exact candidate hashes. Prior snapshot/current-main compatibility applies to prior candidate; final combined-source/latest-head CI must be refreshed before release.

Guarded CLI installer updated exactly preview account/delegated.php (32fa09137178b078b90845c37548ba67cc06ee2327c578bc30824e680376b155) and new workspace.js (f624642cefd9b676c0eeca33bc425c165da0edc4d77f479c01ef7ff9e5333098). Full web census confirms all other files/live unchanged; private configuration unchanged; served script SHA matches. No SQL/Auth/business-record mutations in this installation. Private before/verified receipts and rollback copy: offline-preview-20261116. Temporary hosting task cancelled.

Next phone retry: reconnect, reopen newest original Preview invitation, sign in with faraic3@gmail.com, select A/Preview if prompted; do not create a business. Refresh Worker Workspace while online to load repaired script. Request time off25 November2026 09:00–10:00; offline→Send request once must keep form/times visible with offline error. Reconnect without submitting; no automatic save. Report actual result. A preview onboarding and only the newly accepted worker remain open for controlled acceptance; B/previous roles remain closed. Close these afterward, preserving all history. No merge/live deployment.


Current update: isolated restore43843901476 PASS (84 tables, snapshot fingerprints match,28 owner scopes, no network/production credentials). All three evidence-head04c3368 CI checks PASS. Owner supplied previously unregistered faraic3@gmail.com. Exactly one synthetic A/preview worker invitationce301dfb-8ad8-47b5-b7eb-262b180d9fd4 is provider_accepted after one attempt. New synthetic staffa56d5621-36bd-419d-b5f1-be288c1799c0; no membership pre-activation. A preview onboarding temporarily enabled for this test; B/previous delegates remain closed. Phone signup/verification not yet observed. No live deployment. This update supersedes earlier queued/closed-test-window states below. Temporary hosting task cancelled.


Status: HOLD for live release. No merge, main changes or production deployment authorized or performed.

## Compatibility

Pinned repair application source: `276640227becd6da6b8f6a9b1b653dd268159db2`; prepared worker-join PR66: `d5f6f6c2c9c4e917253d5239ea40be78386f791b`. Main advanced to `4cea37e553edd3d6b1faae277a3286f7134c3801` during verification. A disposable combined snapshot retained all concurrent public header bytes and reconciled only three preservation fixtures. No merge or branch ref change was used. See compatibility.py and compatibility-snapshot.json for reproducible assembly and hashes.

All 37 suites / 125 reported tests passed across the combined run and the corrected baseline rerun. The initial baseline failure was caused by writing the snapshot receipt into its inventoried source root; moving the receipt outside the source resolved it without changing product code or weakening the inventory assertion. Other 36 suites passed unchanged. Focused native/browser checks passed 8 repair methods and 13 joining methods at 390/1280px. Existing application-head CI: Foundation 43838535853, database regression 43838535908, configuration regression 43838535938, all successful. These checks use disposable local data and simulated Auth/REST where specified; they do not replace physical-phone acceptance.

## Permissions and preservation

Owner reported receptionist retained-session closure: “yes I am out”. Manager, Worker and Receptionist listed phone scenarios passed. Hosted read-only checks confirm zero active synthetic delegates across both registered businesses, zero enabled synthetic preview onboarding entries and inactive pilot staff. Fresh real Auth sessions for reserved Manager/Receptionist/Worker fixtures all fail preview page access; closed context is absent. Anonymous access fails. Hosted verifier passed 10 assertions. Legitimate live access and invitation fingerprints remain unchanged. Global delegation remains enabled for legitimate live users.

All six preview runtime hashes and six live baseline states match the recorded expected values. Private original configurations are unchanged. Candidate dependencies match live. Preview account/layout.php differs from candidate/live; delegated markup does not depend on that preview layout. Preview is therefore not claimed to be an exact copy of the complete live candidate tree. Financial, document, invitation and completed-booking history remain retained. No historical time-off bulk adjustment was made.

## Recovery

Fresh encrypted database backup run [43843151079](https://github.com/shalean-developer/faraios/actions/runs/43843151079) succeeded, including ciphertext/checksum upload and removal of runner plaintext. Its isolated restore run [43843901476](https://github.com/shalean-developer/faraios/actions/runs/43843901476) remains queued with no jobs started at the last check. This is pending, not PASS. No hosted restore, Auth rehearsal or configuration import was requested.

Actual-host private configuration recovery passed for all six files: encrypted, decrypted into a private temporary directory, exact hashes compared and 0600/0700 modes checked. Original files were unchanged; temporary plaintext and ephemeral keys removed. No provider/SMTP send occurred. This proves the current recovery helper against actual files; it is not a new independent off-host configuration backup. Temporary Plesk task was cancelled and tasks-list verified.

## Exact proposed scope

See final-release-scope.json for each candidate and live-baseline SHA256. Generate canonical files through docs/sc04/readiness.py. Proposed runtime paths only:

- account/core.php
- account/delegated.php
- account/workspace.css
- account/staff-join.php
- account/staff-join.js
- account/staff-join.css (new)

Database patch only: docs/sc04/defect-repairs.sql, SHA256 `017d5df36dbe4161754ed9944e9818cf63f588b52e657334e07001b21ee1ca9a`: replace business_delegate_command(uuid,text,text,jsonb), create business_delegate_page(uuid,text,text,uuid,integer,integer), authenticated-only page execute grant. No table, policy or historical-data migration. Original shared command remains MD5 `2c2aeb980f2b7cf6e3be2d0410551020`; canonical page is not hosted. Preview aliases and adapter must never be copied into live.

Do not deploy a whole PR, inherited public files or full SC04 installer. Public marketing/header work, intake, published content, real invitations and customer messages are excluded. Preserve F01–F06 and five-step booking flow. Runtime release and any SQL activation require separate owner authorization after closure of the gates below.

## Remaining gates and rollback

Fresh database restore must finish successfully and its report be reviewed. Actual new-account signup/email-verification phone path remains untested; the joining phone PASS used an existing verified account. Deliberate physical-phone stale-version/connection-error recovery, payment replay and cross-page assignment cases are not all owner-accepted; existing automated/native evidence is narrower than full phone acceptance. No independent QA approval is claimed.

Before any authorized release, recheck main/runtime/function/config baselines, exact six-file candidate hashes, current permissions and backup freshness. Stop on drift. Capture guarded original six-file states (including absent join CSS) and both function definitions/grants. Rollback restores only those verified runtime/function states, removes newly introduced page function/CSS if appropriate, and preserves all business and financial history. Never restore an entire database over live records for this batch. Verify permissions and original booking/invoice links after rollback. No automatic resubmission, session-control weakening or historical date rewrite is in scope.
