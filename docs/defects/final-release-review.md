# D01–D06 and worker joining: final release review — 16 November 2026

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
