# T19 final native Linux verification

**PASS for the unchanged legacy native PostgreSQL concurrency test.** Executed 22 October 2026, 21:26:31–21:26:45 UTC. This closes the native Linux verification gap recorded in the Stage B closeout. It does not approve a merge, production, financial activation or a substitute for required CI.

Implementation candidate: `d4643e244f5f9538264a5beec15b03984a437d32`; tree `ac722e0b5382632326ec982d723de9b17356f15e`. Starting evidence commit: `7a083f1f707f78634752abf50459b3f39443d6c9`. Draft [PR #102](https://github.com/shalean-developer/faraios/pull/102). No implementation or existing test source changed in this verification, so the conditional independent source-reassessment requirement was not triggered. This run was executed by the implementation agent; it is not represented as a new independent execution. Earlier independent Stage B reassessment remains separately recorded.

## Exact test and environment

- Command: `node --test --test-reporter=tap test/availability-concurrency.test.js`.
- Node **24.22.1**, PostgreSQL server and psql **17.10**.
- Linux x86_64, Debian **13.5** container on the local Docker Desktop WSL2 Linux kernel. This is a Linux verification, not a claim of an Ubuntu-specific run. Installed Ubuntu was inspected but had Node 22/PostgreSQL 18 and was not used for acceptance.
- Official public runtime images pinned by digest in [Dockerfile](Dockerfile); [image identities](image-identities.txt), [build output](build.log) and [runtime output](run.log) retained. No npm install or dependency update was required; this existing native test uses Node built-ins and psql.
- Exact `git archive` candidate tar SHA-256: `e1a6c2f6cedf1beb0794ef775cf9569738b22996bdece1631682364fbb02056a`.
- Unchanged test Git blob: `4f75d7a99ee3c30d37bb7079fd49fc4fdbfa1b86`. Test SHA-256 both inside the source archive and inside the running container: `af15d26228b149ad6aaa77c6bb10fb0e9325afc9e1027cc1510f30de55b29f2e`.
- Candidate archive contains tracked files only, without Git metadata, local configuration, environment files outside Git or node_modules. The image adds only the public Node binary and an external verification harness; no assertion, SQL migration or T04 implementation is rewritten.

The container runs as `postgres` UID 999 with all Linux capabilities dropped, `no-new-privileges`, no network access, no published ports and no host bind mounts. [Container isolation](container-isolation.json) records these settings. The runtime receives no host application credentials. A fresh PostgreSQL cluster is created in an owned `/tmp/faraios-t19-linux-*` tmpfs directory, listens only on container loopback and creates only `faraios_t16_test`. Initial application-table count was zero. Local trust applies solely inside this disposable network-isolated fixture.

## Result and coverage

[Complete run](run.log): **1 test, 1 pass, 0 fail, 0 skipped**, Node test process duration 6054 ms. The one top-level test sequentially executes all its assertions; this is not nine separately reported tests. [Harness exit](exit-code.txt): **0**. [Container state](container-state.json): exited 0, not OOM-killed. The full PostgreSQL [server log](postgres.log) is retained; expected losing-transaction errors are asserted security/concurrency outcomes, not test failures.

| Existing assertion group | Result | What the unchanged test verifies |
|---|---|---|
| Shared-cleaner reservation across businesses | PASS | Separate psql connections; contender observed waiting on a real PostgreSQL lock; loser rejected with 23P01 and sanitised conflict message; one reservation, losing booking unchanged |
| Recurring generation | PASS | Retry waits on schedule row, creates zero duplicates; occurrence dates unique and source booking unchanged |
| Accepted-quote conversion | PASS | Competing conversion waits and returns the same saved booking identity |
| Contact/quote consistency | PASS | Quote read waits for concurrent contact update and uses the committed contact value |
| Invoice preparation | PASS | Concurrent preparation returns the one persisted invoice for the booking |
| Accounting work claim | PASS | One active claim wins, stale contender receives 40001, version changes only once |
| T04 cross-business daily workload | PASS | Non-overlapping jobs still serialize daily capacity; both read committed and repeatable read contenders wait; rejected loser stays confirmed with no extra reservation |
| T04 scheduled supervisor allowance | PASS | Concurrent owner saves serialize by business/staff; stale save receives 40001; one scheduled revision retains the winning amount |
| Monthly settlement freeze, approval, transfer, payout deduplication | NOT VERIFIED | These assertions are not in this exact candidate's legacy native test. Workload/allowance checks are not represented as settlement execution assurance |

Nine real lock-wait observations are required by the existing assertions, using independent processes and `pg_stat_activity.wait_event_type='Lock'` before releasing the winner. All completed. No provider request, payment or real accounting write occurred; invoice/claim statements affect only synthetic local database fixtures.

## Cleanup and historical evidence

The harness trap stopped its own PostgreSQL server, verified the PID file absent and removed its exact checked temporary data directory. Logs include `POSTGRES_PID_ABSENT`, `DISPOSABLE_DATABASE_DIRECTORY_REMOVED` and `HARNESS_EXIT=0`. PostgreSQL logs confirm shutdown. Logs were copied out after the container exited, then only the labelled task-owned container, custom image tag and validated temporary build directory were removed. The base image also created an unused anonymous volume at 21:26:30 UTC immediately before this container started; PostgreSQL data was in tmpfs, not that volume. Its [metadata](anonymous-volume.json) was checked against the creation time and absence of container references, then that exact volume alone was removed. [Cleanup record](cleanup.txt) confirms container and volume absence. No shared Docker prune, other container stop, production service action or global package change was performed; public base-image cache is retained.

The Windows CRLF/LF failures remain intact in [first attempt](../t19-closeout/existing-native.tap) and [repeat](../t19-closeout/existing-native-repro.tap). Linux passed the unchanged assertions with native LF output. This supports the already identified Windows test-output portability diagnosis; it does not retroactively turn either Windows run into a pass. The earlier unrelated backup failure also remains historically recorded with unknown cause.

To reproduce, create a fresh build context; run `git archive --format=tar --output=<context>/candidate.tar d4643e244f5f9538264a5beec15b03984a437d32`; copy this Dockerfile and run.sh into it; build from the pinned public images with `--network none`; run a uniquely named container with `--network none --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:rw,nosuid,nodev,size=256m`. Preserve `/evidence` from the stopped container before removing only the verified owned resources; use `docker rm -v <owned-container>` to remove its anonymous base-image volume as well. The harness is evidence tooling, not an application entry point.

## Stage B gate ledger

| Gate | Status | Evidence / limitation |
|---|---|---|
| Exact candidate, unchanged legacy assertions | PASS | Archive/test hashes and runtime evidence above |
| Legacy native Linux concurrency | PASS | This run, 1/1, zero skips; remaining native gap closed |
| Applicable T04 workload/allowance safeguards | PASS | Existing assertions above, no T04 source changes |
| T04 monthly settlement execution safeguards | NOT VERIFIED | Outside this test's coverage; no T04 branch imported or altered |
| Stage B native API/RLS/worker acceptance | PASS | Prior independent 26/26 on exact d4643e2: [QA](../t19-closeout/independent-reassessment.md) |
| Full controlled Node 24 suite | PASS | Prior 295 pass/0 fail/2 explicitly skipped; those two native groups now have separate successful runs, not a retroactive zero-skip full run |
| Runner-discovery regression and independent reassessment | PASS | Prior before/after regression and exact-candidate independent review |
| Cleanup and complete evidence | PASS | Run/server logs, container state, cleanup record and checksum manifest |
| Windows legacy native attempt | FAIL — historical | CRLF assertion mismatch, preserved unchanged; not a remaining Linux blocker |
| Original broad-run backup attempt | FAIL — historical | Subsequent controlled runs pass; original root cause unknown |
| GitHub required CI | NOT VERIFIED | Previously blocked before execution by account payment/spending availability; no billing/settings changes or CI success asserted |
| Backup-transport Docker/provider-TLS workflow | NOT VERIFIED | Not part of this test; no public provider probe run |
| Ubuntu-specific or full Linux repository suite | NOT VERIFIED | This run covers the exact native test on Debian Linux only |
| Approval of no-spend alternative CI policy | NOT VERIFIED | Earlier proposal remains unapproved; no check bypass applied |
| D2 / real Zoho organisation and OAuth behaviour | NOT VERIFIED | Zoho support confirmation and approved later provider verification remain open |
| Production credentials, hosted JWT/RLS and live reconciliation | NOT VERIFIED | Outside offline Stage B; no activation or deployment |

**Native Linux assessment: PASS. Bounded local Stage B acceptance: PASS. Complete CI-backed acceptance, merge readiness and accounting activation: NO-GO.** T19 remains In progress. The legacy native verification gap is closed; required CI/alternative-policy approval and later-stage provider/production gates remain distinct.
