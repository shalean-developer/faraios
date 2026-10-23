# Independent review of proposed GitGuardian disposition

Reviewed 23 October 2026 by separate Codex agent `/root/incident_review`, against exact `ec2db0e0ee3a7d35ef6e7852915e97056f69575f`. This reviewer did not implement the fixture change, repeat successful regressions or change an incident/check status. Shared host/tooling means independent agent review, not external human assurance. Credential values are intentionally omitted.

**Scoped synthetic classification: PASS. Global hardcoded-credential elimination: NOT COMPLETE. Security disposition: NOT APPLIED, owner approval required. Actual GitGuardian gate: NO-GO.**

## Independently verified facts

A fresh read of GitHub check `120241805743` shows completed FAILURE on the reviewed SHA. Its returned findings identify **one incident, 38407534, with two occurrences**, not two separate incidents:

| Occurrence | Historical commit | File and reported line |
|---|---|---|
| 306492779 | 03f7ed0d6406843637618a764d21e32b44ab3024 | docs/evidence/t19-final-ci/policy.sh:32 |
| 306492780 | 03f7ed0d6406843637618a764d21e32b44ab3024 | docs/evidence/t19-final-ci/audited-ci.yml:15 |

Historical source positions were independently checked without printing their values. Related URL assignments in those snapshots are at policy.sh:35 and audited-ci.yml:25; these are not additional reported occurrences. The current PR check reports no additional incident identifiers. This does not establish a workspace-wide incident inventory or the complete occurrence list on GitGuardian's live incident page.

The original policy fixture initialized a private, newly created local PostgreSQL cluster with SCRAM authentication, ran inside a network-disabled task container, and bound the server to loopback. Historical logs show server PID absence, database-directory removal and exit0; container/image cleanup was preserved. The copied YAML was a byte-identical record of a disposable CI PostgreSQL service. Neither reviewed lifecycle reads or authorizes use of a real business/provider credential. The two reported occurrences are therefore verified synthetic test uses. Their task-owned database targets have been removed, so those specific removed targets cannot accept their former credentials.

This evidence does **not** prove that the same generic value was never independently reused on another machine/service, or that every unrelated local/hosted database rejects it. No live authentication, production configuration or real credential store was inspected. No universal revocation/non-usability claim is made. Any newly discovered real use must stop the proposed test-credential disposition and trigger security investigation.

Current policy.sh generates runtime-only random credentials and the copied YAML has been replaced with immutable provenance. The new policy log verifies correct-password authentication, wrong-password rejection and cleanup. However, an independent tracked-source search still finds matching hardcoded disposable-service settings in **.github/workflows/ci.yml:15 and :25**. Thus the affected harness is remediated and the duplicate snapshot removed, but the repository is not globally free of that test value. The actual workflow was intentionally unchanged; this observation is not a confirmed production-secret defect. The application/T04/workflow/dependency source diff against the frozen implementation remains empty.

Prior independent QA and regression evidence are preserved in [the security closeout](../t19-security-closeout/README.md). No successful test was rerun for this read-only disposition review.

## Vendor-supported procedure and boundaries

GitGuardian scans each commit in a PR, explaining why tip removal does not remove historical findings. Closed incidents cease to be raised by check runs; a check can be rerun after remediation from the GitGuardian check-runs interface. The report must distinguish an actual subsequent success from an expectation, and must not use the separate Skip action. [Official GitHub PR-check documentation](https://docs.gitguardian.com/internal-monitoring/prevent/detect-secrets-in-real-time-in-github).

The internal lifecycle explicitly offers **Ignored — Test credential** for this kind of classification. This is more precise than pretending a real secret was revoked or calling an authenticating fixture string a non-secret false positive. It is also an exception with consequences: new occurrences of the same ignored incident will not reopen it or generate alerts. An incident-level action is narrower than disabling GitGuardian or adding broad ignore rules, but it is not limited to the two current occurrences and must not be described as having no future suppression effect. Resolved is the vendor's remediation/revocation status; it should not be asserted based solely on removal from current source. [Official internal incident statuses](https://docs.gitguardian.com/internal-monitoring/detect/incident-statuses).

GitGuardian's incident permission **Can edit** includes ignore/resolve actions; Full access also includes these rights. Therefore a repository-owner title alone does not prove permission, and an administrator is not universally necessary. Actual authenticated workspace access/incident permission must be verified before any approved action. No permission change is proposed. [Official incident permissions](https://docs.gitguardian.com/platform/collaboration-and-sharing/incident-permissions-and-sharing).

## Approval gate and verification

A defensible owner decision must name incident38407534, the two known occurrence IDs and exact reviewed SHA; approve the vendor status **Ignored** with reason **Test credential**; acknowledge same-incident future recurrence suppression and the remaining disposable CI literals; and authorise a supported fresh check rerun. It must exclude other incidents, check skipping, broad rules, history rewriting and security-setting changes. Before applying it, verify the live incident's full occurrence scope and current status; unexpected additional or real-service occurrences require investigation, not automatic inclusion.

Record approval reference, actor, timestamps, before/after incident state and the reason in the audit trail without credential values. Then obtain a fresh GitGuardian check on the intended current head and retain its actual conclusion. If permission, direct incident inspection or a successful check is unavailable, keep NO-GO. No incident note, status, ignore rule, check setting or rerun was changed by this reviewer.

Owner approval remains pending. T19 stays In progress, local Stage B implementation PASS, PR102 draft/unmerged, and accounting activation NO-GO. Hosted CI/branch-governance gates remain separate even if GitGuardian later succeeds.
