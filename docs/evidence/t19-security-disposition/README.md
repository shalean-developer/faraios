# T19 GitGuardian security disposition — pending owner approval

Reviewed source/evidence: `ec2db0e0ee3a7d35ef6e7852915e97056f69575f`. Historical affected commit: `03f7ed0d6406843637618a764d21e32b44ab3024`. Date:23 October2026 (Africa/Johannesburg). No credential values are reproduced here. This is investigation and a proposed decision, not an applied incident disposition.

## Exact findings and evidence

There is **one incident38407534 with two reported occurrences**, not two incident records. GitGuardian check120241805743 on ec2db0e is completedFAILURE and scans9PRcommits. The retained check-before.json contains metadata and occurrence references, not credential contents.

| Occurrence | Historical location | Verified scope |
|---|---|---|
|306492779|docs/evidence/t19-final-ci/policy.sh:32 at03f7ed0|Disposable local PostgreSQL fixture|
|306492780|docs/evidence/t19-final-ci/audited-ci.yml:15 at03f7ed0|Copied workflow configuration for disposable PostgreSQL17 service|

The original harness initializes a new private temporary cluster, requires SCRAM, uses loopback inside a network-disabled container and removes the database/server/container. The copied YAML was byte-identical to the actual workflow. Prior complete logs, cleanup records, exact-source hashes and [independent QA](../t19-security-closeout/independent-qa.md) substantiate this classification. The check reports only these two occurrences. The workspace-wide incident occurrence inventory is NOT VERIFIED: dashboard access requires login; no authenticated incident session or GitGuardian connector is available. No login credentials were entered or new permissions granted.

These two uses are confirmed synthetic-only. Their reviewed lifecycle contains no hosted or production destination, and the historical task-owned databases were destroyed. No evidence identifies a real credential exposure. This does **not** prove that the same common fixture value is unused elsewhere or cannot authenticate to an unrelated database. No live authentication, validity probe, database inspection outside the reviewed fixtures, or production credential comparison was attempted. If authenticated incident review reveals a real endpoint, real reuse, or an additional unreviewed occurrence, stop and obtain a fresh security assessment; this proposal must not be applied.

## Remediation status and residual scope

Harness candidate347d03e generates a fresh runtime-only random credential, retains SCRAM/loopback, restricts the password file and verifies both correct-password success and wrong-password denial. The current audited YAML duplicate was replaced by immutable provenance. Thus the two reviewed current-file issues are remediated. Historical bytes/manifests/logs remain at their immutable commits; no evidence was deleted from history.

**Repository-wide eradication is NOT complete:** `.github/workflows/ci.yml:15,25` still contains the same pre-existing synthetic service credential configuration. This was deliberately unchanged by the prior bounded fix. It can provision new disposable CI databases with that fixture value if the workflow runs. It is not proof of production reuse, but prevents claiming the value is universally unusable or removed from every current file. No new implementation changes or repeat regressions were justified in this disposition-only task. Previous Linux296pass+one coveredskip/native26, Windows110 and Docker assertions remain the test evidence.

## Official procedure and classification

GitGuardian scans each PR commit, so correcting only HEAD leaves historical occurrences detectable. Closed incidents are excluded from subsequent check findings; the dashboard provides a Re-run action. A successful fresh check must be observed, not inferred from a status change. [Official PR-check documentation](https://docs.gitguardian.com/internal-monitoring/prevent/detect-secrets-in-real-time-in-github).

Recommended classification is **Ignored — Test credential** (`test_credential`), rather than false-positive/not-a-secret: the values really authenticated to disposable test databases. Resolved represents remediated/revoked secrets and is not a claim of universal revocation that this investigation can substantiate. GitGuardian supports test-credential, false-positive and low-risk ignore reasons. Crucially, ignoring prevents reopening/alerts for later occurrences of the **same incident**; its effect is not limited to two file lines. This tradeoff requires explicit approval. [Official internal incident lifecycle](https://docs.gitguardian.com/internal-monitoring/detect/incident-statuses), [official API reference](https://api.gitguardian.com/docs).

Incident disposition preserves its timeline and evidence, while leaving scanning and required check configuration enabled. It nevertheless excludes the identified incident from future alerting/check results; it must not be described as having no monitoring effect. Disabling the app, switching checks to neutral, skipping a check, creating broad ignore rules or changing regression settings is not proposed. If the owner requires zero loss of future same-incident alerts, do not approve this classification; keep NO-GO and clarify alternatives with GitGuardian.

The product requires incident **Can edit** (or Full access) permission to resolve/ignore; a GitHub repository owner role alone does not establish this permission. Our governance additionally requires explicit owner/security approval. Actual workspace role/permission is unknown until authenticated access exists. [Official incident permissions](https://docs.gitguardian.com/platform/collaboration-and-sharing/incident-permissions-and-sharing).

## One proposed owner decision

**Approve only changing GitGuardian incident38407534 to Ignored with reason Test credential, recording this assessment and approval reference, then rerunning its GitGuardian check without skipping it. Acknowledge that this prevents future alerts/reopening for the same incident. Apply only after an authenticated, read-only preflight confirms the entire incident remains limited to the reviewed synthetic scope, with no additional unreviewed occurrence or real-service credential use, and confirms the operator has incident edit permission. If those conditions fail, stop without changing status. No other incident, setting, broad ignore rule, history, billing, branch protection or required check may change.**

Approval reference: **NONE — pending**. Nothing has been applied or posted to the incident. Direct authenticated preflight and approval are both outstanding. Owner may decline; the gate then remains NO-GO. This approval would not authorise merging, deploying, live provider access or financial activation.

Proposed incident note (not posted): “Reviewed occurrence306492779 and306492780 at03f7ed0 against ec2db0e evidence. Both are disposable synthetic PostgreSQL fixture uses; historical fixture resources were removed. Current reusable harness uses runtime-generated credentials; the current workflow still has a pre-existing disposable fixture configuration. Historical evidence is preserved. Independent review and owner approval references: [insert approved references]. Disposition applies only following verified incident-scope preflight; no claim of global credential invalidity. No security configuration or history changes.”

## Verification after explicit approval

1. Authenticate normally; verify workspace777610/incident38407534, complete occurrence inventory, current status and edit permission without revealing credential contents. If scope differs, stop.
2. Record owner approval and preflight metadata, then apply only the authorised incident status/reason with the reviewed note. Do not use check Skip, blanket rules, new credentials or broader permissions.
3. Verify expected incident status and timeline action; retain redacted metadata. Recheck current source against the precise scoped claim above; do not falsely assert repository-wide eradication.
4. Use the existing GitGuardian check-run Re-run action at the exact intended PR head. Do not launch paid infrastructure or change GitHub Actions billing. Whether status changes automatically refresh the old check is not assumed.
5. Retain actual new checkID/headSHA/conclusion and findings. PASS requires GitGuardian SUCCESS, no unreviewed new findings and independent reassessment. Any failure stays NO-GO and is investigated without additional automatic exceptions.

## Current outcome and merge gates

Independent pre-disposition review: [report](independent-review.md). The proposed procedure is reviewable, but **GitGuardian NO-GO**, disposition NOT APPLIED, post-disposition verification NOT RUN. Direct incident inventory/permissions and global credential reuse remain NOT VERIFIED. The verified PR check has no findings beyond the two known occurrences; this is not workspace-wide assurance.

Potentially a supported incident-specific disposition can restore the check without disabling GitGuardian or weakening required-check configuration, but it does change monitoring for that incident and success is not guaranteed. Owner approval must cover that consequence. PR102 remains draft and unmerged. Hosted Actions execution is still blocked, the no-spend governance proposal remains unapproved, branch protections/rules require clarification and review/merge approvals remain outstanding. A GitGuardian PASS alone would not make the PR eligible for merge.

T19: In progress. StageB local implementation: PASS. Accounting activation: NO-GO. No status change, suppression, implementation work, production access, accounting-provider access, billing change, T04 modification, merge or history rewrite occurred during this investigation.
