# T19 approval and pre-consent cleanup reconciliation

24 October 2026. Bounded local changes based on PR106 head95a9b26aac0f583de3c5c91edf6d3986944b985a, stacked on PR105 headcd40c3f8b321ffcf908877cab761518725e2eb4b. Canonical tracker T19: separate invoice identities/connections; business totals reconcile, failures visible; depends T18; In progress. No tracker edit, provider call, real credential access, hosted migration, deployment, merge or financial activation.

## Requirement-to-defect mapping

| Existing T19 control | Verified gap | Bounded correction |
|---|---|---|
| D3 credential custody and reviewed onboarding | Execution validator omitted secret-source/client registration attestations | Require source verified, Server-based type and named client owner before import/execution; current template still fails |
| D3/D4 explicit lifecycle and preserved bindings | No removal path for imported secret before any consent record | Exact-manifest-bound local removal; reject every referencing connection; retain non-secret audit; never claim revocation |
| V01 interpretable positive identity evidence | Old Markdown inventory contradicts E18–E21/JSON | Add current supersession table; retain prior evidence and separate Bokkie scope |
| Controlled approval/cleanup | Provisioning evidence could invite editing the already pinned manifest | Keep original completed manifest immutable; record provisioning separately |

The new cleanup path is deliberately narrow. Once any connection references the client it is unavailable. A custodian assertion about external grant absence remains necessary; local code cannot prove all activity in Zoho. Existing import-only and connection-grant cleanup modes remain distinct. No legacy state migration is introduced.

## Preserved acceptance and unresolved inputs

E18 callback, E19 fixture, E20 operator/device and E21 helper evidence are reused. No fresh provider acceptance or independent QA is claimed for these changed files. Current client ownership/type/source, final reviewer, exact digest/hash/window and identity/cleanup/approval references remain incomplete. Organisation active state/provider permissions/known invoice comparison remain untested. Bokkie needs a separate package. Security/hosted CI holds and owner rejection of incident suppression remain in force.

Local source review is implementer review, not independent Codex QA or formal GitHub approval. Windows PowerShell/DPAPI regression and changed-path integration must pass on Windows before readiness. T19 remains In progress and activation NO-GO. Completed T04/T06–T18, deferred T05 and unstarted T20+ are untouched.

## Local verification and implementer review

Node24.19.0, Linux. Final focused selection:62 tests,55PASS,0FAIL,7Windows-only skips. Legacy auth/identity/adapter/setup/invoice regression:50/50PASS,0skip. Syntax checks and git diff --check PASS. Reviewed source digest: ae64a9fede8ded9a5e93e6846a2ad4584d80183f2be99377a88ae94936afc5aa. Checked-in review manifest remains approved:false and is not modified.

The initial unchanged full connection command was attempted before new regressions:65total,53PASS,6FAIL,6SKIP. Six masked-helper failures stem from unavailable PowerShell (child process returns null status); Windows DPAPI cases skip by platform. This failed invocation is preserved, not counted as green. No test was weakened to pass. Final selection explicitly excludes the Windows PowerShell suite; its six cases and the seven Windows-only cases still require Windows execution. New Windows DPAPI restart/removal test is prepared but unrun here.

Evidence: [portable tests](evidence/t19-approval-cleanup-20261024/portable-tests.log), [legacy regression](evidence/t19-approval-cleanup-20261024/legacy-tests.log), [initial platform failures](evidence/t19-approval-cleanup-20261024/initial-platform-failures.log). Implementer source review checked exclusive action modes, original-manifest/digest fencing, expired-window cleanup-only semantics, references across all connections, wrong-binding/attestation denial, unrelated-record preservation, audit redaction and no provider imports/calls in cleanup. No independent review has been performed on this change. Required next gates: Windows regression including actual dummy DPAPI persistence, independent technical review, then existing hostedCI/security/approval gates. NO-GO for merge/provider execution/closure.
