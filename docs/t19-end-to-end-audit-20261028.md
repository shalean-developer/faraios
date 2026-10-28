# T19 end-to-end coverage audit and completion path

## 1. Document control

ID T19-E2E-AUDIT-20261028, version1.0, 28 October2026 (Africa/Johannesburg). Requested by Farai; decision owner Farai. Subject: FaraiOS T19 Invoices and accounting for Shalean/Bokkie isolated staging. Evidence cut-off: this audit turn after approved inactive hardening. Inspected local head c018cef200e20c39431b332ab0bf7fb019094422, branch fix/t19-environment-order; fetched current remote staging runner/SQL and PR209/211 metadata; canonical spreadsheet re-read. Engineering self-review with QA methodology; not independent assurance or certification.

## 2. Executive assessment

**Completion recommendation: NO-GO for marking full T19 Done or starting T20.** Substantial implementation, fixture/native CI, bounded UI, isolated host lifecycle, owner-accepted local Docker/SQL acceptance and live inactive-schema hardening are evidenced. Actual operational hosted custody, independent business provider connections and effective permissions, real provider lifecycle/fault handling, current-scope recovery and business financial reconciliation remain unaccepted. Do not restart the completed local test merely because older remote documents still say it is blocked.

An additional delivery gap is verified: current GitHub staging scripts/t19-gate2-integrated.mjs still contains the old base image, order-sensitive environment comparison and pg_isready-only readiness; remote SQL still lacks the explicit relkind text cast. The accepted corrected runner exists in the owner-host ready1 bundle and local branch, not current shared staging source. Reconcile source/evidence/CI and the applied SQL change record before claiming reproducible delivery.

## 3. Scope and context

Includes invoice identity/lineage, two-business mappings/connections, owner consent/organisation identity, credential custody, scoped refresh, durable operations/fencing, visible failures, retries/uncertainty recovery, disconnect/revocation, API/database business denials, tax eligibility and financial reconciliation. Assesses implementation versus actual execution separately. Protected staging project xdmfyrsauvqznkloroxg; restore-test zrlojsvkqipuwkkyfrkn and production are not mutation targets. Gate2's native run occurred on owner's WSL/Docker host, not Supabase. This audit performs no operational test, deployment, provider action or database write.

T20 owns business-specific payment accounts/events; T21 retains its evidence decisions. T19 must correctly represent/reconcile invoice accounting and relevant payment-derived states, but this audit does not move payment implementation, refunds or payouts into T19. VAT requirements depend on verified business facts and approved supported scope; no guessed tax settings or historical invoice rewrites.

## 4. Authority and independence

Owner instructed this audit. D15 and the later owner-led acceptance amendment replace external-review nomination/co-signature prerequisites for this isolated staging path. A missing external reviewer is not reinstated as a blocker. Technical criteria and separately scoped SQL/credentials/deployment/OAuth/provider authority remain. The same assistant implemented recent fixes and is auditing them; disclose self-review and rely on exact test, browser and owner-host evidence, not claimed independent certification. Existing owner acceptance applies only to the corrected local disposable test; hardening approval covered only its exact linked SQL.

## 5. Authoritative criteria

Re-read canonical Build Tracker row20: separate invoice identities and independent Zoho connections per business, verified consenting identities/organisation/effective permissions, encrypted hosted custody, automatic scoped refresh, business-authorised durable operations, visible failures and safe reconciliation/recovery. Acceptance requires reconciled business totals, permitted and denied authenticated API/database behavior, generation fencing, duplicate prevention, uncertain-write reconciliation, disconnect/revocation/recovery. Synthetic tests and individual fixture matches alone are explicitly insufficient. Row21 T20 remains Not started; T19 In progress. Decisions D13–D15 and all populated T19 Evidence rows1–72 were retrieved. Older evidence statements such as awaiting basic provider clarification, absent Gate2 runtime, RLS false and mandatory second reviewer are historical where newer evidence/owner decisions supersede them.

Technical criteria V01–V24 are from docs/t19-verification-plan.md, interpreted with t19-provider-confirmation-20261023.md and current scope; no new features are invented to fill an audit table.

## 6. Method and result vocabulary

Compared canonical scope, source contracts, live connector/browser evidence already captured, owner-host signed-run readback, repository/CI reports and fresh remote PR/file metadata. No broad suite was rerun solely to inflate evidence. Local source suites45/45 Gate2/SQL/gateway and6/6 inactive hardening are retained at their tested code; earlier CI totals are historical exact-revision evidence. Labels: demonstrated = actual bounded target behavior; source/tested = code/fixtures/synthetic CI; missing = no sufficient current target evidence. Counts of passing unit tests are not completion percentages.

## 7. Evidence assessment

| Evidence | Proven scope | Limit |
|---|---|---|
| Owner accepted ready1 signed Docker run and journal readback | Permanent startup, six SQL markers once each, durable binding/stopped state, cleanup and exact original13 inventory; no command errors | Disposable derivative image and one successful run, not hosted custody, restore or all live crash scenarios |
| Approved hardening SQL c57946f78ad77dd5ea0d5c28e5d75ac67dc6bd48fb40c22e3ff914342efd72bc | Actual Supabase success and separate committed-state readback:3 RLS-enabled tables,0 rows,0 unwanted role/table/schema privileges | Metadata plus owner/admin SQL route, not ordinary TEST-account HTTP/login denial |
| Live staging discovery | Private schema excluded; NOLOGIN custody; no runtime owner/functions; Vault0; service_role retains Vault SELECT/secret-writing functions | Capability review, not complete indirect privilege/consumer closure |
| PR211 fresh GitHub metadata | Merged e8ef66e4a0b1774e51cc5a60613b032821a993db; recorded successful post-merge CI and source deployment | Current head's recent local corrections not included |
| PR209 fresh metadata | Merged; bounded owner/Bokkie-manager UI denials and unchanged R875/R410 drafts recorded | No current operational provider result |
| Earlier native/CI/service/adapter tests | Broad synthetic business isolation, SQL concurrency, OAuth/state, refresh, lease/disconnect/uncertainty behavior and managed lifecycle | Not current Supabase machine identity, real Zoho acceptance, full final-head CI or recovery parity |
| Fresh canonical tracker | T19 In progress; T20 Not started; original requirements preserved | T19 Evidence sheet ends at older B02 preparation; new accepted local/hardening outcomes not reconciled there |

## 8. End-to-end coverage traceability

| Criterion | Covered | Still required to close |
|---|---|---|
| V01 positive provider identity/known invoice | Expected TEST org pins and provider adapter checks | Current consenting identity, exact intended organisation/currency/effective rights and known synthetic invoice verified against real provider |
| V02 provider access model | Zoho account-level permission model clarified; prior ambiguous responses preserved | Apply dedicated TEST identity/risk model; no need to repeat broad cross-org experiments; accurately assess any scoped provider-boundary evidence |
| V03 foreign business/IDs | Actual bounded Bokkie-manager UI denial; source business/machine/ID tests | Both directions through operational HTTP and database, permitted controls and no provider egress on denial |
| V04 role/membership tampering | Source session/mTLS/revoked-membership tests | Hosted actual session/direct RPC denials, revoked membership, platform-only caller |
| V05 staff/customer ownership | Existing general role foundations; source restrictions | Accounting endpoints deny staff/customer foreign IDs; unsupported portal functions remain denied |
| V06 shared user/switch/cache/report/job | Owner two-membership UI and scoped source paths | Operational cross-business cache/job/status/export boundaries, explicit memberships only |
| V07 DB/worker isolation | Embedded/native synthetic grants/RLS; actual inactive hardening | Dedicated hosted principal, effective role/SET/default/indirect grants, actual SQL/API denials; no service_role worker shortcut |
| V08 callback/replay/session binding | Durable OAuth/state/session-cookie code and negative tests | Approved hosted callback/consent session success plus replay/mismatch/owner-loss refusal and scoped rejected-grant cleanup |
| V09 automatic scoped refresh | Source/native fixture refresh/concurrency/lease fences | Actual two-business TEST refresh, correct version publication, no refresh storm, other business unaffected |
| V10 invalid/revoked refresh/removed rights | Reauthorization/retry source tests | Real bounded TEST revoked/invalid rights outcomes and visible holds; exact revoke authority required |
| V11 encrypted binding/key failure | Seven-field binding/sealing code, tamper tests; vendor key-load log | Actual Vault crypto/readback/tamper/key-loss denial under restricted hosted identity; no ordinary decrypt route |
| V12 invoice/profile/currency/line mismatch | Adapter/receipt/SQL validation and fail-closed tests | Real fixture identity and line/net/tax/gross comparison; visible mismatch/quarantine evidence |
| V13 duplicates/concurrency | Independent native synthetic sessions and durable-operation tests | Operational actual double submission/concurrent processing yields one operation and one remote invoice |
| V14 timeout/lost acknowledgement | Source/native fake-provider uncertainty fence and reconciliation | Bounded real TEST write/readback recovery with exactly one provider result, no second POST |
| V15 zero/two/incomplete matches | Source search/pagination/mismatch handling | Approved operational reconciliation scenarios; absence/incomplete search never authorizes replay |
| V16 worker crash/stale finish | Native/source lease/dispatch/late evidence tests; local quarantine used | Hosted process interruption, replacement-worker reconciliation and stale-generation refusal |
| V17 partial contact/invoice failure | Adapter/worker step/state source behavior | Approved TEST contact/invoice partial outcome, correct resume point and visible permanent error |
| V18 rate/quota/network failure | Bounded retry/backoff source tests | Operational controlled failure/429 evidence with no mutation replay and other business service preserved; do not deliberately exhaust real quotas |
| V19 disconnect/revoke race | Source/native generation/dispatched uncertainty tests | Actual hosted disconnect during work, visible revoke pending/confirmed, no stale resurrection |
| V20 reauthorization/org replacement | Bound connection/generation/mapping source model | Approved TEST same-org reconnect and safe replacement scenario, preserved historical receipts and no redirected old work |
| V21 invoice balances/external edits | Internal saved drafts and receipt guards | T19-scoped read/reconciliation of applicable partial/overpayment/credit/refund/write-off/external-edit states; retain T20 payment implementation ownership |
| V22 business/period totals | Earlier isolated fixture totals and two internal draft samples | Approved complete population/pages/currency/period/timezone, exact internal-provider totals and unmatched buckets, no unexplained cents variance |
| V23 audit/secrets/backup/recovery | Bounded redaction/audit/source checks, historical T11, encrypted checkpoint authentication and local ledger | Current-scope isolated restore/catalog/Auth/Storage/grants parity, denial/financial checks, secure off-site/key recovery and operational RPO/RTO; ledger rollback/replay assurance remains bounded |
| V24 write-scope boundaries | Method/path/draft-only source allowlists and synthetic denials | Real TEST execution respects exact approved endpoints/actions; no send/payment/reminder/production effects |

No row is declared fully end-to-end accepted from unit tests alone. Local Gate2 and inactive hardening are completed prerequisites, not substitutes for this matrix.

## 9. Assurance dimensions

Functional source: substantial tested implementation, with real-provider limits. Security: inactive boundary strengthened; operational closure missing. Reliability: durable fault model tested in fixtures/native synthetic environments, not full hosted failure acceptance. Data/finance: saved customer totals protected; actual external reconciliation missing. Recovery: fresh archive authentication is not recoverability; managed restoration unresolved. Delivery: PR209/211 historical CI passed; latest accepted fixes/shared-source parity not closed. UX: bounded read-only owner/manager flows passed, complete operational two-business UAT missing. Governance: owner-led path valid; exact-action boundaries retained.

## 10. Findings and closure evidence

| ID / priority | Condition and impact | Required action / closure evidence |
|---|---|---|
| F01 High — operational custody absent | Empty hardened tables/NOLOGIN role cannot supply connect-once background accounting | Exact approved runtime SQL/least-privilege identity/private mTLS/config deployment, then real allowed/denied tests |
| F02 High — Vault boundary incomplete | service_role can decrypt/write through functions; shared consumers not exhaustively reviewed | Dependency/default/indirect-function inventory, approved custody separation and actual crypto/denial tests; no blanket managed-role revocation |
| F03 High — provider identity/lifecycle unaccepted | Pins/client names are not current consent or effective permissions | Dedicated TEST identity and known-record verification, scoped consent/refresh/revoke/write acceptance for both businesses |
| F04 High — current recovery unverified | Successful synthetic PG run does not reproduce managed Auth/Storage, restore current checkpoint or prove key recovery | Resolve candidate provisioning/catalog parity; approved isolated restore/current protected state and recovery evidence; prior inactive-only risk acceptance cannot authorize operation |
| F05 High — deployed business API/DB isolation missing | Metadata denials do not prove ordinary session/runtime enforcement | Both allowed and rejected actual TEST HTTP/DB/mTLS cases, both businesses, no egress/state change on rejection |
| F06 High — real invoice lifecycle/reconciliation missing | Internal R875/R410 drafts and fake-provider totals are insufficient | Complete TEST invoice/refresh/duplicate/uncertainty/disconnect/recovery and exact totals/counts/lineage/mappings |
| F07 High — tax eligibility/legacy holds | Missing snapshots and unsupported VAT cases must remain blocked | Verified business/org tax applicability and mapping/rounding; approved valid fixtures or separately reviewed VAT support; no guessed legacy backfill |
| F08 Medium — source/evidence delivery drift | Remote staging still has pre-fix runner/SQL; audit/host results cannot be reproduced from it | Publish reviewed local corrections/build source/acceptance/hardening change record through bounded PR, current-head CI/scanner, merge and appropriate source readback; preserve immutable host signatures |
| F09 Medium — runtimeEvidence reporting defect | Field remains false even after PASS | Define truthful field semantics and test correction; do not rewrite accepted historical receipt/ledger or claim missing runtime from this field alone |
| F10 Medium — stale canonical evidence | Tracker remains appropriately In progress but older evidence says Gate2 blocked/RLS false | Owner-authorized append-only evidence reconciliation; preserve history, D15 and current completed prerequisites |

These priorities reflect completion impact, not a claim of an active incident or existing customer data exposure. No new Critical vulnerability is asserted solely because functionality is inactive.

## 11. Risks and exceptions

Preserve previous failures and quarantines; completed cleanup/original13 reconciliation stands. Preserve historical original T11 acceptance without extending it to the current T19 archive/platform. Owner USB test established access to the older backup-key archive, not proof of the fresh T19 checkpoint's off-site/key restoration. Accepted derivative image startup does not prove full Vault encryption or production suitability. Admins/host/key custody remain trusted. Existing UI-02 and T18 completion are not reopened. Do not invent approval, reviewers, a financial source of truth or a completion percentage.

## 12. Ordered completion work packages

These are work packages derived from existing requirements, not new product stages or tracker tasks. Delivery owner Codex; exact protected decisions/TEST consent and final acceptance Farai; financial/tax facts require business/finance evidence. All are due before T19 completion, with the dependency ordering below.

1. **Reconcile delivered source and evidence.** Publish the accepted environment/key-path/readiness/SQL corrections and build recipe, hardening applied record and new acceptance evidence. Obtain exact-head CI/scanner results and shared-source readback. Correct runtimeEvidence through a separately tested source patch without changing old run evidence. Append current tracker/Issue140 evidence only with authorized scope; no automatic completion.
2. **Close hosted compatibility and current recovery prerequisites.** Current project/baseline snapshot; controlled B02 role/SET/owner test through the approved transport with fresh post-state; resolve backend TLS and managed-catalog bootstrap/restore holds. Current recovery plan must account for newly enabled RLS and later runtime objects. Neither protected existing project may be overwritten and paid capacity needs exact approval.
3. **Provision operational custody under exact approval.** Consumer/grant matrix, dedicated restricted SQL and machine identities, owner-only private config/mTLS, narrow fixed-search-path RPCs/RLS, private schema excluded, no service_role or postgres credential in web/worker. Apply reviewed SQL once, verify effective grants and rollback/recovery expectations, install actual service; keep provider dispatch disabled until its own test authority.
4. **Prove real authenticated security boundaries.** Authorized TEST actors/machines, both allowed and denied HTTP/database paths, foreign business/org/generation/version substitution, removed membership, staff/customer/platform restrictions, secret-read denial and no egress/state changes. Include actual private-profile API refusal; settings alone do not close it.
5. **Verify independent business connections and eligible fixtures.** Owner-approved dedicated TEST consenting identity/client/lifecycle and expected org, known fixture/customer/currency; establish effective CREATE/refresh/revoke permissions. Verify tax applicability/saved snapshots before writes. Do not rewrite old R875/R410 invoices or assume they are eligible provider fixtures.
6. **Run bounded TEST accounting end to end.** Per business: internal draft→authorized durable job→exact one Zoho draft→verified saved mapping/receipt/status. Test concurrent duplicates, controlled failures/429, refresh, lost acknowledgement, restart, search uncertainty, disconnect/revoke/reauthorization and generations. Confirm no send/payment/reminder effects and no production operation. Keep uncertain outcomes held, never blindly retry a write.
7. **Reconcile and obtain owner UAT/acceptance.** Compare complete approved local/provider populations by business/currency, lines/net/tax/gross, counts, contacts/mappings, statuses and unmatched buckets; verify no unexplained variance. Owner desktop/mobile/key failure/retry flows for both businesses; final audit/evidence/current-head checks and explicit full T19 acceptance. Only then consider T19 Done and T20 start under canonical plan.

## 13. Options and recommendation

Recommended: retain completed foundations and use the ordered packages above. Continue bounded source preparation and read-only audit; request exact operational approvals when concrete packages are reviewable. Do not repeat basic provider-model research or credential-free host probes already closed. Do not use production, widen database permissions, disable TLS or weaken restore fingerprints to make tests pass. Do not activate connect/sync merely because RLS hardening succeeded.

## 14. Outcome and reassessment

Engineering completion outcome **NO-GO** for full T19 closeout at this evidence cut-off. This does not withdraw owner acceptance of local Gate2 or the verified inactive hardening. Independent formal certification is not provided. Reassess when actual hosted identities/security, recovery, real-provider lifecycle/reconciliation and current-source delivery evidence exist. Any source/image/SQL, grant, tax, provider-binding or deployment change invalidates reliance outside its exact accepted scope.

## 15. Governance handover

Owner decision requested here: none; this is an audit, not a mutation or activation request. Next implementation target is source/evidence reconciliation followed by the hosted compatibility/recovery package. Preserve all separate existing operation approvals. No external messages, tracker changes, hosted writes, PR merge, runtime activation or new consent were performed during this audit.

## 16. Evidence index

- Canonical tracker: https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit ; Build Tracker rows19–21, Decisions rows1–16, T19 Evidence rows1–72, fetched this turn.
- GitHub PR209/211 fetched this turn; both merged. Remote staging runner blob85be92531c835e5f22b9d0a422b59090b5fd28f5; SQL blobcd0853a432a8ef54754b8d9f149f43414de8e08a, fetched this turn; old environment/readiness/image/cast behavior confirmed. Issue140 fetched OPEN with77comments; original body is historical, not current absence-of-schema proof.
- docs/t19-owner-led-acceptance-20261028.md; docs/t19-current-acceptance-20261028.md; docs/t19-verification-plan.md; docs/t19-runtime-acceptance.md.
- docs/t19-gate2-owner-accepted-20261028.md and owner pasted signed-run/durable readback in this conversation; accepted module67fe4b7a0531d3e70fbed075ae86e5efafd322a43823207e5312b7fb9603dc4c; SQL6bc9cf8a64f056af01152961503769d68edfd93cfd254e952cba9d305dfb20af; derivative2b3159aaa54f5bfb06dffce70ee7b2481a3489fdfb607562e12b4940e26331f8.
- docs/t19-a12-browser-readonly-findings-20261028.md; docs/t19-a12-inactive-hardening-applied-20261028.md; docs/evidence/t19-a12-hardening-20261028/readback.json and verified.png.
- docs/t19-a12-least-privilege-fix-20261028.md and exact applied proposals/t19-a12-inactive-hardening.sql; test/t19-inactive-hardening.test.js6/6.
- docs/t19-b02-exact-sql-approval-packet.md; docs/t19-b02-session-pooler-amendment.md; docs/t19-b02-hosted-compatibility-recovery-procedure.md.
- docs/t19-restore-verify-01-provenance-destination-decision.md; docs/t19-restore-verify-01-local-readiness.md; docs/t19-vat-acceptance.md; docs/t19-provider-confirmation-20261023.md.

Audit limitations: no fresh provider request, native fault drill, current process/financial baseline or recovery executed this turn; prior exact runtime observations remain time/scoped. No whole-project security assurance or percentage-complete claim. No speculation about inaccessible private checkpoint contents.
