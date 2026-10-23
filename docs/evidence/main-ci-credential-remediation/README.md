# Main CI credential remediation — PR #103

Status: local remediation PASS; hosted CI / merge readiness NO-GO. T19 remains In progress and accounting activation NO-GO.

## Exact scope

Base: `651490e8b1e2ecd1815598d3aad7f1ebacaa3353` (verified origin/main).
Tested source candidate: `2eb9679e6d6468224996fc4a3349033f13d1d443`.
Draft PR: https://github.com/shalean-developer/faraios/pull/103
Evidence-only descendants retain that implementation. No application, T04, database migration, package manifest, lockfile or test assertion changes. `application-identity.diff` is empty. Main has no Stage B accounting-test command; it was not imported.

Before: ci.yml supplied one fixed disposable password to the PostgreSQL service and the native concurrency test URL. Those were its two operational dependencies. Tests accept an arbitrary password with loopback host and the required synthetic database name.
After: a nonroot disposable container generates 32 random bytes at runtime. A private 0600 password file initializes PostgreSQL with SCRAM for host and local authentication and is immediately removed. The generated connection URL exists only in the child process environment. Inherited database/provider configuration is cleared and shell tracing is disabled. Explicit probes prove wrong-password rejection and correct-password acceptance. Cleanup stops the server, verifies its PID is absent, removes the private fixture directory and preserves a failing command's exit status.

Source files: `.github/workflows/ci.yml`, `scripts/ci-policy.Dockerfile`, `scripts/run-ci-policy.sh`, `scripts/.gitattributes`. The policy job builds from a clean Git archive using pinned Node 24 / PostgreSQL 17 images, then runs without network, published ports, capabilities or privilege escalation. CPU and memory are bounded. Its timeout becomes ten minutes. Existing `npm ci --ignore-scripts`, `npm run check` and `npm test` commands remain. Windows and backup-transport jobs are unchanged.

## Regression evidence

| Check | Result | Evidence |
|---|---|---|
| Clean candidate image build | PASS, exit 0 | linux-build.log |
| Linux Node 24.22.1 / PostgreSQL 17.10, syntax and full suite | PASS, 282/282, zero skipped/cancelled/failed | linux.log; linux.exit.txt |
| Unchanged native PostgreSQL concurrency assertions | PASS, real PostgreSQL execution within full suite | linux.log |
| Windows Node 24.19.0, workflow syntax and seven-file test group | PASS, 110/110, zero skipped/failed | windows.log; windows-environment.json |
| Wrong-password rejection and correct-password acceptance | PASS | linux.log; failure-probe.log |
| Failure cleanup and original exit preservation | PASS: injected exit 42 preserved; server stopped and fixture removed | failure-probe.log |
| Disposable backup transport, PostgreSQL 17.11 | PASS, exit 0; 21 TLS rejection cases plus timeout/cancel/sentinel/cleanup assertions | transport.log |
| Task container, anonymous volume, image tag and build directory cleanup | PASS | cleanup.json; image-cleanup.log |
| Independent security/source/evidence review | See independent-review.md | independent-review.md |
| GitGuardian candidate check 120265923077 | SUCCESS on exact source candidate, 2026-10-23T05:56:17Z | gitguardian-candidate.json |
| GitHub Actions policy, Windows and transport | NOT RUN: billing/spending infrastructure block | hosted-blockers.json |

No tests were skipped in either Node test group. The public provider TLS handshake was deliberately omitted from this additional offline transport run; the disposable copy changes only that invocation. All local transport assertions and the backup helper remain unchanged. This is not a claim that the entire networked hosted transport workflow ran. The existing historical provider TLS evidence remains preserved on PR #102. No new provider access was performed.

Local Linux ran through Docker Desktop; transport ran through Ubuntu 26.04 WSL with a reviewed Windows Docker adapter. These differ from GitHub-hosted Ubuntu. Node patch levels are recorded rather than implied identical. Image build requires registry/npm access; test execution itself has no network. Windows evidence includes its exact runner and environment. Logs retain original bytes under `* -text`; SHA256SUMS covers evidence files except itself. Credentials are neither recorded in logs nor baked into the image.

## Security and remaining decisions

The observed GitGuardian success is specific to PR #103's source candidate. It does not resolve incident 38407534, approve PR #102 or prove non-reuse outside inspected sources. No incident state, Regression setting, ignore rule, scanning control, billing or branch protection was changed. Historical findings and all prior reports remain on [PR #102](https://github.com/shalean-developer/faraios/pull/102), including its evidence at `a028fe62a2a38cb537b5f35b43a38c29b681c72f`; historical failures have not been rewritten.

Main remains unchanged until a separately authorized merge; this draft PR is only the remediation proposal. Other affected branches (including PR #102's base) need their own governed disposition. Confirm teardown/invalidation of any matching historical fixtures, reassess the complete authenticated occurrence inventory and external reuse uncertainty, and obtain explicit owner/security approval before any incident disposition. The prior proposal to ignore the incident remains rejected. Any supported Resolved procedure must address future same-secret alert behavior and the workspace-wide Regression setting; neither is authorized here. Observe actual checks after any separately authorized disposition rather than assuming success.

Hosted jobs that never started are not passes. Required hosted checks or an explicit bounded owner-approved no-spend governance exception remain prerequisites to merge readiness; this task applies no exception and merges nothing. Production, live OAuth, financial writes and accounting activation remain prohibited.
