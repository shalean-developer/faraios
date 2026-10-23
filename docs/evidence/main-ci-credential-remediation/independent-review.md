# Independent QA: main CI credential remediation

Decision: PASS for the bounded source change and local regression evidence at implementation candidate `2eb9679e6d6468224996fc4a3349033f13d1d443`. GitGuardian's actual candidate check is SUCCESS. Hosted CI and merge readiness remain NO-GO. This review does not authorize merging or any incident disposition.

Reviewer: separate Codex QA agent `/root/main_ci_qa`, independent of implementation. Review performed read-only except for this report. Base: `651490e8b1e2ecd1815598d3aad7f1ebacaa3353` (verified origin/main). Draft PR: https://github.com/shalean-developer/faraios/pull/103, targets main.

## Source assessment

The reviewed source diff is limited to `.github/workflows/ci.yml`, `scripts/.gitattributes`, `scripts/ci-policy.Dockerfile`, and `scripts/run-ci-policy.sh`. Application, database, test assertions, package manifest and lockfile are unchanged from the base. T04 implementation is unchanged.

A redacted, metadata-only dependency audit found the former operational fixed credential at the main workflow service password and its test database URL. The native legacy concurrency test accepts a supplied local disposable database URL and does not depend on that fixed password. The candidate replaces both settings with a fresh 32-byte cryptographic runtime credential generated inside an isolated container. No real credentials were read or printed for this review.

The runner explicitly enforces SCRAM for both host and local authentication, requires wrong-password rejection with the authentication-failure diagnostic, and requires correct-password acceptance. The password initialization file is private and removed after initialization; command tracing is disabled; inherited database/provider configuration is cleared. Cleanup stops PostgreSQL, verifies the PID is absent and removes the private fixture. The scoped restrictive umask does not alter the unrelated backup permission test environment.

The Dockerfile and runner were compared with the previously reviewed Stage B versions. The runner's only adaptation removes the Stage B-only accounting command and its completion marker, which are absent on main. Main's `npm ci --ignore-scripts`, `npm run check` and `npm test` remain. Windows and backup transport job content is unchanged after newline normalization. Bash syntax validation passed. No source defect or test weakening was identified.

## Independently reviewed evidence

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Candidate identity | PASS | `identity.json`; independently recomputed archive SHA256 `E112EF26430FA49B395A261D717FA3A9A949F3A5C1D408D1ABC4AC50EF38911A` matches the tested candidate archive. |
| Linux build | PASS | `linux-build.log` and exit 0; locked dependencies installed in the pinned build. |
| Linux policy/full suite | PASS | `linux.log`, exit 0; 282/282 passed, 0 failed, 0 skipped; Node 24.22.1, PostgreSQL 17.10, Debian 13 container on WSL2. |
| Native independent-connection concurrency | PASS | Unchanged legacy test actually ran in the full suite (6752.531135 ms); no skipped concurrency assertion. |
| SCRAM acceptance/rejection | PASS | Both explicit wrong-password rejection and correct-password acceptance markers are present. |
| Windows workflow regression | PASS | `windows.log`, exit 0; six syntax checks and 110/110 tests, 0 failed, 0 skipped; Node 24.19.0, Windows 11 build 26300. |
| Docker backup transport regression | PASS, bounded offline portion | `transport.log`, exit 0; 23 success markers, including dump modes, restore ACL/RLS/rollback, 21 negative TLS checks, timeouts, cancellation, sentinel preservation and fixture cleanup. |
| Public provider TLS invocation | NOT RUN in this regression | The disposable transport script replaces only that invocation with `PUBLIC_TLS_OMITTED_OFFLINE_REGRESSION`. It is not evidence of a fresh complete hosted transport job. Historical approved handshake evidence remains separate. |
| Failure-path cleanup | PASS | `failure-probe.log`: injected inner exit 42 preserved, PostgreSQL PID absent, fixture removed; probe exit 0. |
| Container isolation | PASS | `linux-isolation.json`: postgres user, network none, no published port, all capabilities dropped, no-new-privileges, 2 CPUs/4 GiB, auto-remove. |
| Fixture cleanup | PASS | Successful and injected-failure runner logs explicitly establish PID absence and fixture removal. `cleanup.json` separately records policy/probe container and anonymous-volume absence plus task build-root removal; `image-cleanup.log` confirms removal of the reviewed task image. These records were independently inspected. |
| GitGuardian candidate check | PASS | Independently authenticated read of check **120265923077**, name `GitGuardian Security Checks`, exact candidate head, completed `success` at `2026-10-23T05:56:17Z`; retained `gitguardian-candidate.json`. |
| GitHub-hosted required jobs | NOT VERIFIED / blocked | `hosted-blockers.json`: policy, Windows and transport jobs did not start because of a billing/spending block. Their failure status is not a passing execution. |

The backup helper in the disposable transport copy matches the committed source; the transport script matches except for the disclosed public TLS omission. The WSL adapter changes Docker bind-path/environment forwarding only, not transport assertions. Linux isolation, archived source identity, exit files and final test summaries were independently inspected. This QA assesses the recorded executions; it does not claim a second execution of each regression by the reviewer.

## Residual risks and decision boundary

Local runners differ from GitHub-hosted runners: Windows 11 rather than Windows Server 2022, a WSL2 Docker host, and Linux policy execution inside the pinned Debian image. The Node versions are both version 24 but differ by patch/minor level. The workflow itself now intentionally runs its Linux policy tests inside that same container. No skipped policy or Windows tests are hidden; the one omitted provider TLS invocation is explicitly separate.

The scanner success is scoped to PR #103 candidate `2eb9679e6d6468224996fc4a3349033f13d1d443`. It neither changes incident 38407534 nor retroactively clears PR #102 historical checks. This draft has not merged, so main retains its pre-remediation configuration until an authorized merge. Historical findings and prior security evidence must remain preserved. External reuse of the historical credential is not established by this bounded repository review; no global invalidation or rotation claim is made.

No incident status change, ignore/suppression rule, Regression enablement, billing change, branch-protection change, merge, deployment, live provider access or financial activation is authorized by this review. Any future incident disposition requires its separate supported procedure and explicit owner/security approval. Hosted gate acceptance or an exception also remains an owner/governance decision, not an independent QA bypass.

Final local/source assessment: **PASS**. Hosted CI/merge readiness: **NO-GO** until the required hosted checks are satisfied or a separately authorized governance process establishes acceptable evidence without bypassing protections. T19 remains In progress. Accounting activation remains NO-GO.


## Log publication assessment

The independent reviewer inspected all eight raw .log files before publication. Contents are synthetic test names/results, environment/version metadata, public image/build identifiers and cleanup markers. Scans found zero credential-bearing URLs, private-key blocks or provider-token shapes. Historical-value substring matches were ordinary PostgreSQL product/image/user metadata, not password assignments or credential URLs. No generated runtime password or real-service credential was observed. Publication of these bounded evidence logs is supported; this is not a global secret-reuse or exposure certification.

