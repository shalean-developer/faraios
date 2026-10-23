# PR #103 — proposed bounded no-spend CI evidence exception

Prepared 2026-10-23. PROPOSAL ONLY — not approved or applied.

## Scope and immutable evidence

Repository: shalean-developer/faraios. Draft PR: https://github.com/shalean-developer/faraios/pull/103.
Verified evidence baseline head (before publishing this proposal): `c4eace94f38ce587c047489a31c6d55b0909589a`.
Tested implementation: `2eb9679e6d6468224996fc4a3349033f13d1d443`.
Verified main/base: `651490e8b1e2ecd1815598d3aad7f1ebacaa3353`.

This proposal applies only to PR #103's runtime-generated disposable PostgreSQL CI credential remediation at this evidence baseline head. Evidence-only descendants may be covered only after independent confirmation of unchanged implementation/workflows/tests/dependencies, committed evidence checksums, and an actual successful GitGuardian check on the new head. No automatic coverage of rebases, merges, source changes, other PRs, T19 activation or future work. A changed base requires renewed compatibility assessment. Approval expires when any scope condition changes or the PR closes; it is not a standing repository exception.

The independent reviewer confirmed all 29 manifest entries against committed bytes, all eight logs, no implementation change after the tested candidate, and final-head scanner success. The final reassessment is https://github.com/shalean-developer/faraios/pull/103#issuecomment-6358656689.

Evidence: https://github.com/shalean-developer/faraios/tree/c4eace94f38ce587c047489a31c6d55b0909589a/docs/evidence/main-ci-credential-remediation

## Checks and proposed treatment

The sole workflow at the evidence baseline head is Foundation checks (.github/workflows/ci.yml), with the three jobs below. These are required project verification gates; their status as GitHub-enforced required contexts is NOT VERIFIED. GitGuardian is an additional external security gate.

| Check | Observed hosted result on evidence baseline head | Independently verified local coverage | Proposed owner treatment |
|---|---|---|---|
| policy-tests | FAILURE; check 120269237391, job never started | Clean archived candidate; pinned Node 24.22.1 / PostgreSQL 17.10 image; npm ci --ignore-scripts, npm run check, npm test; 282/282, zero skips; actual native concurrency; SCRAM positive/negative authentication and failure cleanup | Accept as bounded local execution evidence, without converting hosted failure into success |
| zoho-setup-windows | FAILURE; check 120269237446, job never started | Node 24.19.0; six syntax checks and exact seven-file test group; 110/110, zero skips | Accept local workflow-command evidence with Windows host differences recorded |
| backup-transport | FAILURE; check 120269237147, job never started | Disposable PostgreSQL 17.11; 23 PASS markers including 21 TLS rejection cases, restore/ACL/RLS/rollback and cleanup; only public provider handshake invocation omitted | Accept ONLY offline portion. Public TLS step remains uncovered by this run; no whole-job PASS |
| GitGuardian Security Checks | SUCCESS; check 120269299940, completed 2026-10-23T06:07:27Z | Actual authenticated final-head observation, not substituted local evidence | Keep mandatory actual success; no scanner exception |

Duplicate push and PR-triggered Actions checks also failed to start. Annotation inspection identifies billing/spending infrastructure blockage, not a test assertion failure. No spending change is proposed. No tests are hidden as skipped: Node suites have zero skips; the public handshake is a disclosed omitted invocation outside those suites.

## Public TLS decision remains separate

Preferred route before complete workflow acceptance: request a new narrowly bounded authorization for the unchanged script's certificate/hostname TLS handshake to its configured public PostgreSQL endpoint, then execute the full workflow-equivalent transport script on isolated local infrastructure and independently review the logs. No credentials, PostgreSQL startup message, SQL or accounting data may be sent. Prior one-time approval is not reused.

Alternatively, the owner/security reviewer may explicitly accept identified historical handshake evidence after independently establishing its exact source, endpoint, trust configuration and relevance to the unchanged current helper. That is a separate, explicit residual-risk acceptance; this proposal does not establish that equivalence or silently waive the gap. Until one route is completed, full transport acceptance remains NOT VERIFIED.

## Environment differences, risks and controls

- Linux policy uses the same pinned Debian container proposed by the workflow, but the local Docker host is Docker Desktop/WSL rather than a GitHub Ubuntu runner. Tests run nonroot, network none, no published ports, capability drop, no-new-privileges and bounded CPU/RAM. Build requires registry/npm access; it is not proof of hosted checkout or build orchestration.
- Windows local execution used Windows 11 rather than the windows-latest hosted image. Node 24 patch versions differ; floating hosted image behavior remains unverified. Exact commands and complete environment logs are retained.
- Transport uses Ubuntu WSL and a reviewed Docker bridge; fixture networking is local. Public endpoint reachability and current provider certificate behavior are not established by offline TLS negative tests.
- Successful local execution cannot certify GitHub event semantics, hosted permissions, runner availability or hosted scheduling. No synthetic success status, disabled job, protection change, self-hosted runner registration or check bypass is authorized.
- No application, T04, test assertion or dependency changes. Runtime credentials are generated per fixture, SCRAM is retained, both authentication directions are tested, and success/failure teardown is evidenced. Complete raw logs were inspected for sensitive values and checksummed.
- Historical credential reuse outside inspected sources remains uncertain. This PR is not a global revocation assessment or incident closure. Main is still unremediated until a separately authorized merge.

## Protection and review gates

Authenticated reads of main branch protection, branch rules and repository rulesets returned HTTP 403 with a plan-feature restriction. This does NOT establish that protections are absent, nor identify enforceable required checks. PR metadata reports Draft, MERGEABLE, UNSTABLE and an empty reviewDecision; mechanical mergeability is not approval.

Before any later merge-readiness decision, an authorized maintainer must record the applicable protection/ruleset configuration (or verified absence), required contexts and required reviewer approvals. If any required context is unmet, the PR must remain blocked. Owner acceptance of local evidence does not override a required check. No paid upgrade or repository visibility change is proposed. If no compliant no-spend route exists, retain NO-GO and wait.

Mandatory gates retained: exact-head identity; independent source/evidence QA; actual final-head GitGuardian success; complete transport disposition; verified protection/review requirements; any required reviewer approvals; and a separate explicit owner merge decision. No merge is requested or performed by this proposal.

## Exact approvals requested

Decision A — owner acceptance of bounded local evidence:

> I approve a one-PR, no-spend governance exception for PR #103 at c4eace94f38ce587c047489a31c6d55b0909589a, limited to accepting the independently verified local policy-tests and zoho-setup-windows execution evidence and the explicitly bounded offline backup-transport evidence. I accept the documented local-versus-hosted environment risks. Hosted jobs that never started remain failed/unverified; the public TLS portion remains a separate unresolved gate. This approval does not authorize merging, changing protections, posting fabricated passing checks, modifying scanning, changing incident 38407534, changing billing, deploying or activating accounting. Any evidence-only descendant requires independent scope/checksum confirmation and actual successful GitGuardian on its exact head.

Decision B — owner/security selection for the public TLS gap:

> I authorize preparation of [a fresh bounded no-credential handshake verification / an independent assessment of specifically identified historical TLS evidence]. Complete that review and return its result before proposing full transport acceptance. This is not permission for provider credentials, SQL, accounting writes or production changes.

For actual new network execution, the exact endpoint and handshake scope must be presented and approved before execution; Decision B alone authorizes preparation only.

Decision C — later maintainer/owner gate, not requested as a merge authorization now:

> Record protection/ruleset requirements and review approvals, confirm all retained gates are met, then request a separate merge decision. If enforced requirements remain unmet, retain NO-GO without bypassing them.

The existing independent QA is evidence supporting this proposal, not owner approval of the exception. Record any eventual owner decisions as explicit PR review/comment evidence with actor, time and exact SHA; do not infer approval from silence or from this preparation request.

## Recommendation

PASS for submitting this bounded local-evidence proposal for owner review. Exception approval: PENDING. Complete hosted CI: NOT VERIFIED. Full transport gate: NOT VERIFIED. Merge readiness: NO-GO pending the retained gates and separate authorization.

PR #103 remains Draft and unmerged. Incident 38407534, GitGuardian scanning and Regression settings remain unchanged. No billing, production, T04, Zoho or accounting activation changes. T19 remains In progress; accounting activation NO-GO. This standalone proposal does not change the historical evidence manifest or claim tracker completion.
