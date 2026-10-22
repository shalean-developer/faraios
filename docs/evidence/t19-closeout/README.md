# T19 Stage B closeout — 22 October 2026

Initial target: `9102b2a77b9f6981d4e6e6e60cad1398324b4b2d`, draft [PR #102](https://github.com/shalean-developer/faraios/pull/102). Closeout fix candidate: `d4643e244f5f9538264a5beec15b03984a437d32`. The accounting implementation, existing test assertions, workflow configuration and T04 are unchanged. A reproduced Stage B test-discovery defect justified the small runner rename, package-command correction and new executable regression described below; independent reassessment is required for this change.

## Investigation

`original-full-suite.log` preserves the original complete output: 297 tests, 294 passed, one failed, two skipped. The failed unchanged test is `key boundary replacement stops before encryption and public key permissions fail retrieval` at `test/staging-backup.test.js:210`. Its error is ENOENT when reading the synthetic `moved-keys` directory, after 356744 ms. Both backup source and test match their last modifying commit `36f84f99ceb28f530d715d60fe523dba7728eb26`.

The attack fixture sets `swapped=true`, renames the disposable key directory, and replaces it with a junction on the first mocked non-metadata Docker run. Before that point, capture performs directory/ACL, certificate, mocked Docker and metadata preflights. The test's first `assert.rejects` accepts any error. Consequently an earlier failure or a failed rename can satisfy that assertion and leave no moved directory. The recorded ENOENT is a secondary failure; the original rejected exception was not retained. Windows ACL subprocesses have 60000 ms deadlines, but neither a timeout nor a particular ACL failure is established by this log.

Classification: **unreproduced original failure, root cause unknown**. Host load/resource contention is a hypothesis, not a confirmed environmental diagnosis. The missing directory does not demonstrate unsafe key retrieval or an accounting source defect. No speculative timeout increase, retry, security relaxation or production fix is justified.

The controlled full run passed the original test in 26680 ms; the full rerun after the discovery fix passed it again in 30161 ms. The supplemental diagnostic passed in 25980 ms and recorded `swapped=true`, `code=DUMP_ROLES_FAILED`, confirming that this run reached the intended attack and rejected it before encryption. It also completed the original unsafe-key-permissions retrieval assertion. These results cannot recover the discarded exception from the prior failed run or prove that it was environmental.

`diagnose-backup.mjs` imports an instrumented copy of the existing test from memory, adds only the fixed error code and swap flag to the captured rejection, and preserves its assertions. It does not edit the original source or call a real backup/provider. This diagnostic is supplemental evidence, not a replacement regression test.

### Reproduced Stage B runner defect and bounded fix

The first lines of `controlled-full-suite.tap` show that default Node discovery executes `scripts/test-t19-postgres.mjs` as a test file. Its nested Node test invocation inherits test-runner context and emits “node:test run() is being called recursively within a test file. skipping running files.” Despite this, the wrapper prints `T19_NATIVE_ACCEPTANCE_PASSED`. That discovery-mode marker is not native acceptance evidence. The explicitly invoked standalone native suites really executed 26 tests and remain valid.

Fix `d4643e2` renames the byte-identical runner to `scripts/run-t19-postgres.mjs`, outside default test-file naming, and updates `test:accounting:postgres`. No SQL, worker, credential, provider or backup logic changed. `test/accounting-runner-discovery.test.js` copies the actual package-selected runner into a disposable scripts directory and invokes real Node discovery. It asserts zero discovered tests and no native PASS marker. PostgreSQL is deliberately unavailable to this fixture, so a naming regression fails without starting a real cluster. This is behavioural regression coverage, not a test that merely asserts a filename string. Targeted regression passed 1/1; independent QA demonstrated the same regression fails against the old runner and passes against the fix. The final full suite also passed it and contains no recursive warning or native PASS marker. Invoke native acceptance using `npm run test:accounting:postgres`, not by forcing the launcher through `node --test`; require actual 26-test output and cleanup, never a marker alone.

## Controlled execution

Windows, Node 24.19.0, existing pinned dependencies; no install or dependency update. Absolute Node binary: `C:/Users/info/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. PostgreSQL binaries: `C:/Program Files/PostgreSQL/17/bin`, version 17.10. Commands run from the PR worktree. Full-suite execution uses `node --test --test-concurrency=1 --test-reporter=tap` to avoid simultaneous file workloads; it does not serialise concurrency explicitly exercised within native tests. The shell removes inherited PG*, DATABASE_URL, FARAIOS_*, SUPABASE_*, T16/T19 test URLs and NODE_OPTIONS before invoking Node. No environment values or real credentials are recorded.

Complete stdout/stderr and exit records are retained beside this report. Test-created synthetic backup/key directories are disposable fixtures, not real credentials. Original failure output remains intact rather than being overwritten by a successful rerun. The final manifest records SHA-256 of evidence files, the tested commit and tree.

## Skip accounting

Exactly two source-level conditional native tests exist:

1. `test/accounting-stage-b.test.js`: native Stage B contracts, skipped without `T19_TEST_DATABASE_URL`. The standalone `scripts/run-t19-postgres.mjs` (formerly `test-t19-postgres.mjs`) runs them against its own new isolated cluster.
2. `test/availability-concurrency.test.js`: independent-connection test, skipped without `T16_TEST_DATABASE_URL`. It includes existing T16–T19 and T04 regression coverage; running it does not modify T04. `run-existing-native.mjs` is an evidence-only Windows adaptation of the existing disposable runner: changes the test/database selector, adds the PostgreSQL binary directory to PATH, and uses TAP output. It creates its own empty cluster, removes inherited connection configuration, and stops/removes only its validated random fixture directory.

No skip is treated as a pass. Supplemental executions are reported separately from full-suite totals.

## Results and remaining gates

| Evidence | Result on exact target implementation |
|---|---|
| `controlled-full-suite.tap` / exit record | **297 tests, 295 pass, 0 fail, 2 skips**, exit 0, 355696 ms; complete serial file discovery |
| `backup-diagnostic.tap` / exit record | **1/1 PASS**, exit 0; supplemental instrumented test, not an unchanged-source full-run replacement |
| `stage-b-native.log` / exit record | **26/26 PASS, zero skips**, exit 0; native/PGlite contracts, held-lock races and synthetic vault; cleanup confirmed |
| `existing-native.tap` / exit record | **1 test failed, zero skips**, exit 1; Windows CRLF/LF assertion mismatch at availability test line 46; cleanup confirmed |
| `existing-native-repro.tap` / exit record | Same assertion reproduced in a second fresh cluster, exit 1; cleanup confirmed |
| `syntax.log` / exit record | `npm run check` **PASS**, exit 0 on Node 24; whitespace check PASS |
| Existing independent QA | 26/26 plus five probes applies to accounting implementation; the new runner change receives separate reassessment |
| GitHub CI | Jobs blocked before execution on target SHA; not passed |

Final candidate `d4643e244f5f9538264a5beec15b03984a437d32`:

| Evidence | Result |
|---|---|
| `final-full-suite.tap` / exit record | **297 tests, 295 pass, 0 fail, 2 skips**, exit 0, 404481 ms; former backup failure passes; no misleading nested-runner marker |
| `discovery-regression.tap`, `qa-discovery.tap` | Implementer and independent reviewer each **1/1 PASS** |
| `qa-baseline-discovery-repro.tap` / exit record | **1/1 fails as expected** against the baseline runner; demonstrates the regression would catch the original defect, without starting PostgreSQL |
| `final-syntax.log` / exit record | Repository syntax **PASS**, exit 0 |
| `qa-native.log` / exit record | Independent dedicated native acceptance on exact `d4643e2`: **26/26 PASS, zero failures/skips**, exit 0, PostgreSQL 17.10; actual native subtests/held-lock races and cleanup observed |

The full-suite count remains 297 because the new discovery regression replaces the old accidentally discovered launcher in the file count. It does not imply that the two native skips disappeared.

The supplemental native failure is a **confirmed Windows test-output portability defect**: actual `assigned:3\r\nconfirmed:2` versus expected `assigned:3\nconfirmed:2`. The test's shared SQL helper trims output but does not normalise CRLF. This is distinct from the unknown backup-run cause and is not evidence of an isolation/transaction defect. The native fixture is configured under Ubuntu in the existing workflow. Its later assertions did not run on this Windows attempt; neither that complete test nor its T04 coverage is claimed passed. No shared legacy/T04 test or source was changed. Closing this remaining gate needs execution in the intended Linux environment, or separately scoped review of the shared test-harness portability correction and a full native rerun. The narrower Stage B runner passed on the same native PostgreSQL version.

**PASS: bounded offline Stage B implementation and targeted acceptance; controlled full suite has no failures among its enabled tests. NO-GO: complete Stage B acceptance/merge readiness**, pending the legacy native gate and CI execution or explicit approval of an alternative acceptance policy. The original backup failure is not reproducible in this closeout; its full output and uncertainty remain recorded. Do not describe all repository/native checks as green.

The small runner change triggered [independent reassessment](independent-reassessment.md): reviewer-observed regression failure against baseline, regression pass against the fix, and dedicated native 26/26 pass on exact `d4643e2`. The reviewer shares the same AI tooling and host, not external human assurance. Subsequent evidence-only commit hashes identify this closeout; the initial tested SHA/tree are recorded in `run-context.json`, and the fixed-candidate evidence in `final-run-context.json`. Any later source change requires renewed affected tests and independent reassessment.

## No-spend CI proposal — not applied

Saved `ci-run.json` and `ci-annotations.json` identify [run 39851662895](https://github.com/shalean-developer/faraios/actions/runs/39851662895), head `9102b2a77b9f6981d4e6e6e60cad1398324b4b2d`. GitHub states jobs did not start because recent account payments failed or the spending limit needs attention. This is a gate execution blocker, not a source failure or passing CI result. No settings, billing, workflow triggers, required checks, branch protections or check statuses were changed.

Proposed bounded decision for the owner/reviewer: accept the exact-SHA local full-suite, separate native runs, syntax checks and existing independent QA as an **offline Stage B development milestone only**, while retaining draft status and the blocked CI/merge gate. This costs no additional hosted execution and makes no green-check claim. Approval of this substitution has **not** been granted; this document is the concrete proposal for review, not a request to bypass checks.

Before any future merge, either run the existing required checks when no-spend CI availability is restored, or obtain a separately reviewed, explicit alternative-check policy. A possible later alternative is an already available isolated local Linux/Windows environment with exact-SHA logs and independent verification. No self-hosted runner is registered here; attaching this credential-bearing workstation to arbitrary PR jobs is not part of this proposal. Any substitute must account for all three jobs, rather than relabel local policy tests as complete workflow equivalence.

The `backup-transport` job is not covered by `node --test`: it requires Docker fixtures and includes a public provider TLS handshake. It is deliberately not executed during this offline closeout. Linux portability, Docker transport/restore integration and GitHub job execution therefore remain explicit gates. No exemption is silently granted for them.

T19 tracker row 20 was read again on 22 October: **In progress**, acceptance “Business totals reconcile; failures visible”. No tracker edits. D2 provider clarification and all live OAuth, production vault/session/RLS, real accounting reconciliation and Stage C approval gates remain outside this closeout. Accounting activation remains **NO-GO**.
