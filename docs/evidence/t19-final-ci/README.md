# T19 final local CI verification and owner proposal

Implementation: `d4643e244f5f9538264a5beec15b03984a437d32`. Starting evidence HEAD: `7d81b7c294fdefef910909603d41770e1ea0579c`. PR: [#102](https://github.com/shalean-developer/faraios/pull/102), draft, `codex/t19-stage-b`, base `codex/t19-research-architecture`. Date: 23 October 2026.

This report supplements, never replaces, [original independent QA](../t19-stage-b-independent-qa.md), [backup investigation and controlled full runs](../t19-closeout/README.md), and [native Linux verification](../t19-linux/README.md). Their original failures, including Windows CRLF, remain historical failures. T19 remains **In progress**; accounting activation **NO-GO**.

## Provenance and method

All new tests used `git archive` of the exact implementation candidate. `archive-sha256.txt`, source hashes in logs, `implementation-identity.diff` (empty), and `candidate-descendants.txt` establish that intervening commits change documentation/evidence only. No application, T04, workflow or lockfile source changed in this closeout. Temporary harnesses are preserved here and are not production code. The final evidence SHA is the commit containing this report, also recorded in the PR body and delivery response; a file cannot embed its own future commit SHA.

The three jobs in `.github/workflows/ci.yml` were audited in full. Actions checkout/setup-node themselves, GitHub runner identity, scheduling, hosted execution and timeout enforcement are not emulated. The local checks are evidence for the test bodies, not successful GitHub check runs.

## CI coverage matrix

| Gate | Local result and evidence | Hosted status / limitations |
|---|---|---|
| policy-tests locked install | PASS, exact `npm ci --ignore-scripts`; policy-build.log, exit0 | GitHub did not execute steps |
| policy-tests syntax | PASS, exact `npm run check`; policy.log | GitHub did not execute steps |
| policy-tests full suite, T16 URL configured | PASS: 297 tests,296 passed,0 failed,1 skipped; policy.log, exit0 | Node24.22.1, PostgreSQL17.10, Debian13 Linux,2CPU/4GB; ubuntu-latest differs |
| T19 isolated native security step | PASS: exact `T19_PG_BIN="$(pg_config --bindir)" npm run test:accounting:postgres`,26/26,zero skips; policy.log | Disposable native cluster, real restricted roles/HTTP/held locks; no hosted JWT claim |
| Legacy native concurrency | PASS in integrated full suite; prior dedicated unchanged1/1 and9 observed locks preserved in t19-linux | Windows CRLF failure remains historical; no T04 modification |
| Windows locked install, six syntax commands | PASS; windows.log, npmci exit0 | Windows11 local versus windows-latest hosted image |
| Windows exact seven-file test group | PASS110/110,zero skips,149746.6041ms; windows.log, exit0 | Node24.19.0, default file concurrency; not earlier serial full-run substitute |
| Backup transport and Docker restore/security | See final outcome below | Initial unchanged run failed after TLS/metadata; not a hosted pass |
| Public provider certificate/hostname | PASS once, transport.log | Explicit owner approval; SSLRequest/TLS only, no startup/auth/query; approval consumed |
| GitGuardian Security Checks | FAIL at03f7ed0: two synthetic fixture-password occurrences; see addendum/rawcheck. Starting HEAD was PASS | Mandatory unresolved security gate; not replaced by local tests |
| Hosted job time limits | NOT VERIFIED (5min policy/Windows,10min transport) | Policy wall timestamps21:44:16→04:08:19 span6h24; measured test times229.433s+24.009s. Cause of wall/elapsed discrepancy not established; no timeout-equivalence claim |
| Branch protection / rulesets | NOT VERIFIED | main/base protection and ruleset APIs returned403 upgrade/private-repository response; cannot infer absent rules or merge permission |
| Hosted Actions acceptance | BLOCKED, not PASS | Raw hosted-blocker.json and pr-audit.json retained; billing/spending execution blocker, no billing change |

## Skips and historical failures

The new Linux full suite has exactly one skip: `Stage B native PostgreSQL roles, HTTP, concurrent claims and disconnect contracts`, because ordinary npm test does not configure its dedicated URL. The next actual workflow step runs that suite natively and passes26/26. New Windows group and native dedicated run have zero skips. Earlier controlled Windows full suite had two native skips: legacy native is covered by the preserved Linux1/1 plus new integrated run; StageB native by dedicated26/26. No skip is silently counted as a pass.

The earlier backup-file-permissions ENOENT cause remains unknown. It passed later controlled runs, including this unchanged Linux full suite. The Windows legacy CRLF assertion failure was not repaired or hidden. Its unchanged assertions pass on Linux. No speculative production fix was introduced.

## Transport investigation

The unchanged script made the single approved public TLS handshake successfully, then trusted synthetic metadata passed. It failed with METADATA_UNCLASSIFIED and completed fixture cleanup. An offline diagnostic copy omitted the public call and exposed the actual synthetic child error: `RESERVED_ROLES: unbound variable`. The WSL-to-Windows Docker adapter forwarded PG variables but omitted non-PG `--env NAME` variables. This is a confirmed local harness defect, not evidence of an application defect.

The corrected adapter forwards present explicitly requested `--env NAME` values plus PG variables unchanged, translates only bind-mount host paths, and selects the existing local Docker context. Initial bridge failure, corrected PG probe, original transport failure and diagnostic failure are retained. `transport-offline.mjs` is the original workflow script with only `await publicPoolerTLS();` replaced by an explicit omission marker. The production backup helper is byte-identical to the candidate. Thus final coverage is composed from one unchanged approved TLS run plus the synthetic remainder, not a claim that one unmodified end-to-end invocation passed.

Transport uses Ubuntu26.04 WSL, Node24.22.1/OpenSSL3.5.5 and Windows Docker CLI bridging to local Linux Docker Desktop. The workflow-pinned PostgreSQL17.11-bookworm image is used. This differs from GitHub's native Ubuntu Docker CLI. All synthetic assertions must finish, including21 TLS negative cases, timeout/cancel and unrelated-client sentinel retention, before claiming local semantic coverage.

## Proposed bounded no-spend owner decision — NOT APPLIED

Approve only local offline StageB acceptance of frozen implementation `d4643e244f5f9538264a5beec15b03984a437d32`, together with the explicitly recorded evidence-only descendant chain ending at the commit containing this report. Coverage does not extend automatically to future descendants. Any change to source, test assertions, dependencies, workflow, TLS trust/pins or security configuration invalidates the substitution and requires appropriate testing and independent review.

The proposed substitution covers the test bodies of policy-tests, zoho-setup-windows and backup-transport only to the extent marked PASS in this matrix and independently verified. It does not convert blocked jobs into success, waive real uncovered assertions, satisfy unknown protected-branch rules, or authorise a merge. Owner acceptance must explicitly acknowledge local OS/Node minor versions, Docker bridge, split TLS/offline evidence, and unverified hosted timeout/runner orchestration. If the owner does not accept those differences, retain the gates and use suitable free infrastructure later; no additional spending is proposed.

Mandatory controls remain: independent QA PASS, preserved checksummed evidence, unchanged implementation identity, GitGuardian success at intended merge head, owner review of known branch protections/rules, and either genuine required-check success or a separately authorised governance decision that does not disable/bypass security controls. This agent has neither applied an exception nor changed statuses, protections or billing. PR102 remains draft/unmerged; PR101 is not merged.

Risks: shared local host is weaker provenance than independent hosted runner; compensate with exact archive/hashes, full raw logs, independent agent inspection and explicit environment/adapter audit. Separate Codex QA shares host/tooling and is not external human assurance. Container/cluster cleanup and credential-free fixtures constrain exposure. Hosted duration/orchestration and provider compatibility remain distinct unresolved claims.

## Next stage and limits

No subsequent implementation stage is approved by this report. The next proposed stage is bounded StageC synthetic read-only connection onboarding, subject to explicit owner scope approval and unresolved architecture/support questions (including conditional D2 and applicable S1–S4/S7), two approved synthetic organisations, secure credential/vault/session design and deployed API/RLS verification. Real OAuth/provider access requires separate approval. Financial writes, production, accounting activation and T04 changes remain prohibited. Monthly settlement/payout execution, tax/credit/refund/reconciliation and production key recovery remain outside this evidence.

## Final outcome

**PASS for local offline StageB semantic test-body coverage; NO-GO for hosted CI acceptance and PR merge readiness.** The corrected offline transport remainder exited0 on23 October04:12:13UTC (start04:08:56UTC), with all dump, restore, ACL/RLS,21 negativeTLS, timeout, cancellation, unrelated-sentinel and fixture-cleanup assertions passing. The single approved TLS handshake passed separately. The original unchanged invocation remains a recorded FAIL caused by the local adapter; no claim is made of a single green unmodified transport invocation. No application-source defect was found or fixed in this final verification.

See [independent QA](independent-qa.md) for the separate acceptance decision. See SHA256SUMS.txt for complete evidence checksums. Exit files and raw logs are retained, including failures. Policy cleanup stopped the disposable server, verified its PID absent and removed its directory; its stopped container and custom image were removed. The transport script removed its owned containers/network/temp fixtures; final inventory and checked temporary-directory deletion are recorded in cleanup.log. Shared base images and unrelated infrastructure were not removed.

Owner action proposed: approve the bounded local evidence substitution above for offline StageB acceptance only, or keep that governance gate pending. No merge or production/accounting approval is requested or inferred. Unknown branch protections and blocked hosted jobs remain merge gates regardless of the local PASS.

## Reproduction details

Windows: extract the candidate archive into a fresh task directory; prepend the Node24.19.0 runtime; remove inherited PG/database/FaraiOS/Supabase/T16/T19/NODE_OPTIONS/NODE_AUTH_TOKEN/NPM_TOKEN/NPM_CONFIG variables; use empty task npm user/global configuration. Run `npm ci --ignore-scripts`, then the six exact `node --check` commands and seven-file `node --test` command in audited-ci.yml, unmodified and with default concurrency. Full output and exit0 are in windows.log/windows.exit.txt. windows-environment.json records the OS. No source staging or production configuration was loaded.

Linux policy: policy.Dockerfile installs locked dependencies in the exact archive and policy.sh runs all job commands in order. The container used networknone,2CPU/4GB, dropped capabilities, no-new-privileges and ephemeral PostgreSQL directories (policy-isolation.json). Full container and inner logs are both retained. The pinned official base images were cached; only task-specific container/image was removed. npm's public registry is infrastructure access, not accounting-provider access.

Transport: transport.sh records the preflight/run environment and sterile process environment. docker-bridge.py is the corrected local adapter (the final comment was clarified after execution; executable behavior unchanged). docker-bridge-pg-only.py preserves the failed adapter. bridge-before/after preserve the initial PG forwarding correction and Unicode/LF probe. transport-diagnostic.log exposes the further missing RESERVED_ROLES/ALLOWED_CONFIGS variables; its disposable helper instrumentation only printed synthetic stderr and was restored before transport-offline.log. The sole offline script change is preserved in transport-offline.mjs and independently compared to the candidate. No successful check was repeated after final completion.

## Post-publication security gate (03f7ed0)

GitGuardian changed from the starting-head PASS to **FAIL** on evidence commit `03f7ed0d6406843637618a764d21e32b44ab3024`: incident38407534, two occurrences in policy.sh line32 and audited-ci.yml line15. Raw check output is preserved in gitguardian-03f7ed0.json. Both findings reference the literal disposable fixture password `postgres`, also used by the existing audited workflow. The policy cluster was created fresh under networknone and removed. This is a synthetic-fixture classification, not access to or exposure of a real accounting credential. No suppression, ignore directive, history rewrite, security configuration change or incident dismissal was applied.

**GitGuardian remains a failed merge gate pending owner/security-review disposition and a successful required security check.** The bounded proposal does not waive this gate. Offline technical StageB PASS does not imply security-check/merge acceptance. The new hosted blocker annotation confirms the account execution problem persists at03f7ed0. This report's final evidence commit includes this addendum; the actual hash is linked from PR102 and the final delivery response. Implementation remains d4643e2, with no source change.
