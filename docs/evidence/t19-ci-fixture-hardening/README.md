# T19 final synthetic CI credential hardening

Source candidate: **90dbc74933357b9e9ca257c08c9616b1b3ade96e**, parent 8a4aed07dd5429c3cef8963a6975efd8329e78c4. Application implementation remains d4643e244f5f9538264a5beec15b03984a437d32. This is CI/test-infrastructure hardening only. T19 stays In progress; PR #102 Draft; accounting activation NO-GO.

## Confirmed scope and decision

The actual CI workflow had two operational references to the fixed synthetic credential: service initialization and the native test connection URL. The native test accepts an arbitrary credential and requires the loopback host and dedicated synthetic database. Independent tracked-source review found no other matching operational credential setting in the reviewed workflow/scripts/application/tests. Outside-repository reuse remains unverified; historical evidence is intentionally retained.

GitHub service initialization precedes job steps, so a password generated in a step cannot populate the existing service environment. The bounded replacement uses the already verified T19 Node 24 / PostgreSQL 17 image digests and native fixture pattern. The workflow builds from git archive HEAD, excluding ignored local credentials, node_modules and .git, and runs the exact entrypoint in a non-root container with network none, no published ports, dropped capabilities and no-new-privileges. No host Docker socket or production filesystem is mounted.

The runner generates 32 random bytes per invocation, writes a private 0600 initialization file, requires SCRAM for local and host connections, deletes the password file immediately after initialization, and keeps the generated URL only in the test process environment. It clears inherited database/provider settings, does not enable shell tracing, verifies actual wrong-password authentication rejection followed by correct-password acceptance, and preserves npm check, the full test suite and dedicated T19 native acceptance. All legacy assertions, T04 sources, production scripts and accounting implementation are unchanged. The workflow timeout increases from five to ten minutes to include image build and tests; hosted timing remains unverified.

The separate reviewer identified a PostgreSQL image-digest transcription error; the implementation agent corrected it before the candidate was committed or tested. No speculative application fix was made. The four committed paths are .github/workflows/ci.yml, scripts/.gitattributes, scripts/ci-policy.Dockerfile and scripts/run-ci-policy.sh.

## Exact-candidate verification

| Verification | Result |
|---|---|
| Clean archive and image build / locked install | PASS; archive SHA256 in identity.json; pinned images; exit 0 |
| Linux Node 24.22.1 / PostgreSQL 17.10 syntax and full suite | PASS: 297 tests, 296 passed, 0 failed, 1 skipped; exit 0 |
| Skipped full-suite group | Dedicated T19 native group; separately executed below. Legacy independent-connection concurrency was NOT skipped |
| Dedicated native PostgreSQL security suite | PASS: 26/26, no skips, exit 0 |
| Authentication boundaries | PASS: wrong password rejected specifically for authentication, generated password accepted |
| Forced failure after database startup | PASS: injected npm exit 42 preserved; PID absent and fixture removed; probe exit 0 |
| Windows Node 24.19.0 exact workflow group | PASS: six syntax checks, 110/110 tests, no skips; exit 0 |
| Initial offline Docker transport attempt | FAIL: expected RESTORE_CATALOG_MISMATCH, received CLIENT_CONTAINER_START_FAILED; cleanup passed; log preserved |
| Diagnostic offline transport attempt | PASS with observational instrumentation; not used as the final unchanged-helper regression |
| Final restored-helper offline transport attempt | PASS: all 23 markers, including 21 TLS-negative clients, timeout/cancel cleanup and unrelated sentinel preservation; exit 0 |
| Candidate GitGuardian | FAIL: check 120251972922, SHA 90dbc74933357b9e9ca257c08c9616b1b3ade96e, completed 2026-10-23T05:08:23Z |
| Hosted Actions | Blocked by billing/spending annotations; not credited as executed tests |

Linux full-suite duration 158831.206304 ms; dedicated native 11245.966436 ms; Windows 115911.5112 ms. Native cleanup logs, container/volume absence and the failure-path probe are preserved. The workflow-equivalent Linux container is Debian from the pinned PostgreSQL base; Ubuntu is the Docker host in GitHub. Local Docker Desktop/WSL differs from hosted Ubuntu orchestration. No successful hosted result is claimed.

Transport uses the existing reviewed WSL-to-Windows Docker adapter, Node 24.22.1 and the workflow-pinned PostgreSQL 17.11 image. Only the public TLS invocation is omitted in the disposable script, with an explicit marker. The earlier approved provider handshake remains historical evidence; this run makes no public provider handshake. All synthetic assertions are unchanged. The first failure occurred at the child-start marker classification boundary; its actual root cause was not established and it did not reproduce in diagnostics. It is neither a confirmed application defect nor a proven environmental defect. No speculative source change was made. diagnostic-method.txt records the limited boolean instrumentation and its marker-pattern limitation; transport-restoration.json proves the backup helper was restored byte-for-byte before the final repeat.

## Security gate and owner decision

**GitGuardian security gate NO-GO.** The actual candidate check is failure, not inferred success. Its output references incident 38407534 and the original 03f7ed0 policy.sh/audited-ci.yml findings. Only allowlisted scanner metadata is persisted to avoid re-emitting credential values. Current source hardening cannot erase retained historical findings. The incident was not dismissed or changed; scanning and branch controls were not weakened. Future inventory may include removal-side occurrences from this change and must be rechecked before any disposition.

Owner/security disposition remains necessary. The six-occurrence investigation established synthetic source contexts but did not prove global non-reuse. Any later approval must consider the complete then-current occurrence inventory and the future same-incident alert suppression caused by Ignored / Test credential. The old conditional approval was not applied. A genuine successful check must be observed before declaring the security gate resolved. Hosted CI/governance and merge gates remain separate NO-GO conditions.

## Evidence continuity

The prior authenticated preflight, approval comment 6357574288 and six-occurrence investigation are preserved unchanged in sibling folders t19-authenticated-preflight and t19-expanded-incident. Both existing manifests were verified before inclusion in this evidence commit. Earlier independent QA, Linux verification, original Windows CRLF failure, backup permissions investigation and historical transport failures remain intact.

All new logs, exact exits, environment records, archive hash, isolation/cleanup metadata, independent review and scanner metadata are listed in SHA256SUMS.txt. No real credentials, incident dismissal, credential rotation, Git history rewrite, GitHub billing change, merge, production deployment, T04 change or accounting activation is included.

## Final local acceptance

**PASS for bounded synthetic CI credential hardening and local regressions. GitGuardian / hosted CI / PR merge readiness remain NO-GO.** The restored-helper final transport run passed all 23 success markers. The initial transport failure remains an unexplained, non-reproduced failure; it was not rewritten as a pass or used to justify source changes. Independent QA is recorded in independent-review.md. Owner/security disposition remains necessary; no exception is applied.
