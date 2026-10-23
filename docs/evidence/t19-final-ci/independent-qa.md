# Independent T19 final CI evidence review

Reviewer: separate Codex QA agent `/root/t19_final_ci_qa`, 23 October 2026. This reviewer did not implement the candidate or operate the final test runs. Review used the workflow and source, complete retained logs, harnesses, environment/cleanup records and source/evidence comparisons. Successful tests were not repeated solely for this review. The reviewer shares the implementer's host/tooling; this is independent agent assessment, not external human assurance or owner approval.

Implementation reviewed: `d4643e244f5f9538264a5beec15b03984a437d32`; starting evidence descendant: `7d81b7c294fdefef910909603d41770e1ea0579c`. The final evidence commit is the commit containing this report. Candidate-to-starting-HEAD differences were independently inspected: documentation/evidence only; application, tests, workflow, dependencies and T04 implementation are unchanged. Earlier runner-discovery source correction already has its preserved [independent reassessment](../t19-closeout/independent-reassessment.md).

## Decision

**PASS: bounded offline Stage B technical acceptance and local semantic coverage of the three workflow test bodies. NO-GO: hosted CI acceptance, PR merge readiness, production and accounting activation.** Formal substitution of local evidence remains an owner decision. This review neither applies that exception nor converts GitHub failures into passes. T19 remains In progress.

## Independently assessed coverage

| Workflow/gate | Assessment | Evidence and limits |
|---|---|---|
| policy-tests install and syntax | PASS | Fresh `npm ci --ignore-scripts` in policy-build.log; actual `npm run check` in policy.log; exits 0 |
| policy-tests full suite | PASS | Actual `npm test` with disposable PostgreSQL 17.10/T16 URL: 297 tests, 296 pass, zero failures, one explicit native skip; Node 24.22.1, Debian 13 Linux |
| policy-tests dedicated native accounting step | PASS | Actual workflow command, 26/26, zero skips; native restricted roles, HTTP, concurrency/held-lock tests; cluster cleanup present |
| Legacy native concurrency | PASS | Enabled in new full suite; preserved earlier Linux 1/1 with unchanged assertions and nine observed lock waits. Existing workload/allowance safeguards do not establish monthly settlement or payout execution |
| zoho-setup-windows | PASS | Fresh locked install, six syntax checks and exact seven-file default-concurrency command: 110/110, zero skips, exit 0, 149746.6041 ms; Windows local/Node 24.19.0 |
| Public TLS verification | PASS | transport.log: one approved SSLRequest/TLS verification; no PostgreSQL startup/authentication/query; allowance consumed |
| Synthetic backup/Docker transport | PASS, composed evidence | transport-offline.log: all six dumps; native restore, metadata/ACL/RLS/defaults/sequence/rollback safeguards; 21 TLS rejection cases; timeout/cancel cleanup; unrelated sentinel retained; exit 0 |
| Exact original end-to-end transport invocation | FAIL, preserved | Original transport.log failed after TLS and metadata because local adapter dropped required environment variables; not relabelled as a green unmodified invocation |
| Cleanup | PASS | Both native cleanup markers, stopped PostgreSQL/PID absent, database directory removed; final cleanup.log has no task transport containers/network, zero transport temp entries and build directory absent |
| GitHub Actions | NOT VERIFIED / blocked | All three jobs failed before test execution; raw blocker annotation retained. No hosted pass inferred |
| Hosted runner/orchestration/time budget | NOT VERIFIED | Local OS and Docker bridge differ; policy wall-clock interval and Node measured durations disagree. Cause is unknown. No claim of satisfying hosted five/ten-minute enforcement |
| Branch protection/rulesets | NOT VERIFIED | Base/main/ruleset API 403 responses do not prove protections absent; structural MERGEABLE is not approval |
| GitGuardian | PASS at starting evidence HEAD only | pr-audit.json; final proposed merge head must retain its own success |

The sole new Linux full-suite skip is the dedicated Stage B native contract group, executed successfully by the next workflow command. It remains a skip in that full-suite total. The two historical Windows full-suite skips have separate native evidence; the historical totals remain unchanged. Windows-specific group and dedicated native run have zero skips.

## Confirmed harness defect and regression evidence

Review identified the Linux-to-Windows environment-forwarding risk before the public attempt. The offline bridge probe first failed, then passed after PG forwarding, preserving Unicode and LF stdin/stdout. The unchanged transport invocation subsequently failed after successful TLS/metadata. The offline diagnostic retained the actual synthetic error, `RESERVED_ROLES: unbound variable`, and other omitted script variables. This confirms an adapter defect, not an application defect.

The corrected bridge was independently inspected: it forwards present names explicitly requested through `--env NAME` plus PG variables, preserves values, converts only `/mnt/c/` bind-source paths, and selects the existing local Docker context. The complete successful synthetic run exercises the formerly failing dump paths and all later assertions. No application correction is warranted by this evidence.

The reviewer compared transport-offline.mjs with the original script: after normalising evidence CRLF, the only difference is replacing `await publicPoolerTLS();` with the explicit omission marker. All synthetic assertions are unchanged. The final helper hash matches the original helper hash; diagnostic instrumentation is not the accepted helper. Public TLS evidence and full synthetic evidence are therefore composed, with the infrastructure difference disclosed. No second public probe was needed or claimed.

## Evidence integrity and remaining governance

The reviewer independently verified all 35 entries of the historical closeout manifest and all 15 entries of the historical Linux manifest. Original Windows CRLF failures and original backup ENOENT failure remain intact; the ENOENT root cause remains unknown despite subsequent passes. Current raw logs, harnesses, exit records and checksums are retained beside this report. The final checksum manifest is validated separately after this report is added to avoid circular self-hashing.

The [owner proposal](README.md) appropriately limits substitution to the frozen candidate and recorded evidence-only descendants; it does not automatically cover future source/configuration changes. Accepting different local OS/Node versions, split TLS evidence, Docker adapter and unverified hosted time budgets requires the owner's explicit decision. Unknown protection requirements and blocked hosted checks remain merge gates. No billing or security-control change is proposed.

No new development stage is approved here. Stage C requires explicit scope approval, applicable provider/support clarifications including conditional D2, approved synthetic organisations and credential/session/vault/API/RLS prerequisites. Real OAuth, provider accounting writes, deployment, T04 changes and financial activation remain outside this acceptance.

## Post-publication security-check addendum

The published evidence commit `03f7ed0d6406843637618a764d21e32b44ab3024` received **GitGuardian FAILURE**, check run 120237058722, incident 38407534. The reviewer inspected [the retained raw result](gitguardian-03f7ed0.json) and both flagged locations: policy.sh line 32 and audited-ci.yml line 15. This supersedes the starting-HEAD success as the current security-gate assessment; that older success remains historical evidence only.

Both findings are the literal synthetic fixture password `postgres`. In policy.sh it initializes a new disposable PostgreSQL cluster, bound to loopback inside the network-disabled container; the recorded database/container cleanup completed. The copied workflow uses the same pre-existing service fixture value. Independently computed SHA-256 values confirm audited-ci.yml is byte-identical to the repository workflow. These two findings are synthetic test credentials, with no evidence that either is a live business/provider credential. This classification is specific to the two reported occurrences and does not claim a broader credential audit.

**Offline technical PASS is unchanged. GitGuardian gate: FAIL, pending owner/security disposition. Merge readiness: NO-GO.** No suppression, incident dismissal, history rewrite, check override or security-control change was performed by this reviewer. The owner/security reviewer must disposition the synthetic finding through the established review process; a current successful security check remains mandatory for merge readiness. A local-evidence governance proposal does not silently waive this new failure.
