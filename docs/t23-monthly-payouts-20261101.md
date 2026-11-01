# T23 monthly bank payouts — source preparation

Document T23-20261101, version 0.1. Owner: Codex implementation; approval authority: Farai. Status: source candidate, unpublished. Gate: CONDITIONAL PASS for source qualification; NO-GO for hosted execution until separate approval and qualified CI. T23 is not complete. T24 untouched.

## Verified scope and authority

Directly read canonical Build Tracker A1:N32 and current T04 Decisions on 1 November 2026. T22 is Done, completed 01/11/2026, with explicit owner staging acceptance in L23. T23 A24:L24 is Monthly bank payouts; review, freeze, approve, transfer and reference recording; acceptance no duplicate settlement and payout totals reconcile; dependency T22. It was Not started at this audit. PAY03/ADJ01 and BK01 are approved designs; BK01 separately adopts the specified financial design for Bokkie, preserving own prices/configuration/history and protected terms. No invented eligibility, banking API, deductions, calendar or actual financial activation.

AGENTS.md and docs/blueprint.md read. PR100 directly inspected: closed, not separately merged; its description records incorporation through accepted PR108/main804790f0. git merge-base confirms 8452de50 is an ancestor of current staging. The old T23 note saying this code is unmerged is stale. Existing monthly review, clearing, allocation, claim, owner approval, dispute and retry code is reused, not rebuilt. Historical Stage3 evidence remains untouched. Current open PR search shows no competing T23 PR; unrelated historical drafts remain untouched.

## Smallest complete change

Replace the existing bounded monthly writer in place with the reviewed PAY03 implementation plus T23 source linkage. Reuse existing statements/events/claims tables and public invoker RPC. No new monetary ledger or bank provider.

- New include-accrued/include-adjustment forms submit only source identity and review evidence. Database derives amount, original period and booking from immutable history. Direct legacy add_line cannot invent visit earnings: it must match the exact T22 agreement/worker/source and a durable accrual. Customer-payment tables are never consulted.
- Protected original R0 is an explicit line, creates no transfer, and cannot block another positive worker. No formula, cap, duration, original agreement or business configuration is rewritten.
- New amount-bearing lines use recorded accrued originals or existing approved/frozen/undisputed/unsimulated linked ADJ01 corrections. Manual cancellation/pool/reimbursement entries from the older standalone synthetic review form are not promoted into accrued payout entitlements. Historical lines remain readable and existing collection/dispute controls remain present; no new cancellation accrual feature is added. Reimbursements use their approved correction IDs and retain their separate category in statement snapshots.
- The original occurrence claim is keyed by business/worker/booking; correction claims use the immutable adjustment ID and block independent Stage2 simulation. Changing labels, event IDs or month cannot settle the same source again.
- A later approved correction can be appended after an original was cleared, provided no attempt has an uncertain remainder. It clears freeze/approval and statement-provision evidence, retains old lines/allocations, and requires renewed owner review. Only the remaining delta is payable.
- Freeze snapshots exact lines plus linked source versions and total. Approval/submission compare the snapshot; owner permission and current live session are checked in SQL. Business/actor membership locks prevent concurrent suspension from crossing the write.
- Existing exact outstanding submit, cumulative per-line clearing, partial/unknown/failure handling, immutable resolved attempts, idempotency and optimistic versions are retained. Transfers are always synthetic; execution remains disabled and table constraints retain synthetic_only=true.

The approved transfer step is owner-controlled manual bank action with separately recorded reference, then clearing/allocation verification. This source implements its synthetic recording/reconciliation path only. There is no bank call, payment instruction, exported bank batch or fabricated provider-confirmed payment. Actual bank action remains with the owner and is unauthorised in this task.

## Verified environment and evidence boundaries

Git staging/base ea2faae8a814f83cd777135dc3a469e346b13486. Plesk Node.js screen directly inspected: application root /staging.faraios.com/app, public root /staging.faraios.com/app/public, Node24.22.1, startup _test_payments.cjs. The screen displays application mode production; this is Plesk's runtime mode, not authority to use production business data. Only staging.faraios.com is targeted. Navigation to overview hit subscription-context permission denial; no permissions or hosting settings were changed. Verify current IP/Git deployment and recovery checkpoint again before any hosted execution.

Actual /environment-health returns staging project xdmfyrsauvqznkloroxg, LiteSpeed/managed TLS, accepted T22 fingerprint25c7661fc24cbaaa9142ac2523a33d8cb5ab0e326c4dcd4e2f30766879c92199, TEST-only payments, disabled notifications and accounting worker. Existing private scheduled accounting work is not modified or equated with that public runtime field.

Read-only hosted SQL confirms4agreements/4accruals and0monthly statements/claims. All accepted sources have originalPeriod2026-11. They cannot enter a closed-month statement on1November. Preserve all accepted T22 IDs and journals without freeze/claim/simulation; use separately approved fresh October synthetic fixtures for hosted acceptance. Existing T21 R100 allocations/R10 unmatched are protected and must be rechecked before/after hosted execution.

Hosted application is at sign-in. No T23 hosted UI/API/database mutations or candidate-layout verification occurred. No physical-phone testing, native race PASS, separate manager/staff login, production change or real financial write is claimed. Candidate source has not been pushed/merged/deployed. Private configuration and recovery files were not opened or changed.

## Requirement and acceptance map

| Requirement/control | Source verification | Hosted acceptance still required |
| --- | --- | --- |
| Review recorded monthly earnings | Exact durable accrual/worker/source/period SQL checks; R0/tamper/unaccrued denial | Both businesses, closed October fixtures, original snapshots unchanged |
| Freeze and owner approval | Full line snapshot and linked versions; manager write denial | Real owner UI; role/tenant/session SQL denial; read/refresh |
| Transfer and references | HTTP-to-SQL submit/reconcile; no external bank path; synthetic labels | Submitted/unknown/partial/failed/cleared example outcomes and statement provision |
| No duplicate settlement | Unique original/correction claims; exact replay; changed-key/cross-period denial | Native concurrent claims/submissions/rollback and hosted retry/readback |
| Payout totals reconcile | R175.01 original: R100 partial + R75.01 retry; later R50 reimbursement; final R225.01 with immutable original | Each hosted business R199.50 original + R50 reimbursement = R249.50 synthetic allocated, no residual |
| Adjustment inclusion/exclusion | Pending correction denied; approved/frozen correction delta only; category retained; inherited dispute/version guards | Approved and excluded/pending/disputed cases; renewed approval after changes |
| Isolation/access | DB current membership/worker/business checks; denied manager approval, staff write, foreign owner and revoked session | Actual anonymous API denial, wrong business UI and current-role SQL checks |
| Recovery | Uncertain blocks retry; verified failed remainder allows only outstanding; prior allocations immutable | Reload after interrupted response; inspect event key/version before retry; no blind resend |
| Layout | Existing module styling reused; unverified for changed forms | Inspect desktop and mobile viewport forms; record actual dimensions; physical device separate |
| Preservation | No hosted writes; old evidence/source retained | Before/after ordered-row digests, retained fixtures and T20/T21 invariants |

## Validation

See docs/evidence/t23/integrated-tests.txt for12/12PASS, including8 imported T22 integration tests and4new T23 integrated SQL/HTTP cases. Zero failures/skips in that run. Existing PAY03 database/HTTP baseline12/12PASS before T23 changes. Final focused/broad results are recorded in the evidence folder when complete. Syntax/diff checks run. PGlite runs actual PostgreSQL SQL in-process; it is not native independent-connection evidence.

Native10race cases prepared under READ COMMITTED/REPEATABLE READ: competing cross-period claims, competing submissions, same-key replay, first-writer commit and rollback. Runner owns a new loopback-only disposable cluster with no hosted secrets and removes it afterwards. Existing pinned Node24/Postgres17 CI runner invokes it. Native PostgreSQL is unavailable locally; attempted package installation failed due environment permissions, so no native PASS is claimed. Exact-head CI is required after source publication.

## Operations and recovery

Select business → Monthly settlement reviews → closed month and authorised cleaner → banking-calendar evidence/earlier applicable deadline → include recorded accrued source IDs and approved frozen adjustment IDs → owner full-pay review/freeze → owner verified example beneficiary evidence/approval → synthetic exact-outstanding transfer reference → clearing and cumulative per-line allocation evidence → statement/reference provision. The transfer form cannot send money.

For a timeout reload and inspect stored history/event key/attempt state. Exact event replay is idempotent. Never send a fresh attempt while a previous remainder is unknown. Record verified failure or partial clearing with explicit allocations; retry only the exact remaining balance. Resolve disputes through recorded review and renewed freeze/approval; no deleted or overwritten originals. Do not infer real clearing from a synthetic reference.

Rollback after retained history is source repair/restore while retaining statements/events/claims/adjustment flags and the stricter database writer. Do not restore a permissive old writer or delete claimed sources to recover service. Hiding the monthly route is safe containment. Source restore must preserve private configuration, startup, scheduled accounting and recovery material. Additive database history remains; no destructive rollback is proposed.

## Publication approval requested

Commit/push only this bounded T23 branch and open a Draft PR against staging, to obtain normal exact-head CI including native races and security checks. Scope: database candidate, monthly workspace changes, focused/native tests, disposable runner, CI invocation, syntax command and T23 documentation/evidence. No merge, hosted migration/deployment, credentials, existing fixture mutation or money movement is included. Success is qualified CI at the exact head; on failure repair source before proposing staging. Owner is the approval authority; no independent reviewer is introduced.

The separate draft staging package/checklist is docs/t23-staging-execution-package-20261101.md. It is reviewable preparation, not execution approval or owner acceptance. Keep T23 In progress until all required evidence and explicit owner staging acceptance.

## Final local qualification

Final focused25/25PASS,0FAIL,0SKIP (PAY03 database/HTTP, T22 integration and five new T23 scenarios), including pending/unfrozen/disputed correction denial and paying the undisputed original independently. Actual source diffs relative to accepted PAY03 are in docs/evidence/t23/writer-diff.patch.

Broader run1193total/1163PASS/2FAIL/28SKIP in100.77seconds; it ran before the fifth new T23 test was added. Both failures are Unix socket EPERM in unchanged hosted-staging.test.js; reproduced on an isolated unchanged ea2faae base (base-unix-socket-tests.txt). Broad suite is NOT PASS. Native T23 is one of the deliberate skips without its disposable database; no skipped check is represented as passed. Only test code/documentation changed after that full run; final focused25/25 confirms the extra scenario. npm run check and git diff --check PASS.

Candidate SQL SHA2567069f5fcc3f093069fd0ba41f3e263a98c70d033ebe7ae731b3bb8f5a687d701. Expected candidate runtime fingerprint eea0832e37d5804443510e96faa0411f7d86e2017a586dd8c12ef1f3469de420. These qualify local source only; migration generation and exact-head CI/hosted journeys remain separate.

Final read-only hosted baseline corroborates25bookings/9invoices/7rules/4sources/8adjustment events; original4agreements/4accruals,0monthly statements/claims. PostgreSQL17.11. No hosted mutation performed.
