# PR #103 — bounded public TLS verification plan and review-gate investigation

Prepared 2026-10-23. PLAN ONLY. No provider contact or execution authorized/performed by this preparation. No exception applied, merge performed, access granted, or incident 38407534 change.

## Exact scope and preserved evidence

Verified plan baseline head (before publishing this document): `37b3681b95c43ff3057b30c93503894f903d10b8`.
Implementation: `2eb9679e6d6468224996fc4a3349033f13d1d443`.
Immutable regression evidence: `c4eace94f38ce587c047489a31c6d55b0909589a`.
Main/base: `651490e8b1e2ecd1815598d3aad7f1ebacaa3353`.

- [Governance proposal](https://github.com/shalean-developer/faraios/blob/37b3681b95c43ff3057b30c93503894f903d10b8/docs/pr103-no-spend-ci-governance-proposal.md)
- [Complete regression evidence](https://github.com/shalean-developer/faraios/tree/c4eace94f38ce587c047489a31c6d55b0909589a/docs/evidence/main-ci-credential-remediation)
- [Independent implementation/evidence reassessment](https://github.com/shalean-developer/faraios/pull/103#issuecomment-6358656689)
- [Independent governance review](https://github.com/shalean-developer/faraios/pull/103#issuecomment-6359394319)

The latter commits add documentation only. Linux 282/282 and Windows 110/110 remain prior independently verified executions, not fresh runs. Existing transport evidence covers only the disclosed offline portion. GitGuardian check 120286058965 is observed SUCCESS on the plan baseline head. No historical result is relabeled.

## Proposed authorized execution, if subsequently approved

Run the unchanged workflow command `node scripts/check-backup-transport.mjs` from a clean archive of the approved head on isolated local Linux with Node 24, the exact pinned PostgreSQL 17.11 image, OpenSSL and a verified local Docker engine. This closes the omitted public step while retaining the full workflow assertions. A standalone simplified handshake is not a whole-workflow substitute. Repeating transport is justified by the omitted step; successful policy/Windows suites need not be repeated for this documentation-only change.

The script's public function at lines 58–75:

1. Verifies the committed CA file locally, including regular-file/no-symlink status, PEM shape, self-signature, CA flag and validity interval. Its pinned certificate DER SHA256 is `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa`; this is not a PEM-file byte hash.
2. Resolves only `aws-0-eu-west-1.pooler.supabase.com` using the host resolver and opens TCP port 5432.
3. Sends the eight-byte PostgreSQL SSLRequest: length 8 and request code 80877103. Requires exactly the one-byte `S` response.
4. Starts TLS with SNI/hostname `aws-0-eu-west-1.pooler.supabase.com`, the committed CA, rejectUnauthorized=true and minimum TLSv1.2. Node performs certificate-chain/hostname validation. No alternate host, downloaded CA, insecure override or fallback is permitted.
5. On successful authorized handshake, destroys the socket. No PostgreSQL StartupMessage, username, password, authentication exchange, SQL, accounting data or application payload is sent to the public endpoint. The endpoint can observe source IP, connection time and TLS/SNI metadata; this is real provider contact even without credentials.
6. One public probe invocation, 20-second deadline, no script-level retry. DNS resolver/OS address selection may make underlying address attempts; do not promise a single network packet or disable OS behavior by changing assertions. No manual rerun after failure without renewed review/authorization.

The rest of the script creates only disposable local PostgreSQL fixtures and runs its unchanged assertions. Local fixture database writes are synthetic and must never target the public endpoint. No credential store, production env file or provider project API is used.

## Preflight, containment and cleanup

Before any network action:

- Reverify PR head/base, approved SHA, unchanged probe/helper/CA/workflow, clean source archive hash and the exact recorded owner authorization. If scope or base changed, reassess before execution.
- Record UTC time, Node/OpenSSL/Linux/Docker versions and image digest. Use sterile HOME/TMPDIR and an allowlisted environment; clear inherited database/provider credentials, TLS override/keylog/preload settings and network proxies. Never load .env files or real credentials. Keep tracing off.
- Prepare the pinned image and tools before the execution window; any registry/package access is separate from the public database permission. Prefer already verified local cached artifacts. No public CA fetch or provider API call is necessary.
- Use a dedicated task directory, resource-bounded disposable fixtures, no public Docker ports and only task-owned containers/network. Record their exact IDs for cleanup. Use the unchanged script rather than introducing production configuration changes.
- Apply an external run deadline aligned to the workflow's ten-minute budget. Do not alter the probe's twenty-second deadline or test assertions. On cancellation or timeout, stop only this run's process/containers and capture the failing outcome.

Cleanup detail found by source inspection: the script creates its temporary directory before awaiting publicPoolerTLS(), and its main try/finally starts after that await. A public-probe failure therefore may leave the empty temporary directory. Do not claim the script's own finally covers this early failure. Use a fresh dedicated TMPDIR and an outer execution wrapper that validates absolute task-owned paths and removes that directory after child exit, including early TLS failure. This is containment in the test runner, not an application/test assertion modification. Preserve failure status; do not speculate about other source defects or patch them under this plan.

For normal fixture execution, retain the script's existing container/network/temp cleanup and independently confirm absence afterwards. Never delete by a broad shared prefix or touch unrelated infrastructure. Do not run the script at all during plan preparation.

## Evidence and acceptance

Capture complete inspected stdout/stderr, exit code, start/end timestamps, exact archive SHA and file hashes, environment versions, pinned image identity, all assertion markers and cleanup evidence. Preserve raw bytes and generate a checksum manifest. Do not log environment values, fixture passwords or TLS key material. The existing public function emits a pass/fail marker, not a certificate transcript; do not invent peer-certificate metadata. Any optional packet capture or instrumentation would require its own review and scope approval.

Public subgate PASS requires `T11_PUBLIC_POOLER_CA_AND_HOSTNAME=PASS`, unchanged verification logic and successful socket closure. Full local transport PASS additionally requires exit 0, all expected offline assertions/cleanup and no failures. A public failure remains FAIL/NOT VERIFIED even if previous offline tests passed. If TLS passes but a later fixture fails, record the split outcome and keep the full job NO-GO. Investigate actual errors without changing trust settings or retrying blindly.

Obtain independent review of the exact source identity, logs, all expected markers and cleanup. If evidence is published in a descendant commit, recheck unchanged implementation and actual GitGuardian success for that descendant. Local success does not create hosted CI success or authorize the no-spend exception.

## Exact future approval wording

> I authorize one bounded execution of PR #103's unchanged backup-transport script at 37b3681b95c43ff3057b30c93503894f903d10b8 on isolated local Linux. This includes one public probe invocation to aws-0-eu-west-1.pooler.supabase.com:5432, DNS resolution, the eight-byte PostgreSQL SSLRequest and verified TLS handshake under the existing 20-second deadline, then immediate disconnect before PostgreSQL startup/authentication/SQL. I accept that the provider observes network/TLS metadata. No application retry, alternate endpoint, CA override, real credential or production/accounting data access is authorized. Remaining assertions may operate only on disposable local synthetic fixtures, with bounded cleanup and complete redacted evidence. This does not approve a CI exception, merge, billing or protection change, incident 38407534 disposition, production deployment, Zoho access or accounting activation.

This wording is proposed, not granted. A materially changed head or execution scope requires renewed approval. No earlier one-time handshake permission is reused.

## Authenticated protection/reviewer investigation

Read-only findings as of 2026-10-23:

| Source | Actual observation | Meaning / remaining requirement |
|---|---|---|
| GET branches/main | protected=false; protection.enabled=false; required_status_checks contexts/checks empty, enforcement_level=off | Positive evidence that the branch summary reports no classic protection/status enforcement. Not a complete ruleset inventory. |
| Detailed branch protection, branch rules, repository rulesets | HTTP403 with plan-feature restriction | Detailed rule/review configuration unavailable through these endpoints; do not infer an approval count or claim all protections are absent. |
| Repository metadata | private; authenticated account has admin/maintain/push permissions | Read capability confirmed; not authority to change protections or bypass gates. No upgrade/public visibility change proposed. |
| PR metadata | Draft, MERGEABLE, UNSTABLE; reviewDecision empty | Mergeability describes mechanics, not owner acceptance or security clearance. |
| PR reviews / requests | reviews=[], reviewRequests=[]; requested users/teams empty | No formal submitted GitHub review or requested reviewer recorded. |
| Collaborator list | only shalean-developer, admin | No separate reviewer account identified in returned repository collaborators. No invitations or access grants made. |
| Authenticated user and PR author | both shalean-developer | The operator cannot provide an independent GitHub approval of its own PR. |
| Repository tree | no CODEOWNERS found; delivery rules in AGENTS.md | No tracked code-owner assignment identified. Do not infer other organizational policy absent. |

GitHub documents that PR authors cannot approve their own PRs: https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews . Separate Codex QA and a posted owner comment remain auditable governance evidence, but are not a formal APPROVED GitHub review.

The new branch-summary evidence narrows the earlier uncertainty: it reports classic branch protection disabled. It does not erase the detailed-API limitation. An authorized owner should confirm the actual settings UI for branch rules/rulesets and record its evidence, required status contexts, required approval count (if any), code-owner/last-pusher/stale-review conditions and any other applicable policy. If settings are unavailable under the plan, record that fact explicitly rather than inventing enforcement. No configuration change is required or authorized for this investigation.

If formal approval is required by an existing rule or owner policy, identify an eligible separate reviewer with the required repository permission. The current listing supplies none. Adding a collaborator or sending a review request is a separate owner-authorized action; do not create a sham reviewer, use the author's account to approve, weaken rules or treat Codex QA as a status-check bypass. If no GitHub formal approval is required after verified settings inspection, the owner still must explicitly accept the independent QA/governance evidence and later make a separate merge decision.

## Remaining gates and decision

1. Owner authorization for the exact public probe before execution — PENDING; no contact made.
2. Full local transport execution and independent evidence review — NOT VERIFIED for public portion.
3. Owner no-spend local-evidence exception — PENDING, not applied.
4. Complete applicable protection/reviewer requirements — partially investigated; settings confirmation and eligible reviewer decision outstanding.
5. Required reviewer approvals, if applicable, and separate owner acceptance/merge authorization — outstanding; no formal GitHub reviews exist.
6. Actual GitGuardian on plan baseline head — PASS (120286058965); mandatory recheck on any new head. Incident 38407534 disposition is separate and unchanged.

Plan prepared; execution NO-GO until explicit bounded authorization. Merge readiness NO-GO. PR #103 remains Draft. T19 In progress; accounting activation NO-GO. No source changes, tests run, provider requests, exception, protection changes, invitations, review requests, merges or incident actions were performed in preparing this plan.
