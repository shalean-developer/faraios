# T19 Stage B closeout independent reassessment

Review ID: QA-T19-STAGE-B-CLOSEOUT-20261022. Exact implementation candidate: `d4643e244f5f9538264a5beec15b03984a437d32`; comparison target: `9102b2a77b9f6981d4e6e6e60cad1398324b4b2d`.

**PASS for the bounded offline, synthetic-only Stage B implementation and the discovery correction. CI/release acceptance and accounting activation remain NO-GO. T19 remains In progress.** No material finding remains in the narrow reviewed change. This does not approve Stage C, a merge, live OAuth, real credentials, provider operations or hosted migrations.

## Independence and scope

A separate QA agent reviewed and executed the checks below without implementing the change. Both agents share AI tooling, host and filesystem; this is independent agent review, not external human assurance. The earlier [Stage B independent QA](../t19-stage-b-independent-qa.md) records the architecture, isolation, replay, generation and audit review and its limits. This reassessment covers the exact subsequent implementation delta and reruns the dedicated acceptance suite. Candidate source remained unchanged during execution; the owner had documentation edits in progress.

The delta contains only the package command update, the 100% identical rename from `scripts/test-t19-postgres.mjs` to `scripts/run-t19-postgres.mjs`, and `test/accounting-runner-discovery.test.js`. Both runner versions have Git blob `b49b79fc24d67d578d6a9df7b7d2861d8947f939`. No accounting SQL, API, worker, provider abstraction or T04 source changed in this delta. `git diff --check` passed.

## Defect and correction

The original controlled full-suite log shows Node default discovery executing the old runner, a recursive node:test warning that nested files were skipped, then `T19_NATIVE_ACCEPTANCE_PASSED`. That marker does not prove native acceptance. The rename removes the opt-in launcher from ordinary discovery. The new regression copies the package-selected runner to a temporary isolated repository, removes inherited test context, supplies a nonexistent PostgreSQL binary directory, and requires zero discovered tests and no native/recursive marker.

QA independently demonstrated that the same regression fails against the baseline package and old runner: default discovery executes the old runner and encounters ENOENT at the deliberately nonexistent initdb binary. This expected negative result proves the regression detects the baseline defect without starting a PostgreSQL cluster. The temporary reproduction repository was removed.

The supported dedicated command remains `node scripts/run-t19-postgres.mjs`. Manually forcing that standalone launcher through `node --test scripts/run-t19-postgres.mjs` is outside this accepted invocation. A marker alone is never accepted as test evidence; the dedicated run below contains all 26 actual test results.

## Independently executed evidence

Runtime: Node 24.19.0, explicit managed runtime binary; PostgreSQL 17.10. Native execution used the reviewed runner's own disposable loopback cluster, synthetic fixtures and teardown. It ran after the owner's serial full suite completed.

| Check | Result | Complete evidence |
| --- | --- | --- |
| Candidate discovery regression, `node --test --test-reporter=tap test/accounting-runner-discovery.test.js` | 1 pass, 0 fail, 0 skip; exit 0 | [output](qa-discovery.tap), [exit](qa-discovery.exit.txt) |
| Same regression against baseline package-selected runner in temporary synthetic repository | Expected 1 failure; exit 1; nonexistent initdb prevented cluster startup | [output](qa-baseline-discovery-repro.tap), [exit](qa-baseline-discovery-repro.exit.txt) |
| Dedicated candidate native suite, `node scripts/run-t19-postgres.mjs` | 26 pass, 0 fail, 0 skip; exit 0 | [output](qa-native.log), [exit](qa-native.exit.txt) |

The dedicated suite exercised embedded and native database/API/worker contracts, broad fake-token routing, foreign-tenant and function ACL denials, forged organisation/context rejection, durable deduplication, stale attempts, uncertain outcomes, revocation, quarantine, generation boundaries, and disconnect races. Native held-lock tests observed claim exclusion and both generation/dispatch orderings. The log records actual native subtests, `T19_NATIVE_ACCEPTANCE_PASSED` and successful `T19_DISPOSABLE_CLUSTER_CLEANED` teardown. No hosted database or real accounting provider was accessed.

## Other closeout evidence inspected, not independently rerun here

- The owner's final candidate serial full-suite log reports 297 tests: 295 pass, 0 fail, 2 skipped, exit 0. QA inspected its totals and confirmed it contains no recursive warning, native acceptance marker or isolated-PostgreSQL marker. The two skips are not native acceptance; the dedicated Stage B result above supplies its own evidence. See [final full suite](final-full-suite.tap).
- The original backup failure was not reproduced in the retained controlled runs. The [diagnostic](backup-diagnostic.tap) passed with `swapped: true` and `DUMP_ROLES_FAILED`. This does not establish the original failure's root cause or prove all backup race scenarios safe.
- The separate unchanged legacy native availability suite failed at line 46 on CRLF versus LF in output; the same failure was retained twice. Later assertions are not verified by that failed run. The legacy suite remains an acceptance gate; no T04 repair or modification was made. See [legacy result](existing-native.tap) and [repeat](existing-native-repro.tap).
- Retained [CI annotations](ci-annotations.json) for exact baseline `9102b2a77b9f6981d4e6e6e60cad1398324b4b2d` say jobs did not start because recent account payments failed or the spending limit requires increase. This is not a code-test failure and is not a green CI run for the new candidate. No billing change was made. New-candidate hosted CI acceptance remains unproven.

## Decision and remaining limits

Local bounded Stage B: **PASS**. Repository-wide acceptance, hosted CI/release and financial activation: **NO-GO** pending their separate gates. The legacy native gate and hosted CI must be resolved without treating passing synthetic Stage B checks as substitutes. D2 remains conditional on Zoho confirmation. Live credential storage/refresh, real organisation ownership and provider behaviour remain outside this offline evidence and require the approved later-stage controls and review. This report neither changes T19 status nor authorises live synchronisation.
