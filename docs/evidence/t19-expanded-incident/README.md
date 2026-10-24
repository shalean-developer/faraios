# T19 expanded GitGuardian incident investigation

Date: 23 October 2026. Read-only investigation of incident **38407534**, workspace 777610, repository shalean-developer/faraios, PR #102.

## Decision

**NO-GO for applying or automatically expanding the previous conditional approval.** All six individually reviewed occurrence contexts receive **PASS for synthetic classification**, but this does not establish universal non-reuse or inactivity outside the inspected repository and known fixtures. A revised owner/security decision must explicitly accept the bounded evidence and incident-wide future-alert suppression. No disposition is applied in this investigation.

Incident remains **Triggered**. Preserved current-head check **120244462583** is completed **FAILURE**, SHA **8a4aed07dd5429c3cef8963a6975efd8329e78c4**, completed 2026-10-23T04:41:45Z. It was not rerun. GitGuardian security gate remains **NO-GO**. Frozen Stage B application implementation: d4643e244f5f9538264a5beec15b03984a437d32. Default branch inspected: 651490e8b1e2ecd1815598d3aad7f1ebacaa3353.

## Authenticated inventory and scope

The primary investigator used the authorised authenticated GitGuardian browser session, opened both occurrence-table pages, selected each of the six rows individually and read its patch. Credential values were redacted before patch text was emitted; raw patches and screenshots containing values are not reproduced here. This is an observational record, corroborated by the independent immutable-source review, not a raw GitGuardian export. The UI showed one repository source, six occurrence records, one default-branch file requiring a code fix, five mentions and zero files fixed. No unexpected seventh record was observed. The two original known record IDs are 306492779 and 306492780; other IDs were not exposed and are not invented.

| Commit | Path / diff location | Classification and verified purpose | Exposure assessment |
|---|---|---|---|
|0454a7f82a3859994880023fffdaf62ad3ef3254|.github/workflows/ci.yml R15 (+)|Historical fixture introduction. Commit adds native concurrent shared-cleaner verification using a PostgreSQL 17 CI job service, Node 24, dedicated test database and synthetic fixtures.|Client connects to 127.0.0.1. No real-service endpoint or real-secret retrieval in this credential flow. Service port mapping is 5432:5432, NOT explicitly loopback-bound. Historical runner network reachability not verified.|
|a5b512afc30b272f1755d7449c7d979df8df86ef|.github/workflows/ci.yml R15 (+)|Historical fixture incorporated through T16 PR #47. Workflow Git blob matches the preceding record exactly: 7eacd42116ad096fd595c4b2d519d178a91aa8ca.|Same synthetic service configuration and network qualification; not evidence of an additional production credential.|
|03f7ed0d6406843637618a764d21e32b44ab3024|docs/evidence/t19-final-ci/policy.sh R32 (+), occurrence 306492779|Original T19 finding. Disposable private SCRAM PostgreSQL harness; retained execution evidence has network-disabled container and database cleanup.|Historical task fixture removed according to retained logs. No provider endpoint or accounting data.|
|03f7ed0d6406843637618a764d21e32b44ab3024|docs/evidence/t19-final-ci/audited-ci.yml R15 (+), occurrence 306492780|Original T19 finding. Static workflow evidence copy; all 62 lines equal the implementation workflow after newline normalization.|Not a separately executing workflow. Raw Git blobs differ due to line endings.|
|347d03e0d1221e09f73732af502317e6407675ae|docs/evidence/t19-final-ci/policy.sh L32 (-)|Remediation deletion-side record. Replaced literal with generated runtime credential; restrictive password-file permissions, SCRAM and successful/failed authentication coverage retained.|Removal record, not new credential use. Prior regression/cleanup evidence retained; no tests rerun here.|
|347d03e0d1221e09f73732af502317e6407675ae|docs/evidence/t19-final-ci/audited-ci.yml L15 (-)|Remediation deletion-side record. Removed redundant evidence YAML and retained immutable provenance.|Removal record, not a new runtime credential; original Git history remains.|

The first historical commit's purpose is “Verify real concurrent shared-cleaner assignments in isolated PostgreSQL CI”; the second is “T16: availability calendar and atomic shared-cleaner reservations (#47)”. The native test constrains its host and database and creates synthetic businesses, identities and bookings. No T04 implementation was changed or exercised by this investigation.

## Reuse, current configuration and activity

Independent metadata-only searches at both exact PR HEAD and default-branch HEAD derived the incident value in memory, without printing it. Matching literal password assignments / URL credentials occurred only in .github/workflows/ci.yml at lines 15 and 25. Generic database-role and variable mentions were not counted as password reuse. This is tracked-source evidence, not a search of external credential stores, all developer machines or historical service state.

The current actual workflow still provisions the fixed test credential and can recreate it when run. Do not claim repository eradication or permanent inactivity. Its declared target is a disposable PostgreSQL job service; no evidence in the reviewed flow connects it to production. A test credential is nevertheless capable of authenticating to its matching test database. Its generic value cannot by itself prove that no unrelated real service uses it.

Read-only metadata for the existing local container faraios-t16-test-db shows postgres:17-alpine, running, expected dedicated test database and explicit 127.0.0.1:55432 binding. Its configured password DOES NOT match the incident value. No authentication or SQL was attempted: environment configuration is not proof of the actual database role password, contents or provenance. See local-fixture-metadata.json. No unrelated production/staging container configuration or live credential store was inspected.

No real-service credential exposure or rotation requirement was established. External reuse, actual runtime authentication state and universal rotation clearance remain **NOT VERIFIED**. Do not assert either that real rotation is necessary or that no possible real-service rotation is needed. No credentials were rotated or services stopped.

## Independent reassessment and revised owner decision

The separate reviewer independently inspected immutable source, older commit purpose, current PR/default configuration, metadata-only reuse results and retained regression/cleanup evidence. The primary investigator supplied authenticated UI observations; the reviewer does not claim a second authenticated session. See independent-review.md.

The original owner approval remains preserved verbatim in prior-approval.json and at https://github.com/shalean-developer/faraios/pull/102#issuecomment-6357574288 . It is not silently extended to the expanded scope.

Recommended revised decision for owner/security review:

- Acknowledge all six records above, including the two older default-branch/T16 workflow records, current fixed test configuration and two removal-side records.
- Accept synthetic classification only within the verified source contexts; explicitly acknowledge the external-reuse and runtime limits, or obtain additional authorised inventory/attestation before approval.
- Explicitly accept that Ignored / Test credential operates on the whole incident and suppresses future same-incident alerts, including possible future reuse; it cannot be restricted to these six records.
- If those limits are unacceptable, retain Triggered. A separate future change to randomise the actual CI fixture would require its own scope and verification; it is not performed here and would not erase history.
- Any later authorisation must target only incident 38407534, reconfirm the occurrence inventory and permissions, preserve the timeline, rerun the actual existing check and obtain independent assessment of the actual result. No other findings, scanning settings, checks or branch protections may be suppressed or bypassed.

Official lifecycle reference: https://docs.gitguardian.com/internal-monitoring/detect/incident-statuses . Ignored incidents do not reopen/alert on later occurrences of that incident. A status change alone is not a successful PR security check.

## Evidence preservation

New files are local, uncommitted investigation evidence to preserve the PR head and avoid triggering checks. SHA256SUMS.txt covers the final evidence files. Prior authenticated-preflight evidence, independent QA, Linux results, original Windows failure and backup investigation remain untouched. No implementation source, repository history, incident status, checks, credentials or infrastructure were changed.

T19 remains **In progress**; PR #102 remains **Draft and unmerged**; accounting activation **NO-GO**.
