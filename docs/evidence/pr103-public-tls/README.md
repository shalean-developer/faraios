# PR #103 — approved public TLS and complete local transport verification

Result: public TLS PASS; complete local transport PASS, exit 0. One approved invocation, no retry. Owner CI exception remains PENDING; merge readiness NO-GO. Incident 38407534 unchanged.

Tested head: `81588da0de91e092463a18920f7c8522ec360c95`; main/base `651490e8b1e2ecd1815598d3aad7f1ebacaa3353`. The user explicitly approved one bounded public TLS probe under the reviewed plan in this conversation. The plan baseline was 37b3681; the approved current head adds that reviewed plan only. No application/workflow/test source changes occurred.

## Execution and evidence

One unchanged `node scripts/check-backup-transport.mjs` execution from a clean Git archive, 2026-10-23 07:49:27–07:52:11 UTC. Ubuntu 26.04 WSL, Node24.22.1, OpenSSL3.5.5, pinned PostgreSQL17.11 image. Docker Desktop Linux engine reports 16CPUs/~8GB host memory; no claim of per-fixture CPU/memory limits. Host differences from GitHub Ubuntu remain.

The public probe sent only the SSLRequest and TLS protocol to the reviewed endpoint, validated pinned CA/hostname, and closed before PostgreSQL startup/authentication/SQL according to unchanged source and the success marker. No packet capture was performed; wire behavior is supported by source review plus execution, not a packet-level attestation. No real credentials were loaded. Subsequent SQL and credentials were synthetic and confined to local fixtures.

`transport.log` contains all24 expected PASS markers: one public CA/hostname handshake, the23 prior local transport markers including21 negative TLS client checks, native restore/access-control/rollback assertions, cancellation/timeouts, sentinel preservation and fixture cleanup. `transport.exit.txt` is0. Policy282/282 and Windows110/110 were previously verified and not rerun here.

The wrapper used an allowlisted environment, sterile HOME/TMPDIR, one-use marker, 600-second external deadline and guarded outer temp cleanup. No manual probe retry occurred. The reviewed Docker bridge only handles local Windows/WSL bind paths/environment forwarding; it is included for reproducibility. It does not change test assertions.

Git archive exported CRLF line endings for the probe/helper/CA/workflow. `source-identity.json` records original Git blob and archive file hashes and byte counts; all four match after newline normalization. Do not claim raw Git-blob byte equality. The certificate DER fingerprint is unaffected. Archive hash and exact approved SHA are in `identity.json`.

## Cleanup finding and bounded remediation

The script reported cleanup PASS, but two captured anonymous PostgreSQL data volumes remained afterward. The initial observation is preserved unchanged in `cleanup.json`. A bounded Docker lifecycle query (07:49:20–07:52:30 UTC) associated additional volumes with exact task container IDs/names. The retained event buffer is not an exhaustive run transcript; the earlier mount snapshot supplements it.

The source creates four persistent fixtures: TLS database, restore database, plaintext database and sentinel. The initial snapshot independently preserves ownership for two volumes. The operator originally filtered Docker container events by the exact run token, then selected volume events only for those container IDs. That query found three volume events; its union with the snapshot identified four volumes. Only the volume-event rows were initially retained. A later query intended to preserve the container-name mapping returned an empty list, retained in `owned-container-events.json`. Thus complete independent ownership provenance is available for two volumes; the other two rely on the recorded operator filtering method, not a retained name mapping. Four detached volumes were removed by exact ID after checking no attachment; `volume-cleanup.json` verifies absence. This provenance limitation remains explicit and must not be reported as complete independent cleanup attestation. No broad prune or unrelated resource deletion occurred. Short-lived clients have their own unchanged cleanup assertions; do not interpret the event log as a complete inventory of every transient client.

`final-cleanup.json` records no task containers/network and removal of the exact validated task build root. Private temp directory count was0. Shared cached images and unrelated infrastructure were retained. No source fix was made for anonymous-volume cleanup; future runner work may address this confirmed harness cleanup limitation in its own bounded review. The public early-failure temp cleanup path was prepared but not exercised because the probe succeeded.

## Review and remaining gates

Independent QA is recorded in `independent-review.md`. Complete logs were inspected before publication for credential-bearing content. SHA256SUMS covers this evidence directory except itself; raw log bytes are preserved. Evidence-only descendants require unchanged-source review and actual new-head GitGuardian success; do not infer scanner results from prior commits.

Preserved prior evidence:
- https://github.com/shalean-developer/faraios/tree/c4eace94f38ce587c047489a31c6d55b0909589a/docs/evidence/main-ci-credential-remediation
- https://github.com/shalean-developer/faraios/pull/103#issuecomment-6358656689
- https://github.com/shalean-developer/faraios/pull/103#issuecomment-6359394319
- https://github.com/shalean-developer/faraios/pull/103#issuecomment-6360083064

This run closes the missing public TLS/local transport execution gap, subject to independent QA. It does not establish GitHub-hosted execution: prior jobs never started due billing/spending blockage. Owner acceptance of the no-spend exception remains separate and unapproved. Complete protection/ruleset confirmation, applicable independent GitHub reviewer approvals and separate owner merge authorization remain outstanding. The branch summary reports protection disabled; detailed APIs remain403 and no formal GitHub reviews were recorded. Codex QA is not formal GitHub APPROVED status.

No exception applied, merge, billing/protection/scanning/Regression changes, incident disposition, production changes, Zoho access or accounting activation. T19 In progress; accounting activation NO-GO.
