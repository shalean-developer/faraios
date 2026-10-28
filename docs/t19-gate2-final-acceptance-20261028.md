# T19 Gate 2 final source review, execution readiness and Gate 3 handoff

28 October 2026 · Engineering review, not independent security approval · Existing PR #209 only.

**Gate 2: NO-GO. Gate 3 A12: BLOCKED. Full T19: In progress. T20: Not started.**

## Verified revision and authority

The supplied handoff was checked against GitHub rather than assumed current. On entry, PR209 was open/draft at `8b333d3d83b3cde7b0225ff2d5aaca59e72748ac`, base `6413058b75593addc2e028eca04db622205a0c1e`. GitGuardian check122731039878 was successful; Foundation had no current-head run; requested reviewers/teams and submitted reviews were empty. Issue140 remains open with no recorded assignee. Its77 comments and current canonical decisions were read; the issue's original absent-schema narrative is historical, not a reason to undo the completed inactive installation.

Consolidated source corrections are now frozen at **`ce37300933e2ed1e7864b8e992001dd24375e4b3`**, source tree **`2ba545df921ba1cb3b535ab64a6d2b7394700ffa`**. Local tested commit `b3b9f5f4eff45480074c4d2e4efd815348153ede` has that identical tree. Publication through GitHub changed commit metadata only. GitGuardian check **122742120089 SUCCESS** is bound to this corrected source. This report is a documentation/evidence-only descendant; its own PR head is distinct from the frozen implementation identity.

Sources re-read: AGENTS.md; docs/blueprint.md; canonical [Build Plan](https://docs.google.com/spreadsheets/d/1v6o8ZLMUdqze-5WICBUp5ebLmZPObSkrgBUAxXg79PI/edit) T19/T20 rows, Decisions D13–D15 and populated T19 Evidence; [Issue140](https://github.com/shalean-developer/faraios/issues/140); all PR209 comments/review records; the complete existing integrated review packet and acceptance report; current execution module, gateway, SQL fixture, tests and full Foundation entry scripts.

The owner authorized this read-only review, related source corrections, affected regression tests and reviewer handoff. No Docker create/start/stop/remove/prune, native PostgreSQL acceptance, host/trust installation, paid resource, hosted DDL/DML, credential publication, OAuth, accounting worker or financial write was authorized or performed. PR209 was not merged or marked ready. Previous solo-maintainer exceptions were not reused. Canonical task status/history was not edited.

## Consolidated corrections

| Finding at entry | Actual cause | Correction in this source | Evidence and remaining boundary |
|---|---|---|---|
| Clean disposable Linux host rejected | Baseline length13 was hard-coded | V3 signs baselineCount together with exact inventory digest; only0 or13 is permitted | Empty-host and13-container simulations pass; unsigned/mismatched/other counts deny. All original isolation limits are unchanged |
| Same approval not explicitly host-bound | Receipt bound only local context/binary/inventory | V3 additionally signs kernel boot-ID digest and Docker daemon-ID digest; real entrypoint reads boot identity itself; daemon identity rechecked before every mutation | Wrong boot, wrong daemon and swap-after-create deny. This does not attest WSL/VM ownership or solve privileged live-snapshot rollback |
| Failure output lost | Bounded process rejected with only static error; lifecycle retained sparse success logs | Exclusive durable per-command intent/result/error records, bounded stdout/stderr/exit/signal/termination evidence; preflight transcript and safe owned failure logs | Real harmless-child nonzero/timeout tests, persistent command records and result-journal failure fault pass. No Docker command was run |
| False-positive permission marker possible | SET ROLE and denied SELECT shared the same42501 handler | Role assumption is outside the handler; current role asserted; successful permitted write/read marker added | Embedded PostgreSQL/WASM executes the transaction and proves inability to assume role fails without42501 success marker. Native psql remains unexecuted |
| Marker substrings accepted | Parser used includes rather than complete marker lines | Require each expected complete notice/result marker exactly once | Prefix and duplicate-marker outputs quarantine |
| Pre-existing ID not explicitly excluded | Ownership relied on returned ID plus nonce/image/name | Reject returned baseline ID before binding/inspect/start; recovery will not inspect/adopt baseline candidates | Pre-existing-ID substitution test passes; no existing-container mutation is invoked |

The new receipt is **version3**, scope `t19-local-disposable-start-readiness-synthetic-sql-stop-remove-v3`. V2 approval envelopes cannot unlock this implementation. V1/PowerShell remain blocked; the legacy caller-forgeable native adapter remains retired. No signing/approval key was provisioned; test keys are generated ephemeral fixtures only.

## Stage A — single technical review matrix

All rows refer to implementation `ce37300933e2ed1e7864b8e992001dd24375e4b3`. PASS here means the stated source/isolated test condition, not independent approval or live security enforcement. Runtime uncertainty is stated separately and cannot be averaged away.

| # | Required check | Decision | Exact evidence / limit |
|---|---|---|---|
|1 | Final integrated entrypoint | PASS | gate2Execute routes v3 to executeGate2; real path ignores injected trust/runner/SQL dependencies; gateway denial regression |
|2 | Exact code, Node, SQL, Docker executable hashes | UNVERIFIED for target | Repository SHA-256 manifest covers module/gateway/SQL/tests/CI scripts. Local Node24.22.1 binary hash measured, but no selected target Node/Docker binary exists here |
|3 | Independent Ed25519 owner/reviewer signatures | UNVERIFIED operationally | Detached Ed25519 verification, same-key denial and exact scope tested. No attributable owner/reviewer operational key custody or signed run exists |
|4 | Trust registry/signing-key custody | UNVERIFIED | Fixed root-owned registry/bundle/binary paths and private ledger checks exist; target registry absent; private-key custody is external |
|5 | Durable single-use nonce | UNVERIFIED on target | Real wx/fsync/concurrent/restart/partial-record denial passes locally. Target filesystem/power-loss/restore/snapshot/clock controls unaccepted |
|6 | No caller-forgeable permission | PASS | Forged flags and v3 dependency injection cannot reach process runner; externally installed registry and both signatures required |
|7 | Time-bounded Docker operations | PASS for source process contract | Deadline/output cap/kill-close/uncertainty handling tested with a harmless real Node child; Docker daemon cancellation is not claimed |
|8 | Pinned PostgreSQL image/runtime policy | UNVERIFIED at runtime | Pinned image config ID and fixed argv/readback present. Registry authenticity, actual cached image, vendor startup, UID100:101 and resource compatibility not executed |
|9 | Immutable container ID/run ownership | PASS for source | Durable nonce+receipt digest+ID, image/name/label/readback checks and explicit baseline-ID exclusion tested |
|10 | Interrupted create/lost response recovery | PASS for tested protocol | Intent-before-create, nonce-to-ID recovery, persistent restart and unknown-ack fault tests; all uncertain outcomes quarantine. No actual daemon/host crash evidence |
|11 | Exact cleanup/quarantine behavior | PASS for tested protocol | Binding/stopped/identity rechecks; no mutation after uncertain failure; final exact inventory. Runtime stop/remove remains unexecuted |
|12 | SQLSTATE/collision/rollback fixture | UNVERIFIED for required native run | Embedded/WASM permitted operation,42501,23505,42P06,55000 and rollback assertions pass. Fixed psql terminal rollback comparison and exact pinned image still need the authorized native run |
|13 | Initial/final inventory reconciliation | PASS for source | Signed count0/13 plus sorted exact ID/name/state digest, drift denial and exact final equality tested |
|14 | Preserve owner's existing13 containers | UNVERIFIED as runtime acceptance | No Docker client/socket or owner-host inventory is available here; no Docker operations occurred. Simulation does not attest the actual13 resources |

## Exact identity and evidence

[source-identity.json](evidence/t19-gate2-final-review/source-identity.json) records all file SHA-256 values and explicit null target identities. Main module `4d18dc3f601c370a127da2ff3735318702f84b2ca222e5a42e314c4a25453c3a`; SQL `5175b6d2b852623c233681392235f5fa17e06b56005b68dd4cf5934f4b0f7ec7`. Measured local Node executable SHA-256 `61ab14cd750fc24d5db53490ec5fc40f756e4b6e136b78cf7004265471d9bd1d` is informational, not authorization to use this ineligible workspace or an invented target hash.

V3 retains the protected registry and ledger paths from the prior packet. Both independent signers must approve exactly these receipt fields:

| Field | Required binding |
|---|---|
| version / scope |3 / exact v3 scope above |
| bundleSha256 | Installed integrated-module and fixed-SQL bytes plus actual Node executable hash |
| binarySha256 | Exact protected Docker executable bytes |
| policySha256 | Fixed argv/commands/resource/platform/count policy |
| inventorySha256 / baselineCount | Exact sorted approved baseline and0 or13 |
| hostBootSha256 | SHA-256 of current Linux kernel boot-ID string; real entrypoint reads it independently |
| daemonIdSha256 | SHA-256 of exact Docker info ID; checked before mutations |
| context | Approved default local Unix-socket context |
| nonce | New32-character lowercase hex nonce |
| issuedAt / expiresAt | Integer milliseconds; at most15minutes; rechecked at dispatch |

No incomplete worksheet is a run approval. Target identities, manifests and current host observations must exist before anyone signs. Same-boot live-snapshot/ledger rollback and signing-device compromise remain explicit independent-review subjects. Independent review must assess the actual host trust boundary, not simply accept these field names.

Affected local validation: **64/64 PASS,0fail/skip** in [final TAP](evidence/t19-gate2-final-review/gate2-final.tap). This includes22 integrated behavior groups, two embedded SQL tests, legacy denial/regression checks and a v3 gateway substitution check. Node syntax and whitespace checks for corrected source/tests pass. The raw initial-failure TAP is retained byte-for-byte, including whitespace-only lines. No completed unrelated source suite was rerun. Earlier388-pass/18-skip broader T19 and two wider Unix EPERM failures remain historical evidence at their original revisions, not newly claimed current-head results. All149 historical migration-source hashes/checksums were verified intact; source blobs were not fetched again.

One initial new regression incorrectly modeled an unprivileged session with SET ROLE while session_user remained the superuser. Its failure is preserved in [initial test log](evidence/t19-gate2-final-review/initial-test-session-model-failure.tap). The test was corrected to SET SESSION AUTHORIZATION, and the [embedded SQL rerun](evidence/t19-gate2-final-review/embedded-sql-final.tap) passes. No production/session-security rule or SQL expectation was weakened. These embedded tests are not native PostgreSQL acceptance.

## Stage B — independent reviewer handoff

Verified GitHub records: requested users=[], teams=[]; submitted PR reviews=[]; Issue140 assignees absent. The only identified human author in these records is shalean-developer; authorship does not establish independence or the required specialist qualifications. The connector rejects collaborator and self-hosted-runner inventory endpoints, so this is an **access limitation**, not proof that no collaborators/runners exist. No browser/session fallback or unknown reviewer assignment was attempted.

**Owner action:** identify the reviewer's GitHub handle and provide verifiable relevant PostgreSQL/Supabase, Docker/Linux isolation, signing-key custody, replay/filesystem durability and recovery expertise, plus independence from this implementation. After eligibility and authority are verified, this mandate permits requesting review of the exact frozen source; a request itself is not a PASS. No reviewer has been assigned or contacted in this work.

Reviewer delivery must be written **PASS or NO-GO**, identify reviewer/role/date/exact source and target host, list findings and reproduced evidence, disclose independence/conflicts, and cover:

1. Entire PR diff and v3 authorization/gateway/bundle/registry/key ownership.
2. Signed host/daemon identity, private off-host signing-key custody, nonce crash behavior and ledger restore/snapshot/clock controls.
3. Exact image provenance, vendor entrypoint/UID/GID/tmpfs/capabilities/CPU/RAM/PID/network/filesystem feasibility without relaxing policy.
4. Exact subprocess bounds, complete bounded transcripts, lost-result recovery, immutable ID binding, existing-resource exclusion and quarantine.
5. Exact fixed SQL/psql procedure, permitted operation, denied SELECT under the intended role, duplicates/collisions, rollback and final catalog comparison.
6. Foundation CI scope separately from Gate2; proposed eligible host and exact run procedure.
7. After a separately authorized run, assess actual CI/Docker/SQL/fault/cleanup/inventory evidence and every exception before recommending Gate2 closure.

The implementing engineer issues no independent PASS. A GitGuardian result, AI review or GitHub review-request acknowledgement is not independent operational security approval.

## Stage C — execution-host options and costs

| Option | Verified facts | Eligibility now | Cost boundary |
|---|---|---|---|
| Current workspace | Linux6.18.55 x86_64, root, supervisor/container environment;9reported CPUs, about9.7GiB RAM and28GiB free overlay storage; no docker/podman/psql/pwsh, no Docker sockets, no registry/ledger | **Ineligible** | No new resource purchased; installing Docker/nesting is not approved and is not proposed as a workaround |
| Owner native Windows | Supplied handoff and prior verified candidate support state are Windows-incompatible | **Ineligible for current candidate** | No quote/purchase; switching to WSL is not automatic eligibility |
| Owner WSL or existing dedicated Linux host | No accessible current host, daemon, image, trust, filesystem or workload inventory supplied | **Unverified** | Existing host may avoid a new VM bill, but actual cost/access is unknown; no paid provisioning recommended |
| Standard GitHub-hosted ubuntu-24.04 VM for public faraios repo | Repository metadata confirms public. Official runner docs describe fresh x64 VM,4vCPU/16GB/14GB and sudo; existing Foundation uses this label | **Unverified for Gate2; documented CI option** | Standard public-repository compute minutes are free. Artifact/cache quota/billing and capacity are not verified; no larger/paid runner authorized |
| Existing Plesk/Supabase business environments | Hosting/business state is recorded and connected; not established as disposable Docker targets | **Ineligible as currently evidenced** | Do not repurpose active business workloads or protected restore project |

Pricing/platform sources checked28October: [GitHub billing](https://docs.github.com/en/actions/concepts/billing-and-usage), [runner selection/specifications](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job), [runner administrative privileges](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). Public compute being free is not a blanket zero-storage-cost or capacity guarantee.

**No eligible Stage E host has been established.** A fresh GitHub VM is a justified no-paid-compute candidate for assessment, not a ready acceptance host. It still needs a separately approved way to install protected reviewed code/public trust, verify cached image/provenance, maintain/recover the ledger and return both signatures to the **same running host/boot** within the approval window. Signing a preflight from one job and executing on a new job/VM will now correctly fail. No new workflow, polling grant channel, host installation, image pull or VM was provisioned here.

The smallest host decision is to identify an existing genuinely isolated Linux host reachable for read-only preflight, or select the standard GitHub VM option for a separately reviewed same-host signing/handoff design. Do not buy a paid VM before that decision. Any subsequently selected host must prove daemon permissions/local socket identity, exact executable and registry image provenance, root-owned protected code/public trust, private off-host signing keys, durable/recoverable ledger, sufficient storage/RAM/CPU, absence of business connections/workloads and exact initial inventory. WSL filesystem/daemon/desktop sharing must be independently verified, not assumed safe.

## Stage D — bounded Foundation CI authorization packet

**NOT EXECUTED / NOT AUTHORIZED BY THIS REPORT.** Workflow `.github/workflows/ci.yml` remains unchanged, SHA-256 `1d173285e8666fb5a700cf4dafbe49ae59fcd91fccf41ceb8ee46c119af60377`, Git blob917b601c74b80fce612ca617d758e3fb49ca1f3e. Other exact script identities are in source-identity.json. No workflow requirement was removed; skip-ci source/evidence publication keeps protected jobs pending rather than pretending they passed.

Requested future authorization is **one complete Foundation run** of this reviewed source tree, on standard GitHub-hosted ubuntu-24.04/windows-2025 runners only, with no repository/environment/provider/DB secrets supplied, no self-hosted runner, no live data and no deployment. Current workflow has PR/push triggers, not workflow_dispatch; after authorization a source-unchanged trigger commit without skip-ci can create the PR synchronize run. Bind the accepted run to the final reviewed source tree and pinned staging base. GitHub PR checkout defaults to a synthetic merge commit: verify actual GITHUB_SHA/tree matches the reviewed merged tree, and stop/review again if staging changes. Do not call a stale-head rerun current-head acceptance.

| Job | Ordinary checks | Protected/external effects requiring that approval |
|---|---|---|
| policy-tests, ubuntu-24.04,10minute job | Locked npm install in build, npm run check, full source regressions | docker build from pinned Node/Postgres bases; docker run --rm --network none --cpus2 --memory4g --cap-drop ALL --security-opt no-new-privileges. In-container synthetic native PG17 cluster, random SCRAM fixture password, loopback/socket, wrong-password denial, full suite and three dedicated native accounting/C2/custody runners; exact own-cluster cleanup |
| zoho-setup-windows, windows-2025,10minute job | npm ci --ignore-scripts, syntax and legacy fixture tests | Temporary fixture files, loopback listeners, generated dummy material and real Windows dummy DPAPI/ACL tests. No real Zoho credentials/consent/provider accounting requests |
| backup-transport, ubuntu-24.04,10minute job | Existing synthetic backup/restore/security assertions | Dedicated temporary Docker network, multiple owned PG/client/sentinel containers, generated TLS/password fixtures and read-only host fixture/certificate mounts; synthetic SQL/dumps/restores/negative transport tests; cleanup only owned fixture resources. One strict credential-free TLS-only handshake to aws-0-eu-west-1.pooler.supabase.com:5432, closing before PostgreSQL startup/auth/query |

Foundation's backup fixture network/mount policy is **different from Gate2's network-none/no-host-mount acceptance policy**. Approval must explicitly cover those existing synthetic CI effects; success cannot be substituted for the exact pinned Supabase Gate2 startup. Protected Gate2 image acceptance and all existing13owner resources remain outside CI authority. No hosted DDL, secret publication, OAuth/provider invoice, financial change, Plesk, restore-test reset or production operation is included.

Owner may authorize this bounded Foundation procedure separately from independent Gate2 run approval. After authorization, preserve exact commit/tree/jobs/versions/logs, failures/skips/native results and cleanup; verify current-head required checks and GitGuardian. Do not merge on local/old CI evidence.

## Stages E–F — actual acceptance and closure remain blocked

Only after the attributable independent PASS, eligible same-host identity/trust/image/ledger preflight and separate exact owner approval may the signed v3 run execute. Preserve the existing fixed image/UID100:101/resource/capability/read-only/tmpfs/network/port/mount policy. Capture native startup/readiness, bounded command transcripts, permitted SQL and42501/23505/42P06/55000/rollback markers, final logical catalog state, ID/nonce/durable binding, fault/quarantine behavior, stopped-state cleanup and exact final inventory.

Any failure stays a failure; do not add capabilities, change mounts, enlarge limits, relax SQL or broaden credentials to obtain PASS. Unknown or interrupted mutations stop subsequent mutation and quarantine; recovery cleanup requires its own exact authorization. The final reviewer must assess observed execution and exceptions. Only all mandatory passing evidence permits Gate2 PASS. Canonical record updates require appropriate owner authorization. Passing Gate2 alone cannot mark T19 Done.

## Stage G — A12 handoff status

**Blocked; not formally opened by this report.** Preserve the existing Issue140 evidence and D15 owner-led isolated staging direction, while keeping separately required operational security review. Once Gate2 formally passes, the next authorized package must cover restricted hosted identities, effective/default grants and private-schema/Vault denial, independent business/environment credentials, sealing/generation fencing, durable refresh/operation leases, disconnect/revocation, interruptions/recovery, backups/restores and authenticated API/database denial. No hosted SQL, Vault change, credentials, deployment, new OAuth or accounting activation is implied.

Fresh read-only staging aggregate verification during this review still returns Shalean943440851 one87500-cent unsynced invoice and Bokkie943440162 one41000-cent unsynced invoice; both connections disabled and neither mapped nor in an active attempt. No financial record was changed. This preserves the baseline; it is not real-provider reconciliation.

## Required delivery decisions

| Field | Result |
|---|---|
| PR209 | Open/draft; implementation ce37300933e2ed1e7864b8e992001dd24375e4b3; no assigned/requested independent reviewer; no submitted review |
| Source implementation | **PASS for64affected local checks**; target-host/runtime acceptance unverified |
| Independent security review | **NO-GO** — no eligible attributable reviewer decision |
| Linux execution host | **Unverified overall**; current workspace ineligible |
| Foundation CI | **Not executed** for corrected source; bounded approval packet above |
| PostgreSQL startup | **Not executed** |
| Docker isolation | **Not executed** |
| SQL security and rollback | **Not executed natively**; two embedded/WASM fixture regressions pass |
| Interruption recovery | **Not executed against Docker/host crashes**; source protocol tests pass |
| Cleanup and inventory | **Not executed against real Docker** |
| Gate2 | **NO-GO** |
| Gate3 A12 | **Blocked** |
| Full T19 | **In progress** |
| T20 | **Not started** |

**Next owner actions:** identify the qualified independent GitHub reviewer and candidate Linux host/read-only access; separately authorize the exact Foundation CI packet when ready. The one-off signed Docker/PostgreSQL run is a later separate approval after review and actual host bindings exist. No signature, eligible host or permission is inferred from silence.

Evidence: [final tests](evidence/t19-gate2-final-review/gate2-final.tap), [source identities](evidence/t19-gate2-final-review/source-identity.json), [read-only readiness](evidence/t19-gate2-final-review/readiness.json), [checksums](evidence/t19-gate2-final-review/SHA256SUMS.txt). The earlier consolidated acceptance report and original failed/historical evidence remain intact at their pinned revisions.
