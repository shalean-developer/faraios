# D01–D06 and worker joining: final release review — 16 November 2026

Status: owner-authorized exact release deployed and verified. Draft PR68 remains stacked on draft PR66 and unmerged. The deployment closeout below supersedes the historical pre-release review.

## Owner-authorized live release complete — 16 November 2026

The owner explicitly authorized the reviewed seven-file/two-function live release. The exact candidate pinned to reviewed commit f89d616b7a9e76612214d70dd845440c97fdbef2 is now installed live. No merge or main change occurred; draft PR68 and prepared PR66 remain unmerged. Earlier preview-only/no-authorization statements below are historical.

Fresh encrypted backup [43872691752](https://github.com/shalean-developer/faraios/actions/runs/43872691752) and isolated restore [43873154699](https://github.com/shalean-developer/faraios/actions/runs/43873154699) passed immediately before release: 84 tables, matching snapshot fingerprints, 32 owner scopes, no network or published ports and no production credentials forwarded. All three CI workflows at reviewed f89d616b passed. Existing six-file private-configuration recovery proof remains separate.

Guarded preflight verified original runtime/configuration/dependency hashes and saved five original runtime files plus two absent-file states privately. Applied only the reviewed command/page SQL functions and page ACLs, then installed exactly seven canonical runtime files. Final runtime hashes match the reviewed manifest; every other web file and original private configuration remained unchanged. Post-release verification passed seven HTTP/asset/access checks and sixteen canonical-RPC permission checks. Revoked Manager/Receptionist/Worker and anonymous access remain denied; the owner's scoped read works. Membership, invitation, payment-history and live-gate fingerprints match pre-release. Both synthetic businesses remain closed with onboarding disabled and zero active delegates. Temporary hosting task cancelled.

Rollback material preserves the original command definition/grants and runtime states; guards protect against later drift. No whole-database rollback, history adjustment, real invitation mutation, customer message, intake change or republication was performed. Coverage limits remain: mid-flight ambiguous-save recovery has native/browser proof rather than separate physical-phone acceptance; no independent QA or universal-device claim; DB restore excludes hosted configuration and Storage bytes and establishes no service recovery-time guarantee.

## Verified candidate and compatibility

Application/fixture source1951efd1d9facac18b90edbe72a406dab700492c (runtime last changed c1b46240ff20f311edd13816201f004fd1987a21). PR66 prepared joining sourced5f6f6c2c9c4e917253d5239ea40be78386f791b preserved. Main4cea37e553edd3d6b1faae277a3286f7134c3801 unchanged on final fetch. Disposable combined snapshot retains concurrent public marketing/header bytes; three preservation fixtures reconcile both sides' assertions. No merge/ref movement used for compatibility. Reproduce with compatibility.py and compatibility-snapshot.json.

All37 suites/125 reported tests PASS in one refreshed combined run. Focused browser/native methods: repairs8, workflow4, joining13, at390/1280px. This includes offline preflight, post-online-check abort, retained forms, no automatic replay, unchanged database counts, invoice numbers and role/payment controls. Latest verified source1951 CI all PASS: Foundation43869447714, database regression43869447532, private configuration regression43869447629. Subsequent final-review commits are evidence-only and their CI should be checked again before authorization.

## Phone and hosted evidence

Owner accepted the listed Manager/Worker/Receptionist journeys, mobile menu/save/record pagers, staff edit, exact quote/booking/invoice selection, payment reference validation and existing-account joining. New faraic3@gmail.com signup/email confirmation/invitation acceptance landed in Preview Worker Workspace with Jobs only. Johannesburg time-off conversion verified against UTC; UTC and daylight-saving cases have separate automated/hosted evidence, with no historical bulk update.

Actual offline phone test initially exposed Chrome offline navigation; preview correction now keeps the form in memory, sends nothing while offline and never retries on reconnect. Owner confirmed retained26 November09:00–10:00 values, no automatic Saved, then one explicit online submit. Exactly one07:00–08:00UTC request saved. No browser draft persistence or session/revocation weakening added.

Worker stale action: old version1 rejected with error and retained In Progress action; saved job remains Scheduled/version2. Manager typed customer Name/Notes: old version1 rejected, both draft fields retained; saved version2 other-writer notes unchanged, reload/compare confirmed. Exact existing R10/ZAR/16 November/reference payment replay rejected; INV-000004 remains Issued/version3 with exactly one1000-minor payment. Invoice cards now show invoice number first, customer name underneath; draft invoices have explicit draft labels.

Cross-page assignment: adding staff051 on page2 preserved001. Initial intended removal was performed on page1 (phone screenshot); it removed001 while preserving051. This was retained as evidence, not counted as the intended page2 removal. Owner restored001, explicitly confirmed051 checked on page2, then removed051. Final dedicated booking Scheduled/version1, assignmentversion5, only001 remains. Both verified add/remove cases preserve assignments outside the submitted staff page.

Final owner retained Manager session refreshed to Choose Business. All synthetic delegates across A/B inactive; onboarding disabled; new pilot inactive/version2. Existing test/history retained. Final private hosted verifier PASS10 assertions with seven preview hashes and seven live baseline states; original private configurations unchanged; fresh reserved Manager/Receptionist/Worker Auth sessions cannot access preview pages or discover A context; anonymous denied. Phone account's retained-session denial is separately owner-observed. Dependencies match live; preview-only layout.php difference remains documented and is not a candidate dependency change. Temporary hosting task cancelled. Private receipt: final-closeout-20261116/hosted-final.json.

## Recovery

Encrypted backup43843151079 PASS. Isolated restore43843901476 PASS:84 tables, matching snapshot fingerprints,28 owner scopes, network none, no published ports or production credentials forwarded. Actual six-file private configuration encryption/decryption/hash/mode recovery PASS; originals unchanged, ephemeral keys/plaintext removed, no SMTP send. These are dated recovery proofs, not a service recovery-time guarantee. Recheck freshness before a later release.

## Exact proposed release

Only seven canonical runtime files generated by docs/sc04/readiness.py; final-release-scope.json records exact candidate/live-baseline SHA256:

- account/core.php
- account/delegated.php
- account/workspace.css
- account/workspace.js (new offline-retention enhancement)
- account/staff-join.php
- account/staff-join.js
- account/staff-join.css (new)

Only SQL patch docs/sc04/defect-repairs.sql, SHA256017d5df36dbe4161754ed9944e9818cf63f588b52e657334e07001b21ee1ca9a: replace public.business_delegate_command(uuid,text,text,jsonb), create public.business_delegate_page(uuid,text,text,uuid,integer,integer), revoke page execute from PUBLIC/anon/authenticated/service_role then grant authenticated. Existing scope/membership/assignment checks remain mandatory. No table, policy or historical-data migration. Shared live command remains MD52c2aeb980f2b7cf6e3be2d0410551020; canonical page remains absent. Preview aliases/adapter must never be copied into live.

Excludes inherited public pages, new dashboards, global UI assets, intake, republication, real invitations/customer messages, full installers, historical time/date adjustment and additional functionality. Preserve concurrent main, F01–F06 and five-step booking flow. No whole-branch/full-site deployment.

## Limits, authorization and rollback

Known-offline phone recovery is accepted; mid-flight ambiguous-save connection loss has native/browser proof, not separate physical-phone acceptance. Physical acceptance covers listed scenarios/devices, not every possible role/action/device combination. No independent QA approval or claim of universal defect-free operation. Isolated PostgreSQL recovery excludes hosted Supabase configuration and Storage bytes; private file recovery is separate from a new independent off-host configuration backup.

Before an authorized release: recheck exact source/CI/main, seven runtime baselines and dependency hashes, function definitions/grants, permission preservation and recovery freshness. Stop on drift and preserve concurrent work. Capture guarded original seven-file states (including absent JS/join CSS) and both function definitions/grants. Rollback restores only those runtime/function states and removes newly introduced page function/assets where appropriate, retaining every business and financial record. Never restore a whole database over live records for this batch. Verify access isolation, booking/invoice links and payment history after release or rollback. Separate explicit owner authorization remains required; none has been given.
